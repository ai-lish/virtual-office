#!/usr/bin/env python3
"""
fetch-usage.py — Combine Codex + Claude Code quota snapshots into
                  public/usage-quota.json for the ai-lish/virtual-office cron.

Mirrors the existing /tmp/usage_check.py + /tmp/gen_usage_json.py references
but writes to the production repo path and follows the spec §3 JSON schema.

Stdlib only (no third-party deps). Python 3.9+ for zoneinfo not required;
we use a fixed +08:00 offset for HKT.

Usage:
    python3 scripts/fetch-usage.py           # fetch + write JSON
    python3 scripts/fetch-usage.py --stdout  # fetch + print to stdout (no write)

Exit codes:
    0  snapshot written (one or both providers succeeded)
    1  both providers failed AND nothing written (should not happen — we
       always write a JSON file, but defensive)
"""
import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone, timedelta

HKT = timezone(timedelta(hours=8))
CODEX_AUTH = os.path.expanduser("~/.codex/auth.json")
KEYCHAIN_SERVICE = "Claude Code-credentials"
CODEX_URL = "https://chatgpt.com/backend-api/wham/usage"
CLAUDE_URL = "https://api.anthropic.com/api/oauth/usage"
CODEX_HEADERS_TEMPLATE = [
    "Authorization: Bearer {token}",
    "chatgpt-account-id: {acct}",
    "Content-Type: application/json",
]
CLAUDE_HEADERS_TEMPLATE = [
    "Authorization: Bearer {token}",
    "Content-Type: application/json",
    "anthropic-version: 2023-06-01",
    "anthropic-beta: oauth-2025-04-20",
]

# Public output path (spec §6)
DEFAULT_OUT = "/Users/zachli/.openclaw/workspace/virtual-office/public/usage-quota.json"


def log(msg, *, err=False):
    stream = sys.stderr if err else sys.stdout
    print(f"[fetch-usage] {msg}", file=stream, flush=True)


def fetch_codex():
    """Returns parsed codex JSON or dict with _error key on failure."""
    if not os.path.exists(CODEX_AUTH):
        return {"_error": f"auth file missing: {CODEX_AUTH}"}
    try:
        auth = json.load(open(CODEX_AUTH))
        token = auth["tokens"]["access_token"]
        acct = auth["tokens"]["account_id"]
    except Exception as e:
        return {"_error": f"auth parse failed: {e}"}

    headers = [h.format(token=token, acct=acct) for h in CODEX_HEADERS_TEMPLATE]
    cmd = ["curl", "-sS", "--max-time", "10", CODEX_URL] + sum(
        [["-H", h] for h in headers], []
    )
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=12)
        if r.returncode != 0:
            return {"_error": f"curl exit {r.returncode}: {r.stderr[:200]}"}
        return json.loads(r.stdout)
    except subprocess.TimeoutExpired:
        return {"_error": "codex curl timeout (12s)"}
    except json.JSONDecodeError as e:
        return {"_error": f"codex json decode: {e}"}


def fetch_claude():
    """Returns parsed claude JSON or dict with _error key on failure."""
    try:
        r = subprocess.run(
            ["security", "find-generic-password", "-s", KEYCHAIN_SERVICE, "-w"],
            capture_output=True, text=True, timeout=5,
        )
        blob = r.stdout.strip()
        if not blob:
            return {"_error": f"keychain entry missing: {KEYCHAIN_SERVICE}"}
        cred = json.loads(blob)
        token = cred["claudeAiOauth"]["accessToken"]
    except subprocess.TimeoutExpired:
        return {"_error": "keychain read timeout (5s)"}
    except Exception as e:
        return {"_error": f"keychain read failed: {e}"}

    headers = [h.format(token=token) for h in CLAUDE_HEADERS_TEMPLATE]
    cmd = ["curl", "-sS", "--max-time", "10", CLAUDE_URL] + sum(
        [["-H", h] for h in headers], []
    )
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=12)
        if r.returncode != 0:
            return {"_error": f"curl exit {r.returncode}: {r.stderr[:200]}"}
        return json.loads(r.stdout)
    except subprocess.TimeoutExpired:
        return {"_error": "claude curl timeout (12s)"}
    except json.JSONDecodeError as e:
        return {"_error": f"claude json decode: {e}"}


# ── Field extraction helpers (spec §3) ─────────────────────────────

def epoch_to_iso(epoch):
    """Codex returns reset_at as epoch seconds → ISO8601 with HKT offset."""
    if not epoch:
        return None
    try:
        dt = datetime.fromtimestamp(int(epoch), HKT)
        return dt.isoformat()
    except Exception:
        return None


def iso_to_hkt(iso):
    """Render ISO8601 as 'MM-DD HH:MM' in HKT."""
    if not iso:
        return None
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(HKT)
        return dt.strftime("%m-%d %H:%M")
    except Exception:
        return iso[:16]


def extract_codex(raw):
    """Build codex sub-object per spec §3 from raw API response."""
    if raw.get("_error") or not raw.get("rate_limit"):
        return {"available": False, "_error": raw.get("_error", "no rate_limit")}
    rl = raw["rate_limit"]
    p = rl.get("primary_window", {})
    s = rl.get("secondary_window", {})
    p_used = p.get("used_percent", 0)
    s_used = s.get("used_percent", 0)
    p_reset_iso = epoch_to_iso(p.get("reset_at"))
    s_reset_iso = epoch_to_iso(s.get("reset_at"))
    return {
        "available": True,
        "plan": raw.get("plan_type", "unknown"),
        "limit_reached": rl.get("limit_reached", False),
        "primary_5h": {
            "used_percent": p_used,
            "remaining_percent": max(0, 100 - p_used),
            "reset_at": p_reset_iso,
            "reset_at_hkt": iso_to_hkt(p_reset_iso),
            "reset_in_seconds": p.get("reset_after_seconds", 0),
            "window_seconds": p.get("limit_window_seconds", 18000),
        },
        "secondary_7d": {
            "used_percent": s_used,
            "remaining_percent": max(0, 100 - s_used),
            "reset_at": s_reset_iso,
            "reset_at_hkt": iso_to_hkt(s_reset_iso),
            "reset_in_seconds": s.get("reset_after_seconds", 0),
            "window_seconds": s.get("limit_window_seconds", 604800),
        },
    }


def extract_claude(raw):
    """Build claude sub-object per spec §3 from raw API response."""
    if raw.get("_error") or raw.get("five_hour") is None:
        return {
            "available": False,
            "subscription": "unknown",
            "_error": raw.get("_error", "no five_hour field"),
        }
    fh = raw["five_hour"]
    sd = raw["seven_day"]
    fh_used = int(fh.get("utilization", 0))
    sd_used = int(sd.get("utilization", 0))
    fh_reset = fh.get("resets_at")
    sd_reset = sd.get("resets_at")
    active = [
        {"kind": l["kind"], "percent": l["percent"]}
        for l in (raw.get("limits") or [])
        if l.get("is_active")
    ]
    # Subscription is not exposed by the OAuth usage API; spec §3 q4 says
    # "pass through whatever API returns; fallback 'unknown'".
    subscription = (
        raw.get("subscriptionType")
        or raw.get("plan_type")
        or raw.get("subscription_info", {}).get("plan")
        or "unknown"
    )
    return {
        "available": True,
        "subscription": subscription,
        "primary_5h": {
            "used_percent": fh_used,
            "remaining_percent": max(0, 100 - fh_used),
            "reset_at": fh_reset,
            "reset_at_hkt": iso_to_hkt(fh_reset),
        },
        "secondary_7d": {
            "used_percent": sd_used,
            "remaining_percent": max(0, 100 - sd_used),
            "reset_at": sd_reset,
            "reset_at_hkt": iso_to_hkt(sd_reset),
        },
        "active_limits": active,
    }


# ── Main ────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--stdout", action="store_true",
        help="Print JSON to stdout instead of writing to disk",
    )
    parser.add_argument(
        "--out", default=DEFAULT_OUT,
        help=f"Output file path (default: {DEFAULT_OUT})",
    )
    args = parser.parse_args()

    now_utc = datetime.now(timezone.utc)

    codex_raw = fetch_codex()
    claude_raw = fetch_claude()

    codex_obj = extract_codex(codex_raw)
    claude_obj = extract_claude(claude_raw)

    if not codex_obj.get("available"):
        log(f"[codex] unavailable: {codex_obj.get('_error', '?')}", err=True)
    if not claude_obj.get("available"):
        log(f"[claude] unavailable: {claude_obj.get('_error', '?')}", err=True)

    # Strip internal _error field from public output (spec §8: do NOT expose
    # full body in public JSON). Keep availability flag only.
    public_codex = {k: v for k, v in codex_obj.items() if not k.startswith("_")}
    public_claude = {k: v for k, v in claude_obj.items() if not k.startswith("_")}

    doc = {
        "_generatedAt": now_utc.isoformat().replace("+00:00", "Z"),
        "_source": "local-curl",
        "_version": 1,
        "codex": public_codex,
        "claude": public_claude,
    }

    if args.stdout:
        print(json.dumps(doc, indent=2, ensure_ascii=False))
        return 0

    out_dir = os.path.dirname(args.out)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(doc, f, indent=2, ensure_ascii=False)
    log(f"wrote {args.out} ({os.path.getsize(args.out)} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
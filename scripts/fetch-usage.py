#!/usr/bin/env python3
"""
fetch-usage.py — Combine Codex + Claude Code + Gemini quota snapshots into
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
import base64
import json
import os
import subprocess
import sys
import time
import urllib.parse
from datetime import datetime, timezone, timedelta

# V2 (Planning §3.5): hardcoded plan defaults. These override the API value
# when it returns "unknown" / "n/a" so the homepage + dashboard always have a
# meaningful plan badge (Codex=plus, Claude=pro, MiniMax=plus, Copilot=pro).
KNOWN_PLANS = {
    "codex": "plus",
    "claude": "pro",
    "gemini": "standard-tier",  # Gemini Code Assist (consumer Google account)
    "minimax": "plus",
    "copilot": "pro",
}

HKT = timezone(timedelta(hours=8))
CODEX_AUTH = os.path.expanduser("~/.codex/auth.json")
KEYCHAIN_SERVICE = "Claude Code-credentials"
# Gemini / Antigravity CLI stores OAuth token under keychain svce="gemini",
# acct="antigravity". Blob uses `go-keyring-base64:` envelope → base64 → JSON
# { token: { access_token, refresh_token, expiry }, auth_method: "consumer" }.
GEMINI_KEYCHAIN_SERVICE = "gemini"
GEMINI_KEYCHAIN_ACCOUNT = "antigravity"
# Cloud Code Assist (Gemini) backend. Platform enum is documented as
# MACOS / LINUX / WINDOWS / ANDROID / IOS — but those values return
# INVALID_ARGUMENT on the current build. PLATFORM_UNSPECIFIED (0) is the
# only enum value that the backend accepts and still returns full tier + quota
# data. Discovered 2026-06-28 by probing loadCodeAssist metadata.
GEMINI_CODE_ASSIST_URL = "https://cloudcode-pa.googleapis.com/v1internal"
GEMINI_LOAD_CODE_ASSIST = f"{GEMINI_CODE_ASSIST_URL}:loadCodeAssist"
GEMINI_RETRIEVE_USER_QUOTA = f"{GEMINI_CODE_ASSIST_URL}:retrieveUserQuota"
CODEX_URL = "https://chatgpt.com/backend-api/wham/usage"
CLAUDE_URL = "https://api.anthropic.com/api/oauth/usage"
CLAUDE_OAUTH_TOKEN_URL = "https://platform.claude.com/v1/oauth/token"
# Public Claude Code OAuth client id for platform.claude.com. The local native
# binary also contains 22422756-..., but the platform token endpoint rejects
# that legacy console id. ANTHROPIC_OAUTH_CLIENT_ID overrides this if Anthropic
# rotates the public CLI OAuth client id in a future build.
CLAUDE_OAUTH_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e"
CLAUDE_REFRESH_SKEW_MS = 60_000
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
# Cache fallback file: updated only on successful Claude fetch; read on
# transient failures (e.g. OAuth refresh 429) so the homepage still shows a
# last-known-good snapshot instead of "subscription: n/a".
DEFAULT_CACHE = "/Users/zachli/.openclaw/workspace/virtual-office/public/usage-quota-cache.json"
# Max staleness for cache fallback. 24h keeps Claude bars visible across a
# short outage without showing week-old numbers when something is actually
# broken.
MAX_CACHE_AGE_SECONDS = 24 * 3600


def log(msg, *, err=False):
    stream = sys.stderr if err else sys.stdout
    print(f"[fetch-usage] {msg}", file=stream, flush=True)


class ClaudeOAuthRefreshError(Exception):
    """Raised when the Claude OAuth refresh endpoint rejects refresh."""

    def __init__(self, status, body):
        self.status = status
        self.body = body
        self.error_code, self.error_message = self._extract_error(body)
        super().__init__(self._message())

    @staticmethod
    def _extract_error(body):
        try:
            parsed = json.loads(body)
        except Exception:
            return None, None
        if isinstance(parsed, dict):
            if isinstance(parsed.get("error"), str):
                return parsed["error"], parsed.get("error_description")
            err = parsed.get("error")
            if isinstance(err, dict):
                code = err.get("type") or err.get("code")
                return code, err.get("message")
        return None, None

    def _message(self):
        code = f" {self.error_code}" if self.error_code else ""
        msg = f": {self.error_message}" if self.error_message else ""
        return f"OAuth refresh failed: {self.status}{code}{msg}. Body: {self.body[:500]}"


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


def read_cred():
    """Read Claude Code OAuth credentials from macOS keychain."""
    r = subprocess.run(
        ["security", "find-generic-password", "-s", KEYCHAIN_SERVICE, "-w"],
        capture_output=True, text=True, timeout=5,
    )
    blob = r.stdout.strip()
    if not blob:
        detail = r.stderr.strip() or f"keychain entry missing: {KEYCHAIN_SERVICE}"
        raise RuntimeError(detail)
    return json.loads(blob)


def write_cred(cred):
    """Write updated Claude Code OAuth credentials back to macOS keychain."""
    blob = json.dumps(cred, separators=(",", ":"), ensure_ascii=False)
    r = subprocess.run(
        [
            "security",
            "add-generic-password",
            "-U",
            "-s",
            KEYCHAIN_SERVICE,
            "-a",
            "Claude Code",
            "-w",
            blob,
        ],
        capture_output=True, text=True, timeout=5,
    )
    if r.returncode != 0:
        detail = r.stderr.strip() or f"security exited {r.returncode}"
        raise RuntimeError(f"keychain write failed: {detail}")


def _claude_oauth_client_id():
    client_id = os.environ.get("ANTHROPIC_OAUTH_CLIENT_ID", "").strip()
    return client_id or CLAUDE_OAUTH_CLIENT_ID


def refresh_claude_token(cred):
    """Refresh Claude Code OAuth token when expired or expiring within 60s."""
    oauth = cred.get("claudeAiOauth")
    if not isinstance(oauth, dict):
        raise RuntimeError("keychain credential missing claudeAiOauth object")

    now_ms = int(time.time() * 1000)
    expires_at = int(oauth.get("expiresAt") or 0)
    if expires_at >= now_ms + CLAUDE_REFRESH_SKEW_MS:
        return cred

    refresh_token = oauth.get("refreshToken")
    if not refresh_token:
        raise RuntimeError("OAuth refresh failed: missing refreshToken. Manual re-auth required: run `claude` to re-login.")

    client_id = _claude_oauth_client_id()
    if not client_id:
        raise RuntimeError("OAuth refresh failed: missing client_id. Set ANTHROPIC_OAUTH_CLIENT_ID env var.")

    body = urllib.parse.urlencode(
        {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": client_id,
        }
    )
    cmd = [
        "curl",
        "-sS",
        "--max-time",
        "12",
        "-X",
        "POST",
        CLAUDE_OAUTH_TOKEN_URL,
        "-H",
        "Content-Type: application/x-www-form-urlencoded",
        "-H",
        "Accept: application/json",
        "--data-binary",
        "@-",
        "-w",
        "\n__HTTP_STATUS__:%{http_code}",
    ]
    resp_body = ""
    status = 0
    for attempt in range(3):
        try:
            r = subprocess.run(
                cmd, input=body, capture_output=True, text=True, timeout=15
            )
        except subprocess.TimeoutExpired as e:
            raise RuntimeError("OAuth refresh curl timeout (15s)") from e

        if r.returncode != 0:
            raise RuntimeError(f"OAuth refresh curl exit {r.returncode}: {r.stderr[:300]}")

        if "\n__HTTP_STATUS__:" not in r.stdout:
            raise RuntimeError(f"OAuth refresh missing HTTP status. Body: {r.stdout[:500]}")
        resp_body, status_s = r.stdout.rsplit("\n__HTTP_STATUS__:", 1)
        try:
            status = int(status_s.strip())
        except ValueError as e:
            raise RuntimeError(f"OAuth refresh invalid HTTP status: {status_s[:50]}") from e

        if status != 429 or attempt == 2:
            break
        delay = 5 if attempt == 0 else 15
        log(f"[claude] OAuth refresh rate limited; retrying in {delay}s", err=True)
        time.sleep(delay)

    if status < 200 or status >= 300:
        raise ClaudeOAuthRefreshError(status, resp_body)

    try:
        refreshed = json.loads(resp_body)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"OAuth refresh returned invalid JSON: {e}. Body: {resp_body[:500]}") from e

    access_token = refreshed.get("access_token")
    expires_in = refreshed.get("expires_in")
    if not access_token or not isinstance(expires_in, (int, float)):
        raise RuntimeError(f"OAuth refresh response missing access_token/expires_in. Body: {resp_body[:500]}")

    oauth["accessToken"] = access_token
    if refreshed.get("refresh_token"):
        oauth["refreshToken"] = refreshed["refresh_token"]
    oauth["expiresAt"] = now_ms + int(expires_in * 1000)
    if refreshed.get("scope"):
        oauth["scopes"] = refreshed["scope"].split()

    write_cred(cred)
    log(f"[claude] refreshed OAuth token; expiresAt={oauth['expiresAt']}")
    return cred


def _claude_refresh_failure_message(e):
    if isinstance(e, ClaudeOAuthRefreshError):
        code = f" {e.error_code}" if e.error_code else ""
        msg = f": {e.error_message}" if e.error_message else ""
        manual = ""
        if e.error_code == "invalid_grant":
            manual = ". Manual re-auth required: run `claude` to re-login."
        elif e.error_code in {"invalid_client", "invalid_request_error"}:
            manual = ". Check ANTHROPIC_OAUTH_CLIENT_ID; if the refresh token was revoked, run `claude` to re-login."
        return f"OAuth refresh failed: {e.status}{code}{msg}{manual}"
    return str(e)


def fetch_claude():
    """Returns parsed claude JSON or dict with _error key on failure."""
    try:
        cred = read_cred()
        cred = refresh_claude_token(cred)
        token = cred["claudeAiOauth"]["accessToken"]
    except subprocess.TimeoutExpired:
        return {"_error": "keychain read timeout (5s)"}
    except ClaudeOAuthRefreshError as e:
        return {"_error": _claude_refresh_failure_message(e)}
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
    # V2 (Planning §3.5): default plan to KNOWN_PLANS["codex"] when API
    # does not surface plan_type (legacy Codex API quirk).
    plan_raw = raw.get("plan_type")
    plan = plan_raw if plan_raw and plan_raw != "unknown" else KNOWN_PLANS["codex"]
    return {
        "available": True,
        "plan": plan,
        "limit_reached": rl.get("limit_reached", False),
        "used_percent": max(p_used, s_used),
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
            "subscription": "n/a",
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
    # V2 (Planning §3.5): hardcode subscription to KNOWN_PLANS["claude"] when
    # the OAuth API doesn't surface one. Claude OAuth does not expose plan type;
    # fall back to "pro" (per Zach 2026-06-28).
    subscription_raw = (
        raw.get("subscriptionType")
        or raw.get("plan_type")
        or raw.get("subscription_info", {}).get("plan")
    )
    subscription = subscription_raw if subscription_raw and subscription_raw not in ("n/a", "unknown") else KNOWN_PLANS["claude"]
    return {
        "available": True,
        "subscription": subscription,
        "used_percent": max(fh_used, sd_used),
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


def read_gemini_token():
    """Read Gemini / Antigravity OAuth credentials from macOS keychain.

    The Antigravity CLI (agy) stores the OAuth token under svce="gemini",
    acct="antigravity" with a `go-keyring-base64:` envelope. After unwrapping
    the JSON we extract the access_token and refresh_token.
    """
    r = subprocess.run(
        [
            "security",
            "find-generic-password",
            "-s",
            GEMINI_KEYCHAIN_SERVICE,
            "-a",
            GEMINI_KEYCHAIN_ACCOUNT,
            "-w",
        ],
        capture_output=True,
        text=True,
        timeout=5,
    )
    blob = r.stdout.strip()
    if not blob:
        detail = r.stderr.strip() or (
            f"keychain entry missing: "
            f"{GEMINI_KEYCHAIN_SERVICE}/{GEMINI_KEYCHAIN_ACCOUNT}"
        )
        raise RuntimeError(detail)
    if not blob.startswith("go-keyring-base64:"):
        raise RuntimeError(
            "gemini keychain blob missing 'go-keyring-base64:' envelope; "
            "agy CLI may have changed its storage format"
        )
    try:
        payload = json.loads(
            base64.b64decode(blob[len("go-keyring-base64:"):]).decode("utf-8")
        )
    except Exception as e:
        raise RuntimeError(f"gemini keychain blob decode failed: {e}") from e
    token = payload.get("token")
    if not isinstance(token, dict) or not token.get("access_token"):
        raise RuntimeError("gemini keychain payload missing token.access_token")
    return token


def _gemini_post(token, url, body):
    """POST to a Cloud Code Assist method using the OAuth access token."""
    cmd = [
        "curl",
        "-sS",
        "--max-time",
        "10",
        "-X",
        "POST",
        url,
        "-H",
        f"Authorization: Bearer {token}",
        "-H",
        "Content-Type: application/json",
        "-d",
        json.dumps(body),
    ]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=12)
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"gemini curl timeout (12s) for {url}")
    if r.returncode != 0:
        raise RuntimeError(f"gemini curl exit {r.returncode}: {r.stderr[:200]}")
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"gemini json decode: {e}. Body: {r.stdout[:300]}")


def fetch_gemini():
    """Returns parsed gemini dict or dict with _error key on failure.

    Uses Cloud Code Assist :retrieveUserQuota. Falls back to :loadCodeAssist
    for tier info when the quota buckets are empty.
    """
    try:
        token_obj = read_gemini_token()
    except subprocess.TimeoutExpired:
        return {"_error": "keychain read timeout (5s)"}
    except Exception as e:
        return {"_error": f"keychain read failed: {e}"}

    access_token = token_obj["access_token"]
    # loadCodeAssist: returns allowedTiers / ineligibleTiers.
    # PLATFORM_UNSPECIFIED is the only enum value that the v1internal endpoint
    # currently accepts (MACOS/LINUX/WINDOWS all return INVALID_ARGUMENT).
    load_body = {
        "metadata": {
            "ideType": "GEMINI_CLI",
            "platform": "PLATFORM_UNSPECIFIED",
            "pluginVersion": "agy-1.0.13",
        }
    }
    try:
        load_resp = _gemini_post(access_token, GEMINI_LOAD_CODE_ASSIST, load_body)
    except Exception as e:
        return {"_error": f"loadCodeAssist failed: {e}"}
    if "error" in load_resp:
        return {"_error": f"loadCodeAssist error: {load_resp['error']}"}

    # retrieveUserQuota: returns { buckets: [{ resetTime, tokenType, modelId,
    # remainingFraction }, ...] }
    try:
        quota_resp = _gemini_post(access_token, GEMINI_RETRIEVE_USER_QUOTA, {})
    except Exception as e:
        return {"_error": f"retrieveUserQuota failed: {e}"}
    if "error" in quota_resp:
        return {"_error": f"retrieveUserQuota error: {quota_resp['error']}"}

    return {
        "loadCodeAssist": load_resp,
        "retrieveUserQuota": quota_resp,
    }


def extract_gemini(raw):
    """Build gemini sub-object per spec §3 from raw API response.

    Schema differs from Codex/Claude: Gemini quota is a flat list of buckets
    (per model × tokenType), each with remainingFraction (0–1) + resetTime.
    There is no single 5h/7d window. The dashboard surfaces a per-model list
    and uses min(remainingFraction) as the headline gauge.
    """
    if raw.get("_error") or "retrieveUserQuota" not in raw:
        return {
            "available": False,
            "plan": KNOWN_PLANS["gemini"],
            "_error": raw.get("_error", "no retrieveUserQuota field"),
        }

    quota_resp = raw.get("retrieveUserQuota") or {}
    buckets_in = quota_resp.get("buckets") or []
    load_resp = raw.get("loadCodeAssist") or {}

    # Pick the active default tier id from loadCodeAssist (if surfaced),
    # otherwise fall back to KNOWN_PLANS["gemini"].
    tier_id = None
    for tier in load_resp.get("allowedTiers") or []:
        if tier.get("isDefault"):
            tier_id = tier.get("id")
            break
    if not tier_id:
        for tier in load_resp.get("allowedTiers") or []:
            tier_id = tier.get("id")
            break

    buckets_out = []
    min_remaining = 1.0
    for b in buckets_in:
        try:
            frac = float(b.get("remainingFraction", 0))
        except (TypeError, ValueError):
            frac = 0.0
        if frac < min_remaining:
            min_remaining = frac
        reset_iso = b.get("resetTime")
        buckets_out.append(
            {
                "modelId": b.get("modelId"),
                "tokenType": b.get("tokenType"),
                "remainingFraction": frac,
                "remainingPercent": round(frac * 100, 2),
                "usedPercent": round((1 - frac) * 100, 2),
                "reset_at": reset_iso,
                "reset_at_hkt": iso_to_hkt(reset_iso),
            }
        )

    ineligible = load_resp.get("ineligibleTiers") or []
    return {
        "available": True,
        "plan": tier_id or KNOWN_PLANS["gemini"],
        "used_percent": round((1 - min_remaining) * 100, 2),
        "remaining_percent": round(min_remaining * 100, 2),
        "primary_5h": None,  # Gemini does not expose a 5h window
        "secondary_7d": None,  # Gemini does not expose a 7d window
        "buckets": buckets_out,
        "ineligible_tiers": [
            {"tierId": t.get("tierId"), "reasonCode": t.get("reasonCode")}
            for t in ineligible
        ],
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
    # V2 (Planning §3.4.3): unified cron passes --set-timestamp so all JSON
    # files share the same capturedAt timestamp. Format: ISO 8601 UTC ("Z").
    parser.add_argument(
        "--set-timestamp", default=None,
        help="Override _generatedAt with this ISO 8601 UTC timestamp",
    )
    args = parser.parse_args()

    if args.set_timestamp:
        now_utc = datetime.fromisoformat(args.set_timestamp.replace("Z", "+00:00"))
    else:
        now_utc = datetime.now(timezone.utc)

    codex_raw = fetch_codex()
    claude_raw = fetch_claude()
    gemini_raw = fetch_gemini()

    codex_obj = extract_codex(codex_raw)
    claude_obj = extract_claude(claude_raw)
    gemini_obj = extract_gemini(gemini_raw)

    # Claude cache fallback (Planning §3.6.1, durable 2026-06-28):
    # if Claude failed with a TRANSIENT error (429 rate-limit, OAuth refresh
    # throttling, network/curl timeout), serve the last-known-good snapshot
    # from usage-quota-cache.json instead of blanking the bars. Permanent
    # failures (missing keychain, malformed API response, auth revoked)
    # intentionally do NOT use cache so the homepage can surface the real
    # reason via _error.
    if not claude_obj.get("available"):
        claude_err = claude_obj.get("_error", "") or ""
        is_transient = (
            "429" in claude_err
            or "rate_limit" in claude_err.lower()
            or "Rate limited" in claude_err
            or "timeout" in claude_err.lower()
        )
        if is_transient:
            cached = load_claude_cache(args.out)
            if cached:
                cached_age = _cache_age_seconds(cached, now_utc)
                if cached_age is None:
                    log("[claude] cache present but _generatedAt malformed; skipping fallback",
                        err=True)
                elif cached_age <= MAX_CACHE_AGE_SECONDS:
                    log(
                        f"[claude] serving cached snapshot (age={int(cached_age)}s, "
                        f"reason={claude_err[:80]})",
                        err=True,
                    )
                    claude_obj = dict(cached["claude"])
                    claude_obj["cached"] = True
                    claude_obj["cached_at"] = cached["_generatedAt"]
                    # Preserve the original error (now overwritten) so dashboards
                    # can explain why we are showing a stale snapshot.
                    claude_obj["_cached_due_to"] = claude_err
                else:
                    log(
                        f"[claude] cache too stale ({int(cached_age)}s > {MAX_CACHE_AGE_SECONDS}s), "
                        "showing unavailable",
                        err=True,
                    )
            else:
                log(
                    "[claude] transient failure but no cache available; "
                    "showing unavailable",
                    err=True,
                )

    if not codex_obj.get("available"):
        log(f"[codex] unavailable: {codex_obj.get('_error', '?')}", err=True)
    else:
        log(
            "[codex] available: True "
            f"5h={codex_obj.get('primary_5h', {}).get('used_percent')}% "
            f"7d={codex_obj.get('secondary_7d', {}).get('used_percent')}%"
        )
    if not claude_obj.get("available"):
        log(f"[claude] unavailable: {claude_obj.get('_error', '?')}", err=True)
    else:
        log(
            "[claude] available: True "
            f"5h={claude_obj.get('primary_5h', {}).get('used_percent')}% "
            f"7d={claude_obj.get('secondary_7d', {}).get('used_percent')}%"
        )
    if not gemini_obj.get("available"):
        log(f"[gemini] unavailable: {gemini_obj.get('_error', '?')}", err=True)
    else:
        log(
            f"[gemini] available: True "
            f"plan={gemini_obj.get('plan')} "
            f"buckets={len(gemini_obj.get('buckets') or [])} "
            f"minRemaining={gemini_obj.get('remaining_percent')}%"
        )

    # Keep Codex behavior unchanged. Claude _error is intentionally surfaced so
    # the homepage can show an actionable unavailable state instead of a stale
    # black card. Same pattern for Gemini.
    public_codex = {k: v for k, v in codex_obj.items() if not k.startswith("_")}
    public_claude = dict(claude_obj)
    # Gemini: preserve _error like Claude so index.html error row can surface
    # the real failure reason (keychain missing, INVALID_ARGUMENT, etc.)
    # instead of always falling back to a generic "unavailable".
    public_gemini = dict(gemini_obj)

    doc = {
        "_generatedAt": now_utc.isoformat().replace("+00:00", "Z"),
        "_source": "local-curl",
        "_version": 3,  # bumped: gemini field added (2026-06-28)
        "codex": public_codex,
        "claude": public_claude,
        "gemini": public_gemini,
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

    # Persist last-known-good snapshot whenever Claude fetch succeeded, so
    # a later transient failure (e.g. OAuth refresh 429) can fall back to it.
    if claude_obj.get("available") and not claude_obj.get("cached"):
        save_claude_cache(args.out, doc)
    return 0


def _cache_age_seconds(cached, now_utc):
    """Compute age (seconds) of a cache doc, or None on malformed timestamp."""
    ts = cached.get("_generatedAt") if isinstance(cached, dict) else None
    if not ts or not isinstance(ts, str):
        return None
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (now_utc - dt).total_seconds()


def load_claude_cache(out_path):
    """Load last-known-good Claude snapshot from cache file.

    Cache file path mirrors out_path but with `-cache` suffix. Returns None
    if the file is missing, malformed, or older than MAX_CACHE_AGE_SECONDS.
    """
    cache_path = out_path.replace("usage-quota.json", "usage-quota-cache.json")
    if not os.path.exists(cache_path):
        return None
    try:
        with open(cache_path) as f:
            cached = json.load(f)
    except Exception as e:
        log(f"[claude] cache read failed: {e}", err=True)
        return None
    if not isinstance(cached, dict) or not isinstance(cached.get("claude"), dict):
        log("[claude] cache malformed (missing claude)", err=True)
        return None
    if not cached["claude"].get("available"):
        log("[claude] cache snapshot is itself unavailable, skipping", err=True)
        return None
    return cached


def save_claude_cache(out_path, doc):
    """Persist last-known-good snapshot to cache file."""
    cache_path = out_path.replace("usage-quota.json", "usage-quota-cache.json")
    try:
        with open(cache_path, "w") as f:
            json.dump(doc, f, indent=2, ensure_ascii=False)
        log(f"[claude] cache updated → {cache_path}")
    except Exception as e:
        log(f"[claude] cache write failed: {e}", err=True)


if __name__ == "__main__":
    sys.exit(main())

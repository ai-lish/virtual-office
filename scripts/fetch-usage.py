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
import re
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
    "minimax": "plus",
    "copilot": "pro",
    "gemini_web": "pro",
}

HKT = timezone(timedelta(hours=8))
CODEX_AUTH = os.path.expanduser("~/.codex/auth.json")
KEYCHAIN_SERVICE = "Claude Code-credentials"
CODEX_URL = "https://chatgpt.com/backend-api/wham/usage"
CLAUDE_URL = "https://api.anthropic.com/api/oauth/usage"
CLAUDE_OAUTH_TOKEN_URL = "https://platform.claude.com/v1/oauth/token"
# V3 plan (MacD 2026-06-28): Gemini Web (gemini.google.com) quota via batchexecute.
# Auth = live Google session cookies + `at` token from WIZ_global_data.SNlM0e.
# WIZ_global_data is a page-loaded JS variable, NOT a cookie, so headless curl
# alone cannot obtain it — Playwright with a persistent Chromium profile that
# has Zach's logged-in session is the only viable path.
# Reference: gemini-voyager public/usage-observer.js (verified live, rpcid jSf9Qc).
GEMINI_WEB_PROFILE_DIR = os.path.expanduser(
    os.environ.get("GEMINI_WEB_PROFILE_DIR")
    or os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", ".pw_chrome_data"
    )
)
GEMINI_WEB_LANDING_URL = "https://gemini.google.com/app"
GEMINI_WEB_RPCID = "jSf9Qc"
GEMINI_WEB_BATCHEXECUTE_URL = (
    "https://gemini.google.com/_/BardChatUi/data/batchexecute"
)
GEMINI_WEB_NAV_TIMEOUT_MS = 25_000
# V2 (MacD 2026-07-05): Override Playwright's default Chromium with a newer
# build (chromium-1217) to avoid SIGTRAP crashes on launch with Zach's existing
# `.pw_chrome_data` persistent profile. Playwright 1.58 ships with
# chromium-1208 by default which has a known compatibility issue with profiles
# that contain heavy `Local Storage/leveldb` state. Set
# `GEMINI_WEB_CHROMIUM_PATH` to a different path if the layout moves.
_DEFAULT_GEMINI_WEB_CHROMIUM_PATH = (
    "/Users/zachli/Library/Caches/ms-playwright/chromium-1217/"
    "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/"
    "Google Chrome for Testing"
)
GEMINI_WEB_CHROMIUM_PATH = os.environ.get(
    "GEMINI_WEB_CHROMIUM_PATH", _DEFAULT_GEMINI_WEB_CHROMIUM_PATH
)
# Public Claude Code OAuth client id for platform.claude.com. The local native
# binary also contains 22422756-..., but the platform token endpoint rejects
# that legacy console id. ANTHROPIC_OAUTH_CLIENT_ID overrides this if Anthropic
# rotates the public CLI OAuth client id in a future build.
CLAUDE_OAUTH_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e"
CLAUDE_REFRESH_SKEW_MS = 60_000
CLAUDE_TMUX_SESSION = os.environ.get("CLAUDE_QUOTA_TMUX_SESSION", "claude-discord")
CLAUDE_TMUX_CAPTURE_LINES = int(os.environ.get("CLAUDE_QUOTA_TMUX_CAPTURE_LINES", "120"))
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
# V2 (MacD 2026-07-05): cache fallback for transient Claude OAuth refresh
# failures (Anthropic 429 rate_limit). When the refresh endpoint is throttled,
# serve the last successful quota snapshot from CACHE_FILE instead of a blank
# unavailable card. Cache is rewritten on every fresh successful Claude fetch.
CLAUDE_CACHE_FILE = os.path.join(
    os.path.dirname(DEFAULT_OUT), "usage-quota-cache.json"
)
# V2 (MacD 2026-07-05): separate cache file for gemini_web so a transient
# Playwright/jSf9Qc failure doesn't wipe out Claude's cache (and vice-versa).
# Same 14d / 60d max-age policy as Claude via shared _claude_cache_* helpers.
GEMINI_WEB_CACHE_FILE = os.path.join(
    os.path.dirname(DEFAULT_OUT), "usage-quota-cache-gemini-web.json"
)
# Default 14d max cache age covers the typical Anthropic IP sliding-window ban
# observed 2026-06-28 → 2026-07-05+ (≈7d so far). Override via env var
# CLAUDE_CACHE_MAX_AGE_HOURS when a longer outage is expected.
DEFAULT_CLAUDE_CACHE_MAX_AGE_HOURS = 14 * 24
DEFAULT_CLAUDE_CACHE_HARD_CAP_HOURS = 60 * 24


def _claude_cache_max_age_seconds():
    hours = int(
        os.environ.get(
            "CLAUDE_CACHE_MAX_AGE_HOURS", DEFAULT_CLAUDE_CACHE_MAX_AGE_HOURS
        )
    )
    return max(60, hours) * 3600


def _claude_cache_hard_cap_seconds():
    hours = int(
        os.environ.get(
            "CLAUDE_CACHE_HARD_CAP_HOURS", DEFAULT_CLAUDE_CACHE_HARD_CAP_HOURS
        )
    )
    return max(3600, hours) * 3600


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


def _format_age_human(age_sec):
    sec = int(age_sec)
    if sec < 0:
        sec = 0
    if sec < 60:
        return f"{sec}s"
    if sec < 3600:
        return f"{sec // 60}m"
    if sec < 86400:
        return f"{sec // 3600}h"
    return f"{sec // 86400}d"


def read_claude_cache():
    """Load last successful quota doc from CLAUDE_CACHE_FILE.

    Returns dict (full doc shape with _generatedAt + provider blocks + cache
    metadata) if cache exists and is within hard cap age. Returns None
    otherwise. JSON parse errors and missing files are also None — caller
    falls back to unavailable state.

    Annotates returned dict with _cache_age_seconds and _cache_age_human for
    human-readable surfacing.
    """
    if not os.path.exists(CLAUDE_CACHE_FILE):
        return None
    try:
        with open(CLAUDE_CACHE_FILE, "r") as f:
            data = json.load(f)
    except Exception as e:
        log(f"[claude] cache read failed: {e}", err=True)
        return None
    gen = data.get("_generatedAt")
    if not gen:
        return None
    try:
        gen_dt = datetime.fromisoformat(gen.replace("Z", "+00:00"))
    except Exception:
        return None
    now_utc = datetime.now(timezone.utc)
    age_sec = (now_utc - gen_dt).total_seconds()
    if age_sec < 0:
        age_sec = 0
    hard_cap = _claude_cache_hard_cap_seconds()
    if age_sec > hard_cap:
        log(
            f"[claude] cache too old ({_format_age_human(age_sec)} > "
            f"{_format_age_human(hard_cap)} hard cap); ignoring",
            err=True,
        )
        return None
    data["_cache_age_seconds"] = int(age_sec)
    data["_cache_age_human"] = _format_age_human(age_sec)
    return data


def write_claude_cache(doc):
    """Persist last successful full quota doc as cache. Best-effort, never raises."""
    try:
        os.makedirs(os.path.dirname(CLAUDE_CACHE_FILE), exist_ok=True)
        with open(CLAUDE_CACHE_FILE, "w") as f:
            json.dump(doc, f, indent=2, ensure_ascii=False)
    except Exception as e:
        log(f"[claude] cache write failed: {e}", err=True)


def is_transient_claude_error(err_msg):
    """True if Claude error is transient (rate limit / timeout) and cache
    fallback applies. Permanent failures (invalid_grant, keychain missing)
    intentionally do NOT trigger cache fallback — caller should surface the
    real reason."""
    if not err_msg:
        return False
    s = str(err_msg).lower()
    return any(
        k in s
        for k in (
            "429",
            "rate_limit",
            "rate limit",
            "rate-limited",
            "timeout",
            "timed out",
        )
    )


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


def _run_tmux(args, timeout=5):
    return subprocess.run(
        ["tmux"] + args,
        capture_output=True,
        text=True,
        timeout=timeout,
    )


def _tmux_session_exists(session):
    try:
        r = _run_tmux(["has-session", "-t", session], timeout=3)
        return r.returncode == 0
    except Exception:
        return False


def _tmux_capture(session):
    r = _run_tmux(
        ["capture-pane", "-t", session, "-p", "-S", f"-{CLAUDE_TMUX_CAPTURE_LINES}"],
        timeout=5,
    )
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout or "tmux capture failed").strip())
    return r.stdout


def _tmux_looks_idle(screen):
    """Avoid disrupting Claude while it is generating, asking permission, or editing."""
    if not screen:
        return False
    tail = "\n".join(screen.splitlines()[-20:])
    blocked_markers = (
        "Do you want to",
        "Esc to cancel",
        "Waiting…",
        "Percolating…",
        "Deciphering…",
        "Cogitating…",
        "Baking",
    )
    if any(marker in tail for marker in blocked_markers):
        return False
    return "❯" in tail


def _parse_percent_after(label, screen):
    pattern = re.compile(
        re.escape(label) + r".{0,400}?([0-9]{1,3})%\s+used",
        re.IGNORECASE | re.DOTALL,
    )
    matches = list(pattern.finditer(screen))
    if not matches:
        return None
    m = matches[-1]
    value = int(m.group(1))
    return max(0, min(100, value))


def _parse_reset_after(label, screen):
    pattern = re.compile(
        re.escape(label) + r".{0,500}?Resets\s+([^\n\r]+)",
        re.IGNORECASE | re.DOTALL,
    )
    matches = list(pattern.finditer(screen))
    if not matches:
        return None
    m = matches[-1]
    return " ".join(m.group(1).split()).strip()


def _parse_hkt_reset(reset_text, now_utc=None):
    if not reset_text:
        return None
    now_utc = now_utc or datetime.now(timezone.utc)
    now_hkt = now_utc.astimezone(HKT)
    clean = reset_text.replace("↓", "").replace("↑", "").strip()
    clean = re.sub(r"\s*\(Asia/Hong_Kong\)\s*", " ", clean).strip()

    for fmt in ("%I:%M%p", "%I:%M %p"):
        try:
            t = datetime.strptime(clean.replace(" ", ""), "%I:%M%p").time()
            dt = datetime(
                now_hkt.year, now_hkt.month, now_hkt.day,
                t.hour, t.minute, tzinfo=HKT
            )
            if dt <= now_hkt:
                dt += timedelta(days=1)
            return dt.isoformat()
        except Exception:
            pass

    m = re.match(r"([A-Za-z]{3})\s+(\d{1,2})\s+at\s+(\d{1,2}):(\d{2})(am|pm)", clean, re.I)
    if not m:
        m = re.match(r"([A-Za-z]{3})\s+(\d{1,2})\s+at\s+(\d{1,2})(am|pm)", clean, re.I)
        if m:
            month_name, day_s, hour_s, ampm = m.groups()
            minute_s = "00"
            m = (month_name, day_s, hour_s, minute_s, ampm)
    if m:
        month_name, day_s, hour_s, minute_s, ampm = m.groups() if hasattr(m, "groups") else m
        try:
            month = datetime.strptime(month_name.title(), "%b").month
            hour = int(hour_s) % 12
            if ampm.lower() == "pm":
                hour += 12
            dt = datetime(now_hkt.year, month, int(day_s), hour, int(minute_s), tzinfo=HKT)
            if dt <= now_hkt and (now_hkt - dt).days > 180:
                dt = datetime(now_hkt.year + 1, month, int(day_s), hour, int(minute_s), tzinfo=HKT)
            return dt.isoformat()
        except Exception:
            return None

    return None


def fetch_claude_from_tmux_usage():
    """Read live Claude quota from the existing Claude Code tmux /usage screen.

    This is a fallback for Anthropic OAuth refresh 429s. It only runs when the
    Claude channel session appears idle, to avoid interrupting active work or
    permission prompts.
    """
    session = CLAUDE_TMUX_SESSION
    if not _tmux_session_exists(session):
        return {"_error": f"tmux session missing: {session}"}

    try:
        before = _tmux_capture(session)
    except Exception as e:
        return {"_error": f"tmux capture failed before /usage: {e}"}
    if not _tmux_looks_idle(before):
        return {"_error": "tmux session not idle; skipping /usage fallback"}

    try:
        r = _run_tmux(["send-keys", "-t", session, "Escape", "C-u"], timeout=5)
        if r.returncode != 0:
            return {"_error": f"tmux clear prompt failed: {(r.stderr or r.stdout)[:200]}"}
        r = _run_tmux(["send-keys", "-t", session, "/", "u", "s", "a", "g", "e", "Enter"], timeout=5)
        if r.returncode != 0:
            return {"_error": f"tmux send /usage failed: {(r.stderr or r.stdout)[:200]}"}
        time.sleep(float(os.environ.get("CLAUDE_QUOTA_TMUX_WAIT_SECONDS", "3")))
        screen = _tmux_capture(session)
    except Exception as e:
        return {"_error": f"tmux /usage fallback failed: {e}"}
    finally:
        try:
            _run_tmux(["send-keys", "-t", session, "Escape"], timeout=3)
        except Exception:
            pass

    fh_used = _parse_percent_after("Current session", screen)
    sd_used = _parse_percent_after("Current week (all models)", screen)
    if fh_used is None or sd_used is None:
        return {"_error": "tmux /usage parse failed"}

    fh_reset_text = _parse_reset_after("Current session", screen)
    sd_reset_text = _parse_reset_after("Current week (all models)", screen)
    fh_reset = _parse_hkt_reset(fh_reset_text)
    sd_reset = _parse_hkt_reset(sd_reset_text)
    return {
        "_source": "claude-code-tmux-usage",
        "five_hour": {
            "utilization": fh_used,
            "resets_at": fh_reset,
        },
        "seven_day": {
            "utilization": sd_used,
            "resets_at": sd_reset,
        },
        "limits": [{"kind": "session", "percent": fh_used, "is_active": True}],
        "subscriptionType": KNOWN_PLANS["claude"],
    }


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
    """Build claude sub-object per spec §3 from raw API response.

    V2 (MacD 2026-07-05): on transient OAuth refresh failure (429/rate_limit/
    timeout), serve the last successful snapshot from CLAUDE_CACHE_FILE so the
    homepage keeps showing Claude bars instead of a blank unavailable card.
    Permanent failures (invalid_grant, keychain missing) skip the fallback and
    surface the real reason.
    """
    # Cache fallback path — only for transient errors.
    err = raw.get("_error")
    if err and is_transient_claude_error(err):
        cached = read_claude_cache()
        cached_claude = (cached or {}).get("claude") or {}
        if cached and cached_claude.get("available"):
            block = dict(cached_claude)
            block["cached"] = True
            block["cached_at"] = cached.get("_generatedAt")
            block["_cached_due_to"] = err
            block["_cache_age_seconds"] = cached.get("_cache_age_seconds", 0)
            block["_cache_age_human"] = cached.get("_cache_age_human", "?")
            log(
                f"[claude] cache fallback served "
                f"({block['_cache_age_human']} old; reason: {err[:80]})"
            )
            return block
        # No usable cache — surface failure with cache context so operator
        # can see whether the cache is missing or too old.
        if cached is None:
            cache_note = " (no usable cache)"
        else:
            age = cached.get("_cache_age_human", "?")
            cache_note = f" (cache too old: {age})"
        return {
            "available": False,
            "subscription": "n/a",
            "_error": err + cache_note,
        }

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
    out = {
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
    if raw.get("_source"):
        out["source"] = raw["_source"]
    return out


# ── Gemini Web (gemini.google.com) provider (V3 plan, MacD 2026-06-28) ──────
#
# Source of truth: gemini-voyager public/usage-observer.js (MIT).
# Endpoint: /_/BardChatUi/data/batchexecute, rpcid=jSf9Qc, args='[]'.
# Auth:
#   - Cookies: any active Google session for gemini.google.com
#   - `at` token: page-loaded WIZ_global_data.SNlM0e (rotates per page load)
# Headless feasibility: requires browser context (Playwright persistent
# profile). Pure curl fails because WIZ_global_data.SNlM0e is null when
# fetched without a logged-in session. Profile dir lives at
# virtual-office/.pw_chrome_data (gitignored). One-time interactive login
# required; see memory/xiaoshi-gemini-setup.md analogue for setup notes.

def _gemini_web_require_playwright():
    """Lazy import to keep stdlib-only mode for the other 4 providers."""
    try:
        from playwright.sync_api import sync_playwright  # noqa: F401
    except ImportError as e:
        raise RuntimeError(
            "playwright not installed; gemini_web provider requires it. "
            "Install with: pip install playwright && playwright install chromium"
        ) from e


def _gemini_wiz_from_page(page):
    """Read WIZ_global_data from the page. Returns dict or None."""
    return page.evaluate(
        """() => {
            try {
                const w = window.WIZ_global_data;
                if (!w || typeof w !== 'object') return null;
                return {
                    SNlM0e: typeof w.SNlM0e === 'string' ? w.SNlM0e : null,
                    cfb2h: typeof w.cfb2h === 'string' ? w.cfb2h : '',
                    FdrFJe: typeof w.FdrFJe === 'string' ? w.FdrFJe : '',
                };
            } catch(e) { return null; }
        }"""
    )


def _gemini_web_post_batch(page, at, bl, fsid, req_body, batch_url):
    """POST to batchexecute from page context (carries cookies + at token).
    Returns raw response text or raises."""
    return page.evaluate(
        """async ({url, body}) => {
            const r = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'},
                body: body,
                credentials: 'include'
            });
            if (!r.ok) {
                return { _error: 'http_' + r.status, _status: r.status };
            }
            const t = await r.text();
            return { _body: t };
        }""",
        {"url": batch_url, "body": req_body},
    )


def _gemini_parse_batchexecute(text):
    """Parse batchexecute text, return list of {rpcid, payload} dicts.

    Mirrors gemini-voyager public/usage-observer.js decoder (length-agnostic).

    V2 (MacD 2026-07-05): handle two response layouts:
      (a) legacy: ["wrb.fr", "rpcid", "<payload JSON string>"]
      (b) current: ["wrb.fr", "rpcid", null, null, null, <payload array>, "generic"]

    Live Gemini response observed 2026-07-05 wraps payload as an array at
    index 5 (null/null/null are padding fields). Use whichever slot carries
    non-null data.
    """
    if not text:
        return []
    out = []
    idx = 0
    needle = '[["wrb.fr"'
    while idx < len(text):
        at = text.find(needle, idx)
        if at < 0:
            break
        # Find matching closing bracket, respecting nesting + strings.
        depth = 0
        in_str = False
        esc = False
        end = -1
        for i in range(at, len(text)):
            ch = text[i]
            if esc:
                esc = False
                continue
            if ch == "\\":
                esc = True
                continue
            if ch == '"':
                in_str = not in_str
                continue
            if in_str:
                continue
            if ch == "[":
                depth += 1
            elif ch == "]":
                depth -= 1
                if depth == 0:
                    end = i
                    break
        if end < 0:
            break
        chunk = text[at:end + 1]
        try:
            rows = json.loads(chunk)
        except json.JSONDecodeError:
            idx = end + 1
            continue
        if isinstance(rows, list):
            for row in rows:
                if not (
                    isinstance(row, list)
                    and len(row) >= 3
                    and row[0] == "wrb.fr"
                    and isinstance(row[1], str)
                ):
                    continue
                rpcid = row[1]
                # Locate the payload slot — legacy is index 2 (string),
                # current is index 5 (array). Scan to be format-agnostic.
                payload = None
                for slot in (2, 5, 4, 3, 6):
                    if slot < len(row) and row[slot] is not None:
                        val = row[slot]
                        if isinstance(val, str):
                            try:
                                payload = json.loads(val)
                                break
                            except json.JSONDecodeError:
                                continue
                        elif isinstance(val, (list, dict)):
                            payload = val
                            break
                if payload is None:
                    continue
                out.append({"rpcid": rpcid, "payload": payload})
        idx = end + 1
    return out


def _gemini_parse_usage_payload(payload):
    """Extract [5h, 7d] metric dicts from a jSf9Qc payload.

    Payload shape (verified live, gemini-voyager test fixture):
      [2, [[limit, fraction, period, [[epoch, nanos]]], ...], false]
    period=1 -> 5h bucket, period=2 -> 7d bucket.

    V2 (MacD 2026-07-05): if the response is an error code (e.g. [7] or any
    short numeric array instead of the expected [2, [...], false] shape),
    return None, None so the caller surfaces a clear "RPC returned error
    code N" message instead of crashing on a list index out of range.
    Returns (primary_5h_dict, secondary_7d_dict) — either may be None.
    """
    if not (isinstance(payload, list) and len(payload) >= 2):
        # Error payload like [7] (Google's "no data / not entitled" sentinel).
        if isinstance(payload, list) and all(isinstance(x, int) for x in payload):
            return None, None  # caller will see no metrics and report error
        return None, None
    metrics = payload[1]
    if not isinstance(metrics, list):
        return None, None
    primary = None
    secondary = None
    for m in metrics:
        if not (isinstance(m, list) and len(m) >= 4):
            continue
        try:
            limit = int(m[0])
            fraction = float(m[1])
            period = int(m[2])
            reset_wrap = m[3]
            if not (isinstance(reset_wrap, list) and len(reset_wrap) >= 1):
                continue
            if not (isinstance(reset_wrap[0], list) and len(reset_wrap[0]) >= 1):
                continue
            epoch = int(reset_wrap[0][0])
        except (TypeError, ValueError):
            continue
        bucket = {
            "limit": limit,
            "fraction": fraction,
            "percent": max(0, min(100, round(fraction * 100))),
            "reset_epoch": epoch,
        }
        if period == 1:
            primary = bucket
        elif period == 2:
            secondary = bucket
    return primary, secondary


def fetch_gemini_web():
    """Returns parsed gemini_web dict or {_error: ...} on failure.

    Flow:
      1. Launch Playwright Chromium with persistent profile at GEMINI_WEB_PROFILE_DIR.
      2. Navigate to https://gemini.google.com/app; extract WIZ_global_data.
      3. Build batchexecute request body with rpcid jSf9Qc + at token.
      4. POST from page context (carries Google session cookies).
      5. Parse response for 5h/7d metrics.
    """
    if not os.path.isdir(GEMINI_WEB_PROFILE_DIR):
        return {
            "_error": (
                f"profile dir missing: {GEMINI_WEB_PROFILE_DIR}. "
                "Run the one-time interactive login: see memory/gemini-web-fetch-setup.md."
            )
        }
    try:
        _gemini_web_require_playwright()
        from playwright.sync_api import sync_playwright
    except RuntimeError as e:
        return {"_error": str(e)}

    try:
        with sync_playwright() as p:
            # V2 (MacD 2026-07-05): use chromium-1217 (or env override) instead
            # of the default chromium-1208 to avoid SIGTRAP launch crashes
            # with this particular persistent profile. Falls back to the
            # Playwright default if the override binary is missing.
            try:
                executable_path = (
                    GEMINI_WEB_CHROMIUM_PATH
                    if os.path.exists(GEMINI_WEB_CHROMIUM_PATH)
                    else p.chromium.executable_path
                )
            except Exception:
                executable_path = p.chromium.executable_path
            context = p.chromium.launch_persistent_context(
                user_data_dir=GEMINI_WEB_PROFILE_DIR,
                headless=True,
                # Force the full Chromium binary instead of chrome-headless-shell.
                # The persistent Gemini profile can contain regular Chrome state
                # that headless-shell rejects as malformed cache/prefs.
                executable_path=executable_path,
                args=[
                    "--no-first-run",
                    "--no-default-browser-check",
                    "--disable-blink-features=AutomationControlled",
                    "--disable-gpu",
                    "--disable-crash-reporter",
                    "--disable-crashpad",
                ],
                viewport={"width": 1400, "height": 900},
            )
            try:
                page = context.new_page()
                try:
                    page.goto(
                        GEMINI_WEB_LANDING_URL,
                        wait_until="domcontentloaded",
                        timeout=GEMINI_WEB_NAV_TIMEOUT_MS,
                    )
                except Exception as e:
                    return {
                        "_error": f"gemini.google.com navigation failed: {e}"
                    }
                wiz = _gemini_wiz_from_page(page)
                if not wiz:
                    return {
                        "_error": (
                            "no WIZ_global_data on gemini.google.com — page "
                            "may have redirected to login. Re-run "
                            "--setup-login to refresh Google session."
                        )
                    }
                # V2 (MacD 2026-07-05): SNlM0e token in WIZ_global_data is no
                # longer the auth-token of record. Google's batchexecute
                # endpoint accepts cookie-only auth (COMPASS, NID). Keep
                # reading SNlM0e for legacy compatibility but allow it to be
                # empty — the server will still validate via cookies.
                at = wiz.get("SNlM0e") or ""
                bl = wiz.get("cfb2h") or ""
                fsid = wiz.get("FdrFJe") or ""
                import random as _random
                reqid = 100000 + _random.randint(0, 800000)
                # args='[]' confirmed live by gemini-voyager
                freq = json.dumps([[[GEMINI_WEB_RPCID, "[]", None, "generic"]]])
                req_body = (
                    "f.req="
                    + urllib.parse.quote(freq, safe="")
                    + "&at="
                    + urllib.parse.quote(at, safe="")
                    + "&"
                )
                batch_url = (
                    GEMINI_WEB_BATCHEXECUTE_URL
                    + "?rpcids=" + urllib.parse.quote(GEMINI_WEB_RPCID, safe="")
                    + "&source-path=" + urllib.parse.quote("/app", safe="")
                    + "&bl=" + urllib.parse.quote(bl, safe="")
                    + "&f.sid=" + urllib.parse.quote(fsid, safe="")
                    + "&hl=en"
                    + "&_reqid=" + str(reqid)
                    + "&rt=c"
                )
                result = _gemini_web_post_batch(page, at, bl, fsid, req_body, batch_url)
                if isinstance(result, dict) and result.get("_error"):
                    return {"_error": f"batchexecute: {result.get('_error')}"}
                if not isinstance(result, dict) or "_body" not in result:
                    return {"_error": f"unexpected post response: {type(result).__name__}"}
                body = result["_body"]
            finally:
                try:
                    context.close()
                except Exception:
                    pass
    except Exception as e:
        return {"_error": f"playwright launch failed: {e}"}

    # Parse response
    rpcs = _gemini_parse_batchexecute(body)
    primary = None
    secondary = None
    for r in rpcs:
        if r["rpcid"] != GEMINI_WEB_RPCID:
            continue
        p, s = _gemini_parse_usage_payload(r["payload"])
        primary = primary or p
        secondary = secondary or s
    if primary is None and secondary is None:
        # Capture any non-jSf9Qc payload so the error message tells us what
        # the server actually returned (helps debug e.g. [7] error codes).
        err_codes = []
        for r in rpcs:
            if r["rpcid"] == GEMINI_WEB_RPCID:
                p = r.get("payload")
                if isinstance(p, list) and p and isinstance(p[0], int):
                    err_codes.append(p[0])
        detail = (
            f"jSf9Qc payload was {err_codes[0]!r} (Google's 'no data' code)"
            if err_codes
            else f"jSf9Qc RPC not found in response ({len(rpcs)} rpcs parsed)"
        )
        return {"_error": detail}
    return {"primary_5h": primary, "secondary_7d": secondary}


def extract_gemini_web(raw):
    """Build gemini_web sub-object per spec §3 from raw fetch result.

    Mirrors extract_codex / extract_claude schema:
      { available, plan, primary_5h: {...}, secondary_7d: {...}, _error? }

    V2 (MacD 2026-07-05): adds cache fallback so transient failures (e.g.
    SNlM0e missing, Playwright crashes, jSf9Qc RPC returning empty payload)
    still serve a last-known-good snapshot from
    usage-quota-cache-gemini-web.json.
    """
    if raw.get("_error"):
        # Cache fallback path — mirrors extract_claude behaviour for Claude.
        cached = _read_gemini_web_cache()
        cached_web = (cached or {}).get("gemini_web") or {}
        if cached and cached_web.get("available"):
            block = dict(cached_web)
            block["cached"] = True
            block["cached_at"] = cached.get("_generatedAt")
            block["_cached_due_to"] = raw["_error"]
            block["_cache_age_seconds"] = cached.get("_cache_age_seconds", 0)
            block["_cache_age_human"] = cached.get("_cache_age_human", "?")
            log(
                f"[gemini_web] cache fallback served "
                f"({block['_cache_age_human']} old; reason: {raw['_error'][:80]})"
            )
            return block
        cache_note = ""
        if cached is None:
            cache_note = " (no usable cache)"
        else:
            age = cached.get("_cache_age_human", "?")
            cache_note = f" (cache too old: {age})"
        return {
            "available": False,
            "plan": "n/a",
            "_error": raw["_error"] + cache_note,
        }
    p = raw.get("primary_5h")
    s = raw.get("secondary_7d")

    def _window(bucket):
        if not isinstance(bucket, dict):
            return None
        epoch = bucket.get("reset_epoch")
        reset_iso = epoch_to_iso(epoch) if epoch else None
        used = bucket.get("percent", 0)
        return {
            "used_percent": used,
            "remaining_percent": max(0, 100 - used),
            "reset_at": reset_iso,
            "reset_at_hkt": iso_to_hkt(reset_iso),
            "reset_in_seconds": (
                max(0, int(epoch) - int(now_epoch_for_reset()))
                if epoch else 0
            ),
            "window_label": "5h" if bucket is p else "7d",
            "limit": bucket.get("limit"),
        }

    return {
        "available": True,
        "plan": KNOWN_PLANS["gemini_web"],
        "primary_5h": _window(p) or {"available": False, "_error": "no 5h metric"},
        "secondary_7d": _window(s) or {"available": False, "_error": "no 7d metric"},
    }


def now_epoch_for_reset():
    """Helper for reset_in_seconds calculation. Returns current epoch seconds."""
    import time as _t
    return _t.time()


def _read_gemini_web_cache():
    """Load last successful gemini_web block from its cache file.

    Returns dict (or None) with _generatedAt and gemini_web sub-object.
    Cache keys mirror read_claude_cache() — shares the same 14d default max
    age / 60d hard cap / env-var override so behaviour is consistent across
    providers.
    """
    if not os.path.exists(GEMINI_WEB_CACHE_FILE):
        return None
    try:
        with open(GEMINI_WEB_CACHE_FILE, "r") as f:
            data = json.load(f)
    except Exception as e:
        log(f"[gemini_web] cache read failed: {e}", err=True)
        return None
    gen = data.get("_generatedAt")
    if not gen:
        return None
    try:
        gen_dt = datetime.fromisoformat(gen.replace("Z", "+00:00"))
    except Exception:
        return None
    now_utc = datetime.now(timezone.utc)
    age_sec = (now_utc - gen_dt).total_seconds()
    if age_sec < 0:
        age_sec = 0
    hard_cap = _claude_cache_hard_cap_seconds()
    if age_sec > hard_cap:
        log(
            f"[gemini_web] cache too old ({_format_age_human(age_sec)} > "
            f"{_format_age_human(hard_cap)} hard cap); ignoring",
            err=True,
        )
        return None
    data["_cache_age_seconds"] = int(age_sec)
    data["_cache_age_human"] = _format_age_human(age_sec)
    return data


def _write_gemini_web_cache(doc):
    """Persist last successful gemini_web block. Best-effort, never raises.

    Only stores the gemini_web sub-object + timestamps. Other providers'
    blocks are intentionally excluded so the cache file stays small and
    doesn't become a stale-snapshot of everything else.
    """
    try:
        os.makedirs(os.path.dirname(GEMINI_WEB_CACHE_FILE), exist_ok=True)
        out = {
            "_generatedAt": doc.get("_generatedAt"),
            "_source": doc.get("_source", "local-curl"),
            "_version": doc.get("_version", 3),
            "gemini_web": doc.get("gemini_web", {}),
        }
        with open(GEMINI_WEB_CACHE_FILE, "w") as f:
            json.dump(out, f, indent=2, ensure_ascii=False)
    except Exception as e:
        log(f"[gemini_web] cache write failed: {e}", err=True)


def _setup_gemini_web_login():
    """One-time interactive login flow for the gemini_web Playwright profile.

    Opens Chromium in NON-headless mode pointed at gemini.google.com so Zach
    can complete the Google sign-in flow. Cookies + localStorage are saved to
    GEMINI_WEB_PROFILE_DIR so subsequent cron runs can read WIZ_global_data.

    Usage:
        python3 scripts/fetch-usage.py --setup-login
    """
    try:
        _gemini_web_require_playwright()
        from playwright.sync_api import sync_playwright
    except RuntimeError as e:
        log(str(e), err=True)
        return 1

    os.makedirs(GEMINI_WEB_PROFILE_DIR, exist_ok=True)
    log(f"[setup-login] opening Chromium (non-headless) for {GEMINI_WEB_LANDING_URL}")
    log(f"[setup-login] profile dir: {GEMINI_WEB_PROFILE_DIR}")
    log("[setup-login] complete the Google sign-in flow in the opened window,")
    log("[setup-login] then navigate to gemini.google.com/app and CLOSE the browser.")
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=GEMINI_WEB_PROFILE_DIR,
            headless=False,
            args=[
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-blink-features=AutomationControlled",
                "--disable-crash-reporter",
                "--disable-crashpad",
            ],
            viewport={"width": 1400, "height": 900},
        )
        page = context.new_page()
        try:
            page.goto(GEMINI_WEB_LANDING_URL, wait_until="domcontentloaded", timeout=GEMINI_WEB_NAV_TIMEOUT_MS)
        except Exception as e:
            log(f"[setup-login] navigation failed: {e}", err=True)
        try:
            # Wait until user closes the browser window.
            page.wait_for_event("close", timeout=600_000)  # 10 min
        except Exception:
            log("[setup-login] timed out or browser closed by user", err=True)
        try:
            context.close()
        except Exception:
            pass
    log("[setup-login] done. Cron should now be able to read gemini.google.com session.")
    return 0


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
    # V3 (MacD 2026-06-28): one-time interactive Google login for the
    # Playwright persistent profile used by gemini_web. NOT for cron use.
    parser.add_argument(
        "--setup-login", action="store_true",
        help="Open Playwright Chromium (non-headless) to complete Google "
             "sign-in for the gemini_web profile, then exit. One-time setup.",
    )
    args = parser.parse_args()

    # V3 (MacD 2026-06-28): --setup-login short-circuits before fetching.
    if args.setup_login:
        return _setup_gemini_web_login()

    if args.set_timestamp:
        now_utc = datetime.fromisoformat(args.set_timestamp.replace("Z", "+00:00"))
    else:
        now_utc = datetime.now(timezone.utc)

    codex_raw = fetch_codex()
    claude_raw = fetch_claude()
    claude_err = claude_raw.get("_error") if isinstance(claude_raw, dict) else None
    if claude_err and is_transient_claude_error(claude_err):
        log(f"[claude] API transient failure; trying tmux /usage fallback: {claude_err[:120]}", err=True)
        tmux_raw = fetch_claude_from_tmux_usage()
        if tmux_raw.get("_error"):
            log(f"[claude] tmux /usage fallback unavailable: {tmux_raw['_error']}", err=True)
        else:
            claude_raw = tmux_raw
    gemini_web_raw = fetch_gemini_web()

    codex_obj = extract_codex(codex_raw)
    claude_obj = extract_claude(claude_raw)
    gemini_web_obj = extract_gemini_web(gemini_web_raw)

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
    if not gemini_web_obj.get("available"):
        log(f"[gemini_web] unavailable: {gemini_web_obj.get('_error', '?')}", err=True)
    else:
        log(
            "[gemini_web] available: True "
            f"5h={gemini_web_obj.get('primary_5h', {}).get('used_percent')}% "
            f"7d={gemini_web_obj.get('secondary_7d', {}).get('used_percent')}%"
        )

    # Keep Codex behavior unchanged. Claude _error is intentionally surfaced so
    # the homepage can show an actionable unavailable state instead of a stale
    # black card. Gemini Web follows the same surface-error pattern.
    public_codex = {k: v for k, v in codex_obj.items() if not k.startswith("_")}
    public_claude = dict(claude_obj)
    public_gemini_web = {k: v for k, v in gemini_web_obj.items() if not k.startswith("_")}

    doc = {
        "_generatedAt": now_utc.isoformat().replace("+00:00", "Z"),
        "_source": "local-curl",
        "_version": 3,
        "codex": public_codex,
        "claude": public_claude,
        "gemini_web": public_gemini_web,
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

    # V2 (MacD 2026-07-05): persist last successful snapshot as cache so
    # future runs can fall back during Anthropic OAuth refresh outages.
    # Only write when Claude was freshly fetched AND available — avoid
    # overwriting good cache with unavailable-state or cache-derived data.
    if claude_obj.get("available") and not claude_obj.get("cached"):
        write_claude_cache(doc)
    # V2 (MacD 2026-07-05): same pattern for gemini_web. Separate cache
    # file keeps the gemini_web payload small + the providers' caches
    # independent (one provider's transient failure won't reset another's).
    if gemini_web_obj.get("available") and not gemini_web_obj.get("cached"):
        _write_gemini_web_cache(doc)

    return 0


if __name__ == "__main__":
    sys.exit(main())

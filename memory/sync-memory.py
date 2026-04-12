#!/usr/bin/env python3
"""Sync memory files → virtual-office/memory/data.json (sanitized for public repo).

Now supports combining OpenClaw (MacD) memory with Hermes memory (keeps provenance).
"""
import json, os, re, glob
from datetime import datetime, timedelta
from pathlib import Path

# OpenClaw (MacD) memory
MEMORY_DIR = Path.home() / ".openclaw/workspace/memory"
MEMORY_MD  = Path.home() / ".openclaw/workspace/MEMORY.md"

# Hermes memory (independent agent)
HERMES_DIR = Path.home() / ".hermes/memories"
HERMES_MD  = HERMES_DIR / "MEMORY.md"
HERMES_SKILLS_DIR = Path.home() / ".hermes/skills"

OUT_FILE   = Path.home() / ".openclaw/workspace/virtual-office/memory/data.json"

SENSITIVE = re.compile(
    r'(api[-_]?key|token|secret|password)\s*[:=]|tvly-|sk-[a-zA-Z0-9]{20,}|secrets\.json',
    re.IGNORECASE
)

def sanitize(text: str) -> str:
    return "\n".join(l for l in text.splitlines() if not SENSITIVE.search(l))

def read_safe(path: Path) -> str:
    if path.is_file():
        return sanitize(path.read_text(errors="replace"))
    return ""

# --- OpenClaw memory (existing behavior) ---
memory_md = read_safe(MEMORY_MD)

# Daily logs (last 14 days)
daily_logs = {}
for i in range(14):
    d = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
    content = read_safe(MEMORY_DIR / f"{d}.md")
    if content:
        daily_logs[d] = content

# Topic files
topic_projects = read_safe(MEMORY_DIR / "topic-projects.md")
topic_active   = read_safe(MEMORY_DIR / "topic-active-issues.md")

# Feedback files
feedback = {}
for f in sorted(MEMORY_DIR.glob("feedback-*.md")):
    feedback[f.name] = read_safe(f)

# DREAMS.md (dream diary)
dreams_md = read_safe(Path.home() / ".openclaw/workspace/DREAMS.md")

# Dream phase reports (light / deep / REM subdirs)
phase_reports = {}
for phase in ['light', 'deep', 'REM']:
    phase_dir = MEMORY_DIR / "dreaming" / phase
    if phase_dir.exists():
        reports = {}
        for f in sorted(phase_dir.glob("*.md"))[-7:]:
            reports[f.name] = read_safe(f)
        phase_reports[phase] = reports

# Count .dreams/ items if it exists
dreams_dir = MEMORY_DIR / ".dreams"
dreams_count = len(list(dreams_dir.glob("*"))) if dreams_dir.exists() else 0

# Total file count
total_files = len(list(MEMORY_DIR.glob("*.md")))

# --- Hermes memory (new) ---
hermes_memory_md = read_safe(HERMES_MD)
hermes_daily_logs = {}
for i in range(14):
    d = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
    content = read_safe(HERMES_DIR / f"{d}.md")
    if content:
        hermes_daily_logs[d] = content

hermes_topic_projects = read_safe(HERMES_DIR / "topic-projects.md")
hermes_topic_active   = read_safe(HERMES_DIR / "topic-active-issues.md")

# Hermes skills list (filenames only)
hermes_skills = []
if (HERMES_SKILLS_DIR).exists():
    hermes_skills = [p.name for p in sorted(HERMES_SKILLS_DIR.glob("*"))]

# Assemble data (keep both sources separate to avoid accidental overwrite)
data = {
    "generated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    "sources": {
        "openclaw": {
            "totalFiles": total_files,
            "memoryMd": memory_md,
            "topicProjects": topic_projects,
            "topicActive": topic_active,
            "dailyLogs": daily_logs,
            "feedbackFiles": feedback,
            "dreamsDiary": dreams_md,
            "dreamPhaseReports": phase_reports,
            "dreamsCount": dreams_count,
        },
        "hermes": {
            "memoryMd": hermes_memory_md,
            "topicProjects": hermes_topic_projects,
            "topicActive": hermes_topic_active,
            "dailyLogs": hermes_daily_logs,
            "skills": hermes_skills,
        }
    }
}

OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
OUT_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2))
print(f"✅ Synced OpenClaw + Hermes to {OUT_FILE} ({OUT_FILE.stat().st_size} bytes)")

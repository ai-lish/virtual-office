#!/usr/bin/env python3
"""Sync memory files → virtual-office/memory/data.json (sanitized for public repo)."""
import json, os, re, glob
from datetime import datetime, timedelta
from pathlib import Path

MEMORY_DIR = Path.home() / ".openclaw/workspace/memory"
MEMORY_MD  = Path.home() / ".openclaw/workspace/MEMORY.md"
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

# MEMORY.md
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

# Total file count
total_files = len(list(MEMORY_DIR.glob("*.md")))

data = {
    "generated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    "totalFiles": total_files,
    "memoryMd": memory_md,
    "topicProjects": topic_projects,
    "topicActive": topic_active,
    "dailyLogs": daily_logs,
    "feedbackFiles": feedback,
}

OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
OUT_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2))
print(f"✅ Synced to {OUT_FILE} ({OUT_FILE.stat().st_size} bytes, {total_files} memory files)")

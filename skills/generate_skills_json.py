#!/usr/bin/env python3
"""generate_skills_json.py — scan both skill directories and write skills.json with rich metadata."""
from pathlib import Path
import json, yaml, re

home = Path.home()
skill_dirs = [home / '.openclaw' / 'skills', home / '.openclaw' / 'workspace' / 'skills']
out = home / '.openclaw' / 'workspace' / 'virtual-office' / 'skills' / 'skills.json'
out.parent.mkdir(parents=True, exist_ok=True)

SENSITIVE = re.compile(
    r'(api[-_]?key|token|secret|password)\s*[:=]|tvly-|sk-[a-zA-Z0-9]{20,}|secrets\.json',
    re.IGNORECASE
)

def sanitize(text):
    return '\n'.join(l for l in text.splitlines() if not SENSITIVE.search(l))

skills = []
for base in skill_dirs:
    if not base.exists():
        continue
    for d in sorted(base.iterdir()):
        if not d.is_dir():
            continue
        skill_md = d / 'SKILL.md'
        if not skill_md.exists():
            continue
        text = skill_md.read_text(encoding='utf-8')
        lines = text.splitlines()

        front = {}
        body = '\n'.join(lines)
        if lines and lines[0].strip() == '---':
            try:
                end = lines.index('---', 1)
                fm_text = '\n'.join(lines[1:end])
                body = '\n'.join(lines[end+1:])
                try:
                    front = yaml.safe_load(fm_text) or {}
                except:
                    pass
            except ValueError:
                pass

        # first non-empty paragraph
        para = ''
        for part in body.split('\n\n'):
            s = part.strip()
            if s:
                para = s
                break

        oc = front.get('metadata', {}).get('openclaw', {})
        if isinstance(oc, str):
            oc = {}

        loc = 'global' if '.openclaw/skills/' in str(d) else 'workspace'
        skills.append({
            'name': d.name,
            'path': str(d),
            'skill_md': str(skill_md),
            'description': para[:300],
            'lines': len(lines),
            'location': str(base),
            'loc': loc,
            'emoji': oc.get('emoji', ''),
            'triggers': oc.get('triggers', []),
            'memory_tags': oc.get('memory_tags', []),
        })

out.write_text(json.dumps(skills, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Wrote {out} ({len(skills)} skills)')

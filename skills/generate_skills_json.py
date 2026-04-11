#!/usr/bin/env python3
from pathlib import Path
import json

home = Path.home()
skill_dirs = [home / '.openclaw' / 'skills', home / '.openclaw' / 'workspace' / 'skills']
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
        # remove YAML frontmatter
        desc = ''
        lines = text.splitlines()
        if lines and lines[0].strip() == '---':
            # find next ---
            try:
                end = lines.index('---', 1)
                body = '\n'.join(lines[end+1:])
            except ValueError:
                body = '\n'.join(lines)
        else:
            body = '\n'.join(lines)
        # get first non-empty paragraph
        para = ''
        for part in body.split('\n\n'):
            s = part.strip()
            if s:
                para = s
                break
        skills.append({
            'name': d.name,
            'path': str(d),
            'skill_md': str(skill_md),
            'description': para[:300],
            'lines': len(lines),
            'location': str(base)
        })

out = Path('/Users/zachli/.openclaw/workspace/virtual-office/skills/skills.json')
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(skills, ensure_ascii=False, indent=2), encoding='utf-8')
print('Wrote', out)

#!/usr/bin/env python3.11
import sys, os, json, hashlib, random
from pathlib import Path
try:
    from PIL import Image
    import imagehash
except Exception:
    print('Missing libs; installing pillow and ImageHash...', file=sys.stderr)
    os.execvp('python3.11', ['python3.11','-m','pip','install','--user','Pillow','imagehash'])

# re-import after potential install
from PIL import Image
import imagehash

SRC = Path('/Users/zachli/.openclaw/workspace/ai-learning/hkdse/ocr-output')
DST = Path('/Users/zachli/.openclaw/workspace/ai-learning/hkdse/deduped')
REPORT = Path('/Users/zachli/.openclaw/workspace/reports/dedupe-pilot.json')
CHECKSUM = Path(str(REPORT)+'.sha256')
DST.mkdir(parents=True, exist_ok=True)
REPORT.parent.mkdir(parents=True, exist_ok=True)

# collect image files
img_ext = {'.jpg','.jpeg','.png','.gif','.webp','.tiff','.bmp'}
files = [p for p in SRC.rglob('*') if p.is_file() and p.suffix.lower() in img_ext]

hashes = {}
meta = {}

print(f'Found {len(files)} image files', file=sys.stderr)

for p in files:
    try:
        with Image.open(p) as im:
            # compute phash
            h = imagehash.phash(im)
            hashes[str(p)] = str(h)
            meta[str(p)] = {'size': p.stat().st_size, 'width': getattr(im,'width',None), 'height': getattr(im,'height',None)}
    except Exception as e:
        print('Error reading',p, e, file=sys.stderr)

# Grouping: single-linkage by Hamming distance threshold
from collections import defaultdict
phash_map = {p: imagehash.hex_to_hash(h) for p,h in hashes.items()}
threshold = 10
unassigned = set(phash_map.keys())
groups = []

while unassigned:
    base = unassigned.pop()
    group = [base]
    changed = True
    while changed:
        changed = False
        to_check = list(unassigned)
        for other in to_check:
            for member in group:
                if phash_map[member] - phash_map[other] <= threshold:
                    group.append(other)
                    unassigned.remove(other)
                    changed = True
                    break
    groups.append(group)

# choose representative: highest resolution (width*height), fallback largest file
reps = []
for g in groups:
    best = None
    best_score = -1
    for p in g:
        m = meta.get(p, {})
        score = (m.get('width') or 0) * (m.get('height') or 0)
        if score <= 0:
            score = m.get('size',0)
        if score > best_score:
            best_score = score
            best = p
    reps.append(best)

# copy representatives
import shutil
for r in reps:
    src = Path(r)
    dst = DST / src.name
    # avoid overwrite by adding suffix if exists
    if dst.exists():
        stem = dst.stem
        suf = dst.suffix
        i=1
        while True:
            candidate = DST / f"{stem}-{i}{suf}"
            if not candidate.exists():
                dst = candidate
                break
            i+=1
    shutil.copy2(src, dst)

# prepare report
report = {
    'total_images': len(files),
    'groups_found': len(groups),
    'representatives_count': len(reps),
    'threshold': threshold,
    'groups': []
}

for i,g in enumerate(groups):
    example = g[:5]
    report['groups'].append({
        'group_id': i,
        'count': len(g),
        'representative': reps[i],
        'examples': example,
        'hashes': {p:hashes[p] for p in g}
    })

# suggested deletions: all non-representatives
suggested_deletions = [p for g,rep in zip(groups,reps) for p in g if p!=rep]
report['suggested_deletions'] = suggested_deletions

# QA sample: random 1% of groups (min 20)
n_sample = max(20, max(1, int(len(groups)*0.01)))
sample_groups = random.sample(range(len(groups)), min(n_sample, len(groups)))
qa = []
for idx in sample_groups:
    # simple QA: compare sizes — if rep size >= median size mark pass
    g = groups[idx]
    sizes = [meta.get(p,{}).get('size',0) for p in g]
    med = sorted(sizes)[len(sizes)//2]
    rep_size = meta.get(reps[idx],{}).get('size',0)
    passed = rep_size >= med
    qa.append({'group_id': idx, 'passed': passed, 'reason': 'rep_size>=median' if passed else 'rep_size<median'})
report['qa_sample'] = {'sample_size': len(qa), 'results': qa}

# write report
with open(REPORT,'w',encoding='utf-8') as f:
    json.dump(report,f,ensure_ascii=False,indent=2)

# checksum
h = hashlib.sha256()
with open(REPORT,'rb') as f:
    for chunk in iter(lambda: f.read(8192), b''):
        h.update(chunk)
CHECKSUM.write_text(h.hexdigest())

# stdout summary (3 lines max)
print(f"status: success")
print(f"images={report['total_images']} groups={report['groups_found']} reps={report['representatives_count']}")
print(f"report={REPORT}")

#!/usr/bin/env python3
"""Rebuild the two diorama pages from the editable source in this bundle.

Each plot's measured layer (source/<plot>/survey.json, made by source/survey/survey.py from USGS 3DEP lidar and NAIP
imagery) is merged into its map scene first: terrain, per-building ground level, wall heights and roof facets, and the
surveyed trees. Then the Pocket City builder assembles the page and the atlas navigation is applied.
"""
from pathlib import Path
import json, math, runpy, subprocess, sys, tempfile

root = Path(__file__).resolve().parent
source = root / 'source'
builder = source / 'pocket-city/scripts/build.py'
if not builder.exists():
    raise SystemExit('Extract the full bundle first; source/pocket-city/scripts/build.py is required.')

SPECIES = ['Canopy oak', 'Shade tree', 'Young tree', 'Ornamental', 'Evergreen']
def rnd(s):
    v = math.sin(s * 127.1 + 311.7) * 43758.5453
    return v - math.floor(v)

def merged_scene(base):
    scene = json.load(open(base / 'scene.json', encoding='utf-8'))
    sv_path = base / 'survey.json'
    if not sv_path.exists():
        return scene
    sv = json.load(open(sv_path, encoding='utf-8'))
    scene['terrain'] = sv['terrain']
    for b in scene['buildings']:
        rec = sv['buildings'].get(b['id'])
        if rec: b['sv'] = rec
    extra = json.load(open(base / 'trees-extra.json', encoding='utf-8')) if (base / 'trees-extra.json').exists() else {}
    drop = extra.get('remove', [])
    trees = []
    for x, y, h, r in sv['trees'] + extra.get('add', []):
        if any((x - dx) ** 2 + (y - dy) ** 2 < dr * dr for dx, dy, dr in drop): continue
        k = rnd(x * .37 + y * 1.71)
        sp = 4 if (7 < h < 19 and k < .13) else 0 if h >= 17 else 1 if h >= 10 else 2 if h >= 6 else 3
        trees.append([x, y, sp, str(h), None, r])
    scene['trees'] = trees; scene['species'] = SPECIES
    scene['meta']['survey'] = {'source': sv['source'], 'datum': sv['terrain']['datum'], 'relief': sv['terrain']['max'],
                               'measured': sum(1 for r in sv['buildings'].values() if r.get('measured')), 'buildings': len(sv['buildings']), 'trees': len(trees)}
    return scene

for folder, output in [('square', 'oxford-square.html'), ('campus', 'ole-miss-campus.html')]:
    if len(sys.argv) > 1 and folder not in sys.argv[1:]: continue
    base = source / folder
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8') as tmp:
        json.dump(merged_scene(base), tmp, separators=(',', ':'))
    subprocess.run([sys.executable, str(builder), '--scene', tmp.name, '--city', str(base / 'city.json'),
                    '--landmarks', str(base / 'landmarks.js'), '--out', str(root / output)], check=True)
    Path(tmp.name).unlink()
runpy.run_path(str(source / 'finalize_pages.py'), run_name='__main__')
print('Rebuilt. Open index.html or run python3 serve.py.')

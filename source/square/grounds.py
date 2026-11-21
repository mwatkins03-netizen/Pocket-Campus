#!/usr/bin/env python3
"""Courthouse grounds and parking courts for the Square diorama.

The OpenStreetMap extract draws the Square's roadway as thin centre-line strips, so the parking courts around the
courthouse came out as pavement and lawn. This script (needs shapely 2) rewrites three things, always starting from
the untouched map scene kept in scene-osm.json:

  scene.json   the carriageway becomes the whole asphalt surface between the pavements and the courthouse grounds
  city.json    "ground".works: the grounds (pavement ring, lawn, walks, iron fence, shrub and flower beds, benches,
               lamps, monument apron), the two planted medians on Lamar, and islands under the trees in the courts
  city.json    a few more parked cars in the courts; the monument moved onto the south walk

The layout follows the NAIP aerial and Wikimedia Commons photographs listed in SOURCES.md. Dimensions are approximate.
Run: python3 source/square/grounds.py   then   python3 rebuild.py square
"""
import json, math, shutil
from pathlib import Path
from shapely.geometry import Polygon, Point, box, LineString
here = Path(__file__).resolve().parent
if not (here / 'scene-osm.json').exists(): shutil.copy(here / 'scene.json', here / 'scene-osm.json')
scene = json.load(open(here / 'scene-osm.json')); city = json.load(open(here / 'city.json'))
r2 = lambda v: round(v, 2)
ring = lambda g: [[r2(x), r2(y)] for x, y in list(g.exterior.coords)[:-1]]
COURT = 'w188828391'
bld = Polygon(next(b['ring'] for b in scene['buildings'] if b['id'] == COURT))

# ---- carriageway: the courts around the courthouse are asphalt ----
road = scene['roads'][0]; holes = [Polygon(h) for h in road[1:]]
grounds_hole = next(h for h in holes if h.contains(Point(0, 5)))
Y0, Y1 = -30.0, 26.0                                   # the grounds stop short of the north and south courts (aerial)
G = grounds_hole.intersection(box(-60, Y0, 60, Y1)).buffer(-.2)
keep = [road[0]]
medians = []
for h in holes:
    c = h.centroid
    if h is grounds_hole: keep.append(ring(G)); continue
    if abs(c.x) < 46 and abs(c.y) < 47 and h.area > 300: continue          # east and west crescents: parking
    if abs(c.x) < 12 and 40 < abs(c.y) < 52: medians.append(h)             # the two medians on Lamar stay
    keep.append([[r2(x), r2(y)] for x, y in list(h.exterior.coords)[:-1]])
scene['roads'][0] = keep
lawn = G.buffer(-2.7, join_style=2)
scene['lawns'] = [l for l in scene['lawns'] if l.get('kind') != 'courthouse lawn'] + [{'kind': 'courthouse lawn', 'r': [ring(lawn)]}]
json.dump(scene, open(here / 'scene.json', 'w'), separators=(',', ':'))

# ---- the grounds ----
gx0, gy0, gx1, gy1 = G.bounds; AX = -7.0                # the courthouse doors are on this axis
items = [{'k': 'pave', 'mat': 'concrete', 'p': ring(G)},
         {'k': 'pave', 'mat': 'lawn', 'p': ring(lawn), 'edge': 'none'},
         {'k': 'pave', 'mat': 'panel', 'size': 1.5, 'colour': '#ddd5c2', 'p': ring(bld.buffer(3.3, join_style=2))},
         {'k': 'pave', 'mat': 'panel', 'size': 1.5, 'colour': '#ddd5c2', 'r': [AX - 2.4, 11, AX + 2.4, gy1 - .1]},
         {'k': 'pave', 'mat': 'panel', 'size': 1.5, 'colour': '#ddd5c2', 'r': [AX - 2.4, gy0 + .1, AX + 2.4, -11]},
         {'k': 'pave', 'mat': 'panel', 'size': 1.5, 'colour': '#ddd5c2', 'r': [gx0 + .1, -1.8, -30, 1.8]},
         {'k': 'pave', 'mat': 'panel', 'size': 1.5, 'colour': '#ddd5c2', 'r': [15, -1.8, gx1 - .1, 1.8]},
         {'k': 'bed', 'p': ring(bld.buffer(1.5, join_style=2)), 'plants': 'none'}]
doors = [box(AX - 3.2, 8, AX + 3.2, 16), box(AX - 3.2, -16, AX + 3.2, -8), box(-36, -2.6, -28, 2.6), box(13, -2.6, 20, 2.6)]
line = bld.buffer(.85, join_style=2).exterior; k = 0
for i in range(int(line.length / 1.55)):                # foundation shrubs, left open at the four doors
    p = line.interpolate(i * 1.55 + .4); k += 1
    if any(d.contains(p) for d in doors): continue
    items.append({'k': 'plant', 'at': [r2(p.x), r2(p.y)], 'r': r2(.42 + .22 * ((k * 37) % 10) / 10), 'kind': 'azalea' if k % 3 == 0 else 'shrub'})
MON = [AX, -20.5]
items.append({'k': 'pave', 'mat': 'stone', 'p': [[r2(MON[0] + 3.4 * math.cos(a * math.pi / 6)), r2(MON[1] + 3.4 * math.sin(a * math.pi / 6))] for a in range(12)]})
gates = [[AX, gy1 - 2.4, 3], [AX, gy0 + 2.4, 3], [gx0 + 2.4, 0, 2.6], [gx1 - 2.4, 0, 2.6]]
items.append({'k': 'fence', 'line': ring(G.buffer(-2.35, join_style=2).simplify(.4)), 'gates': gates, 'h': .85, 'wall': .32})
for sy, ye in [(1, gy1), (-1, gy0)]:                    # flower beds, benches and lamps either side of the north and south walks
    for sx in (-1, 1):
        x0 = AX + sx * 3.2; x1 = AX + sx * 9.5
        items.append({'k': 'bed', 'r': [min(x0, x1), ye - sy * 6.6, max(x0, x1), ye - sy * 4.2] if sy > 0 else [min(x0, x1), ye + 4.2, max(x0, x1), ye + 6.6], 'plants': 'flowers', 'gap': .75})
        items.append({'k': 'bench', 'at': [AX + sx * 3.1, r2(ye - sy * 10.5)], 'a': 90 if sx > 0 else -90, 'colour': '#b08a55'})
        items.append({'k': 'lamp', 'at': [AX + sx * 3.2, r2(ye - sy * 3.3)]})
for sx, xe in [(1, gx1), (-1, gx0)]:
    items.append({'k': 'lamp', 'at': [r2(xe - sx * 3.3), 2.6], 'twin': False})
    items.append({'k': 'bench', 'at': [r2(xe - sx * 8), 2.5], 'a': 180, 'colour': '#b08a55'})
works = [{'name': 'Courthouse grounds', 'items': items}]

# ---- medians on Lamar: flowers behind a yellow kerb, shrubs at the heart ----
for m in medians:
    inner = m.buffer(-.35, join_style=2)
    if inner.is_empty: continue
    works.append({'name': 'Lamar median', 'items': [
        {'k': 'bed', 'p': ring(inner), 'plants': 'flowers', 'gap': .8, 'edge': '#d9bf5a'},
        {'k': 'plant', 'at': [r2(inner.centroid.x), r2(inner.centroid.y)], 'r': .8, 'kind': 'shrub'},
        {'k': 'plant', 'at': [r2(inner.centroid.x - 1.6), r2(inner.centroid.y)], 'r': .55, 'kind': 'shrub'},
        {'k': 'plant', 'at': [r2(inner.centroid.x + 1.6), r2(inner.centroid.y)], 'r': .55, 'kind': 'shrub'}]})

# ---- islands under the trees that stand in the parking courts ----
asphalt = Polygon(keep[0], keep[1:]).buffer(0)
isl = []
for x, y, h, r in json.load(open(here / 'survey.json'))['trees']:
    p = Point(x, y)
    if abs(x) < 46 and abs(y) < 47 and asphalt.contains(p) and not G.buffer(1).contains(p):
        isl.append({'k': 'bed', 'p': [[r2(x + 2.3 * math.cos(a * math.pi / 5 + .3)), r2(y + 2.3 * math.sin(a * math.pi / 5 + .3))] for a in range(10)], 'plants': 'low', 'gap': 1.5, 'edge': '#cfc8b6'})
if isl: works.append({'name': 'Tree islands in the parking courts', 'items': isl})

g = city.get('ground') or {}; g.update({'base': 'ground', 'relief': 7, 'works': works}); g.pop('foundation', None); city['ground'] = g
life = city['life']
life['monuments'] = [[MON[0], MON[1], 8.6]]
base = [c for c in life['parkedCars'] if not (len(c) > 4 and c[4] == 'court')]
extra = [[x, gy1 + 8.6, math.pi / 2, (i * 3) % 5, 'court'] for i, x in enumerate([-21, -18.2, -15.4, 2.4, 5.2, 10.8])] + \
        [[x, gy0 - 4.6, -math.pi / 2, (i * 2 + 1) % 5, 'court'] for i, x in enumerate([-20, -17.2, 2.2, 7.8, 10.6])]
life['parkedCars'] = base + [[r2(c[0]), r2(c[1]), r2(c[2]), c[3], c[4]] for c in extra if asphalt.contains(Point(c[0], c[1]))]
json.dump(city, open(here / 'city.json', 'w'), ensure_ascii=False, indent=1)
print('grounds', [round(v, 1) for v in G.bounds], 'items', len(items), 'medians', len(medians), 'tree islands', len(isl), 'court cars', len(life['parkedCars']) - len(base))

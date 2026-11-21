#!/usr/bin/env python3
"""Turn USGS 3DEP lidar (fetched with ept.py) and NAIP aerial imagery into the measured layer of a diorama:

  terrain   bare-earth elevation grid in plot coordinates (metres above the plot's lowest point)
  buildings for every OSM footprint: ground level, per-wall eave heights, a measured roof (planar facets fitted to the
            lidar returns, with the steps between roof levels), and the roof colour seen in the aerial photograph
  trees     tree positions, heights and crown widths found in the lidar canopy

  survey.py --scene scene.json --plot plot.json --lidar points.npy --naip aerial.png --naip-bbox W,S,E,N --out survey.json

Needs numpy, scipy, shapely 2, pillow. The lidar was flown in 2018: anything built since is reported as unmeasured.
"""
import argparse, json, math, sys
import numpy as np
from scipy import ndimage
from scipy.interpolate import griddata
import shapely
from shapely.geometry import Polygon, box as sbox, LineString
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('--scene'); ap.add_argument('--plot'); ap.add_argument('--lidar'); ap.add_argument('--naip'); ap.add_argument('--naip-bbox')
ap.add_argument('--cell', type=float, default=3.0); ap.add_argument('--out')
ap.add_argument('--fixes', help='roof-fixes.json: per-building corrections'); ap.add_argument('--ids', help='only these buildings (for checking)'); ap.add_argument('--sheet', help='folder for roof check sheets')
ap.add_argument('--cache', help='file to keep the bare-earth model and registration in between runs')
a = ap.parse_args()
scene = json.load(open(a.scene)); plot = json.load(open(a.plot))
lat0, lon0, rot, size = plot['lat'], plot['lon'], plot['rotation'], plot['size']; half = size / 2
kx, ky = 111320 * math.cos(math.radians(lat0)), 110574
cr, sr = math.cos(math.radians(-rot)), math.sin(math.radians(-rot))
R = 6378137.0

# ---- lidar points into plot coordinates (the same projection prep.py uses for the map) ----
raw = np.load(a.lidar)
k = 1 / math.cos(math.radians(lat0)); mx0 = math.radians(lon0) * R; my0 = math.log(math.tan(math.pi / 4 + math.radians(lat0) / 2)) * R
lon = np.degrees((raw[:, 0].astype(np.float64) * k + mx0) / R)
lat = np.degrees(2 * np.arctan(np.exp((raw[:, 1].astype(np.float64) * k + my0) / R)) - math.pi / 2)
ex, ny = (lon - lon0) * kx, (lat - lat0) * ky
X, Y = ex * cr - ny * sr, ex * sr + ny * cr
Z, CLS, RN, NR = raw[:, 2].astype(np.float64), raw[:, 3], raw[:, 4], raw[:, 5]
ok = (CLS != 7) & (CLS != 18) & (Z > 100) & (Z < 260)
X, Y, Z, CLS, RN, NR = X[ok], Y[ok], Z[ok], CLS[ok], RN[ok], NR[ok]

# ---- bare earth at 1 m ----
E = half + 24; n1 = int(2 * E)
def cells(x, y): return np.floor(x + E).astype(int), np.floor(y + E).astype(int)
g = CLS == 2; gi, gj = cells(X[g], Y[g]); m = (gi >= 0) & (gi < n1) & (gj >= 0) & (gj < n1)
acc = np.zeros((n1, n1)); cnt = np.zeros((n1, n1)); np.add.at(acc, (gj[m], gi[m]), Z[g][m]); np.add.at(cnt, (gj[m], gi[m]), 1)
dtm = np.where(cnt > 0, acc / np.maximum(cnt, 1), np.nan)
import os
CACHE = np.load(a.cache) if a.cache and os.path.exists(a.cache) else None
if CACHE is not None and CACHE['dtm'].shape == dtm.shape: dtm = CACHE['dtm']
else:
    CACHE = None; jj, ii = np.nonzero(~np.isnan(dtm)); allj, alli = np.mgrid[0:n1, 0:n1]
    lin = griddata((jj, ii), dtm[jj, ii], (allj, alli), method='linear'); near = griddata((jj, ii), dtm[jj, ii], (allj, alli), method='nearest')
    dtm = np.where(np.isnan(lin), near, lin); dtm = ndimage.gaussian_filter(dtm, 1.2)
def ground(x, y):
    fx, fy = np.clip(np.asarray(x) + E - .5, 0, n1 - 1.001), np.clip(np.asarray(y) + E - .5, 0, n1 - 1.001)
    i, j = np.floor(fx).astype(int), np.floor(fy).astype(int); u, v = fx - i, fy - j
    return dtm[j, i] * (1 - u) * (1 - v) + dtm[j, i + 1] * u * (1 - v) + dtm[j + 1, i] * (1 - u) * v + dtm[j + 1, i + 1] * u * v
HAG = Z - ground(X, Y)

# ---- register the lidar to the map: slide it up to 4 m so that roof returns sit inside the OSM footprints ----
polys = [Polygon(b['ring']).buffer(0) for b in scene['buildings']]
union = shapely.unary_union(polys)
hi = (CLS == 1) & (NR == 1) & (HAG > 3.5) & (np.abs(X) < half) & (np.abs(Y) < half)
hx, hy = X[hi][::3], Y[hi][::3]; best = (-1, 0, 0)
if CACHE is not None: best = tuple(float(v) for v in CACHE['best'])
else:
    for dx in np.arange(-4, 4.01, 1):
        for dy in np.arange(-4, 4.01, 1):
            s = shapely.contains_xy(union, hx + dx, hy + dy).mean()
            if s > best[0]: best = (s, dx, dy)
    _, DX, DY = best
    for dx in np.arange(DX - .75, DX + .76, .25):
        for dy in np.arange(DY - .75, DY + .76, .25):
            s = shapely.contains_xy(union, hx + dx, hy + dy).mean()
            if s > best[0]: best = (s, dx, dy)
    if a.cache: np.savez(a.cache, dtm=dtm, best=np.array(best))
_, DX, DY = best
print('register lidar to OSM: shift', DX, DY, 'm; share of high single returns inside footprints', round(best[0], 3), file=sys.stderr)
X = X + DX; Y = Y + DY
_ground0 = ground
def ground(x, y): return _ground0(np.asarray(x) - DX, np.asarray(y) - DY)

# ---- terrain grid for the drawing engine ----
cell = a.cell; n = int(round(size / cell)) + 1
gx = np.linspace(-half, half, n); GXm, GYm = np.meshgrid(gx, gx)
smooth = ndimage.gaussian_filter(dtm, 1.6)
_d = dtm; dtm = smooth; T = ground(GXm, GYm); dtm = _d
datum = float(np.floor(T.min() * 10) / 10)
terrain = {'cell': cell, 'n': n, 'datum': round(datum, 1), 'max': round(float(T.max() - datum), 1), 'z': [int(round(v * 10)) for v in (T - datum).ravel()]}
print('terrain', n, 'x', n, 'datum', datum, 'm NAVD88, relief', terrain['max'], 'm', file=sys.stderr)

# ---- aerial photograph (NAIP) for roof colours ----
img = None
if a.naip:
    img = np.asarray(Image.open(a.naip).convert('RGB')).astype(float); W, S_, E_, N_ = map(float, a.naip_bbox.split(','))
    def photo(x, y):   # plot metres -> pixel colours
        x, y = np.asarray(x), np.asarray(y); e = x * cr + y * sr; nn = -x * sr + y * cr   # undo the plot rotation
        lo, la = lon0 + e / kx, lat0 + nn / ky
        px = np.clip(((lo - W) / (E_ - W) * img.shape[1]).astype(int), 0, img.shape[1] - 1); py = np.clip(((N_ - la) / (N_ - S_) * img.shape[0]).astype(int), 0, img.shape[0] - 1)
        return img[py, px]

# ---- buildings: roofs.py reads each roof as a few planes ----
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent)); import roofs
fixes = json.load(open(a.fixes)) if a.fixes else {}
only = set(a.ids.split(',')) if a.ids else None
out_b = {}; debug = {}
for b, poly in zip(scene['buildings'], polys):
    if only and b['id'] not in only: continue
    c = np.array(b['obb']['c']); ax = np.array(b['obb']['ax']); nx = np.array([-ax[1], ax[0]])
    # ground along the outline: the building stands on its highest point; the walls reach down to the lower ground
    per = poly.exterior; samp = np.array([per.interpolate(d).coords[0] for d in np.arange(0, per.length, 1.5)])
    gz = ground(samp[:, 0], samp[:, 1]); zg = float(gz.max()); rec = {'zg': round(zg - datum, 2), 'gmin': round(float(gz.min()) - datum, 2)}
    x0, y0, x1, y1 = poly.bounds
    sel = (X > x0) & (X < x1) & (Y > y0) & (Y < y1) & (CLS == 1) & (HAG > 2.2)
    px, py, pz, pn, pr = X[sel], Y[sel], Z[sel], NR[sel], RN[sel]
    ins = shapely.contains_xy(poly, px, py) if len(px) else np.zeros(0, bool)
    px, py, pz, pn, pr = px[ins], py[ins], pz[ins], pn[ins], pr[ins]
    fx = fixes.get(b['id'], {})
    got = None if len(px) < max(25, poly.area * .5) or fx.get('skip') else roofs.reconstruct(b['ring'], b['obb'], px, py, pz, pn, pr, zg, fx)
    if got is None:
        rec['measured'] = False; out_b[b['id']] = rec; continue
    debug[b['id']] = got.pop('_debug'); rec.update({'measured': True, **got})
    if img is not None:
        cells = np.argwhere(debug[b['id']]['inside']); o = debug[b['id']]['origin']
        rp = np.array([[c[0] + ax[0] * (si + .5 + o[0]) + nx[0] * (tj + .5 + o[1]), c[1] + ax[1] * (si + .5 + o[0]) + nx[1] * (tj + .5 + o[1])] for si, tj in cells])
        inner = shapely.contains_xy(poly.buffer(-1.5), rp[:, 0], rp[:, 1]); rp = rp[inner] if inner.sum() > 8 else rp
        col = photo(rp[:, 0], rp[:, 1]); lum = col.sum(1); keep = (lum > np.percentile(lum, 30)) & (lum < np.percentile(lum, 92))
        med_c = np.median(col[keep] if keep.sum() > 4 else col, axis=0)
        rec['rc'] = '#%02x%02x%02x' % tuple(int(v) for v in med_c)
    out_b[b['id']] = rec
meas = sum(1 for r in out_b.values() if r.get('measured')); print('buildings measured', meas, 'of', len(out_b), '; facets', sum(len(r.get('facets', [])) for r in out_b.values()), 'risers', sum(len(r.get('risers', [])) for r in out_b.values()), file=sys.stderr)
if a.sheet: roofs.sheet(scene, out_b, debug, a.sheet)
if only: sys.exit(0)

# ---- trees: local tops of the canopy outside buildings ----
veg = (CLS == 1) & (HAG > 2.5) & (HAG < 45) & (np.abs(X) < half + 6) & (np.abs(Y) < half + 6)
vx, vy, vh, vn = X[veg], Y[veg], HAG[veg], NR[veg]
keep = ~shapely.contains_xy(union.buffer(1.2), vx, vy); vx, vy, vh, vn = vx[keep], vy[keep], vh[keep], vn[keep]
EC = half + 6; nc = int(2 * EC); chm = np.zeros((nc, nc)); multi = np.zeros((nc, nc)); tot = np.zeros((nc, nc))
ci, cj = np.floor(vx + EC).astype(int), np.floor(vy + EC).astype(int); np.maximum.at(chm, (cj, ci), vh); np.add.at(multi, (cj, ci), vn > 1); np.add.at(tot, (cj, ci), 1)
# a tree returns several echoes per pulse; poles, wires, lorries and awnings return one. Keep canopy where echoes are mixed nearby
mshare = ndimage.uniform_filter(multi, 5) / np.maximum(ndimage.uniform_filter(tot, 5), 1e-6)
canopy = (chm > 2.5) & (mshare > .12); canopy = ndimage.binary_opening(canopy, iterations=1)
chm_s = ndimage.gaussian_filter(np.where(canopy, chm, 0), 1.3)
trees = []
win = ndimage.maximum_filter(chm_s, size=7) == chm_s
cand = np.argwhere(win & (chm_s > 3.5)); cand = cand[np.argsort(-chm_s[cand[:, 0], cand[:, 1]])]
taken = []
for j, i in cand:
    h = float(chm[max(0, j - 1):j + 2, max(0, i - 1):i + 2].max()); x, y = i + .5 - EC, j + .5 - EC
    if abs(x) > half - 1 or abs(y) > half - 1: continue
    gap = max(3.2, min(9.5, h * .42))
    if any((x - tx) ** 2 + (y - ty) ** 2 < (min(gap, tg)) ** 2 for tx, ty, tg in taken): continue
    # crown radius: how far the canopy stays above 55% of this top, averaged over eight directions
    rads = []
    for ang in np.arange(0, 2 * math.pi, math.pi / 4):
        rr = 1.0
        while rr < 13:
            jj, ii = int(j + math.sin(ang) * rr), int(i + math.cos(ang) * rr)
            if not (0 <= jj < nc and 0 <= ii < nc) or chm_s[jj, ii] < .55 * chm_s[j, i]: break
            rr += 1
        rads.append(rr)
    r = float(np.median(rads)); taken.append((x, y, gap)); trees.append([round(x, 1), round(y, 1), round(h, 1), round(min(r, 11), 1)])
print('trees found', len(trees), file=sys.stderr)
json.dump({'source': 'USGS 3DEP lidar MS_MississippiDelta_A1_2018; USDA NAIP aerial imagery', 'shift': [float(DX), float(DY)], 'terrain': terrain, 'buildings': out_b, 'trees': trees}, open(a.out, 'w'), separators=(',', ':'))
print('wrote', a.out, file=sys.stderr)

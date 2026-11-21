"""Roof reconstruction from lidar returns over one building footprint.

The roof is read as a small set of planes, the way a roofer would describe it, instead of a mosaic of little squares:

  1. a 1 m height raster in the building's own axes (last returns; cells that are mostly split echoes are trees and are left
     blank; the outermost metre is left out of the fit because it mixes wall, gutter and ground)
  2. planes grown from the smoothest spots: a cell joins a plane if it lies within 25 cm of it; planes that turn out to be
     the same are merged; nearly level planes are made level and planes that run with the building are squared to it
  3. small patches are dropped unless they stand a metre or more above the roof around them (stair heads, plant rooms)
  4. where two planes meet along a ridge, hip or valley the boundary is moved to the line where they intersect
  5. the patchwork is turned into polygons with shared, straightened edges; a riser is recorded wherever two neighbouring
     polygons differ in height, and each outline wall rises to the roof beside it, plus a parapet where the lidar shows one

Returns the pieces survey.py stores for the drawing engine: facets (rings of x, y, z), risers, walls, top, med.
"""
import math
import numpy as np
from scipy import ndimage
import shapely
from shapely.geometry import Polygon, LineString, Point, box as sbox
from shapely.ops import polygonize, unary_union

TOL = .25          # a return belongs to a plane within this many metres
LEVEL = .04        # slopes gentler than this are drawn level
STEP = .4          # neighbouring facets further apart than this get a riser


def _local_fits(z, rel, r=2):
    """Least-squares plane in the (2r+1)^2 window round every cell: value at the cell, slopes, rms and count."""
    w = rel.astype(float); zz = np.where(rel, z, 0.)
    k = np.arange(-r, r + 1); DX, DY = np.meshgrid(k, k, indexing='ij'); one = np.ones_like(DX, float)
    cor = lambda img, ker: ndimage.correlate(img, ker.astype(float), mode='constant')
    S = cor(w, one); Sx = cor(w, DX); Sy = cor(w, DY); Sxx = cor(w, DX * DX); Syy = cor(w, DY * DY); Sxy = cor(w, DX * DY)
    Sz = cor(zz, one); Sxz = cor(zz, DX); Syz = cor(zz, DY); Szz = cor(zz * zz, one)
    A = np.stack([np.stack([S, Sx, Sy], -1), np.stack([Sx, Sxx, Sxy], -1), np.stack([Sy, Sxy, Syy], -1)], -2)
    B = np.stack([Sz, Sxz, Syz], -1)
    ok = rel & (S >= 10) & (np.abs(np.linalg.det(A)) > 1e-3)
    co = np.zeros(z.shape + (3,)); co[ok] = np.linalg.solve(A[ok], B[ok][..., None])[..., 0]
    rss = Szz - (co[..., 0] * Sz + co[..., 1] * Sxz + co[..., 2] * Syz)
    rms = np.where(ok, np.sqrt(np.maximum(rss, 0) / np.maximum(S, 1)), 9.)
    return co, rms, ok


def _fit(cells_i, cells_j, zv, mode='free'):
    """Plane z = a + b i + c j through cells; mode 'level', 'i' (slope along i only), 'j', or 'free'."""
    if mode == 'level' or len(zv) < 3: return np.array([float(np.median(zv)), 0., 0.])
    cols = [np.ones(len(zv))] + ([cells_i] if mode in ('free', 'i') else []) + ([cells_j] if mode in ('free', 'j') else [])
    A = np.stack(cols, 1); co, *_ = np.linalg.lstsq(A, zv, rcond=None)
    if mode == 'i': return np.array([co[0], co[1], 0.])
    if mode == 'j': return np.array([co[0], 0., co[1]])
    return co


def _snap(I, J, Z):
    co = _fit(I, J, Z); g = math.hypot(co[1], co[2])
    if g < LEVEL: return _fit(I, J, Z, 'level')
    if abs(co[2]) < .22 * abs(co[1]) or abs(co[2]) < .03: c2 = _fit(I, J, Z, 'i'); return c2
    if abs(co[1]) < .22 * abs(co[2]) or abs(co[1]) < .03: c2 = _fit(I, J, Z, 'j'); return c2
    return co


def segment(z, rel, inside, fx=None):
    fx = fx or {}
    """Label every cell inside the footprint with a plane. Returns labels and plane coefficients."""
    N, M = z.shape; II, JJ = np.mgrid[0:N, 0:M].astype(float)
    lab = -np.ones((N, M), int); planes = []
    four = ndimage.generate_binary_structure(2, 1)
    def grow(r, max_rms, tol, least):
        co0, rms, okf = _local_fits(z, rel & (lab < 0), r)
        if r == 1: okf &= ndimage.correlate((rel & (lab < 0)).astype(int), np.ones((3, 3), int), mode='constant') >= 7
        seeds = np.argwhere(okf & (rms < max_rms)); seeds = seeds[np.argsort(rms[seeds[:, 0], seeds[:, 1]])]
        for si, sj in seeds:
            if lab[si, sj] >= 0: continue
            c = co0[si, sj]; co = np.array([c[0] - c[1] * si - c[2] * sj, c[1], c[2]])
            if math.hypot(co[1], co[2]) > 1.5: continue
            comp = None
            for _ in range(4):
                ok = rel & (lab < 0) & (np.abs(z - (co[0] + co[1] * II + co[2] * JJ)) < tol)
                if not ok[si, sj]: comp = None; break
                cl, _n = ndimage.label(ok, four); comp = cl == cl[si, sj]
                if comp.sum() < least: break
                co = _fit(II[comp], JJ[comp], z[comp])
            if comp is None or comp.sum() < least: continue
            lab[comp] = len(planes); planes.append(co)
            if len(planes) > 110: break
    grow(2, .16, TOL, 4)
    grow(1, .22, .35, 6)          # what the strict pass left: short hip ends, slopes broken by dormers
    # cells beside a plane and close to it belong to it (dormer cheeks, vents, noise on a slope)
    for _ in range(6):
        took = False
        for k in range(len(planes)):
            m = lab == k
            if not m.any(): continue
            near = ndimage.binary_dilation(m, four) & rel & (lab < 0) & (np.abs(z - (planes[k][0] + planes[k][1] * II + planes[k][2] * JJ)) < .6)
            if near.any(): lab[near] = k; took = True
        if not took: break
    # what is left in sizeable patches is rough roof (plant, clutter): level at its median
    left = rel & (lab < 0); cl, n = ndimage.label(left, four)
    for k in range(1, n + 1):
        m = cl == k
        if m.sum() >= 4: lab[m] = len(planes); planes.append(np.array([float(np.median(z[m])), 0., 0.]))
    if not planes:
        m = inside & np.isfinite(z); base = float(np.median(z[m])) if m.any() else 0.
        return np.where(inside, 0, -1), [np.array([base, 0., 0.])]
    pred = lambda k: planes[k][0] + planes[k][1] * II + planes[k][2] * JJ

    def neighbours():
        prs = {}
        for a, b in ((lab[:-1, :], lab[1:, :]), (lab[:, :-1], lab[:, 1:])):
            m = (a >= 0) & (b >= 0) & (a != b)
            for p, q in zip(a[m], b[m]): k = (min(p, q), max(p, q)); prs[k] = prs.get(k, 0) + 1
        return prs

    def border(p, q):
        m = (lab == p) & ndimage.binary_dilation(lab == q, four); m2 = (lab == q) & ndimage.binary_dilation(lab == p, four)
        return m | m2
    # merge planes that are one plane
    for _ in range(6):
        merged = False
        for (p, q), cnt in sorted(neighbours().items(), key=lambda kv: -kv[1]):
            if cnt < 2 or not (lab == p).any() or not (lab == q).any(): continue
            bm = border(p, q); d = np.abs(pred(p)[bm] - pred(q)[bm])
            if np.median(d) < .42 and math.hypot(planes[p][1] - planes[q][1], planes[p][2] - planes[q][2]) < .07:
                m = (lab == p) | (lab == q); co = _fit(II[m], JJ[m], z[m])
                if np.percentile(np.abs(z[m] - (co[0] + co[1] * II[m] + co[2] * JJ[m])), 90) < (.5 if np.median(d) >= .2 else TOL * 1.5):
                    lab[lab == q] = p; planes[p] = co; merged = True
        if not merged: break
    for k in range(len(planes)):
        m = lab == k
        if m.sum() >= 3: planes[k] = _snap(II[m], JJ[m], z[m])
    # which slopes are roof slopes? A real one has a sloping partner across a ridge, hip or valley, or it is a monopitch that
    # covers a good share of the building. Anything else that slopes is the smeared fall between two flat roofs (the lidar
    # spreads a step over a metre or two) or a flat roof's drainage fall: steep ones are given back to the roofs either side,
    # gentle ones are drawn level. This is what keeps ramps and wedges off flat-roofed blocks.
    total = max(1, int((lab >= 0).sum())); slope = lambda k: math.hypot(planes[k][1], planes[k][2])
    def partnered(k):
        m = lab == k; ring = ndimage.binary_dilation(m, iterations=2) & (lab >= 0) & ~m
        for q in np.unique(lab[ring]):
            if slope(q) < .12 or math.hypot(planes[k][1] - planes[q][1], planes[k][2] - planes[q][2]) < .08: continue
            bm = border(k, q)
            if bm.sum() >= 3 and np.median(np.abs(pred(k)[bm] - pred(q)[bm])) < .5: return True
        return False
    real = {k for k in range(len(planes)) if (lab == k).any() and slope(k) >= LEVEL and (partnered(k) or (slope(k) >= .1 and (lab == k).sum() >= .6 * total))}
    # a building is pitched or it is not: unless real slopes of some steepness cover a fair share of it, every plane is level
    pitched_share = sum(int((lab == k).sum()) for k in real if slope(k) >= .18) / total
    if fx.get('pitched') is False or (pitched_share < .22 and not fx.get('pitched')): real = set()
    for k in range(len(planes)):
        m = lab == k
        if not m.any() or slope(k) < LEVEL or k in real: continue
        thick = 2 * ndimage.distance_transform_edt(np.pad(m, 1))[1:-1, 1:-1].max()
        if slope(k) > .3 or (slope(k) > .15 and thick <= 5): lab[m] = -1
        else: planes[k] = np.array([float(np.median(z[m])), 0., 0.])
    # level roofs that now differ by less than a step are one roof
    for _ in range(6):
        merged = False
        for (p_, q_), cnt in sorted(neighbours().items(), key=lambda kv: -kv[1]):
            if cnt < 2 or slope(p_) > 0 or slope(q_) > 0 or not (lab == p_).any() or not (lab == q_).any(): continue
            if abs(planes[p_][0] - planes[q_][0]) < .42:
                a_, b_ = (lab == p_).sum(), (lab == q_).sum(); planes[p_] = np.array([(planes[p_][0] * a_ + planes[q_][0] * b_) / (a_ + b_), 0., 0.]); lab[lab == q_] = p_; merged = True
        if not merged: break
    # drop small patches unless they stand clear of the roof round them
    ncell = int(inside.sum()); amin = fx.get('amin') or max(6, min(26, int(.012 * ncell)))
    for _ in range(3):
        changed = False
        sizes = np.bincount(lab[lab >= 0], minlength=len(planes))
        for k in np.argsort(sizes):
            if sizes[k] == 0: continue
            m = lab == k; ring = ndimage.binary_dilation(m, iterations=2) & (lab >= 0) & ~m
            if not ring.any(): continue
            around = np.array([planes[q][0] + planes[q][1] * II[m].mean() + planes[q][2] * JJ[m].mean() for q in np.unique(lab[ring])])
            mine = float(np.median(z[m])); up = mine - around.max(); down = around.min() - mine
            keep = sizes[k] >= amin or (up >= 1.0 and sizes[k] >= 5)
            if sizes[k] < 2 * amin and down > .6 and up < 0: keep = False      # a small pit between higher roofs is shadow or a gap
            if not keep: lab[m] = -1; changed = True
            elif sizes[k] < amin: planes[k] = np.array([mine, 0., 0.])
        if not changed: break
    if not (lab >= 0).any():
        m = inside & np.isfinite(z); return np.where(inside, 0, -1), [np.array([float(np.median(z[m])), 0., 0.])]
    idx = ndimage.distance_transform_edt(lab < 0, return_distances=False, return_indices=True)
    lab = np.where(inside, lab[idx[0], idx[1]], -1)
    # a slope must not be carried over ground it does not fit: cells handed to it that stand well off it become a level roof of their own
    for k in range(len(planes)):
        if math.hypot(planes[k][1], planes[k][2]) < LEVEL: continue
        bad = (lab == k) & np.isfinite(z) & (np.abs(z - pred(k)) > 1.0)
        if not bad.any(): continue
        cl, n = ndimage.label(bad, four)
        for c_ in range(1, n + 1):
            m = cl == c_
            if m.sum() >= 8: lab[m] = len(planes); planes.append(np.array([float(np.median(z[m])), 0., 0.]))
    # ridges, hips and valleys: the boundary belongs on the line where the two planes meet
    for _ in range(3):
        for (p, q), cnt in neighbours().items():
            if cnt < 3: continue
            mp, mq = lab == p, lab == q
            if math.hypot(planes[p][1] - planes[q][1], planes[p][2] - planes[q][2]) < .08: continue
            bm = border(p, q); zp, zq = pred(p), pred(q)
            if np.median(np.abs(zp[bm] - zq[bm])) > .5: continue
            dp = float(np.mean(zp[mp] - zq[mp])); dq = float(np.mean(zq[mq] - zp[mq]))
            if dp < 0 and dq < 0: pick_p = zp <= zq          # each is the lower one over its own ground: a ridge or hip
            elif dp > 0 and dq > 0: pick_p = zp >= zq        # a valley
            else: continue
            band = ndimage.binary_dilation(bm, iterations=4) & (mp | mq)
            lab[band & pick_p] = p; lab[band & ~pick_p] = q
    # ragged step edges: each cell takes the commonest label among its neighbours, twice
    for _ in range(2):
        ks = np.unique(lab[lab >= 0]); votes = np.stack([ndimage.uniform_filter((lab == k).astype(float), 3, mode='constant') for k in ks], 0)
        best = ks[np.argmax(votes, 0)]; own = np.take_along_axis(votes, np.searchsorted(ks, np.where(lab >= 0, lab, ks[0]))[None], 0)[0]
        lab = np.where(inside & (votes.max(0) > own + .12), best, lab)
    # a single stray cell takes the label round it
    for _ in range(2):
        for k in np.unique(lab[lab >= 0]):
            m = lab == k; lone = m & (ndimage.correlate(m.astype(int), np.ones((3, 3), int), mode='constant') <= 2)
            if lone.any():
                lab[lone] = -1
        if (lab[inside] < 0).any():
            idx = ndimage.distance_transform_edt(lab < 0, return_distances=False, return_indices=True); lab = np.where(inside, lab[idx[0], idx[1]], -1)
    return lab, planes


def _dp(pts, tol):
    """Douglas-Peucker on an open line, ends kept."""
    if len(pts) < 3: return pts
    a, b = np.array(pts[0], float), np.array(pts[-1], float); d = b - a; L = np.hypot(*d)
    P = np.array(pts, float)
    dist = np.hypot(*(P - a).T) if L < 1e-9 else np.abs(d[0] * (P[:, 1] - a[1]) - d[1] * (P[:, 0] - a[0])) / L
    k = int(np.argmax(dist))
    if dist[k] <= tol: return [pts[0], pts[-1]]
    return _dp(pts[:k + 1], tol)[:-1] + _dp(pts[k:], tol)


def _square(s, free):
    """Straighten a simplified boundary: runs that nearly follow the building's axes are made to follow them exactly,
    short jogs between them are folded in, corners become right angles; the two ends stay where they are.
    free: a ridge or hip, left as the straight line it is."""
    if free or len(s) < 3: return s
    P = [np.array(p, float) for p in s]; segs = []
    for a, b in zip(P[:-1], P[1:]):
        d = b - a; L = float(np.hypot(*d)); ang = abs(math.degrees(math.atan2(d[1], d[0]))) % 180
        if ang < 27 or ang > 153: segs.append(['h', (a[1] + b[1]) / 2, L, a, b])
        elif 63 < ang < 117: segs.append(['v', (a[0] + b[0]) / 2, L, a, b])
        else: segs.append(['f', 0, L, a, b])
    # a short piece between two runs is a jog, not an edge of its own
    k = 1
    while k < len(segs) - 1:
        if segs[k][2] <= 1.7 and segs[k - 1][0] != 'f' and segs[k + 1][0] != 'f' and (segs[k][0] == 'f' or segs[k - 1][0] == segs[k + 1][0] != segs[k][0] and abs(segs[k - 1][1] - segs[k + 1][1]) < 1.4): segs.pop(k)
        else: k += 1
    # neighbouring runs the same way and nearly in line are one run
    k = 0
    while k < len(segs) - 1:
        A, B = segs[k], segs[k + 1]
        if A[0] == B[0] != 'f' and abs(A[1] - B[1]) < 1.4:
            A[1] = (A[1] * A[2] + B[1] * B[2]) / (A[2] + B[2]); A[2] += B[2]; A[4] = B[4]; segs.pop(k + 1)
        else: k += 1
    out = [tuple(P[0])]
    for k in range(len(segs) - 1):
        A, B = segs[k], segs[k + 1]; v = (A[4] + B[3]) / 2
        if A[0] == 'h' and B[0] == 'v': out.append((B[1], A[1]))
        elif A[0] == 'v' and B[0] == 'h': out.append((A[1], B[1]))
        elif A[0] == 'h' and B[0] == 'h': out += [(v[0], A[1]), (v[0], B[1])]
        elif A[0] == 'v' and B[0] == 'v': out += [(A[1], v[1]), (B[1], v[1])]
        elif A[0] == 'h': out.append((v[0], A[1]))
        elif A[0] == 'v': out.append((A[1], v[1]))
        elif B[0] == 'h': out.append((v[0], B[1]))
        elif B[0] == 'v': out.append((B[1], v[1]))
        else: out.append(tuple(v))
    # the fixed ends: step square onto the first and last runs instead of slanting to them
    a0, aN = segs[0], segs[-1]
    if a0[0] == 'h' and abs(P[0][1] - a0[1]) > .05: out.insert(1, (P[0][0], a0[1]))
    elif a0[0] == 'v' and abs(P[0][0] - a0[1]) > .05: out.insert(1, (a0[1], P[0][1]))
    out.append(tuple(P[-1]))
    if aN[0] == 'h' and abs(P[-1][1] - aN[1]) > .05: out.insert(len(out) - 1, (P[-1][0], aN[1]))
    elif aN[0] == 'v' and abs(P[-1][0] - aN[1]) > .05: out.insert(len(out) - 1, (aN[1], P[-1][1]))
    res = [out[0]]
    for p in out[1:]:
        if math.hypot(p[0] - res[-1][0], p[1] - res[-1][1]) > .05: res.append(p)
    # a step between two roof levels follows the building: whatever still runs on the slant becomes a square corner
    sq = [res[0]]
    for p in res[1:]:
        a = sq[-1]; dx, dy = abs(p[0] - a[0]), abs(p[1] - a[1])
        if dx > .3 and dy > .3: sq.append((p[0], a[1]) if dx >= dy else (a[0], p[1]))
        sq.append(p)
    return sq


def polygons(lab, local, tol=.8, smooth=None):
    """Label raster -> polygons that share straightened boundaries and fill the footprint exactly."""
    N, M = lab.shape; segs = {}                       # lattice edges between two different roof labels
    def add(p, q): segs.setdefault(p, []).append(q); segs.setdefault(q, []).append(p)
    a, b = lab[:-1, :], lab[1:, :]
    for i, j in np.argwhere((a != b) & (a >= 0) & (b >= 0)): add((i + 1, j), (i + 1, j + 1))
    a, b = lab[:, :-1], lab[:, 1:]
    for i, j in np.argwhere((a != b) & (a >= 0) & (b >= 0)): add((i, j + 1), (i + 1, j + 1))
    lines = []; used = set()
    def pair_of(p, q):                                  # the two labels either side of a lattice edge
        (i0, j0), (i1, j1) = sorted((p, q))
        if i0 == i1: a_, b_ = (i0 - 1, j0), (i0, j0)
        else: a_, b_ = (i0, j0 - 1), (i0, j0)
        return tuple(sorted((int(lab[a_]), int(lab[b_]))))
    def walk(start, nxt):
        path = [start, nxt]; used.add(frozenset((start, nxt)))
        while len(segs[path[-1]]) == 2 and path[-1] != start:
            c = path[-1]; n = [v for v in segs[c] if v != path[-2]]
            if not n or frozenset((c, n[0])) in used: break
            used.add(frozenset((c, n[0]))); path.append(n[0])
        return path
    nodes = [p for p, v in segs.items() if len(v) != 2]
    for p in nodes:
        for q in segs[p]:
            if frozenset((p, q)) not in used: lines.append(walk(p, q))
    for p in list(segs):                               # closed loops with no junction (a box in the middle of a roof)
        for q in segs[p]:
            if frozenset((p, q)) not in used:
                path = walk(p, q)
                if len(path) > 4:
                    h = len(path) // 2; lines.append(path[:h + 1]); lines.append(path[h:] + ([path[0]] if path[-1] != path[0] else []))
                else: lines.append(path)
    rings_ = [LineString(local.exterior.coords)] + [LineString(r.coords) for r in local.interiors]; work = list(rings_)
    def at_rim(p):                                      # a lattice corner with open air (or the raster edge) beside it
        i, j = p
        for di in (-1, 0):
            for dj in (-1, 0):
                a_, b_ = i + di, j + dj
                if not (0 <= a_ < N and 0 <= b_ < M) or lab[a_, b_] < 0: return True
        return False
    for path in lines:
        raw = [(float(x), float(y)) for x, y in path]
        if smooth and pair_of(path[0], path[1]) in smooth:      # a ridge, hip or valley is a straight line
            s = _dp(raw, 2.2); s = s if len(s) == 2 else _dp(raw, 1.3)
        else: s = _square(_dp(raw, tol), False)
        for end in (0, -1):                             # an end that stops at the rim of the raster is carried to the true outline
            if not at_rim(path[end]): continue
            p = Point(s[end]); outline = min(rings_, key=lambda r: r.distance(p))
            q = outline.interpolate(outline.project(p)); v = np.array([q.x - p.x, q.y - p.y]); L = np.hypot(*v)
            ext = (q.x + v[0] / L * .3, q.y + v[1] / L * .3) if L > 1e-6 else (q.x, q.y)
            if end == 0: s = [ext] + s
            else: s = s + [ext]
        if len(s) >= 2 and LineString(s).length > .05: work.append(LineString(s))
    faces = [f for f in polygonize(unary_union(work)) if f.area > .05 and local.buffer(.05).contains(f.representative_point())]
    out = []
    for f in faces:
        # the label under most of the face
        x0, y0, x1, y1 = f.bounds; ii, jj = np.mgrid[max(0, int(x0)):min(N, int(math.ceil(x1))), max(0, int(y0)):min(M, int(math.ceil(y1)))]
        if ii.size == 0: continue
        m = shapely.contains_xy(f, ii.ravel() + .5, jj.ravel() + .5); ls = lab[ii.ravel()[m], jj.ravel()[m]]; ls = ls[ls >= 0]
        if len(ls) == 0:
            p = f.representative_point(); i, j = min(N - 1, max(0, int(p.x))), min(M - 1, max(0, int(p.y))); l = lab[i, j]
            if l < 0:
                idx = ndimage.distance_transform_edt(lab < 0, return_distances=False, return_indices=True); l = lab[idx[0][i, j], idx[1][i, j]]
        else: l = int(np.bincount(ls).argmax())
        out.append((f, int(l)))
    # a face too small to be a roof of its own takes the label of the neighbour it shares most edge with
    for _ in range(2):
        for k, (f, l) in enumerate(out):
            if f.area >= 3.5: continue
            best, bl = None, 0
            for k2, (f2, l2) in enumerate(out):
                if k2 == k or l2 == l or not f.intersects(f2): continue
                L = f.intersection(f2).length
                if L > bl: best, bl = l2, L
            if best is not None: out[k] = (f, best)
    # faces that ended with the same label and touch are one facet
    by = {}
    for f, l in out: by.setdefault(l, []).append(f)
    res = []
    for l, fs in by.items():
        u = unary_union(fs)
        for g in getattr(u, 'geoms', [u]):
            if g.geom_type == 'Polygon' and g.area > .05: res.append((g, l))
    return res


def reconstruct(ring, obb, px, py, pz, pn, pr, zg, fx=None):
    fx = fx or {}
    """ring: footprint (plot metres); obb: its box; px..pr: lidar returns inside it (z, number of returns, return number);
    zg: floor level. Returns None when there is too little roof to read."""
    ring = np.array(ring, float); c = np.array(obb['c'])
    # the frame follows the walls: the direction (mod 90 degrees) that most wall length runs along
    d = np.roll(ring, -1, 0) - ring; L = np.hypot(d[:, 0], d[:, 1]); th = np.arctan2(d[:, 1], d[:, 0]) * 4
    a0 = math.atan2(float((L * np.sin(th)).sum()), float((L * np.cos(th)).sum())) / 4
    ax = np.array([math.cos(a0), math.sin(a0)]); nx = np.array([-ax[1], ax[0]])
    s = (px - c[0]) * ax[0] + (py - c[1]) * ax[1]; t = (px - c[0]) * nx[0] + (py - c[1]) * nx[1]
    rs = (ring[:, 0] - c[0]) * ax[0] + (ring[:, 1] - c[1]) * ax[1]; rt = (ring[:, 0] - c[0]) * nx[0] + (ring[:, 1] - c[1]) * nx[1]
    s0, t0 = math.floor(rs.min()), math.floor(rt.min()); N, M = int(math.ceil(rs.max()) - s0), int(math.ceil(rt.max()) - t0)
    N, M = max(N, 2), max(M, 2)
    local = Polygon(np.c_[rs - s0, rt - t0]).buffer(0)
    if local.geom_type != 'Polygon': local = max(local.geoms, key=lambda g: g.area)
    ci, cj = np.clip(np.floor(s - s0).astype(int), 0, N - 1), np.clip(np.floor(t - t0).astype(int), 0, M - 1)
    grid = np.full((N, M), np.nan); gtop = np.full((N, M), np.nan)
    order = np.lexsort((pz, cj, ci)); key = ci[order] * M + cj[order]; uk, start, count = np.unique(key, return_index=True, return_counts=True)
    last = (pr == pn)[order]; multi = (pn > 1)[order]; zo = pz[order]
    for kk, st, ct in zip(uk, start, count):
        if ct >= 2 and multi[st:st + ct].mean() > .55: continue          # mostly split echoes: a tree over the roof
        v = zo[st:st + ct][last[st:st + ct]]
        if len(v) == 0: v = zo[st:st + ct]
        grid[kk // M, kk % M] = np.median(v); gtop[kk // M, kk % M] = np.percentile(v, 85)
    gi, gj = np.mgrid[0:N, 0:M]; inside = shapely.contains_xy(local, gi + .5, gj + .5)
    if inside.sum() < 4: return None
    have = np.isfinite(grid) & inside
    if have.sum() < max(6, .25 * inside.sum()): return None
    idx = ndimage.distance_transform_edt(~have, return_distances=False, return_indices=True); filled = grid[idx[0], idx[1]]
    area = float(inside.sum())
    sm = ndimage.median_filter(filled, 3)
    low = ndimage.grey_opening(sm, size=3); sm = np.where(sm - low > 2.5, low, sm)        # a wire, a bird, a branch
    z = np.where(have, np.where(np.abs(grid - sm) > .5, sm, grid), sm)
    depth = ndimage.distance_transform_edt(inside)
    rel = have & (depth > 1.2)
    if rel.sum() < .35 * inside.sum(): rel = have & (depth > .6)
    if rel.sum() < .35 * inside.sum(): rel = have
    med = float(np.median(z[rel])) if rel.any() else float(np.median(z[inside]))
    if med - zg < 2.3: return None
    # cells far below the body of the roof are ground seen through a gap or a mis-drawn outline, not roof
    rel &= z > zg + 1.8
    II_, JJ_ = np.mgrid[0:N, 0:M].astype(float)
    if fx.get('flat'):                                   # roof-fixes.json: one level roof (a building the lidar caught half built, or under trees)
        h = zg + fx['h'] if fx.get('h') else float(np.median(z[rel])); lab, planes = np.where(inside, 0, -1), [np.array([h, 0., 0.])]
    else:
        lab, planes = segment(z, rel, inside, fx)
        # a pitched roof that came out in many pieces is a simple roof with dormers and vents on it: read it again, coarser
        used = [k for k in np.unique(lab[lab >= 0])]; steep = sum(int((lab == k).sum()) for k in used if math.hypot(planes[k][1], planes[k][2]) >= .18)
        if not fx.get('amin') and len(used) > 8 and steep > .4 * inside.sum():
            lab, planes = segment(z, rel, inside, {**fx, 'amin': int(max(40, .05 * inside.sum()))})
        if fx.get('level'): planes = [np.array([co[0] + co[1] * II_[lab == k].mean() + co[2] * JJ_[lab == k].mean() if (lab == k).any() else co[0], 0., 0.]) for k, co in enumerate(planes)]
    smooth = set()                                     # pairs of planes that meet along a ridge, hip or valley
    for a_, b_ in ((lab[:-1, :], lab[1:, :]), (lab[:, :-1], lab[:, 1:])):
        m = (a_ >= 0) & (b_ >= 0) & (a_ != b_)
        for p_, q_ in set(zip(a_[m].tolist(), b_[m].tolist())):
            k = tuple(sorted((p_, q_)))
            if k in smooth: continue
            if math.hypot(planes[p_][1] - planes[q_][1], planes[p_][2] - planes[q_][2]) > .08:
                bm = (lab == p_) & ndimage.binary_dilation(lab == q_); 
                if bm.any() and np.median(np.abs((planes[p_][0] + planes[p_][1] * II_[bm] + planes[p_][2] * JJ_[bm]) - (planes[q_][0] + planes[q_][1] * II_[bm] + planes[q_][2] * JJ_[bm]))) < .5: smooth.add(k)
    polys = polygons(lab, local, .8, smooth)
    if not polys: return None
    zlo, zhi = float(np.percentile(z[inside], 1)) - .6, float(np.percentile(z[inside], 99.5)) + .6      # no plane may run off beyond the roof that was measured
    def zat(l, i, j): co = planes[l]; return min(zhi, max(zlo, float(co[0] + co[1] * (i - .5) + co[2] * (j - .5))))    # cell centres sit at +.5
    def world(i, j, zz): return [round(float(c[0] + ax[0] * (i + s0) + nx[0] * (j + t0)), 2), round(float(c[1] + ax[1] * (i + s0) + nx[1] * (j + t0)), 2), round(float(zz - zg), 2)]
    # heights at shared corners: planes that meet within reach are made to meet exactly
    at = {}
    for g, l in polys:
        for r in [g.exterior] + list(g.interiors):
            for x, y in r.coords: at.setdefault((round(x, 2), round(y, 2)), set()).add(l)
    def vz(l, x, y):
        own = zat(l, x, y); near = [zat(q, x, y) for q in at.get((round(x, 2), round(y, 2)), ()) if q != l]
        near = [v for v in near if abs(v - own) < STEP]
        return (own + sum(near)) / (1 + len(near)) if near else own
    facets = []; edges = {}
    for fi, (g, l) in enumerate(polys):
        g = shapely.geometry.polygon.orient(g, 1.0); rings = []
        for r in [g.exterior] + list(g.interiors):
            pts = list(r.coords)[:-1]; rings.append([world(x, y, vz(l, x, y)) for x, y in pts])
            for k in range(len(pts)):
                p, q = pts[k], pts[(k + 1) % len(pts)]; kk = tuple(sorted(((round(p[0], 2), round(p[1], 2)), (round(q[0], 2), round(q[1], 2)))))
                edges.setdefault(kk, []).append((fi, l))
        facets.append(rings)
    risers = []
    for (p, q), owners in edges.items():
        if len(owners) != 2: continue
        (fa, la), (fb, lb) = owners
        za0, za1, zb0, zb1 = vz(la, *p), vz(la, *q), vz(lb, *p), vz(lb, *q)
        if max(abs(za0 - zb0), abs(za1 - zb1)) < STEP: continue
        hi_is_a = (za0 + za1) > (zb0 + zb1); lowpoly = polys[fb if hi_is_a else fa][0]
        d = np.array([q[0] - p[0], q[1] - p[1]]); L = np.hypot(*d)
        if L < .05: continue
        n = np.array([-d[1], d[0]]) / L; mid = np.array([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2])
        if not lowpoly.contains(Point(*(mid + n * .15))): n = -n
        nw = ax * n[0] + nx * n[1]
        lo0, lo1, hi0, hi1 = (zb0, zb1, za0, za1) if hi_is_a else (za0, za1, zb0, zb1)
        w0, w1 = world(p[0], p[1], 0), world(q[0], q[1], 0)
        risers.append([w0[0], w0[1], w1[0], w1[1], round(min(lo0, hi0) - zg, 2), round(min(lo1, hi1) - zg, 2), round(max(lo0, hi0) - zg, 2), round(max(lo1, hi1) - zg, 2), round(float(nw[0]), 3), round(float(nw[1]), 3)])
    # walls: the roof beside each outline edge, and a parapet where the rim returns stand above it
    tree = shapely.STRtree([g for g, _ in polys])
    def roof_local(i, j):
        k = tree.nearest(Point(i, j)); return zat(polys[int(k)][1], i, j), polys[int(k)][1]
    walls = []; ccw = Polygon(ring).exterior.is_ccw; tops = []
    for qn in range(len(ring)):
        p, r_ = ring[qn], ring[(qn + 1) % len(ring)]; d = r_ - p; ln = float(np.hypot(*d))
        if ln < .05: walls.append({'h': 0, 'p': []}); continue
        u = d / ln; inward = np.array([-u[1], u[0]]) * (1 if ccw else -1)
        m_ = max(1, int(round(ln / 1.0))); prof = []; flat = True; rim = []
        for w in range(m_ + 1):
            pt = p + d * min(max(w / m_, .02), .98) + inward * .35
            i = (pt[0] - c[0]) * ax[0] + (pt[1] - c[1]) * ax[1] - s0; j = (pt[0] - c[0]) * nx[0] + (pt[1] - c[1]) * nx[1] - t0
            zz, l = roof_local(i, j); prof.append(zz - zg); co = planes[l]
            if math.hypot(co[1], co[2]) > .08: flat = False
            ci_, cj_ = int(min(max(i, 0), N - 1)), int(min(max(j, 0), M - 1))
            if np.isfinite(gtop[ci_, cj_]): rim.append(gtop[ci_, cj_] - zz)
        par = 0.
        if flat and len(rim) >= 3:
            rv = float(np.median(rim))
            if .25 <= rv <= 3.2 and np.percentile(rim, 25) > .12: par = round(min(rv, 3.), 2)
        prof = [round(max(v, 2.2), 2) for v in prof]
        walls.append({'h': round(float(np.percentile(prof, 22)), 2), 'p': prof, **({'r': par} if par else {})}); tops.append(max(prof) + par)
    zs = [v[2] for rings in facets for v in rings[0]]
    return {'facets': facets, 'risers': risers, 'walls': walls, 'top': round(max(max(zs), max(tops) if tops else 0), 2), 'med': round(med - zg, 2), 'v': 2,
            '_debug': {'z': z - zg, 'lab': lab, 'rel': rel, 'inside': inside, 'polys': polys, 'planes': planes, 'origin': (s0, t0)}}


def sheet(scene, out_b, debug, folder, per=12):
    """Check sheets: for every measured roof, the height raster (left) beside the facets read from it (right)."""
    import os
    from PIL import Image, ImageDraw
    os.makedirs(folder, exist_ok=True); T = 330; tiles = []
    names = {b['id']: (b.get('n') or '') for b in scene['buildings']}
    for bid, d in debug.items():
        z, inside = d['z'], d['inside']; N, M = z.shape; k = max(1, min(12, (T - 10) // max(N, M)))
        zi = z[inside]; lo, hi = np.percentile(zi, 2), np.percentile(zi, 98) + 1e-6
        v = np.clip((z - lo) / (hi - lo), 0, 1); rgb = np.stack([60 + 190 * v, 70 + 150 * v, 200 - 150 * v], -1).astype(np.uint8); rgb[~inside] = 245
        rgb[inside & ~d['rel']] = (rgb[inside & ~d['rel']] * .55 + 110).astype(np.uint8)
        left = Image.fromarray(np.transpose(rgb, (1, 0, 2))[::-1]).resize((N * k, M * k), Image.NEAREST)
        right = Image.new('RGB', (N * k, M * k), (245, 245, 245)); dr = ImageDraw.Draw(right)
        for g, l in d['polys']:
            co = d['planes'][l]; sl = math.hypot(co[1], co[2]); zc = co[0] + co[1] * g.centroid.x + co[2] * g.centroid.y - (lo + (z - d['z']).flat[0] * 0)
            base = 235 - int(120 * min(1, sl / .7)); col = (base, base, 235) if sl < LEVEL else (235, base, base - 20 if base > 20 else 0)
            dr.polygon([(x * k, (M - y) * k) for x, y in g.exterior.coords], fill=col, outline=(40, 40, 40))
            for r in g.interiors: dr.polygon([(x * k, (M - y) * k) for x, y in r.coords], fill=(245, 245, 245), outline=(40, 40, 40))
            if sl >= LEVEL and g.area > 12:
                c0 = g.representative_point(); dx, dy = -co[1] / sl, -co[2] / sl; L = min(4, math.sqrt(g.area) / 3)
                dr.line([(c0.x * k, (M - c0.y) * k), ((c0.x + dx * L) * k, (M - (c0.y + dy * L)) * k)], fill=(120, 0, 0), width=2)
        tile = Image.new('RGB', (2 * T, T + 26), (255, 255, 255)); tile.paste(left, (2, 24)); tile.paste(right, (T + 2, 24))
        rec = out_b[bid]; ImageDraw.Draw(tile).text((3, 3), '%s %s  f%d r%d  h%.1f-%.1f' % (bid, names[bid][:26], len(rec['facets']), len(rec['risers']), lo, hi), fill=(0, 0, 0))
        tiles.append(tile)
    for pg in range(0, len(tiles), per):
        part = tiles[pg:pg + per]; cols = 2; rows = (len(part) + cols - 1) // cols
        im = Image.new('RGB', (cols * 2 * T, rows * (T + 26)), (255, 255, 255))
        for i, t in enumerate(part): im.paste(t, ((i % cols) * 2 * T, (i // cols) * (T + 26)))
        im.save(os.path.join(folder, 'roofs-%02d.png' % (pg // per)))

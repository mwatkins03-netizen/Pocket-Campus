#!/usr/bin/env python3
"""Add measured relief to campus-overview.html: a soft hillshade and 2 m contour lines from the USGS 3DEP elevation service.
Run from the bundle root after the page exists:  python3 source/survey/overview_relief.py   (needs numpy, scipy, pillow, tifffile)"""
import re, math, io, base64, json, urllib.request
from pathlib import Path
import numpy as np, tifffile
from scipy import ndimage
from PIL import Image
root = Path(__file__).resolve().parents[2]; page = root / 'campus-overview.html'; s = page.read_text(encoding='utf-8')
s = re.sub(r'<g id="relief">.*?</g><!--relief-->', '', s, flags=re.S)
bx, by, bw, bh = map(float, re.search(r'<svg id="map" viewBox="([^"]+)"', s).group(1).split())
lat0, lon0 = 34.36461, -89.53963; kx, ky = 111320 * math.cos(math.radians(lat0)), 110574
W, E, N, S_ = lon0 + bx / kx, lon0 + (bx + bw) / kx, lat0 - by / ky, lat0 - (by + bh) / ky
cell = 8.0; nx, ny = int(bw / cell), int(bh / cell)
url = ('https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=%f,%f,%f,%f&bboxSR=4326&imageSR=4326'
       '&size=%d,%d&format=tiff&pixelType=F32&interpolation=RSP_BilinearInterpolation&f=image') % (W, S_, E, N, nx, ny)
dem = tifffile.imread(io.BytesIO(urllib.request.urlopen(url, timeout=120).read())).astype(float)
dem = ndimage.gaussian_filter(dem, 1.2)
# hillshade, light from the north-west
gy, gx = np.gradient(dem, cell); az, alt = math.radians(315), math.radians(45)
slope = np.arctan(np.hypot(gx, gy)); aspect = np.arctan2(gy, -gx)
hs = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - math.pi / 2 - aspect)
shade = np.clip((hs - hs.mean()) * 2.6, -1, 1)
rgba = np.zeros(dem.shape + (4,), np.uint8); dark = shade < 0
rgba[..., :3] = np.where(dark[..., None], (70, 58, 48), (255, 250, 236)); rgba[..., 3] = (np.abs(shade) * 105).astype(np.uint8)
buf = io.BytesIO(); Image.fromarray(rgba).resize((nx * 2, ny * 2), Image.BICUBIC).save(buf, 'PNG', optimize=True)
# contours every 2 m, chained into polylines
def contour(level):
    segs = []; z = dem; a, b, c, d = z[:-1, :-1], z[:-1, 1:], z[1:, 1:], z[1:, :-1]
    code = (a > level) * 1 + (b > level) * 2 + (c > level) * 4 + (d > level) * 8
    for j, i in zip(*np.nonzero((code > 0) & (code < 15))):
        v = [z[j, i], z[j, i + 1], z[j + 1, i + 1], z[j + 1, i]]; pt = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]; hit = []
        for e in range(4):
            p, q = v[e], v[(e + 1) % 4]
            if (p > level) != (q > level):
                t = (level - p) / (q - p); hit.append((round(bx + (pt[e][0] + (pt[(e + 1) % 4][0] - pt[e][0]) * t + .5) * cell, 1), round(by + (pt[e][1] + (pt[(e + 1) % 4][1] - pt[e][1]) * t + .5) * cell, 1)))
        for k in range(0, len(hit) - 1, 2): segs.append((hit[k], hit[k + 1]))
    ends = {}
    for k, (p, q) in enumerate(segs): ends.setdefault(p, []).append(k); ends.setdefault(q, []).append(k)
    used = [False] * len(segs); d = ''
    for k in range(len(segs)):
        if used[k]: continue
        used[k] = True; line = list(segs[k])
        for grow in (0, 1):
            while True:
                tip = line[-1]; nxt = next((m for m in ends.get(tip, []) if not used[m]), None)
                if nxt is None: break
                used[nxt] = True; p, q = segs[nxt]; line.append(q if p == tip else p)
            line.reverse()
        if len(line) > 3: d += 'M' + 'L'.join('%g,%g' % p for p in line[::2] + ([line[-1]] if len(line) % 2 == 0 else []))
    return d
lo, hi = math.ceil(dem.min() / 2) * 2, math.floor(dem.max() / 2) * 2; minor = major = ''
for lv in range(lo, hi + 1, 2):
    d = contour(lv)
    if lv % 10 == 0: major += d
    else: minor += d
g = ('<g id="relief"><image href="data:image/png;base64,%s" x="%g" y="%g" width="%g" height="%g" preserveAspectRatio="none" style="pointer-events:none"/>'
     '<path d="%s" fill="none" stroke="#7a6248" stroke-opacity=".22" stroke-width="1.1" vector-effect="non-scaling-stroke" style="pointer-events:none"/>'
     '<path d="%s" fill="none" stroke="#7a6248" stroke-opacity=".5" stroke-width="1.6" vector-effect="non-scaling-stroke" style="pointer-events:none"/></g><!--relief-->') % (
     base64.b64encode(buf.getvalue()).decode(), bx, by, bw, bh, minor, major)
# over the land colours, under roads and buildings: insert before the first road
i = s.index('<path class="road')
s = s[:i] + g + s[i:]
note = '<p class="reliefnote" style="font-size:12px;color:#5b6a5f;margin:10px 0 0">Relief: USGS 3DEP elevation, %d–%d m above sea level. Contours every 2 m, heavier every 10 m.</p>' % (round(dem.min()), round(dem.max()))
s = re.sub(r'<p class="reliefnote".*?</p>', '', s, flags=re.S)
s = s.replace('</p></div><input id="search"', '</p>' + note + '</div><input id="search"', 1)
page.write_text(s, encoding='utf-8'); print('relief added: %d x %d cells, %d-%d m, page %d KB' % (nx, ny, dem.min(), dem.max(), len(s) // 1024))

import json,re,math
from pathlib import Path
from shapely.geometry import Polygon,box
from shapely.ops import transform
R=Path('work')
# Recompute a rectangle frame after trimming the solid body behind the Lyceum's open colonnade.
def obb(poly):
 pts=list(poly.minimum_rotated_rectangle.exterior.coords)[:4];ll=[math.dist(pts[i],pts[(i+1)%4]) for i in range(4)];i=max(range(4),key=lambda i:ll[i]);a,b=pts[i],pts[(i+1)%4];c=poly.minimum_rotated_rectangle.centroid
 return dict(c=[c.x,c.y],ax=[(b[0]-a[0])/ll[i],(b[1]-a[1])/ll[i]],L=ll[i],W=ll[(i+1)%4])
p=R/'campus/landmarks.js';s=p.read_text();m=re.search(r'const CONFIGS=(.*?);\nconst LANDMARKS=',s);cfgs=json.loads(m.group(1))
for c in cfgs:
 if c['id']=='w187869639':
  port=c['ports'][0];cx,cy=port['c'];nx,ny=port['n'];tx,ty=-ny,nx;limit=port['u']-port['depth']-.15
  c['frontNormal']=port['n']
  def tr(x,y,z=None):return ((x-cx)*nx+(y-cy)*ny,(x-cx)*tx+(y-cy)*ty)
  def inv(u,v,z=None):return (cx+u*nx+v*tx,cy+u*ny+v*ty)
  for q in c['parts']:
   if q['h']==14:
    g=transform(inv,transform(tr,Polygon(q['ring'])).intersection(box(-500,-500,limit,500)));q['ring']=[list(p) for p in g.exterior.coords][:-1];q['obb']=obb(g)
 elif c['ports'] if 'ports' in c else False:
  c['frontNormal']=c['ports'][0]['n']
p.write_text(s[:m.start(1)]+json.dumps(cfgs,separators=(',',':'))+s[m.end(1):])
# Clear sightlines in the illustrative planting in front of Ventress.
p=R/'campus/scene.json';scene=json.loads(p.read_text());scene['trees']=[t for t in scene['trees'] if math.hypot(t[0]-93,t[1]+101)>21];p.write_text(json.dumps(scene,separators=(',',':')))
p=R/'campus/city.json';city=json.loads(p.read_text())
for v in city['views']:
 if v['id']=='ventress':v['camera'].update(yaw=-90,pitch=26,zoom=2.6)
for l in city['legend']:
 if l['name']=='Ventress Hall':l['camera'].update(yaw=-90,pitch=26,zoom=2.6)
p.write_text(json.dumps(city,indent=2))

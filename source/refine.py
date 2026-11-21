import json,math
from pathlib import Path
from shapely.geometry import Polygon,Point,LineString
from shapely.ops import unary_union
R=Path(__file__).parent
s=json.load(open(R/'square/scene.json'))
def geomgroups(g):
 if g.is_empty:return []
 ps=[g] if g.geom_type=='Polygon' else [p for p in g.geoms if p.geom_type=='Polygon']
 return [[list(map(list,p.exterior.coords))[:-1]]+[list(map(list,i.coords))[:-1] for i in p.interiors] for p in ps if p.area>1]
island=Polygon([[-46,-26],[-34,-38],[21,-38],[34,-25],[34,26],[21,38],[-34,38],[-46,26]])
bld=unary_union([Polygon(b['ring']) for b in s['buildings']])
roads=unary_union([Polygon(p[0],p[1:]) for p in s['roads']])
# Four cardinal entry paths and the perimeter walk stay paved.
axes=unary_union([LineString([[-46,0],[34,0]]).buffer(1.8),LineString([[-7,-38],[-7,38]]).buffer(1.8)])
lawn=island.buffer(-2).difference(bld.buffer(.3)).difference(roads).difference(axes)
s['lawns']=[{'kind':'courthouse lawn','r':r} for r in geomgroups(lawn)]
# Remove broad inferred paving from the grassy island, retaining the cardinal paths.
for field in ['paths','walk']:
 s[field]=[r for p in s[field] for r in geomgroups(Polygon(p[0],p[1:]).buffer(0).difference(lawn))]
s['species']=['Illustrative courthouse shade tree']
s['trees']=[[x,y,0,str(h)] for x,y,h in [(-33,-26,12),(-20,-28,11),(10,-28,12),(22,-22,13),(24,12,11),(19,28,12),(-22,28,13),(-35,20,12),(-39,-10,11)]]
(R/'square/scene.json').write_text(json.dumps(s,separators=(',',':')))
s=json.load(open(R/'campus/scene.json'))
# Deterministic thinning preserves an open grove, away from building entrances.
bs={b['id']:b for b in s['buildings']}
entrances=[(-103,-101),(-16,-22),(-92,-30),(-53,10)]
original=s['trees'];s['trees']=[t for i,t in enumerate(original) if i%2==0 and all(math.hypot(t[0]-x,t[1]-y)>15 for x,y in entrances)]
# Keep the trees outside the visibly open lawn immediately south of Ventress.
s['trees']=[t for t in s['trees'] if math.hypot(t[0]-93,t[1]+108)>13]
(R/'campus/scene.json').write_text(json.dumps(s,separators=(',',':')))

import json,math
from pathlib import Path
from shapely.geometry import Polygon,box
from shapely.ops import transform
from shapely import affinity
R=Path(__file__).parent
helpers=(R/'landmark_helpers.js').read_text()
def obb(poly):
 pts=list(poly.minimum_rotated_rectangle.exterior.coords)[:4];lens=[math.dist(pts[i],pts[(i+1)%4]) for i in range(4)];i=max(range(4),key=lambda i:lens[i]);a=pts[i];b=pts[(i+1)%4];l=lens[i]
 return {'c':[poly.minimum_rotated_rectangle.centroid.x,poly.minimum_rotated_rectangle.centroid.y],'ax':[(b[0]-a[0])/l,(b[1]-a[1])/l],'L':l,'W':lens[(i+1)%4]}
def parts(g,h,roof=None,**kw):
 ps=list(g.geoms) if g.geom_type=='MultiPolygon' else [g];return [dict(ring=[list(p) for p in poly.exterior.coords][:-1],h=h,obb=obb(poly),**({'roof':roof} if roof else {}),**kw) for poly in ps if poly.area>1]
def cfg(b,h,roof=None,wall=None,extra=None):return dict(id=b['id'],parts=parts(Polygon(b['ring']),h,roof),wall=wall or '#b57c65',extra=extra,height=35 if extra=='courthouse' else 25)
def addport(conf,b,n,w,d,base,top,k,clock=False):
 p=Polygon(b['ring']);cx,cy=b['obb']['c'];tx,ty=-n[1],n[0]
 def proj(x,y,z=None):return ((x-cx)*n[0]+(y-cy)*n[1],(x-cx)*tx+(y-cy)*ty)
 def inv(u,v,z=None):return (cx+n[0]*u+tx*v,cy+n[1]*u+ty*v)
 pp=transform(proj,p);u=pp.bounds[2];port=transform(inv,box(u-d,-w/2,u+.1,w/2))
 for part in list(conf['parts']):
  diff=Polygon(part['ring']).difference(port)
  conf['parts'].remove(part);conf['parts']+=parts(diff,part['h'],part.get('roof'),**{k:v for k,v in part.items() if k not in ['ring','h','obb','roof']})
 conf.setdefault('ports',[]).append(dict(c=[cx,cy],n=n,u=u,width=w,depth=d,base=base,top=top,columns=k,clock=clock))
configs={}
for key in ['square','campus']:
 s=json.load(open(R/key/'scene.json'));bs={b['id']:b for b in s['buildings']};cs=[]
 if key=='square':
  b=bs['w188828391'];c=cfg(b,14,'hipped','#e8e3d5','courthouse');c['parts'][0].update(pitch=19,floor=4.7)
  addport(c,b,[-.0313,.9995],16,3.8,5.3,13.6,4);addport(c,b,[.0313,-.9995],16,3.8,5.3,13.6,4)
  p=Polygon(b['ring']);n=[-.0313,.9995];cx,cy=b['obb']['c'];t=[-n[1],n[0]]
  def tr(x,y,z=None):return ((x-cx)*t[0]+(y-cy)*t[1],(x-cx)*n[0]+(y-cy)*n[1])
  def un(x,y,z=None):return (cx+t[0]*x+n[0]*y,cy+t[1]*x+n[1]*y)
  core=transform(un,transform(tr,p).intersection(box(-100,-7.7,100,7.7)))
  c['parts']=parts(core,14,'hipped',pitch=19,floor=4.7);cs.append(c)
  b=bs['w321045760'];c=cfg(b,8,None,'#bd8a6e');c['parts'][0].update(facade='civic',bay=3.3,floor=4);cs.append(c)
  b=bs['w451755566'];c=cfg(b,10.8,'hipped','#ad6b58');c['parts'][0].update(pitch=42,colour='#81928c');cs.append(c)
  # Reference-specific shop colours and upper floor balcony treatment.
  city=json.load(open(R/key/'city.json'));city['buildings']={'w599810022':dict(levels=2,height=8.3,wall='#cc8968',balcony='some',trim='#eddfc5',awning=False),'w599810038':dict(levels=2,height=8.1,wall='#b77862',balcony=True,trim='#efe7d6',awning=False)}
  (R/key/'city.json').write_text(json.dumps(city,indent=2))
 else:
  specs=[('w187869639',14,'hipped',None,'lyceum'),('w318274467',9.5,'gabled','#b56e58','ventress'),('w969209390',11.8,'hipped',None,None),('w969209391',10.5,None,None,None),('w187869326',11.5,'hipped',None,None),('w188504264',12,None,None,None),('w318273986',8,None,None,None),('w188504265',17.5,None,None,None),('w187869328',12,'gabled',None,None),('w318273664',6.8,None,None,'kennon'),('r16256538',8,None,None,'barnard')]
  for id,h,roof,wall,ex in specs:
   b=bs[id];c=cfg(b,h,roof,wall,ex)
   if id=='w187869639':
    p=Polygon(b['ring']);yc=-98.5
    c['parts']=[]
    for lo,hi,h in [(-200,-115,10),(-115,-110,8.5),(-110,-87,14),(-87,-82,8.5),(-82,0,10)]:c['parts']+=parts(p.intersection(box(-300,lo,0,hi)),h,'hipped',pitch=18,floor=4.7)
    addport(c,b,[.9942,-.1079],17.2,7.6,1.1,14,6,True)
   elif id=='w969209390':addport(c,b,[-.077,-.997],15,5.5,1.4,11.8,4)
   elif id=='w969209391':addport(c,b,[.552,-.834],13.6,3.4,1,10.5,4)
   elif id=='w187869328':addport(c,b,[-.106,-.994],16,6,1,12,4)
   elif id=='r16256538':addport(c,b,[0,-1],10.5,4,1,9,4)
   elif id=='w188504264':addport(c,b,[.12,.993],12,3,1,11,4)
   elif id=='w188504265':c['parts'][0].update(facade='office',bay=3.8,floor=3.5)
   elif id=='w318273986':c['parts'][0].update(facade='office',bay=4,floor=4)
   elif id=='w318274467':c['parts'][0].update(pitch=40,colour='#b96654',floor=4.75)
   elif id=='w318273664':
    p=Polygon(b['ring']);c['parts']=parts(p.intersection(box(-166,-250,-140,-200)),6.8)+parts(p.intersection(box(-180,-250,-166,-200)),4.8)
   cs.append(c)
 config=json.dumps(cs,separators=(',',':'))
 text=helpers+'\nconst CONFIGS='+config+';\nconst LANDMARKS=CONFIGS.map(c=>({name: c.id,ids:[c.id],build:()=>hallModel(c)}));\n'
 if key=='campus':
  # Trees are illustrative: model tents only on mapped lawn, with clear mapped paths.
  from shapely.ops import unary_union
  lawns=unary_union([Polygon(l['r'][0],l['r'][1:]) for l in s['lawns']]);walk=unary_union([Polygon(l[0],l[1:]) for l in s['walk']]);built=unary_union([Polygon(b['ring']) for b in s['buildings']])
  from shapely.geometry import Point
  ts=[]
  for x in range(80,260,17):
   for y in range(-140,21,17):
    px=x+3*math.sin(y);py=y+3*math.cos(x)
    if lawns.buffer(-4).contains(Point(px,py)) and walk.distance(Point(px,py))>6 and built.distance(Point(px,py))>6:ts.append([round(px,2),round(py,2)])
  text+='\nconst TENTS='+json.dumps(ts)+';\n'+'''function CITY_EXTRA(t){if(SEASON.id!=='gameday')return [];return TENTS.map(([x,y],i)=>({fp:rect(x,y,5,5),h:4,draw:()=>{let s='';for(const dx of [-2.4,2.4])for(const dy of [-2.4,2.4])s+=stick([x+dx,y+dy,0],[x+dx,y+dy,2.5],.06,CREAM);s+=peak(ccw(rect(x,y,5.5,5.5)),2.5,[x,y,3.9],i%3===0?'#e9e3d4':i%2?'#b75650':'#3d5873');return s}}))}
'''
 else:
  text+='''\nfunction CITY_EXTRA(t){if(SEASON.id!=='doubledecker')return [];const out=[];for(let i=0;i<9;i++){const x=-45+i*11,y=44;if(!standable(x,y,2))continue;out.push({fp:rect(x,y,4,3),h:3.8,draw:()=>{let s='';for(const dx of [-1.8,1.8])for(const dy of [-1.2,1.2])s+=stick([x+dx,y+dy,0],[x+dx,y+dy,2.5],.06,CREAM);return s+peak(ccw(rect(x,y,4.4,3.2)),2.5,[x,y,3.8],i%3?'#e8dfc9':'#a96150')}})}return out}
'''
 (R/key/'landmarks.js').write_text(text)

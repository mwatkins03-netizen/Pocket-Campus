import json,math,random,re,copy
from pathlib import Path
from shapely.geometry import Polygon,Point,LineString,box
from shapely.ops import unary_union,nearest_points
from shapely import affinity
R=Path('work');rng=random.Random(31617)
def polys(groups):return unary_union([Polygon(rs[0],rs[1:]).buffer(0) for rs in groups])
for key in ['square','campus']:
 p=R/key/'scene.json';scene=json.load(open(p));city=json.load(open(R/'life-v3/base'/f'{key}-city.json'));camp=key=='campus';h=scene['meta']['half'];sq=box(-h+3,-h+3,h-3,h-3)
 buildings=unary_union([Polygon(b['ring']).buffer(.7) for b in scene['buildings']]);roads=polys(scene['roads']);walk=polys(scene['walk']);paths=polys(scene['paths']);lawns=polys([a['r'] for a in scene['lawns']]);water=polys(scene['water'])
 treepoints=unary_union([Point(t[0],t[1]).buffer(.7) for t in scene['trees']])
 safe=sq.difference(buildings).difference(water).difference(treepoints)
 if not camp and not any(r['kind']=='bike' for r in scene['routes']):
  for r in [r for r in scene['routes'] if r['kind']=='car'][::3]:
   n=copy.deepcopy(r);n['kind']='bike';scene['routes'].append(n)
  p.write_text(json.dumps(scene,separators=(',',':')))
 # Fixed, reproducible gathering locations. Only plausible open ground; closed roads are available at the festival.
 if camp:
  text=(R/key/'landmarks.js').read_text();tents=json.loads(re.search(r'const TENTS=(.*?);',text).group(1))
  exclusion=unary_union([box(x-3,y-3,x+3,y+3) for x,y in tents])
  event=safe.intersection(lawns.union(walk).union(paths)).difference(roads.buffer(.8)).difference(exclusion)
  anchors=[(x,y,9) for x,y in tents]+[(-15,-108,40),(150,-70,70),(70,-42,20)]
 else:
  stalls=unary_union([box(-45+i*11-2.5,40,-45+i*11+2.5,48) for i in range(9)])
  event=safe.intersection(walk.union(paths).union(roads).union(lawns)).difference(stalls)
  anchors=[(0,42,34),(-10,-45,36),(-47,-3,25),(38,0,26),(-68,-55,23),(-45,-68,18)]
 points=[]
 for _ in range(18000):
  ax,ay,r=anchors[rng.randrange(len(anchors))];a=rng.random()*math.tau;rr=math.sqrt(rng.random())*r;x=ax+math.cos(a)*rr;y=ay+math.sin(a)*rr
  if not event.contains(Point(x,y)):continue
  if any((x-p[0])**2+(y-p[1])**2<.75**2 for p in points):continue
  points.append([round(x,2),round(y,2),round(rng.random()*math.tau,3)])
  if len(points)>=(860 if camp else 540):break
 # Batch nearby people for correct local depth order without a quadratic sort for every individual.
 groups={}
 for pt in points:groups.setdefault((math.floor(pt[0]/(16 if camp else 12)),math.floor(pt[1]/(16 if camp else 12))),[]).append(pt)
 ordinary=[];openwalk=safe.intersection(walk.union(paths)).difference(roads.buffer(.8))
 for _ in range(4000):
  x=rng.uniform(-h+10,h-10);y=rng.uniform(-h+10,h-10)
  if openwalk.contains(Point(x,y)):ordinary.append([round(x,2),round(y,2),round(rng.random()*math.tau,3)])
  if len(ordinary)>=(80 if camp else 36):break
 # Cars parked on mapped parking polygons, with clear pedestrian routes.
 meta=scene['meta'];lat,lon,rot=meta['lat'],meta['lon'],meta['rotation'];cr,sr=math.cos(math.radians(-rot)),math.sin(math.radians(-rot));kx=111320*math.cos(math.radians(lat))
 def P(a,b):
  x=(b-lon)*kx;y=(a-lat)*110574;return (x*cr-y*sr,x*sr+y*cr)
 parks=[];bikeplaces=[]
 for e in json.load(open(R/key/'osm.json'))['elements']:
  t=e.get('tags',{})
  if e['type']=='way' and t.get('amenity')=='parking' and e.get('geometry'):
   g=Polygon([P(p['lat'],p['lon']) for p in e['geometry'] if 'lat' in p]).buffer(0).intersection(safe).difference(walk.buffer(.4));
   if g.area>60:parks.append(g)
  if e['type']=='node' and t.get('amenity')=='bicycle_parking':
   x,y=P(e['lat'],e['lon'])
   if safe.contains(Point(x,y)):bikeplaces.append([round(x,2),round(y,2),0])
 parked=[]
 for g in parks:
  rr=g.minimum_rotated_rectangle;vs=list(rr.exterior.coords);edges=[math.dist(vs[i],vs[i+1]) for i in range(4)];i=max(range(4),key=lambda i:edges[i]);a,b=vs[i],vs[i+1];angle=math.atan2(b[1]-a[1],b[0]-a[0]);center=g.centroid;local=affinity.rotate(g,-angle,origin=(center.x,center.y),use_radians=True)
  xmin,ymin,xmax,ymax=local.bounds
  y=ymin+3
  while y<ymax-2:
   x=xmin+2
   while x<xmax-1:
    footprint=box(x-.95,y-2.6,x+.95,y+2.6)
    if local.contains(footprint) and rng.random()<.72:
     xx=center.x+math.cos(angle)*(x-center.x)-math.sin(angle)*(y-center.y);yy=center.y+math.sin(angle)*(x-center.x)+math.cos(angle)*(y-center.y)
     parked.append([round(xx,2),round(yy,2),round(angle+math.pi/2,3),rng.randrange(5)])
    x+=3.1
   y+=11
 if len(parked)>70:parked=rng.sample(parked,70)
 if len(bikeplaces)<5:
  candidates=[(-24,-50),(25,55)] if not camp else [(-98,-70),(25,20),(-28,-30),(84,-128),(-225,-60)]
  for x,y in candidates:
   q=nearest_points(Point(x,y),openwalk)[1]
   if q.distance(Point(x,y))<25:bikeplaces.append([round(q.x,2),round(q.y,2),0])
 city['life']={'eventCrowd':[v for v in groups.values()],'ordinaryCrowd':ordinary,'parkedCars':parked,'bikeRacks':bikeplaces[:8],'flagpoles':[[-13,-100,14,'us'],[155,-78,8,'college']] if camp else [[-22,-21,10,'us'],[13,-22,9,'college']], 'eventId':'gameday' if camp else 'doubledecker','trafficCapacity':210,'wind':1}
 city['vehicles'].update(kinds=['sedan','suv','pickup','hatch','van'],colours=['#e7e5dc','#526271','#a65043','#c2c3b8','#3d4e50','#9caaab'],frontPlate=None,taxi=None)
 for o in city['occasions']:o.update(crowd=3.4,view='tailgate' if camp else 'festival')
 center=(-10,-30) if not camp else (10,-100);zoom=1.1 if not camp else .7
 views=[('north','From north',dict(x=center[0],y=center[1],z=5,yaw=90,pitch=34,zoom=zoom)),('east','From east',dict(x=center[0],y=center[1],z=5,yaw=0,pitch=34,zoom=zoom)),('south','From south',dict(x=center[0],y=center[1],z=5,yaw=-90,pitch=34,zoom=zoom)),('west','From west',dict(x=center[0],y=center[1],z=5,yaw=180,pitch=34,zoom=zoom))]
 if camp:views += [('circle-low','Along the Circle',dict(x=-12,y=-98,z=5,yaw=-45,pitch=17,zoom=1.35)),('tailgate','Grove crowd',dict(x=160,y=-65,z=3,yaw=-70,pitch=35,zoom=1.15))]
 else:views += [('street-low','At street level',dict(x=-17,y=-45,z=4,yaw=50,pitch=17,zoom=2.6)),('festival','Festival crowd',dict(x=-5,y=31,z=2,yaw=-65,pitch=33,zoom=1.8))]
 ids={i for i,_,_ in views};city['views']=[v for v in city['views'] if v['id'] not in ids]
 for id,label,cam in views:city['views'].append(dict(id=id,label=label,camera=cam))
 city['notes']=[n for n in city['notes'] if n['title']!='Street life and wind']+[{'title':'Street life and wind','text':'Moving traffic, parked vehicles, bicycles, crowds, wind, and small façade projections are illustrative. Cars occupy mapped lanes and parking; extra festival crowds use open ground and closed roads. Gameday crowds gather in the Grove and Circle. These are atmospheric scenes rather than an attendance or parking survey.','links':[{'label':'OpenStreetMap','url':'https://www.openstreetmap.org/copyright'},{'label':'Visit Oxford','url':'https://visitoxfordms.com/blog/grove_tailgating/'}]}]
 (R/key/'city.json').write_text(json.dumps(city,indent=2))
 print(key, 'event guests',len(points),'crowd groups',len(groups),'parked cars',len(parked),'bike racks',len(bikeplaces),'ordinary guests',len(ordinary))

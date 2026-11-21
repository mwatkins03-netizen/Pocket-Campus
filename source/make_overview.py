import json,math,html
from pathlib import Path
from shapely.geometry import Polygon,Point,LineString
R=Path(__file__).parent;O=R.parent/'outputs'
els={}
for path in [R/'campus-wide/osm.json',R/'campus-west/osm.json']:
 if path.exists():
  for e in json.load(open(path))['elements']:els[(e['type'],e['id'])]=e
els=list(els.values());lat0=34.36461;lon0=-89.53963;kx=111320*math.cos(math.radians(lat0));ky=110574
P=lambda lat,lon:((lon-lon0)*kx,-(lat-lat0)*ky)
esc=lambda s:html.escape(str(s),quote=True)
def points(e):return [P(p['lat'],p['lon']) for p in e.get('geometry',[]) if 'lat' in p]
def path(ps,close=True):return ('M'+'L'.join(f'{x:.1f},{y:.1f}' for x,y in ps)+('Z' if close else '')) if ps else ''
campus=next(e for e in els if e['type']=='way' and e['id']==32945199);cp=Polygon(points(campus));bounds=cp.buffer(250).bounds;bx,by,bX,bY=bounds
extent=Polygon([(bx,by),(bX,by),(bX,bY),(bx,bY)])
shape=[];roads=[];buildings=[];named=[];greens=[];parkings=[];water=[]
for e in els:
 if e['type']!='way':continue
 t=e.get('tags',{});ps=points(e)
 if len(ps)<2:continue
 g=LineString(ps)
 if not g.intersects(extent):continue
 d=path(ps)
 if t.get('natural') in ['water','wood'] or t.get('landuse') in ['forest','grass','meadow'] or t.get('leisure') in ['park','pitch','golf_course','stadium','garden']:
  cl='water' if t.get('natural')=='water' else 'green';greens.append(f'<path class="{cl}" d="{d}"/>')
 if t.get('amenity')=='parking':parkings.append(f'<path class="parking" d="{d}"/>')
 if 'highway' in t:
  kind=t['highway'];w=1.6 if kind in ['footway','path','steps','pedestrian','cycleway'] else 4 if kind=='service' else 8 if kind in ['tertiary','residential','unclassified'] else 13
  roads.append(f'<path class="road {"foot" if w<2 else ""}" stroke-width="{w}" d="{path(ps,False)}"/>')
 if 'building' in t:
  # Also collect unnamed geometry; named features can be found through the sidebar.
  if len(ps)<3:continue
  geom=Polygon(ps).buffer(0);c=geom.centroid;uni=cp.intersects(c);id='b'+str(e['id']);name=t.get('name','')
  buildings.append(f'<path id="{id}" class="building {"university" if uni else ""}" d="{d}"><title>{esc(name or "Mapped building")}</title></path>')
  if name and uni:named.append(dict(id=id,name=name,x=round(c.x,1),y=round(c.y,1)))
 if t.get('name') and (t.get('leisure') in ['stadium','pitch','park'] or t.get('amenity')=='university') and len(ps)>3:
  c=Polygon(ps).centroid
  if cp.buffer(150).contains(c):named.append(dict(id='',name=t['name'],x=round(c.x,1),y=round(c.y,1)))
# Grove is a mapped park; include a useful search target if it was not a named way.
if not any(n['name']=='The Grove' for n in named):
 x,y=P(34.3659,-89.5323);named.append(dict(id='',name='The Grove',x=x,y=y))
labels=[]
for q,display in [('The Lyceum','Lyceum'),('The Grove','The Grove'),('Vaught-Hemingway Stadium','Vaught-Hemingway'),('Oxford-University Stadium','Swayze Field'),('Pavilion at Ole Miss','The Pavilion'),('John Davis Williams Library','J.D. Williams Library'),('Robert C Khayat Law Center','Khayat Law Center'),('University of Mississippi Museum','University Museum'),('Tad Smith Coliseum','Tad Smith Coliseum')]:
 n=next((n for n in named if n['name']==q),None)
 if n:labels.append(f'<g class="label"><circle cx="{n["x"]}" cy="{n["y"]}" r="5"/><text text-anchor="{"end" if q=="John Davis Williams Library" else "start"}" x="{n["x"]+(-20 if q=="John Davis Williams Library" else 12)}" y="{n["y"]+(40 if q=="The Lyceum" else -10)}">{esc(display)}</text></g>')
svg=f'<svg id="map" viewBox="{bx:.0f} {by:.0f} {bX-bx:.0f} {bY-by:.0f}" role="img" aria-label="Interactive north-up map of the University of Mississippi main campus"><rect x="{bx-500}" y="{by-500}" width="{bX-bx+1000}" height="{bY-by+1000}" fill="#eee9d9"/><path class="campus" d="{path(points(campus))}"/>'+''.join(greens+parkings+roads+buildings+labels)+'</svg>'
named=sorted({n['name']:n for n in named if n['name']!='University of Mississippi'}.values(),key=lambda n:n['name'])
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ole Miss · Campus Atlas</title><style>
*{box-sizing:border-box}body{margin:0;background:#f6f3e9;color:#263c35;font:14px/1.5 system-ui,sans-serif}header{height:68px;padding:0 28px;display:flex;align-items:center;gap:25px;border-bottom:1px solid #cfcebd}header strong{font:700 26px Georgia}a{color:#36594b;text-underline-offset:3px}header nav{margin-left:auto;display:flex;gap:18px}main{height:calc(100dvh - 101px);display:grid;grid-template-columns:300px 1fr}aside{padding:25px 22px;overflow:auto;border-right:1px solid #cfcebd}h1{font:40px/1.1 Georgia;margin:8px 0 12px}p{color:#626c60}small,.eyebrow{font:11px ui-monospace,monospace;text-transform:uppercase;letter-spacing:.1em}.eyebrow{color:#a14e38}input{width:100%;padding:12px;border:1px solid #b8bfab;background:#fffcf3;border-radius:4px;font:inherit}#results{margin-top:12px}#results button{display:block;background:transparent;border:0;border-bottom:1px solid #e0dfd1;padding:10px 2px;text-align:left;width:100%;font:inherit;color:#36594b;cursor:pointer}#results button:hover{background:#e9ebdf}#selected{font:20px Georgia;min-height:28px;margin:16px 0 8px}#canvas{position:relative;overflow:hidden;touch-action:none}svg{display:block;width:100%;height:100%;cursor:grab}svg:active{cursor:grabbing}.campus{fill:#e0e6cd;stroke:#799275;stroke-width:3;stroke-dasharray:10 5}.green{fill:#b7c89c;stroke:#9baf89;stroke-width:1}.water{fill:#abcacd}.parking{fill:#d9d6c9}.road{fill:none;stroke:#aaa89c;stroke-linecap:round;stroke-linejoin:round}.foot{stroke:#d1b98d}.building{fill:#c6beb0;stroke:#a69c8b;stroke-width:1}.university{fill:#b8846e;stroke:#8b6655}.building.chosen{fill:#b74635;stroke:#572c25;stroke-width:4}.label text{font:15px system-ui;fill:#263c35;paint-order:stroke;stroke:#f8f5e9;stroke-width:5;stroke-linejoin:round}.label circle{fill:#36594b;stroke:#fff9e9;stroke-width:2}.tools{position:absolute;right:20px;top:20px;display:flex;background:#fffcf3;border:1px solid #bfc5b3;border-radius:6px;overflow:hidden}.tools button{border:0;border-right:1px solid #d7d9ca;background:transparent;padding:12px 18px;cursor:pointer;font:18px Georgia;color:#36594b}.north{position:absolute;right:34px;top:85px;font:18px Georgia;text-align:center;pointer-events:none}.hint{position:absolute;bottom:15px;left:20px;background:#fffcf3de;padding:7px 12px;border-radius:5px;color:#626c60;font-size:12px}footer{height:33px;display:flex;justify-content:space-between;padding:8px 20px;border-top:1px solid #cfcebd;font:10px ui-monospace,monospace}.key{display:flex;align-items:center;gap:8px;margin:8px 0}.sw{width:14px;height:14px;display:inline-block;background:#b8846e;border:1px solid #8b6655}@media(max-width:700px){header{padding:0 15px;gap:10px}header strong{font-size:20px}header nav{gap:10px;font-size:11px}main{grid-template-columns:1fr;grid-template-rows:220px 1fr}aside{border-right:0;padding:14px 20px;display:grid;grid-template-columns:1fr 1fr;gap:5px 16px;overflow:hidden}aside .intro{grid-row:1/5}h1{font-size:30px}#results{overflow:auto;max-height:115px}aside .legend{display:none}#selected{margin:4px 0;font-size:16px}.hint{font-size:10px}footer{font-size:9px}footer span{display:none}}</style>
<header><strong>Pocket City Atlas</strong><nav><a href="index.html">Atlas home</a><a href="oxford-square.html">The Square</a><a href="ole-miss-campus.html">Campus diorama</a></nav></header>
<main><aside><div class="intro"><div class="eyebrow">University of Mississippi</div><h1>Across campus.</h1><p>A north-up orientation map of the main campus, including academic buildings and athletics.</p></div><input id="search" aria-label="Search campus buildings" placeholder="Find a building or place…"><div id="selected" aria-live="polite"></div><div id="results"></div><div class="legend"><div class="key"><i class="sw"></i> Campus buildings</div><div class="key"><i class="sw" style="background:#b7c89c;border-color:#9baf89"></i> Parks, woods & playing fields</div><div class="key"><i class="sw" style="background:#e0e6cd;border:1px dashed #799275"></i> Mapped university grounds</div><p style="font-size:12px">The illustrated historic core is a separate, closer view. All outlines and names here come from OpenStreetMap; coverage and names may be incomplete. This is an orientation map, with no live routing.</p></div></aside><div id="canvas">SVG<div class="tools"><button id="minus" aria-label="Zoom out">−</button><button id="plus" aria-label="Zoom in">+</button><button id="reset">Reset</button></div><div class="north">N<br>↑</div><div class="hint">Drag to pan · Scroll to zoom · Search to focus a place</div></div></main><footer><span>OpenStreetMap extract · November 20, 2026</span><a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors · ODbL</a></footer><script>
const PLACES=DATA;const map=document.getElementById('map'),initial=map.getAttribute('viewBox').split(' ').map(Number);let view=initial.slice(),drag=null;const set=()=>{map.setAttribute('viewBox',view.join(' '));map.querySelectorAll('.label text').forEach(t=>{const ratio=view[2]/map.getBoundingClientRect().width;t.style.fontSize=(ratio*13)+'px';t.parentElement.style.display=(innerWidth<700&&ratio>5)?'none':''})};
function zoom(f,rx=.5,ry=.5){const nw=Math.max(100,Math.min(initial[2]*2,view[2]*f)),nh=nw*view[3]/view[2];view=[view[0]+(view[2]-nw)*rx,view[1]+(view[3]-nh)*ry,nw,nh];set()}
document.getElementById('plus').onclick=()=>zoom(.7);document.getElementById('minus').onclick=()=>zoom(1.4);document.getElementById('reset').onclick=()=>{view=initial.slice();set()};map.addEventListener('wheel',e=>{e.preventDefault();const r=map.getBoundingClientRect();zoom(Math.exp(e.deltaY*.0015),(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height)},{passive:false});
map.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY,view.slice()];map.setPointerCapture(e.pointerId)});map.addEventListener('pointermove',e=>{if(!drag)return;const r=map.getBoundingClientRect();view=[drag[2][0]-(e.clientX-drag[0])*drag[2][2]/r.width,drag[2][1]-(e.clientY-drag[1])*drag[2][3]/r.height,drag[2][2],drag[2][3]];set()});map.addEventListener('pointerup',()=>drag=null);
function focus(p){document.querySelectorAll('.chosen').forEach(e=>e.classList.remove('chosen'));if(p.id)document.getElementById(p.id)?.classList.add('chosen');const w=550,h=w*initial[3]/initial[2];view=[p.x-w/2,p.y-h/2,w,h];set();document.getElementById('selected').textContent=p.name}
function list(){const q=document.getElementById('search').value.toLowerCase(),items=q?PLACES.filter(p=>p.name.toLowerCase().includes(q)).slice(0,20):['The Lyceum','The Grove','Ole Miss Student Union','John Davis Williams Library','Vaught-Hemingway Stadium','Pavilion at Ole Miss','Robert C Khayat Law Center','University of Mississippi Museum'].map(n=>PLACES.find(p=>p.name===n)).filter(Boolean);document.getElementById('results').replaceChildren(...items.map(p=>{const b=document.createElement('button');b.textContent=p.name;b.onclick=()=>focus(p);return b}))}document.getElementById('search').addEventListener('input',list);list();for(const p of PLACES)if(p.id)document.getElementById(p.id)?.addEventListener('click',()=>focus(p));
set();</script></html>'''.replace('SVG',svg).replace('DATA',json.dumps(named))
(O/'campus-overview.html').write_text(page)
print('Campus-wide map:',len(buildings),'buildings;',len(named),'searchable places; extent',bounds)

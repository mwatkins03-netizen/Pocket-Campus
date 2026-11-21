import json,re,math
from pathlib import Path
R=Path('work')
for key in ['square','campus']:
 lm_path=R/key/'landmarks.js';s=lm_path.read_text();m=re.search(r'const CONFIGS=(.*?);\nconst LANDMARKS=',s);cfgs=json.loads(m.group(1));scene=json.load(open(R/key/'scene.json'));bs={b['id']:b for b in scene['buildings']}
 by={c['id']:c for c in cfgs}
 for c in cfgs:
  c['arch']='campus-sash';c['wall']='#ad7055'
  for q in c['parts']:q.update(arch='campus-sash',bay=3.8)
 if key=='square':
  court=by['w188828391'];court.update(arch='courthouse',wall='#e7e5d6',height=28.3)
  for q in court['parts']:q.update(arch='courthouse',floor=7,bay=5.2,roofTex='slate',pitch=17,colour='#758279')
  for q in court['ports']:q.update(order='corinthian',radius=.54,base=5.2,top=13.4)
  lyric=by['w321045760'];lyric.update(arch='lyric',wall='#be7855',frontNormal=[0,1],signName='THE LYRIC',shopColour='#6c3c30')
  for q in lyric['parts']:q.update(arch='lyric',h=8,bay=3.2)
  by['w451755566'].update(extra='cityhall',height=17.5)
  for id,name,arch,col,h,normal,bay in [
   ('w599810022','SQUARE BOOKS','books','#cf8054',9.3,[0,1],2.35),
   ('w599810038','CITY GROCERY','grocery','#a66348',8.7,[0,1],2.4),
   ('w599810029','REGIONS BANK','bank','#e0dbca',9.5,[0,1],2.3)]:
   b=bs[id];c=dict(id=id,parts=[dict(ring=b['ring'],h=h,obb=b['obb'],floor=h/2,arch=arch,bay=bay,style={'frontBay':bay,'sideBay':3.5})],wall=col,arch=arch,height=h+.5,frontNormal=normal,signName=name,shopColour='#eee7d3' if arch!='grocery' else '#637465')
   if arch=='books':c['galleries']=[dict(c=[-13.2,-68.8],n=[1,0],length=29.7,depth=1.7,z=4.3)]
   if arch=='grocery':c['galleries']=[dict(c=[-45.71,-53.03],n=[0,1],length=7.05,depth=1.7,z=4.2)]
   cfgs.append(c)
 else:
  for c in cfgs:
   if c['id']=='w187869639':
    c.update(wall='#a7674d',groundShutters=True)
    for p in c['parts']:p.update(arch='campus-sash',bay=3.4,floor=4.7)
    for p in c['ports']:p.update(order='ionic',radius=.56,top=14,clock=True)
   elif c['id'] in ['w969209390','w969209391','w188504264','w187869328']:
    kind={'w969209390':'bryant','w969209391':'peabody','w188504264':'brevard','w187869328':'chapel'}[c['id']]
    c.update(arch=kind,wall='#b3a183')
    for p in c['parts']:p.update(arch=kind,roof=None,bay=3.55,floor=4.5,archFloors=2 if kind in ['bryant','peabody'] else 3 if kind=='brevard' else 2)
    for p in c['ports']:
     p.update(order='corinthian' if kind in ['bryant','chapel'] else 'ionic',radius=.52)
     if kind in ['brevard','peabody']:p['flat']=True
     if kind=='bryant':p.update(base=2.2,top=11.8)
   elif c['id'] in ['w318273986','w188504265']:
    c['arch']='modern-campus'
    for p in c['parts']:p.update(arch='modern-campus',floor=3.8,bay=3.7)
   elif c['id']=='w187869326':
    c['arch']='croft'
    for p in c['parts']:p.update(arch='croft',bay=4.3,archFloors=3,pitch=18,roofTex='slate')
 new=json.dumps(cfgs,separators=(',',':'));s=s[:m.start(1)]+new+s[m.end(1):];lm_path.write_text(s)
 cityp=R/key/'city.json';city=json.load(open(cityp));city['styles']['default'].update(arch='campus-sash' if key=='campus' else 'shop',windowGlass='#526561',trim='#e5dfca',awning=False)
 if key=='campus':
  city['styles']['default'].update(wall=['#b0785b','#b68063','#ac6d51'],bay=3.8,floor=4,levels=3,roofColour=['#7a847b','#7a817c','#7e8277'])
  for id,o in city.get('buildings',{}).items():o['arch']='modern-campus' if id in ['w187869327','w318276286'] else 'campus-sash'
 else:
  city['styles']['default'].update(wall=['#b87653','#c39165','#ddd5bd','#ad7455'],bay=3,archFloors=2,glass=['#526561','#65756c'])
  for id,name,arch,col in [('w451755565','NEILSON’S','neilsons','#d1c6a5'),('w599911624','BOURÉ','shop','#e0d6bc'),('w599922073','AJAX DINER','shop','#a5a16d')]:
   city.setdefault('buildings',{}).setdefault(id,{}).update(arch=arch,wall=col,signName=name,frontNormal=[-1,0] if id=='w451755565' else [0,-1] if id=='w599911624' else [1,0],bay=3.5,awning=False)
  for id in ['w599810022','w599810038']:city['buildings'].pop(id,None)
 # Detail cameras remain easy to reach without changing the opening overview.
 for v in city['views']:
  if v['id']=='courthouse':v['camera'].update(zoom=2.3,pitch=28,yaw=-65,z=8)
  elif v['id']=='books':v['camera'].update(zoom=2.6,pitch=28,yaw=25,x=-16.7,y=-68.8,z=4)
  elif v['id']=='lyceum':v['camera'].update(zoom=1.5,pitch=27,yaw=-20,z=7)
  elif v['id']=='ventress':v['camera'].update(zoom=2.1,pitch=28,yaw=-65,z=7)
 def camera(x,y,zoom,yaw=-65,pitch=28,z=5):return dict(x=x,y=y,zoom=zoom,yaw=yaw,pitch=pitch,z=z)
 if key=='square':newviews=[('cityhall','City Hall',camera(69,25,2.1,-145,z=7)),('shoprow','South-side shops',camera(-33,-61,2,70,z=4))]
 else:newviews=[('bryant','Bryant Hall',camera(-16,-6,1.7,-70,z=5)),('peabody','Peabody Hall',camera(-95,-16,1.9,-55,z=5))]
 known={v['id'] for v in city['views']}
 for id,label,cam in newviews:
  if id not in known:city['views'].insert(0,dict(id=id,label=label,camera=cam))
 for l in city['legend']:
  v=next((v for v in city['views'] if v['label']==l['name'] or v['id']=={'Courthouse':'courthouse','The Lyceum':'lyceum','Square Books':'books','Ventress Hall':'ventress'}.get(l['name'])),None)
  if v:l['camera']=v['camera']
 city['notes']=[n for n in city['notes'] if n['title']!='Architectural detail pass']
 city['notes'].append({'title':'Architectural detail pass','text':'Façades now distinguish arched and sash windows, stone lintels, cornices, gallery railings, column orders, and roof forms. Main elevations were compared with photographs. Minor dimensions and unseen elevations remain interpreted.','links':[{'label':'County courthouse photograph','url':'https://lafayettems.com/places/lafayette-county-courthouse/'},{'label':'University building photographs','url':'https://www.university-grounds.com/home/university-of-mississippi'},{'label':'Brevard restoration','url':'https://www.mccartycompany.com/projects/brevard-hall'}]})
 cityp.write_text(json.dumps(city,indent=2))

import json,re
from pathlib import Path
R=Path(__file__).parent;O=R.parent/'outputs'
p=R/'pocket-city/assets/kit/city.js';s=p.read_text();s=s.replace('const flow=FEEDS.map((f,i)=>','const flow=FEEDS.filter(f=>SEASON.traffic!==false||f.kind===\'ped\').map((f,i)=>');p.write_text(s)
for key in ['square','campus']:
 p=R/key/'city.json';c=json.loads(p.read_text())
 for o in c['occasions']:o['traffic']=False
 for l in c['legend']:l['count']=''
 if key=='square':
  c['seasons'][2]['note']={'text':'Mississippi has a humid subtropical climate with rainfall through the year.','source':'Mississippi State Climatologist','url':'https://www.geosciences.msstate.edu/state-climatologist/mississippi-climate'}
  c['notes'].append({'title':'Courthouse landscape','text':'The octagonal lawn, shade trees, and entrance paths are approximate additions based on photographs; they are not a tree or landscape survey.','links':[{'label':'Historic courthouse photographs','url':'https://www.apps.mdah.ms.gov/nom/prop/31421.pdf'}]})
 c['notes'].append({'title':'Explore the wider campus','text':'Use the campus-wide atlas for searchable main-campus buildings, playing fields, and streets beyond the miniature.','links':[{'label':'Campus-wide map','url':'campus-overview.html'}]})
 p.write_text(json.dumps(c,indent=2))

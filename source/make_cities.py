import json,copy,math
from pathlib import Path
ROOT=Path(__file__).parent
climate='https://www.geosciences.msstate.edu/state-climatologist/mississippi-climate'
trees='https://www.tclf.org/university-mississippi'
nom='https://www.apps.mdah.ms.gov/nom/dist/200.pdf'
ch='https://www.apps.mdah.ms.gov/nom/prop/31421.pdf'
link=lambda label,url:{'label':label,'url':url}
note=lambda text,source,url:{'text':text,'source':source,'url':url}
base={
 'name':'Oxford','title':'Oxford · The Square','region':'Mississippi / United States','place':'Courthouse Square','timezone':'America/Chicago','level':3.5,
 'styles':{'default':{'facade':'brick','wall':['#ae7760','#be896e','#c29a7d','#e4dccb'],'levels':2,'floor':3.5,'roof':'flat','flatRoof':'#aaa497','parapet':.6,'rooftop':'none','shop':'poi','bay':3.4,'trim':'#eee5cf','glass':['#9aaead','#a2b6b5'],'awning':'some','awnings':['#425d50','#a96350','#e6d5ac']},'rules':[{'if':{'maxArea':30},'set':{'levels':1,'shop':'none'}}]},
 'palette':{'ground':'#e5ddc5','road':'#a6a5a0','pavement':'#ded5be','walk':'#d9c9ac','grass':'#a8bb87','slab':'#c9b797','marking':'#f2e9ce','kerb':'#d8caad','paving':'#bbac91'},
 'paving':{'style':'slabs','size':.65,'colour':'#c5b89f'},
 'lamp':{'colour':'#405b4b','height':4.8,'head':'#f2e3b6','auto':True},
 'shops':{'signs':['BOOKS','COFFEE','GALLERY','DINER'],'font':'Georgia,serif','fascias':['#39594f','#9f5948','#eee2c9'],'awnings':['#49604b','#ad7560']},
 'cafes':{'umbrellas':['#e7dfc9','#46614f'],'stripes':False,'table':'#e3d1a8','chair':'#726045'},
 'trees':{'default':{'style':3,'colours':['#82966e','#a6b680','#91a477'],'height':11,'autumn':'#bb8b52'},'rules':[{'match':'Park tree|Garden tree|Woodland','vary':.3,'mix':[{'style':3,'height':12,'share':7},{'style':3,'height':10,'evergreen':True,'colours':['#557e65'],'share':2},{'style':5,'height':12,'evergreen':True,'share':1}]}]},
 'people':{'skin':['#e7bb96','#b98260','#7a5140','#cf9c75'],'clothes':['#a7524c','#49647b','#ece2cf','#577b85','#caad7f'],'pants':['#555a63','#526276','#a39b82'],'hair':['#433b31','#806349','#c2a379'],'umbrellas':['#ac5b50','#435e70']},
 'vehicles':{'kinds':['sedan','hatch','mpv'],'colours':['#e6e2d8','#8a969b','#3e5263','#ad6757','#b9b8ad'],'plate':'#f4edda','taxi':{'share':0}},
 'seasons':[
  {'id':'spring','label':'Spring','leaves':'spring','grass':'#adbf87','note':note('Mississippi’s spring brings a heightened threat of thunderstorms.','Mississippi State Climatologist',climate)},
  {'id':'summer','label':'Summer','leaves':'summer','haze':True,'grass':'#9aaf7a','note':note('Mississippi has long, hot summers and high humidity.','Mississippi State Climatologist',climate)},
  {'id':'autumn','label':'Autumn','leaves':'autumn','grass':'#b6b284','note':note('The Grove’s canopy includes oaks, magnolias, and elms.','The Cultural Landscape Foundation',trees)},
  {'id':'winter','label':'Winter','leaves':'bare','coats':True,'cafes':False,'note':note('Mississippi winters are temperate, with cold spells generally short.','Mississippi State Climatologist',climate)}],
 'months':['winter','winter','spring','spring','spring','summer','summer','summer','autumn','autumn','autumn','winter'],
 'notes':[], 'credits':[link('OpenStreetMap contributors · ODbL','https://www.openstreetmap.org/copyright'),link('Pocket City · April Zhu · MIT','https://april-zhu.com/pocketcity/')]
}
def cam(x=0,y=0,yaw=-35,pitch=35,zoom=.62,z=4):return dict(x=x,y=y,yaw=yaw,pitch=pitch,zoom=zoom,z=z)
for key in ['square','campus']:
 c=copy.deepcopy(base);s=json.load(open(ROOT/key/'scene.json'));camp=key=='campus'
 c['cameras']={'iso':cam(yaw=-30 if camp else -35,pitch=40 if camp else 35,zoom=.31 if camp else .62)}
 c['views']=[{'id':f'angle{i}','label':f'View {i+1}','camera':cam(yaw=i*60-30,pitch=38,zoom=.31 if camp else .62)} for i in range(6)]
 if camp:
  c.update(name='Ole Miss',title='University of Mississippi · Historic Core',region='Oxford / University of Mississippi',place='The Lyceum · The Circle · The Grove')
  c['styles']['default'].update(levels=3,floor=3.7,roof='hipped',pitch=22,roofColour=['#92968f','#878e8e','#929a92'],flatRoof='#9c9f94',maxSpan=32,rectFill=.65,wall=['#b77d66','#bc876d','#b37b66'],shop='none',bay=3.7)
  c['palette']['ground']='#b2bf92'
  c['buildings']={'w187869327':{'roof':'flat','levels':3,'facade':'civic'},'w188498900':{'levels':4,'roof':'flat','facade':'civic'},'w318276286':{'levels':2,'roof':'flat'},'w313153529':{'levels':1,'roof':'hipped','height':4}}
  c['occasions']=[{'id':'gameday','label':'Grove gameday','leaves':'autumn','crowd':1.7,'dress':{'colours':['#b54e4a','#35516d','#ece6d8'],'share':.85},'note':note('The Walk of Champions passes through the Grove before home football games.','Ole Miss Athletics','https://olemisssports.com/sports/2018/7/20/trads-the-grove-html')}]
  focus=[('lyceum','The Lyceum',-125,-98,.92),('circle','The Circle',-10,-103,.68),('grove','The Grove',160,-45,.65),('ventress','Ventress Hall',93,-100,1.55),('observatory','Kennon Observatory',-163,-227,1.55)]
  c['notes']=[{'title':'Campus extent','text':'A 600 m square of the historic core and Grove. The stadium, western campus, and outlying university properties are beyond this scene.','links':[link('Campus landscape',trees)]}, {'title':'Landmark studies','text':'Custom models of the Lyceum, Circle halls, observatories, and Fulton Chapel use mapped footprints and published descriptions. Details and heights without measurements are interpreted.','links':[link('Historic district survey',nom),link('University buildings','https://catalog.olemiss.edu/university/buildings.pdf')]},{'title':'A place in civil rights history','text':'James Meredith’s enrollment in 1962 is central to the historic district’s significance. The scene depicts everyday campus life.','links':[link('MDAH district history','https://www.apps.mdah.ms.gov/Public/district.aspx?id=200&view=facts')]}]
 else:
  c['occasions']=[{'id':'doubledecker','label':'Double Decker arts','leaves':'spring','crowd':1.7,'note':note('The Double Decker Arts Festival brings music, art, and food to the Square.','Visit Oxford','https://visitoxfordms.com/double-decker-festival/faq/')}]
  focus=[('courthouse','Courthouse',-8,0,1.8),('books','Square Books',-15,-58,1.65),('lyric','The Lyric',-120,-74,1.6),('square','Around the Square',0,0,.8)]
  c['notes']=[{'title':'The town square','text':'A 300 m square rotated 10° clockwise from north. The courthouse and Lyric remain whole inside the plot.','links':[link('OpenStreetMap','https://www.openstreetmap.org/#map=18/34.36637/-89.51871')]},{'title':'Courthouse study','text':'The custom model includes paired porticoes, arcaded bases, and a domed clock cupola. The mapped outline supplies the plan; unmeasured proportions are interpreted.','links':[link('MDAH architectural survey',ch)]},{'title':'Books and music','text':'Mapped shop names identify the commercial streets. Storefronts and the Lyric model are simplified interpretations. Shop listings reflect OpenStreetMap and may be outdated.','links':[link('The Lyric','https://thelyricoxford.com/about/'),link('Historic Square','https://oxfordms.com/about-oxford/oxford-culture/historic-oxford-square/')]}]
 c['legend']=[]
 for id,label,x,y,z in focus:
  ca=cam(x,y,yaw=-20 if id=='lyceum' else -65 if id=='courthouse' else -25,pitch=32,zoom=z,z=5)
  c['views'].insert(0,dict(id=id,label=label,camera=ca));c['legend'].append(dict(name=label,source='Landmark / mapped position',count='↗',icon='landmark',camera=ca))
 c['notes'].append({'title':'Measured and illustrative','text':f"{len(s['buildings'])} mapped building footprints and mapped streets/paths; {sum(b.get('h') is None and b.get('lv') is None for b in s['buildings'])} buildings lack mapped heights. Colours, façade details, trees, furniture, weather, people, and trips are illustrative. Special scenes evoke events rather than reproduce a particular date.",'links':[link('OpenStreetMap data license','https://www.openstreetmap.org/copyright'),link('Climate',climate),link('Tree context',trees)]})
 (ROOT/key/'city.json').write_text(json.dumps(c,indent=2))

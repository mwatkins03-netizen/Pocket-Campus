/* Pocket City engine for any place.
   SCENE  measured map data from prep.py (footprints, heights, streets, trees, routes, shops)
   CITY   the researched look from city.json (building styles, palette, people, seasons, occasions)
   LANDMARKS  hand-built famous buildings from landmarks.js (optional; replaces the generic block of those ids)
   Runs inside the render workers with the shared kit: projection, models, streetFigures, foliage, painter. */
const M=SCENE.meta,BASE_CORNERS=SCENE.corners,NORTH=M.north,SLAB=4,HALF=M.half,LEVEL=CITY.level||M.level||3.2;
let FIG_W=540,FIG_H=675,WOBBLE=0,UPX=1,pictureBook=true,washEnabled=true;
const rnd=s=>{const v=Math.sin(s*127.1+311.7)*43758.5453;return v-Math.floor(v)};
const soft=c=>({l:c,m:mix(c,'#887997',.18),d:mix(c,'#705f81',.33)});
const PLANT_INK='#231e17',lineOf=(c,plant)=>mix(c,'#51465a',plant?.38:.53);
const atZ=(r,z)=>r.map(p=>[p[0],p[1],z]);
/* ---------- measured terrain (survey.py: USGS 3DEP lidar bare earth) ----------
   SCENE.terrain is a square grid of heights above the plot's lowest point. groundZ(x, y) reads it; the ground is draped over
   it, and every object is drawn lifted to the ground it stands on (lifted()). Without a terrain the plot is flat as before. */
const TER=SCENE.terrain||null,TER_Z=TER?Float32Array.from(TER.z,v=>v/10):null;
const groundZ=TER?(x,y)=>{const n=TER.n,fx=Math.max(0,Math.min(n-1.001,(x+SCENE.meta.half)/TER.cell)),fy=Math.max(0,Math.min(n-1.001,(y+SCENE.meta.half)/TER.cell)),i=Math.floor(fx),j=Math.floor(fy),u=fx-i,v=fy-j,k=j*n+i;
  return TER_Z[k]*(1-u)*(1-v)+TER_Z[k+1]*u*(1-v)+TER_Z[k+n]*(1-u)*v+TER_Z[k+n+1]*u*v}:()=>0;
const TER_MID=TER?TER.max/2:0;
let LIFT=0,BUILD_LIFT=0,SHOW_CONTOURS=true;
// run fn with everything it draws raised dz metres (a pure slide on screen, since the view is orthographic)
function lifted(dz,fn){if(!dz)return fn();const k=CAM_K*CAM_D[2]*dz;OY+=k;LIFT+=dz;try{return fn()}finally{OY-=k;LIFT-=dz}}
const centreOf=fp=>{let x=0,y=0;for(const p of fp){x+=p[0];y+=p[1]}return [x/fp.length,y/fp.length]};
const groundAt=fp=>{const c=centreOf(fp);return groundZ(c[0],c[1])};
// a plan outline laid on the ground: long edges are cut every 4 m so they follow the slope
const DRAPED=new WeakMap();
function drape(r,keep=true){
  if(!TER)return atZ(r,0);
  let o=keep?DRAPED.get(r):null;if(o)return o;o=[];
  for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(l/4));
    for(let k=0;k<n;k++){const x=a[0]+(b[0]-a[0])*k/n,y=a[1]+(b[1]-a[1])*k/n;o.push([x,y,groundZ(x,y)])}}
  if(keep)DRAPED.set(r,o);return o;
}
const drapeLine=(pts,dz=.03)=>{const o=[];for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],l=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(l/4));for(let k=0;k<n+(i===pts.length-2?1:0);k++){const x=a[0]+(b[0]-a[0])*k/n,y=a[1]+(b[1]-a[1])*k/n;o.push([x,y,groundZ(x,y)+dz])}}return o};
// contour lines every metre (marching squares over the terrain grid), as short draped segments joined per level
const CONTOURS=[];
if(TER){const n=TER.n,c=TER.cell,H0=SCENE.meta.half,step=(CITY.terrain||{}).contour||1,at=(i,j)=>TER_Z[j*n+i];
  for(let lv=step;lv<TER.max;lv+=step){const segs=[];
    for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){const v=[at(i,j),at(i+1,j),at(i+1,j+1),at(i,j+1)],P4=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]],hit=[];
      for(let e=0;e<4;e++){const a=v[e],b=v[(e+1)%4];if((a<lv)!==(b<lv)){const t=(lv-a)/(b-a),p=P4[e],q=P4[(e+1)%4];hit.push([(p[0]+(q[0]-p[0])*t)*c-H0,(p[1]+(q[1]-p[1])*t)*c-H0,lv+.04])}}
      if(hit.length>=2)segs.push([hit[0],hit[1]]);if(hit.length===4)segs.push([hit[2],hit[3]])}
    CONTOURS.push({lv,segs})}}
const hash=s=>{let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)};
const pickOf=(v,seed)=>Array.isArray(v)?v[hash(seed)%v.length]:v;
const PAL={ground:'#eadfc9',road:'#b8aeb2',pavement:'#ebdfc8',walk:'#e6d7be',grass:'#b4cb95',water:'#9cc3c4',sand:'#ecd9a8',quay:'#d9cfbb',slab:'#d8c5a3',
  marking:'#f4ead3',kerb:'#e3c477',paving:'#c6baa7',rail:'#7d7f86',...(CITY.palette||{})};

/* ---------- textures that turn with a surface (roof tiles, copper, cladding) ---------- */
const sheetTiles=new Map();
function sheetInk(points,name,u,v){
  const origin=points[0],right=Dv(...u),down=Dv(...v),p=P(...origin);
  if(Math.abs(right[0]*down[1]-right[1]*down[0])<.04||UPX>.68)return '';
  const coords=points.map(q=>[dot(sub(q,origin),u),dot(sub(q,origin),v)]),xs=coords.map(q=>q[0]),ys=coords.map(q=>q[1]);
  const bounds=[Math.min(...xs)-1,Math.min(...ys)-1,Math.max(...xs)+1,Math.max(...ys)+1];
  return '<sheet name="'+name+'" d="'+pd(points)+'" matrix="'+[...right,...down,...p].join(' ')+'" bounds="'+bounds.join(' ')+'"/>';
}
function paintSheet(g,op){
  let tile=sheetTiles.get(op.name);
  if(!tile){
    const size=256,c=makeSurface(size,size),ink=c.getContext('2d');
    if(op.name==='standing-seam'){for(let x=0;x<256;x+=24){ink.fillStyle='rgba(42,57,50,.25)';ink.fillRect(x,0,1.8,256);ink.fillStyle='rgba(238,240,216,.25)';ink.fillRect(x+2,0,1,256)}}else if(op.name==='copper'){
      for(let row=0;row<24;row++)for(let col=0;col<24;col++){const x=(col+(row%2)*.5)*size/24,y=(row+.5)*size/24;ink.fillStyle='rgba(117,63,57,.47)';ink.beginPath();ink.arc(x,y,1.45,0,Math.PI*2);ink.fill()}
    }else if(op.name==='pantile'||op.name==='kawara'){   // rows of rolled tiles running down the slope
      for(let col=0;col<16;col++){const x=col*16;ink.fillStyle='rgba(60,58,70,.20)';ink.fillRect(x,0,3.2,256);ink.fillStyle='rgba(255,246,226,.10)';ink.fillRect(x+6,0,4,256)}
      for(let row=0;row<8;row++){ink.fillStyle='rgba(60,58,70,.12)';ink.fillRect(0,row*32,256,1.6)}
    }else if(op.name==='slate'){
      for(let row=0;row<16;row++)for(let col=-1;col<12;col++){const x=(col+(row%2)*.5)*24,y=row*16,r=rnd(row*13+col);ink.fillStyle='rgba(58,62,74,'+(.05+r*.12)+')';ink.fillRect(x+.6,y+.6,23,15);ink.fillStyle='rgba(40,44,55,.2)';ink.fillRect(x,y+15,24,1)}
    }else{   // plain tiles or shingles
      for(let row=0;row<12;row++)for(let col=-1;col<8;col++){const x=(col+(row%2)*.5)*32,y=row*size/12,r=rnd(row*17+col+103);
        ink.fillStyle=r>.48?'rgba(247,229,204,'+(.04+r*.11)+')':'rgba(68,72,82,'+(.06+r*.15)+')';ink.fillRect(x+.75,y+.75,30.8,size/12-1.3);
        ink.fillStyle='rgba(62,68,77,.23)';ink.fillRect(x,y+size/12-1.25,32,1.25);ink.fillRect(x,y,1,size/12)}
    }
    tile=c;sheetTiles.set(op.name,tile);
  }
  const [l,t,r,b]=op.bounds,pitch=op.name==='copper'?3.6:op.name==='kawara'||op.name==='pantile'?2.6:4.6;
  g.save();g.clip(op.path);g.transform(...op.matrix);g.scale(pitch/tile.width,pitch/tile.height);
  const scale=tile.width/pitch;g.fillStyle=g.createPattern(tile,'repeat');g.fillRect(l*scale,t*scale,(r-l)*scale,(b-t)*scale);g.restore();
}

/* ---------- small geometry ---------- */
function inside(p,r){let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
const inRings=(p,groups)=>groups.some(rs=>{let c=false;for(const r of rs)if(inside(p,r))c=!c;return c});
const obj=(fp,h,draw)=>({fp,h,draw});
function rect(x,y,w,d){return [[x-w/2,y-d/2],[x+w/2,y-d/2],[x+w/2,y+d/2],[x-w/2,y+d/2]]}
const polygon=(x,y,r,n,angle=0)=>Array.from({length:n},(_,i)=>[x+r*Math.cos(i*2*Math.PI/n+angle),y+r*Math.sin(i*2*Math.PI/n+angle)]);
const footprintPath=r=>pd(drape(r)),surface=(rings,color)=>'<path d="'+rings.map(footprintPath).join('')+'" fill="'+color+'" fill-rule="evenodd"/>';
const edge=(a,b,c,width)=>'<path d="'+pd([a,b],false)+'" fill="none" stroke="'+c+'" style="stroke-width:'+f(width)+'"/>';
function stripeAt(p,d,length,width){const n=[-d[1]*width/2,d[0]*width/2],a=[d[0]*length/2,d[1]*length/2];
  return pd([[p[0]-a[0]-n[0],p[1]-a[1]-n[1]],[p[0]+a[0]-n[0],p[1]+a[1]-n[1]],[p[0]+a[0]+n[0],p[1]+a[1]+n[1]],[p[0]-a[0]+n[0],p[1]-a[1]+n[1]]].map(q=>[q[0],q[1],groundZ(q[0],q[1])+.02]))}
function peak(r,base,tip,col){
  return r.map((a,i)=>{const b=r[(i+1)%r.length],p=[[...a,base],[...b,base],tip];const n=vNewell(p);return {p,n,at:avg(p)}}).filter(p=>vis(p.n)).sort((a,b)=>depthOf(a.at)-depthOf(b.at)).map(p=>shape(p.p,tone(p.n,soft(col)),.65)).join('');
}
// Elevations run right-to-left as seen from outside, so lettering is drawn turned round about its anchor.
function wallText(g,str,x,y,w){const a=g.textAlign;g.save();g.translate(x,y);g.scale(-1,1);g.textAlign=a==='start'||a==='left'?'right':a==='end'||a==='right'?'left':a;g.fillText(str,0,0,w);g.restore()}

/* ---------- the look of each building: city.json rules, then per-building overrides ---------- */
const STYLES=CITY.styles||{};
function matches(c,b){
  if(!c)return true;
  const any=(v,x)=>Array.isArray(v)?v.includes(x):v===x;
  if(c.type&&!any(c.type,b.type))return false;
  if(c.use&&!any(c.use,b.use))return false;
  if(c.mat&&!any(c.mat,b.mat))return false;
  if(c.famous!==undefined&&!!b.famous!==c.famous)return false;
  if(c.cut!==undefined&&!!b.cut!==c.cut)return false;
  if(c.name&&!new RegExp(c.name,'i').test(b.n||''))return false;
  const h=b.h??(b.lv?b.lv*LEVEL:null);
  if(c.minH!==undefined&&!(h>=c.minH))return false;
  if(c.maxH!==undefined&&!(h!==null&&h<=c.maxH))return false;
  if(c.minLevels!==undefined&&!((b.lv??(h?h/LEVEL:0))>=c.minLevels))return false;
  if(c.maxLevels!==undefined&&!((b.lv??(h?h/LEVEL:99))<=c.maxLevels))return false;
  if(c.minArea!==undefined&&!(b.area>=c.minArea))return false;
  if(c.maxArea!==undefined&&!(b.area<=c.maxArea))return false;
  if(c.unknownHeight!==undefined&&(b.h==null&&b.lv==null)!==c.unknownHeight)return false;
  if(c.nearStreet!==undefined&&b.street!==c.nearStreet)return false;
  return true;
}
function styleFor(b){
  let s={facade:'house',wall:['#eee2ca'],roofColour:['#c8c4b8'],roof:'auto',pitch:30,eaves:.45,levels:3,floor:LEVEL,shop:'poi',parapet:.5,...(STYLES.default||{})};
  for(const rule of STYLES.rules||[])if(matches(rule.if,b)){s={...s,...rule.set};if(!rule.more)break}
  return {...s,...((CITY.buildings||{})[b.id]||{})};
}
const POIS=SCENE.pois||[];
const areaOf=r=>Math.abs(r.reduce((s,p,i)=>{const q=r[(i+1)%r.length];return s+p[0]*q[1]-q[0]*p[1]},0)/2);
const nearStreet=b=>b.ring.some((a,i)=>{const c=b.ring[(i+1)%b.ring.length],m=[(a[0]+c[0])/2,(a[1]+c[1])/2];
  return [[3,0],[-3,0],[0,3],[0,-3]].some(([dx,dy])=>inRings([m[0]+dx,m[1]+dy],SCENE.roads))});
for(const b of SCENE.buildings){
  b.area=areaOf(b.ring);b.street=nearStreet(b);b.pois=[];
}
for(const p of POIS){   // a named shop belongs to the building it stands in, or the nearest one within 6 m
  let best=null,bd=6;
  for(const b of SCENE.buildings){if(inside([p.x,p.y],b.ring)){best=b;break}
    for(let i=0;i<b.ring.length;i++){const a=b.ring[i],c=b.ring[(i+1)%b.ring.length],dx=c[0]-a[0],dy=c[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy||1)));
      const d=Math.hypot(a[0]+dx*t-p.x,a[1]+dy*t-p.y);if(d<bd){bd=d;best=b}}}
  if(best)best.pois.push(p);
}
function heightsOf(b,st){
  const pitched=roofKind(b,st)!=='flat';
  const rise=pitched?(b.rh||(ridgeFrame(b,st).W/2+st.eaves)*Math.tan(st.pitch*Math.PI/180)):0;
  let wall;
  if(b.h)wall=pitched?Math.max(2.6,b.h-rise):b.h;
  else if(b.lv)wall=b.lv*st.floor+(pitched?0:.6);
  else wall=(st.levels||3)*st.floor+(pitched?0:.6);
  if(st.height)wall=st.height;
  return {wall:Math.max(wall,(b.min||0)+2.4),top:Math.max(wall,(b.min||0)+2.4)+rise,rise};
}
function roofKind(b,st){
  let k=st.roof==='auto'?(b.roof||'flat'):st.roof;
  if(k==='auto')k='flat';
  if(['gabled','hipped','pyramidal','half-hipped','gambrel','mansard','saltbox','round'].includes(k)){
    if(k==='half-hipped'||k==='mansard'||k==='gambrel'||k==='saltbox')k=k==='mansard'?'hipped':'gabled';
    if(k==='round')k='gabled';
    if(b.obb.fill<(st.rectFill||.78)||b.obb.W<2.5||ridgeFrame(b,st).W>(st.maxSpan||22))return 'flat';
    return k;
  }
  return 'flat';
}

/* ---------- walls: one face per footprint edge, each with a painted elevation ---------- */
const models=[],facades=[];
function walls(r,z,h,info){
  const area=r.reduce((s,p,i)=>{const q=r[(i+1)%r.length];return s+p[0]*q[1]-q[0]*p[1]},0);
  const faces=r.map((a,i)=>{
    const b=r[(i+1)%r.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(len<.05)return null;
    const u=[(b[0]-a[0])/len,(b[1]-a[1])/len],n=[u[1]*Math.sign(area),-u[0]*Math.sign(area),0];
    const flip=area>0,start=flip?b:a,along=flip?u.map(v=>-v):u;
    const cut=BASE_CORNERS.some((v,j)=>{const w=BASE_CORNERS[(j+1)%4];return Math.abs(v[0]-w[0])<.01?Math.abs(a[0]-v[0])<.05&&Math.abs(b[0]-v[0])<.05:Math.abs(a[1]-v[1])<.05&&Math.abs(b[1]-v[1])<.05});
    const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
    const street=!cut&&[2.2,4.5,7].some(d=>{const q=[mid[0]+n[0]*d,mid[1]+n[1]*d];return inRings(q,SCENE.roads)||inRings(q,SCENE.walk)||inRings(q,SCENE.paths)});
    const st=info.st,bld=info.b;
    let roadFace=false;if(st.shop==='road'&&!cut)for(let d=1.5;d<=15;d+=1.5){const q=[mid[0]+n[0]*d,mid[1]+n[1]*d];if(SCENE.buildings.some(o=>o!==bld&&inside(q,o.ring)))break;if(inRings(q,SCENE.roads)){roadFace=true;break}}
    const shop=!cut&&z<.5&&len>=3.5&&st.shop!=='none'&&(st.shop==='road'?roadFace:street&&(st.shop==='street'||(st.shop==='poi'&&bld&&bld.pois.length)));
    const sign=shop&&bld&&bld.pois.length?(bld.pois[i%bld.pois.length].name):(shop&&st.shop!=='road'?pickOf((CITY.shops||{}).signs||[''],(bld?bld.id:'')+i):'');
    const mw=shop&&st.minWall||0,hh=info.hs?Math.max(info.hs[i],mw):h,prof=info.prof&&info.prof[i]?(mw?info.prof[i].map(v=>Math.max(v,mw)):info.prof[i]):null;   // minWall: a street front hidden from the lidar by its own gallery or canopy
    const id=facades.push({start,along,n,len,z,h:hh,st,cut,shop,sign,seed:hash((bld?bld.id:'')+i),body:info.body,street,lift:LIFT||BUILD_LIFT,bld})-1;
    return {a,b,n,id,h:hh,prof};
  }).filter(Boolean);
  return ()=>faces.filter(q=>vis(q.n)).sort((a,b)=>depthOf([...a.a,0])-depthOf([...b.a,0])).map(q=>{
    const fac=facades[q.id];let wall=[...atZ([q.a,q.b],z),...atZ([q.b,q.a],q.h)];
    if(q.prof&&q.prof.length>1){const m=q.prof.length-1;wall=atZ([q.a,q.b],z);for(let k=m;k>=0;k--)wall.push([q.a[0]+(q.b[0]-q.a[0])*k/m,q.a[1]+(q.b[1]-q.a[1])*k/m,Math.max(q.h,q.prof[k])])}
    return shape(wall,tone(q.n,soft(info.body)),.7)+'<elevation id="'+q.id+'"/>'+relief(fac)+(fac.street&&fac.st.eave1&&!fac.cut?midEave(fac):'');
  }).join('');
}
/* frontSegments: "fronts" on a building style splits its long street wall into the separate façades that stand there
   ({a, b} = plot coordinates along the wall, plus any style fields: wall, heads, motif, gallery, canopy, sign). */
function frontSegments(F){
  const fr=F.st.fronts;if(!fr||!F.shop||F.len<16||F.sub)return null;
  const ax=Math.abs(F.along[0])>Math.abs(F.along[1])?0:1;if((F.st.frontsAxis||0)!==ax)return null;const out=[];
  for(const [k,sg] of fr.entries()){let s0=(sg.a-F.start[ax])/F.along[ax],s1=(sg.b-F.start[ax])/F.along[ax];if(s0>s1)[s0,s1]=[s1,s0];s0=Math.max(0,s0);s1=Math.min(F.len,s1);if(s1-s0<2)continue;
    out.push({s0,F:{...F,sub:true,start:[F.start[0]+F.along[0]*s0,F.start[1]+F.along[1]*s0],len:s1-s0,body:sg.wall||F.body,sign:sg.sign??'',seed:F.seed+k*7+1,st:{...F.st,fronts:null,gallery:null,canopy:null,motif:null,heads:null,signName:null,...sg}}})}
  return out.length?out:null;
}
const relief1=F=>facadeRelief(F)+(F.shop&&F.st.awning!==false&&!F.st.gallery&&!F.st.canopy&&F.st.motif!=='diamonds'?canopy(F):'');
function relief(F){const segs=frontSegments(F);return segs?segs.map(q=>relief1(q.F)).join(''):relief1(F)}
// a shop awning or canopy over each bay of a shopfront
function canopy(F){
  const st=F.st,cols=st.awnings||(CITY.shops||{}).awnings||['#af7762','#688d86','#b59972','#7a8aa8'];
  const bays=Math.max(1,Math.round(F.len/(st.bay||5.5))),bay=F.len/bays,height=Math.min(F.h-F.z-.3,st.shopHeight?st.shopHeight-.2:3.2);
  const at=(s,d,z)=>[F.start[0]+F.along[0]*s+F.n[0]*d,F.start[1]+F.along[1]*s+F.n[1]*d,z];
  let svg='';
  for(let i=0;i<bays;i++){
    if(st.awning==='some'&&(F.seed+i)%3)continue;
    const a=bay*i+.25,b=bay*(i+1)-.25,proj=st.awningDepth||.9,front=height-.42,c=cols[(F.seed+i)%cols.length];
    svg+=shape([at(a,0,height),at(b,0,height),at(b,proj,front),at(a,proj,front)],c,.36);
    if(UPX<.55&&st.stripes!==false)for(let t=a+.12;t<b-.2;t+=.6){const u=Math.min(b,t+.24);svg+=shape([at(t,0,height+.012),at(u,0,height+.012),at(u,proj,front+.012),at(t,proj,front+.012)],'#efe2c6',0)}
    svg+=shape([at(a,proj,front),at(b,proj,front),at(b,proj,front-.16),at(a,proj,front-.16)],mix(c,'#726d78',.3),.3);
  }
  return svg;
}
// a small tiled pent roof between ground and first floor (machiya ichimon-ji eave, shophouse eaves)
function midEave(F){
  const st=F.st,z=F.z+(st.shopHeight||Math.min(3.4,(F.h-F.z)*.5)),proj=st.eave1Depth||.75;
  if(z>F.h-1)return '';
  const at=(s,d,zz)=>[F.start[0]+F.along[0]*s+F.n[0]*d,F.start[1]+F.along[1]*s+F.n[1]*d,zz];
  const col=pickOf(st.roofColour,F.seed);
  return shape([at(0,0,z+.42),at(F.len,0,z+.42),at(F.len,proj,z),at(0,proj,z)],SEASON.snow?snowy(col,.75):col,.45)+edge(at(0,proj,z),at(F.len,proj,z),mix(col,'#3d3a44',.35),.07);
}

/* ---------- painted elevations ---------- */
function paintSingaporeElevation(g,id){const F=facades[id];return lifted(F.lift||0,()=>paintElevation0(g,id))}
function paintElevation0(g,id){
  const F=facades[id],{start,along,n,len:L,z,h,st}=F,H=h-z;
  if(L<.38||H<.48)return;
  const X=Dv(...along,0),Y=Dv(0,0,-1),p=P(...start,h);
  g.save();g.transform(...X,...Y,...p);g.beginPath();g.rect(0,0,L,H);g.clip();
  const box=(x,y,w,d,c)=>{g.fillStyle=c;g.fillRect(x,y,w,d)};
  const poly=(ps,c)=>{g.fillStyle=c;g.beginPath();ps.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill()};
  const side=dot(n,SUN)>.14,shade=c=>nightCol(side?c:mix(c,'#8e839a',.19)),lit=i=>SEASON.night&&rnd(F.seed*.013+i*3.71)<(SEASON.litShare??.55);
  const trim=shade(st.trim||'#f6ead2'),frame=shade(st.frame||'#837e7c'),dark=shade(st.dark||'#526662');
  const glass=(st.glass||['#b4d3cd','#c0d7ca','#a5c6cc','#d9d6b6']).map(shade);
  if(F.cut){box(0,0,L,H,shade('#d3c4b6'));for(let y=st.floor;y<H;y+=st.floor)box(0,y,L,.12,shade('#e6dac6'));g.restore();return}
  if(UPX>1.1){g.restore();return}
  const kind=st.facade,fl=st.floor||LEVEL;
  const shopH=F.shop?Math.min(H,st.shopHeight||Math.max(3.1,fl*1.1)):0,upper=H-shopH;
  const floors=Math.max(1,Math.round(upper/fl)),rh=upper/Math.max(1,floors);
  const bayW=st.bay||(kind==='glass'?2:kind==='office'?2.4:kind==='timber'?1.8:kind==='civic'||kind==='temple'?4.2:kind==='painted'?2.6:3.2);
  const cols=Math.max(1,Math.round(L/bayW)),bw=L/cols;
  function win(x,y,w,d,i){   // one window: frame, glass with a glint, glazing bars
    box(x-.09,y-.09,w+.18,d+.18,frame);
    if(lit(i)){box(x,y,w,d,(i+F.seed)%3?'#ffd98a':'#ffe7a8')}
    else{box(x,y,w,d,glass[(i+F.seed)%glass.length]);poly([[x,y],[x+w*.42,y],[x+w*.14,y+d],[x,y+d]],shade('#e2e8dc'))}
    if(st.bars!==false){box(x+w*.5-.03,y,.06,d,trim);if(d>1.2)box(x,y+d*.32,w,.05,trim)}
  }
  if(st.arch){const segs=frontSegments(F);   // one mapped outline, several real shopfronts: each stretch painted in its own style
    if(segs){for(const sg of segs){g.save();g.translate(sg.s0,0);g.beginPath();g.rect(0,0,sg.F.len,H);g.clip();box(0,0,sg.F.len,H,shade(sg.F.body));paintOxfordArchitecture(g,sg.F,{box,poly,shade});g.restore()}g.restore();return}
    if(paintOxfordArchitecture(g,F,{box,poly,shade})){g.restore();return}}
  if(kind==='glass'){
    for(let j=0;j<Math.max(1,Math.round(upper/3.6));j++)for(let i=0;i<cols;i++){const x=bw*i,y=j*3.6;
      box(x,y,bw+.01,3.6,glass[(Math.floor(i/5)+Math.floor(j/3)+F.seed)%glass.length]);box(x,y,.08,3.6,frame);box(x,y+3.25,bw,.12,frame);
      if((i+j+F.seed)%11===2)poly([[x,y+.3],[x+bw*.6,y+.3],[x+bw*.2,y+3.1],[x,y+3.1]],shade('#d4e2da'))}
  }else if(kind==='office'){
    for(let j=0;j<floors;j++){const y=j*rh;box(0,y+rh*.24,L,rh*.5,glass[(j+F.seed)%glass.length]);
      for(let i=1;i<cols;i++)box(i*bw,y+rh*.24,.07,rh*.5,frame);box(0,y+rh*.74,L,.08,trim)}
  }else if(kind==='timber'){   // Kyoto-style townhouse: plastered upper storey with slit windows over wooden lattice
    for(let j=0;j<floors;j++){const y=j*rh;
      if(j===floors-1&&!F.shop){   // ground floor without a shop: wooden lattice (koshi) across the front
        box(0,y+rh*.12,L,rh*.88,shade(st.wood||'#6b5241'));
        for(let x=.08;x<L;x+=.11)box(x,y+rh*.14,.045,rh*.84,shade(st.slat||'#8d6e55'));
        const door=Math.min(1.4,L*.3);box(L*.62,y+rh*.12,door,rh*.88,shade('#3e3330'));
        box(L*.62,y+rh*.12,door,rh*.34,shade(pickOf(st.noren||['#2f4a6b','#7a3b3b','#c9b07a'],F.seed)));
      }else{
        const w=Math.min(L*.7,2.6),x=(L-w)/2;box(x,y+rh*.3,w,rh*.45,shade(st.wood||'#6b5241'));
        for(let k=x+.1;k<x+w-.05;k+=.22)box(k,y+rh*.3,.1,rh*.45,trim);
      }
    }
    for(let i=0;i<=Math.round(L/1.8);i++)box(Math.min(L-.08,i*L/Math.max(1,Math.round(L/1.8))),0,.08,upper,shade(st.wood||'#6b5241'));
  }else if(kind==='plain'||kind==='warehouse'){
    for(let j=0;j<floors;j++)for(let i=0;i<cols;i++)if((i+j+F.seed)%(kind==='warehouse'?3:2)===0)win(bw*i+bw*.3,j*rh+rh*.3,bw*.4,rh*.35,i+j);
  }else if(kind==='striped'){   // Ligurian/Genoese church walls: horizontal bands, a few tall arched windows
    const band=st.band||.62,sc=shade(st.stripe||'#a9a8a2');
    for(let y=band;y<upper;y+=band*2)box(0,y,L,band,sc);
    const n=Math.max(1,Math.round(L/(st.bay||5)));
    for(let i=0;i<n;i++){const w=.9,x=(i+.5)*L/n-w/2,y0=upper*.18,d=Math.min(3.4,upper*.32);
      box(x-.18,y0-.18,w+.36,d+.3,trim);box(x,y0+w/2,w,d-w/2,shade('#5b6266'));poly(Array.from({length:9},(_,k)=>[x+w/2+Math.cos(Math.PI+k*Math.PI/8)*w/2,y0+w/2+Math.sin(Math.PI+k*Math.PI/8)*w/2]).concat([[x+w,y0+w/2],[x,y0+w/2]]),shade('#5b6266'))}
    box(0,0,L,.3,trim);
  }else if(kind==='painted'){   // Ligurian / Italian painted front: lots of wall, narrow windows, louvred shutters, painted frames and quoins
    const sh=st.shutters||['#3f6b4c'],tr=shade(st.trim||mix(F.body||'#f0d48c','#ffffff',.55));
    const open=st.shutterOpen??.55;
    for(let j=0;j<floors;j++){const y=j*rh;
      for(let i=0;i<cols;i++){const w=Math.min(1.05,bw*.3),x=bw*i+(bw-w)/2,y0=y+rh*.2,d=rh*.56;if(bw<1.2)continue;
        box(x-.26,y0-.32,w+.52,d+.5,tr);                      // painted surround
        box(x-.36,y0-.46,w+.72,.16,tr);                       // little cornice over the window
        const c=shade(pickOf(sh,F.seed+i+j)),shut=(x0,ww)=>{box(x0,y0,ww,d,c);for(let k=y0+.12;k<y0+d-.05;k+=.16)box(x0+.05,k,ww-.1,.04,mix(c,'#1f2a22',.35))};
        if(rnd(F.seed+i*7.3+j*3.1)<open){win(x,y0,w,d,i*3+j);shut(x-w*.5-.05,w*.5);shut(x+w+.05,w*.5)}
        else shut(x,w);                                       // closed persiane
        if(j===floors-1&&st.balcony&&(i+F.seed)%2===0){box(x-.3,y0+d+.1,w+.6,.08,dark);for(let k=x-.25;k<x+w+.3;k+=.16)box(k,y0+d-.35,.035,.5,dark)}
      }
    }
    for(const x0 of [0,L-.42])for(let k=0;k<upper;k+=.62)box(x0,k,.42,.36,tr);   // painted quoins at the corners
    box(0,0,L,.34,tr);box(0,.34,L,.06,shade(mix(st.trim||'#f6ead2','#6b5a4a',.35)));          // eaves cornice
    if(!F.shop)box(0,upper-.5,L,.5,shade(mix(F.body||'#e9c27a','#7a6a5a',.18)));             // plinth
  }else{   // house, apartment, brick, stucco, civic, temple, shophouse
    const tall=kind==='civic'||kind==='temple'||kind==='stucco',m=kind==='civic'||kind==='temple'?.28:kind==='shophouse'?.2:.24;
    for(let j=0;j<floors;j++){const y=j*rh;
      if(kind==='stucco'||kind==='civic')box(0,y+rh-.16,L,.16,trim);
      for(let i=0;i<cols;i++){const x=bw*i+bw*m,w=bw*(1-2*m),y0=y+rh*(tall?.16:.22),d=rh*(tall?.66:.52);
        if(bw<.9)continue;
        win(x,y0,w,d,i*3+j);
        if(st.shutters){const c=shade(pickOf(st.shutters,F.seed+i));box(x-w*.36,y0,w*.32,d,c);box(x+w*1.04,y0,w*.32,d,c)}
        if(kind==='stucco'||kind==='civic'){box(x-.12,y0-.22,w+.24,.14,trim);box(x-.1,y0+d+.06,w+.2,.1,trim)}
        else box(x-.08,y0+d+.06,w+.16,.09,trim);
        if(st.balcony&&j<floors-1&&(i+F.seed)%(st.balcony===true?1:2)===0){box(x-.25,y0+d+.18,w+.5,.08,dark);for(let k=x-.2;k<x+w+.25;k+=.18)box(k,y0+d-.3,.035,.5,dark)}
      }
      if(kind==='brick'&&UPX<.5)for(let k=y+.25;k<y+rh;k+=.25)box(0,k,L,.012,shade('rgba(80,50,40,.18)'));
    }
    if(kind==='shophouse'||kind==='civic'||kind==='temple')for(let i=0;i<=cols;i++)box(Math.min(L-.18,i*bw-.09),0,.18,upper,trim);
    if(kind!=='house')box(0,0,L,.22,trim);
  }
  if(F.shop)shopfront(g,F,L,H,shopH,shade,box,poly,SEASON.night?['#ffe7a8','#ffd98a','#fde9b0']:glass);
  g.restore();
}
function shopfront(g,F,L,H,sh,shade,box,poly,glass){
  const st=F.st,y0=H-sh,bays=Math.max(1,Math.round(L/(st.bay||5.5))),bay=L/bays;
  const fascias=st.fascia||(CITY.shops||{}).fascias||['#526e75','#9f6554','#50776e','#a55649','#687aa0','#b77c36'];
  const ink=shade('#4f5f5c'),ivory=shade('#f5e8cc');
  box(0,y0,L,sh,shade(st.shopWall||'#a79180'));
  for(let j=0;j<bays;j++){
    g.save();g.translate(j*bay,y0);
    const fascia=shade(fascias[(F.seed+j)%fascias.length]),entry=j===Math.floor(bays/2);
    box(.12,.62,bay-.24,sh-.62,ink);
    box(.2,.7,bay-.4,sh-.82,glass[(F.seed+j)%glass.length]);
    poly([[.2,.7],[.2+(bay-.4)*.4,.7],[.2+(bay-.4)*.12,sh-.12],[.2,sh-.12]],shade('#e6ece2'));
    if(UPX<.6){   // goods on shelves behind the glass
      const goods=['#be8558','#8eac8f','#c17b6c','#d9bd78','#7f95ad'];
      for(let r=0;r<2;r++){const y=1.25+r*.62;box(.3,y+.36,bay-.6,.06,ivory);
        for(let k=0;k<6;k++)box(.36+k*(bay-.8)/6,y,(bay-.8)/6-.06,.34,shade(goods[(k+r+j+F.seed)%5]))}
    }
    const dw=Math.min(1.2,bay*.3),dx=entry?(bay-dw)/2:bay-dw-.3;
    box(dx,.7,dw,sh-.7,shade('#6f8c8a'));box(dx+.08,.8,dw-.16,sh*.35,shade('#b7cdc4'));
    box(.08,.06,bay-.16,.5,fascia);
    const text=entry||bays===1?F.sign:'';
    if(text&&UPX<.33){g.fillStyle=ivory;g.font='bold '+Math.min(.34,(bay-.4)/Math.max(3,text.length)*1.6).toFixed(2)+'px '+((CITY.shops||{}).font||'sans-serif');g.textAlign='center';g.textBaseline='middle';wallText(g,text,bay/2,.31,bay-.3)}
    g.restore();
  }
}

/* ---------- roofs ---------- */
// which way the ridge runs: along the footprint (long), across it (short), or parallel to the street it faces (street)
function ridgeFrame(b,st){
  const o=b.obb;let ax=o.ax,L=o.L,W=o.W;
  let mode=st.ridge||'long';
  if(mode==='street'){
    let best=null,bl=0;
    for(let i=0;i<b.ring.length;i++){const a=b.ring[i],c=b.ring[(i+1)%b.ring.length],len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len<2)continue;
      const m=[(a[0]+c[0])/2,(a[1]+c[1])/2],u=[(c[0]-a[0])/len,(c[1]-a[1])/len];
      const hit=[3,6].some(d=>[[u[1],-u[0]],[-u[1],u[0]]].some(n=>inRings([m[0]+n[0]*d,m[1]+n[1]*d],SCENE.roads)||inRings([m[0]+n[0]*d,m[1]+n[1]*d],SCENE.walk)));
      if(hit&&len>bl){bl=len;best=u}}
    mode=best&&Math.abs(best[0]*ax[0]+best[1]*ax[1])<.7?'short':'long';
  }
  if(mode==='short'){ax=[-ax[1],ax[0]];[L,W]=[W,L]}
  return {c:o.c,ax,L,W};
}
function pitchedRoof(b,st,wall,rise,kind,col){
  const o=ridgeFrame(b,st),ax=o.ax,nx=[-ax[1],ax[0]],e=st.eaves??.45,L2=o.L/2+e,W2=o.W/2+e,zE=wall-e*rise/(o.W/2+e),zR=wall+rise;
  const C=(s,t,z)=>[o.c[0]+ax[0]*s+nx[0]*t,o.c[1]+ax[1]*s+nx[1]*t,z];
  const planes=[];
  const add=(pts,isWall)=>{let n=vNewell(pts);if(!isWall&&n[2]<0){pts.reverse();n=vNewell(pts)}planes.push({p:pts,n,at:avg(pts),wall:isWall})};
  const ridge=kind==='pyramidal'?0:kind==='hipped'?Math.max(0,L2-W2):L2;
  if(kind==='gabled'){
    add([C(-L2,-W2,zE),C(L2,-W2,zE),C(L2,0,zR),C(-L2,0,zR)]);add([C(L2,W2,zE),C(-L2,W2,zE),C(-L2,0,zR),C(L2,0,zR)]);
    const g1=[C(-o.L/2,-o.W/2,wall),C(-o.L/2,o.W/2,wall),C(-o.L/2,0,zR-.05)],g2=[C(o.L/2,o.W/2,wall),C(o.L/2,-o.W/2,wall),C(o.L/2,0,zR-.05)];
    for(const gp of [g1,g2]){let n=vNewell(gp);const out=dot(n,[ax[0],ax[1],0])*(gp===g1?-1:1);if(out<0){gp.reverse();n=vNewell(gp)}planes.push({p:gp,n,at:avg(gp),wall:true})}
  }else{
    add([C(-L2,-W2,zE),C(L2,-W2,zE),C(ridge,0,zR),C(-ridge,0,zR)]);add([C(L2,W2,zE),C(-L2,W2,zE),C(-ridge,0,zR),C(ridge,0,zR)]);
    add([C(L2,-W2,zE),C(L2,W2,zE),C(ridge,0,zR)]);add([C(-L2,W2,zE),C(-L2,-W2,zE),C(-ridge,0,zR)]);
  }
  const tex=st.roofTex,wallC=pickOf(st.wall,b.id);
  return ()=>{const roofC=SEASON.snow?snowy(col,.82):col;return planes.filter(q=>vis(q.n)).sort((a,b)=>depthOf(a.at)-depthOf(b.at)).map(q=>{
    let s=shape(q.p,tone(q.n,soft(q.wall?wallC:roofC)),.6);
    if(!q.wall&&tex&&!SEASON.snow&&q.p.length===4){const u=norm(sub(q.p[1],q.p[0])),v=norm(sub(q.p[0],q.p[3]));s+=sheetInk(q.p,tex,u,v.map(x=>-x))}
    return s}).join('')+(st.ridgeCap!==false&&kind!=='pyramidal'?edge(C(-ridge,0,zR+.04),C(ridge,0,zR+.04),mix(roofC,'#3a3742',.4),Math.max(.12,(st.ridgeCap||.18))):'')};
}
function flatRoof(b,st,wall,col){
  const r=b.ring,rim=b.cut?0:(st.parapet??.5);
  const fixtures=[];
  if(st.rooftop!=='none'&&b.area>120&&!b.cut){
    const xs=r.map(p=>p[0]),ys=r.map(p=>p[1]);
    for(let x=Math.ceil(Math.min(...xs)/7)*7;x<Math.max(...xs);x+=7)for(let y=Math.ceil(Math.min(...ys)/9)*9;y<Math.max(...ys);y+=9){
      if(rnd(x*3.1+y*9.7+hash(b.id))>.16)continue;const fp=rect(x,y,2.6,1.8);if(!fp.every(p=>inside(p,r)))continue;
      fixtures.push({fp,draw:()=>peak(fp,wall,[x,y,wall+.01],'#c3c8c2')+shape(atZ(fp,wall+.75),'#d7dbd2',.45)+shape(atZ(rect(x,y,1.5,.8),wall+.82),'#9aa5a4',.3)});
    }
  }
  return ()=>{
    const roofC=SEASON.snow?snowy(col,.85):col;let s=shape(atZ(r,wall),roofC,.8);
    if(rim)for(let j=0;j<r.length;j++){const a=r[j],c=r[(j+1)%r.length];if(Math.hypot(c[0]-a[0],c[1]-a[1])<1)continue;
      s+=shape([...atZ([a,c],wall),...atZ([c,a],wall+rim)],mix(pickOf(st.wall,b.id),'#a99d90',.25),.45)+edge([...a,wall+rim],[...c,wall+rim],'#efe6d2',.14)}
    return s+fixtures.sort((p,q)=>depthOf([...p.fp[0],wall])-depthOf([...q.fp[0],wall])).map(x=>x.draw()).join('');
  };
}

/* ---------- helpers for hand-built landmarks (landmarks.js) ---------- */
// a full style object for walls(): the city's defaults with your changes
function makeStyle(o={}){return {facade:'plain',wall:['#eee2ca'],roofColour:['#c8c4b8'],roof:'flat',pitch:30,eaves:.45,levels:3,floor:LEVEL,shop:'none',parapet:.5,...(STYLES.default||{}),shop:'none',eave1:false,...o}}
// a gabled, hipped or pyramidal roof over any rectangle: centre c, ridge axis ax (unit), length L along it, width W
function roofOver({c,ax,L,W},wall,o={}){
  const st=makeStyle(o),b={id:'roof'+c.join(','),ring:[],obb:{c,ax,L,W,fill:1}},kind=o.roof||'gabled';
  const rise=o.rise||(W/2+st.eaves)*Math.tan(st.pitch*Math.PI/180);
  return pitchedRoof(b,{...st,ridge:'long'},wall,rise,kind,pickOf(st.roofColour,b.id));
}
// a flat-roofed block with painted elevations, as one model part: ring, base z, top z, style changes
function block(ring,z0,z1,o={}){const st=makeStyle(o),body=pickOf(st.wall,ring.join());const sides=walls(ring,z0,z1,{st,body});
  return {fp:ring,z1,draw:()=>sides()+shape(atZ(ring,z1),pickOf(o.top||st.flatRoof||st.roofColour,ring.join()),.7)}}

/* ---------- every building: generic block, or a hand-built landmark ---------- */
const REPLACED=new Set();
const LANDMARK_LIST=typeof LANDMARKS==='undefined'?[]:LANDMARKS;
for(const lm of LANDMARK_LIST)for(const id of lm.ids||[])REPLACED.add(id);
const findBuilding=id=>SCENE.buildings.find(b=>b.id===id)||SCENE.buildings.find(b=>b.of===id);   // an outline drawn as its parts: the first part
// the wall below floor level where the ground falls away: brick or stone down to the grass, following the slope
function skirt(ring,zg,col){
  if(!TER)return '';const r=ccw(ring);let s='';
  for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(l<.05)continue;
    const n=[(b[1]-a[1])/l,-(b[0]-a[0])/l,0];if(!vis(n))continue;
    const m=Math.max(1,Math.ceil(l/4)),low=[];let deep=0;
    for(let k=0;k<=m;k++){const x=a[0]+(b[0]-a[0])*k/m,y=a[1]+(b[1]-a[1])*k/m,z=Math.min(0,groundZ(x,y)-zg)-.15;deep=Math.min(deep,z);low.push([x,y,z])}
    if(deep>-.25)continue;
    s+=shape([...low,[b[0],b[1],.02],[a[0],a[1],.02]],tone(n,soft(col)),.5)}
  return s;
}
const baseOf=b=>b&&b.sv?b.sv.zg:b?Math.max(...b.ring.map(p=>groundZ(p[0],p[1]))):0;
const roofTint=c=>{const m=mix(c,'#d8d0bd',.22);return m};
/* measuredRoof: the roof as the lidar saw it. survey.py fits flat facets to the returns over each footprint (a quadtree in the
   building's own axes) and records the steps between roof levels; drawn back to front in plan, which is exact for a surface
   seen from above. Pitches, hips, valleys, penthouses and rooftop plant are all the real ones. */
/* roofOrder: back-to-front order of the pieces of one roof (facets, risers, parapets) for the current view. A roof is a
   surface seen from above, so of two pieces whose plans a line can part, the one on the far side of the line goes first;
   pieces whose plans interlock (a plant room standing in the middle of a flat roof) go lower first. Kept per view angle. */
function roofOrder(R){
  const key=YAW.toFixed(1)+'|'+PITCH.toFixed(1);if(R.orderKey===key)return R.order;
  const P=R.parts,n=P.length,after=P.map(()=>[]),deg=new Array(n).fill(0);
  const sep=(A,B)=>{for(const Q of [A,B])for(let i=0;i<Q.length;i++){const a=Q[i],b=Q[(i+1)%Q.length],l=Math.hypot(b[1]-a[1],a[0]-b[0]);if(l<1e-6)continue;const mx=(b[1]-a[1])/l,my=(a[0]-b[0])/l;
      let a1=-1e9,a0=1e9,b1=-1e9,b0=1e9;for(const q of A){const v=q[0]*mx+q[1]*my;if(v>a1)a1=v;if(v<a0)a0=v}for(const q of B){const v=q[0]*mx+q[1]*my;if(v>b1)b1=v;if(v<b0)b0=v}
      if(a1<=b0+.12)return [mx,my];if(b1<=a0+.12)return [-mx,-my]}return null};
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const A=P[i],B=P[j];
    if(A.bb[2]<B.bb[0]-6||B.bb[2]<A.bb[0]-6||A.bb[3]<B.bb[1]-6||B.bb[3]<A.bb[1]-6){if(A.z1<=B.z0+.01||B.z1<=A.z0+.01)continue}   // far apart and not above one another on screen: no order needed
    const m=sep(A.hull,B.hull);let first;
    if(m)first=vis([m[0],m[1],0])?i:j;else first=A.z0+A.z1<=B.z0+B.z1?i:j;
    const second=first===i?j:i;after[first].push(second);deg[second]++}
  const out=[],queue=[];for(let i=0;i<n;i++)if(!deg[i])queue.push(i);
  while(queue.length){const i=queue.shift();out.push(i);for(const j of after[i])if(!--deg[j])queue.push(j)}
  if(out.length<n){const V=CAM_V;out.length=0;out.push(...P.map((_,i)=>i).sort((i,j)=>(P[i].c[0]*V[0]+P[i].c[1]*V[1])-(P[j].c[0]*V[0]+P[j].c[1]*V[1])))}   // interlocked: fall back to depth
  R.order=out;R.orderKey=key;return out;
}
/* measuredRoof2: the roof as survey/roofs.py read it from the lidar: a few planes (each a polygon, with holes where
   something stands on it), the risers between levels, and parapets on the walls that have them. */
function measuredRoof2(b,st,col,wallC){
  const sv=b.sv,parts=[],ring=b.ring,area=ring.reduce((s,p,i)=>{const q=ring[(i+1)%ring.length];return s+p[0]*q[1]-q[0]*p[1]},0);
  const mk=(o,fp)=>{const xs=fp.map(q=>q[0]),ys=fp.map(q=>q[1]);o.hull=hull(fp);o.bb=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];o.c=[(o.bb[0]+o.bb[2])/2,(o.bb[1]+o.bb[3])/2];parts.push(o)};
  for(const rings of sv.facets){const p=rings[0];let n=vNewell(p);if(!n)continue;if(n[2]<0)n=n.map(v=>-v);const zs=p.map(q=>q[2]);
    mk({k:'f',rings,n,ns:norm([n[0]*.6,n[1]*.6,n[2]]),z0:Math.min(...zs),z1:Math.max(...zs),level:Math.hypot(n[0],n[1])<.05},p.map(q=>[q[0],q[1]]))}
  for(const q of sv.risers){const n=[q[8],q[9],0],e=.06;
    mk({k:'r',p:[[q[0],q[1],q[4]],[q[2],q[3],q[5]],[q[2],q[3],q[7]],[q[0],q[1],q[6]]],n,z0:Math.min(q[4],q[5]),z1:Math.max(q[6],q[7]),big:Math.max(q[6]-q[4],q[7]-q[5])},[[q[0],q[1]],[q[2],q[3]],[q[2]+n[0]*e,q[3]+n[1]*e],[q[0]+n[0]*e,q[1]+n[1]*e]])}
  // parapets: the strip of wall that stands above the roof on edges where the lidar shows one
  const rim=[];
  for(let i=0;i<ring.length;i++){const wl=sv.walls[i];if(!wl||!wl.r||!wl.p||wl.p.length<2)continue;const a=ring[i],c=ring[(i+1)%ring.length],l=Math.hypot(c[0]-a[0],c[1]-a[1]);if(l<.6)continue;
    const u=[(c[0]-a[0])/l,(c[1]-a[1])/l],n=[u[1]*Math.sign(area),-u[0]*Math.sign(area),0],mm=wl.p.length-1,at=k=>[a[0]+(c[0]-a[0])*k/mm,a[1]+(c[1]-a[1])*k/mm];
    const low=wl.p.map((z,k)=>[...at(k),z]),high=wl.p.map((z,k)=>[...at(k),z+wl.r]).reverse();rim.push({p:low.concat(high),n,top:high})}
  const R={parts};
  return ()=>{
    const roofC=SEASON.snow?snowy(col,.85):col,m=soft(roofC),w=soft(mix(wallC,'#a99d90',.2)),wi=soft(mix(wallC,'#6f675f',.3)),far=UPX>.45,ink=UPX<.5?.4:0;
    let s='';
    for(const q of rim)if(!vis(q.n))s+=shape(q.p,tone([-q.n[0],-q.n[1],0],wi),.35);            // far parapets show their inner face
    for(const i of roofOrder(R)){const q=parts[i];
      if(q.k==='f'){if(!vis(q.n))continue;const d=q.rings.map(r=>pd(r)).join(''),c=tone(q.ns,m);
        s+=ink&&!q.tiny?'<path d="'+d+'" fill="'+c+'" fill-rule="evenodd" stroke="'+mix(c,'#4b4253',.42)+'" stroke-width="'+ink+'" stroke-linejoin="round"/>':'<path d="'+d+'" fill="'+c+'" fill-rule="evenodd" stroke="'+c+'" stroke-width=".5"/>'}
      else{if(!vis(q.n)||(far&&q.big<1))continue;s+=shape(q.p,tone(q.n,w),q.big>1?.45:.3)}}
    for(const q of rim)if(vis(q.n))s+=shape(q.p,tone(q.n,soft(wallC)),.45);                     // near parapets stand in front of the roof
    if(UPX<1.4){const cop=st.coping||'#efe6d2';
      for(const q of rim)s+='<path d="'+pd(q.top.map(v=>[v[0],v[1],v[2]+.03]),false)+'" fill="none" stroke="'+cop+'" style="stroke-width:'+f(.18)+'"/>';
      for(let i=0;i<ring.length;i++){const wl=sv.walls[i];if(!wl||wl.r||!wl.p||wl.p.length<2)continue;const a=ring[i],c=ring[(i+1)%ring.length],mm=wl.p.length-1;
        s+='<path d="'+pd(wl.p.map((z,k)=>[a[0]+(c[0]-a[0])*k/mm,a[1]+(c[1]-a[1])*k/mm,z+.03]),false)+'" fill="none" stroke="'+cop+'" style="stroke-width:'+f(.12)+'"/>'}}
    return s;
  };
}
function measuredRoof(b,st,col,wallC){
  if(b.sv.v===2)return measuredRoof2(b,st,col,wallC);
  const sv=b.sv,ax=b.obb.ax,nx=[-ax[1],ax[0]],sides=[[-ax[0],-ax[1],0],[ax[0],ax[1],0],[-nx[0],-nx[1],0],[nx[0],nx[1],0]];
  const facets=sv.facets.map(p=>{let n=vNewell(p);if(n[2]<0)n=n.map(v=>-v);n=norm([n[0]*.6,n[1]*.6,n[2]]);const c=avg(p);return {p,n,c}});
  const risers=sv.risers.map(q=>({p:[[q[0],q[1],q[4]],[q[2],q[3],q[5]],[q[2],q[3],q[7]],[q[0],q[1],q[6]]],n:sides[q[8]],c:[(q[0]+q[2])/2+sides[q[8]][0]*.3,(q[1]+q[3])/2+sides[q[8]][1]*.3,0],big:Math.max(q[6]-q[4],q[7]-q[5])}));
  return ()=>{
    const roofC=SEASON.snow?snowy(col,.85):col,m=soft(roofC),w=soft(mix(wallC,'#a99d90',.2)),V=CAM_V,key=c=>c[0]*V[0]+c[1]*V[1];
    const far=UPX>.45,list=[];
    for(const f of facets)list.push({k:key(f.c),s:'<path d="'+pd(f.p)+'" fill="'+tone(f.n,m)+'" stroke="'+tone(f.n,m)+'" stroke-width=".5"/>'});
    for(const r of risers){if(!vis(r.n)||(far&&r.big<1.2))continue;list.push({k:key(r.c),s:shape(r.p,tone(r.n,w),r.big>1?.45:.25)})}
    list.sort((a,b)=>a.k-b.k);let s='';for(const q of list)s+=q.s;
    // coping along the wall tops
    if(UPX<1.4){const r=b.ring;for(let i=0;i<r.length;i++){const wl=sv.walls[i];if(!wl||!wl.p||wl.p.length<2)continue;const a=r[i],c=r[(i+1)%r.length],mm=wl.p.length-1;
      s+='<path d="'+pd(wl.p.map((z,k)=>[a[0]+(c[0]-a[0])*k/mm,a[1]+(c[1]-a[1])*k/mm,Math.max(wl.h,z)+.03]),false)+'" fill="none" stroke="'+(st.coping||'#efe6d2')+'" style="stroke-width:'+f(.16)+'"/>'}}
    return s;
  };
}
function buildingModel(b){
  const st=styleFor(b),z0=b.min||0;BUILD_LIFT=baseOf(b);
  const body0=pickOf(st.wall,b.id);
  if(b.sv&&b.sv.measured&&st.measured!==false){
    const sv=b.sv,hs=sv.walls.map(w=>st.height||w.h),prof=st.height?null:sv.walls.map(w=>w.p);
    b.top=sv.top;b.wall=sv.med;b.style=st;
    const shell=walls(b.ring,z0,sv.med,{st,b,body:body0,hs,prof});
    const col=st.roofFrom==='style'||!sv.rc?pickOf(st.flatRoof||st.roofColour,b.id+'r'):roofTint(sv.rc);
    const roof=measuredRoof(b,st,col,body0),base=st.base||mix(body0,'#8d8478',.28);
    return Object.assign(obj(b.ring,sv.top+.4,()=>skirt(b.ring,BUILD_LIFT_OF(b),base)+shell()+roof()+rooftopExtras(b,st)),{g:baseOf(b)});
  }
  const kind=roofKind(b,st),{wall,top,rise}=heightsOf(b,st);
  const body=pickOf(st.wall,b.id),roofCol=kind==='flat'&&st.roof!=='flat'&&st.roof!=='auto'?pickOf(st.flatRoof||'#c9c4ba',b.id+'r'):pickOf(kind==='flat'&&st.flatRoof?st.flatRoof:st.roofColour,b.id+'r');
  b.top=top;b.wall=wall;b.style=st;
  const shell=walls(b.ring,z0,wall,{st,b,body});
  const roof=kind==='flat'?flatRoof(b,st,wall,roofCol):pitchedRoof(b,st,wall,rise,kind,roofCol);
  return Object.assign(obj(b.ring,top+.3,()=>skirt(b.ring,baseOf(b),st.base||mix(body,'#8d8478',.28))+shell()+roof()),{g:baseOf(b)});
}
const BUILD_LIFT_OF=baseOf;
function rooftopExtras(b,st){return ''}
for(const b of SCENE.buildings){
  if(REPLACED.has(b.id)||REPLACED.has(b.of))continue;
  models.push(buildingModel(b));
}
for(const lm of LANDMARK_LIST){try{const lb=findBuilding((lm.ids||[])[0]),g=lm.g??baseOf(lb);BUILD_LIFT=g;const out=lm.build();
  for(const m of [].concat(out))if(m){m.g=m.g??g;if(lb&&lm.skirt!==false){const d0=m.draw,gg=m.g,base=lm.base||'#b9b09a';m.draw=()=>skirt(lb.ring,gg,base)+d0()}models.push(m)}}catch(e){console.error('landmark',lm.name,e)}}
BUILD_LIFT=0;

/* ccw(ring): the same outline running counter-clockwise. OSM outlines run either way; faces you build yourself from a ring
   ([a, b, b-up, a-up] for each edge a→b) face outward only on a counter-clockwise ring, so always pass rings through ccw. */
function ccw(r){const a=r.reduce((s,p,i)=>{const q=r[(i+1)%r.length];return s+p[0]*q[1]-q[0]*p[1]},0);return a<0?r.slice().reverse():r}
/* lightPool(x, y, r, colour, strength): light on the ground from a lamp, a fire or a tree, fading softly to its edge
   (stacked thin rings, brightest at the centre). Use a light colour (see LIT) so night does not dim it. */
function lightPool(x,y,r,col='#ffcf7a',a=.5,z=.03){let s='';const n=9;
  for(let k=n;k>=1;k--){const rr=r*k/n;s+='<g opacity="'+(a/n*1.6).toFixed(3)+'">'+shape(atZ(polygon(x,y,rr,Math.max(10,Math.round(rr*4))),z+.001*(n-k)),col,0)+'</g>'}
  return s}

/* standable(x, y): a person or a prop can stand here: inside the plot, not on water, not inside a building, and at least
   `gap` metres from the water's edge (the quay). Use it for any crowd or object a landmarks.js places by hand. */
function standable(x,y,gap=1){
  if(Math.abs(x)>HALF-.6||Math.abs(y)>HALF-.6)return false;
  const inRs=rs=>inside([x,y],rs[0])&&!rs.slice(1).some(h=>inside([x,y],h));
  for(const w of SCENE.water||[]){if(inRs(w))return false;
    if(gap>0)for(const r of w)for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length],dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy||1,
      t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/l));if(Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t)<gap)return false}}
  return !SCENE.buildings.some(b=>inside([x,y],b.ring));
}

/* ---------- planOrder: back-to-front order for parts that touch (a tower against a nave, wings of one building) ----------
   planSort compares footprints and can guess wrong when volumes touch or differ a lot in size. Here every pair whose
   footprints can be split by a line (allowing tol metres of overlap, e.g. eaves) is ordered by the side of that line
   the reader is on; pairs that overlap in plan go lower-first. Parts: {fp, z1, svg}. Use it for any landmark made of
   several volumes. */
function planOrder(parts,tol=.35){
  const n=parts.length,H=parts.map(p=>hull(p.fp.map(q=>[q[0],q[1]]))),after=parts.map(()=>new Set()),deg=new Array(n).fill(0);
  const sep=(A,B)=>{for(const P of [A,B])for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length],m=norm([b[1]-a[1],a[0]-b[0],0]);
      const pa=A.map(q=>q[0]*m[0]+q[1]*m[1]),pb=B.map(q=>q[0]*m[0]+q[1]*m[1]);
      if(Math.max(...pa)<=Math.min(...pb)+tol)return m;if(Math.max(...pb)<=Math.min(...pa)+tol)return m.map(v=>-v)}return null};
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const m=sep(H[i],H[j]);let first;
    if(m)first=vis([m[0],m[1],0])?i:j;           // m points from i toward j: a reader on j's side sees j in front
    else first=(parts[i].z0||0)+parts[i].z1<=(parts[j].z0||0)+parts[j].z1?i:j;
    const second=first===i?j:i;if(!after[first].has(second)){after[first].add(second);deg[second]++}}
  const out=[],queue=[];for(let i=0;i<n;i++)if(!deg[i])queue.push(i);
  while(queue.length){const i=queue.shift();out.push(i);for(const j of after[i])if(!--deg[j])queue.push(j)}
  if(out.length<n)return planSort(parts);        // a cycle (interlocking shapes): fall back
  return out.map(i=>parts[i].svg).join('');
}

/* ---------- trees ---------- */
const TREE_RULES=(CITY.trees||{}).rules||[],TREE_DEFAULT={style:3,colours:['#90ad81','#acbf8c'],height:8,...((CITY.trees||{}).default||{})};
const treeRule=sp=>TREE_RULES.find(r=>new RegExp(r.match,'i').test(sp))||TREE_DEFAULT;
const TREE_SOURCE=SCENE.trees.concat(((CITY.trees||{}).extra||[]).map(([x,y,h,sp])=>[x,y,-2,String(h||''),sp]));
// many trees (a wood): each one gets fewer, larger leaves, since crowns overlap and the detail never shows; this keeps turning smooth
const CITY_LOD=Math.max(.13,TREE_LOD*Math.min(1,220/Math.max(1,TREE_SOURCE.length)));
const TREES=TREE_SOURCE.map(function([x,y,s,hs,extraSp],i){
  const species=extraSp||SCENE.species[s]||'',base={...TREE_DEFAULT,...treeRule(species)};
  // a rule may hold a mix (woods: holm oak, pine, cypress): each tree picks one by its position, weighted by share
  let rule=base;if(base.mix){const tot=base.mix.reduce((a,m)=>a+(m.share||1),0);let r=rnd(x*.37+y*1.71)*tot;rule={...base,...(base.mix.find(m=>(r-=(m.share||1))<0)||base.mix[0])}}
  const h=(+hs||rule.height||8)*(rule.vary?1-rule.vary/2+rule.vary*rnd(x*1.3+y*.7):1);
  const style=rule.style||3,cols=rule.colours||TREE_DEFAULT.colours,m=soft(cols[i%cols.length]);
  const z0=groundZ(x,y),geo=makeTree(style,{x,y,z0,H:h,seed:i+1,m,lod:CITY_LOD});
  // a measured crown radius (survey.py) widens or narrows the drawn crown about its trunk
  const crownR=+arguments[0][5]||0,kw=crownR?Math.max(.55,Math.min(1.5,crownR*1.3/geo.ext)):1;
  if(kw!==1){const seen=new Set(),sc=p=>{if(seen.has(p))return;seen.add(p);p[0]=x+(p[0]-x)*kw;p[1]=y+(p[1]-y)*kw};
    for(const sg of geo.segs.concat(geo.twigs)){sc(sg[0]);sc(sg[1])}for(const lf of geo.leaves){sc(lf.c);for(const p of lf.pts)sc(p)}geo.ext*=kw}
  // limbs: the same tree without its twigs. A tree in leaf is drawn from this, so no twig can poke out of its crown (twigs belong to bare trees)
  return {x,y,i,h,base:z0,kw,style,m,geo,limbs:{...geo,twigs:[]},ext:geo.ext,zTop:geo.zTop,rule,species};
});
const LOOK=new Map();
function treeLook(tr){
  let o=LOOK.get(tr);if(o)return o;
  const L=SEASON.leaves||'summer',r=tr.rule;
  o=r.evergreen?{}:L==='bare'?{keep:r.winter?.4:0,m:r.winter?soft(r.winter):undefined}
    :L==='spring'?{keep:.82,m:soft(r.spring||'#c4e481'),m2:soft('#a3d873'),share:.4}
    :L==='blossom'?(r.blossom?{keep:.96,m:soft(r.blossom),m2:soft(mix(r.blossom,'#ffffff',.4)),share:.45}:{keep:.85,m:soft(r.spring||'#c4e481')})
    :L==='autumn'?{keep:.86,m:soft(r.autumn||'#dba646'),m2:soft(mix(r.autumn||'#dba646','#c25a3c',.45)),share:.35}
    :{};
  const lit=SEASON.night&&SEASON.decor&&SEASON.decor.litTrees&&new RegExp(SEASON.decor.litTrees,'i').test(tr.species);   // light-up: these trees stay bright
  o={keep:1,...o};if(SEASON.night&&!lit){o.m=softNight(o.m||tr.m);if(o.m2)o.m2=softNight(o.m2)}LOOK.set(tr,o);return o;
}

/* ---------- people and vehicles ---------- */
const PEOPLE=CITY.people||{};
const SKINS=(PEOPLE.skin||['#f0c5a1','#dcaa82','#c48d65','#a87154','#f6d2b4']).map(soft);
const CLOTHES=PEOPLE.clothes||['#d68070','#538e91','#e2ad59','#7994b4','#b991a3','#efe3cd','#5f9e7f'];
const PANTS=PEOPLE.pants||['#515c70','#3f4a6e','#5a5560','#7a6a58','#2f3a52'],HAIR=PEOPLE.hair||['#2b211c','#3d2c1f','#1f1b22','#5a3a26','#8a6a4a'];
const pk=(list,r)=>list[Math.floor(r*list.length)%list.length];
function pedDressed(k){
  const o={skin:pk(SKINS,rnd(k*5.1)),shirt:pk(CLOTHES,rnd(k*6.3)),pants:pk(PANTS,rnd(k*7.9)),hair:pk(HAIR,rnd(k*8.7)),tall:.96+.1*rnd(k+2)};
  const oc=SEASON.dress;
  if(oc&&rnd(k*3.3+.7)<(oc.share??.6))o.shirt=pk(oc.colours,rnd(k*4.1));
  else if(SEASON.coats)winterWear(o,k);
  if(SEASON.umbrellas&&rnd(k+14)<.78)o.umb=soft(pk(PEOPLE.umbrellas||CLOTHES,rnd(k*2.3)));
  return o;
}
function bikeLook(k){const o={k,shirt:pk(CLOTHES,rnd(k*3.7)),frame:pk(PEOPLE.bikes||['#387779','#ba7663','#629684','#4b4b55'],rnd(k*1.9))};return SEASON.coats?winterWear(o,k):o}
const VEH=CITY.vehicles||{};
const VKINDS=(VEH.kinds||['sedan','hatch','suv','small','mpv']).map(kind=>makeCar(kind,{plate:VEH.plate||'#f2f2ee',frontPlate:VEH.frontPlate||VEH.plate||'#f2f2ee'}));
const TAXI=VEH.taxi?makeCar(VEH.taxi.kind||'sedan',{plate:VEH.plate||'#f2f2ee',sign:VEH.taxi.sign||'#fbefd5'}):null;
const isTaxi=k=>TAXI&&rnd(k*5.1)<(VEH.taxi.share||.2);
const carModel=k=>isTaxi(k)?TAXI:VKINDS[k%VKINDS.length];
const carProps=k=>({mesh:carModel(k),m:soft(isTaxi(k)?pk(VEH.taxi.colours||['#f2c230'],rnd(k*6.1)):pk(VEH.colours||['#d48a79','#eff0da','#90b7ab','#a5afcb','#4b4b55','#f2f2ee'],rnd(k*2.7)))});

/* ---------- seasons, weather and special occasions ---------- */
const SEASONS=(CITY.seasons||[{id:'summer',label:'Summer'}]).concat((CITY.occasions||[]).map(o=>({...o,special:true})));
let SEASON={},TRAFFIC=null,DECOR=null,GROUND,ROAD,PAVE,WALK,GRASS,WATER;
function setGroundColours(){
  const wet=c=>mix(c,'#6f7390',.14),sn=!!SEASON.snow;
  GROUND=sn?snowy(PAL.ground,.9):SEASON.wet?wet(PAL.ground):PAL.ground;
  PAVE=sn?snowy(PAL.pavement,.7):SEASON.wet?wet(PAL.pavement):PAL.pavement;
  WALK=sn?snowy(PAL.walk,.7):SEASON.wet?wet(PAL.walk):PAL.walk;
  ROAD=sn?snowy(PAL.road,.3):SEASON.wet?mix(PAL.road,'#7d82a8',.2):PAL.road;
  GRASS=sn?snowy(PAL.grass,.88):SEASON.grass||(SEASON.leaves==='bare'?mix(PAL.grass,'#c9bf98',.35):PAL.grass);   // "grass": "#hex" on a season overrides it (a Mediterranean winter is green)
  WATER=SEASON.ice?'#dfe9ec':PAL.water;
}
const FEEDS=SCENE.routes.map((r,i)=>({kind:r.kind,paths:[measuredLane({...r,junctions:[]})],interval:(r.kind==='car'?5.5:r.kind==='bike'?5.5:8)*(PHONE?1.4:1)}));
function setSeason(id){
  const st=SEASONS.find(s=>s.id===id)||SEASONS[0];
  SEASON={...st};SEASON_ID=st.id;LOOK.clear();DECOR=null;setGroundColours();
  const c=SEASON.crowd??1;
  const flow=FEEDS.filter(f=>SEASON.traffic!==false||f.kind==='ped').map((f,i)=>({...f,walkSpeed:1.05+.05*(i%3),interval:f.interval/(f.kind==='ped'?c:Math.max(.4,Math.min(1.4,c)))}));
  TRAFFIC=streetSimulation(flow,Math.round(PHONE?120:210),220);
}
setSeason(SEASON_Q||SEASONS[0].id);

/* ---------- night (a season or occasion with night: true) ----------
   Every colour the painter fills is turned to dusk; the warm light colours below stay as they are, so windows,
   shopfronts, lamps and fairy lights read as lit. No glow: lights are flat bright marks, like the rest of the style. */
const LIT=new Set(['#ffe6ec','#fbd3dd','#ffd98a','#ffe7a8','#fff3c4','#fbefc8','#f6c445','#ffb85c','#fff8e0','#f2c94c','#fde9b0','#ffcf7a','#ff8a3d','#f26a2e','#ffc069']);
const NIGHTC=new Map();
function nightCol(c){
  if(!SEASON.night||typeof c!=='string'||c[0]!=='#'||LIT.has(c))return c;
  let o=NIGHTC.get(c);if(o)return o;
  let h=c.slice(1);if(h.length===3||h.length===4)h=h.slice(0,3).split('').map(x=>x+x).join('');if(h.length<6)return c;
  const n=parseInt(h.slice(0,6),16),r=n>>16,g=n>>8&255,b=n&255,K=SEASON.night===true?1:+SEASON.night;
  const R=Math.round(r*(1-.5*K)+12*K),G=Math.round(g*(1-.52*K)+16*K),B=Math.round(b*(1-.4*K)+40*K);   // dusk: keep each colour's hue, sink it toward blue
  o='#'+((1<<24)+(Math.min(255,R)<<16)+(Math.min(255,G)<<8)+Math.min(255,B)).toString(16).slice(1);NIGHTC.set(c,o);return o;
}
const softNight=m=>SEASON.night&&m?{l:nightCol(m.l),m:nightCol(m.m),d:nightCol(m.d)}:m;
if(typeof compileInk==='function'){const inkOps=compileInk;compileInk=function(markup){const ops=inkOps(markup);
  if(SEASON.night)for(const op of ops){if(op.fill)op.fill=nightCol(op.fill);if(op.stroke)op.stroke=nightCol(op.stroke)}return ops}}

/* ---------- street furniture ---------- */
const streetFurniture=[];
const LAMP=CITY.lamp||{};
const LAMP_AT=[];   // lamp positions: at night their light pools are painted with the ground, so no part box clips them
function lamp(x,y){
  LAMP_AT.push([x,y]);
  const col=LAMP.colour||'#5d6b66',hgt=LAMP.height||5.2,head=LAMP.head||'#f3e7c4';
  streetFurniture.push(obj(rect(x,y,.5,.5),hgt+.5,()=>stick([x,y,0],[x,y,hgt],.07,col)+ball([x,y,hgt+.15],.24,SEASON.night?{l:'#fff3c4',m:'#fff3c4',d:'#ffd98a'}:soft(head),.4)+stick([x,y,hgt+.32],[x,y,hgt+.42],.1,col)));
}
for(const fu of SCENE.furniture||[]){
  if(fu.k==='lamp')lamp(fu.x,fu.y);
  else if(fu.k==='cafe'){const C=CITY.cafes||{},col=pickOf(C.umbrellas||['#f3efe4','#2f5f8a','#b8483b','#e8c36a'],'u'+fu.i),x=fu.x,y=fu.y,r=1.15;
    streetFurniture.push(Object.assign(obj(rect(x,y,2.3,2.3),2.6,()=>{let g=shape(atZ(polygon(x,y,.36,8),.74),C.table||'#f1ece0',.35)+stick([x,y,0],[x,y,.74],.04,'#6b6660');
      for(const a of [0,Math.PI])g+=shape(atZ(rect(x+Math.cos(a)*.62,y+Math.sin(a)*.62,.36,.36),.45),C.chair||'#8a6f55',.3);
      // "cafes":"closed" on a season folds the umbrellas (rain, off-hours); "cafes":false puts the tables away (see scene)
      const shut=SEASON.cafes==='closed',rr=shut?.2:r;
      g+=stick([x,y,.74],[x,y,2.25],.035,'#d8d2c6');const rim=polygon(x,y,rr,8,.39).map(p=>[...p,shut?1.2:1.95]),apex=[x,y,shut?2.3:2.45];
      for(let i=0;i<8;i++){const a=rim[i],b=rim[(i+1)%8],n=norm(cross(sub(b,a),sub(apex,a)));if(vis(n))g+=shape([a,b,apex],tone(n,soft(i%2&&C.stripes!==false?mix(col,'#ffffff',.55):col)),.35)}
      return g}),{kind:'cafe'}))}
  else if(fu.k==='bench'){const fp=rect(fu.x,fu.y,1.6,.6);streetFurniture.push(obj(fp,.9,()=>shape(atZ(fp,.45),'#a98a68',.45)+shape([[fu.x-.8,fu.y+.28,.48],[fu.x+.8,fu.y+.28,.48],[fu.x+.8,fu.y+.3,.9],[fu.x-.8,fu.y+.3,.9]],'#b39470',.4)))}
  else if(fu.k==='vending'){const fp=rect(fu.x,fu.y,1,.8);streetFurniture.push(obj(fp,1.9,()=>walls(fp,0,1.85,{st:{facade:'plain',floor:2,shop:'none'},body:'#d9dde0'})()+shape(atZ(fp,1.85),'#c9cdd0',.4)))}
  else if(fu.k==='bus_stop'&&fu.shelter){
    let best=null,bd=1e9;for(const r of SCENE.routes)if(r.kind==='car')for(let i=1;i<r.p.length;i++){const a=r.p[i-1],c=r.p[i],dx=c[0]-a[0],dy=c[1]-a[1],t=Math.max(0,Math.min(1,((fu.x-a[0])*dx+(fu.y-a[1])*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(a[0]+dx*t-fu.x,a[1]+dy*t-fu.y);if(d<bd){bd=d;best=[dx,dy]}}
    if(!best)continue;const l=Math.hypot(...best),u=[best[0]/l,best[1]/l],n=[-u[1],u[0]];
    const at=(s,d)=>[fu.x+u[0]*s+n[0]*d,fu.y+u[1]*s+n[1]*d],q=(s0,s1,d0,d1)=>[at(s0,d0),at(s1,d0),at(s1,d1),at(s0,d1)];
    const roofFp=q(-3,3,-.9,.9);
    streetFurniture.push(obj(roofFp,2.9,()=>[-2.6,2.6].map(s=>stick([...at(s,.7),0],[...at(s,.7),2.7],.06,'#6b7275')).join('')+shape(atZ(q(-2.2,2.2,.3,.7),.46),'#9aa1a3',.35)+shape(atZ(roofFp,2.75),'#5e6568',.45)));
  }
}
/* ---------- mapped monuments, and the small furniture of a shopping street ---------- */
const BRONZE='#6b6a52',LIMESTONE='#d9d3bf';
// a small standing or seated figure in one metal colour (a statue, never a likeness)
function statueFigure(x,y,z,h,dir=[0,-1],seated=false,col=BRONZE){
  const n=[-dir[1],dir[0]],at=(f,sd,zz)=>[x+dir[0]*f+n[0]*sd,y+dir[1]*f+n[1]*sd,z+zz*h],m=soft(col);let s='';
  if(seated){for(const sd of [-.1,.1])s+=stick(at(0,sd,.3),at(.26,sd,.3),.07*h,col)+stick(at(.26,sd,.3),at(.28,sd,0),.065*h,col);s+=stick(at(-.02,0,.3),at(-.05,0,.68),.15*h,col)+stick(at(-.05,-.17,.62),at(.16,-.12,.42),.05*h,col)+stick(at(-.05,.17,.62),at(.14,.12,.4),.05*h,col)+ball(at(-.03,0,.8),.12*h,m,.2)+shape([at(-.2,-.17,.86),at(.16,-.17,.86),at(.16,.17,.86),at(-.2,.17,.86)],col,.2)+stick(at(-.03,0,.86),at(-.03,0,.93),.1*h,col)}
  else{for(const sd of [-.08,.08])s+=stick(at(sd>0?.1:-.06,sd,0),at(0,sd,.48),.065*h,col);s+=stick(at(0,0,.48),at(.02,0,.82),.13*h,col)+stick(at(.02,-.15,.78),at(.1,-.17,.5),.045*h,col)+stick(at(.02,.15,.78),at(-.06,.17,.52),.045*h,col)+ball(at(.03,0,.93),.1*h,m,.2)}
  return s;
}
const blockAt=(x,y,w,d,z0,z1,col)=>block(ccw(rect(x,y,w,d)),z0,z1,{facade:'plain',arch:'blank',wall:col,top:col,shop:'none'}).draw();
for(const fu of SCENE.furniture||[]){
  if(fu.k!=='monument')continue;const x=fu.x,y=fu.y,nm=(fu.name||'').toLowerCase();
  if(nm.includes('faulkner'))streetFurniture.push(obj(rect(x,y,1.4,2.4),1.9,()=>{   // the seated bronze on its bench outside City Hall, facing the Square
    let g=shape(atZ(rect(x,y,.55,2.1),.46),'#5d5a48',.4)+shape([[x+.27,y-1.05,.46],[x+.27,y+1.05,.46],[x+.3,y+1.05,1],[x+.3,y-1.05,1]],'#5d5a48',.35);
    for(const dy of [-.95,.95])g+=stick([x-.2,y+dy,0],[x-.2,y+dy,.46],.04,'#4d4b3c')+stick([x+.26,y+dy,0],[x+.26,y+dy,1],.04,'#4d4b3c');
    return g+statueFigure(x,y-.3,.16,1.55,[-1,0],true)}));
  else if(nm.includes('meredith'))streetFurniture.push(obj(rect(x,y,6.5,6),6.2,()=>{   // a limestone portal and a bronze figure walking toward it
    let g='';for(const dx of [-1.9,1.9]){g+=blockAt(x+dx,y,1.1,1.1,0,5,LIMESTONE)}g+=blockAt(x,y,5.6,1.3,5,5.9,LIMESTONE)+blockAt(x,y,6,1.5,5.9,6.1,'#cfc8b3');
    for(const dx of [-1.9,1.9])for(const zz of [.5,4.6])g+=blockAt(x+dx,y,1.25,1.25,zz,zz+.14,'#cfc8b3');
    g+=shape(atZ(ccw(rect(x,y-2.6,3,2.2)),.05),'#b9b2a0',.3);
    return g+statueFigure(x,y-2.7,.05,1.95,[0,1],false)}));
  else streetFurniture.push(obj(rect(x,y,2,2),4,()=>blockAt(x,y,1.8,1.8,0,.5,LIMESTONE)+blockAt(x,y,1.1,1.1,.5,2.2,LIMESTONE)+statueFigure(x,y,2.2,1.8)));
}
for(const mo of (CITY.life||{}).monuments||[]){const [x,y,h=8.5]=mo;   // a stone shaft on a stepped base with a figure on top
  streetFurniture.push(obj(rect(x,y,3.2,3.2),h+2,()=>{let g='';for(let i=0;i<3;i++)g+=blockAt(x,y,3.2-i*.6,3.2-i*.6,i*.3,(i+1)*.3,'#dedbd0');
    g+=blockAt(x,y,1.5,1.5,.9,2.9,'#eceae2')+blockAt(x,y,1.75,1.75,2.9,3.1,'#dedbd0')+blockAt(x,y,.9,.9,3.1,h,'#eceae2')+blockAt(x,y,1.15,1.15,h,h+.2,'#dedbd0');
    return g+statueFigure(x,y,h+.2,1.8,[0,-1],false,'#eceae2')}));
}
// planters, benches and litter bins along the shopfronts (illustrative positions on mapped pavement)
if((CITY.life||{}).furniture!==false){let n=0;const pave=SCENE.paths.concat(SCENE.walk),FLOWERS=['#c8574f','#e2b24c','#d7d0e4','#d98ba0'];
  for(const F of facades.slice()){if(!F.shop||F.cut||F.len<6)continue;
    for(let sdist=2.6+(F.seed%3);sdist<F.len-1.6;sdist+=7.2){
      const x=F.start[0]+F.along[0]*sdist+F.n[0]*2.9,y=F.start[1]+F.along[1]*sdist+F.n[1]*2.9;
      if(!inRings([x,y],pave)||!standable(x,y,.3)||n>(PHONE?60:170))continue;const k=(F.seed+n++)%5,u=F.along,nn=F.n;
      if(k<2)streetFurniture.push(obj(rect(x,y,1.1,1.1),1.5,()=>{let g=blockAt(x,y,.95,.95,0,.55,'#8f8a7b');const bare=SEASON.leaves==='bare';
        g+=ball([x,y,.9],.46,soft(bare?'#8d9070':'#6f9467'),.3);if(!bare&&!SEASON.snow)for(let i=0;i<5;i++){const a=i*1.257+n;g+=ball([x+Math.cos(a)*.3,y+Math.sin(a)*.3,.78+.12*(i%2)],.1,soft(FLOWERS[(k+i+n)%4]),.12)}return g}));
      else if(k<4)streetFurniture.push(obj(rect(x,y,1.8,1.8),1,()=>{const P2=(a,b,zz)=>[x+u[0]*a+nn[0]*b,y+u[1]*a+nn[1]*b,zz];
        let g=shape([P2(-.8,-.25,.46),P2(.8,-.25,.46),P2(.8,.25,.46),P2(-.8,.25,.46)],'#7b5f47',.4)+shape([P2(-.8,-.27,.5),P2(.8,-.27,.5),P2(.8,-.3,.95),P2(-.8,-.3,.95)],'#86694f',.35);
        for(const a of [-.7,.7])g+=stick(P2(a,-.22,0),P2(a,-.22,.46),.035,'#3d4640')+stick(P2(a,.22,0),P2(a,.22,.46),.035,'#3d4640');return g}));
      else streetFurniture.push(obj(rect(x,y,.7,.7),1.1,()=>stick([x,y,0],[x,y,.95],.27,'#4a5a52')+stick([x,y,.95],[x,y,1.02],.3,'#39463f')));
    }}
}
if(!(SCENE.furniture||[]).some(f=>f.k==='lamp')&&LAMP.auto!==false){   // no mapped lamps: one every 24 m along each pavement edge
  const seen=[];
  for(const r of SCENE.routes){if(r.kind!=='ped')continue;const L=measuredLane({p:r.p,junctions:[]});
    for(let s=6;s<L.len-4;s+=24){const {p,d}=tAt(L,s),q=[p[0]+d[1]*.9,p[1]-d[0]*.9];
      if(seen.some(o=>Math.hypot(o[0]-q[0],o[1]-q[1])<14)||!inRings(q,SCENE.paths.concat(SCENE.walk)))continue;
      if(SCENE.buildings.some(b=>inside(q,b.ring)))continue;seen.push(q);lamp(...q)}}
}

/* ---------- boats moored on the quays and at anchor (prep.py places them; colours from CITY.boats) ---------- */
const BOATCFG={hulls:['#f3efe4','#f3efe4','#2f5f8a','#b8483b','#3f7a5c','#f3efe4'],stripes:['#2f5f8a','#b8483b','#3f7a5c','#e0b04a'],
  covers:['#3f6e9a','#5c8c6a','#c9c2b0'],inside:'#c8a27a',cabin:'#f6f3ea',...(CITY.boats||{})};
const BOATS=(SCENE.boats||[]).map(b=>{
  const L=b.l,W=Math.max(1.5,L*.31),ca=Math.cos(b.a*Math.PI/180),sa=Math.sin(b.a*Math.PI/180),k=b.k;
  const at=(u,v,z)=>[b.x+u*ca-v*sa,b.y+u*sa+v*ca,z];
  const N=7,st=[];for(let i=0;i<=N;i++)st.push(-1+2*i/N);
  const half=t=>Math.pow(Math.max(0,1-Math.pow(Math.abs(t),2.4)),.55);
  const side=sgn=>st.map(t=>({t,w:half(t)*sgn}));
  const outline=[...side(1),...side(-1).reverse()].filter((q,i,arr)=>i===0||Math.abs(q.w)>.01||Math.abs(arr[i-1].w)>.01);
  const sheer=t=>.95+.3*t*t,top=outline.map(q=>at(q.t*L/2,q.w*W/2,sheer(q.t))),low=outline.map(q=>at(q.t*L*.45,q.w*W*.38,.04));
  const hull=pickOf(BOATCFG.hulls,'h'+k),stripe=pickOf(BOATCFG.stripes,'s'+k),big=b.anchor&&L>=9;
  const cover=!big&&rnd(k*3.7)<.45?pickOf(BOATCFG.covers,'c'+k):null,sail=big&&rnd(k*1.3)<.55;
  const fp=rect(b.x,b.y,L,L).map(([x,y])=>[x,y]);
  return obj(polygon(b.x,b.y,L*.5,8),sail?L*1.3:2,()=>{
    let g='';
    for(let i=0;i<top.length;i++){const j=(i+1)%top.length,a1=top[i],b1=top[j],a0=low[i],b0=low[j];
      let n=norm([b1[1]-a1[1],-(b1[0]-a1[0]),-.12]);const mx=(a1[0]+b1[0])/2-b.x,my=(a1[1]+b1[1])/2-b.y;
      if(n[0]*mx+n[1]*my<0)n=[-n[0],-n[1],n[2]];if(!vis(n))continue;   // outward, whichever way the outline runs
      const mid=(p,q,t)=>p.map((v,d)=>v+(q[d]-v)*t);
      g+=shape([a0,b0,mid(b0,b1,.78),mid(a0,a1,.78)],tone(n,soft(hull)),.45)+shape([mid(a0,a1,.78),mid(b0,b1,.78),b1,a1],tone(n,soft(stripe)),.45)}
    g+=shape(top,cover||hull,.5);
    if(!cover){g+=shape(outline.map(q=>at(q.t*L*.4,q.w*W*.3,sheer(q.t)-.05)),BOATCFG.inside,.35);const inner=outline.map(q=>at(q.t*L*.36,q.w*W*.22,.6));g+=shape(inner,mix(BOATCFG.inside,'#5c4632',.25),.3);
      for(const t of [-.3,.2])g+=shape([at(t*L/2-.12,-W*.28,.8),at(t*L/2+.12,-W*.28,.8),at(t*L/2+.12,W*.28,.8),at(t*L/2-.12,W*.28,.8)],BOATCFG.inside,.3)}
    if(big){const cu=-.05*L,cl=L*.32,cw=W*.55,ch=1.1,box=[at(cu-cl/2,-cw/2,.9),at(cu+cl/2,-cw/2,.9),at(cu+cl/2,cw/2,.9),at(cu-cl/2,cw/2,.9)];
      g+=walls(box.map(p=>[p[0],p[1]]),.9,.9+ch,{st:{facade:'plain',floor:9,shop:'none'},body:BOATCFG.cabin})()+shape(box.map(p=>[p[0],p[1],.9+ch]),BOATCFG.cabin,.45)}
    if(sail){const m=at(L*.12,0,0);g+=stick([m[0],m[1],.9],[m[0],m[1],L*1.25],.05,'#8a8478')+stick([m[0],m[1],1.9],[...at(-L*.38,0,0).slice(0,2),1.9],.04,'#8a8478')}
    return g});
});

/* ---------- occasion decorations: bunting across the main streets, lanterns under shop eaves, flags on lamps ---------- */
function decorations(){
  if(DECOR)return DECOR;DECOR=[];const d=SEASON.decor;if(!d)return DECOR;
  const lines=SCENE.centerlines.length?SCENE.centerlines:SCENE.routes.filter(r=>r.kind==='car');
  const long=lines.map(l=>measuredLane({p:l.p,junctions:[]})).sort((a,b)=>b.len-a.len).slice(0,2);
  if(d.bunting)for(const [li,L] of long.entries())for(const k of [.25,.5,.75]){
    const {p,d:dir}=tAt(L,L.len*k),w=d.span||7,n=[-dir[1],dir[0]],a=[p[0]+n[0]*w,p[1]+n[1]*w,d.height||6.5],b=[p[0]-n[0]*w,p[1]-n[1]*w,d.height||6.5];
    const fp=[[a[0]+dir[0]*.2,a[1]+dir[1]*.2],[b[0]+dir[0]*.2,b[1]+dir[1]*.2],[b[0]-dir[0]*.2,b[1]-dir[1]*.2],[a[0]-dir[0]*.2,a[1]-dir[1]*.2]];
    DECOR.push({fp,h:a[2]+.3,anim:true,draw:t=>{
      const pts=[];for(let i=0;i<=14;i++){const u=i/14;pts.push([a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]-Math.sin(Math.PI*u)*1.1])}
      let s=stick([a[0],a[1],0],a,.08,'#6b7275')+stick([b[0],b[1],0],b,.08,'#6b7275')+edge(pts[0],pts[14],'#6b6470',.05);
      for(let i=0;i<14;i++){const m=[(pts[i][0]+pts[i+1][0])/2,(pts[i][1]+pts[i+1][1])/2,(pts[i][2]+pts[i+1][2])/2],sw=Math.sin(t*3.2+i*.9+li)*.3;
        s+=shape([pts[i],pts[i+1],[m[0]+sw*.3,m[1]+sw*.3,m[2]-.9]],d.bunting[(i+li)%d.bunting.length],.4)}
      return s}});
  }
  if(d.lanterns){let n=0;for(const F of facades){if(!F.shop||n>(PHONE?60:140))continue;
    for(let s=1.2;s<F.len-.8;s+=d.lanternGap||2.6){const z=Math.min(F.h-.6,(F.st.shopHeight||3.2)-.1),x=F.start[0]+F.along[0]*s+F.n[0]*.55,y=F.start[1]+F.along[1]*s+F.n[1]*.55,c=d.lanterns[(n++)%d.lanterns.length];
      DECOR.push({fp:rect(x,y,.5,.5),h:z+.2,draw:()=>stick([x,y,z+.15],[x,y,z-.15],.02,'#3d3a44')+stick([x,y,z-.28],[x,y,z-.78],.2,c)+stick([x,y,z-.24],[x,y,z-.3],.12,'#2f2b33')+stick([x,y,z-.8],[x,y,z-.86],.12,'#2f2b33')})}}}
  if(d.fairy){   // strings of small lights along street fronts (under the eaves and over the shops) and the quay edge
    const cols=d.fairy,dot=(p,c)=>stick(p,[p[0],p[1],p[2]+.02],.075,c);let n=0;
    for(const F of facades){if(!F.street||F.cut||F.len<3||n>(PHONE?90:220))continue;n++;
      const zs=[F.h-.45];if(F.shop)zs.push(F.z+(F.st.shopHeight||3.2)+.25);
      const pts=[];
      for(const z of zs){const segs=Math.max(1,Math.round(F.len/4));for(let k=0;k<segs;k++)for(let s=0;s<=8;s++){const u=(k+s/8)/segs,sag=Math.sin(Math.PI*s/8)*.35;
        pts.push([F.start[0]+F.along[0]*u*F.len+F.n[0]*.18,F.start[1]+F.along[1]*u*F.len+F.n[1]*.18,z-sag])}}
      const fp=[F.start,[F.start[0]+F.along[0]*F.len,F.start[1]+F.along[1]*F.len]].map(p=>[p[0]+F.n[0]*.4,p[1]+F.n[1]*.4]);
      const ring=[fp[0],fp[1],[fp[1][0]-F.n[0]*.5,fp[1][1]-F.n[1]*.5],[fp[0][0]-F.n[0]*.5,fp[0][1]-F.n[1]*.5]];
      DECOR.push({fp:ring,h:F.h,draw:()=>vis([F.n[0],F.n[1],0])?pts.map((p,i)=>dot(p,cols[i%cols.length])).join(''):''})}
    for(const line of SCENE.shore||[]){   // along the water's edge, in short runs so boats and people sort against them
      const pts=[];for(let i=0;i<line.length-1;i++){const a=line[i],b=line[i+1],l=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let s=0;s<l;s+=.6)pts.push([a[0]+(b[0]-a[0])*s/l,a[1]+(b[1]-a[1])*s/l,.3])}
      for(let k=0;k<pts.length;k+=8){const run=pts.slice(k,k+9);if(!run.length)continue;
        const xs=run.map(p=>p[0]),ys=run.map(p=>p[1]),fp=[[Math.min(...xs)-.2,Math.min(...ys)-.2],[Math.max(...xs)+.2,Math.min(...ys)-.2],[Math.max(...xs)+.2,Math.max(...ys)+.2],[Math.min(...xs)-.2,Math.max(...ys)+.2]];
        DECOR.push({fp,h:.45,draw:()=>run.map((p,i)=>dot(p,cols[(i+k)%cols.length])).join('')})}}
  }
  if(d.flags)for(const [i,item] of streetFurniture.entries()){if(i%2)continue;const [x,y]=avg(item.fp.map(p=>[...p,0]));const h=item.h-1,c=d.flags[i%d.flags.length];
    DECOR.push({fp:rect(x,y,.9,.9),h:h+.6,anim:true,draw:t=>{const sw=Math.sin(t*2.6+i)*.12;return shape([[x,y,h+.5],[x+.7,y+sw,h+.45],[x+.7,y+sw,h-.15],[x,y,h-.1]],c,.35)}})}
  return DECOR;
}

/* ---------- the ground: plate, streets, green, water, markings, shadows ---------- */
const CENTER=SCENE.centerlines.map(l=>measuredLane({p:l.p,junctions:[]}));
const CROSSING=SCENE.markings.map(p=>measuredLane({p,junctions:[]}));
function cityGround(){
  const top=drape(BASE_CORNERS);let g='';
  for(const l of SCENE.lawns)g+=surface(l.r,GRASS);
  for(const w of SCENE.water||[])g+=surface(w,WATER);
  for(const w of SCENE.sand||[])g+=surface(w,SEASON.snow?snowy(PAL.sand,.8):PAL.sand);
  for(const w of SCENE.quayShade||[])g+=surface(w,mix(WATER,'#2f6474',.32));   // the quay wall's shadow on the water
  for(const p of SCENE.walk)g+=surface(p,WALK);
  for(const p of SCENE.paths)g+=surface(p,PAVE);
  for(const p of SCENE.roads)g+=surface(p,ROAD);
  for(const p of SCENE.quay||[])g+=surface(p,SEASON.snow?'#f4f1ea':PAL.quay);   // stone coping along the water's edge
  if(SEASON.night)for(const [x,y] of LAMP_AT)g+=lightPool(x,y,3.4,'#ffcf7a',.55);
  if(SEASON.night&&SEASON.decor&&SEASON.decor.litTrees){const re=new RegExp(SEASON.decor.litTrees,'i');for(const tr of TREES)if(re.test(tr.species))g+=lightPool(tr.x,tr.y,tr.ext*1.3+1,'#fff3c4',.5)}
  g+='<pavementink/>';
  let paint='';
  for(const lane of CENTER)for(let s=3;s<lane.len-2;s+=7.4){const {p,d}=tAt(lane,s);paint+=stripeAt(p,d,2.9,.15)}
  for(const lane of CROSSING)for(let s=.4;s<lane.len;s+=1.1){const {p,d}=tAt(lane,s);paint+=stripeAt(p,d,.46,2.4)}
  for(const [x,y,a] of (CITY.life||{}).parkedCars||[]){const d=[Math.cos(a),Math.sin(a)],nn=[-d[1],d[0]];for(const o of [-1.32,1.32])paint+=stripeAt([x+nn[0]*o,y+nn[1]*o],d,5,.11)}
  if(paint)g+=fill(paint,SEASON.snow?'#f7f3ea':PAL.marking);
  // kerbs follow the slope with the roads
  if(TER){let k='';for(const p of SCENE.roads)for(const r of p)k+=pd(drape(r).map(q=>[q[0],q[1],q[2]+.03]));g+='<path d="'+k+'" fill="none" stroke="'+PAL.kerb+'" style="stroke-width:'+f(.16)+'"/>'}
  // contour lines: one a metre, every fifth heavier
  if(TER&&(CITY.terrain||{}).contours!==false&&SHOW_CONTOURS){const ink=mix(GROUND,'#5b4a3a',.55);
    for(const c of CONTOURS){let d='';for(const sg of c.segs)d+=pd(sg,false);const five=Math.round(c.lv+TER.datum)%5===0;
      if(d)g+='<path d="'+d+'" fill="none" stroke="'+ink+'" stroke-opacity="'+(five?.5:.26)+'" style="stroke-width:'+f(Math.max(five?.2:.1,(five?1.1:.6)*UPX))+'"/>'}}
  for(const r of SCENE.rails||[])for(const off of [-.72,.72]){const L=measuredLane({p:r.p,junctions:[]}),pts=[];for(let s=0;s<=L.len;s+=1){const {p,d}=tAt(L,s);pts.push([p[0]-d[1]*off,p[1]+d[0]*off,.02])}
    if(pts.length>1)g+='<path d="'+pd(pts,false)+'" fill="none" stroke="'+PAL.rail+'" style="stroke-width:'+f(.11)+'"/>'}
  let sh='';
  for(const m of models)sh+=lifted(m.g??groundAt(m.fp),()=>castShadow([...atZ(m.fp,0),...atZ(m.fp,Math.min(m.h,30))]));
  for(const tr of TREES)sh+=lifted(tr.base,()=>castShadow([...atZ(sq(tr.x,tr.y,.35),0),...atZ(polygon(tr.x,tr.y,tr.ext*.72,10),tr.h*.68)]));
  const slabWalls=BASE_CORNERS.map((a,i)=>{const b=BASE_CORNERS[(i+1)%4],n=norm([b[1]-a[1],a[0]-b[0],0]);
    // the cut edge of the plot shows the lie of the land: the ground line over a block of earth, ruled every metre of height
    let svg='';
    if(vis(n)){const len=Math.hypot(b[0]-a[0],b[1]-a[1]),m=TER?Math.ceil(len/3):1,up=[];
      for(let k=m;k>=0;k--){const x=a[0]+(b[0]-a[0])*k/m,y=a[1]+(b[1]-a[1])*k/m;up.push([x,y,groundZ(x,y)])}
      svg=shape([[...a,-SLAB],[...b,-SLAB],...up],tone(n,soft(PAL.slab)),.7);
      if(TER&&UPX<1.6){const col=mix(tone(n,soft(PAL.slab)),'#5b4a3a',.28);
        for(let lv=0;lv<TER.max;lv+=1){let d='',run=[];
          for(let k=0;k<=m;k++){const x=a[0]+(b[0]-a[0])*k/m,y=a[1]+(b[1]-a[1])*k/m,inside2=groundZ(x,y)>lv+.05;
            if(inside2)run.push([x,y,lv]);if((!inside2||k===m)&&run.length){if(run.length>1)d+=pd(run,false);run=[]}}
          if(d)svg+='<path d="'+d+'" fill="none" stroke="'+col+'" stroke-opacity="'+(Math.round(lv+TER.datum)%5===0?.75:.38)+'" style="stroke-width:'+f(.09)+'"/>'}}}
    // where the sea or a river reaches the edge, the cut shows water down to a sandy bed
    if(svg&&(SCENE.water||[]).length){const len=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.ceil(len/.8),runs=[];let s0=null;
      for(let k=0;k<=steps;k++){const t=k/steps,q=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],inn=[q[0]-n[0]*.3,q[1]-n[1]*.3];
        const w=k<steps&&SCENE.water.some(rs=>inside(inn,rs[0])&&!rs.slice(1).some(h=>inside(inn,h)));
        if(w&&s0===null)s0=t;if(!w&&s0!==null){runs.push([s0,t]);s0=null}}
      const at=(t,z)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,z],deep=-SLAB*.72;
      for(const [t0,t1] of runs)svg+=shape([at(t0,deep),at(t1,deep),at(t1,0),at(t0,0)],tone(n,soft(mix(WATER,'#3f7f95',.28))),.6)+
        shape([at(t0,-SLAB),at(t1,-SLAB),at(t1,deep),at(t0,deep)],tone(n,soft(mix(PAL.sand||'#ecd9a8',PAL.slab,.4))),.5)}
    return {at:[(a[0]+b[0])/2,(a[1]+b[1])/2,0],svg}});
  return byDepth(slabWalls)+shape(top,GROUND,.75)+clipTo(top,(GW_ON?'<gw id="0"/>':'')+g+'<g opacity="'+(SEASON.wet?'.18':SEASON.haze?'.36':SEASON.snow?'.3':'.45')+'">'+sh+'</g>');
}
function paintSingaporeGround(ctx){
  // at night the paving joints, grass strokes and ripples painted here are dimmed like everything else
  if(SEASON.night){const proto=Object.getPrototypeOf(ctx);for(const k of ['strokeStyle','fillStyle']){const d=Object.getOwnPropertyDescriptor(proto,k);
    Object.defineProperty(ctx,k,{configurable:true,get(){return d.get.call(this)},set(v){d.set.call(this,typeof v==='string'?nightCol(v):v)}})}
    try{paintGroundInk(ctx)}finally{delete ctx.strokeStyle;delete ctx.fillStyle}return}
  paintGroundInk(ctx);
}
/* pavingInk: the joints and stones of the pavements, in CITY.paving.style
   'grid'       square joints only (the old look; size = slab size)
   'slabs'      stone slabs in running bond, each a slightly different tone (piazzas, Mediterranean towns)
   'ishidatami' long narrow granite slabs in running bond (Kyoto lanes)
   'tiles'      square concrete tiles with a faint tone change (modern city pavements)
   colour = joint colour; stone = slab colour (defaults from the walk colour) */
function pavingInk(ctx,groups,pv,H){
  const st=pv.style||'grid',snow=SEASON.snow,joint=snow?'#e2ddd2':pv.colour||PAL.paving;
  let x0=H,y0=H,x1=-H,y1=-H;for(const rings of groups)for(const r of rings)for(const [x,y] of r){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}
  if(st==='grid'){ctx.strokeStyle=joint;ctx.lineWidth=.05;ctx.beginPath();const s=pv.size||2.4;
    for(let i=-H;i<H;i+=s){ctx.moveTo(i,-H);ctx.lineTo(i,H);ctx.moveTo(-H,i);ctx.lineTo(H,i)}ctx.stroke();return}
  const spec={slabs:{h:.62,a:.7,b:1.5,var:.09},ishidatami:{h:.45,a:1.0,b:2.1,var:.11},tiles:{h:.6,a:.6,b:.6,var:.05}}[st]||{h:.6,a:.8,b:1.4,var:.08};
  const h=pv.size||spec.h,base=snow?'#f1eee8':pv.stone||WALK,N=x=>SEASON.night?nightCol(x):x;
  // one patch of paving (16 rows) is drawn once and repeated: a single fill instead of a rectangle per stone on every redraw
  const ppm=[12,24,36,48,72].find(v=>v>=1.6/UPX)||72,key=[st,h,base,joint,ppm,!!SEASON.night].join('|');
  let cv=PAVE_PATCH.get(key);
  if(!cv){
    const rows=16,Wm=spec.a===spec.b?spec.a*16:spec.b*9,W=Math.round(Wm*ppm),Hh=Math.round(h*ppm)*rows;cv=new OffscreenCanvas(W,Hh);const g=cv.getContext('2d');
    const tones=[mix(base,'#ffffff',spec.var),base,mix(base,'#5e564f',spec.var*.8),mix(base,'#d8b98c',spec.var)].map(N);
    g.strokeStyle=N(mix(joint,'#4f4740',.15));g.lineWidth=Math.max(1,(st==='tiles'?.03:.045)*ppm);let k=0;
    for(let r=0;r<rows;r++){const y=r*Hh/rows,hh=Hh/rows;let x=-rnd(r*3.7+h)*spec.b*ppm;
      while(x<W){const L=(spec.a===spec.b?spec.a:spec.a+rnd(k*1.37+r)*(spec.b-spec.a))*ppm,x2=spec.a===spec.b?x+L:Math.min(x+L,W+1);
        g.fillStyle=tones[Math.floor(rnd(k*2.91+.3)*4)%4];g.fillRect(x,y,x2-x,hh);if(x<0)g.fillRect(x+W,y,x2-x,hh);   // the stone cut by the left edge finishes at the right edge
        for(const jx of x<0?[x+W]:[x]){g.beginPath();g.moveTo(Math.round(jx)+.5,y);g.lineTo(Math.round(jx)+.5,y+hh);g.stroke()}x=x2;k++}
      g.beginPath();g.moveTo(0,Math.round(y)+.5);g.lineTo(W,Math.round(y)+.5);g.stroke()}
    PAVE_PATCH.set(key,cv)}
  ctx.save();ctx.scale(1/ppm,1/ppm);ctx.fillStyle=ctx.createPattern(cv,'repeat');ctx.fillRect(x0*ppm,y0*ppm,(x1-x0)*ppm,(y1-y0)*ppm);ctx.restore();
}
const PAVE_PATCH=new Map();
function paintGroundInk(ctx){
  const X=Dv(1,0,0),Y=Dv(0,1,0),o=P(0,0,TER_MID),H=HALF+2;
  ctx.save();
  function onRings(groups,draw){ctx.save();ctx.beginPath();for(const rings of groups)for(const r of rings){const q=drape(r);let w=P(...q[0]);ctx.moveTo(w[0],w[1]);for(let i=1;i<q.length;i++){w=P(...q[i]);ctx.lineTo(w[0],w[1])}ctx.closePath()}ctx.clip('evenodd');ctx.transform(...X,...Y,...o);draw();ctx.restore()}
  const pv=CITY.paving||{},GWD=typeof GW_ON!=='undefined'&&GW_ON;
  if(GWD)gwGroundInk(ctx,onRings,X,Y,H);
  else if(UPX<.6)onRings(SCENE.walk.concat(SCENE.paths),()=>pavingInk(ctx,SCENE.walk.concat(SCENE.paths),pv,H));
  if(SEASON.wet)onRings(SCENE.walk.concat(SCENE.paths),()=>{   // rain: shallow puddles on squares and pavements, each a pale patch with a bright edge
    for(let i=0;i<(PHONE?220:520);i++){const x=rnd(i+5.2)*2*H-H,y=rnd(i+71.9)*2*H-H,l=.5+rnd(i*3.3)*1.5,w=.18+rnd(i*1.7)*.2;
      ctx.save();ctx.translate(x,y);ctx.rotate(rnd(i*9.1)*3.14);ctx.fillStyle='rgba(170,188,202,.55)';ctx.beginPath();ctx.ellipse(0,0,l,w,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(236,242,246,.7)';ctx.lineWidth=.035;ctx.beginPath();ctx.ellipse(0,0,l*.6,w*.45,0,3.4,5.6);ctx.stroke();ctx.restore()}});
  if(!SEASON.snow&&!GWD)onRings(SCENE.lawns.map(l=>l.r),()=>{ctx.strokeStyle=mix(GRASS,'#5d7a58',.25);ctx.lineWidth=.12;ctx.beginPath();
    for(let i=0;i<(PHONE?500:1200);i++){const x=rnd(i+.4)*2*H-H,y=rnd(i+143.4)*2*H-H;ctx.moveTo(x-.18,y);ctx.lineTo(x,y+.29);ctx.lineTo(x+.16,y+.1)}ctx.stroke()});
  onRings(SCENE.roads,()=>{
    if(!GWD)for(let i=0;i<(PHONE?500:1300);i++){const x=rnd(i+.36)*2*H-H,y=rnd(i+2.41)*2*H-H;ctx.fillStyle=i%2?mix(ROAD,'#ffffff',.18):mix(ROAD,'#5d5867',.15);ctx.fillRect(x,y,.15+rnd(i*9)*.26,.13)}
    if(!TER){ctx.lineWidth=.15;ctx.strokeStyle=PAL.kerb;for(const p of SCENE.roads)for(const r of p){ctx.beginPath();ctx.moveTo(...r[0]);for(const q of r.slice(1))ctx.lineTo(...q);ctx.closePath();ctx.stroke()}}
    if(SEASON.wet)for(const [j,lane] of CENTER.entries())for(let s=2,i=0;s<lane.len-2;s+=3.6+rnd(i++ +j)*5){const {p,d}=tAt(lane,s),off=2.4*(i%2?1:-1);
      ctx.save();ctx.translate(p[0]-d[1]*off,p[1]+d[0]*off);ctx.rotate(Math.atan2(d[1],d[0]));const l=.8+rnd(i+j*17)*2.4;ctx.fillStyle='#a5b5bd';ctx.beginPath();ctx.ellipse(0,0,l,.3,0,0,Math.PI*2);ctx.fill();ctx.restore()}
  });
  if(SEASON.night&&SEASON.decor&&SEASON.decor.fairy&&(SCENE.water||[]).length)onRings(SCENE.water,()=>{   // lit quays shimmer on the water
    ctx.save();ctx.globalAlpha=.55;ctx.strokeStyle='#ffcf7a';ctx.lineWidth=.12;ctx.beginPath();let i=0;
    for(const rs of SCENE.quay||[])for(const q of rs[0]){if((i++)%3)continue;for(let k=0;k<4;k++){const x=q[0]+(rnd(i*3.1+k)-.5)*9,y=q[1]+(rnd(i*7.7+k*1.3)-.5)*9,l=.5+rnd(i+k*5)*1.6;ctx.moveTo(x,y);ctx.lineTo(x+l,y+l*.2)}}
    ctx.stroke();ctx.restore()});
  if(!SEASON.ice&&(SCENE.water||[]).length)onRings(SCENE.water,()=>{ctx.strokeStyle='#f2f6ef';ctx.lineWidth=.08;ctx.beginPath();for(let i=0;i<260;i++){const x=rnd(i+7.1)*2*H-H,y=rnd(i+3.3)*2*H-H,l=.6+rnd(i)*1.4;ctx.moveTo(x,y);ctx.lineTo(x+l,y)}ctx.stroke()});
  ctx.restore();
}

/* ---------- the frame ---------- */
const EXTRA=typeof CITY_EXTRA==='function'?CITY_EXTRA:null;   // landmarks.js may add its own parts per frame
/* many trees (a wood): each crown is painted from fewer, larger leaf sprays. A crown is 43 sprays; with 500 trees that is 21 000
   fills and strokes on every redraw. Crowns overlap in a wood, so thinning them keeps the look and makes turning smooth. */
let CROWNS_READY=false;
function thinCrowns(){
  CROWNS_READY=true;const q=Math.min(1,110/Math.max(1,TREES.length));if(q>=1)return;   // a budget of about 110 full crowns for the whole city
  for(const tr of TREES){const all=makeSprays(tr),n=Math.max(9,Math.round(all.length*q)),step=all.length/n,k=Math.sqrt(all.length/n)*.97;
    tr.sprays=Array.from({length:n},(_,i)=>all[Math.floor(i*step)]).map(sp=>({...sp,r:sp.r*k,ry:sp.ry*k}))}
}
function scene(t){
  if(!CROWNS_READY)thinCrowns();
  PED_SH='';let out=stamp('ground',cityGround,BASE_CORNERS,-SLAB,1);const parts=[];
  const up=(g,fp,h,make)=>lifted(g,()=>offView(fp,-3,h)?null:make());
  for(const [i,m] of models.entries()){const g=m.g??(m.g=groundAt(m.fp)),sfp=m.sfp||(m.sfp=(()=>{const xs=m.fp.map(p=>p[0]),ys=m.fp.map(p=>p[1]);return [[Math.min(...xs)-3.2,Math.min(...ys)-3.2],[Math.max(...xs)+3.2,Math.min(...ys)-3.2],[Math.max(...xs)+3.2,Math.max(...ys)+3.2],[Math.min(...xs)-3.2,Math.max(...ys)+3.2]]})()),svg=up(g,m.fp,m.h,()=>stamp('block'+i,m.draw,sfp,-Math.max(1,(m.deep||6)),m.h+.3));if(svg)parts.push({fp:m.fp,z1:m.h+g,svg})}
  for(const tr of TREES){const fp=sq(tr.x,tr.y,tr.ext*1.4);if(offView(fp,0,tr.zTop+2))continue;
    parts.push({fp:sq(tr.x,tr.y,.48),z1:tr.zTop,svg:stamp('tree'+tr.i,()=>drawTree(treeLook(tr).keep>=.5?tr.limbs:tr.geo,{ink:PLANT_INK,inkK:INK_K,bark:tr.rule.bark||'#9b795d',keep:0})+'<crown id="'+tr.i+'"/>',fp,0,tr.zTop+2)})}
  for(const [i,item] of streetFurniture.entries()){if(item.kind==='cafe'&&SEASON.cafes===false)continue;const g=item.g??(item.g=groundAt(item.fp)),svg=up(g,item.fp,item.h,()=>stamp('street'+i,item.draw,item.fp,0,item.h+.45));if(svg)parts.push({fp:item.fp,z1:item.h+g,svg})}
  for(const [i,item] of BOATS.entries())if(!(SEASON.boats!=null&&rnd(i*5.31+2.7)>=SEASON.boats)&&!offView(item.fp,0,item.h))parts.push({fp:item.fp,z1:item.h,svg:stamp('boat'+i,item.draw,item.fp,0,item.h+.4)});
  for(const [i,item] of decorations().entries()){const g=item.g??(item.g=groundAt(item.fp)),svg=up(g,item.fp,item.h,()=>item.anim?item.draw(t):stamp('decor'+i,item.draw,item.fp,0,item.h+.4));if(svg)parts.push({fp:item.fp,z1:item.h+g,svg})}
  if(EXTRA)for(const p of [].concat(EXTRA(t)||[])){if(!p)continue;const g=p.g??groundAt(p.fp),h=p.h||p.z1||3,svg=up(g,p.fp,h,()=>typeof p.draw==='function'?p.draw(t):p.svg);if(svg)parts.push({fp:p.fp,z1:h+g,svg})}
  const moving=TRAFFIC.to(t);SCENE_STATS.moving={car:0,bike:0,ped:0};for(const a of moving)SCENE_STATS.moving[a.kind]++;
  for(const a of moving){const g=groundZ(a.p[0],a.p[1]);if(offView(sq(...a.p,3),g,g+3))continue;
    const part=a.kind==='bike'?bikeDraw(a,t):lifted(g,()=>a.kind==='car'?carDraw(a):pedestrian(a,t));part.z1+=g;
    if(a.alpha<1)part.svg='<g opacity="'+a.alpha.toFixed(2)+'">'+part.svg+'</g>';parts.push(part)}
  for(const p of streetLife(t)){const g=p.flat?0:groundAt(p.fp),svg=lifted(g,()=>offView(p.fp,p.flat?0:-2,p.h+(p.flat?TER?TER.max:0:0))?null:p.draw(t));if(svg)parts.push({fp:p.fp,z1:p.h+(p.flat?groundAt(p.fp):g),svg})}
  if(PED_SH)out+='<path d="'+PED_SH+'" fill="#65576e" opacity=".23"/>';
  const wx=SEASON.wx||(SEASON.wet?'rain':SEASON.snow?'snow':null);
  return out+planSort(parts)+driftingLeaves(t)+(SEASON.petals?petals(t):'')+(wx?weather(wx,t,HALF+2,groundZ,(x,y)=>inside([x,y],BASE_CORNERS)):'');
}
/* petals: "petals": true on a season or occasion with blossom. Each blossoming tree sheds a few petals that drift down
   from its crown and sideways in the wind, then start again. One path in two pinks (kept bright at night: they are in LIT). */
function petals(t){
  if(SEASON.leaves!=='blossom')return '';
  const h=(i,k)=>{const x=Math.sin(i*127.1+k*311.7)*43758.5453;return x-Math.floor(x)};
  const per=PHONE?14:30;let a='',b='';
  for(const tr of TREES){
    if(!tr.rule.blossom||offView(sq(tr.x,tr.y,tr.ext),0,tr.zTop))continue;
    for(let k=0;k<per;k++){
      const i=tr.i*31+k,top=tr.zTop*.85,fall=top+.3,v=.35+h(i,3)*.25,ph=(t*v/fall+h(i,4))%1;   // ph: 0 at the crown, 1 on the ground
      const r=tr.ext*(.4+h(i,1)*.8),an=h(i,2)*6.283,w=t*.9+h(i,5)*6.3,dr=ph*2.4;
      const x=tr.x+Math.cos(an)*r+Math.sin(w)*.35+dr,y=tr.y+Math.sin(an)*r+Math.cos(w*.8)*.25+dr*.4,z=top*(1-ph);
      if(!inside([x,y],BASE_CORNERS))continue;
      const [X,Y]=P(x,y,z+groundZ(x,y)),seg='M'+f(X)+' '+f(Y)+'h0';
      if(k%3)a+=seg;else b+=seg;
    }
  }
  const [ax,ay]=P(0,0,0),[bx,by]=P(.32,0,0),w=Math.max(4*INK_K,Math.hypot(bx-ax,by-ay)),dot=   // a petal is about 32 cm across on screen, never smaller than 4 ink units
  (d,c,k)=>d?'<path d="'+d+'" fill="none" stroke="#c98a9c" stroke-opacity=".7" style="stroke-width:'+(w*k+Math.max(.5*INK_K,w*.14)).toFixed(2)+'" stroke-linecap="round"/><path d="'+d+'" fill="none" stroke="'+c+'" style="stroke-width:'+(w*k).toFixed(2)+'" stroke-linecap="round"/>':'';
  return dot(a,'#ffe6ec',1)+dot(b,'#fbd3dd',.8);
}

// Photograph-led elevation painters for Oxford and the University of Mississippi.
// Dimensions not supplied by a survey remain interpreted; the mapped plans are retained.
function paintOxfordArchitecture(g,F,Q){
 const st=F.st,kind=st.arch;if(!kind)return false;
 if(kind==='blank')return true;
 const {box,poly,shade}=Q,L=F.len,H=F.h-F.z;
 const ivory=shade(st.trim||'#eae3ce'),ink=shade('#4e5149'),glass=shade(st.windowGlass||'#536663'),mortar=shade(mix(F.body,'#ded0b4',.18));
 const arch=(x,y,w,h,c,r=w/2)=>{g.fillStyle=c;g.beginPath();g.moveTo(x,y+h);g.lineTo(x,y+r);g.ellipse(x+w/2,y+r,w/2,r,0,Math.PI,Math.PI*2);g.lineTo(x+w,y+h);g.closePath();g.fill()};
 const line=(x1,y1,x2,y2,c,w=.04)=>{g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()};
 const text=(txt,x,y,w,h=.38,c=ivory)=>{if(UPX>.43)return;g.save();g.fillStyle=c;g.font='600 '+h+'px Georgia,serif';g.textAlign='center';g.textBaseline='middle';wallText(g,txt,x,y,w);g.restore()};
 const sash=(x,y,w,h,arched=false,shutters=false,panes=3)=>{
  if(arched)arch(x-.1,y-.1,w+.2,h+.2,ivory);else box(x-.1,y-.1,w+.2,h+.2,ivory);
  if(arched)arch(x,y,w,h,glass);else box(x,y,w,h,glass);
  const head=arched?w/2:0;
  for(let i=1;i<panes;i++)box(x+i*w/panes-.022,y+head,.044,h-head,ivory);
  box(x,y+head+(h-head)*.52,w,.075,ivory);
  if(UPX<.32){for(let j=1;j<4;j++)box(x,y+head+(h-head)*j/4,w,.028,ivory);if(arched){for(let a=1;a<4;a++){const t=Math.PI+a*Math.PI/4;line(x+w/2,y+w/2,x+w/2+Math.cos(t)*w/2,y+w/2+Math.sin(t)*w/2,ivory,.035)}}}
  box(x-.17,y+h+.04,w+.34,.1,ivory);
  if(shutters){const c=shade(st.shutterColour||'#344c40'),sw=w*.42;for(const xx of [x-sw-.12,x+w+.12]){box(xx,y,sw,h,c);if(UPX<.25)for(let yy=y+.1;yy<y+h;yy+=.15)box(xx+.04,yy,sw-.08,.025,shade('#70816a'))}}
 };
 const cornice=(dentils=true)=>{box(0,0,L,.14,shade('#797b6c'));box(0,.14,L,.25,ivory);box(0,.39,L,.08,shade('#a39b87'));if(dentils)for(let x=.15;x<L;x+=.58){box(x,.47,.2,.23,ivory);box(x+.03,.7,.14,.1,ivory)}};
 const brick=(enabled=true)=>{if(!enabled||UPX>.27)return;for(let y=.9;y<H;y+=.26){box(0,y,L,.012,mortar);if(UPX<.14)for(let x=(Math.round(y/.26)%2)*.3;x<L;x+=.62)box(x,y,.018,.26,mortar)}};
 const door=(x,y,w,h)=>{box(x-.16,y-.15,w+.32,h+.15,ivory);box(x,y,w,h,shade('#394a40'));box(x+w/2-.035,y,.07,h,ivory);for(const t of [.12,.56]){box(x+.12,y+h*t,w/2-.23,h*.27,glass);box(x+w/2+.1,y+h*t,w/2-.23,h*.27,glass)}box(x+.02,y+.12,w-.04,.09,ivory)};
 if(kind==='courthouse'){
  cornice();box(0,H-.4,L,.4,ivory);
  const count=L>30?9:Math.max(2,Math.round(L/5.5)),bw=L/count;
  for(let i=0;i<count;i++){
   const xc=(i+.5)*bw,wing=L>30&&(i<2||i>count-3),w=wing?1.25:1.18;
   sash(xc-w/2,wing?1.5:2,w,wing?2.4:5.4,!wing,false,2);if(wing)sash(xc-w/2,5.2,w,2.4,false,false,2);
   sash(xc-w/2,H-4.2,w,3.5,!wing,false,2);
  }
  if(L>20)for(const x of [0,L*.24,L*.76,L-.5]){box(x,.7,.42,H-1.1,ivory);box(x-.12,.65,.65,.22,ivory);box(x-.1,H-.7,.65,.22,ivory)}
  if(L>30){for(const x of [L*.22,L*.78]){box(x,1.2,.08,H-1.7,shade('#6e756c'))}}
  return true;
 }
 if(kind==='arcade'){
  box(0,0,L,.22,ivory);box(0,H-.3,L,.3,ivory);
  if(UPX<.3)for(let y=.5;y<H;y+=.4)box(0,y,L,.018,shade('#b5b3a2'));
  const count=L>8?3:1,bw=L/count;
  for(let i=0;i<count;i++){const w=Math.min(2.4,bw*.63);arch((i+.5)*bw-w/2,.8,w,H-.8,shade('#747c70'));if(i===1){door((i+.5)*bw-w*.32,1.6,w*.64,H-1.6)}}
  return true;
 }
 if(kind==='belfry'){
  const bw=L/2;for(let i=0;i<2;i++){const x=(i+.5)*bw-.56;arch(x-.1,H*.13,1.32,H*.68,ivory);arch(x,H*.16,1.12,H*.64,shade('#666f62'));for(let y=H*.16+.6;y<H*.8;y+=.19)box(x+.04,y,1.04,.065,shade('#9da28f'))}
  for(const x of [0,L-.2])box(x,0,.2,H,ivory);return true;
 }
 if(kind==='cityhall'){
  brick();cornice(false);const front=Math.abs(F.n[0])>.8;
  const n=front?(L>14?5:1):Math.max(3,Math.round(L/4.5)),bw=L/n;
  for(let i=0;i<n;i++){
   const w=Math.min(front?3.05:1.65,bw*(front?.6:.42)),x=(i+.5)*bw-w/2;
   sash(x,H*.18,w,H*.34,true,false,2);sash(x,H*.62,w,H*.29,false,false,2);
   if(UPX<.22){arch(x-.25,H*.18-.28,w+.5,H*.35+.4,shade('#8d4b38'));sash(x,H*.18,w,H*.34,true,false,2)}
  }
  box(0,H*.58,L,.2,ivory);for(const x of [0,L-.38])box(x,.6,.38,H-.6,shade('#a95c42'));
  return true;
 }
 if(kind==='turret'){
  const panel=Math.round((Math.atan2(F.n[1],F.n[0])+Math.PI)/(Math.PI/8));
  if(panel%2!==0)return true;
  const w=Math.min(.62,L*.8);sash((L-w)/2,H*.18,w,H*.64,false,false,1);
  return true;
 }
 if(kind==='rounded-wing'){
  if(F.seed%3!==0)return true;
  const w=Math.min(.85,L*.8);sash((L-w)/2,1,w,H*.32,false,false,1);sash((L-w)/2,H*.6,w,H*.3,true,false,1);return true;
 }
 if(kind==='ventress'){
  brick();cornice();box(0,H*.51,L,.14,ivory);box(0,H-.22,L,.22,shade('#8e644c'));
  const n=Math.max(1,Math.round(L/(st.bay||3.3))),bw=L/n;
  for(let i=0;i<n;i++){
   const w=Math.min(1.12,bw*.36),x=(i+.5)*bw-w/2;
   sash(x,1.15,w,H*.32,false,false,2);sash(x,H*.6,w,H*.31,true,false,2);
  }
  if(F.n[1]<-.6&&L>8)text('VENTRESS HALL',L/2,H*.55,L*.7,.42);
  return true;
 }
 if(kind==='campus-sash'||kind==='croft'||kind==='bryant'||kind==='peabody'||kind==='brevard'||kind==='chapel'){
  brick();cornice(kind!=='croft');if(UPX<.4&&L>7){for(const x0 of [0,L-.46])for(let yy=1;yy<H-1;yy+=.72)box(x0,yy,.46,.38,ivory);box(0,H-1.05,L,.15,ivory)}const fl=st.floor||4.5,nf=st.archFloors||Math.max(1,Math.round(H/fl)),rh=H/nf;
  const n=Math.max(1,Math.round(L/(st.bay||3.8))),bw=L/n;
  for(let j=0;j<nf;j++)for(let i=0;i<n;i++){
   const w=Math.min(st.windowWidth||1.15,bw*.36),hh=rh*(kind==='chapel'?.68:.59),x=(i+.5)*bw-w/2,y=j*rh+rh*.2;
   const shutters=(kind==='croft'||st.groundShutters)&&j===nf-1;
   sash(x,y,w,hh,kind==='chapel',shutters,3);
   if(UPX<.3&&!['chapel','peabody'].includes(kind)){box(x-.1,y-.2,w+.2,.12,shade('#8c5f48'));for(let a=0;a<5;a++)box(x+a*w/5,y-.22,w/5-.025,.16,shade('#a56c50'))}
  }
  if(kind==='peabody'||kind==='brevard'){box(0,H-.65,L,.65,ivory);for(const x of [0,L-.5])box(x,.7,.5,H-1.35,ivory)}
  const fn=st.frontNormal;if(fn&&L>8&&L<26&&F.n[0]*fn[0]+F.n[1]*fn[1]>.85)door(L/2-.75,H-3.6,1.5,3.25);
  if(st.facadeName&&L>8)text(st.facadeName,L/2,.85,L*.85,.42);
  return true;
 }
 if(kind==='union'){   // Student Union: a limestone entablature on brick piers and paired stone columns, glass set deep behind
  const stone=shade(st.trim||'#ddd3bc'),stoneD=shade('#c2b79d'),stoneL=shade('#ece5d2');
  const porch=L>24&&(F.n[0]*.567-F.n[1]*.824>.8||F.n[0]*.824+F.n[1]*.567>.8);
  if(!porch){brick();box(0,0,L,1.3,stone);box(0,1.3,L,.12,stoneD);box(0,H-.7,L,.7,stone);
   const n=Math.max(2,Math.round(L/5)),bw=L/n;for(let i=0;i<n;i++){const x=i*bw+bw*.22,w=bw*.56,hh=Math.max(1.2,Math.min(6.2,H-3.4));box(x-.12,2.1,w+.24,hh+.2,stone);box(x,2.2,w,hh,glass);for(let k=1;k<3;k++)box(x+w*k/3-.03,2.2,.06,hh,stone);for(let y=3.4;y<2.2+hh-.4;y+=1.2)box(x,y,w,.05,stone)}
   return true}
  const eh=Math.min(1.8,H*.2),dark=shade('#2c3633');
  box(0,eh,L,H-eh,dark);
  const gl=shade('#566a64');for(let x=.5;x<L-1.2;x+=1.5)box(x,eh+1.2,1.32,H-eh-1.6,gl);
  for(let y=eh+2.8;y<H-.8;y+=1.6)box(0,y,L,.07,dark);
  box(0,eh,L,1.1,shade('#232b29'));box(0,H-.3,L,.3,stone);
  const bays=Math.max(3,Math.round(L/4.9)),bw=L/bays,bk=shade(F.body),bkL=shade(mix(F.body,'#ffe2c4',.14)),bkD=shade(mix(F.body,'#3a2420',.25));
  for(let i=0;i<=bays;i++){const xc=i*bw;
   if(i%3===0){const w=1.55,x=Math.max(0,Math.min(L-w,xc-w/2));box(x,eh,w,H-eh,bk);box(x,eh,.18,H-eh,bkL);box(x+w-.2,eh,.2,H-eh,bkD);
    if(UPX<.25)for(let y=eh+.3;y<H-1;y+=.3)box(x,y,w,.014,mortar);box(x-.08,H-1.05,w+.16,1.05,stone);box(x-.08,H-1.05,w+.16,.1,stoneL);box(x-.06,eh,w+.12,.24,stone)}
   else for(const dx of [-.62,.1]){const x=xc+dx,w=.52;box(x,eh,w,H-eh,stone);box(x,eh,.15,H-eh,stoneL);box(x+w-.13,eh,.13,H-eh,stoneD);box(x-.07,H-.75,w+.14,.75,stone);box(x-.07,eh,w+.14,.26,stoneD)}}
  box(0,0,L,eh,stone);box(0,0,L,.2,stoneD);box(0,.2,L,.09,stoneL);box(0,eh-.22,L,.22,stoneD);box(0,eh*.5,L,.03,stoneD);
  text('OLE MISS STUDENT UNION',L/2,eh*.58,Math.min(L*.42,15),.44,shade('#7d7765'));
  return true;
 }
 if(kind==='lamar'){   // Lamar Hall (1977): buff precast concrete in broad bands, ribbon windows set back behind fins, a recessed ground floor
  const conc=shade(F.body),concD=shade(mix(F.body,'#6a5a48',.24)),concL=shade(mix(F.body,'#ffffff',.2)),dk=shade('#39403d'),gl=shade('#5a6b66');
  const front=F.n[0]*-.577+F.n[1]*-.817>.8;
  for(const y of [1.6,5.1]){const h=2.2;if(y+h>H-2.6)break;box(0,y,L,h,dk);for(let x=.3;x<L-1;x+=1.55)box(x,y+.18,1.25,h-.36,gl);for(let x=0;x<L+.1;x+=3.1)box(Math.min(L-.3,Math.max(0,x-.15)),y-.06,.3,h+.12,conc);box(0,y,L,.16,shade('#262c2a'))}
  const gy=Math.max(H*.62,H-3.6);if(H>6){box(0,gy,L,H-gy,dk);box(0,gy,L,.5,shade('#262c2a'));for(let x=1.5;x<L-.5;x+=6.2){box(x,gy,.75,H-gy,conc);box(x,gy,.2,H-gy,concL)}}
  box(0,0,L,.14,concL);
  if(UPX<.3){for(const y of [.8,1.6,3.8,4.45,5.1,7.3,gy-.02])if(y<gy+.1)box(0,y,L,.028,concD);for(let x=3.1;x<L;x+=3.1)box(x,0,.022,1.6,concD)}
  if(front){const tw=Math.min(9.5,L*.36),x=L/2-tw/2;box(x,0,tw,H,conc);box(x,0,.12,H,concL);box(x+tw-.14,0,.14,H,concD);if(UPX<.3){for(let y=1.25;y<H;y+=1.25)box(x,y,tw,.028,concD);box(x+tw/2,0,.022,H,concD)}
   box(x+tw+.6,gy+.5,2.2,H-gy-.5,shade('#2a302e'));box(x-2.8,gy+.5,2.2,H-gy-.5,shade('#2a302e'))}
  return true;
 }
 if(kind==='modern-campus'){
  brick();box(0,0,L,.35,ivory);box(0,H-.3,L,.3,ivory);
  const n=Math.max(2,Math.round(L/(st.bay||3.8))),bw=L/n,nf=Math.max(2,Math.round(H/(st.floor||3.8))),rh=H/nf;
  for(let i=0;i<n;i++)for(let j=0;j<nf;j++){const x=i*bw+.35,y=j*rh+.7,w=bw-.7,h=rh-1;box(x,y,w,h,glass);box(x,y+h*.7,w,.08,ivory);box(x+w*.5,y,.055,h,ivory)}
  return true;
 }
 if(kind==='shop'||kind==='books'||kind==='grocery'||kind==='bank'||kind==='neilsons'||kind==='lyric'){
  brick(kind!=='bank');cornice();const nrm=st.frontNormal;
  const front=nrm?F.n[0]*nrm[0]+F.n[1]*nrm[1]>.85:F.shop;
  const side=kind==='books'&&F.n[0]>.8;
  const nf=st.archFloors||Math.max(1,Math.round(H/(st.floor||4))),n=Math.max(1,Math.round(L/(front?(st.frontBay||st.bay||3.3):(st.sideBay||st.bay||3.3)))),bw=L/n;
  if(!front&&!side&&st.sideWall)box(0,0,L,H,shade(st.sideWall));
  if(!front&&!side){   // party and rear walls: plain brick, a few small windows, service doors, a downpipe, a condenser
   const rws=Math.max(1,Math.round(H/(st.floor||4)));
   if(F.street||L<14)for(let j=0;j<Math.max(1,rws-1);j++)for(let i=0;i<n;i++)if((i+j+F.seed)%2===0&&bw>1.6)sash((i+.5)*bw-.45,H*(j+.24)/rws,.9,Math.min(1.9,H/rws*.5),false,false,2);
   if(L>5&&UPX<.6&&F.street){for(let x=2.2+(F.seed%3);x<L-1.6;x+=8.5){box(x-.1,H-2.4,1.2,2.4,ivory);box(x,H-2.3,1,2.3,shade(['#55635a','#6d5a4a','#4d5560'][(F.seed+Math.round(x))%3]));box(x+.75,H-1.25,.08,.12,shade('#c8b282'))}
    box(L-.55,.6,.1,H-.6,shade('#7b7f78'));if(F.seed%3===0)box(.8,H-1.25,.95,.95,shade('#b9bdb4'))}
   box(0,H-.3,L,.3,shade('#8f7b65'));return true;
  }
  const upperH=Math.max(3,H-3.8),rows=Math.max(1,nf-1),rh=upperH/rows;
  if(st.motif==='diamonds'){const o=shade(st.trim2||'#e5793a'),t=shade('#4f8f86');box(0,0,L,.32,o);box(0,upperH*.36,L,.16,o);box(0,upperH-.3,L,.22,o);
   for(let i=0;i<4;i++)box(Math.min(L-.6,i*(L-.6)/3),0,.6,upperH,shade(mix(F.body,'#ffffff',.3)));
   for(let i=0;i<3;i++){const cx=(i+.5)*L/3,cy=upperH*.68,rw=Math.min(1.15,L/8),rv=.5;poly([[cx-rw-.14,cy],[cx,cy-rv-.12],[cx+rw+.14,cy],[cx,cy+rv+.12]],ivory);poly([[cx-rw,cy],[cx,cy-rv],[cx+rw,cy],[cx,cy+rv]],t)}}
  else for(let j=0;j<rows;j++)for(let i=0;i<n;i++){
   const w=Math.min(kind==='books'?1.25:1.4,bw*.43),x=(i+.5)*bw-w/2,y=j*rh+rh*.18;
   sash(x,y,w,rh*.65,kind==='books'||kind==='bank'||st.heads==='round',!!st.shutterColour,2);
   if(kind==='books'||kind==='bank'){box(x-.23,y-.26,w+.46,.13,ivory);box(x-.15,y-.12,w+.3,.12,ivory)}
   else if(UPX<.45&&st.heads!=='round'){const v=st.heads==='lintel'?0:st.heads==='arch'?1:st.heads==='hood'?2:F.seed%3;   // three window heads seen round the Square: stone lintel, brick segmental arch, bracketed hood
    if(v===0)box(x-.2,y-.3,w+.4,.2,ivory);else if(v===1)arch(x-.18,y-.44,w+.36,.52,shade(mix(F.body,'#4f3529',.3)),.3);else{box(x-.26,y-.36,w+.52,.13,ivory);box(x-.18,y-.23,.14,.2,ivory);box(x+w+.04,y-.23,.14,.2,ivory)}}
  }
  if(UPX<.36&&kind!=='bank'){for(let x=.2;x<L-.3;x+=.92)box(x,.84,.46,.17,mortar);box(0,1.06,L,.07,mortar)}
  const y=H-3.6,fascia=shade(st.shopColour||pickOf((CITY.shops||{}).fascias||['#3e574b'],F.seed));box(0,y,L,3.6,shade(st.shopWall||F.body));
  const nb=Math.max(1,Math.round(L/(kind==='neilsons'?4:3.1))),sb=L/nb;
  for(let i=0;i<nb;i++){
   const x=i*sb+.18,w=sb-.36;box(x,y+.65,w,2.75,ivory);if(kind==='books'){arch(x+.09,y+.74,w-.18,2.48,glass);box(x,y+3.24,w,.2,shade('#3e3f36'))}else box(x+.09,y+.74,w-.18,2.48,glass);box(x+.12,y+2.6,w-.24,.06,ivory);
   if(kind==='books'&&UPX<.25){for(let r=0;r<3;r++){box(x+.15,y+1.2+r*.55,w-.3,.06,ivory);for(let k=0;k<9;k++)box(x+.2+k*(w-.4)/9,y+.9+r*.55,(w-.4)/9-.025,.28,shade(['#ad725b','#c6b387','#698475','#ab9e73'][k%4]))}}
   if(i===Math.floor(nb/2)){box(x+w*.48,y+.7,.07,2.6,ivory);box(x+w*.45,y+2.1,.07,.18,shade('#c8b282'))}
  }
  if(UPX<.5&&kind!=='books'){   // bulkhead, transom bar, cast-iron pilasters and a recessed door
   box(0,H-.44,L,.44,shade('#4b4f48'));for(let i=0;i<=nb;i++)box(Math.min(L-.16,Math.max(0,i*sb-.08)),y+.5,.16,3.1,fascia);box(0,y+1.2,L,.07,ivory);
   const dc=Math.floor(nb/2)*sb+sb/2;box(dc-.58,y+1.27,1.16,2.33,shade('#2f3a35'));box(dc-.44,y+1.42,.88,1.5,glass);box(dc+.3,y+2.5,.06,.2,shade('#c8b282'));
   if(UPX<.2)for(let i=0;i<nb;i++)for(let k=1;k<4;k++)box(i*sb+.2+k*(sb-.4)/4,y+.72,.03,.46,ivory)}
  box(.06,y+.03,L-.12,.48,fascia);const label=st.signName||F.sign;
  if(label)text(label,L/2,y+.27,L-.4,Math.min(.48,L/Math.max(9,label.length)*1.3));
  if(kind==='bank'){box(0,upperH-.35,L,.35,ivory);text('BANK',L/2,.9,L*.75,.7)}
  if(kind==='neilsons'){box(0,H-4.2,L,.45,ivory);text('NEILSON’S',L/2,H-3.95,Math.min(13,L*.75),.65,shade('#644e35'))}
  if(kind==='lyric'){box(0,H-5.2,L,1.35,shade('#e2d8c0'));text('THE LYRIC',L/2,H-4.5,L*.8,.8,shade('#9d503b'))}
  return true;
 }
 return false;
}

/* Atmospheric detail layer: physical façade relief, planted wind, people and parked transport. */
let WIND_LEVEL=1;let SCENE_STATS={};
const windField=(x,y,t)=>WIND_LEVEL*(.45+.28*Math.sin(t*.43+x*.012)+.18*Math.sin(t*.91+y*.018));
function facadeRelief(F){
 if(!F.st.arch||F.st.arch==='blank'||F.cut||F.len<2||UPX>.75)return '';
 const Q=(s,d,z)=>[F.start[0]+F.along[0]*s+F.n[0]*d,F.start[1]+F.along[1]*s+F.n[1]*d,z];
 const box3=(x,w,z,h,d,col)=>{const A=[Q(x,.005,z),Q(x+w,.005,z),Q(x+w,d,z),Q(x,d,z)],B=A.map(p=>[p[0],p[1],z+h]);let s='';const faces=[B,[A[0],A[1],B[1],B[0]],[A[1],A[2],B[2],B[1]],[A[2],A[3],B[3],B[2]],[A[3],A[0],B[0],B[3]]];for(const f of faces){const n=vNewell(f);if(n&&vis(n))s+=shape(f,tone(n,soft(col)),.25)}return s};
 let s='';const H=F.h-F.z,stone=F.st.trim||'#e8e1cd';
 s+=box3(0,F.len,F.h-.22,.22,.28,stone)+box3(0,F.len,F.z,.26,.17,'#b3ab93');
 if(F.shop&&F.len>4){const G=F.st.gallery,C=F.st.canopy;
  if(G&&H>6){   // an upstairs gallery on posts with a railing; "roofed" carries a tin roof on the same posts
   const d=F.st.galleryDepth||2.4,z=F.z+3.72,roofed=G==='roofed',top=roofed?Math.min(F.h-.25,z+3):z+1,nb=Math.max(1,Math.round(F.len/3.3)),iron=F.st.galleryRail||'#3d4a43',post=F.st.galleryPost||'#e9e4d2';
   for(let i=0;i<=nb;i++){const x=Math.min(F.len-.1,Math.max(.1,i*F.len/nb));s+=stick(Q(x,d-.12,F.z),Q(x,d-.12,top),F.st.galleryPostR||.07,post)}
   s+=box3(0,F.len,z-.17,.17,d,'#d6d2bf');
   for(const zz of [z+.98,z+.14])s+=edge(Q(0,d-.08,zz),Q(F.len,d-.08,zz),iron,.07)+edge(Q(0,.05,zz),Q(0,d-.08,zz),iron,.07)+edge(Q(F.len,.05,zz),Q(F.len,d-.08,zz),iron,.07);
   if(UPX<.42)for(let x=.2;x<F.len;x+=.24)s+=edge(Q(x,d-.08,z+.14),Q(x,d-.08,z+.98),iron,.03);
   if(roofed){const rc=F.st.galleryRoof||'#7d8a82',r=[Q(-.2,0,top+.5),Q(F.len+.2,0,top+.5),Q(F.len+.2,d+.25,top),Q(-.2,d+.25,top)];s+=shape(r,tone([F.n[0]*.4,F.n[1]*.4,.9],soft(rc)),.4);if(UPX<.5)for(let x=.3;x<F.len;x+=.55)s+=edge(Q(x,.02,top+.51),Q(x,d+.24,top+.01),mix(rc,'#2f3a35',.3),.03)}
   if(UPX<.5&&!F.st.galleryPlain)for(let i=0;i<nb;i++)if((i+F.seed)%2===0){const c=Q((i+.5)*F.len/nb,d-.35,z+.28);s+=ball(c,.26,soft((SEASON.leaves==='bare')?'#8b8f6d':'#6f9467'),.2)}
  }else if(C){   // a canopy over the pavement, on posts unless canopyPosts is false
   const d=F.st.canopyDepth||2.5,z=F.z+3.7,col=typeof C==='string'?C:'#4a514d',nb=Math.max(1,Math.round(F.len/3.6));
   if(F.st.canopyPosts!==false)for(let i=0;i<=nb;i++){const x=Math.min(F.len-.1,Math.max(.1,i*F.len/nb));s+=stick(Q(x,d-.15,F.z),Q(x,d-.15,z),.06,F.st.canopyPost||'#3a403c')}
   s+=shape([Q(-.1,0,z+.5),Q(F.len+.1,0,z+.5),Q(F.len+.1,d,z),Q(-.1,d,z)],tone([F.n[0]*.4,F.n[1]*.4,.9],soft(col)),.4)+shape([Q(-.1,d,z),Q(F.len+.1,d,z),Q(F.len+.1,d,z-.24),Q(-.1,d,z-.24)],tone(F.n,soft(mix(col,'#1f2421',.25))),.3)}
  if(F.st.motif==='diamonds'){const o=F.st.trim2||'#e5793a';   // stepped parapet with capped piers
   for(let i=0;i<4;i++){const x=i*(F.len-.7)/3;s+=box3(x,.7,F.h,.55,.34,o)}
   s+=box3(F.len/2-1.7,3.4,F.h,.75,.3,F.body||'#f0c88a')+box3(F.len/2-1,2,F.h+.75,.5,.32,o)}
 }
 const kind=F.st.arch;if(['arcade','belfry','cityhall','turret','rounded-wing'].includes(kind))return s;
 const nf=F.st.archFloors||Math.max(1,Math.round(H/(F.st.floor||4.2))),rh=H/nf;
 const bw=F.len/Math.max(1,Math.round(F.len/(F.st.bay||3.8)));
 if(UPX<.42)for(let j=0;j<nf;j++)for(let x=bw*.5;x<F.len;x+=bw){const w=Math.min(1.4,bw*.42),z=F.h-j*rh-rh*.8;s+=box3(x-w/2-.12,w+.24,z-.12,.13,.22,stone);if(j<nf-1&&['shop','books','grocery','campus-sash'].includes(kind))s+=box3(x-w/2-.15,w+.3,z+rh*.58,.12,.12,stone)}
 return s;
}
function wavingFlag(x,y,h,t,kind){
 let s=stick([x,y,0],[x,y,h],.075,'#6a7567')+ball([x,y,h+.06],.12,soft('#c5b17d'),.2);
 const v=windField(x,y,t),width=kind==='us'?2.9:2.3,height=kind==='us'?1.52:1.3;
 const Q=(u,z)=>[x+u,y+.12*u+Math.sin(u*2.1-t*2.1)*.2*v*(u/width),h-.35-z+Math.sin(u*1.8-t*1.7)*.06*v];
 const strips=kind==='us'?13:3;
 for(let row=0;row<strips;row++)for(let i=0;i<7;i++){const a=i*width/7,b=(i+1)*width/7,z0=row*height/strips,z1=(row+1)*height/strips,col=kind==='us'?(row%2?'#f0ead6':'#ac5147'):['#34556e','#eee4ce','#af514b'][row];s+=shape([Q(a,z0),Q(b,z0),Q(b,z1),Q(a,z1)],col,.08)}
 if(kind==='us')for(let i=0;i<3;i++){const a=i*width*.43/3,b=(i+1)*width*.43/3;s+=shape([Q(a,0),Q(b,0),Q(b,height*7/13),Q(a,height*7/13)],'#3b5570',.1);if(UPX<.25)for(let j=0;j<3;j++)s+=ball(Q((a+b)/2,(j+.5)*height*7/39),.035,soft('#ede6d1'),0)}
 return s;
}
function parkedBicycle(x,y,angle,col,t=0){
 const d=[Math.cos(angle),Math.sin(angle)],n=[-d[1],d[0]],P=(u,z,v=0)=>[x+d[0]*u+n[0]*v,y+d[1]*u+n[1]*v,z];let s='';
 for(const u of[-.56,.56]){const r=Array.from({length:25},(_,i)=>P(u+Math.cos(i*Math.PI/12)*.34,.35+Math.sin(i*Math.PI/12)*.34));s+=edge(r[0],r[1],'#434b49',.06);for(let i=0;i<24;i++)s+=edge(r[i],r[i+1],'#434b49',.055);if(UPX<.35)for(let i=0;i<6;i++){let a=i*Math.PI/3;s+=edge(P(u,.35),P(u+.31*Math.cos(a),.35+.31*Math.sin(a)),'#a1a99e',.025)}}
 for(const[a,b]of[[[-.56,.35],[-.12,.78]],[[-.12,.78],[-.02,.35]],[[-.02,.35],[-.56,.35]],[[-.12,.78],[.37,.75]],[[.37,.75],[-.02,.35]],[[.37,.75],[.56,.35]],[[.37,.75],[.43,1.02]]])s+=stick(P(...a),P(...b),.035,col);
 s+=stick(P(-.23,.86),P(-.05,.86),.065,'#49574f')+stick(P(.43,1.02,-.22),P(.43,1.02,.22),.03,'#748075');return s;
}
let LIFE_CACHE_KEY='',LIFE_CROWD=[],LIFE_STATIC=[];
function prepareStreetLife(){
 const k=SEASON.id+':'+PHONE;if(k===LIFE_CACHE_KEY)return;LIFE_CACHE_KEY=k;LIFE_CROWD=[];LIFE_STATIC=[];
 const life=CITY.life||{},special=SEASON.id===life.eventId;
 const groups=special?life.eventCrowd||[]:(life.ordinaryCrowd||[]).reduce((a,p,i)=>{if(i%6===0)a.push([]);a[a.length-1].push(p);return a},[]);
 let person=5000;
 for(const group of groups){const points=group.filter((p,i)=>!(PHONE&&special&&i%2)&&standable(p[0],p[1],.4));if(!points.length)continue;
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),fp=rect((Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2,Math.max(...xs)-Math.min(...xs)+1,Math.max(...ys)-Math.min(...ys)+1);
 const crowd=points.map(([x,y,a])=>{const id=person++;return{...pedDressed(id),id,idle:true,p:[x,y],d:[Math.cos(a),Math.sin(a)],walked:0,kind:'ped',alpha:1}});
 LIFE_CROWD.push({fp,h:2.1,flat:true,count:crowd.length,draw:t=>crowd.slice().sort((a,b)=>depthOf([...a.p,0])-depthOf([...b.p,0])).map(p=>lifted(groundZ(p.p[0],p.p[1]),()=>pedestrian(p,t).svg)).join('')});
 }
 for(const[x,y,a,k]of life.parkedCars||[]){const d=[Math.cos(a),Math.sin(a)],props=carProps(20000+k*11+Math.round(x+y));const actor={...props,p:[x,y],d,v:0,s:0};const model=carDraw(actor);LIFE_STATIC.push({fp:model.fp,h:model.z1,draw:()=>carDraw(actor).svg})}
 for(const[x,y,a]of life.bikeRacks||[]){const P=(u,v)=>[x+Math.cos(a)*u-Math.sin(a)*v,y+Math.sin(a)*u+Math.cos(a)*v];LIFE_STATIC.push({fp:rect(x,y,5.5,2.5),h:1.5,draw:()=>{let s='';for(let i=0;i<4;i++){const p=P((i-1.5)*1.1,0);if(!standable(...p,.3))continue;const q=P((i-1.5)*1.1,.55);s+=stick([q[0],q[1],0],[q[0],q[1],.9],.035,'#758276')+parkedBicycle(p[0],p[1],a+Math.PI/2,['#476d77','#ad6650','#73835f','#b4a166'][i])}return s}})}
}
function streetLife(t){
 prepareStreetLife();SCENE_STATS.crowd=LIFE_CROWD.reduce((sum,g)=>sum+g.count,0);SCENE_STATS.wind=WIND_LEVEL;const out=[];
 for(let i=0;i<LIFE_STATIC.length;i++){const p=LIFE_STATIC[i];out.push({...p,draw:()=>stamp('life-static'+i,p.draw,p.fp,0,p.h+.3)})}
 out.push(...LIFE_CROWD);
 for(const[x,y,h,kind]of(CITY.life||{}).flagpoles||[])out.push({fp:rect(x+1,y,3,1),h:h+.5,draw:()=>wavingFlag(x,y,h,t,kind)});
 return out;
}
function driftingLeaves(t){
 if(!WIND_LEVEL||!['autumn','doubledecker','gameday'].includes(SEASON.id))return '';
 let s='';const count=PHONE?16:38;
 for(let i=0;i<count;i++){const tr=TREES[(i*17)%TREES.length];if(!tr)continue;const phase=(t*.07+rnd(i*7.1))%1;let z=tr.h*(1-phase);const gust=windField(tr.x,tr.y,t);const x=tr.x+phase*5*gust+Math.sin(t+i)*.25,y=tr.y+phase*1.7+Math.cos(i+t)*.3;z+=groundZ(x,y);if(Math.abs(x)>HALF-1||Math.abs(y)>HALF-1)continue;const a=.16,at=([u,v])=>[x+u,y+v,z];s+=shape([[0,-a],[a*.5,0],[0,a],[-a*.5,0]].map(at),i%2?'#ba8a4e':'#b4724d',.12)}return s;
}

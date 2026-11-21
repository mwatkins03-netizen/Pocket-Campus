/* Groundworks: the ground as material and relief.
   CITY.ground switches it on and describes the hand-placed parts.

   materials   procedural tiles painted on the ground in plan and repeated: lawn, asphalt, concrete, concrete panels,
               herringbone brick, running brick, pavers, stone slabs, pine-straw mulch, soil. They follow the season.
   relief      the measured terrain shaded from the same light as the cast shadows, so slopes read as slopes
   planting    mulch rings and grates under trees, mulched beds with shrubs along building walls
   edges       a shaded gutter along every kerb, a trimmed edge to every lawn, a contact shadow under every building
   works       CITY.ground.works: forecourts built from a small vocabulary, each group in the frame of a wall
               (s runs along the wall from frame.o toward frame.to, t runs out from it):
                 pave  bed  steps  planter  bench  lamp  bollards  bikes  sign  arch  bin  fence
   Everything low (under knee height) is painted with the ground; everything taller is a sorted object. */
const GW=CITY.ground||{},GW_ON=!!CITY.ground&&GW.detail!==false;
const gwS=c=>SEASON.snow?snowy(c,.8):SEASON.wet?mix(c,'#6f7390',.14):c,gwN=c=>SEASON.night?nightCol(c):c,gwC=c=>gwN(gwS(c));
const GW_TILES=new Map();
const GW_MAT={
  lawn:{size:16,draw(g,W,k,base){
    const lo=mix(base,'#4f6b45',.5),hi=mix(base,'#e9e6a8',.5),bare=SEASON.leaves==='bare';
    blobs(g,W,k,46,1.2,3.4,[lo,hi,mix(base,'#8a7a4a',.5)],.085,3);
    if(k>=12){g.lineWidth=Math.max(1,.05*k);g.lineCap='round';
      for(const [n,c,a] of [[1500,lo,.5],[900,hi,.45],[bare?700:160,mix(base,'#9a8656',.6),.5]]){g.strokeStyle=gwC(c);g.globalAlpha=a;g.beginPath();
        for(let i=0;i<n;i++){const x=rnd(i*1.31+n)*W,y=rnd(i*2.17+n*.3)*W,l=(.1+.14*rnd(i*.7))*k,a2=-1.2-.8*rnd(i*3.3);g.moveTo(x,y);g.lineTo(x+Math.cos(a2)*l,y+Math.sin(a2)*l)}g.stroke()}}
    if(SEASON.leaves==='autumn'&&k>=12)for(let i=0;i<260;i++){g.globalAlpha=.75;g.fillStyle=gwC(['#c98a3c','#b5653a','#d9a74a','#9c5a35'][i%4]);g.beginPath();g.ellipse(rnd(i*5.1)*W,rnd(i*8.3)*W,.09*k,.05*k,rnd(i)*3,0,7);g.fill()}
    g.globalAlpha=1}},
  ground:{size:14,draw(g,W,k,base){blobs(g,W,k,40,1,3,[mix(base,'#8d7c62',.5),mix(base,'#ffffff',.5),mix(base,'#9aa37a',.5)],.09,7);speck(g,W,k,900,base,.5)}},
  asphalt:{size:12,draw(g,W,k,base){
    blobs(g,W,k,26,1.2,3.2,[mix(base,'#4d4a55',.5),mix(base,'#ffffff',.45)],.08,11);speck(g,W,k,2600,base,.75);
    if(k>=12){for(let i=0;i<5;i++){g.globalAlpha=.16;g.fillStyle=gwC('#55525c');const x=rnd(i*3.9+2)*W,y=rnd(i*7.3)*W;g.fillRect(x,y,(1+2*rnd(i))*k,(.8+1.4*rnd(i*2))*k)}   // patched repairs
      g.globalAlpha=.3;g.strokeStyle=gwC('#4c4a52');g.lineWidth=Math.max(1,.025*k);for(let i=0;i<7;i++){let x=rnd(i*9.1)*W,y=rnd(i*4.4)*W;g.beginPath();g.moveTo(x,y);for(let j=0;j<6;j++){x+=(rnd(i*7+j)-.4)*.7*k;y+=(rnd(i*3+j*5)-.5)*.6*k;g.lineTo(x,y)}g.stroke()}}
    g.globalAlpha=1}},
  concrete:{size:9,draw(g,W,k,base){blobs(g,W,k,30,.8,2.4,[mix(base,'#6e665c',.5),mix(base,'#ffffff',.6)],.07,5);speck(g,W,k,1300,base,.5)}},
  panel:{size:6,draw(g,W,k,base,o){
    const p=(o.size||1.5)*k,n=Math.round(W/p);
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){const r=rnd(i*3.7+j*9.1+n);g.fillStyle=gwC(r<.16?mix(base,'#ffffff',.3):r<.4?mix(base,'#857a6b',.14):r<.55?mix(base,'#c9a877',.12):base);g.fillRect(i*p,j*p,p+1,p+1)}
    blobs(g,W,k,16,.5,1.6,[mix(base,'#6e665c',.5)],.07,23);speck(g,W,k,700,base,.45);
    if(k>=6)for(let i=0;i<n;i++){const q=Math.round(i*p);g.fillStyle=gwC(mix(base,'#4f463d',.5));g.fillRect(q,0,Math.max(1,.035*k),W);g.fillRect(0,q,W,Math.max(1,.035*k));
      g.fillStyle=gwC(mix(base,'#ffffff',.6));g.globalAlpha=.6;g.fillRect(q+Math.max(1,.035*k),0,Math.max(1,.02*k),W);g.fillRect(0,q+Math.max(1,.035*k),W,Math.max(1,.02*k));g.globalAlpha=1}}},
  brick:{size:3.52,draw(g,W,k,base,o){   // herringbone: cells in fours along each diagonal, two laid flat and two on end
    const c=W/16,j0=Math.max(.6,.022*k),T=o.tones||['#a4553f','#b0634a','#96493a','#b8704f','#8d4a3c','#a85c44'];
    g.fillStyle=gwC(mix(base,'#e3d6bd',.35));g.fillRect(0,0,W,W);
    for(let j=0;j<17;j++)for(let i=-1;i<16;i++){const m=(((i-j)%4)+4)%4;let x,y,w,h;
      if(m===0){x=i*c;y=j*c;w=2*c;h=c}else if(m===2){x=i*c;y=(j-1)*c;w=c;h=2*c}else continue;
      const tn=gwC(T[Math.floor(rnd((i&15)*7.3+(j&15)*3.1+m)*T.length)%T.length]);
      for(const [dx,dy] of [[0,0],[W,0],[-W,0],[0,W],[0,-W]]){if(x+dx>=W||y+dy>=W||x+dx+w<=0||y+dy+h<=0)continue;
        g.fillStyle=tn;g.fillRect(x+dx+j0,y+dy+j0,w-2*j0,h-2*j0);
        if(k>=24){g.fillStyle='rgba(255,236,214,.2)';g.fillRect(x+dx+j0,y+dy+j0,w-2*j0,Math.max(1,.02*k));g.fillStyle='rgba(60,30,24,.2)';g.fillRect(x+dx+j0,y+dy+h-j0-Math.max(1,.02*k),w-2*j0,Math.max(1,.02*k))}}}}},
  paver:{size:4.8,draw(g,W,k,base,o){bond(g,W,k,base,.3,.6,o.tones||[mix(base,'#ffffff',.18),base,mix(base,'#6a6259',.2),mix(base,'#b79a78',.22)],.5)}},
  brickrun:{size:3.52,draw(g,W,k,base,o){bond(g,W,k,mix(base,'#e3d6bd',.35),.22,.44,o.tones||['#a4553f','#b0634a','#96493a','#b8704f','#8d4a3c'],1)}},
  stone:{size:9.6,draw(g,W,k,base,o){bond(g,W,k,base,.6,1.2,[mix(base,'#ffffff',.22),base,mix(base,'#7b7264',.16),mix(base,'#d8b98c',.16)],.4);speck(g,W,k,500,base,.35)}},
  mulch:{size:5,draw(g,W,k,base){   // pine straw: needles lying every way in three rusts
    blobs(g,W,k,18,.5,1.4,[mix(base,'#5a321d',.6),mix(base,'#d9a066',.5)],.14,31);
    if(k>=12){g.lineCap='round';for(const [n,c,a,lw] of [[900,'#7a4526',.55,.03],[1300,'#c98a55',.6,.022],[700,'#e2b27c',.45,.018],[400,'#5d351f',.5,.03]]){g.strokeStyle=gwC(c);g.globalAlpha=a;g.lineWidth=Math.max(1,lw*k);g.beginPath();
      for(let i=0;i<n;i++){const x=rnd(i*1.9+n)*W,y=rnd(i*2.7+n*.2)*W,l=(.16+.22*rnd(i*.3+n))*k,t=rnd(i*5.7+n)*6.28;g.moveTo(x,y);g.lineTo(x+Math.cos(t)*l,y+Math.sin(t)*l)}g.stroke()}}
    g.globalAlpha=1}},
  soil:{size:5,draw(g,W,k,base){blobs(g,W,k,20,.4,1.2,[mix(base,'#2f241b',.5),mix(base,'#b59676',.5)],.14,41);speck(g,W,k,1200,base,.8)}}
};
function blobs(g,W,k,n,r0,r1,cols,a,seed){
  for(let i=0;i<n;i++){const x=rnd(i*1.7+seed)*W,y=rnd(i*3.1+seed*2)*W,rx=(r0+(r1-r0)*rnd(i*.9+seed))*k,ry=rx*(.45+.5*rnd(i*2.3+seed)),t=rnd(i*4.1+seed)*3.14;
    g.globalAlpha=a;g.fillStyle=gwC(cols[i%cols.length]);
    for(const dx of [-W,0,W])for(const dy of [-W,0,W]){if(x+dx+rx<0||x+dx-rx>W||y+dy+rx<0||y+dy-rx>W)continue;g.beginPath();g.ellipse(x+dx,y+dy,rx,ry,t,0,6.3);g.fill();g.globalAlpha=a*.6;g.beginPath();g.ellipse(x+dx,y+dy,rx*.55,ry*.55,t,0,6.3);g.fill();g.globalAlpha=a}}
  g.globalAlpha=1}
function speck(g,W,k,n,base,a){
  if(k<12)n=n>>2;const lo=gwC(mix(base,'#4b4650',.45)),hi=gwC(mix(base,'#ffffff',.55)),s=Math.max(1,.045*k);
  for(let i=0;i<n;i++){g.globalAlpha=a*(.25+.3*rnd(i*.77));g.fillStyle=i%2?lo:hi;g.fillRect(rnd(i*1.13+.3)*W,rnd(i*2.71+.9)*W,s*(1+rnd(i*3.3)*1.6),s)}
  g.globalAlpha=1}
function bond(g,W,k,joint,h,l,tones,bevel){   // stones or bricks in running bond
  const rows=Math.round(W/(h*k)),hh=W/rows,cols=Math.round(W/(l*k)),ll=W/cols,j0=Math.max(.6,.02*k);
  g.fillStyle=gwC(mix(joint,'#5a5148',.28));g.fillRect(0,0,W,W);
  for(let r=0;r<rows;r++)for(let c=-1;c<cols;c++){const x=(c+(r%2)*.5)*ll,y=r*hh;g.fillStyle=gwC(tones[Math.floor(rnd(((c+cols)%cols)*5.3+r*2.9+.4)*tones.length)%tones.length]);
    g.fillRect(x+j0,y+j0,ll-2*j0,hh-2*j0);
    if(k>=24&&bevel){g.fillStyle='rgba(255,246,226,'+.22*bevel+')';g.fillRect(x+j0,y+j0,ll-2*j0,Math.max(1,.02*k));g.fillStyle='rgba(50,40,34,'+.2*bevel+')';g.fillRect(x+j0,y+hh-j0-Math.max(1,.02*k),ll-2*j0,Math.max(1,.02*k))}}}
function gwTile(mat,base,o={}){
  const M=GW_MAT[mat]||GW_MAT.concrete,ppm=[4,6,12,24,36,48].find(v=>v>=1.25*CAM_K/UPX)||48;
  const key=[mat,base,ppm,SEASON_ID,o.size||'',(o.tones||[]).join('')].join('|');let t=GW_TILES.get(key);
  if(!t){if(GW_TILES.size>90)GW_TILES.clear();const W=Math.max(8,Math.round(M.size*(o.size&&mat==='panel'?o.size/1.5:1)*ppm)),cv=new OffscreenCanvas(W,W),g=cv.getContext('2d');
    g.fillStyle=gwC(base);g.fillRect(0,0,W,W);M.draw(g,W,ppm,base,o);t={cv,ppm};GW_TILES.set(key,t)}
  return t}
// fill the current clip with a material, in plan metres about (cx, cy), turned by ang
function gwFill(ctx,mat,base,cx,cy,R,ang,o){
  const t=gwTile(mat,base,o);ctx.save();ctx.translate(cx,cy);if(ang)ctx.rotate(ang);ctx.scale(1/t.ppm,1/t.ppm);ctx.fillStyle=ctx.createPattern(t.cv,'repeat');
  ctx.fillRect(-R*t.ppm,-R*t.ppm,2*R*t.ppm,2*R*t.ppm);ctx.restore()}

/* ---------- what stands where: worked out once from the map ---------- */
const GW_PATCH=[],GW_SHRUBS=[],GW_RINGS=[],GW_GRATES=[],GW_BEDS=[],GW_JOINTS=[];
const gwPaved=p=>inRings(p,SCENE.roads)||inRings(p,SCENE.paths)||inRings(p,SCENE.walk)||inRings(p,SCENE.water||[]);
const gwInPatch=p=>GW_PATCH.some(q=>inside(p,q.ring));
const gwHardPatch=p=>{let hit=null;for(const q of GW_PATCH)if(inside(p,q.ring))hit=q;return !!hit&&hit.mat!=='lawn'};
function gwFrame(fr){
  if(!fr)return {pt:(s,t)=>[s,t],ang:0,u:[1,0],n:[0,1]};
  const [ox,oy]=fr.o,dx=fr.to[0]-ox,dy=fr.to[1]-oy,l=Math.hypot(dx,dy),u=[dx/l,dy/l],n=fr.flip?[-u[1],u[0]]:[u[1],-u[0]];
  return {pt:(s,t)=>[ox+u[0]*s+n[0]*t,oy+u[1]*s+n[1]*t],ang:Math.atan2(u[1],u[0]),u,n}}
const gwRing=(F,it)=>it.r?[F.pt(it.r[0],it.r[1]),F.pt(it.r[2],it.r[1]),F.pt(it.r[2],it.r[3]),F.pt(it.r[0],it.r[3])]:it.p?it.p.map(q=>F.pt(q[0],q[1])):
  (()=>{const L=it.line.map(q=>F.pt(q[0],q[1])),w=(it.w||3)/2,a=[],b=[];   // a band of width w along a line
    for(let i=0;i<L.length;i++){const p=L[Math.max(0,i-1)],q=L[Math.min(L.length-1,i+1)],d=Math.hypot(q[0]-p[0],q[1]-p[1])||1,nx=-(q[1]-p[1])/d,ny=(q[0]-p[0])/d;a.push([L[i][0]+nx*w,L[i][1]+ny*w]);b.unshift([L[i][0]-nx*w,L[i][1]-ny*w])}
    return a.concat(b)})();
const gwDense=r=>{const o=[];for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/3));for(let k=0;k<n;k++)o.push([a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n])}return o};
const gwBox=(ring,z0,z1,col,top)=>block(ccw(ring),z0,z1,{facade:'plain',arch:'blank',wall:col,top:top||col,shop:'none'}).draw();
const GW_GREENS=['#5f8455','#6e9160','#557a52','#7a9a66','#64875a'];
function gwPlant(x,y,r,kind,seed){GW_SHRUBS.push({x,y,r,kind,c:GW_GREENS[Math.floor(rnd(seed*3.3+1)*5)%5],seed})}
function gwScatter(ring,gap,kind,seed0){
  const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);let k=0;
  for(let y=Math.min(...ys)+gap*.5;y<Math.max(...ys);y+=gap)for(let x=Math.min(...xs)+gap*.5;x<Math.max(...xs);x+=gap){k++;
    const q=[x+(rnd(k*1.7+seed0)-.5)*gap*.55,y+(rnd(k*2.9+seed0)-.5)*gap*.55];
    const mg=kind==='flowers'?.28:.55;if(!inside(q,ring)||[[mg,0],[-mg,0],[0,mg],[0,-mg]].some(d=>!inside([q[0]+d[0],q[1]+d[1]],ring)))continue;
    gwPlant(q[0],q[1],kind==='flowers'?.3+.08*rnd(k):kind==='grass'?.34+.12*rnd(k):kind==='low'?.3+.15*rnd(k):.42+.26*rnd(k*.7),kind,k+seed0)}}

/* ---------- forecourt objects ---------- */
const GW_METAL='#34393a';
function gwSapling(x,y,z,h,seed){
  const lv=SEASON.leaves,c=SEASON.snow?'#e6ece6':lv==='bare'?null:lv==='autumn'?['#c9903f','#b8683a','#d4a84a'][seed%3]:lv==='spring'?['#9dbd7c','#e7b9c8','#a9c486'][seed%3]:['#7fa468','#87ab6d','#75995f'][seed%3];
  let s=stick([x,y,z],[x,y,z+h*.62],.05,'#7d6650');
  if(!c){for(let i=0;i<5;i++){const a=i*1.26+seed;s+=stick([x,y,z+h*(.4+.06*i)],[x+Math.cos(a)*h*.2,y+Math.sin(a)*h*.2,z+h*(.72+.05*i)],.022,'#7d6650')}return s}
  const m=soft(c);for(let i=0;i<4;i++){const a=i*1.57+seed;s+=ball([x+Math.cos(a)*h*.13,y+Math.sin(a)*h*.13,z+h*(.58+.07*(i%2))],h*.17,m,.3)}
  return s+ball([x,y,z+h*.82],h*.19,m,.3)}
function gwBench(x,y,a,wood){const slat=wood||'#4a504f';
  const d=[Math.cos(a),Math.sin(a)],n=[-d[1],d[0]],Q=(u,v,z)=>[x+d[0]*u+n[0]*v,y+d[1]*u+n[1]*v,z];
  streetFurniture.push(obj([Q(-1,-.4,0),Q(1,-.4,0),Q(1,.4,0),Q(-1,.4,0)].map(p=>[p[0],p[1]]),1,()=>{
    let s='';for(const u of [-.82,.82])s+=stick(Q(u,-.2,0),Q(u,-.2,.44),.035,GW_METAL)+stick(Q(u,.22,0),Q(u,.26,.92),.035,GW_METAL)+stick(Q(u,-.24,.62),Q(u,.24,.62),.03,GW_METAL);
    s+=shape([Q(-.9,-.26,.45),Q(.9,-.26,.45),Q(.9,.2,.45),Q(-.9,.2,.45)],slat,.35);
    for(const z of [.6,.74,.88])s+=stick(Q(-.88,.25,z),Q(.88,.25,z),.035,slat);return s}))}
function gwLamp(x,y,twin){
  LAMP_AT.push([x,y]);const col='#2f4a3f',h=twin?4.6:4,gl=()=>SEASON.night?{l:'#fff3c4',m:'#fff3c4',d:'#ffd98a'}:soft('#f4efdc');
  streetFurniture.push(obj(rect(x,y,1.2,1.2),h+.9,()=>{let s=stick([x,y,0],[x,y,.9],.14,col)+stick([x,y,.9],[x,y,h],.07,col);
    if(twin){for(const dx of [-.42,.42])s+=stick([x,y,h-.25],[x+dx,y,h-.05],.035,col)+stick([x+dx,y,h-.05],[x+dx,y,h+.1],.06,col)+ball([x+dx,y,h+.34],.24,gl(),.35);s+=stick([x,y,h],[x,y,h+.35],.05,col)}
    else s+=ball([x,y,h+.26],.27,gl(),.35)+stick([x,y,h+.5],[x,y,h+.62],.08,col);return s}))}
function gwBollards(pts,gap,chain){
  for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],l=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.round(l/gap)),at=k=>[a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n];
    for(let k=0;k<n+(i===pts.length-2?1:0);k++){const p=at(k),q=k<n?at(k+1):null,g0=groundZ(p[0],p[1]),dz=q?groundZ(q[0],q[1])-g0:0;
      streetFurniture.push(obj(q&&chain?[[p[0]-.1,p[1]-.1],[q[0]+.1,q[1]-.1],[q[0]+.1,q[1]+.1],[p[0]-.1,p[1]+.1]]:rect(p[0],p[1],.3,.3),1,()=>{
        let s=stick([p[0],p[1],0],[p[0],p[1],.82],.055,GW_METAL)+ball([p[0],p[1],.9],.08,soft(GW_METAL),.2);
        if(q&&chain){const c=[];for(let j=0;j<=6;j++){const u=j/6;c.push([p[0]+(q[0]-p[0])*u,p[1]+(q[1]-p[1])*u,.74+dz*u-Math.sin(Math.PI*u)*.2])}s+='<path d="'+pd(c,false)+'" fill="none" stroke="'+GW_METAL+'" style="stroke-width:'+f(.035*CAM_K)+'"/>'}
        return s}))}}}
function gwBikes(x,y,a,n,parked){
  const d=[Math.cos(a),Math.sin(a)],nn=[-d[1],d[0]],Q=(u,v,z)=>[x+d[0]*u+nn[0]*v,y+d[1]*u+nn[1]*v,z],w=n*.75;
  streetFurniture.push(obj([Q(-w/2-.2,-1,0),Q(w/2+.2,-1,0),Q(w/2+.2,1,0),Q(-w/2-.2,1,0)].map(p=>[p[0],p[1]]),1.2,()=>{let s='';
    for(let i=0;i<n;i++){const u=-w/2+i*.75+.37,c=[];for(let j=0;j<=8;j++){const t=j/8*Math.PI;c.push(Q(u-.3*Math.cos(t),0,.15+.72*Math.sin(t)))}
      s+='<path d="'+pd([Q(u-.3,0,0),...c,Q(u+.3,0,0)],false)+'" fill="none" stroke="'+GW_METAL+'" style="stroke-width:'+f(.06*CAM_K)+'"/>'}
    for(let i=0;i<(parked||0);i++){const p=Q(-w/2+.4+i*1.5,.1,0);s+=parkedBicycle(p[0],p[1],a+Math.PI/2+.08*(i%2?1:-1),['#387779','#ba7663','#4b4b55','#c9a23f'][i%4])}return s}))}
function gwSign(x,y,a,o){
  const d=[Math.cos(a),Math.sin(a)],n=[-d[1],d[0]],w=o.w||1.5,Q=(u,z,v=0)=>[x+d[0]*u+n[0]*v,y+d[1]*u+n[1]*v,z],blue=o.colour||'#1f3a6e';
  streetFurniture.push(obj([Q(-w/2,0,-.15),Q(w/2,0,-.15),Q(w/2,0,.15),Q(-w/2,0,.15)].map(p=>[p[0],p[1]]),2.1,()=>{
    let s='';for(const u of [-w/2,w/2])s+=stick(Q(u,0),Q(u,2),.05,'#f1eee6')+ball(Q(u,2.05),.07,soft('#f1eee6'),.2);
    s+=shape([Q(-w/2+.06,.75),Q(w/2-.06,.75),Q(w/2-.06,1.85),Q(-w/2+.06,1.85)],blue,.4);
    s+=ball(Q(0,1.68),.09,soft('#b3202a'),.15);
    for(const [z,k] of [[1.48,.62],[1.3,.5],[1.14,.7],[1.02,.66],[.9,.58]])s+='<path d="'+pd([Q(-w/2*k,z),Q(w/2*k,z)],false)+'" fill="none" stroke="#e9edf4" style="stroke-width:'+f((z>1.4?.07:.03)*CAM_K)+'"/>';
    return s}))}
function gwArch(x,y,a,o){   // two brick piers and a lettered metal arch over a walk
  const d=[Math.cos(a),Math.sin(a)],n=[-d[1],d[0]],sp=(o.span||4.6)/2,Q=(u,z,v=0)=>[x+d[0]*u+n[0]*v,y+d[1]*u+n[1]*v,z],ph=o.h||2.5,brickC=o.colour||'#a4553f';
  const pier=u=>[Q(u-.45,0,-.45),Q(u+.45,0,-.45),Q(u+.45,0,.45),Q(u-.45,0,.45)].map(p=>[p[0],p[1]]);
  streetFurniture.push(obj([Q(-sp-.5,0,-.5),Q(sp+.5,0,-.5),Q(sp+.5,0,.5),Q(-sp-.5,0,.5)].map(p=>[p[0],p[1]]),ph+2.4,()=>{let s='';
    for(const u of [-sp,sp]){s+=gwBox(pier(u),0,.25,'#d8cfb9')+gwBox(pier(u).map(p=>[x+(p[0]-x)*1,y+(p[1]-y)*1]),.25,ph,brickC)+gwBox(pier(u),ph,ph+.18,'#d8cfb9');
      for(const v of [-.47,.47])s+=ball(Q(u,ph*.62,v),.26,soft('#d9b25a'),.3)+ball(Q(u,ph*.62,v*1.02),.17,soft('#1f3a6e'),.15)}
    for(const [r0,lw] of [[0,.09],[.42,.09]]){const c=[];for(let j=0;j<=18;j++){const t=Math.PI*j/18;c.push(Q(-(sp-.1)*Math.cos(t),ph+.18+(1.5+r0)*Math.sin(t)+r0*.0))}
      s+='<path d="'+pd(c,false)+'" fill="none" stroke="'+GW_METAL+'" style="stroke-width:'+f(lw*CAM_K)+'"/>'}
    for(let j=1;j<18;j++){const t=Math.PI*j/18;s+='<path d="'+pd([Q(-(sp-.1)*Math.cos(t),ph+.18+1.5*Math.sin(t)),Q(-(sp-.1)*Math.cos(t),ph+.18+1.92*Math.sin(t))],false)+'" fill="none" stroke="'+(j%2?'#d9b25a':GW_METAL)+'" style="stroke-width:'+f((j%2?.13:.04)*CAM_K)+'"/>'}
    return s}))}
function gwFence(pts,o){   // iron railings on a low kerb wall, in short runs so people and cars sort against them; gates are left open
  const h=o.h||.95,wl=o.wall==null?.3:o.wall,col=o.colour||'#2c302f',stone=o.stone||'#cfc8b6',gates=o.gates||[],run=o.run||5;
  const open=p=>gates.some(g=>Math.hypot(p[0]-g[0],p[1]-g[1])<(g[2]||2.6));
  const L=o.closed===false?pts:pts.concat([pts[0]]);
  for(let i=0;i<L.length-1;i++){const a=L[i],b=L[i+1],l=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.round(l/run)),u=[(b[0]-a[0])/l,(b[1]-a[1])/l],nn=[-u[1]*.14,u[0]*.14];
    for(let k=0;k<n;k++){const p=[a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n],q=[a[0]+(b[0]-a[0])*(k+1)/n,a[1]+(b[1]-a[1])*(k+1)/n],m=[(p[0]+q[0])/2,(p[1]+q[1])/2];
      if(open(m)||open(p)||open(q))continue;const g0=groundZ(p[0],p[1]),dz=groundZ(q[0],q[1])-g0,sl=Math.hypot(q[0]-p[0],q[1]-p[1]);
      const fp=[[p[0]-nn[0],p[1]-nn[1]],[q[0]-nn[0],q[1]-nn[1]],[q[0]+nn[0],q[1]+nn[1]],[p[0]+nn[0],p[1]+nn[1]]];
      streetFurniture.push(Object.assign(obj(fp,h+wl+Math.abs(dz),()=>{const z=t=>dz*t;
        let s=wl?gwBox(fp,Math.min(0,dz)-.05,wl+Math.max(0,dz),stone,mix(stone,'#ffffff',.25)):'';
        const P3=(t,zz)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t,wl+z(t)+zz],ln=(A,B,w)=>'<path d="'+pd([A,B],false)+'" fill="none" stroke="'+col+'" style="stroke-width:'+f(w*CAM_K)+'" stroke-linecap="round"/>';
        s+=ln(P3(0,h),P3(1,h),.05)+ln(P3(0,.12),P3(1,.12),.04)+ln(P3(0,0),P3(0,h+.14),.07)+ln(P3(1,0),P3(1,h+.14),.07);
        if(UPX<.3){const np=Math.max(2,Math.round(sl/(UPX<.12?.25:.5)));let d='';for(let j=1;j<np;j++)d+=pd([P3(j/np,.12),P3(j/np,h)],false);
          s+='<path d="'+d+'" fill="none" stroke="'+col+'" style="stroke-width:'+f(.028*CAM_K)+'"/>';
          if(UPX<.12){let e='';for(let j=0;j<np;j++){const c=[];for(let m2=0;m2<=5;m2++){const t=(j+m2/5)/np;c.push(P3(t,h+.16*Math.sin(Math.PI*m2/5)))}e+=pd(c,false)}s+='<path d="'+e+'" fill="none" stroke="'+col+'" style="stroke-width:'+f(.024*CAM_K)+'"/>'}}
        return s}),{g:g0}))}}}
function gwSteps(F,it){
  const [s0,t0,s1,t1]=it.r,b=it.floor&&SCENE.buildings.find(q=>q.id===it.floor),col=it.colour||'#d8cfb9',nseg=Math.max(1,Math.round(Math.abs(s1-s0)/(it.seg||7)));
  for(let k=0;k<nseg;k++){const a=s0+(s1-s0)*k/nseg,c=s0+(s1-s0)*(k+1)/nseg,foot=F.pt((a+c)/2,t1),g=groundZ(foot[0],foot[1]),top=F.pt((a+c)/2,t0);
    let H=it.rise||(b?baseOf(b)-g:groundZ(top[0],top[1])-g);if(H<.12)continue;H=Math.min(it.maxRise||2.6,Math.max(.3,H));
    const n0=Math.max(2,Math.min(10,Math.round(H/.165))),fp=[F.pt(a,t0),F.pt(c,t0),F.pt(c,t1),F.pt(a,t1)];
    streetFurniture.push(Object.assign(obj(fp,H,()=>{let s='';const n=UPX>.45?1:UPX>.2?Math.min(n0,4):n0;for(let i=0;i<n;i++){const te=t0+(t1-t0)*(n-i)/n;s+=gwBox([F.pt(a,t0),F.pt(c,t0),F.pt(c,te),F.pt(a,te)],H*i/n,H*(i+1)/n,col,mix(col,'#ffffff',.25))}
      if(it.rail!==false&&k%2===0&&H>.6){const m=(a+c)/2,p0=F.pt(m,t0),p1=F.pt(m,t1);s+=stick([p0[0],p0[1],H],[p0[0],p0[1],H+.9],.03,GW_METAL)+stick([p1[0],p1[1],0],[p1[0],p1[1],.9],.03,GW_METAL)+stick([p0[0],p0[1],H+.9],[p1[0],p1[1],.9],.03,GW_METAL)}
      return s}),{g}))}}
function gwPlanter(F,it,seed){
  const [s0,t0,s1,t1]=it.r,ring=[F.pt(s0,t0),F.pt(s1,t0),F.pt(s1,t1),F.pt(s0,t1)],gs=ring.map(p=>groundZ(p[0],p[1])),g=Math.min(...gs),h=(it.h||.5)+Math.max(...gs)-g,w=it.wall||.24,col=it.colour||'#d3c9b2';
  const inn=[F.pt(s0+w,t0+w),F.pt(s1-w,t0+w),F.pt(s1-w,t1-w),F.pt(s0+w,t1-w)],c=centreOf(ring),L=Math.abs(s1-s0),D=Math.abs(t1-t0);
  streetFurniture.push(Object.assign(obj(ring,h+(it.tree?3.6:1),()=>{
    let s=gwBox(ring,0,h,col,mix(col,'#ffffff',.22))+shape(atZ(inn,h+.01),gwS('#9c6238'),.3);
    const nx=Math.max(1,Math.round((L-2*w)/1)),ny=Math.max(1,Math.round((D-2*w)/1));
    if(it.plants!=='none')for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){if(it.tree&&Math.abs(i-(nx-1)/2)<.6&&Math.abs(j-(ny-1)/2)<.6)continue;
      const p=F.pt(Math.min(s0,s1)+w+(i+.5)*(L-2*w)/nx,Math.min(t0,t1)+w+(j+.5)*(D-2*w)/ny),r=.3+.1*rnd(i*3+j*7+seed);
      s+=ball([p[0],p[1],h+r*.75],r,soft(gwS(GW_GREENS[(i+j+seed)%5])),.3)}
    if(it.tree)s+=gwSapling(c[0],c[1],h,it.tree===true?3.4:it.tree,seed);return s}),{g}))}
for(const [gi,grp] of (GW.works||[]).entries()){const F=gwFrame(grp.frame);
  for(const [ii,it] of (grp.items||[]).entries()){const seed=gi*37+ii,at=it.at?F.pt(it.at[0],it.at[1]):null,ang=F.ang+(it.a||0)*Math.PI/180;
    if(it.k==='pave'||it.k==='bed'){const ring=gwDense(gwRing(F,it));
      GW_PATCH.push({ring,mat:it.k==='bed'?(it.mat||'mulch'):it.mat||'panel',base:it.colour,ang:F.ang+(it.turn||0)*Math.PI/180,size:it.size,tones:it.tones,edge:it.edge,bed:it.k==='bed'});
      if(it.k==='bed'&&it.plants!=='none')gwScatter(ring,it.gap||1.5,it.plants||'shrub',seed)}
    else if(it.k==='steps')gwSteps(F,it);
    else if(it.k==='planter')gwPlanter(F,it,seed);
    else if(it.k==='bench')gwBench(at[0],at[1],ang,it.colour);
    else if(it.k==='fence')gwFence(it.line.map(q=>F.pt(q[0],q[1])),it);
    else if(it.k==='plant')gwPlant(at[0],at[1],it.r||.5,it.kind||'shrub',seed);
    else if(it.k==='lamp')gwLamp(at[0],at[1],it.twin!==false);
    else if(it.k==='bollards')gwBollards(it.line.map(q=>F.pt(q[0],q[1])),it.gap||2.2,it.chain!==false);
    else if(it.k==='bikes')gwBikes(at[0],at[1],ang,it.n||4,it.parked);
    else if(it.k==='sign')gwSign(at[0],at[1],ang,it);
    else if(it.k==='arch')gwArch(at[0],at[1],ang,it);
    else if(it.k==='bin')streetFurniture.push(obj(rect(at[0],at[1],.7,.7),1.1,()=>stick([at[0],at[1],0],[at[0],at[1],.92],.26,'#3f4a45')+stick([at[0],at[1],.92],[at[0],at[1],1],.29,'#2f3835')));
  }}
if(GW_ON){
  // trees: a ring of bare mulched earth on grass, an iron grate in paving
  for(const tr of TREES){const p=[tr.x,tr.y];if(gwHardPatch(p)||inRings(p,SCENE.roads))continue;
    if(!gwInPatch(p)&&(inRings(p,SCENE.paths)||inRings(p,SCENE.walk)))GW_GRATES.push([tr.x,tr.y]);else GW_RINGS.push([tr.x,tr.y,Math.min(1.5,.55+tr.ext*.13)])}
  // mulched beds with shrubs along building walls that face open ground
  if(GW.foundation){const F0=typeof GW.foundation==='object'?GW.foundation:{},gap=F0.gap||1.9,depth=F0.depth||2.1;let k=0;
    for(const b of SCENE.buildings){if(b.cut||b.area<60)continue;const r=b.ring,c=centreOf(r);
      for(let i=0;i<r.length;i++){const a=r[i],q=r[(i+1)%r.length],l=Math.hypot(q[0]-a[0],q[1]-a[1]);if(l<7)continue;
        const u=[(q[0]-a[0])/l,(q[1]-a[1])/l];let n=[u[1],-u[0]];const m=[(a[0]+q[0])/2,(a[1]+q[1])/2];
        if(inside([m[0]+n[0]*.6,m[1]+n[1]*.6],r))n=[-n[0],-n[1]];
        let s0=null;const runs=[];
        for(let s=1;s<=l-1;s+=1){const p=[a[0]+u[0]*s+n[0]*1.3,a[1]+u[1]*s+n[1]*1.3],ok=s<l-1&&!gwPaved(p)&&!gwInPatch(p)&&standable(p[0],p[1],0)&&!gwPaved([p[0]+n[0]*.9,p[1]+n[1]*.9]);
          if(ok&&s0===null)s0=s;if(!ok&&s0!==null){if(s-s0>=5)runs.push([s0,s-1]);s0=null}}
        for(const [x0,x1] of runs){const at=(s,t)=>[a[0]+u[0]*s+n[0]*t,a[1]+u[1]*s+n[1]*t];GW_BEDS.push(gwDense([at(x0,.15),at(x1,.15),at(x1,depth),at(x0,depth)]));
          for(let s=x0+.8;s<x1-.5;s+=gap){k++;const p=at(s+(rnd(k*1.9)-.5)*.5,1.05+(rnd(k*4.3)-.5)*.35);gwPlant(p[0],p[1],.42+.3*rnd(k*.61),rnd(k*7.7+b.area)<.3?'azalea':'shrub',k)}}}}}
  // pavements: a scored joint across the walk every couple of metres, along the mapped footways
  const seen=new Set(),step=GW.joint||1.8;
  for(const r of SCENE.routes){if(r.kind!=='ped'||r.p.length<2)continue;const a=r.p[0],b=r.p[r.p.length-1],key=[a,b].map(p=>Math.round(p[0])+','+Math.round(p[1])).sort().join('|');if(seen.has(key))continue;seen.add(key);
    const L=measuredLane({p:r.p,junctions:[]});for(let s=step/2;s<L.len;s+=step){const {p,d}=tAt(L,s);GW_JOINTS.push(p[0]-d[1]*4,p[1]+d[0]*4,p[0]+d[1]*4,p[1]-d[0]*4)}}
}

/* ---------- painting ---------- */
let GW_HS=null,GW_HS_KEY='';
function gwHillshade(ctx,X,Y){
  if(!TER||GW.relief===0)return;const key=YAW.toFixed(1)+'|'+SEASON_ID;
  if(key!==GW_HS_KEY){GW_HS_KEY=key;const n=TER.n,m=n-1,k=SHADOW_LEN/SHADOW_K,[sx,sy]=yawTurn(SH),Lw=norm([-sx*k,-sy*k,1]),gain=(GW.relief||7)*(SEASON.night?.5:1),c=TER.cell,v=new Float32Array(m*m);
    for(let j=0;j<m;j++)for(let i=0;i<m;i++){const i0=Math.max(0,i-1),i1=Math.min(n-1,i+2),j0=Math.max(0,j-1),j1=Math.min(n-1,j+2);
      const gx=(TER_Z[j*n+i1]+TER_Z[(j+1)*n+i1]-TER_Z[j*n+i0]-TER_Z[(j+1)*n+i0])/(2*c*(i1-i0)),gy=(TER_Z[j1*n+i]+TER_Z[j1*n+i+1]-TER_Z[j0*n+i]-TER_Z[j0*n+i+1])/(2*c*(j1-j0)),l=Math.hypot(gx,gy,1);
      v[j*m+i]=((-gx*Lw[0]-gy*Lw[1]+Lw[2])/l-Lw[2])*gain}
    if(!GW_HS||GW_HS.width!==m)GW_HS=new OffscreenCanvas(m,m);const g=GW_HS.getContext('2d'),im=g.createImageData(m,m),dk=SEASON.night?[20,22,48]:[58,48,84],lt=[255,247,222];
    for(let j=0;j<m;j++)for(let i=0;i<m;i++){let s=0,w=0;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const a=i+di,b=j+dj;if(a<0||b<0||a>=m||b>=m)continue;s+=v[b*m+a];w++}s/=w;
      const o=(j*m+i)*4,col=s<0?dk:lt;im.data[o]=col[0];im.data[o+1]=col[1];im.data[o+2]=col[2];im.data[o+3]=Math.round(255*Math.min(s<0?.42:.3,Math.abs(s)))}
    g.putImageData(im,0,0)}
  const o=P(0,0,TER_MID);ctx.save();ctx.transform(X[0],X[1],Y[0],Y[1],o[0],o[1]);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(GW_HS,-HALF,-HALF,2*HALF,2*HALF);ctx.restore()}
// the open ground under everything mapped
function gwBase(ctx){
  if(!GW_ON)return;const X=Dv(1,0,0),Y=Dv(0,1,0),o=P(0,0,TER_MID);
  ctx.save();ctx.transform(X[0],X[1],Y[0],Y[1],o[0],o[1]);gwFill(ctx,GW.base||'ground',GROUND,0,0,HALF*1.6,0);ctx.restore()}
const gwTrace=(ctx,r,dz=0)=>{const q=drape(r);let w=P(q[0][0],q[0][1],q[0][2]+dz);ctx.moveTo(w[0],w[1]);for(let i=1;i<q.length;i++){w=P(q[i][0],q[i][1],q[i][2]+dz);ctx.lineTo(w[0],w[1])}ctx.closePath()};
function gwGroundInk(ctx,onRings,X,Y,H){
  const K=CAM_K,near=UPX<.5,close=UPX<.22,lawns=SCENE.lawns.map(l=>l.r),snow=!!SEASON.snow;
  onRings(lawns,()=>gwFill(ctx,'lawn',GRASS,0,0,H*1.5,0));
  onRings(SCENE.roads,()=>gwFill(ctx,'asphalt',ROAD,0,0,H*1.5,0));
  onRings(SCENE.paths,()=>{gwFill(ctx,'concrete',PAVE,0,0,H*1.5,0);
    if(near&&!snow){ctx.strokeStyle=mix(PAVE,'#5a5148',.42);ctx.lineWidth=.045;ctx.beginPath();for(let i=0;i<GW_JOINTS.length;i+=4){ctx.moveTo(GW_JOINTS[i],GW_JOINTS[i+1]);ctx.lineTo(GW_JOINTS[i+2],GW_JOINTS[i+3])}ctx.stroke()}});
  if(UPX<.6&&SCENE.walk.length)onRings(SCENE.walk,()=>pavingInk(ctx,SCENE.walk,CITY.paving||{},H));
  // the hand-laid surfaces of the forecourts, each in its own bond and direction
  for(const q of GW_PATCH){const c=centreOf(q.ring),o=P(c[0],c[1],groundZ(c[0],c[1])),R=Math.max(...q.ring.map(p=>Math.hypot(p[0]-c[0],p[1]-c[1])))+2;
    const base=q.base||(q.mat==='mulch'?'#a8693f':q.mat==='soil'?'#7a5a44':q.mat==='lawn'?GRASS:q.mat==='asphalt'?ROAD:q.mat==='stone'?'#d9d0bb':q.mat==='paver'?'#bfb29c':q.mat==='brick'||q.mat==='brickrun'?'#a4553f':PAVE);
    ctx.save();ctx.beginPath();gwTrace(ctx,q.ring,.02);ctx.clip();ctx.transform(X[0],X[1],Y[0],Y[1],o[0],o[1]);gwFill(ctx,q.mat,base,0,0,R,q.ang,q);ctx.restore();
    if(near&&q.edge!=='none'){ctx.beginPath();gwTrace(ctx,q.ring,.02);ctx.strokeStyle=q.edge||mix(gwS(base),'#4f463d',q.bed?.5:.38);ctx.lineWidth=(q.bed?.09:.06)*K;ctx.stroke()}}
  if(GW_BEDS.length){ctx.save();ctx.beginPath();for(const r of GW_BEDS)gwTrace(ctx,r,.02);ctx.clip();const o=P(0,0,TER_MID);ctx.transform(X[0],X[1],Y[0],Y[1],o[0],o[1]);gwFill(ctx,'mulch','#a8693f',0,0,H*1.5,0);ctx.restore();
    if(near){ctx.beginPath();for(const r of GW_BEDS)gwTrace(ctx,r,.02);ctx.strokeStyle=mix(gwS('#a8693f'),'#4f3a2a',.5);ctx.lineWidth=.07*K;ctx.stroke()}}
  // edges: a trimmed lawn edge, the shaded gutter beside each kerb, a contact shadow under each building
  ctx.lineJoin='round';
  if(near){ctx.beginPath();for(const rs of lawns)for(const r of rs)gwTrace(ctx,r,.02);ctx.strokeStyle=mix(GRASS,'#4f6b45',.45);ctx.globalAlpha=.6;ctx.lineWidth=.1*K;ctx.stroke();
    ctx.beginPath();for(const rs of SCENE.paths.concat(SCENE.walk))for(const r of rs)gwTrace(ctx,r,.02);ctx.strokeStyle=mix(PAVE,'#5a5148',.45);ctx.globalAlpha=.55;ctx.lineWidth=.07*K;ctx.stroke()}
  ctx.beginPath();for(const rs of SCENE.roads)for(const r of rs)gwTrace(ctx,r,.01);ctx.strokeStyle='#3d3550';ctx.globalAlpha=snow?.1:.2;ctx.lineWidth=.55*K;ctx.stroke();
  ctx.beginPath();for(const b of SCENE.buildings)gwTrace(ctx,b.ring,.02);ctx.strokeStyle='#3d3550';ctx.globalAlpha=.13;ctx.lineWidth=1.7*K;ctx.stroke();ctx.globalAlpha=.12;ctx.lineWidth=.7*K;ctx.stroke();ctx.globalAlpha=1;
  // under the trees
  const disc=(x,y,r,n=10)=>{for(let i=0;i<n;i++){const a=i*6.2832/n,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r,w=P(px,py,groundZ(x,y)+.02);i?ctx.lineTo(w[0],w[1]):ctx.moveTo(w[0],w[1])}ctx.closePath()};
  if(UPX<.9){ctx.beginPath();for(const [x,y,r] of GW_RINGS)disc(x,y,r);ctx.fillStyle=snow?'#e4e2da':mix(GRASS,'#8a5f3c',.62);ctx.globalAlpha=.85;ctx.fill();
    if(near){ctx.beginPath();for(const [x,y,r] of GW_RINGS)disc(x,y,r*.55,8);ctx.fillStyle=mix(GRASS,'#6e4a30',.7);ctx.globalAlpha=.5;ctx.fill()}
    ctx.globalAlpha=1;ctx.beginPath();for(const [x,y] of GW_GRATES)disc(x,y,.95,4);ctx.fillStyle=snow?'#d9d6cf':'#6f6a66';ctx.fill();
    if(near){ctx.beginPath();for(const [x,y] of GW_GRATES){disc(x,y,.62,4);disc(x,y,.3,8)}ctx.strokeStyle='#4a4644';ctx.lineWidth=.05*K;ctx.stroke()}}
  // shrubs: a shadow, a dark body, a lit crown, flowers in spring
  if(UPX<1.1&&GW_SHRUBS.length){const [sx,sy]=yawTurn(SH),spring=SEASON.leaves==='spring',AZ=['#d9668f','#f0e9ee','#c9457a','#e79ab5'];
    if(near){ctx.fillStyle='#3d3550';ctx.globalAlpha=.2;ctx.beginPath();for(const s of GW_SHRUBS)if(s.kind!=='flowers')disc(s.x+sx*s.r*.9,s.y+sy*s.r*.9,s.r*.95,8);ctx.fill();ctx.globalAlpha=1}
    for(const s of GW_SHRUBS){const z=groundZ(s.x,s.y),w=P(s.x,s.y,z+s.r*.62),R=s.r*K,grass=s.kind==='grass',low=s.kind==='low';
      const c=snow?mix(s.c,'#f1f3f1',.6):grass?(SEASON.leaves==='bare'||SEASON.leaves==='autumn'?'#c7ab6c':'#93ab6a'):SEASON.leaves==='autumn'&&s.kind==='azalea'?mix(s.c,'#a8623c',.35):s.c;
      if(s.kind==='flowers'){const FL=SEASON.leaves==='spring'?['#d8343f','#f2cf3f','#ee8fb0','#d8343f','#f2cf3f']:SEASON.leaves==='summer'?['#e0563f','#f0c040','#c05aa0','#f4f1ea']:SEASON.leaves==='autumn'?['#d98a2b','#b5442e','#e3b83a','#8c3b5a']:['#6c4a8a','#e9d66b','#f1eee6'];
        const b=P(s.x,s.y,z+.12);ctx.fillStyle=snow?'#e9ece8':mix(s.c,'#7fa468',.5);ctx.beginPath();ctx.ellipse(b[0],b[1],R*1.25,R*.8,0,0,6.3);ctx.fill();
        if(UPX<.75&&!snow){const nf=close?9:near?5:2,bare=SEASON.leaves==='bare';for(let i=0;i<nf;i++){if(bare&&i%2)continue;const a=i*2.4+s.seed,rr=R*(.25+.85*rnd(i*1.7+s.seed));ctx.fillStyle=FL[(s.seed+i*(close?1:3))%FL.length];ctx.beginPath();ctx.arc(b[0]+Math.cos(a)*rr,b[1]-R*.28+Math.sin(a)*rr*.6,R*(close?.3:near?.36:.6),0,6.3);ctx.fill()}}
        continue}
      if(grass){ctx.strokeStyle=c;ctx.lineWidth=.05*K;ctx.beginPath();const b=P(s.x,s.y,z);for(let i=0;i<7;i++){const a=-1.57+(i-3)*.26;ctx.moveTo(b[0],b[1]);ctx.quadraticCurveTo(b[0]+Math.cos(a)*R*.9,b[1]+Math.sin(a)*R*1.6,b[0]+Math.cos(a)*R*1.7,b[1]+Math.sin(a)*R*1.9)}ctx.stroke();continue}
      ctx.fillStyle=mix(c,'#33452f',.42);ctx.beginPath();ctx.ellipse(w[0],w[1],R,R*(low?.62:.86),0,0,6.3);ctx.fill();
      if(UPX<.7){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(w[0]+R*.1,w[1]-R*.2,R*.74,R*(low?.44:.62),0,0,6.3);ctx.fill();
        if(near){ctx.fillStyle=mix(c,'#f3efc2',.3);ctx.beginPath();ctx.ellipse(w[0]+R*.22,w[1]-R*.36,R*.36,R*.26,0,0,6.3);ctx.fill()}
        if(close&&spring&&s.kind==='azalea'){ctx.fillStyle=AZ[s.seed%4];for(let i=0;i<9;i++){const a=i*2.4+s.seed,rr=R*(.2+.5*rnd(i*1.3+s.seed));ctx.beginPath();ctx.arc(w[0]+Math.cos(a)*rr,w[1]-R*.15+Math.sin(a)*rr*.7,R*.13,0,6.3);ctx.fill()}}
        else if(spring&&s.kind==='azalea'){ctx.fillStyle=AZ[s.seed%4];ctx.globalAlpha=.75;ctx.beginPath();ctx.ellipse(w[0]+R*.1,w[1]-R*.22,R*.6,R*.48,0,0,6.3);ctx.fill();ctx.globalAlpha=1}}}}
  gwHillshade(ctx,X,Y);}

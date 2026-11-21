/* Atmospheric detail layer: physical façade relief, planted wind, people and parked transport. */
let WIND_LEVEL=1;
const windField=(x,y,t)=>WIND_LEVEL*(.45+.28*Math.sin(t*.43+x*.012)+.18*Math.sin(t*.91+y*.018));
function facadeRelief(F){
 if(!F.st.arch||F.st.arch==='blank'||F.cut||F.len<2||UPX>.75)return '';
 const Q=(s,d,z)=>[F.start[0]+F.along[0]*s+F.n[0]*d,F.start[1]+F.along[1]*s+F.n[1]*d,z];
 const box3=(x,w,z,h,d,col)=>{const A=[Q(x,.005,z),Q(x+w,.005,z),Q(x+w,d,z),Q(x,d,z)],B=A.map(p=>[p[0],p[1],z+h]);let s='';const faces=[B,[A[0],A[1],B[1],B[0]],[A[1],A[2],B[2],B[1]],[A[2],A[3],B[3],B[2]],[A[3],A[0],B[0],B[3]]];for(const f of faces){const n=vNewell(f);if(n&&vis(n))s+=shape(f,tone(n,soft(col)),.25)}return s};
 let s='';const H=F.h-F.z,stone=F.st.trim||'#e8e1cd';
 s+=box3(0,F.len,F.h-.22,.22,.28,stone)+box3(0,F.len,F.z,.26,.17,'#b3ab93');
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
 LIFE_CROWD.push({fp,h:2.1,draw:t=>crowd.slice().sort((a,b)=>depthOf([...a.p,0])-depthOf([...b.p,0])).map(p=>pedestrian(p,t).svg).join('')});
 }
 for(const[x,y,a,k]of life.parkedCars||[]){const d=[Math.cos(a),Math.sin(a)],props=carProps(20000+k*11+Math.round(x+y));const actor={...props,p:[x,y],d,v:0,s:0};const model=carDraw(actor);LIFE_STATIC.push({fp:model.fp,h:model.z1,draw:()=>carDraw(actor).svg})}
 for(const[x,y,a]of life.bikeRacks||[]){const P=(u,v)=>[x+Math.cos(a)*u-Math.sin(a)*v,y+Math.sin(a)*u+Math.cos(a)*v];LIFE_STATIC.push({fp:rect(x,y,5.5,2.5),h:1.5,draw:()=>{let s='';for(let i=0;i<4;i++){const p=P((i-1.5)*1.1,0);if(!standable(...p,.3))continue;const q=P((i-1.5)*1.1,.55);s+=stick([q[0],q[1],0],[q[0],q[1],.9],.035,'#758276')+parkedBicycle(p[0],p[1],a+Math.PI/2,['#476d77','#ad6650','#73835f','#b4a166'][i])}return s}})}
}
function streetLife(t){
 prepareStreetLife();const out=[];
 for(let i=0;i<LIFE_STATIC.length;i++){const p=LIFE_STATIC[i];out.push({...p,draw:()=>stamp('life-static'+i,p.draw,p.fp,0,p.h+.3)})}
 out.push(...LIFE_CROWD);
 for(const[x,y,h,kind]of(CITY.life||{}).flagpoles||[])out.push({fp:rect(x+1,y,3,1),h:h+.5,draw:()=>wavingFlag(x,y,h,t,kind)});
 return out;
}
function driftingLeaves(t){
 if(!WIND_LEVEL||!['autumn','doubledecker','gameday'].includes(SEASON.id))return '';
 let s='';const count=PHONE?16:38;
 for(let i=0;i<count;i++){const tr=TREES[(i*17)%TREES.length];if(!tr)continue;const phase=(t*.07+rnd(i*7.1))%1,z=tr.h*(1-phase),gust=windField(tr.x,tr.y,t);const x=tr.x+phase*5*gust+Math.sin(t+i)*.25,y=tr.y+phase*1.7+Math.cos(i+t)*.3;if(Math.abs(x)>HALF-1||Math.abs(y)>HALF-1)continue;const a=.16,at=([u,v])=>[x+u,y+v,z];s+=shape([[0,-a],[a*.5,0],[0,a],[-a*.5,0]].map(at),i%2?'#ba8a4e':'#b4724d',.12)}return s;
}

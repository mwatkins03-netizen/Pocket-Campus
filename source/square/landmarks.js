// Oxford architectural studies: OSM plans with photograph-led elevations and interpreted small details.
const CREAM='#eee8d7',BRICK='#ae6f53',ROOF='#717b78';
function localFrame(c,n){const t=[-n[1],n[0]];return(u,v,z=0)=>[c[0]+n[0]*u+t[0]*v,c[1]+n[1]*u+t[1]*v,z]}
function quadClock(P,u,v,z,r){let s=shape(Array.from({length:48},(_,k)=>P(u,v+Math.cos(k*Math.PI/24)*r,z+Math.sin(k*Math.PI/24)*r)),CREAM,.35);s+=edge(P(u,v,z),P(u,v-r*.58,z+r*.3),'#39443e',.09)+edge(P(u,v,z),P(u,v+r*.1,z+r*.75),'#39443e',.08);for(let i=0;i<12;i++){let a=i*Math.PI/6;s+=edge(P(u,v+Math.cos(a)*r*.76,z+Math.sin(a)*r*.76),P(u,v+Math.cos(a)*r*.9,z+Math.sin(a)*r*.9),'#39443e',.055)}return s}
function dome(x,y,z,r,h,c){let s='';for(let j=0;j<10;j++){let a=j/10*Math.PI/2,b=(j+1)/10*Math.PI/2;const ring=a=>polygon(x,y,Math.max(.02,r*Math.cos(a)),24).map(p=>[...p,z+h*Math.sin(a)]);s+=loft(ring(a),ring(b),n=>tone(n,soft(c)))}return s}
function ordered(parts){return planOrder(parts.map(p=>({fp:p.fp,z0:p.z0||0,z1:p.z1,svg:p.draw()})))}
function volume(r,z0,z1,style={}){r=ccw(r);const b=block(r,z0,z1,{facade:'plain',wall:CREAM,shop:'none',...style});return{fp:r,z0,z1,draw:b.draw}}
function column(P,u,v,z0,z1,order='ionic',r=.5){
 const at=(radius,z)=>Array.from({length:24},(_,i)=>{const a=i*Math.PI/12;return P(u+Math.cos(a)*radius,v+Math.sin(a)*radius,z)});
 let s='';const tiers=[[r*1.4,z0],[r*1.4,z0+.18],[r*1.15,z0+.22],[r*1.15,z0+.4],[r,z0+.5],[r*.82,z1-.55],[r*1.2,z1-.5],[r*1.2,z1-.2],[r*1.5,z1-.18],[r*1.5,z1]];
 for(let i=0;i<tiers.length-1;i++)s+=loft(at(...tiers[i]),at(...tiers[i+1]),n=>tone(n,soft(CREAM)));
 s+=shape(at(r*1.5,z1),CREAM,.25);
 if(UPX<.4)for(let i=0;i<24;i++){const a=i*Math.PI/12,n=[Math.cos(a),Math.sin(a),0];if(vis(n))s+=edge(P(u+Math.cos(a)*r*.99,v+Math.sin(a)*r*.99,z0+(z1-z0)*.24),P(u+Math.cos(a)*r*.82,v+Math.sin(a)*r*.82,z1-.62),'#c6c8b7',.035)}
 if(order==='corinthian')for(let i=0;i<8;i++){const a=i*Math.PI/4,du=Math.cos(a),dv=Math.sin(a);s+=shape([P(u+du*r*.85,v+dv*r*.85,z1-.7),P(u+du*r*1.45-dv*.14,v+dv*r*1.45+du*.14,z1-.25),P(u+du*r*1.25,v+dv*r*1.25,z1-.1),P(u+du*r*1.45+dv*.14,v+dv*r*1.45-du*.14,z1-.25)],'#e0e2cf',.2)}
 else for(const vv of [-1,1])s+=ball(P(u,v+vv*r*1.1,z1-.28),r*.4,soft(CREAM),.25);
 return s;
}
function rail(A,B,z,h=1,colour='#566051',spacing=.22){const l=Math.hypot(B[0]-A[0],B[1]-A[1]);let s=edge([...A,z+h],[...B,z+h],colour,.085)+edge([...A,z+.1],[...B,z+.1],colour,.055);if(UPX<.65)for(let t=0;t<=l;t+=spacing){let u=t/l;s+=stick([A[0]+(B[0]-A[0])*u,A[1]+(B[1]-A[1])*u,z],[A[0]+(B[0]-A[0])*u,A[1]+(B[1]-A[1])*u,z+h],.025,colour)}return s}
function portico(p){const P=localFrame(p.c,p.n),{u,width:w,depth:d,base:b,top:h,columns:k}=p;
 const ring=(a,c,ww,dd)=>ccw([P(a-dd/2,c-ww/2),P(a+dd/2,c-ww/2),P(a+dd/2,c+ww/2),P(a-dd/2,c+ww/2)].map(p=>p.slice(0,2)));
 const fp=ring(u-d/2,0,w,d),ent=volume(ring(u-d/2,0,w+.9,d+.5),h,h+.65,{wall:p.stone||CREAM});
 return{fp,z1:p.flat?h+1.2:h+3.3,draw:()=>{let s='';
 if(b>3){s+=volume(fp,0,b,{arch:'arcade',wall:CREAM}).draw();s+=volume(ring(u-d/2,0,w+.25,d+.15),b,b+.2,{wall:CREAM}).draw()}
 else for(let i=0;i<7;i++){const bh=b*(i+1)/7;s+=volume(ring(u-d/2+(6-i)*.19,0,w+(6-i)*.24,d+(6-i)*.38),b*i/7,bh,{wall:'#d2cebb'}).draw()}
 for(let i=0;i<k;i++){const v=-w/2+.9+i*(w-1.8)/(k-1);s+=column(P,u-.7,v,b+.15,h,p.order||'ionic',p.radius||.5)}
 if(b>3)s+=rail(P(u-.68,-w/2+.4).slice(0,2),P(u-.68,w/2-.4).slice(0,2),b+.2,.9,'#48554a',.17);
 s+=ent.draw();s+=volume(ring(u-d/2,0,w+1.05,d+.65),h+.65,h+.82,{wall:CREAM}).draw();
 for(let v=-w/2;v<w/2;v+=.55)s+=volume(ring(u+.13,v,.18,.3),h-.12,h+.13,{wall:CREAM}).draw();
 if(!p.flat){
 const q=v=>P(u+.32,v,h+.82),tip=P(u+.32,0,h+3.1),back=v=>P(u-d-.12,v,h+.82),bt=P(u-d-.12,0,h+3.1);
 s+=shape([q(-w/2-.48),q(w/2+.48),tip],CREAM,.5)+shape([q(-w/2-.48),back(-w/2-.48),bt,tip],ROOF,.45)+shape([q(w/2+.48),tip,bt,back(w/2+.48)],ROOF,.45);
 s+=edge(q(-w/2-.48),tip,'#c3c5b4',.15)+edge(tip,q(w/2+.48),'#c3c5b4',.15);
 if(p.clock&&vis([...p.n,0]))s+=quadClock(P,u+.35,0,h+1.55,.58);
 }
 return s;}}
}
function galleryParts(cfg){const b=findBuilding(cfg.id),out=[];
 for(const side of cfg.galleries||[]){const P=localFrame(side.c,side.n),len=side.length,depth=side.depth||1.7,z=side.z||4;
 const ring=ccw([P(0,-len/2),P(depth,-len/2),P(depth,len/2),P(0,len/2)].map(p=>p.slice(0,2)));
 out.push({fp:ring,z1:cfg.parts[0].h+.2,draw:()=>{let s=volume(ring,z-.18,z,{wall:'#d9d6c4',top:'#b6b6a3'}).draw();
 const num=Math.round(len/3.4);for(let i=0;i<=num;i++){const v=-len/2+i*len/num;s+=stick(P(depth-.12,v,.05),P(depth-.12,v,cfg.parts[0].h-.3),.075,CREAM);if(UPX<.5)s+=volume(ccw(rect(...P(depth-.12,v).slice(0,2),.25,.25)),0,.3,{wall:'#d6d4c2'}).draw();if(i<num&&i%2===0)s+=ball(P(depth-.25,v+len/num*.5,z+.95),.29,soft('#668665'),.2)}
 s+=rail(P(depth-.1,-len/2).slice(0,2),P(depth-.1,len/2).slice(0,2),z,.9,CREAM,.19);
 s+=shape([P(0,-len/2,cfg.parts[0].h-.12),P(0,len/2,cfg.parts[0].h-.12),P(depth,len/2,cfg.parts[0].h-.4),P(depth,-len/2,cfg.parts[0].h-.4)],'#78857d',.4);
 s+=edge(P(depth,-len/2,cfg.parts[0].h-.4),P(depth,len/2,cfg.parts[0].h-.4),CREAM,.15);return s}});
 }
 return out;
}
function hallModel(cfg){
 const b=findBuilding(cfg.id);if(!b)return null;
 if(cfg.extra==='ventress')return ventressModel(cfg,b);
 if(cfg.extra==='cityhall')return cityHallModel(cfg,b);
 const parts=cfg.parts.map(p=>{
 const st={facade:'brick',wall:p.wall||cfg.wall||BRICK,trim:cfg.trim||CREAM,shop:'none',floor:p.floor||4.2,bay:p.bay||3.8,flatRoof:ROOF,top:ROOF,arch:p.arch||cfg.arch||'campus-sash',archFloors:p.archFloors,groundShutters:cfg.groundShutters,frontNormal:cfg.frontNormal,signName:cfg.signName,shopColour:cfg.shopColour,...p.style};
 const bl=volume(p.ring,p.z0||0,p.h,st);
 const rf=p.roof?roofOver(p.obb,p.h,{roof:p.roof,pitch:p.pitch||22,roofColour:p.colour||ROOF,roofTex:p.roofTex||'standing-seam',eaves:.35,wall:p.wall||cfg.wall||BRICK}):null;
 return{fp:p.ring,z0:p.z0||0,z1:p.h+(rf?4:0),draw:()=>bl.draw()+(rf?rf():'')};
 });
 for(const p of cfg.ports||[])parts.push(portico(p));
 for(const p of galleryParts(cfg))parts.push(p);
 return obj(b.ring,cfg.height||28,()=>ordered(parts)+(cfg.extra?extras(cfg.extra,b):''));
}
function extras(kind,b){const c=b.obb.c;let s='';
 if(kind==='lyceum'){
 const x=c[0],y=c[1],r=ccw(rect(x,y,3.2,3.2));s+=volume(r,16.5,18.9,{wall:CREAM,arch:'belfry'}).draw();
 s+=volume(ccw(rect(x,y,3.7,3.7)),18.9,19.15,{wall:CREAM}).draw();
 for(let i=0;i<4;i++){const a=r[i],q=r[(i+1)%4];s+=rail(a,q,19.15,.6,CREAM,.3)}s+=peak(r,19.7,[x,y,21.2],ROOF)+stick([x,y,21.2],[x,y,22.1],.06,CREAM);
 }
 if(kind==='courthouse'){
 const x=-7,y=0,r=ccw(rect(x,y,5.2,5.2));s+=volume(ccw(rect(x,y,6,6)),16.4,18.4,{wall:'#626d65'}).draw();s+=volume(ccw(rect(x,y,6.4,6.4)),18.4,18.7,{wall:CREAM}).draw();
 s+=volume(r,18.7,22,{wall:CREAM,arch:'belfry'}).draw();s+=volume(r,22,24.5,{wall:CREAM,arch:'blank'}).draw();
 for(const n of [[1,0],[-1,0],[0,1],[0,-1]])if(vis([...n,0])){const P=localFrame([x,y],n);s+=quadClock(P,2.64,0,23.45,1.04);s+=edge(P(2.7,-2.6,24.2),P(2.7,-1.1,24.2),CREAM,.22)+edge(P(2.7,1.1,24.2),P(2.7,2.6,24.2),CREAM,.22)}
 s+=dome(x,y,24.5,2.7,2,'#8b9d91')+volume(ccw(rect(x,y,.85,.85)),26.4,27.1,{wall:CREAM}).draw()+stick([x,y,27.1],[x,y,28.2],.06,'#717d6d');
 // Two white chimneys appear in the county's current photograph.
 for(const dx of [-15,15])s+=volume(ccw(rect(x+dx,y,1.2,1.2)),15.7,18.6,{wall:CREAM,arch:'blank'}).draw()+volume(ccw(rect(x+dx,y,1.45,1.45)),18.6,18.85,{wall:CREAM}).draw();
 }
 if(kind==='kennon')for(const[x,y,r,h]of[[-158.5,-227,5.1,6.8],[-171,-227.4,3.1,4.8]]){s+=dome(x,y,h,r,r*.85,'#7e9a8b');for(let a=0;a<Math.PI*2;a+=Math.PI/6){const pts=Array.from({length:9},(_,i)=>{const t=i/8*Math.PI/2;return[x+Math.cos(a)*r*Math.cos(t),y+Math.sin(a)*r*Math.cos(t),h+r*.85*Math.sin(t)]});for(let i=0;i<8;i++)s+=edge(pts[i],pts[i+1],'#617e6e',.045)}}
 if(kind==='barnard'){const x=118,y=83,r=ccw(polygon(x,y,5,12));s+=volume(r,8,13,{arch:'campus-sash',wall:BRICK,bay:2.4,floor:5}).draw()+volume(r,13,14.1,{wall:CREAM,arch:'blank'}).draw()+dome(x,y,14.1,5,2.3,'#b8beb0')}
 return s;
}
function cylinderWindows(cx,cy,r,z0,z1){let s='';for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.PI/8,n=[Math.cos(a),Math.sin(a),0];if(!vis(n))continue;const t=[-n[1],n[0]],P=(v,z)=>[cx+n[0]*(r+.035)+t[0]*v,cy+n[1]*(r+.035)+t[1]*v,z],lo=z0+(z1-z0)*.2,hi=z0+(z1-z0)*.82;const q=(w,l,h)=>[P(-w/2,l),P(w/2,l),P(w/2,h),P(-w/2,h)];s+=shape(q(.85,lo-.1,hi+.1),CREAM,.25)+shape(q(.62,lo,hi),'#485f5b',.2)+edge(P(0,lo),P(0,hi),CREAM,.045)+edge(P(-.31,(lo+hi)/2),P(.31,(lo+hi)/2),CREAM,.06)}return s}
function ventressModel(cfg,b){
 const c=b.obb.c,t=[.9925,-.1221],n=[-.1221,-.9925],P=(u,v,z=0)=>[c[0]+t[0]*u+n[0]*v,c[1]+t[1]*u+n[1]*v,z];
 const ring=(u0,u1,v0,v1)=>ccw([P(u0,v0),P(u1,v0),P(u1,v1),P(u0,v1)].map(p=>p.slice(0,2)));
 const parts=[],body=volume(ring(-6,12,-5.8,5.8),0,10.2,{wall:'#aa5e46',arch:'ventress',bay:3.5});
 const roof=roofOver({c:P(3,0).slice(0,2),ax:t,L:18,W:11.6},10.2,{roof:'hipped',pitch:30,roofColour:'#b65e4e',eaves:.35});
 parts.push({fp:body.fp,z1:14,draw:()=>body.draw()+roof()});
 const wingRing=ccw(Array.from({length:17},(_,i)=>{const a=Math.PI/2+i*Math.PI/16;return P(-6+Math.cos(a)*6,Math.sin(a)*5.6).slice(0,2)}));
 const wing=volume(wingRing,0,8.7,{wall:'#ae674d',arch:'rounded-wing',bay:2.9});parts.push({fp:wingRing,z1:10.7,draw:()=>wing.draw()+peak(wingRing,8.7,P(-6,0,10.7),'#b65e4e')});
 // East-facing entrance gable and its fanlight, reconstructed from the photographed elevation.
 const gRing=ring(0,7,2.5,5.85),gable=volume(gRing,10.2,12.8,{wall:'#aa5e46',arch:'blank'});
 parts.push({fp:gRing,z0:10.2,z1:15.3,draw:()=>{let s=gable.draw()+roofOver({c:P(3.5,4.175).slice(0,2),ax:n,L:3.35,W:7},12.8,{roof:'gabled',pitch:35.5,roofColour:'#b86451',eaves:.1})(),q=[P(0,5.87,12.8),P(7,5.87,12.8),P(3.5,5.87,15.3)];s+=shape(q,CREAM,.45)+edge(q[0],q[2],CREAM,.14)+edge(q[2],q[1],CREAM,.14);const fan=Array.from({length:17},(_,i)=>P(3.5+Math.cos(Math.PI*i/16)*2.55,5.9,10.8+Math.sin(Math.PI*i/16)*2.55));s+=shape(fan,'#465d5c',.35)+edge(P(.95,5.91,10.8),P(6.05,5.91,10.8),CREAM,.14);for(const u of[2.15,3.5,4.85])s+=edge(P(u,5.91,10.8),P(u,5.91,12.7),CREAM,.11);return s}});
 const tx=-5.5,tv=3.7,tr=ccw(polygon(...P(tx,tv).slice(0,2),2.05,16));
 const tower=volume(tr,0,17.5,{wall:'#a95f47',arch:'turret',bay:1.6,floor:4.3});
 parts.push({fp:tr,z1:24,draw:()=>{let s='';const levels=[0,4.5,8.8,13.2,17.5],rr=ccw(polygon(...P(tx,tv).slice(0,2),2.13,16));for(let i=0;i<4;i++){s+=volume(tr,levels[i]+(i?.12:0),levels[i+1]-.1,{wall:'#a95f47',arch:'blank',bay:1.6,top:'#a95f47'}).draw();s+=cylinderWindows(...P(tx,tv).slice(0,2),2.05,levels[i],levels[i+1]);s+=volume(rr,levels[i+1]-.1,levels[i+1]+.12,{wall:CREAM,top:CREAM,arch:'blank'}).draw()}s+=peak(tr,17.65,P(tx,tv,23.7),'#b86451')+stick(P(tx,tv,23.7),P(tx,tv,25.4),.055,'#929c89');return s}});
 const doorP=localFrame(P(-2.1,5.85).slice(0,2),n),dRing=ring(-4,.3,4,6.5);parts.push({fp:dRing,z1:5.6,draw:()=>{let s='';for(let i=0;i<6;i++)s+=volume(ring(-3.6,-.1,5.8,8-i*.3),i*.17,(i+1)*.17,{wall:'#c9c4b0'}).draw();s+=shape([doorP(.03,-1,1),doorP(.03,1,1),doorP(.03,1,3.1),...Array.from({length:13},(_,i)=>doorP(.03,Math.cos(i*Math.PI/12),3.1+Math.sin(i*Math.PI/12)))],CREAM,.4);s+=shape([doorP(.05,-.8,1),doorP(.05,.8,1),doorP(.05,.8,3),doorP(.05,-.8,3)],'#455852',.3)+edge(doorP(.07,0,1),doorP(.07,0,3.7),CREAM,.09);return s}});
 return obj(b.ring,25.4,()=>ordered(parts));
}
function cityHallModel(cfg,b){
 const P=localFrame(b.obb.c,[-1,0]),parts=[],ring=(u0,u1,v0,v1)=>ccw([P(u0,v0),P(u1,v0),P(u1,v1),P(u0,v1)].map(p=>p.slice(0,2)));
 const back=volume(ring(-17,10,-10.4,10.4),0,10.8,{wall:'#ae5c40',arch:'cityhall'}),backroof=roofOver({c:P(-3.5,0).slice(0,2),ax:[-1,0],L:27,W:20.8},10.8,{roof:'hipped',pitch:24,roofColour:'#697975',roofTex:'slate',eaves:.3});
 parts.push({fp:back.fp,z1:15.5,draw:()=>back.draw()+backroof()});
 for(const side of[-1,1]){const v=side*7,fp=ring(10,17,v-3.35,v+3.35),body=volume(fp,0,11.4,{wall:'#ae5c40',arch:'cityhall'});parts.push({fp,z1:16.1,draw:()=>{let s=body.draw();const A=P(17.04,v-3.5,11.4),B=P(17.04,v+3.5,11.4),C=P(17.04,v,16.1);s+=shape([A,B,C],'#b26449',.5)+shape([P(10,v-3.5,11.4),A,C,P(10,v,16.1)],'#6b7b77',.4)+shape([B,P(10,v+3.5,11.4),P(10,v,16.1),C],'#6b7b77',.4)+edge(A,C,CREAM,.16)+edge(C,B,CREAM,.16);s+=shape([P(17.08,v-.55,12.3),P(17.08,v+.55,12.3),P(17.08,v+.55,13.8),P(17.08,v-.55,13.8)],'#56685e',.3);return s}})}
 const center=volume(ring(10,17,-3.65,3.65),0,9.2,{wall:'#ae5c40',arch:'cityhall'});parts.push(center);
 const porch=volume(ring(17,19,-2.8,2.8),0,4.7,{wall:'#ac5c43',arch:'arcade'});parts.push({fp:porch.fp,z1:6.8,draw:()=>porch.draw()+shape([P(19.03,-3,4.7),P(19.03,3,4.7),P(19.03,0,7)],'#b2684c',.5)+edge(P(19.04,-3,4.7),P(19.04,0,7),CREAM,.17)+edge(P(19.04,0,7),P(19.04,3,4.7),CREAM,.17)});
 const chim=volume(ring(-1,1,6.8,8.8),13,17.4,{wall:'#a85f46',arch:'blank'});parts.push(chim);
 return obj(b.ring,17.5,()=>ordered(parts));
}

const CONFIGS=[{"id":"w188828391","parts":[{"ring":[[15.195846759805537,8.345059071117472],[-30.519942825680225,6.913439047079749],[-30.255957775830627,-8.485688860813905],[15.69295124034186,-7.046768548451526]],"h":14,"obb":{"c":[-7.522513267744384,-0.07007870463271523],"ax":[-0.9995100251358284,-0.03130031394372326],"L":45.971433863235404,"W":15.399845537225366},"roof":"hipped","pitch":17,"floor":7,"arch":"courthouse","bay":5.2,"roofTex":"slate","colour":"#758279"}],"wall":"#e7e5d6","extra":"courthouse","height":28.3,"ports":[{"c":[-7.52,-0.07],"n":[-0.0313,0.9995],"u":11.616864000000001,"width":16,"depth":3.8,"base":5.2,"top":13.4,"columns":4,"clock":false,"order":"corinthian","radius":0.54},{"c":[-7.52,-0.07],"n":[0.0313,-0.9995],"u":11.622247999999999,"width":16,"depth":3.8,"base":5.2,"top":13.4,"columns":4,"clock":false,"order":"corinthian","radius":0.54}],"arch":"courthouse"},{"id":"w321045760","parts":[{"ring":[[-108.53,-54.06],[-108.81,-94.74],[-130.8,-94.63],[-130.52,-53.96]],"h":8,"obb":{"c":[-119.66500000000002,-74.345],"ax":[-0.00688282614700141,-0.9999763130715797],"L":40.722319559607726,"W":21.990236235320204},"facade":"civic","bay":3.2,"floor":4,"arch":"lyric","style":{"sideWall":"#a5583f"}}],"wall":"#ece9df","extra":null,"height":25,"arch":"lyric","frontNormal":[0,1],"signName":"THE LYRIC","shopColour":"#6c3c30"},{"id":"w451755566","parts":[{"ring":[[86.05,14.16],[52.05,14.24],[52.15,35.07],[86.15,34.99]],"h":10.8,"obb":{"c":[69.1,24.614999999999995],"ax":[0.999997231845404,-0.002352934663165666],"L":34.05108221166761,"W":20.830177632806084},"roof":"hipped","pitch":42,"colour":"#81928c","arch":"campus-sash","bay":3.8}],"wall":"#ad7055","extra":"cityhall","height":17.5,"arch":"campus-sash"},{"id":"w599810022","parts":[{"ring":[[-13.1,-84.58],[-20.18,-84.23],[-19.95,-53.18],[-13.27,-53.15]],"h":9.3,"obb":{"c":[-16.72,-68.88],"ax":[-0.005,1.0],"L":31.43,"W":7.08,"fill":0.966},"floor":4.65,"arch":"books","bay":2.35,"style":{"frontBay":2.35,"sideBay":3.5}}],"wall":"#c9623f","arch":"books","height":9.8,"frontNormal":[0,1],"signName":"SQUARE BOOKS","shopColour":"#eee7d3","galleries":[{"c":[-13.2,-68.8],"n":[1,0],"length":29.7,"depth":1.7,"z":4.3}]},{"id":"w599810038","parts":[{"ring":[[-42.78,-93.12],[-49.42,-93.26],[-49.27,-53.16],[-42.15,-53.01]],"h":8.7,"obb":{"c":[-45.78,-73.13],"ax":[0.0038,1.0],"L":40.28,"W":7.12,"fill":0.962},"floor":4.35,"arch":"grocery","bay":2.4,"style":{"frontBay":2.4,"sideBay":3.5}}],"wall":"#a66348","arch":"grocery","height":9.2,"frontNormal":[0,1],"signName":"CITY GROCERY","shopColour":"#637465","galleries":[{"c":[-45.71,-53.03],"n":[0,1],"length":7.05,"depth":1.7,"z":4.2}]},{"id":"w599810029","parts":[{"ring":[[-34.66,-84.12],[-34.33,-53.04],[-27.5,-53.13],[-27.76,-84.16]],"h":9.5,"obb":{"c":[-31.08,-68.61],"ax":[-0.0086,-1.0],"L":31.08,"W":6.9,"fill":0.995},"floor":4.75,"arch":"bank","bay":2.3,"style":{"frontBay":2.3,"sideBay":3.5}}],"wall":"#e0dbca","arch":"bank","height":10.0,"frontNormal":[0,1],"signName":"REGIONS BANK","shopColour":"#eee7d3"}];
const LANDMARKS=CONFIGS.map(c=>({name: c.id,ids:[c.id],build:()=>hallModel(c)}));

function CITY_EXTRA(t){if(SEASON.id!=='doubledecker')return [];const out=[];for(let i=0;i<9;i++){const x=-45+i*11,y=44;if(!standable(x,y,2))continue;out.push({fp:rect(x,y,4,3),h:3.8,draw:()=>{let s='';for(const dx of [-1.8,1.8])for(const dy of [-1.2,1.2])s+=stick([x+dx,y+dy,0],[x+dx,y+dy,2.5],.06,CREAM);return s+peak(ccw(rect(x,y,4.4,3.2)),2.5,[x,y,3.8],i%3?'#e8dfc9':'#a96150')}})}return out}

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
  if(shutters){const c=shade('#344c40'),sw=w*.42;for(const xx of [x-sw-.12,x+w+.12]){box(xx,y,sw,h,c);if(UPX<.25)for(let yy=y+.1;yy<y+h;yy+=.15)box(xx+.04,yy,sw-.08,.025,shade('#70816a'))}}
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
  brick();cornice(kind!=='croft');const fl=st.floor||4.5,nf=st.archFloors||Math.max(1,Math.round(H/fl)),rh=H/nf;
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
 if(kind==='modern-campus'){
  brick();box(0,0,L,.35,ivory);box(0,H-.3,L,.3,ivory);
  const n=Math.max(2,Math.round(L/(st.bay||3.8))),bw=L/n,nf=Math.max(2,Math.round(H/(st.floor||3.8))),rh=H/nf;
  for(let i=0;i<n;i++)for(let j=0;j<nf;j++){const x=i*bw+.35,y=j*rh+.7,w=bw-.7,h=rh-1;box(x,y,w,h,glass);box(x,y+h*.7,w,.08,ivory);box(x+w*.5,y,.055,h,ivory)}
  return true;
 }
 if(kind==='shop'||kind==='books'||kind==='grocery'||kind==='bank'||kind==='neilsons'||kind==='lyric'){
  brick(kind!=='bank');cornice();const nrm=st.frontNormal;
  const front=nrm?F.n[0]*nrm[0]+F.n[1]*nrm[1]>.85:F.street&&F.shop;
  const side=kind==='books'&&F.n[0]>.8;
  const nf=st.archFloors||Math.max(1,Math.round(H/(st.floor||4))),n=Math.max(1,Math.round(L/(front?(st.frontBay||st.bay||3.3):(st.sideBay||st.bay||3.3)))),bw=L/n;
  if(!front&&!side){
   if(L<10)sash(L/2-.5,1.6,1,2.3,false,false,2);
   else{for(let i=1;i<n;i+=2)sash(i*bw-.5,1.5,1,2.2,false,false,2);box(0,H-.3,L,.3,shade('#8f7b65'))}
   return true;
  }
  const upperH=Math.max(3,H-3.8),rows=Math.max(1,nf-1),rh=upperH/rows;
  for(let j=0;j<rows;j++)for(let i=0;i<n;i++){
   const w=Math.min(kind==='books'?1.25:1.4,bw*.43),x=(i+.5)*bw-w/2,y=j*rh+rh*.18;
   sash(x,y,w,rh*.65,kind==='books'||kind==='bank',false,2);
   if(kind==='books'||kind==='bank'){box(x-.23,y-.26,w+.46,.13,ivory);box(x-.15,y-.12,w+.3,.12,ivory)}
  }
  const y=H-3.6,fascia=shade(st.shopColour||'#3e574b');box(0,y,L,3.6,shade(st.shopWall||F.body));
  const nb=Math.max(1,Math.round(L/(kind==='neilsons'?4:3.1))),sb=L/nb;
  for(let i=0;i<nb;i++){
   const x=i*sb+.18,w=sb-.36;box(x,y+.65,w,2.75,ivory);if(kind==='books'){arch(x+.09,y+.74,w-.18,2.48,glass);box(x,y+3.24,w,.2,shade('#3e3f36'))}else box(x+.09,y+.74,w-.18,2.48,glass);box(x+.12,y+2.6,w-.24,.06,ivory);
   if(kind==='books'&&UPX<.25){for(let r=0;r<3;r++){box(x+.15,y+1.2+r*.55,w-.3,.06,ivory);for(let k=0;k<9;k++)box(x+.2+k*(w-.4)/9,y+.9+r*.55,(w-.4)/9-.025,.28,shade(['#ad725b','#c6b387','#698475','#ab9e73'][k%4]))}}
   if(i===Math.floor(nb/2)){box(x+w*.48,y+.7,.07,2.6,ivory);box(x+w*.45,y+2.1,.07,.18,shade('#c8b282'))}
  }
  box(.06,y+.03,L-.12,.48,fascia);const label=st.signName||F.sign;
  if(label)text(label,L/2,y+.27,L-.4,Math.min(.48,L/Math.max(9,label.length)*1.3));
  if(kind==='bank'){box(0,upperH-.35,L,.35,ivory);text('BANK',L/2,.9,L*.75,.7)}
  if(kind==='neilsons'){box(0,H-4.2,L,.45,ivory);text('NEILSON’S',L/2,H-3.95,Math.min(13,L*.75),.65,shade('#644e35'))}
  if(kind==='lyric'){box(0,H-5.2,L,1.35,shade('#e2d8c0'));text('THE LYRIC',L/2,H-4.5,L*.8,.8,shade('#9d503b'))}
  return true;
 }
 return false;
}

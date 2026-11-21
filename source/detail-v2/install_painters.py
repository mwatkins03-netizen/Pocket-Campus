from pathlib import Path
p=Path('work/pocket-city/assets/kit/city.js')
s=Path('work/detail-v2/city-v1.js').read_text()
needle="  if(kind==='glass'){"
insert="  if(st.arch&&paintOxfordArchitecture(g,F,{box,poly,shade})){g.restore();return}\n"
assert needle in s;s=s.replace(needle,insert+needle,1)
s=s.replace("if(op.name==='copper'){","if(op.name==='standing-seam'){for(let x=0;x<256;x+=24){ink.fillStyle='rgba(42,57,50,.25)';ink.fillRect(x,0,1.8,256);ink.fillStyle='rgba(238,240,216,.25)';ink.fillRect(x+2,0,1,256)}}else if(op.name==='copper'){",1)
s+='\n'+Path('work/detail-v2/architectural_elevations.js').read_text()
p.write_text(s)

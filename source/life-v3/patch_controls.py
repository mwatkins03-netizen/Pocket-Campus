from pathlib import Path
p=Path('work/pocket-city/assets/page.js');s=Path('work/life-v3/base/page.js').read_text()
s=s.replace("let season=months[localMonth-1]", "let windMode=1;let season=months[localMonth-1]")
s=s.replace("viewList=[['cine','Cinematic']]", "viewList=[['cine','Cinematic'],['iso','Overview']]")
s=s.replace("  const n=NOTES[s]||{};", "  const occasion=OCCASIONS.find(o=>o.id===s);if(change&&occasion?.view)setView(occasion.view);\n  const n=NOTES[s]||{};")
s=s.replace("season,seq:++seq", "season,wind:[0,1,2.2][windMode],seq:++seq")
# Add simple, focus-preserving camera controls instead of forcing a preset when orbiting.
needle="selectSeason(season);setPlay(playing);requestAnimationFrame(tick);"
controls='''
const lifeDock=document.createElement('div');lifeDock.className='life-tools';lifeDock.setAttribute('aria-label','View and wind controls');
const tool=(label,title,action)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);b.onclick=action;lifeDock.append(b);return b};
tool('↶','Rotate view left',()=>{freeView();goal.yaw-=30;redraw()});
tool('↷','Rotate view right',()=>{freeView();goal.yaw+=30;redraw()});
tool('Low','Lower viewing angle',()=>{freeView();goal.pitch=Math.max(12,goal.pitch-12);redraw()});
tool('High','Raise viewing angle',()=>{freeView();goal.pitch=Math.min(74,goal.pitch+12);redraw()});
const windButton=tool('Breeze','Change wind strength',()=>{windMode=(windMode+1)%3;windButton.textContent=['Calm','Breeze','Gusty'][windMode];windButton.setAttribute('aria-label','Wind: '+windButton.textContent);redraw()});windButton.id='windControl';
stage.append(lifeDock);
'''
assert needle in s;s=s.replace(needle,controls+needle)
p.write_text(s)

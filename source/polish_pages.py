from pathlib import Path
R=Path(__file__).parent.parent/'outputs'
for f in ['oxford-square.html','ole-miss-campus.html']:
 p=R/f;s=p.read_text()
 s=s.replace('Turn a hand-drawn, register-built miniature of Amsterdam\'s Reguliersgracht and Keizersgracht. Explore its seasons, bridges and street life.','Explore Oxford, Mississippi and the University of Mississippi in an interactive illustrated atlas built from OpenStreetMap.')
 s=s.replace('</style>','''\n.vbtn[data-v^="angle"],.vbtn[data-v^="detailcheck"]{display:none}.atlas-links{display:flex;gap:16px;align-items:center;margin-left:20px;font-size:12px;font-weight:600}.atlas-links a{text-decoration:none}.atlas-links a:hover{text-decoration:underline}@media(max-width:760px){.atlas-links{gap:10px;margin-left:8px;font-size:10px}.atlas-links .atlas-home{display:none}.top .identity .wordmark{font-size:22px}.top{padding-left:12px;padding-right:12px}}\n</style>''',1)
 nav='<nav class="atlas-links" aria-label="Atlas pages"><a class="atlas-home" href="index.html">Atlas home</a><a href="'+('ole-miss-campus.html' if f=='oxford-square.html' else 'oxford-square.html')+'">'+('Campus' if f=='oxford-square.html' else 'The Square')+'</a><a href="campus-overview.html">Campus map</a></nav>'
 s=s.replace('<div class="topnav">',nav+'<div class="topnav">',1)
 p.write_text(s)

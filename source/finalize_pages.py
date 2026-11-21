from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
CSS = '\n.vbtn[data-v^="angle"],.vbtn[data-v^="detailcheck"]{display:none}.atlas-links{display:flex;gap:16px;align-items:center;margin-left:20px;font-size:12px;font-weight:600}.atlas-links a{text-decoration:none}.atlas-links a:hover{text-decoration:underline}@media(max-width:760px){.atlas-links{gap:10px;margin-left:8px;font-size:10px}.atlas-links .atlas-home{display:none}.top .identity .wordmark{font-size:22px}.top{padding-left:12px;padding-right:12px}}\n\n.life-tools{position:absolute;z-index:6;right:20px;bottom:92px;display:flex;align-items:center;border:1px solid #bfc6b4;border-radius:7px;background:#fffcf3;overflow:hidden;box-shadow:0 2px 3px #273c3510}.life-tools button{font:600 12px/1 system-ui;color:#35564a;padding:12px 14px;border-right:1px solid #d4d8c9;min-width:40px}.life-tools button:last-child{border:0;min-width:65px}.life-tools button:hover{background:#e8ecdf}.life-tools button:focus-visible{outline:2px solid #a64e38;outline-offset:-3px}@media(max-width:760px){.life-tools{right:12px;bottom:88px}.life-tools button{padding:10px;min-width:33px;font-size:11px}.life-tools button:last-child{min-width:57px}}\n'
for name in ['oxford-square.html', 'ole-miss-campus.html']:
    p = ROOT / name
    s = p.read_text(encoding="utf-8")
    s = s.replace("Turn a hand-drawn, register-built miniature of Amsterdam's Reguliersgracht and Keizersgracht. Explore its seasons, bridges and street life.", "Explore Oxford, Mississippi and the University of Mississippi in an interactive illustrated atlas built from OpenStreetMap.")
    if 'class="atlas-links"' not in s:
        s = s.replace('</style>', CSS + '</style>', 1)
        other = 'ole-miss-campus.html' if name == 'oxford-square.html' else 'oxford-square.html'
        label = 'Campus' if name == 'oxford-square.html' else 'The Square'
        nav = '<nav class="atlas-links" aria-label="Atlas pages"><a class="atlas-home" href="index.html">Atlas home</a><a href="' + other + '">' + label + '</a><a href="campus-overview.html">Campus map</a></nav>'
        s = s.replace('<div class="topnav">', nav + '<div class="topnav">', 1)
    p.write_text(s, encoding="utf-8")

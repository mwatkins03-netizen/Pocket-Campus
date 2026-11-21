from pathlib import Path
for name in ['oxford-square.html','ole-miss-campus.html']:
 p=Path('outputs')/name;s=p.read_text().replace('</style>','''
.life-tools{position:absolute;z-index:6;right:20px;bottom:92px;display:flex;align-items:center;border:1px solid #bfc6b4;border-radius:7px;background:#fffcf3;overflow:hidden;box-shadow:0 2px 3px #273c3510}.life-tools button{font:600 12px/1 system-ui;color:#35564a;padding:12px 14px;border-right:1px solid #d4d8c9;min-width:40px}.life-tools button:last-child{border:0;min-width:65px}.life-tools button:hover{background:#e8ecdf}.life-tools button:focus-visible{outline:2px solid #a64e38;outline-offset:-3px}@media(max-width:760px){.life-tools{right:12px;bottom:88px}.life-tools button{padding:10px;min-width:33px;font-size:11px}.life-tools button:last-child{min-width:57px}}
</style>''',1);p.write_text(s)

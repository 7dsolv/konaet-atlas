from pathlib import Path
from html.parser import HTMLParser
import json,re,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
class Links(HTMLParser):
    def __init__(self):super().__init__();self.ids=[];self.links=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if a.get('id'):self.ids.append(a['id'])
        if tag=='html':assert a['lang']=='pt-BR'
        if tag=='script':assert a.get('src')
        for key in ['href','src']:
            if a.get(key):self.links.append(a[key])
def main():
    out=ROOT/'dist';p=Links();p.feed((out/'index.html').read_text(encoding='utf-8'));assert len(p.ids)==len(set(p.ids))
    for link in p.links:
        if link.startswith('#'):assert link[1:] in p.ids,link
        elif not link.startswith('https://'):assert (out/link).is_file(),link
    source=(out/'studio.js').read_text(encoding='utf-8')
    for id in re.findall(r"\$\(['\"]#([\w-]+)['\"]\)",source):assert id in p.ids,id
    assert 'innerHTML' not in source and 'eval(' not in source
    names={p['name'] for p in json.loads((out/'data/github.json').read_text(encoding='utf-8'))['repos']}
    for project in json.loads((out/'projects.json').read_text(encoding='utf-8')):assert project['name'] in names;assert (out/'art'/(project['art']+'.svg')).is_file()
    for path in (out/'art').glob('*.svg'):ET.parse(path)
    size=sum(f.stat().st_size for f in out.rglob('*') if f.is_file());assert size<1300000
    print(f'PASS: project targets, DOM IDs, local links, SVG syntax; complete public assets {size} bytes including PDFs.')
if __name__=='__main__':main()

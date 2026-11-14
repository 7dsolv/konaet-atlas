from pathlib import Path
from html.parser import HTMLParser
import json,re,xml.etree.ElementTree as ET
import hashlib
from urllib.parse import urlsplit
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
        elif not link.startswith('https://'):assert (out/urlsplit(link).path).is_file(),link
    source=(out/'studio.js').read_text(encoding='utf-8')
    map_source=(out/'map.js').read_text(encoding='utf-8')
    css=(out/'studio.css').read_text(encoding='utf-8')+'\n'+(out/'map.css').read_text(encoding='utf-8')
    for link in re.findall(r'url\([\'\"]?([^\)\'\"]+)',css):assert (out/link).is_file(),link
    assert (out/'art/FONT-LICENSE.txt').is_file()
    assert (out/'vendor/jsmediatags-LICENSE.md').is_file()
    assert hashlib.sha256((out/'vendor/jsmediatags.min.js').read_bytes()).hexdigest()=='9eeafeb1eedf87642384ec026a35a387ff36c0f6bb7048c292c79cab03c1b3a9'
    assert 'chatgpt.site' not in (out/'index.html').read_text(encoding='utf-8')
    for path in [out/'index.html',out/'studio.css',out/'studio.js',out/'map.css',out/'map.js']:
        assert '\ufffd' not in path.read_text(encoding='utf-8'),path
    for id in re.findall(r"\$\(['\"]#([\w-]+)['\"]\)",source+map_source):assert id in p.ids,id
    music=(out/'music.js').read_text(encoding='utf-8')
    assert all('innerHTML' not in s and 'eval(' not in s for s in (source,map_source,music))
    assert not re.search(r'\b\d{6,}:[A-Za-z0-9_-]{25,}',source+map_source+music+css)
    catalog=json.loads((out/'music/catalog.json').read_text(encoding='utf-8'))
    assert catalog['schema']==1 and len(catalog['tracks'])<=250
    for track in catalog['tracks']:
        assert track['url'].startswith('https://github.com/7dsolv/konaet-atlas/releases/download/pairbeat-')
    names={p['name'] for p in json.loads((out/'data/github.json').read_text(encoding='utf-8'))['repos']}
    for project in json.loads((out/'projects.json').read_text(encoding='utf-8')):assert project['name'] in names;assert (out/'art'/(project['art']+'.svg')).is_file()
    for path in (out/'art').glob('*.svg'):ET.parse(path)
    size=sum(f.stat().st_size for f in out.rglob('*') if f.is_file());assert size<1300000
    print(f'PASS: project targets, DOM IDs, local links, SVG syntax; complete public assets {size} bytes including PDFs.')
if __name__=='__main__':main()

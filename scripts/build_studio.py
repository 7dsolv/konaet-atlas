"""Build the public profile portal using only the Python standard library."""
from pathlib import Path
import argparse
import json
import shutil
import urllib.request
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]


def snapshot():
    def get(path):
        req=urllib.request.Request('https://api.github.com'+path,headers={'User-Agent':'Konaet-Profile-Studio','Accept':'application/vnd.github+json'})
        with urllib.request.urlopen(req,timeout=25) as r:return json.load(r)
    user=get('/users/7dsolv')
    repos=get('/users/7dsolv/repos?per_page=100&sort=updated')
    return {'checked_at':datetime.now(timezone.utc).isoformat(),'profile':{k:user[k] for k in ['login','name','bio','followers','following','public_repos','html_url']},'repos':[{k:r[k] for k in ['name','description','html_url','homepage','language','stargazers_count','fork','archived','updated_at']} for r in repos]}


def build():
    out=(ROOT/'dist').resolve()
    assert out==ROOT.resolve()/'dist'
    if out.exists():shutil.rmtree(out)
    shutil.copytree(ROOT/'site',out)
    shutil.copytree(ROOT/'assets/studio',out/'art')
    shutil.copytree(ROOT/'publications',out/'publications')
    shutil.copyfile(ROOT/'assets/publication-engineering-guide.svg',out/'art/guide.svg')
    shutil.copyfile(ROOT/'assets/publication-technical-manual.svg',out/'art/manual.svg')
    shutil.copyfile(ROOT/'assets/studio/avatar.png',out/'avatar.png')
    (out/'.nojekyll').touch()
    print('Built KONAET Studio in dist/ (static, no backend).')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh',action='store_true')
    args=parser.parse_args()
    if args.refresh:
        target=ROOT/'site/data/github.json';target.parent.mkdir(parents=True,exist_ok=True)
        target.write_text(json.dumps(snapshot(),ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    build()

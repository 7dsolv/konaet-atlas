"""Original vector artwork for the profile and its companion portal."""
from pathlib import Path
from xml.etree import ElementTree as ET
import math

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/studio'


def svg(body,w=960,h=560,title='KONAET — ilustração editorial'):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img"><title>{title}</title><defs><radialGradient id="glow"><stop stop-color="#7961dd" stop-opacity=".5"/><stop offset="1" stop-color="#17141f" stop-opacity="0"/></radialGradient><linearGradient id="face" x2=".8" y2="1"><stop stop-color="#c2b1ff"/><stop offset=".5" stop-color="#8e6af0"/><stop offset="1" stop-color="#432170"/></linearGradient><linearGradient id="side" x2="1" y2="1"><stop stop-color="#7b60df"/><stop offset="1" stop-color="#21162d"/></linearGradient><linearGradient id="line"><stop stop-color="#c8b8ff"/><stop offset="1" stop-color="#67517a"/></linearGradient></defs><rect width="{w}" height="{h}" fill="#111116"/>{body}</svg>'''


def cube(x=480,y=285,s=1):
    return f'''<g transform="translate({x} {y}) scale({s})"><ellipse cy="171" rx="173" ry="28" fill="#040306" opacity=".5"/><path d="M0-160 147-75 0 10-147-75Z" fill="url(#face)"/><path d="M-147-75 0 10 0 180-147 95Z" fill="url(#side)"/><path d="M0 10 147-75 147 95 0 180Z" fill="#49306a"/><path d="M0-160 147-75 147 95 0 180-147 95-147-75Z M-147-75 0 10 147-75 M0 10V180" stroke="url(#line)" stroke-width="2" fill="none"/><path d="M0-113 105-52 0 10-105-52Z" fill="#1d142e"/><path d="M0-113V10M-105-52 0 10 105-52" stroke="#a892dc" fill="none"/><path d="M-101 0-45 32-45 107-101 75Z" fill="#241832" stroke="#8f73b4"/><path d="M45 32 101 0 101 75 45 107Z" fill="#241832" stroke="#8f73b4"/></g>'''


def write(name,content):
    ET.fromstring(content);(OUT/name).write_text(content,encoding='utf-8',newline='\n')


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    glow='<ellipse cx="490" cy="290" rx="420" ry="280" fill="url(#glow)"/>'
    write('cover.svg',svg(glow+cube()+ '<g fill="#bcb0d1" opacity=".6"><circle cx="177" cy="167" r="4"/><circle cx="779" cy="376" r="4"/><circle cx="746" cy="101" r="3"/></g>'))
    neural=''
    layers=[(225,[185,280,375]),(475,[135,230,325,420]),(730,[185,280,375])]
    for a,b in zip(layers,layers[1:]):
        for ya in a[1]:
            for yb in b[1]:neural+=f'<path d="M{a[0]} {ya}C{a[0]+120} {ya} {b[0]-120} {yb} {b[0]} {yb}" fill="none" stroke="#53746e" stroke-width="2" opacity=".5"/>'
    for x,ys in layers:
        for y in ys:neural+=f'<circle cx="{x}" cy="{y}" r="19" fill="#151c1b" stroke="#b4f5d8" stroke-width="3"/><circle cx="{x}" cy="{y}" r="5" fill="#b4f5d8"/>'
    write('neural.svg',svg(glow+neural))
    horizon=''
    for i in range(3):
        x,y=190+i*75,105+i*65
        horizon+=f'<rect x="{x}" y="{y}" width="430" height="240" rx="16" fill="{["#1a2232","#283b55","#142335"][i]}" stroke="#718ba6" stroke-width="2"/><path d="M{x+20} {y+32}H{x+410}" stroke="#718ba6"/><circle cx="{x+22}" cy="{y+17}" r="4" fill="#b1cce8"/>'
    horizon+='<path d="M390 340h90m-90 18h160m-160 18h130" stroke="#c1d9ee" stroke-width="5" stroke-linecap="round"/>'
    write('horizon.svg',svg(glow+horizon))
    wave=''
    for j in range(17):
        points=' '.join(f'{100+x*12},{225+j*10+55*math.sin(x/7+j/5)*math.exp(-((x-31)/22)**2)}' for x in range(65))
        wave+=f'<polyline points="{points}" fill="none" stroke="{["#ffbe9f","#b58bc9","#716698"][j%3]}" stroke-width="1.8" opacity=".75"/>'
    write('quantum.svg',svg(glow+wave))
    bot='<path d="M215 190H440Q480 190 480 235V330Q480 375 520 375H735" fill="none" stroke="#9572d7" stroke-width="12"/><path d="M480 280Q480 190 550 190H735" fill="none" stroke="#b7a2dd" stroke-width="12"/>'
    for x,y in [(215,190),(735,190),(735,375)]:bot+=f'<circle cx="{x}" cy="{y}" r="36" fill="#20162e" stroke="#b5a0df" stroke-width="6"/>'
    write('bot.svg',svg(glow+bot))
    xray='<rect x="240" y="105" width="480" height="350" rx="24" fill="#16221f" stroke="#6b9e8b"/><path d="M285 170h215m-215 44h370m-370 44h270m-270 44h330m-330 44h190m-190 44h285" stroke="#8fbba8" stroke-width="8" stroke-linecap="round"/><path d="M175 281H785" stroke="#c3fbdc" stroke-width="3"/><rect x="240" y="265" width="480" height="32" fill="#b5f1d1" opacity=".15"/>'
    write('xray.svg',svg(glow+xray))
    write('math.svg',svg(glow+'<text x="200" y="355" fill="#c0d5ec" font-family="Georgia,serif" font-style="italic" font-size="180">∑</text><text x="410" y="310" fill="#96a7c3" font-family="Georgia,serif" font-style="italic" font-size="85">x² + y²</text><path d="M400 335H760" stroke="#667992" stroke-width="2"/><text x="530" y="410" fill="#b6c8df" font-family="Georgia,serif" font-style="italic" font-size="65">n + 1</text>'))
    hero='<ellipse cx="940" cy="250" rx="420" ry="340" fill="url(#glow)"/>'+cube(950,225,.92)+'''<g font-family="Arial,sans-serif"><text x="58" y="66" fill="#bbaaeb" font-size="15" letter-spacing="4">7DSOLV / KONAET STUDIO</text><text x="54" y="180" fill="#f7f4ff" font-size="91" font-weight="700" letter-spacing="-4">Da ideia</text><text x="54" y="277" fill="#f7f4ff" font-size="91" font-weight="700" letter-spacing="-4">ao sistema.</text><text x="58" y="332" fill="#a6a1b0" font-size="22">Adilson Oliveira · Engenharia &amp; pesquisa</text><rect x="58" y="378" width="284" height="50" rx="25" fill="#c7b4fa"/><text x="82" y="409" fill="#231a31" font-size="17" font-weight="700">EXPLORE O UNIVERSO KONAET ↗</text><text x="58" y="476" fill="#85808f" font-size="14" letter-spacing="2">SOFTWARE / IA / CIÊNCIA / HARDWARE</text></g>'''
    write('profile-hero.svg',svg(hero,1280,520,'7dsolv — Adilson Oliveira. Da ideia ao sistema.'))
    write('mark.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 72"><title>KONAET</title><path d="M32 3 60 19V52L32 69 4 52V19Z M4 19 32 36 60 19 M32 36V69" fill="none" stroke="#c9b5ff" stroke-width="4" stroke-linejoin="round"/></svg>')


if __name__=='__main__':main()

"""Deterministic original graphite-style SVG drawings, generated without raster assets."""
from pathlib import Path
from xml.etree import ElementTree as ET
from html import escape
import math
import random

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/studio'
INK = '#424c51'
PAPER = '#f3f2ed'
rng = random.Random(7401)


def line(points, width=1.7, opacity=.66, color=INK, copies=3):
    """Overlapping slightly displaced strokes imitate loose graphite construction lines."""
    result = []
    for i in range(copies):
        jitter = .6 if i == 0 else 1.5
        data = ' '.join(f'{x+rng.uniform(-jitter,jitter):.1f},{y+rng.uniform(-jitter,jitter):.1f}' for x,y in points)
        result.append(f'<polyline points="{data}" fill="none" stroke="{color}" stroke-width="{width if i == 0 else width*.48:.2f}" opacity="{opacity if i == 0 else opacity*.38:.2f}" stroke-linecap="round" stroke-linejoin="round"/>')
    return ''.join(result)


def ellipse(cx,cy,rx,ry,opacity=.35,color=INK):
    return line([(cx+rx*math.cos(i*math.pi/40),cy+ry*math.sin(i*math.pi/40)) for i in range(81)],1,opacity,color,2)


def rect(x,y,w,h,opacity=.6):
    return line([(x,y),(x+w,y),(x+w,y+h),(x,y+h),(x,y)],1.5,opacity)


def hatch(x,y,w,h,opacity=.16):
    return ''.join(line([(x+i,y),(x+min(i+30,w),y+h)],.8,opacity,copies=1) for i in range(0,int(w-30),8))


def label(x,y,text,size=12,opacity=.57):
    return f'<text x="{x}" y="{y}" font-family="monospace" font-size="{size}" fill="{INK}" opacity="{opacity}" letter-spacing="1.7">{escape(text)}</text>'


def grid(w,h):
    dots=' '.join(f'M{x} {y}h.01' for y in range(17,h,32) for x in range(17,w,32))
    return f'<rect width="{w}" height="{h}" fill="{PAPER}"/><path d="{dots}" fill="none" stroke="#68767d" stroke-width="1.2" stroke-linecap="round" opacity=".12"/>'


def svg(body,w=960,h=560,title='KONAET — estudo a grafite',paper=True):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img"><title>{escape(title)}</title>{grid(w,h) if paper else ""}{body}</svg>'


def write(name,body,w=960,h=560,title='KONAET — estudo a grafite',paper=True):
    content=svg(body,w,h,title,paper)
    ET.fromstring(content)
    (OUT/name).write_text(content,encoding='utf-8',newline='\n')


def cube(cx=480,cy=280,s=1):
    parts=[]
    def stroke(coords,width=1.8,opacity=.7):
        return line([(cx+x*s,cy+y*s) for x,y in coords],width,opacity)
    parts.append(f'<polygon points="{cx-150*s},{cy-73*s} {cx},{cy+14*s} {cx},{cy+188*s} {cx-150*s},{cy+101*s}" fill="#c9cbc6" opacity=".28"/>')
    parts.append(stroke([(0,-160),(150,-73),(150,101),(0,188),(-150,101),(-150,-73),(0,-160)],2.5))
    parts.append(stroke([(-150,-73),(0,14),(150,-73)],2.1))
    parts.append(stroke([(0,14),(0,188)],2.1))
    parts.append(stroke([(0,-114),(111,-50),(0,14),(-111,-50),(0,-114),(0,14)],1.5,.6))
    parts.append(stroke([(-105,-3),(-46,31),(-46,106),(-105,72),(-105,-3)],1.5,.7))
    parts.append(stroke([(46,31),(105,-3),(105,72),(46,106),(46,31)],1.5,.7))
    for i in range(13):
        x=-141+i*7
        parts.append(stroke([(x,-59+(x+141)*.58),(x,96+(x+141)*.58)],.65,.17))
    parts.append(stroke([(-180,-91),(180,117)],.7,.22))
    parts.append(stroke([(-180,117),(180,-91)],.7,.22))
    parts.append(stroke([(0,-194),(0,214)],.7,.22))
    return ''.join(parts)


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    cover=cube()+ellipse(480,473,177,15,.2)+line([(295,105),(267,88),(267,401),(295,417)],1,.3)
    cover+=label(166,277,'01',17)+line([(660,175),(752,126),(798,126)],.9,.35)+label(747,112,'KONAET',12)
    cover+=label(63,57,'FORM / STRUCTURE',11)+label(63,520,'STUDY 01',10)
    write('cover.svg',cover,title='KONAET Cover — cubo em estudo a grafite')
    neural=label(63,57,'NODES / CONNECTIONS',11)
    layers=[(235,[185,280,375]),(480,[130,230,330,430]),(725,[185,280,375])]
    for a,b in zip(layers,layers[1:]):
        for ya in a[1]:
            for yb in b[1]:neural+=line([(a[0],ya),((a[0]+b[0])/2,(ya+yb)/2),(b[0],yb)],.8,.22)
    for x,ys in layers:
        for y in ys:
            neural+=ellipse(x,y,18,18,.75)+ellipse(x,y,5,5,.65)
    neural+=line([(200,472),(758,472)],.8,.25)+label(63,520,'STUDY 02',10)
    write('neural.svg',neural,title='IA Neural — conexões desenhadas a grafite')
    horizon=label(63,57,'LAYERS / SYSTEM',11)
    for i in range(3):
        x,y=215+i*65,110+i*60
        horizon+=f'<rect x="{x}" y="{y}" width="400" height="222" fill="{PAPER}"/>'+rect(x,y,400,222)
        horizon+=line([(x,y+29),(x+400,y+29)],1,.45)
        for j in range(3):horizon+=ellipse(x+15+j*14,y+14,3,3,.4)
    for i,l in enumerate([230,140,195,100]):horizon+=line([(377,312+i*20),(377+l,312+i*20)],1.5,.55)
    horizon+=label(63,520,'STUDY 03',10)
    write('horizon.svg',horizon,title='KONAET Horizon — camadas de um sistema')
    wave=label(63,57,'FIELDS / WAVES',11)+line([(128,427),(836,427)],.8,.35)+line([(140,455),(140,134)],.8,.35)
    for j in range(11):
        points=[(125+x*11,220+j*12+62*math.sin(x/6+j/5)*math.exp(-((x-31)/22)**2)) for x in range(65)]
        wave+=line(points,1.15,.43,copies=2)
    wave+=label(63,520,'STUDY 04',10)
    write('quantum.svg',wave,title='Realidade Quântica — desenho de campos e ondas')
    bot=label(63,57,'BRANCHES / PROPOSALS',11)
    bot+=line([(230,182),(424,182),(480,229),(480,327),(534,376),(730,376)],2.4,.75)
    bot+=line([(480,283),(480,229),(534,182),(730,182)],2.4,.75)
    for x,y in [(230,182),(730,182),(730,376)]:bot+=ellipse(x,y,32,32,.7)+ellipse(x,y,11,11,.45)
    bot+=line([(186,460),(771,460)],.8,.22)+label(63,520,'STUDY 05',10)
    write('bot.svg',bot,title='KONAET Bot — ramos e propostas em grafite')
    xray=label(63,57,'INSPECT / TRACE',11)+rect(256,108,448,345)
    for i,l in enumerate([215,340,265,312,180,282]):xray+=line([(290,162+i*45),(290+l,162+i*45)],2,.5)
    xray+=line([(184,286),(780,286)],2,.8)+hatch(257,271,447,31,.18)
    xray+=line([(192,253),(192,319)],1,.4)+line([(772,253),(772,319)],1,.4)+label(63,520,'STUDY 06',10)
    write('xray.svg',xray,title='KONAET Xray — inspeção desenhada a grafite')
    formula=label(63,57,'NOTES / MATHEMATICS',11)
    formula+='<g fill="#424c51" font-family="Georgia,serif" font-style="italic" opacity=".74"><text x="212" y="350" font-size="170">∑</text><text x="414" y="272" font-size="77">x² + y²</text><text x="493" y="382" font-size="66">n + 1</text></g>'
    formula+=line([(405,304),(752,304)],1.6,.55)+line([(187,414),(794,414)],.7,.25)+label(63,520,'STUDY 07',10)
    write('math.svg',formula,title='Caderno de matemática — notas e fórmulas')
    mark=line([(32,4),(59,20),(59,51),(32,68),(5,51),(5,20),(32,4)],2,.85,copies=2)+line([(5,20),(32,36),(59,20)],2,.85,copies=2)+line([(32,36),(32,68)],2,.85,copies=2)
    write('mark.svg',mark,64,72,'KONAET — marca em grafite',False)
    # A quiet drawing board. Large open middle preserves legibility behind the glass.
    sketch='<rect width="1800" height="1200" fill="#e9eceb"/>'
    sketch+='<g opacity=".28" transform="translate(-340 120) rotate(-13)">'+cube(480,285,1.65)+'</g>'
    sketch+='<g opacity=".22" transform="translate(1370 720) rotate(12)">'+rect(0,0,360,245)+rect(35,35,360,245)+line([(35,74),(395,74)],1,.5)+hatch(50,110,250,65,.16)+'</g>'
    for i in range(4):
        sketch+=line([(1250+i*27,-15),(1810,330+i*34)],.8,.12,copies=2)
    sketch+=ellipse(1630,195,200,200,.11)+ellipse(1630,195,158,158,.11)
    sketch+=line([(70,1035),(430,1035),(475,990)],.9,.17)+line([(70,1024),(70,1046)],.9,.17)
    sketch+=line([(1360,1110),(1710,1110)],.9,.14)
    write('sketch.svg',sketch,1800,1200,'KONAET — prancha de desenhos originais',False)
    print('Generated 9 original graphite SVG assets.')


if __name__ == '__main__':
    main()

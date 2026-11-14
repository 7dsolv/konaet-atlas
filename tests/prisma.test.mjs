import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Window} from 'happy-dom';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('site/index.html'),projects=JSON.parse(read('site/projects.json')),catalog=JSON.parse(read('site/data/github.json'));
const wait=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setTimeout(resolve,4));};
async function setup(){
 const w=new Window({url:'https://example.org/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});w.document.write(html);const d=w.document,intervals=[];
 w.HTMLCanvasElement.prototype.getContext=()=>null;
 w.setInterval=(fn,ms)=>{const record={fn,ms,active:true};intervals.push(record);return intervals.length;};w.clearInterval=id=>{if(intervals[id-1])intervals[id-1].active=false;};
 w.fetch=async url=>({ok:true,json:async()=>structuredClone(String(url).includes('projects.json')?projects:String(url).startsWith('https://')?catalog.repos:String(url).startsWith('music/')?{schema:1,provider:{connected:false},tracks:[]}:catalog)});
 const audio=d.querySelector('audio');audio.load=()=>{};audio.play=async()=>audio.dispatchEvent(new w.Event('play'));audio.pause=()=>audio.dispatchEvent(new w.Event('pause'));
 for(const name of ['map.js','studio.js','music.js','prisma-scenes.js','prisma-terminal.js','prisma.js'])w.eval(read('site/'+name));await wait();
 return{w,d,intervals,input:(selector,value)=>{const input=d.querySelector(selector);input.value=String(value);input.dispatchEvent(new w.Event('input',{bubbles:true}));},close:async()=>{w.dispatchEvent(new w.Event('pagehide'));await w.happyDOM.close();}};
}
test('all six boards open and preference controls update the entire Atlas',async()=>{
 const e=await setup();try{const {d,w}=e;d.querySelector('[data-view="prisma"]').click();assert.equal(d.querySelector('#prisma-view').hidden,false);assert.equal(d.querySelectorAll('[data-prisma-panel]').length,6);for(const button of d.querySelectorAll('[data-prisma-tab]')){button.click();assert.equal(d.querySelector('[data-prisma-panel="'+button.dataset.prismaTab+'"]').hidden,false);}
 d.querySelector('[data-pref="light"][data-value="spin"]').click();e.input('input[data-pref="border"]',4);e.input('input[data-pref="glow"]',80);assert.equal(d.documentElement.dataset.light,'spin');assert.equal(d.documentElement.style.getPropertyValue('--p-border'),'4px');assert.equal(d.documentElement.style.getPropertyValue('--p-glow'),'0.8');assert.equal(JSON.parse(w.localStorage.getItem('konaet.atlas.prisma')).border,4);assert([...d.querySelectorAll('input[data-pref="border"]')].every(input=>input.value==='4'));
 d.querySelector('[data-action="motion"]').click();assert.equal(d.documentElement.dataset.motion,'off');assert.equal(w.Prisma.preferences.motion,false);e.input('#prisma-volume',25);assert.equal(d.querySelector('audio').volume,.25);
 }finally{await e.close();}
});
test('Prisma navigation and slider operate the actual projects and bookmarks',async()=>{
 const e=await setup();try{const {d,w}=e;d.querySelector('[data-go="map"]').click();assert.equal(d.querySelector('#map-view').hidden,false);assert.equal(d.querySelector('.p-dock-button[data-go="map"]').getAttribute('aria-current'),'page');w.Atlas.select('IA_Neural');assert.equal(d.querySelector('#prisma-card-title').textContent,'IA Neural');const slider=d.querySelector('[data-slide="save"] input');slider.value='100';slider.dispatchEvent(new w.Event('change',{bubbles:true}));assert(w.Atlas.saved.includes('IA_Neural'));assert.equal(slider.disabled,true);assert.equal(d.querySelector('#overview-saved').textContent,'01');assert.equal(d.querySelector('#prisma-stat-saved').textContent,'1');
 }finally{await e.close();}
});
test('hex editor runs its selected sequence and can clear and restore it',async()=>{
 const e=await setup();try{const {d}=e;assert.equal(d.querySelectorAll('.hud-hex').length,42);assert.equal(d.querySelector('#hud-count').textContent,'12');d.querySelector('[data-tool="erase"]').click();d.querySelector('[data-cell="3"]').click();assert.equal(d.querySelector('#hud-count').textContent,'11');d.querySelector('#hud-run').click();assert.equal(d.querySelectorAll('.hud-hex.is-running').length,1);const interval=e.intervals.find(record=>record.ms===450);assert(interval);for(let i=0;i<11;i++)interval.fn();assert.match(d.querySelector('#hud-status').textContent,/concluída/);d.querySelector('#hud-clear').click();assert.equal(d.querySelector('#hud-count').textContent,'0');assert.equal(d.querySelector('#hud-run').disabled,true);d.querySelector('#hud-preset').click();assert.equal(d.querySelector('#hud-count').textContent,'12');
 }finally{await e.close();}
});
test('HUD inventory, skill budget and radial bars respond to their controls',async()=>{
 const e=await setup();try{const {d}=e;assert.equal(d.querySelectorAll('#hud-inventory button').length,15);d.querySelector('#hud-equip').click();assert.match(d.querySelector('#hud-item-description').textContent,/equipado/);d.querySelectorAll('#hud-inventory button')[3].click();assert.equal(d.querySelector('#hud-equip').disabled,true);d.querySelectorAll('#hud-skills button')[2].click();assert.equal(d.querySelector('#hud-points').textContent,'0 pts');d.querySelectorAll('#hud-skills button')[3].click();assert.equal(d.querySelectorAll('#hud-skills [aria-pressed="true"]').length,5);e.input('#hud-bars input',100);assert.equal(d.querySelector('#hud-gauge strong').textContent,'69');d.querySelector('.hud-color[data-frame="cut"]').click();assert.equal(e.w.Prisma.preferences.accent,'#ff6b6b');
 }finally{await e.close();}
});
test('configuration steps, named preset, bulk bookmarks and reset confirmation work',async()=>{
 const e=await setup();try{const {d,w}=e;for(let i=0;i<4;i++)d.querySelector('#prisma-step-next').click();assert.equal(d.querySelector('#prisma-step-count').textContent,'5 / 5');d.querySelector('#prisma-preset-name').value='Meu Atlas';d.querySelector('#prisma-preset-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(JSON.parse(w.localStorage.getItem('konaet.atlas.prisma-preset')).name,'Meu Atlas');const checks=d.querySelectorAll('#prisma-project-checks input');for(const input of [...checks].slice(0,2)){input.checked=true;input.dispatchEvent(new w.Event('change',{bubbles:true}));}d.querySelector('#prisma-save-checked').click();assert.equal(w.Atlas.saved.length,2);d.querySelector('[data-pref="accent"][data-value="#c06bff"]').click();d.querySelector('[data-action="reset-preferences"]').click();assert.equal(d.querySelector('#prisma-confirm').open,true);d.querySelector('#prisma-confirm-reset').click();assert.equal(w.Prisma.preferences.accent,'#ff8a54');assert.equal(w.Atlas.saved.length,2);
 }finally{await e.close();}
});
test('particle engine draws the torus and changes shape while honoring pause',async()=>{
 const w=new Window({url:'https://example.org/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});w.document.write(html);const canvas=w.document.querySelector('#map-scene');w.document.querySelector('#map-view').hidden=false;Object.defineProperty(canvas,'clientWidth',{value:720});Object.defineProperty(canvas,'clientHeight',{value:440});let dots=0,frames=[];
 const ctx={setTransform(){},clearRect(){},fillRect(){dots++;},beginPath(){},arc(){dots++;},fill(){},createLinearGradient(){return{addColorStop(){}}},moveTo(){},quadraticCurveTo(){},stroke(){}};
 w.HTMLCanvasElement.prototype.getContext=function(){return this===canvas?ctx:null;};w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};w.cancelAnimationFrame=()=>{};
 try{w.eval(read('site/prisma-scenes.js'));frames.shift()(100);assert(dots>1000);assert.equal(canvas.dataset.shape,'torus');w.document.dispatchEvent(new w.CustomEvent('prisma:change',{detail:{shape:'sphere',motion:false}}));frames.shift()(150);assert.equal(canvas.dataset.shape,'sphere');assert.equal(canvas.dataset.animating,'false');assert(Number(canvas.dataset.frame)>=2);}finally{w.dispatchEvent(new w.Event('pagehide'));await w.happyDOM.close();}
});
test('terminal simulation updates charts, pauses and resets without external data',async()=>{
 const e=await setup();try{const {d,w}=e;w.Atlas.view('prisma');w.Prisma.tab('data');assert.equal(d.querySelectorAll('#prisma-orderbook>div').length,8);assert.equal(d.querySelectorAll('#prisma-execution-tape tr').length,6);assert.equal(d.querySelectorAll('#prisma-candles rect').length,36);const price=d.querySelector('#prisma-sim-price').textContent;for(const timer of e.intervals.filter(timer=>timer.active&&timer.ms===1000))timer.fn();assert.notEqual(d.querySelector('#prisma-sim-price').textContent,price);d.querySelector('#prisma-sim-toggle').click();const paused=d.querySelector('#prisma-sim-price').textContent;for(const timer of e.intervals.filter(timer=>timer.active&&timer.ms===1000))timer.fn();assert.equal(d.querySelector('#prisma-sim-price').textContent,paused);d.querySelector('#prisma-sim-reset').click();assert.equal(d.querySelector('#prisma-candles').dataset.tick,'0');
 }finally{await e.close();}
});

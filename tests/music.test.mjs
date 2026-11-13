import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Window} from 'happy-dom';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('site/index.html'),studio=read('site/studio.js'),music=read('site/music.js');
const projects=JSON.parse(read('site/projects.json')),repos=JSON.parse(read('site/data/github.json'));
const wait=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setTimeout(r,5));};
async function setup(catalog={schema:1,provider:{connected:false},tracks:[]}){
 const w=new Window({url:'https://example.org/konaet-atlas/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 w.document.write(html);const d=w.document,calls=[],revoked=[];
 w.fetch=async url=>{calls.push(String(url));return{ok:true,json:async()=>structuredClone(String(url).startsWith('music/')?catalog:String(url).includes('projects.json')?projects:repos)};};
 let id=0;w.URL.createObjectURL=()=>`blob:https://example.org/${++id}`;w.URL.revokeObjectURL=u=>revoked.push(u);
 const audio=d.querySelector('audio');let paused=true;Object.defineProperty(audio,'paused',{get:()=>paused});
 audio.play=async()=>{paused=false;audio.dispatchEvent(new w.Event('play'));};audio.pause=()=>{paused=true;audio.dispatchEvent(new w.Event('pause'));};
 w.eval(studio);w.eval(music);await wait();d.querySelector('[data-view="music"]').click();await wait();
 return{w,d,audio,calls,revoked,close:()=>w.happyDOM.close()};
}
test('published catalog opens native audio controls and advances through its queue',async()=>{
 const e=await setup({schema:1,provider:{connected:true},tracks:[{id:'a',title:'First track',artist:'KONAET',url:'https://example.org/a.mp3',duration:90},{id:'b',title:'Second track',url:'https://example.org/b.mp3'}]});
 try{assert.equal(e.d.querySelectorAll('.track').length,2);e.d.querySelector('.track').click();await wait();assert.equal(e.d.querySelector('#music-player').hidden,false);assert.equal(e.audio.src,'https://example.org/a.mp3');assert.equal(e.audio.controls,true);e.d.querySelector('#music-next').click();await wait();assert.equal(e.audio.src,'https://example.org/b.mp3');assert.equal(e.d.querySelector('#music-next').disabled,true);}finally{await e.close();}
});
test('demonstration plays a real bundled file without claiming a connected bot',async()=>{
 const e=await setup();try{assert.match(e.d.querySelector('#music-status').textContent,/ainda não conectado/);e.d.querySelector('#music-demo').click();await wait();assert.match(e.audio.src,/music\/study-c.wav$/);assert.equal(e.d.querySelector('#playing-origin').textContent,'DEMONSTRAÇÃO KONAET');assert.match(e.d.querySelector('#music-status').textContent,/ainda não conectado/);}finally{await e.close();}
});
test('malformed refresh cannot replace a working catalog with a token URL or executable URL',async()=>{
 const catalog={schema:1,provider:{connected:true},tracks:[{id:'safe',title:'Safe track',url:'https://example.org/safe.mp3'}]};const e=await setup(catalog);
 try{for(const url of ['javascript:alert(1)','https://api.telegram.org/file/bot123:credential/a.mp3','https://user:password@example.org/a.mp3']){catalog.tracks=[{id:'bad',title:'Bad',url}];e.d.querySelector('#music-refresh').click();await wait();assert.equal(e.d.querySelectorAll('.track').length,1);assert.match(e.d.querySelector('.track').textContent,/Safe track/);assert.equal(e.d.querySelector('#music-error').hidden,false);}}finally{await e.close();}
});
test('local files use object URLs, remain on the device and are released on exit',async()=>{
 const e=await setup();try{const transfer=new e.w.DataTransfer();transfer.items.add(new e.w.File(['ID3fixture'],'own.mp3',{type:'audio/mpeg'}));transfer.items.add(new e.w.File(['bad'],'invalid.html',{type:'text/html'}));const input=e.d.querySelector('#music-files');input.files=transfer.files;input.dispatchEvent(new e.w.Event('change'));assert.equal(e.d.querySelectorAll('.track').length,1);e.d.querySelector('.track').click();await wait();assert.match(e.audio.src,/^blob:/);assert.equal(e.d.querySelector('#playing-origin').textContent,'ARQUIVO LOCAL');assert(e.calls.every(url=>!url.startsWith('https://')));e.w.dispatchEvent(new e.w.Event('pagehide'));assert.equal(e.revoked.length,1);}finally{await e.close();}
});
test('owner link with an empty catalog shows connected state without inventing tracks',async()=>{
 const e=await setup({schema:1,provider:{connected:true},tracks:[]});try{assert.equal(e.d.querySelectorAll('.track').length,0);assert.match(e.d.querySelector('#music-status').textContent,/PairBeat conectado/);assert.equal(e.d.querySelector('#music-empty').hidden,false);assert.equal(e.d.querySelector('#music-player').hidden,true);}finally{await e.close();}
});

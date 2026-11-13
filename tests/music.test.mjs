import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {webcrypto,createHash} from 'node:crypto';
import {Window} from 'happy-dom';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('site/index.html'),studio=read('site/studio.js'),music=read('site/music.js');
const projects=JSON.parse(read('site/projects.json')),repos=JSON.parse(read('site/data/github.json'));
const wait=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setTimeout(r,5));};
async function setup(catalog={schema:1,provider:{connected:false},tracks:[]},options={}){
 const w=new Window({url:'https://example.org/konaet-atlas/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 Object.defineProperty(w,'crypto',{value:webcrypto});
 w.document.write(html);const d=w.document,calls=[],revoked=[],intervals=[],handlers={};
 w.setInterval=(fn,ms)=>{intervals.push({fn,ms});return intervals.length;};w.clearInterval=()=>{};
 Object.defineProperty(w.navigator,'mediaSession',{value:{setActionHandler:(n,h)=>handlers[n]=h,setPositionState:value=>{},metadata:null,playbackState:'none'}});
 w.MediaMetadata=class{constructor(value){Object.assign(this,value);}};
 if(options.remembered)w.localStorage.setItem('konaet.atlas.playback',JSON.stringify(options.remembered));
 w.fetch=async url=>{calls.push(String(url));return{ok:true,json:async()=>structuredClone(String(url).startsWith('music/')?catalog:String(url).includes('projects.json')?projects:repos)};};
 let id=0;w.URL.createObjectURL=()=>`blob:https://example.org/${++id}`;w.URL.revokeObjectURL=u=>revoked.push(u);
 const audio=d.querySelector('audio');let paused=true;Object.defineProperty(audio,'paused',{get:()=>paused});Object.defineProperty(audio,'duration',{get:()=>180});audio.load=()=>{};
 audio.play=async()=>{paused=false;audio.dispatchEvent(new w.Event('play'));};audio.pause=()=>{paused=true;audio.dispatchEvent(new w.Event('pause'));};
 w.eval(studio);if(options.tags)w.eval(read('site/vendor/jsmediatags.min.js'));w.eval(music);await wait();d.querySelector('[data-view="music"]').click();await wait();
 return{w,d,audio,calls,revoked,intervals,handlers,close:async()=>{w.dispatchEvent(new w.Event('pagehide'));await w.happyDOM.close();}};
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
 const e=await setup();try{const transfer=new e.w.DataTransfer();transfer.items.add(new e.w.File(['ID3fixture'],'own.mp3',{type:'audio/mpeg'}));transfer.items.add(new e.w.File(['bad'],'invalid.html',{type:'text/html'}));const input=e.d.querySelector('#music-files');input.files=transfer.files;input.dispatchEvent(new e.w.Event('change'));await wait();assert.equal(e.d.querySelectorAll('.track').length,1);e.d.querySelector('.track').click();await wait();assert.match(e.audio.src,/^blob:/);assert.equal(e.d.querySelector('#playing-origin').textContent,'ARQUIVO LOCAL');assert(e.calls.every(url=>!url.startsWith('https://')));e.w.dispatchEvent(new e.w.Event('pagehide'));assert.equal(e.revoked.length,1);}finally{await e.close();}
});
test('owner link with an empty catalog shows connected state without inventing tracks',async()=>{
 const e=await setup({schema:1,provider:{connected:true},tracks:[]});try{assert.equal(e.d.querySelectorAll('.track').length,0);assert.match(e.d.querySelector('#music-status').textContent,/PairBeat conectado/);assert.equal(e.d.querySelector('#music-empty').hidden,false);assert.equal(e.d.querySelector('#music-player').hidden,true);}finally{await e.close();}
});

const oneTrack=()=>({schema:1,provider:{connected:true},tracks:[{id:'known',title:'Original track',artist:'KONAET',url:'https://example.org/known.mp3'}]});
test('navigation and automatic catalog refresh retain the same playing audio element and position',async()=>{
 const catalog=oneTrack(),e=await setup(catalog);try{e.d.querySelector('.track').click();await wait();e.audio.currentTime=44;e.d.querySelector('[data-view="index"]').click();e.d.querySelector('[data-view="about"]').click();assert.equal(e.d.querySelector('audio'),e.audio);assert.equal(e.audio.paused,false);assert.equal(e.audio.currentTime,44);catalog.tracks.push({id:'new',title:'New Telegram upload',url:'https://example.org/new.mp3'});assert.equal(e.intervals[0].ms,60000);await e.intervals[0].fn();await wait();assert.equal(e.audio.src,'https://example.org/known.mp3');assert.equal(e.audio.currentTime,44);assert.equal(e.audio.paused,false);assert.equal(e.d.querySelectorAll('.track').length,2);}finally{await e.close();}
});
test('media session actions control the existing player and closing it clears playback',async()=>{
 const e=await setup(oneTrack());try{e.d.querySelector('.track').click();await wait();assert.equal(e.w.navigator.mediaSession.metadata.title,'Original track');e.handlers.pause();assert.equal(e.audio.paused,true);await e.handlers.play();assert.equal(e.audio.paused,false);e.audio.currentTime=40;e.handlers.seekbackward({seekOffset:10});assert.equal(e.audio.currentTime,30);e.handlers.stop();assert.equal(e.d.querySelector('#music-player').hidden,true);assert.equal(e.audio.hasAttribute('src'),false);assert.equal(e.w.localStorage.getItem('konaet.atlas.playback'),null);}finally{await e.close();}
});
test('reopening restores a public track position without forcing autoplay',async()=>{
 const e=await setup(oneTrack(),{remembered:{id:'known',kind:'public',position:63,volume:.4,rate:1}});try{assert.equal(e.d.querySelector('#music-player').hidden,false);assert.equal(e.audio.paused,true);e.audio.dispatchEvent(new e.w.Event('loadedmetadata'));assert.equal(e.audio.currentTime,63);assert.equal(e.audio.volume,.4);assert.match(e.d.querySelector('#music-import-status').textContent,/Toque em play/);}finally{await e.close();}
});
test('exact file hashes recognize an existing cloud song without adding a duplicate',async()=>{
 const bytes=Buffer.from('ID3known-file');const catalog=oneTrack();catalog.tracks[0].sha256=createHash('sha256').update(bytes).digest('hex');const e=await setup(catalog);try{const transfer=new e.w.DataTransfer();transfer.items.add(new e.w.File([bytes],'renamed.mp3',{type:'audio/mpeg'}));const input=e.d.querySelector('#music-files');input.files=transfer.files;input.dispatchEvent(new e.w.Event('change'));await wait();assert.equal(e.d.querySelectorAll('.track').length,1);assert.match(e.d.querySelector('#music-import-status').textContent,/1 repetido ignorado/);assert.equal(e.revoked.length,0);}finally{await e.close();}
});
test('bundled metadata reader identifies ID3 title and artist in a browser File',async()=>{
 const frame=(id,text)=>{const content=Buffer.concat([Buffer.from([0]),Buffer.from(text)]),head=Buffer.alloc(10);head.write(id);head.writeUInt32BE(content.length,4);return Buffer.concat([head,content]);};
 const body=Buffer.concat([frame('TIT2','Tagged study'),frame('TPE1','KONAET artist')]),head=Buffer.from([73,68,51,3,0,0,0,0,0,body.length]);
 const e=await setup(undefined,{tags:true});try{const transfer=new e.w.DataTransfer();transfer.items.add(new e.w.File([head,body],'generic.mp3',{type:'audio/mpeg'}));const input=e.d.querySelector('#music-files');input.files=transfer.files;input.dispatchEvent(new e.w.Event('change'));for(let i=0;i<15&&input.disabled;i++)await wait();assert.match(e.d.querySelector('.track').textContent,/Tagged study/);assert.match(e.d.querySelector('.track').textContent,/KONAET artist/);assert.match(e.d.querySelector('#music-import-status').textContent,/1 com metadados/);}finally{await e.close();}
});

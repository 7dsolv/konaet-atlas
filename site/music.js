"use strict";
(() => {
  const $ = s => document.querySelector(s);
  const make = (tag, text) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; return n; };
  const audio = $('#music-audio');
  const demo = {id:'konaet-study-c',title:'Estudo em Dó',artist:'KONAET · arpejo original de demonstração',url:'music/study-c.wav',origin:'DEMONSTRAÇÃO KONAET'};
  let queue=[], cloud=[], local=[], playing=null, loading=false, loaded=false, importing=false, lastLoad=0, lastSave=0, restored=false;
  let pendingSeek=0;
  const read = () => { try { return JSON.parse(localStorage.getItem('konaet.atlas.playback')); } catch { return null; } };
  const remembered = read();
  const message = text => { $('#music-error').textContent=text; $('#music-error').hidden=!text; };
  const notice = text => { $('#music-import-status').textContent=text; };
  const duration = s => Number.isFinite(s)&&s>0 ? Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0') : '—';
  const clean = (v, fallback='', limit=160) => typeof v==='string'&&v.trim() ? v.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,limit) : fallback;
  function safeURL(value) {
    if (typeof value!=='string'||value.length>2048) return null;
    try { const u=new URL(value,location.href); if(u.protocol!=='https:'||u.username||u.password||u.hostname==='api.telegram.org'||/bot\d+:/i.test(value))return null; return u.href; } catch { return null; }
  }
  function cleanTrack(t) {
    if(!t||typeof t.id!=='string'||!t.id||t.id.length>128||typeof t.title!=='string'||!t.title.trim())return null;
    const url=safeURL(t.url); if(!url)return null;
    return {id:t.id,title:clean(t.title),artist:clean(t.artist,'PairBeat',100),album:clean(t.album,'',100),url,origin:'BIBLIOTECA PAIRBEAT',duration:Number.isFinite(t.duration)&&t.duration>0?t.duration:null,sha256:/^[a-f0-9]{64}$/.test(t.sha256||'')?t.sha256:null};
  }
  function save() {
    if(!playing)return;
    const state={id:playing.id,kind:playing.origin==='ARQUIVO LOCAL'?'local':'public',position:Math.max(0,audio.currentTime||0),volume:audio.volume,rate:audio.playbackRate};
    try { localStorage.setItem('konaet.atlas.playback',JSON.stringify(state)); } catch {}
  }
  function session() {
    if(!('mediaSession' in navigator)||!playing)return;
    try {
      if(typeof MediaMetadata==='function')navigator.mediaSession.metadata=new MediaMetadata({title:playing.title,artist:playing.artist,album:playing.album||'KONAET Atlas'});
      navigator.mediaSession.playbackState=audio.paused?'paused':'playing';
      if(Number.isFinite(audio.duration)&&audio.duration>0&&audio.playbackRate>0)navigator.mediaSession.setPositionState?.({duration:audio.duration,playbackRate:audio.playbackRate,position:Math.min(audio.duration,Math.max(0,audio.currentTime||0))});
    } catch {}
  }
  function render() {
    queue=[...cloud,...local];
    if(playing&&!queue.some(t=>t.id===playing.id))queue.push(playing);
    const current=queue.findIndex(t=>t.id===playing?.id);
    $('#music-empty').hidden=queue.length>0;
    const rows=queue.map((track,i)=>{
      const li=make('li'),button=make('button');button.type='button';button.className='track';button.dataset.track=track.id;
      const active=track.id===playing?.id;
      button.setAttribute('aria-label',(active&&!audio.paused?'Pausar ':'Ouvir ')+track.title);button.setAttribute('aria-pressed',String(active));
      const title=make('span');title.append(make('strong',track.title),make('small',track.artist));
      const source=track.origin==='ARQUIVO LOCAL'?'Neste dispositivo':track.id===demo.id?'Demonstração':'PairBeat';
      button.append(make('span',String(i+1).padStart(2,'0')),title,make('small',source),make('span',duration(track.duration)),make('span',active&&!audio.paused?'Ⅱ':'▷'));
      button.addEventListener('click',()=>{if(active){if(audio.paused)start();else audio.pause();}else prepare(track,true);});li.append(button);return li;
    });
    $('#music-tracks').replaceChildren(...rows);
    $('#music-previous').disabled=current<=0;$('#music-next').disabled=current<0||current>=queue.length-1;
    session();
  }
  async function start() {
    message('');try{await audio.play();}catch{message('Use o botão de play para iniciar o áudio. O navegador pode exigir esse primeiro toque.');}
  }
  function prepare(track,autoplay,position=0) {
    restored=true;playing=track;pendingSeek=position;
    $('#music-player').hidden=false;document.documentElement.dataset.audio='active';
    $('#playing-title').textContent=track.title;$('#playing-artist').textContent=track.artist;$('#playing-origin').textContent=track.origin;
    if(audio.dataset.track!==track.id){audio.dataset.track=track.id;audio.src=track.url;}
    render();if(autoplay)start();else session();
  }
  function restore() {
    if(restored||playing||!remembered)return;
    restored=true;
    if(remembered.kind==='local'){notice('Para retomar a última faixa local, selecione o arquivo novamente.');return;}
    const track=remembered.id===demo.id?demo:cloud.find(t=>t.id===remembered.id);if(!track)return;
    if(Number.isFinite(remembered.volume)&&remembered.volume>=0&&remembered.volume<=1)audio.volume=remembered.volume;
    if(Number.isFinite(remembered.rate)&&remembered.rate>=.25&&remembered.rate<=4)audio.playbackRate=remembered.rate;
    prepare(track,false,Number.isFinite(remembered.position)?Math.max(0,remembered.position):0);
    notice('Sua última faixa está pronta. Toque em play para continuar.');
  }
  function move(delta) { const i=queue.findIndex(t=>t.id===playing?.id);if(i>=0&&queue[i+delta])prepare(queue[i+delta],true); }
  function stop() {
    audio.pause();playing=null;audio.removeAttribute('src');delete audio.dataset.track;audio.load();pendingSeek=0;
    $('#music-player').hidden=true;delete document.documentElement.dataset.audio;
    try{localStorage.removeItem('konaet.atlas.playback');if(navigator.mediaSession){navigator.mediaSession.playbackState='none';navigator.mediaSession.metadata=null;}}catch{}
    render();
  }
  async function load({quiet=false}={}) {
    if(loading)return;loading=true;$('#music-refresh').disabled=true;if(!quiet)message('');
    try {
      const r=await fetch('music/catalog.json?v='+Date.now(),{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(12000)});
      if(!r.ok)throw Error('catalog');const data=await r.json();
      if(data.schema!==1||!Array.isArray(data.tracks)||data.tracks.length>250)throw Error('schema');
      const next=data.tracks.map(cleanTrack);if(next.some(t=>!t)||new Set(next.map(t=>t.id)).size!==next.length)throw Error('tracks');
      cloud=next;loaded=true;lastLoad=Date.now();
      $('#music-empty h3').textContent=data.provider?.connected?'Envie a primeira faixa ao PairBeat.':'As próximas faixas começam aqui.';
      $('#music-empty p').textContent=data.provider?.connected?'O seu Telegram está vinculado. Envie um áudio ou arquivo de música ao PairBeat; ele aparecerá aqui após a sincronização.':'A biblioteca do PairBeat ainda não foi conectada. Você pode ouvir um arquivo local ou o estudo KONAET.';
      $('#music-status').textContent=cloud.length?cloud.length+' faixa'+(cloud.length===1?' publicada':'s publicadas')+' pelo PairBeat.':data.provider?.connected?'PairBeat conectado · aguardando músicas do Telegram.':'PairBeat ainda não conectado · arquivos locais disponíveis.';
      $('#music-sync-note').textContent='Biblioteca atualizada automaticamente enquanto o Atlas estiver aberto.';
      render();restore();
    } catch {
      if(!quiet)message('Não foi possível atualizar a biblioteca. As faixas já carregadas continuam disponíveis.');
      if(!loaded)$('#music-status').textContent='Biblioteca indisponível. Você pode ouvir um arquivo local.';
    } finally { loading=false;$('#music-refresh').disabled=false; }
  }
  async function tags(file) {
    if(!window.jsmediatags)return {};
    return new Promise(resolve=>{
      let complete=false;const finish=value=>{if(complete)return;complete=true;clearTimeout(timer);resolve(value);};
      const timer=setTimeout(()=>finish({}),3000);
      try{new window.jsmediatags.Reader(file).setTagsToRead(['title','artist','album']).read({onSuccess:result=>finish(result.tags||{}),onError:()=>finish({})});}catch{finish({});}
    });
  }
  async function digest(file) {
    if(!crypto.subtle||typeof file.arrayBuffer!=='function')return null;
    try{return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');}catch{return null;}
  }
  async function importFiles(event) {
    if(importing)return;importing=true;message('');notice('Lendo as informações dos arquivos…');const input=event.target;input.disabled=true;
    let rejected=0,duplicates=0,added=0,recognized=0;
    try {
      for(const file of [...input.files].slice(0,50)){
        if(local.length>=100||!/\.(mp3|m4a|ogg|wav)$/i.test(file.name)||file.size>100*1024*1024||!file.size){rejected++;continue;}
        const sha=await digest(file);
        const known=sha&&[...cloud,...local].find(t=>t.sha256===sha);
        if(known){duplicates++;notice('Já reconhecida na biblioteca: '+known.title);continue;}
        const info=await tags(file);const filename=clean(file.name.replace(/\.[^.]+$/,''),'Faixa local');
        const split=filename.match(/^(.{1,100}?)\s+-\s+(.+)$/);
        const title=clean(info.title,split?split[2]:filename),artist=clean(info.artist,split?split[1]:'Artista não informado',100);
        if(clean(info.title)||clean(info.artist))recognized++;
        local.push({id:sha?'local-'+sha:'local-'+crypto.randomUUID(),title,artist,album:clean(info.album,'',100),url:URL.createObjectURL(file),origin:'ARQUIVO LOCAL',sha256:sha});added++;
      }
      render();notice(added+' arquivo'+(added===1?' adicionado':'s adicionados')+' · '+recognized+' com metadados · '+duplicates+' repetido'+(duplicates===1?' ignorado':'s ignorados')+'.');
      if(rejected)message('Alguns arquivos foram ignorados. Use até 100 arquivos MP3, M4A, OGG ou WAV de até 100 MB cada.');
    } finally {input.value='';input.disabled=false;importing=false;}
  }
  $('#music-files').addEventListener('change',importFiles);
  $('#music-refresh').addEventListener('click',()=>load());
  $('#music-demo').addEventListener('click',()=>prepare(demo,true));
  $('#music-previous').addEventListener('click',()=>move(-1));$('#music-next').addEventListener('click',()=>move(1));
  $('#music-stop').addEventListener('click',stop);
  $('#music-open-library').addEventListener('click',()=>{$('[data-view="music"]').click();$('#workspace').scrollIntoView?.({block:'start',behavior:'auto'});});
  document.addEventListener('atlas:view',event=>{if(event.detail==='music'&&(!loaded||Date.now()-lastLoad>30000))load();});
  audio.addEventListener('play',()=>{render();save();});audio.addEventListener('pause',()=>{render();save();});
  audio.addEventListener('ended',()=>{const i=queue.findIndex(t=>t.id===playing?.id);if(i>=0&&i<queue.length-1)move(1);else{render();save();}});
  audio.addEventListener('loadedmetadata',()=>{if(pendingSeek>0&&Number.isFinite(audio.duration)){audio.currentTime=Math.min(pendingSeek,Math.max(0,audio.duration-.1));pendingSeek=0;}session();});
  audio.addEventListener('timeupdate',()=>{if(Date.now()-lastSave>4000){save();session();lastSave=Date.now();}});
  audio.addEventListener('volumechange',save);audio.addEventListener('ratechange',()=>{save();session();});
  audio.addEventListener('error',()=>message('Não foi possível abrir este áudio. Atualize a biblioteca ou escolha outro arquivo.'));
  const actions={play:start,pause:()=>audio.pause(),stop,previoustrack:()=>move(-1),nexttrack:()=>move(1),seekbackward:details=>{audio.currentTime=Math.max(0,audio.currentTime-(details.seekOffset||10));},seekforward:details=>{if(Number.isFinite(audio.duration))audio.currentTime=Math.min(audio.duration,audio.currentTime+(details.seekOffset||10));},seekto:details=>{if(Number.isFinite(details.seekTime)&&Number.isFinite(audio.duration))audio.currentTime=Math.max(0,Math.min(audio.duration,details.seekTime));}};
  if(navigator.mediaSession)for(const [name,handler] of Object.entries(actions)){try{navigator.mediaSession.setActionHandler(name,handler);}catch{}}
  const interval=setInterval(()=>{if(loaded)load({quiet:true});},60000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-lastLoad>30000)load({quiet:true});});
  window.addEventListener('pagehide',event=>{save();if(!event.persisted){clearInterval(interval);for(const track of local)URL.revokeObjectURL(track.url);}});
  if(document.documentElement.dataset.page==='music'||remembered)load();
})();
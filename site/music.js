"use strict";
(() => {
  const $=s=>document.querySelector(s),make=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  const audio=$('#music-audio');let queue=[],current=-1,cloud=[],local=[],started=false,loading=false,loaded=false;
  const demo={id:'konaet-study-c',title:'Estudo em Dó',artist:'KONAET · arpejo original de demonstração',url:'music/study-c.wav',origin:'DEMONSTRAÇÃO KONAET'};
  const message=text=>{$('#music-error').textContent=text;$('#music-error').hidden=!text;};
  function safeURL(value){if(typeof value!=='string'||value.length>2048)return null;try{const u=new URL(value,location.href);if(u.protocol!=='https:'||u.username||u.password||u.hostname==='api.telegram.org'||/bot\d+:/i.test(value))return null;return u.href;}catch{return null;}}
  function cleanTrack(t){if(!t||typeof t.id!=='string'||!t.id||t.id.length>128||typeof t.title!=='string'||!t.title.trim())return null;const url=safeURL(t.url);if(!url)return null;return{id:t.id,title:t.title.slice(0,160),artist:String(t.artist||'PairBeat').slice(0,100),url,origin:'BIBLIOTECA PAIRBEAT',duration:Number.isFinite(t.duration)&&t.duration>0?t.duration:null};}
  const duration=s=>s?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'—';
  function render(){queue=[...cloud,...local];if(started&&!queue.some(t=>t.id===demo.id)&&audio.dataset.track===demo.id)queue.push(demo);current=queue.findIndex(t=>t.id===audio.dataset.track);$('#music-empty').hidden=queue.length>0;const rows=queue.map((t,i)=>{const li=make('li'),button=make('button');button.type='button';button.className='track';button.dataset.track=t.id;button.setAttribute('aria-label','Ouvir '+t.title);button.setAttribute('aria-pressed',String(t.id===audio.dataset.track));const title=make('span');title.append(make('strong',t.title),make('small',t.artist));const source=t.origin==='ARQUIVO LOCAL'?'Neste dispositivo':t.id===demo.id?'Demonstração':'PairBeat';button.append(make('span',String(i+1).padStart(2,'0')),title,make('small',source),make('span',duration(t.duration)),make('span',t.id===audio.dataset.track&&!audio.paused?'Ⅱ':'▷'));button.addEventListener('click',()=>play(t));li.append(button);return li;});$('#music-tracks').replaceChildren(...rows);$('#music-previous').disabled=current<=0;$('#music-next').disabled=current<0||current>=queue.length-1;}
  async function play(track){message('');started=true;$('#music-player').hidden=false;$('#playing-title').textContent=track.title;$('#playing-artist').textContent=track.artist;$('#playing-origin').textContent=track.origin;audio.dataset.track=track.id;audio.src=track.url;render();try{await audio.play();}catch{message('A reprodução não iniciou. Use o botão de play nos controles de áudio.');}}
  async function load(){if(loading)return;loading=true;$('#music-refresh').disabled=true;message('');try{const r=await fetch('music/catalog.json?v='+Date.now(),{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('catalog');const data=await r.json();if(data.schema!==1||!Array.isArray(data.tracks)||data.tracks.length>250)throw Error('schema');const next=data.tracks.map(cleanTrack);if(next.some(t=>!t)||new Set(next.map(t=>t.id)).size!==next.length)throw Error('tracks');cloud=next;loaded=true;if(data.provider?.connected){$('#music-empty h3').textContent='Envie a primeira faixa ao PairBeat.';$('#music-empty p').textContent='O seu Telegram está vinculado. Os áudios enviados ao bot serão publicados aqui após a sincronização.';}$('#music-status').textContent=cloud.length?cloud.length+' faixa'+(cloud.length===1?' publicada':'s publicadas')+' pelo PairBeat.':data.provider?.connected?'PairBeat conectado · envie um áudio ao bot.':'PairBeat ainda não conectado · arquivos locais disponíveis.';render();}catch{message('Não foi possível atualizar a biblioteca. As faixas já carregadas continuam disponíveis.');if(!loaded)$('#music-status').textContent='Biblioteca indisponível. Você pode ouvir um arquivo local.';}finally{loading=false;$('#music-refresh').disabled=false;}}
  document.addEventListener('atlas:view',e=>{if(e.detail==='music'&&!loaded)load();});
  $('#music-refresh').addEventListener('click',load);
  $('#music-demo').addEventListener('click',()=>play(demo));
  $('#music-files').addEventListener('change',e=>{
    message('');let rejected=0;const files=[...e.target.files].slice(0,50);
    for(const f of files){
      if(local.length>=100||!/\.(mp3|m4a|ogg|wav)$/i.test(f.name)||f.size>100*1024*1024||!f.size){rejected++;continue;}
      const id='local-'+crypto.randomUUID();
      local.push({id,title:f.name.replace(/\.[^.]+$/,''),artist:'Arquivo do seu dispositivo',url:URL.createObjectURL(f),origin:'ARQUIVO LOCAL'});
    }
    render();if(rejected)message('Alguns arquivos foram ignorados. A fila aceita até 100 arquivos MP3, M4A, OGG ou WAV, com até 100 MB por arquivo.');e.target.value='';
  });
  $('#music-previous').addEventListener('click',()=>{if(current>0)play(queue[current-1]);});
  $('#music-next').addEventListener('click',()=>{if(current>=0&&current<queue.length-1)play(queue[current+1]);});
  audio.addEventListener('play',render);audio.addEventListener('pause',render);audio.addEventListener('ended',()=>{if(current>=0&&current<queue.length-1)play(queue[current+1]);else render();});
  audio.addEventListener('error',()=>message('Não foi possível abrir este áudio. Atualize a biblioteca ou escolha outro arquivo.'));
  window.addEventListener('pagehide',()=>{for(const track of local)URL.revokeObjectURL(track.url);});
  if(document.documentElement.dataset.page==='music')load();
})();

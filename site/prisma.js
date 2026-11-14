"use strict";
(() => {
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  const make=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const root=document.documentElement,audio=$('#music-audio');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const defaults={surface:'glass',elevation:2,radius:28,accent:'#ff8a54',scale:100,font:'inter',motion:!reduce.matches,cursor:true,sound:false,contrast:false,volume:70,speed:70,density:80,light:'follow',border:2,glow:45,shape:'torus'};
  const ranges={elevation:[0,4],radius:[10,36],scale:[90,115],volume:[0,100],speed:[20,180],density:[25,100],border:[1,5],glow:[0,100]};
  const choices={surface:['flat','raised','inset','glass','refractive'],font:['inter','space','mono'],light:['follow','spin','fixed'],shape:['torus','sphere','wave']};
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem('konaet.atlas.'+key))??fallback;}catch{return fallback;}};
  const write=(key,value)=>{try{localStorage.setItem('konaet.atlas.'+key,JSON.stringify(value));}catch{}};
  function valid(key,value){
    if(!Object.hasOwn(defaults,key))return undefined;
    if(ranges[key])return Number.isFinite(Number(value))?Math.max(ranges[key][0],Math.min(ranges[key][1],Number(value))):defaults[key];
    if(choices[key])return choices[key].includes(value)?value:defaults[key];
    if(key==='accent')return /^#[a-f0-9]{6}$/i.test(value)?value:defaults.accent;
    return typeof value==='boolean'?value:defaults[key];
  }
  const stored=read('prisma',{}),prefs={...defaults};
  if(stored&&typeof stored==='object')for(const key of Object.keys(defaults))if(Object.hasOwn(stored,key))prefs[key]=valid(key,stored[key]);
  if(reduce.matches)prefs.motion=false;
  const labels={elevation:v=>`${v} / 4`,radius:v=>`${v} px`,scale:v=>`${v}%`,volume:v=>`${v}%`,speed:v=>`${(v/70).toFixed(1)}×`,density:v=>`${v}%`,border:v=>`${v} px`,glow:v=>`${v}%`};
  const prefNames={surface:'Superfície',light:'Luz',accent:'Cor de destaque',shape:'Forma da cena'};
  let angle=40,frame=0,hovered=null,activeTab='foundations',step=0,lastFocus=null,clickAudio=null;
  const entries=[],timers=new Set(),checked=new Set();
  function later(fn,delay){const id=setTimeout(()=>{timers.delete(id);fn();},delay);timers.add(id);return id;}
  function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const use=document.createElementNS(svg.namespaceURI,'use');use.setAttribute('href','#pi-'+name);svg.append(use);return svg;}
  function rangePaint(input){const min=Number(input.min)||0,max=Number(input.max)||100;input.style.setProperty('--range',((Number(input.value)-min)/(max-min)*100)+'%');}
  function sync(){
    root.dataset.light=prefs.light;root.dataset.motion=prefs.motion?'on':'off';root.dataset.surface=prefs.surface;root.dataset.contrast=String(prefs.contrast);
    root.style.setProperty('--p-accent',prefs.accent);root.style.setProperty('--p-border',prefs.border+'px');root.style.setProperty('--p-glow',prefs.glow/100);
    root.style.setProperty('--p-radius',prefs.radius+'px');root.style.setProperty('--p-scale',prefs.scale/100);root.style.setProperty('--p-depth',prefs.elevation/2);
    root.style.setProperty('--p-ui',prefs.font==='mono'?"'JetBrains Mono',monospace":prefs.font==='space'?"'Space Grotesk',system-ui,sans-serif":"Inter,system-ui,sans-serif");
    if(prefs.light==='fixed'){root.style.setProperty('--p-angle','40deg');$('#prisma-angle').textContent='40°';}else if(prefs.light==='spin')$('#prisma-angle').textContent='girando';
    root.style.setProperty('--knob-rotation',(-135+prefs.volume*2.7)+'deg');
    for(const control of $$('[data-pref]')){
      const value=prefs[control.dataset.pref];
      if(control.tagName==='BUTTON')control.setAttribute('aria-pressed',String(String(value)===control.dataset.value));
      else if(control.type==='checkbox')control.checked=value;
      else{control.value=String(value);if(control.type==='range')rangePaint(control);}
    }
    for(const output of $$('[data-output]'))output.textContent=labels[output.dataset.output]?.(prefs[output.dataset.output])||String(prefs[output.dataset.output]);
    for(const label of $$('[data-motion-label]'))label.textContent=prefs.motion?'Pausar movimento':'Retomar movimento';
    for(const button of $$('[data-action="motion"]')){button.setAttribute('aria-pressed',String(prefs.motion));const use=button.querySelector('use');if(use)use.setAttribute('href',prefs.motion?'#pi-pause':'#pi-play');}
    if(audio&&Math.abs(audio.volume-prefs.volume/100)>.005)audio.volume=prefs.volume/100;
    document.dispatchEvent(new CustomEvent('prisma:change',{detail:{...prefs}}));
  }
  function set(key,value){const normalized=valid(key,value);if(normalized===undefined)return;prefs[key]=normalized;if(key==='motion'&&reduce.matches&&normalized){prefs.motion=false;notify('O sistema está com movimento reduzido ativado.','info');}write('prisma',prefs);sync();}
  function notify(message,type='info'){
    const container=$('#prisma-notifications');if(!container)return;
    const toast=make('div','p-toast '+type),symbol=make('span','',({success:'✓',info:'i',warning:'!',error:'×'})[type]||'i');symbol.setAttribute('aria-hidden','true');
    const text=make('p','',message),close=make('button','','×');close.type='button';close.setAttribute('aria-label','Fechar aviso');close.addEventListener('click',()=>toast.remove());
    toast.append(symbol,text,close);container.append(toast);while(container.children.length>4)container.firstElementChild.remove();later(()=>toast.remove(),5500);
  }
  function log(text){
    entries.unshift({time:new Date().toLocaleTimeString('pt-BR',{hour12:false}),text});entries.length=Math.min(entries.length,18);
    const rows=entries.map(entry=>{const row=make('li');row.append(make('time','',entry.time),make('span','',entry.text));return row;});
    $('#prisma-log')?.replaceChildren(...rows);
  }
  function openDialog(dialog){lastFocus=document.activeElement;try{if(!dialog.open)dialog.showModal();}catch{dialog.setAttribute('open','');}dialog.querySelector('button,input,select')?.focus();}
  function closeDialog(dialog){if(!dialog)return;try{dialog.close();}catch{dialog.removeAttribute('open');}if(lastFocus?.isConnected)lastFocus.focus();}
  for(const dialog of $$('.p-dialog')){
    dialog.addEventListener('cancel',()=>{if(lastFocus?.isConnected)later(()=>lastFocus.focus(),0);});
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeDialog(dialog);});
    dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const focusable=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select,textarea,a[href]')];if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
  }
  function go(name){window.Atlas?.view(name);$('#workspace').scrollIntoView?.({block:'start',behavior:prefs.motion?'smooth':'auto'});for(const dialog of $$('.p-dialog[open]'))closeDialog(dialog);}
  async function copyProject(){
    const url=window.Atlas?.current?.html_url;if(!url)return;
    try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);else{const input=make('textarea');input.value=url;input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();const ok=document.execCommand('copy');input.remove();if(!ok)throw Error('unavailable');}notify('Link do projeto copiado.','success');log('Link copiado · '+window.Atlas.current.title);}catch{notify('O navegador não liberou a cópia. Abra o projeto para copiar o endereço.','warning');}
  }
  function action(name){
    switch(name){
      case 'appearance':openDialog($('#prisma-settings'));break;
      case 'search':go('index');$('#search').focus();break;
      case 'saved':$('#saved-open').click();$('#workspace').scrollIntoView?.({block:'start'});break;
      case 'save':if(window.Atlas?.current)window.Atlas.save(window.Atlas.current.name);break;
      case 'demo':$('#music-demo').click();log('Estudo KONAET · reprodução iniciada');break;
      case 'refresh':window.Atlas?.refresh();break;
      case 'motion':set('motion',!prefs.motion);log(prefs.motion?'Animação retomada':'Animação pausada');break;
      case 'notification':notify('O Prisma está ativo em todo o Atlas. Abra os ajustes para mudar a luz e o movimento.','info');break;
      case 'open-project':$('#open-project').click();log('Projeto aberto · '+(window.Atlas?.current?.title||''));break;
      case 'reset-preferences':closeDialog($('#prisma-settings'));openDialog($('#prisma-confirm'));break;
      case 'reset-slide':resetSlides(false);break;
    }
  }
  function tab(name){
    if(!$$('[data-prisma-panel]').some(panel=>panel.dataset.prismaPanel===name))return;
    activeTab=name;
    for(const panel of $$('[data-prisma-panel]'))panel.hidden=panel.dataset.prismaPanel!==name;
    for(const button of $$('[data-prisma-tab]'))button.setAttribute('aria-pressed',String(button.dataset.prismaTab===name));
    if(name!=='hud')stopCircuit();
    document.dispatchEvent(new CustomEvent('prisma:tab',{detail:name}));
    log('Quadro Prisma · '+({foundations:'Fundamentos',controls:'Controles físicos',light:'Refrativo',data:'Dados e 3D',hud:'HUD de jogo',feedback:'Feedback'})[name]);
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.pref){set(button.dataset.pref,button.dataset.value);log((prefNames[button.dataset.pref]||'Aparência')+' · '+(button.textContent.trim()||button.getAttribute('aria-label')||button.dataset.value));return;}
    if(button.dataset.prismaTab){tab(button.dataset.prismaTab);return;}
    if(button.dataset.go){go(button.dataset.go);return;}
    if(button.dataset.action){action(button.dataset.action);return;}
    if(button.hasAttribute('data-close-dialog')){closeDialog(button.closest('dialog'));return;}
    if(button.dataset.notice){notify(({success:'Pronto. Sua ação foi concluída.',info:'Você está explorando os componentes do Prisma.',warning:'Este é um exemplo de aviso de atenção.',error:'Este é um exemplo de mensagem de erro.'})[button.dataset.notice],button.dataset.notice);log('Feedback · '+button.dataset.notice);}
  });
  document.addEventListener('input',event=>{
    const input=event.target;if(input.matches('input[type="range"]'))rangePaint(input);
    if(input.dataset.pref&&input.type!=='checkbox')set(input.dataset.pref,input.value);
  });
  document.addEventListener('change',event=>{const input=event.target;if(input.dataset.pref)set(input.dataset.pref,input.type==='checkbox'?input.checked:input.value);});
  $('#appearance-open')?.addEventListener('click',()=>openDialog($('#prisma-settings')));
  $('#copy-project')?.addEventListener('click',copyProject);
  $('#prisma-confirm-reset')?.addEventListener('click',()=>{Object.assign(prefs,defaults);write('prisma',prefs);sync();closeDialog($('#prisma-confirm'));notify('A aparência original do Prisma foi restaurada.','success');log('Aparência restaurada');});

  // Pointer-controlled conic light is shared by the rail, buttons and cards.
  document.addEventListener('pointermove',event=>{
    if(prefs.light!=='follow'||!prefs.cursor)return;
    hovered=event.target.closest('.p-rim,.rail button,.index-row,.p-panel,.glass,.primary')||document.body;
    const rect=hovered.getBoundingClientRect();angle=(Math.atan2(event.clientY-rect.top-rect.height/2,event.clientX-rect.left-rect.width/2)*180/Math.PI+450)%360;
    if(!frame)frame=requestAnimationFrame(()=>{root.style.setProperty('--p-angle',Math.round(angle)+'deg');const output=$('#prisma-angle');if(output)output.textContent=Math.round(angle)+'°';frame=0;});
  },{passive:true});
  let lastClick=0;
  document.addEventListener('pointerdown',event=>{
    if(!prefs.sound||!event.target.closest('button')||Date.now()-lastClick<65)return;
    lastClick=Date.now();
    try{const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;clickAudio ||= new AudioContext();if(clickAudio.state==='suspended')clickAudio.resume().catch(()=>{});const oscillator=clickAudio.createOscillator(),gain=clickAudio.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(600,clickAudio.currentTime);oscillator.frequency.exponentialRampToValueAtTime(180,clickAudio.currentTime+.035);gain.gain.setValueAtTime(.025,clickAudio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,clickAudio.currentTime+.045);oscillator.connect(gain);gain.connect(clickAudio.destination);oscillator.start();oscillator.stop(clickAudio.currentTime+.05);}catch{}
  },{passive:true});

  function resetSlides(saved){for(const slider of $$('[data-slide="save"]')){slider.dataset.done=String(!!saved);slider.style.setProperty('--slide',saved?100:0);const input=slider.querySelector('input');input.value=saved?'100':'0';input.disabled=!!saved;slider.querySelector('span').textContent=saved?'Referência salva':'Deslize para salvar';const use=slider.querySelector('use');if(use)use.setAttribute('href',saved?'#pi-heart':'#pi-arrow');}for(const status of $$('[data-slide-status]'))status.textContent=saved?'Referência salva neste dispositivo.':'Arraste a pílula até o fim.';}
  for(const slider of $$('[data-slide="save"]')){
    const input=slider.querySelector('input');
    input.addEventListener('input',()=>slider.style.setProperty('--slide',input.value));
    const release=()=>{if(input.disabled)return;if(Number(input.value)>=88&&window.Atlas?.current){window.Atlas.save(window.Atlas.current.name,true);resetSlides(true);notify('Referência salva pelo controle deslizante.','success');}else{input.value='0';slider.style.setProperty('--slide',0);}};
    input.addEventListener('pointerup',release);input.addEventListener('change',release);input.addEventListener('keydown',event=>{if(event.key==='Enter'){input.value='100';release();}});
  }
  $('#prisma-preset-form')?.addEventListener('submit',event=>{
    event.preventDefault();const input=$('#prisma-preset-name'),name=input.value.trim();
    if(name.length<2){input.setAttribute('aria-invalid','true');$('#prisma-preset-status').textContent='Use pelo menos dois caracteres para o nome.';input.focus();return;}
    input.removeAttribute('aria-invalid');write('prisma-preset',{name,note:$('#prisma-preset-note').value.trim(),prefs:{...prefs}});$('#prisma-load-preset').disabled=false;$('#prisma-preset-status').textContent=`Preset “${name}” salvo neste navegador.`;notify('Preset salvo. Seus ajustes já estão ativos.','success');log('Preset salvo · '+name);
  });
  const preset=read('prisma-preset',null);$('#prisma-load-preset').disabled=!preset;if(preset&&typeof preset.name==='string'){$('#prisma-preset-name').value=preset.name.slice(0,32);$('#prisma-preset-note').value=String(preset.note||'').slice(0,160);}
  function applyPreset(data){if(!data||typeof data!=='object'||Array.isArray(data))throw Error('invalid');for(const key of Object.keys(defaults))if(Object.hasOwn(data,key))prefs[key]=valid(key,data[key]);if(reduce.matches)prefs.motion=false;write('prisma',prefs);sync();}
  $('#prisma-load-preset')?.addEventListener('click',()=>{const data=read('prisma-preset',null);if(!data?.prefs)return;applyPreset(data.prefs);notify(`Preset “${String(data.name).slice(0,32)}” aplicado.`,'success');log('Preset carregado');});
  $('#prisma-import')?.addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{if(file.size>30000)throw Error('size');const data=JSON.parse(await file.text());if(data.schema!==1||!data.preferences||typeof data.preferences!=='object')throw Error('schema');applyPreset(data.preferences);$('#prisma-preset-name').value=String(data.name||'Meu Prisma').slice(0,32);notify('Ajustes importados e aplicados ao Atlas.','success');log('Ajustes importados de arquivo JSON');}catch{notify('Escolha um arquivo JSON de ajustes exportado pelo Prisma.','error');}finally{event.target.value='';}});
  $('#prisma-export')?.addEventListener('click',()=>{const blob=new Blob([JSON.stringify({schema:1,name:$('#prisma-preset-name').value.trim()||'Meu Prisma',preferences:prefs},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),anchor=make('a');anchor.href=url;anchor.download='konaet-prisma.json';document.body.append(anchor);anchor.click();anchor.remove();later(()=>URL.revokeObjectURL(url),1000);notify('Ajustes exportados como JSON.','success');log('Preset exportado');});

  // Five actual configuration steps reuse the shared preference controls.
  const steps=[['Cor','Escolha o destaque que vai acompanhar você pelo Atlas.'],['Luz','Defina como as bordas refratam a luz.'],['Movimento','Escolha entre uma cena animada e uma composição estática.'],['Som','Ajuste o volume do player.'],['Pronto','Revise os ajustes. Eles já estão ativos e salvos neste navegador.']];
  const stepOptions=make('div','p-step-options');$('#prisma-step-text')?.after(stepOptions);
  function renderStep(){
    $('#prisma-stepper')?.replaceChildren(...steps.map(([name],index)=>{const button=make('button',index<step?'p-done':'',index<step?'✓':String(index+1));button.type='button';button.setAttribute('aria-label',`Passo ${index+1}: ${name}`);if(index===step)button.setAttribute('aria-current','step');button.addEventListener('click',()=>{step=index;renderStep();});return button;}));
    $('#prisma-step-text').textContent=steps[step][0]+' · '+steps[step][1];$('#prisma-step-count').textContent=`${step+1} / 5`;$('#prisma-step-back').disabled=step===0;$('#prisma-step-next').textContent=step===4?'Concluir ✓':'Próximo →';stepOptions.replaceChildren();
    if(step===0){const row=make('div','p-swatches');for(const color of ['#ff8a54','#c06bff','#6bb6ff','#5fd0a3','#ff6b8a','#ffc15a']){const button=make('button');button.type='button';button.dataset.pref='accent';button.dataset.value=color;button.style.setProperty('--swatch',color);button.setAttribute('aria-label','Usar cor '+color);row.append(button);}stepOptions.append(row);}
    if(step===1){const row=make('div','p-segment');for(const [value,label] of [['follow','Seguir cursor'],['spin','Girar'],['fixed','Fixa']]){const button=make('button','',label);button.type='button';button.dataset.pref='light';button.dataset.value=value;row.append(button);}stepOptions.append(row);}
    if(step===2){const label=make('label','p-toggle'),input=make('input');input.type='checkbox';input.dataset.pref='motion';label.append(make('span','','Ativar animações'),input,make('i'));stepOptions.append(label);}
    if(step===3){const label=make('label','p-range-label','Volume '),output=make('output');output.dataset.output='volume';const input=make('input');input.type='range';input.min='0';input.max='100';input.dataset.pref='volume';label.append(output,input);stepOptions.append(label);}
    if(step===4)stepOptions.append(make('p','p-note',`Luz: ${prefs.light} · Movimento: ${prefs.motion?'ativo':'pausado'} · Volume: ${prefs.volume}%`));
    sync();
  }
  $('#prisma-step-back')?.addEventListener('click',()=>{step=Math.max(0,step-1);renderStep();});
  $('#prisma-step-next')?.addEventListener('click',()=>{if(step<4){step++;renderStep();}else{notify('Seu Prisma está pronto. Os ajustes foram aplicados em todo o Atlas.','success');log('Configuração em cinco passos concluída');}});

  function updateData(){
    const atlas=window.Atlas;if(!atlas)return;
    const points=atlas.points,repos=atlas.projects,saved=atlas.saved;
    $('#overview-projects').textContent=String(points.length).padStart(2,'0');$('#overview-saved').textContent=String(saved.length).padStart(2,'0');
    $('#prisma-stat-projects').textContent=String(points.length);$('#prisma-stat-repos').textContent=String(repos.length);$('#prisma-stat-saved').textContent=String(saved.length);
    $('#prisma-ticker').textContent=`${points.length} PROJETOS KONAET · ${repos.length} REPOSITÓRIOS PÚBLICOS · 10 RELAÇÕES TEMÁTICAS · ${saved.length} REFERÊNCIAS SALVAS · SOFTWARE · CIÊNCIA · INTELIGÊNCIA ARTIFICIAL · FERRAMENTAS · `;
    const categories=[['Sistemas','#c06bff'],['IA','#5fd0a3'],['Ciência','#6bb6ff'],['Ferramentas','#ffb457']];
    $('#prisma-category-bars').replaceChildren(...categories.map(([name,color])=>{const count=points.filter(point=>point.category===name).length;const row=make('div'),label=make('span'),bar=make('i'),fill=make('b');label.append(make('b','',name),make('small','',String(count)));row.style.setProperty('--bar',(points.length?count/points.length*100:0)+'%');row.style.setProperty('--bar-color',color);bar.append(fill);row.append(label,bar);return row;}));
    const counts=new Map();for(const repo of repos){const language=repo.language||'Não informada';counts.set(language,(counts.get(language)||0)+1);}
    const rows=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([language,count])=>{const row=make('tr');row.append(make('td','',language),make('td','',String(count)),make('td','',Math.round(count/(repos.length||1)*100)+'%'));return row;});$('#prisma-language-table').replaceChildren(...rows);
    if(!$('#prisma-project-checks').children.length&&points.length)$('#prisma-project-checks').replaceChildren(...points.map(point=>{const label=make('label'),input=make('input');input.type='checkbox';input.value=point.name;input.addEventListener('change',()=>{if(input.checked)checked.add(point.name);else checked.delete(point.name);$('#prisma-checked-count').textContent=checked.size+' selecionados';$('#prisma-save-checked').disabled=!checked.size;});label.append(input,make('span','',point.title),make('small','',point.category));return label;}));
    $('#prisma-save-checked').disabled=!checked.size;
  }
  function selected(point){if(!point)return;$('#prisma-card-title').textContent=point.title;$('#prisma-card-category').textContent=point.category.toUpperCase();resetSlides(window.Atlas.saved.includes(point.name));}
  $('#prisma-save-checked')?.addEventListener('click',()=>{const names=[...checked];if(!names.length)return;if(window.Atlas.saveMany)window.Atlas.saveMany(names);else for(const name of names)window.Atlas.save(name,true);notify(names.length+' referências salvas neste dispositivo.','success');log('Referências salvas · '+names.length);});
  $('#prisma-clear-log')?.addEventListener('click',()=>{entries.length=0;log('Registro da sessão limpo');});
  document.addEventListener('atlas:data',()=>{updateData();selected(window.Atlas.current);log('Acervo carregado · '+window.Atlas.projects.length+' repositórios');});
  document.addEventListener('atlas:select',event=>selected(event.detail));
  document.addEventListener('atlas:saved',()=>{updateData();log('Referências atualizadas · '+window.Atlas.saved.length+' salvas');});
  document.addEventListener('atlas:view',event=>{for(const button of $$('.p-dock-button')){if(button.dataset.go===event.detail)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}if(event.detail!=='prisma')stopCircuit();log('Área aberta · '+({index:'Projetos',map:'Mapa',music:'Música',library:'Caderno',about:'Perfil',prisma:'Prisma'})[event.detail]);});
  document.addEventListener('atlas:loading',event=>{const loading=event.detail;for(const button of $$('[data-action="refresh"]'))button.disabled=loading;$('#project-list').setAttribute('aria-busy',String(loading));const progress=$('#prisma-fetch-progress');if(loading)progress.removeAttribute('value');else progress.value=100;$('#prisma-fetch-status').textContent=loading?'Consultando o acervo público…':$('#data-status').textContent;log(loading?'Consulta ao GitHub iniciada':'Consulta ao GitHub finalizada');});

  // Native audio remains available; the Prisma controls operate the same element.
  function audioState(){const playing=!!audio.src&&!audio.paused;root.dataset.playing=String(playing);const button=$('#prisma-audio-toggle');button.setAttribute('aria-label',playing?'Pausar':'Reproduzir');button.querySelector('use')?.setAttribute('href',playing?'#pi-pause':'#pi-play');}
  $('#prisma-audio-toggle')?.addEventListener('click',()=>{if(!audio.getAttribute('src')){$('#music-demo').click();return;}if(audio.paused)audio.play().catch(()=>notify('Toque novamente em reproduzir para iniciar o áudio.','info'));else audio.pause();});
  audio?.addEventListener('play',audioState);audio?.addEventListener('pause',audioState);audio?.addEventListener('ended',audioState);audio?.addEventListener('emptied',audioState);
  audio?.addEventListener('volumechange',()=>{const volume=Math.round(audio.volume*100);if(volume!==prefs.volume){prefs.volume=volume;write('prisma',prefs);sync();}});

  // Board 5: editable circuit, running sequence, bars, inventory and skill points.
  const paths={arrow:'M5 12h13M13 6l6 6-6 6',curve:'M5 17c1-6 5-9 12-9M13 4l4 4-4 4',swap:'M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4',loop:'M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4',plus:'M12 5v14M5 12h14',erase:'M6 6l12 12M18 6 6 18',sword:'M14 4l6-1-1 6-9 9-3-3zM7 14l-3 3M9 18l-2 2',potion:'M9 3h6M10 3v5l-4 9a3 3 0 0 0 3 4h6a3 3 0 0 0 3-4l-4-9V3',gem:'M6 4h12l3 5-9 11L3 9z',key:'M14 10a4 4 0 1 0-1 2.6L21 20M17 17l2-2',shield:'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z'};
  const toolNames={arrow:'Seta',curve:'Curva',swap:'Troca',loop:'Laço',plus:'Soma',erase:'Borracha',empty:'vazia',core:'núcleo'};
  const hud={cells:Array(42).fill('empty'),order:[],tool:'arrow',run:-1,finished:false,interval:0,slot:0,equipped:null,learned:[0,1,4,5],bars:[78,54,90,33]};
  function glyph(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[name]||paths.plus);svg.append(path);return svg;}
  function presetCircuit(){stopCircuit();hud.cells=Array(42).fill('empty');hud.order=[];for(const [row,col,kind] of [[0,3,'arrow'],[1,2,'curve'],[1,4,'swap'],[2,2,'loop'],[2,3,'plus'],[2,5,'core'],[3,1,'core'],[3,3,'arrow'],[3,5,'swap'],[4,2,'loop'],[4,4,'arrow'],[5,3,'plus']]){const index=row*7+col;hud.cells[index]=kind;hud.order.push(index);}hud.finished=false;renderCircuit();}
  function stopCircuit(){if(hud.interval)clearInterval(hud.interval);hud.interval=0;hud.run=-1;renderCircuit();}
  function renderCircuit(){
    const board=$('#hud-board');if(!board)return;
    const focus=document.activeElement?.dataset.cell;
    board.replaceChildren(...hud.cells.map((kind,index)=>{const row=Math.floor(index/7),col=index%7,button=make('button','hud-hex'),inside=make('span');button.type='button';button.dataset.cell=String(index);button.dataset.kind=kind;button.style.left=col*48/352*100+'%';button.style.top=(row*55.4+col%2*27.7)/392*100+'%';button.setAttribute('aria-label',`Linha ${row+1}, coluna ${col+1}: ${toolNames[kind]||kind}`);if(kind==='core')inside.append(make('strong','','C'));else if(kind!=='empty')inside.append(glyph(kind));const order=hud.order.indexOf(index);if(order>=0)inside.append(make('b','',String(order+1)));if(hud.run>=0&&hud.order[hud.run]===index)button.classList.add('is-running');button.append(inside);button.addEventListener('click',()=>{if(hud.interval)stopCircuit();if(hud.tool==='erase'||hud.cells[index]===hud.tool){hud.cells[index]='empty';hud.order=hud.order.filter(value=>value!==index);}else{if(hud.cells[index]==='empty')hud.order.push(index);hud.cells[index]=hud.tool;}hud.finished=false;renderCircuit();board.querySelector(`[data-cell="${index}"]`)?.focus({preventScroll:true});});return button;}));
    if(focus!==undefined&&hud.run<0)board.querySelector(`[data-cell="${focus}"]`)?.focus({preventScroll:true});
    $('#hud-count').textContent=String(hud.order.length);$('#hud-run').disabled=!hud.order.length||!!hud.interval;$('#hud-stop').disabled=!hud.interval;
    $('#hud-status').textContent=hud.run>=0?`Executando passo ${hud.run+1} de ${hud.order.length}.`:hud.finished?'Execução concluída. Edite o circuito para criar outro caminho.':'Escolha uma ferramenta e toque nas células.';
    $('#hud-counters').replaceChildren(...Array.from({length:3},(_,row)=>{const line=make('div');line.append(make('small','',`C${row+1}`));for(let col=0;col<7;col++)line.append(make('i',hud.run>=row*7+col?'on':''));return line;}));
  }
  $('#hud-tools')?.replaceChildren(...Object.entries(toolNames).slice(0,6).map(([name,label])=>{const button=make('button');button.type='button';button.dataset.tool=name;button.setAttribute('aria-label',label);button.setAttribute('aria-pressed',String(hud.tool===name));button.append(glyph(name));button.addEventListener('click',()=>{hud.tool=name;for(const tool of $$('[data-tool]'))tool.setAttribute('aria-pressed',String(tool.dataset.tool===name));});return button;}));
  $('#hud-run')?.addEventListener('click',()=>{if(!hud.order.length)return;stopCircuit();hud.run=0;hud.finished=false;hud.interval=setInterval(()=>{if(document.hidden){stopCircuit();return;}if(hud.run+1>=hud.order.length){clearInterval(hud.interval);hud.interval=0;hud.run=-1;hud.finished=true;renderCircuit();log('Circuito executado · '+hud.order.length+' passos');}else{hud.run++;renderCircuit();}},Math.max(160,450*70/prefs.speed));renderCircuit();});
  $('#hud-stop')?.addEventListener('click',stopCircuit);$('#hud-clear')?.addEventListener('click',()=>{stopCircuit();hud.cells.fill('empty');hud.order=[];hud.finished=false;renderCircuit();log('Circuito limpo');});$('#hud-preset')?.addEventListener('click',presetCircuit);
  const colors=[['Vermelho','#b3302f','#e66a68','#fff','#ff6b6b'],['Laranja','#b8571c','#f08a4b','#fff','#ff8a54'],['Amarelo','#e6c13a','#fbe38a','#20180a','#ffc15a'],['Verde','#2c7a4b','#5fc088','#fff','#5fd0a3'],['Azul','#28699f','#6bb6ff','#fff','#6bb6ff'],['Roxo','#6a42ad','#a98be0','#fff','#c06bff']];
  $('#hud-color-buttons')?.replaceChildren(...[['Retangular','rect'],['Entalhado','notched'],['Cortado','cut']].map(([name,frameName])=>{const row=make('div','hud-frame-row'),buttons=make('div');row.append(make('small','',name));for(const [label,fill,edge,ink,accent] of colors){const button=make('button','hud-color');button.type='button';button.dataset.frame=frameName;button.style.setProperty('--hud-fill',fill);button.style.setProperty('--hud-edge',edge);button.style.setProperty('--hud-ink',ink);button.setAttribute('aria-label',`${label}, moldura ${name.toLowerCase()}`);button.append(make('span','',label));button.addEventListener('click',()=>{set('accent',accent);for(const other of $$('.hud-color'))other.setAttribute('aria-pressed',String(other===button));$('#hud-color-status').textContent=`Destaque ${label.toLowerCase()} · moldura ${name.toLowerCase()}.`;});buttons.append(button);}row.append(buttons);return row;}));
  const barDefs=[['Vida','#ff6b6b'],['Mana','#6bb6ff'],['Energia','#ffc15a'],['Experiência','#c06bff']];
  function gauge(){const average=Math.round(hud.bars.reduce((a,b)=>a+b,0)/4);$('#hud-gauge').style.setProperty('--gauge',average+'%');$('#hud-gauge strong').textContent=String(average);$('#hud-gauge').setAttribute('role','img');$('#hud-gauge').setAttribute('aria-label',`Média dos quatro níveis: ${average} de 100`);}
  $('#hud-bars')?.replaceChildren(...barDefs.map(([name,color],index)=>{const label=make('label','p-range-label',name),output=make('output','',hud.bars[index]+'/100'),input=make('input');input.type='range';input.min='0';input.max='100';input.value=String(hud.bars[index]);input.setAttribute('aria-label',name);input.style.setProperty('--range-color',color);rangePaint(input);label.append(output,input);input.addEventListener('input',()=>{hud.bars[index]=Number(input.value);output.textContent=input.value+'/100';gauge();});return label;}));gauge();
  const inventory={0:['sword','Espada de vidro',1],1:['potion','Poção de luz',6],2:['gem','Gema prisma',3],4:['key','Chave cromática',1],5:['shield','Escudo refrativo',1],7:['potion','Poção de brasa',2],9:['gem','Gema âmbar',8],11:['key','Chave de ferro',2]};
  function renderInventory(){
    $('#hud-inventory').replaceChildren(...Array.from({length:15},(_,index)=>{const item=inventory[index],button=make('button');button.type='button';button.setAttribute('aria-label',item?`${item[1]}, quantidade ${item[2]}`:`Espaço vazio ${index+1}`);button.setAttribute('aria-pressed',String(hud.slot===index));if(item)button.append(glyph(item[0]),make('small','',String(item[2])));button.addEventListener('click',()=>{hud.slot=index;renderInventory();});return button;}));
    const item=inventory[hud.slot];$('#hud-item-name').textContent=item?item[1]:'Espaço vazio';$('#hud-item-description').textContent=item?`${item[1]} · quantidade ${item[2]}. ${hud.equipped===hud.slot?'Item equipado.':'Pronto para equipar.'}`:'Este espaço está vazio. Selecione um item do inventário.';$('#hud-equip').disabled=!item;$('#hud-equip').textContent=hud.equipped===hud.slot?'Remover equipamento':'Equipar item';
  }
  $('#hud-equip')?.addEventListener('click',()=>{if(!inventory[hud.slot])return;hud.equipped=hud.equipped===hud.slot?null:hud.slot;renderInventory();log(hud.equipped===null?'Item desequipado':'Item equipado · '+inventory[hud.slot][1]);});
  function renderSkills(){
    $('#hud-points').textContent=(5-hud.learned.length)+' pts';$('#hud-skills').replaceChildren(...Array.from({length:12},(_,index)=>{const on=hud.learned.includes(index),button=make('button','',String(index+1));button.type='button';button.setAttribute('aria-pressed',String(on));button.setAttribute('aria-label',`Habilidade ${index+1}, ${on?'aprendida':'disponível'}`);button.addEventListener('click',()=>{if(hud.learned.includes(index))hud.learned=hud.learned.filter(value=>value!==index);else if(hud.learned.length<5)hud.learned.push(index);else{$('#hud-skill-status').textContent='Você usou os cinco pontos. Toque em uma habilidade aprendida para devolver um ponto.';notify('Devolva um ponto antes de aprender outra habilidade.','warning');return;}$('#hud-skill-status').textContent=`${hud.learned.length} habilidades aprendidas · ${5-hud.learned.length} pontos disponíveis.`;renderSkills();});return button;}));
  }

  function clock(){const now=new Date();for(const output of $$('.prisma-clock')){output.dateTime=now.toISOString();output.textContent=now.toISOString().slice(11,19)+' UTC';}}
  const clockTimer=setInterval(clock,1000);clock();
  window.addEventListener('pagehide',()=>{stopCircuit();clearInterval(clockTimer);for(const timer of timers)clearTimeout(timer);if(frame)cancelAnimationFrame(frame);clickAudio?.close().catch(()=>{});});
  reduce.addEventListener?.('change',event=>{if(event.matches)set('motion',false);});
  window.Prisma={get preferences(){return {...prefs}},set,notify,tab};
  presetCircuit();renderInventory();renderSkills();renderStep();updateData();selected(window.Atlas?.current);audioState();sync();
  for(const range of $$('input[type="range"]'))rangePaint(range);
  log('Prisma ativo · seis quadros interativos');
})();

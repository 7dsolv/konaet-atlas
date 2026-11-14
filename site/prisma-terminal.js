"use strict";
(() => {
  // Deliberately synthetic data: this is the interactive terminal demonstration
  // from the supplied pack, not an exchange connection or a market data feed.
  const $=selector=>document.querySelector(selector),ns='http://www.w3.org/2000/svg';
  const node=(tag,attrs={})=>{const element=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))element.setAttribute(key,String(value));return element;};
  const text=(tag,value,className)=>{const element=document.createElement(tag);element.textContent=value;if(className)element.className=className;return element;};
  const nf=(value,digits=2)=>value.toLocaleString('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  let tick=0,paused=false,motion=!matchMedia('(prefers-reduced-motion:reduce)').matches,speed=70;
  const price=position=>86850+Math.sin(position*.2)*16+Math.cos(position*.47)*9+Math.sin(position*.97)*3;
  function grid(svg,width,height){svg.replaceChildren();for(let y=30;y<height;y+=40)svg.append(node('path',{d:`M8 ${y}H${width-8}`,stroke:'#293650','stroke-width':.6}));}
  function render(){
    const current=price(tick+36);$('#prisma-sim-price').textContent=nf(current);
    const candles=$('#prisma-candles');grid(candles,460,190);
    const data=Array.from({length:36},(_,index)=>{const open=price(tick+index),close=price(tick+index+1);return{open,close,high:Math.max(open,close)+2+Math.sin(index)*1.8,low:Math.min(open,close)-2-Math.cos(index)*1.8};});
    const min=Math.min(...data.map(point=>point.low))-3,max=Math.max(...data.map(point=>point.high))+3,yp=value=>170-(value-min)/(max-min)*145;
    data.forEach((point,index)=>{const color=point.close>=point.open?'#5fd08a':'#ff6b6b',x=14+index*12;const group=node('g');group.append(node('path',{d:`M${x} ${yp(point.high)}V${yp(point.low)}`,stroke:color,'stroke-width':1}),node('rect',{x:x-3,y:Math.min(yp(point.open),yp(point.close)),width:6,height:Math.max(2,Math.abs(yp(point.close)-yp(point.open))),fill:color}));candles.append(group);});
    const latency=$('#prisma-latency');grid(latency,360,190);
    for(const [index,color] of ['#ffc15a','#6bb6ff'].entries()){
      const values=Array.from({length:60},(_,i)=>[8+i*5.8,95+Math.sin(i*.18+tick*.12+index)*25+Math.cos(i*.3+index*2)*18]);
      const d=values.map(([x,y],i)=>(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)).join(' ');latency.append(node('path',{d:d+' L350 180 L8 180Z',fill:color+'18'}),node('path',{d,fill:'none',stroke:color,'stroke-width':1.6}));
    }
    const book=$('#prisma-orderbook');book.replaceChildren(...Array.from({length:8},(_,index)=>{
      const row=document.createElement('div'),sell=index<4,amount=250+Math.floor((.5+.5*Math.sin(index*2.7+tick*.3))*1050);row.className=sell?'sell':'buy';row.style.setProperty('--amount',amount/13+'%');row.append(text('span',nf(current+(3.5-index)*.5)),text('b',nf(amount,0)));return row;
    }));
    const types=['PING','TRADE','ACK','BOOK','FILL'];
    $('#prisma-sim-messages').textContent=(Math.floor(tick)+8)+' MSGS';
    $('#prisma-message-feed').replaceChildren(...Array.from({length:8},(_,index)=>{const type=types[(Math.floor(tick)+index)%types.length],row=document.createElement('li'),time=new Date(Date.now()-index*1100).toLocaleTimeString('pt-BR',{hour12:false});row.append(text('time',time),text('b',type,type.toLowerCase()),text('span',({PING:'heartbeat simulado',TRADE:'amostra de execução',ACK:'resposta de demonstração',BOOK:'atualização do exemplo',FILL:'evento sintético'})[type]));return row;}));
    $('#prisma-execution-tape').replaceChildren(...Array.from({length:6},(_,index)=>{const row=document.createElement('tr'),buy=(Math.floor(tick)+index)%3!==0;row.append(text('td',new Date(Date.now()-index*3000).toLocaleTimeString('pt-BR',{hour12:false})),text('td',buy?'COMPRA':'VENDA',buy?'p-buy':'p-sell'),text('td',nf(.03+(1+Math.sin(index+tick))*.07,4)),text('td',nf(price(tick+36-index))));return row;}));
    const cone=$('#prisma-cone');grid(cone,360,190);cone.append(node('path',{d:'M10 105 350 25V180Z',fill:'#18253a66',stroke:'#273b5a','stroke-width':.7}));
    const progress=(tick%20)/20,points=Array.from({length:Math.max(2,Math.round(progress*80))},(_,index)=>{const p=index/79;return[10+p*340,105+Math.sin(p*10+tick*.1)*p*27-Math.sin(p*4)*15];});
    cone.append(node('path',{d:points.map(([x,y],index)=>(index?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)).join(' '),fill:'none',stroke:'#5fd08a','stroke-width':2.5}));
    const end=points.at(-1);cone.append(node('circle',{cx:end[0],cy:end[1],r:5,fill:'#fff',stroke:'#5fd08a','stroke-width':3}));$('#prisma-cone-time').textContent=(20-Math.floor(tick%20))+' S';
    $('#prisma-sim-toggle').textContent=paused?'Retomar simulação':'Pausar simulação';$('#prisma-sim-toggle').setAttribute('aria-pressed',String(!paused));$('#prisma-sim-toggle').disabled=!motion;
    $('#prisma-candles').dataset.tick=String(tick);
  }
  $('#prisma-sim-toggle')?.addEventListener('click',()=>{paused=!paused;render();});
  $('#prisma-sim-reset')?.addEventListener('click',()=>{tick=0;render();});
  document.addEventListener('prisma:change',event=>{motion=event.detail.motion;speed=event.detail.speed;$('#prisma-sim-toggle').disabled=!motion;});
  const interval=setInterval(()=>{if(paused||!motion||document.hidden||$('#prisma-view').hidden||document.querySelector('[data-prisma-panel="data"]').hidden)return;tick+=speed/70;render();},1000);
  window.addEventListener('pagehide',()=>clearInterval(interval));render();
})();

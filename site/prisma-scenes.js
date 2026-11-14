"use strict";
(() => {
  // Projection and flowing streams adapted from board 4 of the supplied Prisma Pack.
  const defaults={motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,speed:70,density:80,shape:'torus'};
  let settings={...defaults},raf=0,last=0,phase=2400,dirty=true;
  const scenes=[];
  const tau=Math.PI*2;
  function visible(scene){return !document.hidden&&!scene.canvas.closest('[hidden]')&&scene.canvas.clientWidth>0;}
  function draw(scene,time){
    const {canvas,ctx}=scene;
    const width=canvas.clientWidth,height=canvas.clientHeight;
    if(!width||!height)return;
    const dpr=Math.min(2,window.devicePixelRatio||1);
    if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    }
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    const scale=Math.min(width/720,height/440)*1.45;
    const cx=width/2,cy=height*.52;
    if(canvas.id==='prisma-scene')streams(ctx,width,height,time);
    const countU=Math.round(36+settings.density*.45),countV=Math.round(12+settings.density*.14);
    const turn=time*.0004,cr=Math.cos(turn),sr=Math.sin(turn);
    const tilt=.5+scene.pointerY*.12,cT=Math.cos(tilt),sT=Math.sin(tilt);
    const particles=[];
    for(let i=0;i<countU;i++)for(let j=0;j<countV;j++){
      const u=i/countU*tau,v=j/countV*tau;
      let x0,y0,z0;
      if(settings.shape==='sphere'){
        const polar=(j+.5)/countV*Math.PI;
        x0=155*Math.sin(polar)*Math.cos(u);y0=155*Math.cos(polar);z0=155*Math.sin(polar)*Math.sin(u);
      }else if(settings.shape==='wave'){
        x0=(i/countU-.5)*390;z0=(j/countV-.5)*220;
        y0=Math.sin(i*.16+time*.001)*24+Math.cos(j*.26+time*.0007)*22;
      }else{
        const radius=150+58*Math.cos(v);
        x0=radius*Math.cos(u);z0=radius*Math.sin(u);y0=58*Math.sin(v);
      }
      const x1=x0*cr+z0*sr,z1=-x0*sr+z0*cr;
      const y2=y0*cT-z1*sT,z2=y0*sT+z1*cT;
      const perspective=480/(480+z2);
      particles.push({x:cx+x1*perspective*scale,y:cy+y2*perspective*scale,z:z2,s:perspective,u,k:i*countV+j});
    }
    particles.sort((a,b)=>b.z-a.z);
    for(const point of particles){
      const hue=205-155*(.5+.5*Math.sin(point.u*2+time*.0005));
      const light=36+(point.s-.8)*70;
      ctx.globalAlpha=Math.max(.22,Math.min(1,.45+(point.s-.75)*1.6));
      ctx.fillStyle=`hsl(${Math.round(hue)},85%,${Math.round(light)}%)`;
      const size=Math.max(.7,(.7+point.s*.9)*Math.min(1.25,scale));
      if(point.k%97===0){ctx.beginPath();ctx.arc(point.x,point.y,Math.max(1.2,2.1*scale),0,tau);ctx.fillStyle='#fff';ctx.fill();}
      else ctx.fillRect(point.x,point.y,size,size);
    }
    ctx.globalAlpha=1;
    canvas.dataset.shape=settings.shape;
    canvas.dataset.frame=String((Number(canvas.dataset.frame)||0)+1);
    canvas.dataset.animating=String(settings.motion);
  }
  function streams(ctx,width,height,time){
    const input=['#ffc15a','#6bb6ff','#5fd08a','#c06bff','#ff6b8a','#7fd1ff'];
    const output=['#ffc15a','#5fd08a','#6bb6ff','#ff6b8a','#c06bff'];
    const sx=width/720,sy=height/440,cx=width/2,cy=height*.52;
    for(const [side,colors] of [[0,input],[1,output]])colors.forEach((color,index)=>{
      const outerX=side?width:0,outerY=(side?60+index*80:40+index*72)*sy;
      const innerX=cx+(side?176:-176)*sx,innerY=cy+(index-(colors.length-1)/2)*20*sy;
      const controlX=side?width-(width-innerX)*.55:innerX*.55;
      const gradient=ctx.createLinearGradient(outerX,outerY,innerX,innerY);
      gradient.addColorStop(0,color+'bb');gradient.addColorStop(1,color+'00');
      ctx.strokeStyle=gradient;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(outerX,outerY);ctx.quadraticCurveTo(controlX,outerY,innerX,innerY);ctx.stroke();
      let p=(time*.00018+index*.17)%1;if(side)p=1-p;
      const q=1-p,x=q*q*outerX+2*q*p*controlX+p*p*innerX,y=q*q*outerY+2*q*p*outerY+p*p*innerY;
      ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,2.1,0,tau);ctx.fill();
    });
  }
  function tick(now){
    raf=0;
    const active=scenes.filter(visible);
    if(!active.length){last=0;return;}
    if(!last)last=now;
    const delta=Math.min(now-last,70);
    if(delta>=30||dirty){
      if(settings.motion)phase+=delta*settings.speed/70;
      for(const scene of active)draw(scene,phase);
      last=now;dirty=false;
    }
    if(settings.motion)raf=requestAnimationFrame(tick);
  }
  function refresh(){dirty=true;if(!raf)raf=requestAnimationFrame(tick);}
  for(const id of ['map-scene','prisma-scene']){
    const canvas=document.getElementById(id);if(!canvas)continue;
    let ctx;try{ctx=canvas.getContext('2d');}catch{continue;}if(!ctx)continue;
    const scene={canvas,ctx,pointerY:0};scenes.push(scene);
    if(typeof ResizeObserver==='function')new ResizeObserver(refresh).observe(canvas);
    canvas.parentElement.addEventListener('pointermove',event=>{const rect=canvas.getBoundingClientRect();scene.pointerY=(event.clientY-rect.top)/(rect.height||1)-.5;if(!settings.motion)refresh();});
  }
  document.addEventListener('atlas:view',refresh);
  document.addEventListener('prisma:tab',refresh);
  document.addEventListener('prisma:change',event=>{settings={...settings,...event.detail};last=0;refresh();});
  document.addEventListener('visibilitychange',()=>{last=0;refresh();});
  window.addEventListener('resize',refresh);
  window.addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);raf=0;});
  window.PrismaScenes={refresh};refresh();
})();

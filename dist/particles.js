// Local canvas effects only. No requests, tracking, or input capture beyond pointer position.
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const pointer = {x:0,y:0,active:false};
const fields = [];
const glyphs = '01<>[]{}:/\\+=#アイウエオカキクケコサシスセソ';
let frame = 0, lastTime = 0;

function createField(host, color, isDialog = false) {
  const canvas = document.createElement('canvas');
  canvas.className = 'particle-background';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }
  const field = {host,canvas,ctx,color,isDialog,width:0,height:0,points:[],rain:[],quietZones:[]};
  if(!isDialog)host.addEventListener('matrix-markers',event=>{field.quietZones=event.detail;requestDraw();});
  fields.push(field);
  new ResizeObserver(() => {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    const count = Math.min(width<600?80:180, Math.max(40, Math.round(width * height / 8500)));
    const columns = Math.min(90, Math.max(16, Math.floor(width / (width<600?26:14))));
    field.rain = Array.from({length:columns},(_,i)=>{
      const layer=i%7===0?2:i%3===0?1:0;
      const size=[10,13,17][layer];
      return {x:(i+.5)*width/columns,y:Math.random()*(height+300),size,
        layer,mutation:Math.random()*.18,speed:[18,40,65][layer]+Math.random()*20,
        length:[28,22,16][layer],alpha:[.18,.35,.58][layer],
        characters:Array.from({length:28},()=>glyphs[Math.floor(Math.random()*glyphs.length)])};
    });
    field.points = Array.from({length:count}, () => ({
      x:Math.random()*width,y:Math.random()*height,
      vx:(Math.random()-.5)*13,vy:(Math.random()-.5)*13,
      ox:0,oy:0,r:Math.random()*1.2+.7,
    }));
    field.width = width; field.height = height;
    requestDraw();
  }).observe(host);
}

function drawField(field, dt) {
  const {host,canvas,ctx,width,height,points,isDialog} = field;
  const era=document.body?.dataset?.era;
  const color=era==='both-ai'?'112,181,255':field.color;
  if (!width || !height || (isDialog && !host.open)) return;
  // Rect is evaluated during rendering so the mouse stays aligned while the panel slides.
  const rect = canvas.getBoundingClientRect();
  const mx = pointer.x-rect.left, my = pointer.y-rect.top;
  const hover = pointer.active && mx>=0 && mx<=width && my>=0 && my<=height;
  const radius = Math.min(210, width*.42);
  const phase=isDialog?host.dataset.phase:'idle',burst=phase==='burst';
  ctx.clearRect(0,0,width,height);
  ctx.textAlign='center';
  for(const column of field.rain){
    if(dt){
      column.y=(column.y+column.speed*dt*(burst?2.4:1))%(height+column.length*column.size);
      column.mutation+=dt;
      if(column.mutation>.18){column.mutation=0;column.characters[Math.floor(Math.random()*column.length)]=glyphs[Math.floor(Math.random()*glyphs.length)];}
    }
    const central=Math.exp(-Math.pow((column.x-width*.5)/(width*.24),2));
    const baseAlpha=column.alpha*(1-central*(isDialog?.87:.35))*(burst?1.3:1);
    const ink=isDialog&&column.layer===2&&(burst||phase==='complete')?(era==='both-ai'?'192,141,255':'106,213,255'):color;
    ctx.font=column.size+'px Consolas,monospace';
    for(let n=0;n<column.length;n++){
      const y=column.y-n*column.size;if(y<0||y>height)continue;
      const energy=hover?Math.max(0,1-Math.hypot(column.x-mx,y-my)/radius):0;
      let quiet=1;
      for(const zone of field.quietZones){const d=Math.hypot(column.x-zone.x,y-zone.y);if(d<zone.r+25)quiet=Math.min(quiet,.12+.88*Math.max(0,(d-zone.r)/25));}
      const alpha=(1-n/column.length)*(baseAlpha+energy*.3)*quiet;
      ctx.fillStyle=n===0?`rgba(206,234,255,${Math.min(.8,alpha+.12*quiet)})`:`rgba(${ink},${alpha})`;
      ctx.fillText(column.characters[n],column.x,y);
    }
  }
  if (hover) {
    const glow = ctx.createRadialGradient(mx,my,0,mx,my,radius);
    glow.addColorStop(0,`rgba(${color},0.095)`);glow.addColorStop(1,`rgba(${color},0)`);
    ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
  }
  const displayed = points.map(p => {
    if (dt) {
      p.x=(p.x+p.vx*dt+width)%width;p.y=(p.y+p.vy*dt+height)%height;
      const dx=p.x-mx,dy=p.y-my,d=Math.hypot(dx,dy),influence=hover?Math.max(0,1-d/radius):0;
      const force=influence*influence*45, easing=1-Math.exp(-dt*5);
      p.ox+=((dx/Math.max(d,1))*force-p.ox)*easing;
      p.oy+=((dy/Math.max(d,1))*force-p.oy)*easing;
    }
    const x=p.x+p.ox,y=p.y+p.oy;
    return {x,y,r:p.r,energy:hover?Math.max(0,1-Math.hypot(x-mx,y-my)/radius):0};
  });
  const reach = width<600?105:145;
  const buckets=new Map();
  for(let i=0;i<displayed.length;i++){
    const p=displayed[i],key=Math.floor(p.x/reach)+','+Math.floor(p.y/reach);
    if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(i);
  }
  for (let i=0;i<displayed.length;i++) {
    const a=displayed[i];
    const bx=Math.floor(a.x/reach),by=Math.floor(a.y/reach);
    const neighbors=[];
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)neighbors.push(...(buckets.get((bx+dx)+','+(by+dy))||[]));
    for (const j of neighbors) {
      if(j<=i)continue;
      const b=displayed[j],distance=Math.hypot(a.x-b.x,a.y-b.y);
      if (distance>reach) continue;
      ctx.strokeStyle=`rgba(${color},${(1-distance/reach)*(.065+Math.max(a.energy,b.energy)*.22)})`;
      ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    if (a.energy>.15) {
      ctx.strokeStyle=`rgba(${color},${a.energy*.3})`;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(mx,my);ctx.stroke();
    }
    ctx.fillStyle=`rgba(${color},${.28+a.energy*.65})`;
    ctx.beginPath();ctx.arc(a.x,a.y,a.r+a.energy*1.3,0,Math.PI*2);ctx.fill();
  }
}

function draw(time) {
  frame=0;
  if (document.hidden) {lastTime=0;return;}
  const dt=motion.matches?0:Math.min((time-(lastTime||time))/1000,.04);
  lastTime=time;
  for (const field of fields) drawField(field,dt);
  if (!motion.matches) frame=requestAnimationFrame(draw);
}
function requestDraw() {if (!frame && !document.hidden) frame=requestAnimationFrame(draw);}
function clearPointer() {pointer.active=false;requestDraw();}
window.addEventListener('pointermove',event=>{pointer.x=event.clientX;pointer.y=event.clientY;pointer.active=true;requestDraw();},{passive:true});
window.addEventListener('pointerdown',event=>{pointer.x=event.clientX;pointer.y=event.clientY;pointer.active=true;requestDraw();},{passive:true});
window.addEventListener('pointerup',event=>{if(event.pointerType!=='mouse')clearPointer();},{passive:true});
window.addEventListener('pointercancel',clearPointer,{passive:true});
document.documentElement.addEventListener('pointerleave',clearPointer);
window.addEventListener('blur',clearPointer);
document.addEventListener('visibilitychange',()=>{document.documentElement.classList.toggle('page-hidden',document.hidden);cancelAnimationFrame(frame);frame=0;lastTime=0;if(!document.hidden)requestDraw();});
motion.addEventListener('change',()=>{lastTime=0;for(const field of fields)for(const point of field.points){point.ox=0;point.oy=0;}requestDraw();});
createField(document.getElementById('map-surface'),'66,156,255');
const dialog=document.getElementById('attack-dialog');
createField(dialog,'66,156,255',true);
new MutationObserver(requestDraw).observe(dialog,{attributes:true,attributeFilter:['open','data-phase']});
requestDraw();

window.addEventListener('experience-era',requestDraw);

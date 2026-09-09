// Local canvas effects only. No requests, tracking, or input capture beyond pointer position.
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const pointer = {x:0,y:0,active:false};
const fields = [];
let frame = 0, lastTime = 0;

function createField(host, color, isDialog = false) {
  const canvas = document.createElement('canvas');
  canvas.className = 'particle-background';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }
  const field = {host,canvas,ctx,color,isDialog,width:0,height:0,points:[]};
  fields.push(field);
  new ResizeObserver(() => {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    const count = Math.min(135, Math.max(28, Math.round(width * height / 12500)));
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
  const {host,canvas,ctx,color,width,height,points,isDialog} = field;
  if (!width || !height || (isDialog && !host.open)) return;
  // Rect is evaluated during rendering so the mouse stays aligned while the panel slides.
  const rect = canvas.getBoundingClientRect();
  const mx = pointer.x-rect.left, my = pointer.y-rect.top;
  const hover = pointer.active && mx>=0 && mx<=width && my>=0 && my<=height;
  const radius = Math.min(210, width*.42);
  ctx.clearRect(0,0,width,height);
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
  for (let i=0;i<displayed.length;i++) {
    const a=displayed[i];
    for (let j=i+1;j<displayed.length;j++) {
      const b=displayed[j],distance=Math.hypot(a.x-b.x,a.y-b.y);
      if (distance>reach) continue;
      ctx.strokeStyle=`rgba(${color},${(1-distance/reach)*(.14+Math.max(a.energy,b.energy)*.38)})`;
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
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);frame=0;lastTime=0;if(!document.hidden)requestDraw();});
motion.addEventListener('change',()=>{lastTime=0;for(const field of fields)for(const point of field.points){point.ox=0;point.oy=0;}requestDraw();});
createField(document.getElementById('map-surface'),'173,235,130');
const dialog=document.getElementById('attack-dialog');
createField(dialog,'255,111,91',true);
new MutationObserver(requestDraw).observe(dialog,{attributes:true,attributeFilter:['open']});
requestDraw();

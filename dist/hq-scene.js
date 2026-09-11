// Local procedural 3D architecture: illustrative buildings, not surveyed HQ models.
import {approachFrame,APPROACH_DURATION,smooth} from './approach.js';
const profiles={
  HESA:{w:3.1,d:2.3,h:3.8,wing:2.5,floors:6},
  IEI:{w:2.5,d:2.5,h:4.5,wing:1.5,floors:7},
  IAIO:{w:2.8,d:2.1,h:5,wing:1.7,floors:8},
  SADRA:{w:4.3,d:2.5,h:2.9,wing:1.8,floors:4},
  ISOICO:{w:4.1,d:2.8,h:2.5,wing:2.1,floors:4},
  ITMCO:{w:3.5,d:2.6,h:3.2,wing:2.4,floors:5}
};
export function headquartersGeometry(code){
  const p=profiles[code]||profiles.HESA,solid=[],lines=[];
  function vertex(out,position,normal,color){out.push(...position,...normal,...color);}
  function box(x,y,z,w,h,d,color){
    const x0=x-w/2,x1=x+w/2,y0=y-h/2,y1=y+h/2,z0=z-d/2,z1=z+d/2;
    const faces=[
      [[0,0,1],[[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]]],
      [[0,0,-1],[[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]]],
      [[1,0,0],[[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1]]],
      [[-1,0,0],[[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]]],
      [[0,1,0],[[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]]],
      [[0,-1,0],[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]]]
    ];
    for(const [normal,corners] of faces)for(const i of [0,1,2,0,2,3])vertex(solid,corners[i],normal,color);
  }
  function line(a,b,color=[.15,.55,.85,1]){vertex(lines,a,[0,1,0],color);vertex(lines,b,[0,1,0],color);}
  const stone=[.17,.24,.34,0],dark=[.06,.11,.2,0],trim=[.32,.47,.61,.1],light=[.12,.72,1,1];
  // A low city district gives the descending camera scale and foreground parallax.
  box(0,-.55,0,160,.3,160,[.025,.045,.07,0]);
  for(let row=-5;row<=5;row++)for(let col=-5;col<=5;col++){
    if(Math.abs(row)<=1&&Math.abs(col)<=1)continue;
    const h=.65+((row*row+col*7+77)%9)*.24,x=col*6.5,z=row*6.5;
    box(x,h/2-.35,z,2.4+(Math.abs(col)%3)*.7,h,2.8,[.055,.095,.14,0]);
    line([x-1,.15,z+1.42],[x+1,.15,z+1.42],[.8,.38,.09,.65]);
  }
  for(let i=-5;i<=5;i++){
    if(i===0)continue;
    line([i*6.5+3.1,-.35,-40],[i*6.5+3.1,-.35,40],[.25,.33,.4,.45]);
    line([-40,-.35,i*6.5+3.1],[40,-.35,i*6.5+3.1],[.25,.33,.4,.45]);
  }
  box(0,-.18,0,8.8,.3,6.5,dark);box(0,-.005,0,8.4,.05,6.1,trim);
  box(0,p.h/2,0,p.w,p.h,p.d,stone);
  box(-p.w/2-.7,.68,.2,1.4,1.36,p.wing+1,dark);
  box(p.w/2+.65,.5,-.15,1.3,1,p.wing+1.3,stone);
  box(0,p.h+.06,0,p.w+.2,.12,p.d+.2,trim);
  box(0,p.h+.27,0,1.3,.35,.9,dark);
  box(.42,p.h+.85,-.15,.055,1,.055,trim);
  box(.42,p.h+1.36,-.15,.1,.08,.1,light);
  // Glass bays, structural mullions, and illuminated floor strips.
  for(let floor=0;floor<p.floors;floor++){
    const y=.38+floor*(p.h-.55)/p.floors;
    for(let col=0;col<5;col++){
      const x=(col-2)*p.w/5.5;
      const glass=(floor+col)%4===0?[.12,.29,.43,.1]:[.08,.44,.68,.55];
      box(x,y,p.d/2+.018,p.w/7,.29,.025,glass);
      box(x,y,-p.d/2-.018,p.w/7,.29,.025,glass);
    }
    for(let col=0;col<3;col++){
      const z=(col-1)*p.d/3.8;
      box(p.w/2+.018,y,z,.025,.29,p.d/5,[.07,.37,.57,.4]);
      box(-p.w/2-.018,y,z,.025,.29,p.d/5,[.07,.37,.57,.4]);
    }
    line([-p.w/2,y+.21,p.d/2+.04],[p.w/2,y+.21,p.d/2+.04],[.1,.4,.61,.65]);
  }
  for(const x of [-p.w/2,p.w/2])for(const z of [-p.d/2,p.d/2])line([x,.03,z],[x,p.h+.14,z]);
  box(0,.36,p.d/2+.06,.85,.7,.08,[.06,.16,.23,.3]);
  box(0,.79,p.d/2+.42,1.6,.09,.95,trim);
  box(0,.08,p.d/2+.6,1.8,.12,.9,stone);
  for(let i=0;i<3;i++)box(0,.035-i*.02,p.d/2+1.15+i*.18,1.8,.06,.22,trim);
  // Architectural site grid and animated scan base.
  for(let i=-6;i<=6;i++){line([i,-.36,-6],[i,-.36,6],[.06,.2,.33,.7]);line([-6,-.36,i],[6,-.36,i],[.06,.2,.33,.7]);}
  for(let i=0;i<80;i++){
    const a=i/80*Math.PI*2,b=(i+1)/80*Math.PI*2;
    if(i%5!==0)line([Math.cos(a)*5.2,-.32,Math.sin(a)*4.2],[Math.cos(b)*5.2,-.32,Math.sin(b)*4.2],[.15,.68,.95,1]);
  }
  return {solid:new Float32Array(solid),lines:new Float32Array(lines)};
}
function multiply(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
function normalize(v){const n=Math.hypot(...v)||1;return v.map(x=>x/n);}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
export function headquartersCamera(aspect,angle=.72,tilt=0,pose={distance:12,height:7.2}){
  const eye=[Math.sin(angle)*pose.distance,pose.height+tilt,Math.cos(angle)*pose.distance],target=[0,1.4,0];
  const z=normalize(eye.map((v,i)=>v-target[i])),x=normalize(cross([0,1,0],z)),y=cross(z,x),dot=v=>-v.reduce((sum,value,i)=>sum+value*eye[i],0);
  const view=new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,dot(x),dot(y),dot(z),1]);
  const f=1/Math.tan(Math.PI*43/360),n=.1,far=300;
  const projection=new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+n)/(n-far),-1,0,0,2*far*n/(n-far),0]);
  return multiply(projection,view);
}
export function createHeadquartersScene(canvas,{onFrame=()=>{}}={}){
  let gl;
  try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power'});}catch{}
  const fallback=()=>({setTarget(){},setApproachTime(value){onFrame(approachFrame(value));},setActive(){},setPaused(){},dispose(){}});
  if(!gl){canvas.parentElement.dataset.renderer='fallback';return fallback();}
  const vertex=`attribute vec3 position;attribute vec3 normal;attribute vec4 color;uniform mat4 camera;varying vec4 tint;varying float altitude;varying float depth;void main(){vec3 p=position;float lighting=.38+.62*max(dot(normal,normalize(vec3(-.4,.8,.6))),0.);tint=vec4(color.rgb*mix(lighting,1.35,color.a),1.);altitude=p.y;gl_Position=camera*vec4(p,1.);depth=gl_Position.w;}`;
  const fragment=`precision mediump float;varying vec4 tint;varying float altitude;varying float depth;uniform float time;void main(){float scan=1.-smoothstep(.015,.055,abs(altitude-mod(time*.7,6.)));vec3 color=tint.rgb+vec3(.03,.25,.35)*scan;gl_FragColor=vec4(mix(color,vec3(.025,.065,.11),smoothstep(25.,170.,depth)*.8),1.);}`;
  const shaders=[];
  function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('3D shader unavailable');shaders.push(shader);return shader;}
  let program;
  try{program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('3D program unavailable');}
  catch{canvas.parentElement.dataset.renderer='fallback';if(program)gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));return fallback();}
  const solid=gl.createBuffer(),lines=gl.createBuffer(),camera=gl.getUniformLocation(program,'camera'),time=gl.getUniformLocation(program,'time');
  const attributes=['position','normal','color'].map(name=>gl.getAttribLocation(program,name));
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),events=new AbortController();
  let mesh,active=false,paused=false,frame=0,last=0,age=0,pointerX=0,pointerY=0,lookX=0,lookY=0,lost=false,approachTime=APPROACH_DURATION;
  function request(){if(active&&!paused&&!document.hidden&&!frame&&!lost)frame=requestAnimationFrame(draw);}
  function draw(now){
    frame=0;if(!active||paused||document.hidden||lost)return;
    const dt=motion.matches?0:Math.max(0,now-(last||now));
    if(!motion.matches)approachTime=Math.min(APPROACH_DURATION,approachTime+dt);
    const pose=approachFrame(motion.matches?APPROACH_DURATION:approachTime);onFrame(pose);
    const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
    // Keep the GPU buffer stable while the CSS viewport docks; only its camera aspect changes.
    const flying=approachTime<APPROACH_DURATION,bw=flying?innerWidth:width,bh=flying?innerHeight:height;
    const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt(2000000/(bw*bh))),w=Math.round(bw*ratio),h=Math.round(bh*ratio);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    age+=dt/1000;last=now;
    gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.useProgram(program);
    const arrived=approachTime>=APPROACH_DURATION,settled=Math.max(0,age-APPROACH_DURATION/1000);
    const orbit=arrived&&!motion.matches?Math.sin(settled*.12)*.09*smooth(settled/1.5):0;
    const follow=1-Math.exp(-dt/180);lookX+=((arrived?pointerX:0)-lookX)*follow;lookY+=((arrived?pointerY:0)-lookY)*follow;
    const angle=pose.angle+orbit+(!motion.matches?lookX*.07:0);
    gl.uniformMatrix4fv(camera,false,headquartersCamera(width/height,angle,!motion.matches?lookY*.2:0,pose));
    gl.uniform1f(time,motion.matches?2:age);
    function paint(buffer,data,mode){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);for(let i=0;i<3;i++){gl.enableVertexAttribArray(attributes[i]);gl.vertexAttribPointer(attributes[i],i===2?4:3,gl.FLOAT,false,40,i*12);}gl.drawArrays(mode,0,data.length/10);}
    if(mesh){paint(solid,mesh.solid,gl.TRIANGLES);paint(lines,mesh.lines,gl.LINES);}
    if(!motion.matches)request();
  }
  canvas.addEventListener('pointermove',event=>{const rect=canvas.getBoundingClientRect();pointerX=(event.clientX-rect.left)/rect.width-.5;pointerY=(event.clientY-rect.top)/rect.height-.5;request();},{passive:true,signal:events.signal});
  canvas.addEventListener('pointerleave',()=>{pointerX=pointerY=0;request();},{signal:events.signal});
  canvas.addEventListener('webglcontextlost',()=>{lost=true;canvas.parentElement.dataset.renderer='fallback';cancelAnimationFrame(frame);frame=0;},{signal:events.signal});
  document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else request();},{signal:events.signal});
  motion.addEventListener('change',()=>{last=0;request();},{signal:events.signal});
  const observer=new ResizeObserver(request);observer.observe(canvas);
  return {
    setTarget(code){mesh=headquartersGeometry(code);gl.bindBuffer(gl.ARRAY_BUFFER,solid);gl.bufferData(gl.ARRAY_BUFFER,mesh.solid,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,lines);gl.bufferData(gl.ARRAY_BUFFER,mesh.lines,gl.STATIC_DRAW);age=0;last=0;lookX=lookY=pointerX=pointerY=0;request();},
    setApproachTime(value){approachTime=value;last=performance.now();request();},
    setActive(value){if(active===value)return;active=value;last=performance.now();if(value)request();else{cancelAnimationFrame(frame);frame=0;}},
    setPaused(value){if(paused===value)return;paused=value;last=performance.now();if(value){cancelAnimationFrame(frame);frame=0;}else request();},
    dispose(){active=false;cancelAnimationFrame(frame);observer.disconnect();events.abort();gl.deleteBuffer(solid);gl.deleteBuffer(lines);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));}
  };
}

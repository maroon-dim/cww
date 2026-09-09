import {israelGeometry} from './geography.js';
import './particles.js';
import {companies,project,boundsOf,geometryRings,fitCamera,toScreen,zoomCamera,layoutLabels} from './map-model.js';
const $=id=>document.getElementById(id);
const surface=$('map-surface'),dialog=$('attack-dialog'),svgNS='http://www.w3.org/2000/svg';
const bounds=boundsOf(israelGeometry);
let width=innerWidth,height=innerHeight,base=fitCamera(bounds,width,height),camera={...base};
let previousFocus=null,frame=0,closeTimer=null;
function startSimulation(company){
  if(!company)throw new Error('Unknown simulation entity');
  clearTimeout(closeTimer);dialog.classList.remove('is-closing');
  if(!dialog.open)previousFocus=document.activeElement;
  $('active-company').textContent=company.name.toUpperCase()+' / VISUAL SIMULATION';
  document.body.classList.add('simulation-active');
  if(!dialog.open)dialog.showModal();
  return {company:company.name,status:'visual simulation running',externalConnections:0};
}
function closeSimulation(){
  if(!dialog.open||dialog.classList.contains('is-closing'))return;
  document.body.classList.remove('simulation-active');
  dialog.classList.add('is-closing');
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){dialog.close();return;}
  closeTimer=setTimeout(()=>dialog.close(),650);
}
dialog.addEventListener('cancel',event=>{event.preventDefault();closeSimulation();});
dialog.addEventListener('close',()=>{clearTimeout(closeTimer);dialog.classList.remove('is-closing');document.body.classList.remove('simulation-active');previousFocus?.focus();});
$('close').addEventListener('click',closeSimulation);
function svgElement(tag,attributes,parent){const element=document.createElementNS(svgNS,tag);for(const [key,value] of Object.entries(attributes))element.setAttribute(key,value);parent.append(element);return element;}
const borderPaths=geometryRings(israelGeometry).map(ring=>ring.map(([lon,lat],i)=>(i?'L':'M')+project(lon,lat).join(',')).join(' ')+'Z');
for(const d of borderPaths){svgElement('path',{d},$('borders'));svgElement('path',{d},$('border-glow'));}
const markers=companies.map(company=>{
  const button=document.createElement('button');button.className=company.code==='RF'?'company-label':'company-dot';button.textContent=company.code==='RF'?company.name:'';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-label',company.name+' — start visual simulation');button.addEventListener('click',()=>startSimulation(company));$('labels').append(button);
  const pin=svgElement('g',{class:'company-pin','data-company':company.code},$('pins'));
  if(company.code==='RF'){button.classList.add('featured');pin.classList.add('featured');}
  svgElement('circle',{r:12,class:'pin-halo'},pin);svgElement('circle',{r:4,class:'pin-core'},pin);svgElement('circle',{r:13,class:'pin-hit'},pin);
  pin.addEventListener('click',()=>{button.focus();startSimulation(company);});
  const leader=svgElement('path',{},$('leader-lines'));
  if(company.code==='RF'){leader.classList.add('featured');svgElement('circle',{r:22,class:'featured-ring'},pin);}
  return {...company,button,pin,leader,point:project(company.lon,company.lat)};
});
function render(){
  frame=0;
  const transform='translate('+camera.x+' '+camera.y+') scale('+camera.scale+')';
  $('borders').setAttribute('transform',transform);$('border-glow').setAttribute('transform',transform);
  const visible=[];
  for(const marker of markers){
    const [px,py]=toScreen(marker.point,camera);const outside=px<0||px>width||py<0||py>height-70;
    marker.button.hidden=outside;marker.pin.style.display=outside?'none':'';marker.leader.style.display=outside||marker.code!=='RF'?'none':'';
    marker.pin.setAttribute('transform','translate('+px+' '+py+')');
    if(!outside&&marker.code==='RF')visible.push({...marker,px,py,width:marker.button.offsetWidth,height:marker.button.offsetHeight});
    else if(!outside)marker.button.style.transform='translate('+(px-14)+'px,'+(py-14)+'px)';
  }
  for(const label of layoutLabels(visible,width,height)){
    label.button.style.transform='translate('+label.x+'px,'+label.y+'px)';
    const endX=label.side>0?label.x:label.x+label.width,endY=label.y+label.height/2;
    label.leader.setAttribute('d','M'+label.px+','+label.py+'L'+endX+','+endY);
  }
  $('zoom-in').disabled=camera.scale>=base.scale*18-.0001;$('zoom-out').disabled=camera.scale<=base.scale*.65+.0001;
}
function schedule(){if(!frame)frame=requestAnimationFrame(render);}
function fit(){camera={...base};schedule();}
function zoom(factor,anchor=[width/2,height/2]){camera=zoomCamera(camera,factor,anchor,base.scale*.65,base.scale*18);schedule();}
$('zoom-in').addEventListener('click',()=>zoom(1.4));$('zoom-out').addEventListener('click',()=>zoom(1/1.4));$('fit').addEventListener('click',fit);
$('fullscreen').hidden=!document.fullscreenEnabled;
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}});
document.addEventListener('fullscreenchange',()=>{const label=document.fullscreenElement?'Exit fullscreen':'Enter fullscreen';$('fullscreen').setAttribute('aria-label',label);$('fullscreen').title=label;});
const controlTarget=target=>target.closest('button,[data-company],.map-controls');
surface.addEventListener('wheel',event=>{if(controlTarget(event.target)||dialog.open)return;event.preventDefault();zoom(Math.exp(-event.deltaY*.0015),[event.clientX,event.clientY]);},{passive:false});
surface.addEventListener('dblclick',event=>{if(!controlTarget(event.target))zoom(1.7,[event.clientX,event.clientY]);});
const pointers=new Map();let gesture=null;
function resetGesture(){const points=[...pointers.values()];gesture=points.length?{points,camera:{...camera}}:null;surface.classList.toggle('dragging',points.length>0);}
surface.addEventListener('pointerdown',event=>{if(controlTarget(event.target)||event.button!==0||dialog.open)return;surface.focus({preventScroll:true});surface.setPointerCapture(event.pointerId);pointers.set(event.pointerId,[event.clientX,event.clientY]);resetGesture();});
surface.addEventListener('pointermove',event=>{
  if(!pointers.has(event.pointerId)||!gesture)return;pointers.set(event.pointerId,[event.clientX,event.clientY]);const points=[...pointers.values()];
  if(points.length>=2&&gesture.points.length>=2){
    const midpoint=pair=>[(pair[0][0]+pair[1][0])/2,(pair[0][1]+pair[1][1])/2];const distance=pair=>Math.hypot(pair[0][0]-pair[1][0],pair[0][1]-pair[1][1]);
    const start=midpoint(gesture.points),now=midpoint(points);camera=zoomCamera(gesture.camera,distance(points)/Math.max(1,distance(gesture.points)),start,base.scale*.65,base.scale*18);camera.x+=now[0]-start[0];camera.y+=now[1]-start[1];
  }else{camera={...gesture.camera,x:gesture.camera.x+points[0][0]-gesture.points[0][0],y:gesture.camera.y+points[0][1]-gesture.points[0][1]};}
  schedule();
});
function endPointer(event){if(!pointers.delete(event.pointerId))return;resetGesture();}
surface.addEventListener('pointerup',endPointer);surface.addEventListener('pointercancel',endPointer);surface.addEventListener('lostpointercapture',endPointer);
surface.addEventListener('keydown',event=>{if(event.target!==surface||dialog.open)return;const pans={ArrowLeft:[55,0],ArrowRight:[-55,0],ArrowUp:[0,55],ArrowDown:[0,-55]};if(pans[event.key]){event.preventDefault();camera.x+=pans[event.key][0];camera.y+=pans[event.key][1];schedule();}else if(['+','=','-','Home'].includes(event.key)){event.preventDefault();if(event.key==='Home')fit();else zoom(event.key==='-'?1/1.4:1.4);}});
new ResizeObserver(()=>{width=surface.clientWidth;height=surface.clientHeight;base=fitCamera(bounds,width,height);fit();}).observe(surface);
render();
if(document.modelContext?.registerTool){const lifecycle=new AbortController();try{Promise.resolve(document.modelContext.registerTool({name:'start_visual_simulation',description:'Open a fictional animation for a selected company. No network actions occur.',inputSchema:{type:'object',properties:{company:{type:'string',enum:companies.map(c=>c.name)}},required:['company'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input.company!=='string')throw new Error('A company name is required');return startSimulation(companies.find(c=>c.name===input.company));}},{signal:lifecycle.signal})).catch(()=>{});}catch{}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}

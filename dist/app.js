import {countries,contextCountries} from './geography.js';
import {globeView,globePoint,globeArc,visiblePath,createGlobeRenderer,globeRegions,easeGlobeCamera} from './globe.js';
import './particles.js';
import {createExperienceUI} from './experience-ui.js';
import {companies,geometryRings} from './map-model.js';
import {APPROACH_DURATION,INTRO_DURATION,approachGlobeCamera,approachFrame,introFrame,introGlobeCamera,regionGlobeCamera,regionZoomCamera,regionZoomFrame,smooth} from './approach.js';
const $=id=>document.getElementById(id);
const surface=$('map-surface'),dialog=$('attack-dialog'),svgNS='http://www.w3.org/2000/svg';
let width=innerWidth,height=innerHeight,base={x:0,y:0,scale:1,offset:0},camera={...base};
const globe=createGlobeRenderer($('globe-canvas')),regions=globeRegions([...contextCountries,...countries],geometryRings);
surface.addEventListener('globe-texture-ready',()=>schedule());
function zoomCamera(current,factor,anchor,minScale,maxScale){return {...current,scale:Math.max(minScale,Math.min(maxScale,current.scale*factor))};}
let frame=0,experience,flight=null;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let displayCamera={...camera},lastRender=0,sceneTime=0,visualPaused=false;
let navigation={phase:'attract',round:0,elapsed:0,stamp:performance.now(),paused:false},vintage=0;
function sceneChanged(state){
  const previous=navigation;
  navigation={phase:state.phase,round:state.round,elapsed:state.elapsed,stamp:performance.now(),paused:!!state.notice||document.hidden};
  document.body.style.setProperty('--timeline-reveal',state.phase==='region-zoom'?regionZoomFrame(state.elapsed).reveal:1);
  if(previous.phase!==state.phase){
    if(state.phase==='attract'){
      flight=null;camera=introGlobeCamera(0,globeView(base,width,height).unit);displayCamera={...camera};vintage=0;
    }else if(state.phase==='region-zoom'){
      flight=null;camera={...base};displayCamera={...base};vintage=0;
    }else if(previous.phase==='region-zoom'||state.phase==='target'&&['attract','intro'].includes(previous.phase)){
      flight=null;camera=regionGlobeCamera(globeView(base,width,height).unit);displayCamera={...camera};vintage=state.phase==='timeline'?0:1;
    }
  }
  if(['attract','intro','region-zoom'].includes(state.phase)||previous.phase!==state.phase||previous.paused!==navigation.paused)schedule();
}
function approachCompany(company){
  const unit=globeView(base,width,height).unit,scale=150;
  const x=(43-company.lon)*unit*Math.PI/180,y=(company.lat-28)*unit*Math.PI/180;
  // Wrap longitude to take the shortest route after freely rotating the globe.
  const circumference=unit*Math.PI*2,nearestX=x+Math.round((displayCamera.x-x)/circumference)*circumference;
  flight={from:{...displayCamera},to:{scale,x:nearestX,y,offset:0},elapsed:0,last:performance.now(),paused:false};
  schedule();
}
function pauseApproach(paused,elapsed){
  if(visualPaused!==paused){visualPaused=paused;lastRender=0;schedule();}
  if(flight&&matchMedia('(prefers-reduced-motion: reduce)').matches){camera={...flight.to};flight=null;schedule();return;}
  if(flight&&flight.paused!==paused){flight.paused=paused;flight.last=0;schedule();}
}
function selectCompany(code){
  for(const marker of markers)marker.button.classList.toggle('is-selected',marker.code===code);
  for(const link of links)link.group.classList.toggle('is-selected',link.marker.code===code);
}
function startSimulation(company){
  if(!company)throw Error('Unknown company');
  if(!experience)throw Error('Experience is not ready');
  return experience.chooseTarget(company);
}
function svgElement(tag,attributes,parent){const element=document.createElementNS(svgNS,tag);for(const [key,value] of Object.entries(attributes))element.setAttribute(key,value);parent.append(element);return element;}
const markers=companies.map(company=>{
  const button=document.createElement('button');button.className='company-logo';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-label',company.name+' — start visual simulation');button.addEventListener('click',()=>startSimulation(company));$('labels').append(button);
  const logo=document.createElement('img');logo.src='./logos/'+company.code+'.png';logo.alt='';logo.draggable=false;button.append(logo);
  const fallback=document.createElement('span');fallback.className='logo-fallback';fallback.textContent=company.code;fallback.hidden=true;button.append(fallback);
  logo.addEventListener('error',()=>{logo.hidden=true;fallback.hidden=false;});
  const brackets=document.createElement('span');brackets.className='target-brackets';brackets.setAttribute('aria-hidden','true');button.append(brackets);
  const caption=document.createElement('span');caption.className='target-caption';caption.textContent=company.name;caption.setAttribute('aria-hidden','true');button.append(caption);
  if(company.featured)button.classList.add('featured');
  return {...company,button};
});
const linksLayer=svgElement('g',{id:'cyber-links','aria-hidden':'true'},$('map'));
const links=markers.map((marker,index)=>{
  const group=svgElement('g',{class:'cyber-link'},linksLayer);
  const gradient=svgElement('linearGradient',{id:'link-gradient-'+index,gradientUnits:'userSpaceOnUse'},$('map').querySelector('defs'));
  svgElement('stop',{offset:'0%','stop-color':'#56b6ff'},gradient);
  svgElement('stop',{offset:'55%','stop-color':'#79d5ff'},gradient);
  svgElement('stop',{offset:'100%','stop-color':'#ff625a'},gradient);
  const track=svgElement('path',{class:'cyber-track',pathLength:1000,stroke:'url(#link-gradient-'+index+')'},group);
  const packet=svgElement('path',{class:'cyber-packet',pathLength:1000},group);
  packet.style.animationDelay=(-index*.7)+'s';
  packet.style.animationDuration=(3.2+index*.28)+'s';
  marker.button.addEventListener('pointerenter',()=>group.classList.add('is-highlighted'));
  marker.button.addEventListener('pointerleave',()=>group.classList.remove('is-highlighted'));
  marker.button.addEventListener('focus',()=>group.classList.add('is-highlighted'));
  marker.button.addEventListener('blur',()=>group.classList.remove('is-highlighted'));
  return {marker,track,packet,gradient,group};
});
const sourceNode=svgElement('g',{class:'cyber-source'},linksLayer);
svgElement('circle',{r:9,class:'source-ring'},sourceNode);
svgElement('circle',{r:3,class:'source-core'},sourceNode);
function render(time=performance.now()){
  frame=0;
  if(document.hidden)return;
  const dt=Math.min(40,lastRender?time-lastRender:16);lastRender=time;
  const sceneVisible=['attract','intro','region-zoom','target','approach'].includes(document.body.dataset.screen||'attract');
  const animated=sceneVisible&&!visualPaused&&!reducedMotion.matches;
  if(animated)sceneTime+=dt/1000;
  const opening=['attract','intro'].includes(navigation.phase);
  const regionZoom=navigation.phase==='region-zoom';
  const elapsed=navigation.elapsed+(navigation.paused?0:Math.max(0,time-navigation.stamp));
  const introElapsed=navigation.phase==='intro'?Math.min(INTRO_DURATION,elapsed):0;
  const introPose=introFrame(introElapsed);
  const targetVintage=document.body.dataset.era==='before-ai'?1:0;
  if(opening||regionZoom)vintage=0;
  else if(navigation.phase==='timeline'&&targetVintage===1){
    vintage=smooth(elapsed/1800);
  }
  else if(!visualPaused)vintage=reducedMotion.matches?targetVintage:vintage+(targetVintage-vintage)*(1-Math.exp(-dt/600));
  const paletteSettling=!opening&&!regionZoom&&Math.abs(vintage-targetVintage)>.001;
  if(!opening&&!regionZoom&&!paletteSettling)vintage=targetVintage;
  document.body.style.setProperty('--era-vintage',vintage);
  if(regionZoom)document.body.style.setProperty('--timeline-reveal',regionZoomFrame(elapsed).reveal);
  const inFlight=!!flight;
  if(flight){
    if(!flight.paused&&!document.hidden)flight.elapsed+=Math.max(0,flight.last?time-flight.last:0);
    flight.last=time;
    camera=approachGlobeCamera(flight.from,flight.to,flight.elapsed);
    if(flight.elapsed>=APPROACH_DURATION)flight=null;
  }
  // The opaque city scene covers the globe during the final descent and orbit.
  if(flight&&approachFrame(flight.elapsed).reveal===1){if(!flight.paused)schedule();return;}
  if(opening){camera=introGlobeCamera(introElapsed,globeView(base,width,height).unit);displayCamera={...camera};}
  else if(regionZoom){camera=regionZoomCamera(elapsed,globeView(base,width,height).unit);displayCamera={...camera};}
  else if(!visualPaused)displayCamera=inFlight?{...camera}:easeGlobeCamera(displayCamera,camera,dt,reducedMotion.matches);
  const view=globeView(displayCamera,width,height);
  if(opening)view.cy+=height*introPose.lift;
  const settling=['x','y','scale','offset'].some(key=>Math.abs(displayCamera[key]-camera[key])>.0001);
  // The renderer keeps country borders in color above the vintage landscape.
  globe.draw(view,width,height,regions,{time:reducedMotion.matches?0:sceneTime,era:document.body.dataset.era,reducedMotion:reducedMotion.matches,vintage,highDetail:navigation.phase==='target'&&!settling&&!inFlight});
  surface.style.setProperty('--globe-x',view.cx+'px');surface.style.setProperty('--globe-y',view.cy+'px');surface.style.setProperty('--globe-size',view.radius*2+'px');
  const source=globePoint(35,31.7,view),sx=source.x,sy=source.y;
  sourceNode.style.display=source.visible?'':'none';
  sourceNode.setAttribute('transform','translate('+sx+' '+sy+')');
  for(const {marker,track,packet,gradient} of links){
    const target=globePoint(marker.lon,marker.lat,view),tx=target.x,ty=target.y;
    const d=visiblePath(globeArc([35,31.7],[marker.lon,marker.lat],view));
    track.setAttribute('d',d);packet.setAttribute('d',d);
    for(const [key,value] of Object.entries({x1:sx,y1:sy,x2:tx,y2:ty}))gradient.setAttribute(key,value);
  }
  const quietZones=[];
  for(const marker of markers){
    const point=globePoint(marker.lon,marker.lat,view),px=point.x,py=point.y;const outside=!point.visible||px<0||px>width||py<0||py>height-70;
    marker.button.hidden=outside;
    if(!outside)quietZones.push({x:px,y:py,r:58});
    marker.button.style.setProperty('--caption-shift',Math.max(104-px,Math.min(0,width-104-px))+'px');
    marker.button.classList.toggle('caption-below',py<115);
    marker.button.style.transform='translate('+px+'px,'+py+'px) translate(-50%,-50%)';
  }
  surface.dispatchEvent(new CustomEvent('matrix-markers',{detail:quietZones}));
  $('zoom-in').disabled=camera.scale>=base.scale*8-.0001;$('zoom-out').disabled=camera.scale<=base.scale*.8+.0001;
  if((animated&&globe.gpu)||(!visualPaused&&(settling||paletteSettling||['intro','region-zoom'].includes(navigation.phase)&&!navigation.paused||flight&&!flight.paused)))schedule();
}
function schedule(){if(!frame)frame=requestAnimationFrame(render);}
function fit(){flight=null;camera={...base};schedule();}
function focusRegion(){flight=null;camera=regionGlobeCamera(globeView(base,width,height).unit);schedule();}
function zoom(factor,anchor=[width/2,height/2]){camera=zoomCamera(camera,factor,anchor,base.scale*.8,base.scale*8);schedule();}
$('zoom-in').addEventListener('click',()=>zoom(1.4));$('zoom-out').addEventListener('click',()=>zoom(1/1.4));$('fit').addEventListener('click',fit);
$('focus-region').addEventListener('click',focusRegion);
$('fullscreen').hidden=!document.fullscreenEnabled;
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}});
document.addEventListener('fullscreenchange',()=>{const label=document.fullscreenElement?'Exit fullscreen':'Enter fullscreen';$('fullscreen').setAttribute('aria-label',label);$('fullscreen').title=label;});
const controlTarget=target=>target.closest('button,[data-company],.map-controls');
surface.addEventListener('wheel',event=>{if(surface.inert||controlTarget(event.target)||dialog.open)return;event.preventDefault();zoom(Math.exp(-event.deltaY*.0015),[event.clientX,event.clientY]);},{passive:false});
surface.addEventListener('dblclick',event=>{if(!surface.inert&&!dialog.open&&!controlTarget(event.target))zoom(1.7,[event.clientX,event.clientY]);});
const pointers=new Map();let gesture=null;
let dragStarted=false,suppressPointerClick=false;
surface.addEventListener('dragstart',event=>event.preventDefault());
surface.addEventListener('click',event=>{
  if(suppressPointerClick&&event.detail!==0){event.preventDefault();event.stopImmediatePropagation();suppressPointerClick=false;}
},true);
function resetGesture(){const points=[...pointers.values()];gesture=points.length?{points,camera:{...camera}}:null;surface.classList.toggle('dragging',points.length>0&&dragStarted);}
surface.addEventListener('pointerdown',event=>{
  const logo=event.target.closest('.company-logo');
  if(surface.inert||(controlTarget(event.target)&&!logo)||event.button!==0||dialog.open)return;
  if(!pointers.size){dragStarted=false;suppressPointerClick=false;}
  if(!logo)surface.focus({preventScroll:true});
  // Capture on the logo itself so an unmoved press retains its native click.
  (logo||surface).setPointerCapture(event.pointerId);
  pointers.set(event.pointerId,[event.clientX,event.clientY]);
  if(pointers.size>1){dragStarted=true;suppressPointerClick=true;}
  resetGesture();
});
surface.addEventListener('pointermove',event=>{
  if(!pointers.has(event.pointerId)||!gesture)return;pointers.set(event.pointerId,[event.clientX,event.clientY]);const points=[...pointers.values()];
  if(!dragStarted){
    if(Math.hypot(points[0][0]-gesture.points[0][0],points[0][1]-gesture.points[0][1])<5)return;
    dragStarted=true;surface.classList.add('dragging');
  }
  suppressPointerClick=true;
  if(points.length>=2&&gesture.points.length>=2){
    const midpoint=pair=>[(pair[0][0]+pair[1][0])/2,(pair[0][1]+pair[1][1])/2];const distance=pair=>Math.hypot(pair[0][0]-pair[1][0],pair[0][1]-pair[1][1]);
    const start=midpoint(gesture.points),now=midpoint(points);camera=zoomCamera(gesture.camera,distance(points)/Math.max(1,distance(gesture.points)),start,base.scale*.8,base.scale*8);camera.x+=now[0]-start[0];camera.y+=now[1]-start[1];
  }else{camera={...gesture.camera,x:gesture.camera.x+(points[0][0]-gesture.points[0][0])/gesture.camera.scale,y:gesture.camera.y+(points[0][1]-gesture.points[0][1])/gesture.camera.scale};}
  schedule();
});
function endPointer(event){if(!pointers.delete(event.pointerId))return;resetGesture();}
surface.addEventListener('pointerup',endPointer);surface.addEventListener('pointercancel',endPointer);surface.addEventListener('lostpointercapture',endPointer);
surface.addEventListener('keydown',event=>{if(event.target!==surface||dialog.open)return;const pans={ArrowLeft:[55,0],ArrowRight:[-55,0],ArrowUp:[0,55],ArrowDown:[0,-55]};if(pans[event.key]){event.preventDefault();camera.x+=pans[event.key][0];camera.y+=pans[event.key][1];schedule();}else if(['+','=','-','Home'].includes(event.key)){event.preventDefault();if(event.key==='Home')fit();else zoom(event.key==='-'?1/1.4:1.4);}});
new ResizeObserver(()=>{width=surface.clientWidth;height=surface.clientHeight;if(navigation.phase==='region-zoom'||navigation.phase==='timeline'&&navigation.round===0)focusRegion();else fit();}).observe(surface);
render();
experience=createExperienceUI({companies,onSelect:selectCompany,onReset:focusRegion,onApproach:approachCompany,onApproachPause:pauseApproach,onSceneChange:sceneChanged});
document.addEventListener('visibilitychange',()=>{lastRender=0;if(flight)flight.last=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else schedule();});
let sceneKey=document.body.dataset.screen+'/'+document.body.dataset.era;
new MutationObserver(()=>{const next=document.body.dataset.screen+'/'+document.body.dataset.era;if(next!==sceneKey){sceneKey=next;lastRender=0;schedule();}}).observe(document.body,{attributes:true,attributeFilter:['data-screen','data-era']});
reducedMotion.addEventListener('change',()=>{lastRender=0;schedule();});
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);globe.dispose?.();},{once:true});
if(document.modelContext?.registerTool){const lifecycle=new AbortController();try{Promise.resolve(document.modelContext.registerTool({name:'start_visual_simulation',description:'Choose a company after the visitor starts the experience and completes the opening globe rotation and rewind. Cannot skip the start gate, attack-vector choices, or games. No network actions occur.',inputSchema:{type:'object',properties:{company:{type:'string',enum:companies.map(c=>c.name)}},required:['company'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input.company!=='string')throw new Error('A company name is required');return startSimulation(companies.find(c=>c.name===input.company));}},{signal:lifecycle.signal})).catch(()=>{});}catch{}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}

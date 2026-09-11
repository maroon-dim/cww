import {landRings} from './globe-land.js';
import {createGlobeSurface} from './globe-webgl.js';
import {cities} from './globe-cities.js';
import {loadSatelliteSurface,loadGlobeTexture,REGION_DETAIL_BOUNDS} from './satellite.js';
const rad=Math.PI/180;
export function easeGlobeCamera(current,target,dt,reducedMotion=false){
  const blend=reducedMotion?1:1-Math.exp(-Math.max(0,dt)/85),next={};
  for(const key of ['x','y','scale','offset']){const difference=(target[key]||0)-(current[key]||0);next[key]=Math.abs(difference)<.0001?target[key]||0:(current[key]||0)+difference*blend;}
  return next;
}
export function globeView(camera,width,height){
  const unit=Math.min(width*.43,height*.405);
  return {lon:43-camera.x/unit/rad,lat:Math.max(-85,Math.min(85,28+camera.y/unit/rad)),radius:unit*camera.scale,cx:width*.5+(camera.offset||0),cy:height*.53,unit};
}
export function globePoint(lon,lat,view,altitude=0){
  const a=(lon-view.lon)*rad,b=lat*rad,c=view.lat*rad;
  const x=Math.cos(b)*Math.sin(a),y=Math.cos(c)*Math.sin(b)-Math.sin(c)*Math.cos(b)*Math.cos(a);
  const z=Math.sin(c)*Math.sin(b)+Math.cos(c)*Math.cos(b)*Math.cos(a),r=view.radius*(1+altitude);
  return {x:view.cx+r*x,y:view.cy-r*y,z,visible:z>=0||(altitude>0&&Math.hypot(x,y)*(1+altitude)>1)};
}
export function globeArc(from,to,view){
  const vector=([lon,lat])=>[Math.cos(lat*rad)*Math.cos(lon*rad),Math.sin(lat*rad),Math.cos(lat*rad)*Math.sin(lon*rad)];
  const a=vector(from),b=vector(to),angle=Math.acos(Math.max(-1,Math.min(1,a.reduce((s,v,i)=>s+v*b[i],0))));
  return Array.from({length:49},(_,i)=>{
    const t=i/48,den=Math.sin(angle),p=angle<1e-6?a:a.map((v,j)=>(v*Math.sin((1-t)*angle)+b[j]*Math.sin(t*angle))/den);
    return globePoint(Math.atan2(p[2],p[0])/rad,Math.asin(Math.max(-1,Math.min(1,p[1])))/rad,view,Math.sin(t*Math.PI)*.09);
  });
}
export function visiblePath(points){let open=false,d='';for(const p of points){if(!p.visible){open=false;continue;}d+=(open?'L':'M')+p.x.toFixed(2)+','+p.y.toFixed(2);open=true;}return d;}
// Precompute unit vectors once; rotating the globe does not rebuild geography.
const vector=([lon,lat])=>[Math.cos(lat*rad)*Math.cos(lon*rad),Math.sin(lat*rad),Math.cos(lat*rad)*Math.sin(lon*rad)];
const land=landRings.map(r=>r.map(vector));
const cityNodes=cities.map(([lon,lat,population])=>({point:vector([lon,lat]),strength:Math.max(.35,Math.min(1.8,Math.log10(population)-4.4))}));
export function createGlobeRenderer(canvas,software=false){
  const surface=software?null:createGlobeSurface(canvas);
  if(surface){
    canvas.dataset.renderer='webgl';let fallback;
    return {get gpu(){return !fallback;},draw(...args){
      if(!surface.available&&!fallback){const replacement=canvas.cloneNode(false);delete replacement.dataset.renderer;canvas.replaceWith(replacement);fallback=createGlobeRenderer(replacement,true);}
      (fallback||surface).draw(...args);
    },dispose(){surface.dispose();}};
  }
  // A failed GPU initialization needs a fresh canvas before requesting 2D.
  if(!canvas.getContext('2d')){const replacement=canvas.cloneNode(false);canvas.replaceWith(replacement);canvas=replacement;}
  const ctx=canvas.getContext('2d');
  let earthPixels,earthBuffer,earthContext,textureWidth=0,textureHeight=0;
  let detailRequested=false,detailPixels,detailWidth=0,detailHeight=0;
  async function prepareDetail(){
    detailRequested=true;
    try{
      const source=await loadGlobeTexture(4),texture=document.createElement('canvas');
      detailWidth=texture.width=source.naturalWidth||source.width;detailHeight=texture.height=source.naturalHeight||source.height;
      const paint=texture.getContext('2d');paint.drawImage(source,0,0);
      detailPixels=paint.getImageData(0,0,detailWidth,detailHeight).data;
      canvas.dispatchEvent(new Event('globe-texture-ready',{bubbles:true}));
    }catch{}
  }
  if(typeof document!=='undefined')loadSatelliteSurface().then(source=>{
    textureWidth=source.naturalWidth||source.width;textureHeight=source.naturalHeight||source.height;
    const texture=document.createElement('canvas');texture.width=textureWidth;texture.height=textureHeight;
    const paint=texture.getContext('2d');paint.drawImage(source,0,0);earthPixels=paint.getImageData(0,0,textureWidth,textureHeight).data;
    earthBuffer=document.createElement('canvas');earthContext=earthBuffer.getContext('2d');canvas.dispatchEvent(new Event('globe-texture-ready',{bubbles:true}));
  }).catch(()=>{});
  return {draw(view,width,height,regions,options={}){
    const ratio=Math.min(globalThis.devicePixelRatio||1,2);
    if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);}
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
    const {cx,cy,radius:r}=view,age=options.vintage||0,grade='sepia('+age+') saturate('+(1-.3*age)+')';
    if(!detailRequested&&typeof document!=='undefined'&&r>Math.min(width*.43,height*.405)*1.15&&view.lon>5&&view.lon<90)void prepareDetail();
    ctx.filter=grade;
    const circle=(radius)=>{ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);};
    const halo=ctx.createRadialGradient(cx,cy,r*.95,cx,cy,r*1.2);halo.addColorStop(0,'#168eff00');halo.addColorStop(.23,'#269dff38');halo.addColorStop(.5,'#168eff12');halo.addColorStop(1,'#168eff00');
    ctx.fillStyle=halo;circle(r*1.2);ctx.fill();
    const ocean=ctx.createRadialGradient(cx-r*.35,cy-r*.4,r*.05,cx,cy,r);ocean.addColorStop(0,'#0b3354');ocean.addColorStop(.6,'#051b35');ocean.addColorStop(1,'#020813');ctx.fillStyle=ocean;circle(r);ctx.fill();
    const a=view.lon*rad,b=view.lat*rad,sa=Math.sin(a),ca=Math.cos(a),sb=Math.sin(b),cb=Math.cos(b);
    const project=v=>{const front=v[0]*ca+v[2]*sa,z=sb*v[1]+cb*front;return {x:cx+r*(v[2]*ca-v[0]*sa),y:cy-r*(cb*v[1]-sb*front),visible:z>=0,z};};
    function stroke(rings,color,lineWidth){ctx.beginPath();for(const ring of rings){let open=false;for(const v of ring){const p=project(v);if(!p.visible){open=false;continue;}if(open)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);open=true;}}ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.stroke();}
    ctx.save();circle(r);ctx.clip();
    if(earthPixels){
      const scale=Math.min(1,(options.highDetail?1440:800)/width,(options.highDetail?1080:650)/height),bw=Math.ceil(width*scale),bh=Math.ceil(height*scale);
      if(earthBuffer.width!==bw||earthBuffer.height!==bh){earthBuffer.width=bw;earthBuffer.height=bh;}
      const image=earthContext.createImageData(bw,bh),out=image.data;
      const {west,south,east,north}=REGION_DETAIL_BOUNDS;
      for(let py=0;py<bh;py++)for(let px=0;px<bw;px++){
        const nx=((px+.5)/scale-cx)/r,ny=(cy-(py+.5)/scale)/r,d=nx*nx+ny*ny;if(d>=1)continue;
        const nz=Math.sqrt(1-d),front=-sb*ny+cb*nz,wx=ca*front-sa*nx,wy=cb*ny+sb*nz,wz=sa*front+ca*nx;
        const lon=Math.atan2(wz,wx)/rad,lat=Math.asin(Math.max(-1,Math.min(1,wy)))/rad;
        const tx=Math.min(textureWidth-1,Math.max(0,Math.floor((lon+180)/360*textureWidth))),ty=Math.min(textureHeight-1,Math.max(0,Math.floor((90-lat)/180*textureHeight)));
        const source=(ty*textureWidth+tx)*4,dest=(py*bw+px)*4,light=.22+.98*Math.max(0,(-.65*nx+.4*ny+.8*nz)/Math.sqrt(1.2225));
        let red=earthPixels[source],green=earthPixels[source+1],blue=earthPixels[source+2];
        if(detailPixels&&lon>west&&lon<east&&lat>south&&lat<north){
          const u=(lon-west)/(east-west),v=(lat-south)/(north-south);
          const dx=Math.min(detailWidth-1,Math.floor(u*detailWidth)),dy=Math.min(detailHeight-1,Math.floor((1-v)*detailHeight)),index=(dy*detailWidth+dx)*4;
          const edge=Math.min(1,u/.04,v/.04,(1-u)/.04,(1-v)/.04),blend=edge*edge*(3-2*edge);
          red+=(detailPixels[index]-red)*blend;green+=(detailPixels[index+1]-green)*blend;blue+=(detailPixels[index+2]-blue)*blend;
        }
        const vintage=options.vintage||0,gray=Math.max(0,Math.min(255,(red*.2126+green*.7152+blue*.0722-35.7)*1.35+35.7));
        out[dest]=(red+(gray-red)*vintage)*light;out[dest+1]=(green+(gray-green)*vintage)*light;
        out[dest+2]=(blue+(gray-blue)*vintage)*light;out[dest+3]=255;
      }
      earthContext.putImageData(image,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(earthBuffer,0,0,width,height);
    }else stroke(land,'#438bc099',.7);
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(const city of cityNodes){
      const p=project(city.point);if(!p.visible)continue;ctx.globalAlpha=Math.min(1,p.z*5)*.9;
      const size=Math.min(7,1.8+city.strength*r/250),glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,size);
      glow.addColorStop(0,'#ffe49ae6');glow.addColorStop(.25,'#ffac3980');glow.addColorStop(.65,'#ee642820');glow.addColorStop(1,'#ee642800');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,size,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    ctx.filter='none';
    for(const region of regions){ctx.shadowColor=region.color;ctx.shadowBlur=region.context?3:12;stroke(region.rings,region.color,(region.context?1:1.8)*region.weight);}
    ctx.restore();ctx.shadowBlur=0;
    ctx.filter=grade;
    const rim=ctx.createLinearGradient(cx-r,cy-r,cx+r,cy+r);rim.addColorStop(0,'#a3cbea99');rim.addColorStop(.45,'#3986c577');rim.addColorStop(1,'#12456833');ctx.strokeStyle=rim;ctx.lineWidth=1;circle(r);ctx.stroke();
    ctx.filter='none';
  }};
}
export function globeRegions(countries,geometryRings){return countries.map(c=>({context:c.context,weight:c.code==='iran'?2.8:c.code==='israel'?1.7:1.6,color:c.code==='iran'?'#ff1838':c.code==='israel'?'#299fff':'#ffe329',rings:geometryRings(c.geometry).map(r=>r.map(vector))}));}

import {cities} from './globe-cities.js';

// Fixed seeds keep soft, irregular city clusters anchored during navigation.
export function cityLightCluster([lon,lat,population],index){
  const strength=Math.max(.35,Math.min(1.8,Math.log10(population)-4.4));
  let seed=(index+1)*7919;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const points=[];
  for(let i=0;i<Math.round(18+strength*28);i++){
    const angle=random()*Math.PI*2;
    const distance=Math.pow(random(),1.4)*(.15+strength*.22);
    points.push({lon:lon+Math.cos(angle)*distance/Math.max(.3,Math.cos(lat*Math.PI/180)),lat:lat+Math.sin(angle)*distance,brightness:.3+random()*.7});
  }
  return {lon,lat,strength,points};
}

export function paintCityLights(ctx,width,height,createCanvas=(width,height)=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;}){
  ctx.clearRect(0,0,width,height);ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);
  const sprite=createCanvas(64,64);const brush=sprite.getContext('2d');
  const glow=brush.createRadialGradient(32,32,0,32,32,32);glow.addColorStop(0,'#ffdc83e6');glow.addColorStop(.2,'#ffac3999');glow.addColorStop(.5,'#f46a2333');glow.addColorStop(.8,'#dc48180a');glow.addColorStop(1,'#c9361800');brush.fillStyle=glow;brush.fillRect(0,0,64,64);
  const x=lon=>(lon+180)/360*width,y=lat=>(90-lat)/180*height;
  ctx.save();ctx.globalCompositeOperation='lighter';
  cities.forEach((city,index)=>{
    const hub=cityLightCluster(city,index),px=x(hub.lon),py=y(hub.lat),radius=3+hub.strength*5;
    ctx.globalAlpha=.38;ctx.drawImage(sprite,px-radius,py-radius,radius*2,radius*2);
    for(const point of hub.points){
      ctx.globalAlpha=.35+point.brightness*.4;
      const size=1.5+point.brightness*1.4;ctx.drawImage(sprite,x(point.lon)-size/2,y(point.lat)-size/2,size,size);
    }
    ctx.globalAlpha=.9;const core=3+hub.strength*1.3;ctx.drawImage(sprite,px-core/2,py-core/2,core,core);
  });
  ctx.restore();
}

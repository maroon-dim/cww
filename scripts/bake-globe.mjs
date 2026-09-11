import {createCanvas,loadImage} from '@napi-rs/canvas';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {landRings} from '../dist/globe-land.js';
import {paintCityLights} from '../dist/city-lights.js';
import {countries,contextCountries} from '../dist/geography.js';
import {geometryRings} from '../dist/map-model.js';
import {globeRegions} from '../dist/globe.js';
import {createTerrainSurface,TERRAIN_WIDTH} from './terrain-surface.mjs';

const root=new URL('../',import.meta.url),size=2048,outputs={};
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
await mkdir(new URL('dist/textures/',root),{recursive:true});
async function save(name,source,width=size,height=width/2){
  const bitmap=createCanvas(width,height),ctx=bitmap.getContext('2d');
  ctx.imageSmoothingQuality='high';ctx.drawImage(source,0,0,width,height);
  const buffer=await bitmap.encode('png'),file='dist/textures/'+name+'.png';
  await writeFile(new URL(file,root),buffer);
  outputs[file]={width,height,bytes:buffer.length,sha256:hash(buffer)};
  console.log(name+': '+buffer.length+' bytes');
}

const started=performance.now();
const original=await loadImage(fileURLToPath(new URL('dist/textures/earth-blue-marble.jpg',root)));
await save('globe-terrain',createTerrainSurface(original,createCanvas),TERRAIN_WIDTH);
const regionSource=await loadImage(fileURLToPath(new URL('scripts/assets/earth-region-july.jpg',root)));
await save('globe-region-detail',createTerrainSurface(regionSource,createCanvas,2048,2048),2048,2048);
console.log('Terrain generated offline in '+Math.round(performance.now()-started)+' ms');

// Paint at the original resolution, then downsample with the same geographic extent.
const canvas=createCanvas(4096,2048),ctx=canvas.getContext('2d');
function path(rings,convert=value=>value){
  ctx.beginPath();
  for(const ring of rings){
    ring.forEach((point,index)=>{const [lon,lat]=convert(point),x=(lon+180)/360*4096,y=(90-lat)/180*2048;if(index)ctx.lineTo(x,y);else ctx.moveTo(x,y);});
    ctx.closePath();
  }
}
ctx.fillStyle='#000';ctx.fillRect(0,0,4096,2048);ctx.fillStyle='#fff';path(landRings);ctx.fill('evenodd');
await save('globe-land-mask',canvas);
paintCityLights(ctx,4096,2048,createCanvas);await save('globe-city-lights',canvas);
ctx.fillStyle='#000';ctx.fillRect(0,0,4096,2048);ctx.lineJoin='round';ctx.lineCap='round';
for(const region of globeRegions([...contextCountries,...countries],geometryRings)){
  ctx.strokeStyle=region.color;ctx.lineWidth=(region.context?1.2:2.4)*region.weight;
  ctx.shadowColor=region.color;ctx.shadowBlur=region.context?2:7;
  path(region.rings,point=>[Math.atan2(point[2],point[0])*180/Math.PI,Math.asin(point[1])*180/Math.PI]);ctx.stroke();
}
await save('globe-borders',canvas);

const inputs={};
for(const file of ['scripts/bake-globe.mjs','scripts/terrain-surface.mjs','scripts/assets/earth-region-july.jpg','scripts/assets/earth-region-july.json','dist/globe.js','dist/globe-land.js','dist/globe-cities.js','dist/city-lights.js','dist/geography.js','dist/map-model.js','dist/textures/earth-blue-marble.jpg']){
  inputs[file]=hash(await readFile(new URL(file,root)));
}
await writeFile(new URL('scripts/globe-textures.json',root),JSON.stringify({inputs,outputs},null,2)+'\n');
console.log('Finished. These images are served directly; no terrain or light painting runs on page load.');

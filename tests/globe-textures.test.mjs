import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GLOBE_TEXTURE_URLS,loadGlobeTexture,loadSatelliteSurface,REGION_DETAIL_BOUNDS,regionDetailUV} from '../dist/satellite.js';

const root=new URL('../',import.meta.url),manifest=JSON.parse(readFileSync(new URL('scripts/globe-textures.json',root)));
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
test('prebuilt textures match current geography, border styling, and artwork sources',()=>{
  for(const [path,expected] of Object.entries(manifest.inputs))assert.equal(hash(readFileSync(new URL(path,root))),expected,path+' changed; run npm run bake:globe');
  assert.equal(GLOBE_TEXTURE_URLS.length,5);
  for(const url of GLOBE_TEXTURE_URLS){
    const path='dist'+url,buffer=readFileSync(new URL(path,root)),asset=manifest.outputs[path];
    assert.ok(asset,path+' is missing from the texture build');
    assert.equal(buffer.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    const width=url===GLOBE_TEXTURE_URLS[3]?4096:2048;
    const height=url===GLOBE_TEXTURE_URLS[4]?2048:width/2;
    assert.equal(buffer.readUInt32BE(16),width);assert.equal(buffer.readUInt32BE(20),height);
    assert.equal(asset.width,width);assert.equal(asset.height,height);
    assert.equal(hash(buffer),asset.sha256);assert.equal(buffer.length,asset.bytes);
  }
});

test('regional detail uses the source crop coordinates and covers Israel and all Iranian targets',()=>{
  const source=JSON.parse(readFileSync(new URL('scripts/assets/earth-region-july.json',root)));
  assert.deepEqual(source.bounds,REGION_DETAIL_BOUNDS);
  assert.equal(source.sourceWidth,21600);assert.equal(source.width,2700);assert.equal(source.height,1800);
  const {west,south,east,north}=REGION_DETAIL_BOUNDS;
  assert.deepEqual(regionDetailUV(west,south),{u:0,v:0});assert.deepEqual(regionDetailUV(east,north),{u:1,v:1});
  for(const [lon,lat] of [[35,31.7],[44,39],[63.4,25],[51.4,35.7]]){
    const {u,v}=regionDetailUV(lon,lat);assert.ok(u>.04&&u<.96&&v>.04&&v<.96);
  }
});

test('terrain artwork keeps fine satellite features instead of averaging them into facets',async()=>{
  const {createCanvas}=await import('@napi-rs/canvas');
  const {createTerrainSurface}=await import('../scripts/terrain-surface.mjs');
  const input=createCanvas(32,16),ctx=input.getContext('2d');
  for(let x=0;x<32;x++){ctx.fillStyle=x%2?'#bababa':'#303030';ctx.fillRect(x,0,1,16);}
  const output=createTerrainSurface(input,createCanvas,32,16).getContext('2d').getImageData(0,0,32,16).data;
  for(let x=1;x<31;x+=2)assert.ok(output[(8*32+x)*4+1]-output[(8*32+x-1)*4+1]>70);
});

test('GPU and software loaders share one decoded terrain image and retry failed loads',async()=>{
  const original=globalThis.Image,images=[];
  globalThis.Image=class {
    constructor(){images.push(this);}
    set src(value){this.url=value;}
    async decode(){this.decoded=true;}
  };
  try{
    const first=loadSatelliteSurface(),second=loadGlobeTexture(3);
    assert.equal(first,second);assert.equal(images.length,1);assert.equal(images[0].decoding,'async');
    assert.equal(images[0].url,'/textures/globe-terrain.png');
    await images[0].onload();assert.equal(await first,images[0]);assert.equal(images[0].decoded,true);
    const failed=loadGlobeTexture(1);images[1].onerror();await assert.rejects(failed,/unavailable/);
    const retry=loadGlobeTexture(1);assert.equal(images.length,3);await images[2].onload();await retry;
    await assert.rejects(loadGlobeTexture(99),/Unknown/);
  }finally{if(original===undefined)delete globalThis.Image;else globalThis.Image=original;}
});

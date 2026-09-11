import test from 'node:test';
import assert from 'node:assert/strict';
import {globeView,globePoint,globeArc,visiblePath,globeRegions,createGlobeRenderer} from '../dist/globe.js';
import {countries,contextCountries} from '../dist/geography.js';
import {companies,geometryRings} from '../dist/map-model.js';
import {globeRenderSize} from '../dist/globe-webgl.js';
const camera={x:0,y:0,scale:1,offset:0};
test('settled regional view resolves native 4K detail without raising the moving-camera budget',()=>{
  for(const [width,height,dpr] of [[3840,2160,1],[1920,1080,2],[390,844,3]]){
    const moving=globeRenderSize(width,height,dpr),settled=globeRenderSize(width,height,dpr,true);
    assert.ok(moving.width*moving.height<=2502000);
    assert.ok(settled.width>=moving.width&&settled.height>=moving.height);
    assert.ok(settled.width*settled.height<=8296000);
    assert.ok(Math.abs(settled.width/settled.height-width/height)<.005);
  }
  assert.deepEqual(globeRenderSize(3840,2160,1,true),{width:3840,height:2160});
  assert.deepEqual(globeRenderSize(1920,1080,2,true),{width:3840,height:2160});
});
test('globe center, limb and occlusion correspond to spherical geography',()=>{
  const view=globeView(camera,1440,900),center=globePoint(view.lon,view.lat,view);
  assert.ok(Math.abs(center.x-view.cx)<1e-8);assert.ok(Math.abs(center.y-view.cy)<1e-8);assert.equal(center.visible,true);
  assert.equal(globePoint(view.lon+180,-view.lat,view).visible,false);
  const equator={...view,lat:0};const limb=globePoint(view.lon+90,0,equator);assert.ok(Math.abs(limb.x-view.cx-view.radius)<1e-7);
});
test('initial globe fits desktop and mobile and all targets face the visitor',()=>{
  for(const [width,height] of [[1440,900],[390,844],[844,390]]){
    const view=globeView(camera,width,height);assert.ok(view.cx-view.radius>=0);assert.ok(view.cy+view.radius<=height);
    for(const company of companies){const p=globePoint(company.lon,company.lat,view);assert.ok(p.visible&&p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height);}
  }
});
test('projection remains aligned at high zoom and arbitrary screen offsets',()=>{
  const view=globeView(camera,1440,900);
  for(const company of companies){const next=globeView({x:(43-company.lon)*view.unit*Math.PI/180,y:(company.lat-28)*view.unit*Math.PI/180,scale:5,offset:1440*.16},1440,900);const p=globePoint(company.lon,company.lat,next);assert.ok(Math.abs(p.x-1440*.66)<1e-7);assert.ok(Math.abs(p.y-900*.53)<1e-7);}
  assert.notEqual(globePoint(35,31.7,view).x,globePoint(35,31.7,globeView({...camera,x:100},1440,900)).x);
});
test('raised arcs land precisely on source and destination and hide behind globe',()=>{
  const view=globeView(camera,1440,900),arc=globeArc([35,31.7],[51.53,32.86],view);
  for(const [point,coords] of [[arc[0],[35,31.7]],[arc.at(-1),[51.53,32.86]]]){const projected=globePoint(...coords,view);assert.ok(Math.hypot(point.x-projected.x,point.y-projected.y)<1e-7);}
  assert.match(visiblePath(arc),/^M/);assert.equal(visiblePath(globeArc([-140,-30],[-130,-30],view)),'');
});
test('globe retains country colors and renders using finite canvas coordinates',()=>{
  const regions=globeRegions([...contextCountries,...countries],geometryRings);assert.equal(regions.at(-2).color,'#ff1838');assert.equal(regions.at(-1).color,'#299fff');assert.ok(regions.slice(0,-2).every(r=>r.color==='#ffe329'));
  assert.equal(regions.at(-2).weight,2.8);assert.equal(regions.at(-1).weight,1.7);assert.ok(regions.slice(0,-2).every(r=>r.weight===1.6));
  let calls=0;const gradient={addColorStop(){}};const ctx=new Proxy({},{get:(o,key)=>key.startsWith('create')?()=>gradient:(...args)=>{for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value));calls++;},set:()=>true});
  const canvas={width:0,height:0,getContext:()=>ctx};createGlobeRenderer(canvas).draw(globeView(camera,1440,900),1440,900,regions);assert.ok(calls>1000);
});

test('2020 renders a vintage landscape with red, blue, and yellow country borders',async()=>{
  const {createCanvas}=await import('@napi-rs/canvas');
  const regions=globeRegions([...contextCountries,...countries],geometryRings);
  function pixels(vintage,outlines){
    const canvas=createCanvas(400,300),renderer=createGlobeRenderer(canvas,true);
    renderer.draw(globeView(camera,400,300),400,300,outlines,{vintage});
    return canvas.getContext('2d').getImageData(0,0,400,300).data;
  }
  function count(data,predicate){let result=0;for(let i=0;i<data.length;i+=4)if(data[i+3]>30&&predicate(data[i],data[i+1],data[i+2]))result++;return result;}
  const colored=(r,g,b)=>Math.max(r,g,b)-Math.min(r,g,b)>5;
  assert.ok(count(pixels(0,[]),colored)>1000,'the normal era retains its colored landscape');
  const aged=pixels(1,[]);
  assert.ok(count(aged,(r,g,b)=>r>g&&g>b)>1000,'2020 has warm sepia tones instead of black and white');
  assert.equal(count(aged,(r,g,b)=>b>r+5),0,'the vintage landscape has no remaining blue cast');
  const outlined=pixels(1,regions);
  assert.ok(count(outlined,(r,g,b)=>r>g+30&&r>b+30)>5,'Iran stays red');
  assert.ok(count(outlined,(r,g,b)=>b>r+30&&b>g+10)>5,'Israel stays blue');
  assert.ok(count(outlined,(r,g,b)=>r>b+30&&g>b+30)>5,'neighboring countries stay yellow');
});

// Easing uses elapsed time so fast and slow displays produce the same travel.
test('camera easing is frame-rate independent, bounded, and honors reduced motion',async()=>{
  const {easeGlobeCamera}=await import('../dist/globe.js');
  const target={x:100,y:-50,scale:5,offset:120};let fast={...camera},slow={...camera};
  for(let i=0;i<60;i++)fast=easeGlobeCamera(fast,target,1000/60);
  for(let i=0;i<30;i++)slow=easeGlobeCamera(slow,target,1000/30);
  for(const key of Object.keys(target)){assert.ok(Math.abs(fast[key]-slow[key])<.001);assert.ok(Math.abs(fast[key]-target[key])<.01);}
  const step=easeGlobeCamera(camera,target,16);assert.ok(step.scale>1&&step.scale<5);assert.ok(step.x>0&&step.x<100);
  assert.deepEqual(easeGlobeCamera(camera,target,16,true),target);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('renderer handles pointer input, dialog visibility, resize and reduced motion',()=>{
  const events={},docEvents={},motionEvents={},queue=new Map(),contexts=[];
  let nextId=0;
  const motion={matches:false,addEventListener:(name,fn)=>motionEvents[name]=fn};
  const makeHost=(width,height,open)=>({clientWidth:width,clientHeight:height,open,dataset:{phase:'selected'},addEventListener(name,fn){this[name]=fn;},prepend(canvas){this.canvas=canvas;canvas.host=this;}});
  const map=makeHost(1440,900,true),dialog=makeHost(920,900,false);
  const observers=[];
  const document={hidden:false,documentElement:{addEventListener(){},classList:{toggle(){}}},addEventListener:(name,fn)=>docEvents[name]=fn,
    getElementById:id=>id==='map-surface'?map:dialog,
    createElement(){const stats={glyphs:0,clears:0,arcs:0};contexts.push(stats);
      const ctx={setTransform(){},clearRect(){stats.clears++;},fillText(){stats.glyphs++;},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){stats.arcs++;},fill(){},createRadialGradient(){return {addColorStop(){}};}};
      return {setAttribute(){},getContext:()=>ctx,getBoundingClientRect(){return {left:0,top:0};},remove(){}};
    }};
  const context=vm.createContext({document,devicePixelRatio:3,matchMedia:()=>motion,Math,
    window:{addEventListener:(name,fn)=>events[name]=fn},
    ResizeObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){this.fn();}},
    MutationObserver:class{constructor(fn){this.fn=fn;}observe(){}},
    requestAnimationFrame:fn=>{const id=++nextId;queue.set(id,fn);return id;},cancelAnimationFrame:id=>queue.delete(id)});
  vm.runInContext(readFileSync(new URL('../dist/particles.js',import.meta.url),'utf8'),context);
  function tick(time){const callbacks=[...queue.values()];queue.clear();callbacks.forEach(fn=>fn(time));}
  tick(100);tick(116);
  assert.ok(contexts[0].glyphs>0,'ASCII is drawn');assert.equal(contexts[1].clears,0,'closed dialog is skipped');
  assert.equal(map.canvas.width,2880,'pixel ratio is capped at 2');
  assert.ok(vm.runInContext('fields.every(f=>f.rain.length<=90 && f.points.length<=180)',context));
  assert.equal(vm.runInContext('new Set(fields[0].rain.map(c=>c.layer)).size',context),3,'three depths of rain');
  map['matrix-markers']({detail:[{x:400,y:300,r:58}]});
  assert.equal(vm.runInContext('fields[0].quietZones.length',context),1,'logo quiet zones accepted');
  events.pointermove({clientX:400,clientY:300});tick(132);
  dialog.open=true;dialog.dataset.phase='burst';tick(148);assert.ok(contexts[1].glyphs>0,'open dialog renders');
  const before=contexts[0].clears;document.hidden=true;docEvents.visibilitychange();assert.equal(queue.size,0);tick(160);assert.equal(contexts[0].clears,before);
  document.hidden=false;docEvents.visibilitychange();tick(180);
  motion.matches=true;motionEvents.change();tick(200);assert.equal(queue.size,0,'reduced motion stops continuous animation');
  events.pointermove({clientX:250,clientY:200});tick(220);assert.equal(queue.size,0);
  map.clientWidth=390;map.clientHeight=844;observers[0].fn();tick(240);
  assert.ok(vm.runInContext('fields[0].points.length<=100',context));
});

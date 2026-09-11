import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const code=app.slice(app.indexOf('const pointers=new Map();'),app.indexOf("surface.addEventListener('keydown'"));
function setup(){
  const handlers=new Map(),captured=[];
  const surface={addEventListener:(name,fn)=>handlers.set(name,fn),classList:{toggle(){},add(){}},focus(){},setPointerCapture:id=>captured.push(id)};
  const context=vm.createContext({surface,camera:{x:0,y:0,scale:1},dialog:{open:false},schedule(){},controlTarget:t=>t.control});
  vm.runInContext(code,context);
  const logo={control:true,closest:()=>logo,setPointerCapture:id=>captured.push(id)};
  const fire=(name,extra={})=>handlers.get(name)({target:logo,pointerId:1,button:0,clientX:10,clientY:10,...extra});
  return {context,fire,captured};
}
test('native image drag is cancelled',()=>{const {fire}=setup();let cancelled=false;fire('dragstart',{preventDefault(){cancelled=true;}});assert.ok(cancelled);});
test('the opening start gate prevents map gestures',()=>{const {fire,context,captured}=setup();context.surface.inert=true;fire('pointerdown');fire('pointermove',{clientX:60});assert.equal(context.camera.x,0);assert.equal(captured.length,0);});
test('small logo press preserves click and does not pan',()=>{
  const {fire,context,captured}=setup();fire('pointerdown');fire('pointermove',{clientX:12});fire('pointerup');
  fire('click',{detail:1,preventDefault(){assert.fail('Click cancelled');}});
  assert.equal(context.camera.x,0);assert.deepEqual(captured,[1]);
});
test('dragging from a logo pans and suppresses the release click',()=>{
  const {fire,context}=setup();fire('pointerdown');fire('pointermove',{clientX:50,clientY:30});fire('pointerup');
  assert.equal(context.camera.x,40);assert.equal(context.camera.y,20);
  let cancelled=false,stopped=false;fire('click',{detail:1,preventDefault(){cancelled=true;},stopImmediatePropagation(){stopped=true;}});
  assert.ok(cancelled&&stopped);
  fire('pointerdown');fire('pointerup');fire('click',{detail:1,preventDefault(){assert.fail('Next click cancelled');}});
});
test('keyboard activation remains available after a drag',()=>{
  const {fire}=setup();fire('pointerdown');fire('pointermove',{clientX:60});fire('pointerup');
  fire('click',{detail:0,preventDefault(){assert.fail('Keyboard click cancelled');}});
});

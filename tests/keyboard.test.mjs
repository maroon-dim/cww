import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../dist/experience-ui.js',import.meta.url),'utf8');
const block=source.slice(source.indexOf("  window.addEventListener('keydown'"),source.indexOf('  let swallowClick'));
function route(phase,key,options={}){
  let handler,prevented=false;const actions=[];
  const target={closest:selector=>selector==='button'&&options.button};
  vm.runInNewContext(block,{window:{addEventListener:(name,fn)=>{handler=fn;}},events:{signal:null},latest:{phase,notice:options.notice},controller:{activity:()=>!!options.idle,dispatch:(...args)=>actions.push(args)}});
  handler({key,target,repeat:false,...options,preventDefault(){prevented=true;},stopImmediatePropagation(){}});
  return {actions,prevented};
}
test('Space starts the experience, advances results, and types inside a game',()=>{
  assert.equal(route('attract',' ').actions[0][0],'start');assert.equal(route('attract',' ',{repeat:true}).actions.length,0);
  assert.equal(route('target',' ').actions.length,0);assert.equal(route('result',' ').actions[0][0],'advance');
  assert.equal(route('typing',' ').actions[0][0],'type');assert.equal(route('followup',' ').actions.length,0);
  assert.ok(route('region-zoom',' ').prevented,'Space cannot scroll or activate controls during the zoom');
});
test('held keys and browser shortcuts cannot accelerate typing',()=>{
  assert.equal(route('typing','a',{repeat:true}).actions.length,0);assert.equal(route('typing','a',{ctrlKey:true}).actions.length,0);
  assert.ok(route('typing','Enter',{repeat:true,button:true}).prevented,'held Enter cannot repeat native Type-button clicks');
});
test('follow-up buttons keep native keyboard activation and typing cannot skip the question',()=>{
  for(const key of ['Enter',' ']){const result=route('followup',key,{button:true});assert.equal(result.actions.length,0);assert.equal(result.prevented,false);}
  for(const key of ['a','1','Backspace'])assert.equal(route('followup',key).actions.length,0);
});
test('vector puzzles retain native button activation and random typing cannot skip their task',()=>{
  for(const key of ['Enter',' ']){const result=route('vector-game',key,{button:true});assert.equal(result.actions.length,0);assert.equal(result.prevented,false);}
  for(const key of ['a','1','Backspace'])assert.equal(route('vector-game',key).actions.length,0);
  const idle=route('vector-game','Enter',{button:true,idle:true});assert.equal(idle.actions.length,0);assert.equal(idle.prevented,true);
});
test('Restart and Type buttons retain native keyboard activation',()=>{
  assert.equal(route('followup','Enter',{button:true}).actions.length,0);assert.equal(route('typing',' ',{button:true}).actions.length,0);
});
test('idle dismissal consumes the first key and confirmation blocks gameplay input',()=>{
  assert.equal(route('typing','a',{idle:true}).actions.length,0);assert.equal(route('followup','Enter',{notice:'restart'}).actions.length,0);
});

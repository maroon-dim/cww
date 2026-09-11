import test from 'node:test';
import assert from 'node:assert/strict';
import {createExperience,attackMethods} from '../dist/experience.js';
import {APPROACH_DURATION,INTRO_DURATION,REGION_ZOOM_DURATION} from '../dist/approach.js';
import {createTyping,typeInput,tickTyping} from '../dist/minigames.js';

const target={code:'HESA',name:'HESA'};
function setup(options={}){
  const model=createExperience(options);
  function advance(ms){for(let left=ms;left>0;left-=100)model.tick(Math.min(100,left));}
  function openGlobe(){model.dispatch('start');advance(INTRO_DURATION);advance(REGION_ZOOM_DURATION);advance(1800);}
  function start(){openGlobe();model.dispatch('target',target);advance(APPROACH_DURATION);model.dispatch('method','phishing');}
  function finishGame(){
    const round=model.snapshot().round;
    if(model.snapshot().phase==='vector-game'){
      const input=(action,value)=>model.dispatch('vector',{action,value});
      if(round===2){input('assist');advance(3000);}
      else{
        const kind=model.snapshot().method;
        if(kind==='phishing')for(const value of ['schedule','team','review'])input('choice',value);
        else if(kind==='blackbox'){
          for(const [page,card] of [['home','portal'],['help','release'],['status','preview']]){input('page',page);input('inspect',card);}
          input('entrypoint','preview');
        }else for(const value of ['input','probe','capture','demonstrate'])input('block',value);
        input('submit');if(round===1)advance(10000);
      }
    }else if(round===0)for(let i=0;i<12;i++)model.dispatch('type',4);
    else{model.dispatch('type');advance(round===1?10000:3000);}
    assert.equal(model.snapshot().game.status,round===1?'blocked':'success');advance(1200);
  }
  return {model,advance,openGlobe,start,finishGame};
}
const paths={phishing:['phone','sms','work-mail'],blackbox:['main-site','internal-site','support-portal'],'zero-day':['cpanel','exchange','fortigate']};
for(const [method,choices] of Object.entries(paths))for(const choice of choices)test(method+' / '+choice+' completes its unique game, follow-up, and Hacker Typer in all three eras',()=>{
  const {model,advance,openGlobe,finishGame}=setup();
  openGlobe();model.dispatch('target',target);advance(APPROACH_DURATION);
  for(let round=0;round<3;round++){
    assert.equal(model.snapshot().phase,'method');assert.equal(model.snapshot().method,null);
    assert.equal(model.dispatch('type'),false);model.dispatch('method',method);
    assert.equal(model.snapshot().round,round);assert.equal(model.snapshot().typingStep,1);assert.equal(model.snapshot().followup,null);
    assert.equal(model.snapshot().phase,'vector-game');assert.equal(model.snapshot().game.kind,method);
    assert.equal(model.dispatch('type'),false,'Hacker Typer input cannot skip the vector game');finishGame();
    assert.equal(model.snapshot().phase,'followup');assert.equal(model.snapshot().game,null);
    advance(5000);assert.equal(model.snapshot().phase,'followup','question waits for a choice');
    assert.equal(model.dispatch('followup',choice),true);
    const state=model.snapshot();assert.equal(state.phase,'typing');assert.equal(state.typingStep,2);assert.equal(state.followup,choice);
    assert.equal(state.game.progress,0);assert.equal(state.game.status,'ready');assert.equal(state.game.elapsed,0);
    finishGame();assert.equal(model.snapshot().phase,'result');
    assert.deepEqual(model.snapshot().results,['win','loss','win'].slice(0,round+1));
    assert.deepEqual(model.snapshot().target,target);assert.equal(model.snapshot().method,method);
    model.dispatch('advance');if(round<2)advance(1800);
  }
  assert.equal(model.snapshot().phase,'attract');assert.equal(model.snapshot().target,null);
  assert.equal(model.snapshot().method,null);assert.equal(model.snapshot().followup,null);assert.deepEqual(model.snapshot().results,[]);
});

test('follow-up choices are restricted to their method and only accepted at the question',()=>{
  for(const method of Object.keys(paths)){
    const {model,finishGame}=setup({reducedMotion:true});const choice=paths[method][0];
    assert.deepEqual(attackMethods[method].options.map(option=>option.id),paths[method]);
    assert.equal(model.dispatch('followup',choice),false);
    model.dispatch('start');model.dispatch('target',target);model.dispatch('method',method);
    assert.equal(model.dispatch('followup',choice),false);finishGame();
    const state=model.snapshot();
    for(const action of ['type','advance','method','vector','keypad'])assert.equal(model.dispatch(action,choice),false);
    for(const invalid of ['invalid',null,...Object.entries(paths).filter(([key])=>key!==method).flatMap(([,values])=>values)])assert.equal(model.dispatch('followup',invalid),false);
    assert.deepEqual(model.snapshot(),{...state,idleMs:0},'rejected inputs count as activity but cannot change the scenario');
    model.dispatch('followup',choice);model.dispatch('type');const running=model.snapshot();
    assert.equal(model.dispatch('followup',paths[method][1]),false);assert.deepEqual(model.snapshot(),running);
  }
});

test('each new era requires a fresh vector and follows its matching question',()=>{
  const {model,start,finishGame}=setup({reducedMotion:true});start();finishGame();
  model.dispatch('followup','sms');finishGame();model.dispatch('advance');
  for(const [method,choice] of [['blackbox','support-portal'],['zero-day','exchange']]){
    assert.equal(model.snapshot().phase,'method');assert.equal(model.snapshot().method,null);assert.equal(model.snapshot().followup,null);
    assert.deepEqual(model.snapshot().target,target);assert.equal(model.dispatch('type'),false);
    assert.equal(model.dispatch('followup','sms'),false);assert.equal(model.dispatch('backToMap'),false);
    model.dispatch('method',method);finishGame();assert.equal(model.snapshot().phase,'followup');
    assert.equal(model.dispatch('followup','sms'),false);assert.equal(model.dispatch('followup',choice),true);
    finishGame();model.dispatch('advance');
  }
  assert.equal(model.snapshot().phase,'attract');
});

test('follow-up respects hidden pages, restart confirmation, idle dismissal, and reset',()=>{
  const {model,advance,start,finishGame}=setup({reducedMotion:true});start();finishGame();
  const state=model.snapshot();model.setHidden(true);advance(150000);assert.deepEqual(model.snapshot(),state);model.setHidden(false);
  model.dispatch('restart');assert.equal(model.dispatch('followup','phone'),false);advance(5000);assert.equal(model.snapshot().phase,'followup');
  model.dispatch('resume');assert.equal(model.snapshot().phase,'followup');
  advance(90000);assert.equal(model.snapshot().notice,'idle');assert.equal(model.dispatch('followup','phone'),false);assert.equal(model.snapshot().phase,'followup');
  assert.equal(model.snapshot().notice,null);model.dispatch('followup','sms');model.dispatch('type');
  model.dispatch('restart');model.dispatch('confirmRestart');advance(30000);
  assert.equal(model.snapshot().phase,'attract');assert.equal(model.snapshot().followup,null);assert.equal(model.snapshot().typingStep,1);
});

test('2020 typing needs 48 keys or 12 equivalent button presses',()=>{
  const game=createTyping();for(let i=0;i<11;i++)typeInput(game,'before-ai',4);assert.equal(game.status,'running');
  typeInput(game,'before-ai',4);assert.equal(game.status,'success');typeInput(game,'before-ai',4);assert.equal(game.keys,48);
});
test('defender typing is slower, continues past the old cap, and explains the block',()=>{
  const manual=createTyping(),defended=createTyping();
  for(let i=0;i<48;i++){typeInput(manual,'before-ai');typeInput(defended,'defender-ai');}
  assert.equal(manual.progress,1);assert.equal(defended.progress,.25);
  for(let i=0;i<700;i++)typeInput(defended,'defender-ai');
  assert.ok(defended.progress>.82);const before=defended.progress;typeInput(defended,'defender-ai');assert.ok(defended.progress>before);assert.ok(defended.progress<1);
  tickTyping(defended,'defender-ai',3500);assert.match(defended.message,/slowing/);
  tickTyping(defended,'defender-ai',4000);assert.match(defended.message,/detected/);assert.equal(defended.status,'running');
  tickTyping(defended,'defender-ai',2500);assert.equal(defended.status,'blocked');
});


test('Space starts rotation, then regional zoom, then rewind, then target selection and the HQ approach',()=>{
  const {model,advance}=setup();assert.equal(model.snapshot().phase,'attract');
  for(const action of ['target','method','type','advance'])assert.equal(model.dispatch(action,target),false);
  advance(180000);assert.equal(model.snapshot().phase,'attract');assert.equal(model.snapshot().notice,null);
  assert.equal(model.dispatch('start'),true);assert.equal(model.snapshot().phase,'intro');
  assert.equal(model.dispatch('start'),false);assert.equal(model.dispatch('target',target),false);assert.equal(model.dispatch('advance'),false);
  advance(INTRO_DURATION-100);assert.equal(model.snapshot().phase,'intro');advance(100);assert.equal(model.snapshot().phase,'region-zoom');
  assert.equal(model.dispatch('target',target),false);assert.equal(model.dispatch('method','phishing'),false);assert.equal(model.dispatch('advance'),false);
  advance(REGION_ZOOM_DURATION-100);assert.equal(model.snapshot().phase,'region-zoom');advance(100);assert.equal(model.snapshot().phase,'timeline');
  assert.equal(model.snapshot().elapsed,0,'rewind clock starts only after the zoom and fade finish');
  assert.equal(model.dispatch('target',target),false);assert.equal(model.dispatch('method','phishing'),false);assert.equal(model.dispatch('advance'),false);
  advance(1700);assert.equal(model.snapshot().phase,'timeline');advance(100);assert.equal(model.snapshot().phase,'target');
  model.dispatch('target',target);assert.equal(model.snapshot().phase,'approach');assert.equal(model.dispatch('target',{code:'OTHER',name:'Other'}),false);
  assert.equal(model.dispatch('method','phishing'),false);advance(APPROACH_DURATION);assert.equal(model.snapshot().phase,'method');
  assert.equal(model.dispatch('method','invalid'),false);model.dispatch('method','phishing');
  assert.equal(model.snapshot().phase,'vector-game','selecting the initial vector starts its own game without another rewind');assert.deepEqual(model.snapshot().target,target);
});

test('opening rotation pauses while hidden or confirming restart and cannot outlive reset',()=>{
  const {model,advance}=setup();model.dispatch('start');advance(1000);const state=model.snapshot();
  model.setHidden(true);advance(150000);assert.deepEqual(model.snapshot(),state);model.setHidden(false);
  model.dispatch('restart');advance(2000);assert.equal(model.snapshot().phase,'intro');assert.equal(model.snapshot().elapsed,1000);
  model.dispatch('resume');advance(INTRO_DURATION-1000);assert.equal(model.snapshot().phase,'region-zoom');
  model.dispatch('restart');model.dispatch('confirmRestart');advance(10000);assert.equal(model.snapshot().phase,'attract');assert.equal(model.snapshot().target,null);
});

test('regional zoom pauses while hidden or confirming restart, and reset cancels the pending rewind',()=>{
  const {model,advance}=setup();model.dispatch('start');advance(INTRO_DURATION);advance(2200);
  const state=model.snapshot();assert.equal(state.phase,'region-zoom');
  model.setHidden(true);advance(150000);assert.deepEqual(model.snapshot(),state);model.setHidden(false);
  model.dispatch('restart');advance(2000);assert.equal(model.snapshot().elapsed,2200);
  model.dispatch('resume');advance(REGION_ZOOM_DURATION-2200);assert.equal(model.snapshot().phase,'timeline');
  model.dispatch('restart');model.dispatch('confirmRestart');
  model.dispatch('start');advance(INTRO_DURATION);advance(2200);model.dispatch('restart');model.dispatch('confirmRestart');
  advance(10000);assert.equal(model.snapshot().phase,'attract');assert.equal(model.snapshot().target,null);
});

test('a visitor who leaves during target selection returns to the Space screen',()=>{
  const {model,openGlobe,advance}=setup();openGlobe();advance(100000);assert.equal(model.snapshot().phase,'attract');
  assert.equal(model.dispatch('target',target),false);
});

test('restart confirmation pauses gameplay and cancelled sessions cannot later advance',()=>{
  const {model,advance,start}=setup();start();model.dispatch('vector',{action:'choice',value:'schedule'});model.dispatch('restart');
  advance(5000);assert.equal(model.snapshot().game.elapsed,0);model.dispatch('resume');assert.equal(model.snapshot().phase,'vector-game');
  model.dispatch('restart');model.dispatch('confirmRestart');advance(30000);assert.equal(model.snapshot().phase,'attract');assert.equal(model.snapshot().game,null);
});
test('idle warning pauses play, input dismisses it, and expiry resets',()=>{
  const {model,advance,start}=setup();start();advance(90000);assert.equal(model.snapshot().notice,'idle');
  model.dispatch('vector',{action:'choice',value:'schedule'});assert.equal(model.snapshot().notice,null);assert.equal(model.snapshot().game.draft.subject,null,'dismissal does not also choose a message');
  advance(100000);assert.equal(model.snapshot().phase,'attract');
});
test('hidden pages pause game and idle clocks',()=>{
  const {model,advance,start}=setup();start();model.dispatch('vector',{action:'choice',value:'schedule'});const state=model.snapshot();
  model.setHidden(true);advance(150000);assert.deepEqual(model.snapshot(),state);model.setHidden(false);advance(1000);assert.equal(model.snapshot().game.elapsed,1000);
});
test('reduced motion preserves the start gate and choices while skipping travel',()=>{
  const {model}=setup({reducedMotion:true});assert.equal(model.snapshot().phase,'attract');
  assert.equal(model.dispatch('target',target),false);model.dispatch('start');assert.equal(model.snapshot().phase,'target');
  model.dispatch('target',target);assert.equal(model.snapshot().phase,'method');model.dispatch('method','phishing');assert.equal(model.snapshot().phase,'vector-game');
  for(const phase of ['intro','region-zoom','timeline']){
    const normal=createExperience();normal.dispatch('start');if(phase!=='intro')normal.tick(INTRO_DURATION);if(phase==='timeline')normal.tick(REGION_ZOOM_DURATION);
    assert.equal(normal.snapshot().phase,phase);normal.setReducedMotion(true);assert.equal(normal.snapshot().phase,'target');
  }
});

test('the vector and typing defender clocks each begin only after interaction',()=>{
  const {model,advance,start,finishGame}=setup({reducedMotion:true});start();finishGame();model.dispatch('followup','phone');finishGame();model.dispatch('advance');model.dispatch('method','phishing');
  for(let step=1;step<=2;step++){
    advance(20000);assert.equal(model.snapshot().game.status,'ready');assert.equal(model.snapshot().game.elapsed,0);
    if(step===1)model.dispatch('vector',{action:'choice',value:'schedule'});else model.dispatch('type');
    advance(9900);assert.equal(model.snapshot().game.status,'running');
    advance(100);assert.equal(model.snapshot().game.status,'blocked');advance(1200);
    if(step===1){assert.equal(model.snapshot().phase,'followup');model.dispatch('followup','sms');}
  }
  assert.equal(model.snapshot().phase,'result');assert.deepEqual(model.snapshot().results,['win','loss']);
});

test('approach pauses when hidden and restart cancels it',()=>{
  const {model,advance,openGlobe}=setup();openGlobe();model.dispatch('target',target);
  model.setHidden(true);advance(5000);assert.equal(model.snapshot().phase,'approach');model.setHidden(false);
  model.dispatch('restart');advance(2000);assert.equal(model.snapshot().phase,'approach');
  model.dispatch('confirmRestart');advance(5000);assert.equal(model.snapshot().phase,'attract');
});
test('reduced motion during zoom opens method and back permits a fresh target',()=>{
  const {model,advance,openGlobe}=setup();openGlobe();model.dispatch('target',target);
  model.setReducedMotion(true);assert.equal(model.snapshot().phase,'method');model.dispatch('backToMap');
  assert.equal(model.snapshot().phase,'target');assert.equal(model.snapshot().target,null);
  model.dispatch('target',{code:'IEI',name:'IEI'});assert.equal(model.snapshot().phase,'method');assert.equal(model.snapshot().target.code,'IEI');
});

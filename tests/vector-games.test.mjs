import test from 'node:test';
import assert from 'node:assert/strict';
import {createVectorGame,vectorInput,tickVectorGame,canSubmitVector} from '../dist/vector-games.js';

function puzzle(kind,round='before-ai'){
  const game=createVectorGame(kind);
  const input=(action,value)=>vectorInput(game,round,action,value);
  function solve(){
    if(kind==='phishing')for(const value of ['schedule','team','review'])input('choice',value);
    else if(kind==='blackbox'){
      for(const [page,card] of [['home','portal'],['help','release'],['status','preview']]){input('page',page);input('inspect',card);}
      input('entrypoint','preview');
    }else for(const value of ['input','probe','capture','demonstrate'])input('block',value);
    input('submit');
  }
  return {game,input,solve,tick:ms=>tickVectorGame(game,round,ms)};
}

test('phishing composes a coherent message and lets a visitor revise an unconvincing draft',()=>{
  const {game,input,tick}=puzzle('phishing');
  assert.equal(input('submit'),false);
  input('choice','prize');assert.equal(game.field,1);
  input('choice','team');input('choice','review');assert.equal(game.progress,1);
  input('submit');assert.equal(game.status,'running');assert.equal(game.field,0);assert.match(game.message,/Subject/);
  tick(45000);assert.equal(game.status,'running','manual games have no failure clock');
  input('choice','schedule');input('submit');assert.equal(game.status,'success');assert.equal(game.attempts,2);
  assert.deepEqual(game.draft,{subject:'schedule',opening:'team',request:'review'});
  assert.equal(input('field',1),false,'completed games cannot be edited');
});

test('Black Box needs three different clues and the entry point they identify',()=>{
  const {game,input}=puzzle('blackbox');
  input('inspect','news');assert.equal(game.clues.length,0);
  assert.equal(input('inspect','release'),false,'details from a hidden page cannot be inspected');
  input('inspect','portal');input('inspect','portal');assert.equal(game.clues.length,1);
  input('entrypoint','preview');assert.equal(input('submit'),false,'a lucky entrypoint guess cannot replace investigation');
  input('page','help');input('inspect','release');input('page','status');input('inspect','preview');
  input('entrypoint','news');input('submit');assert.equal(game.status,'running');assert.match(game.message,/three clues/);
  input('entrypoint','preview');input('submit');assert.equal(game.status,'success');
  assert.deepEqual(game.clues,['platform','version','exposure']);
});

test('Zero-Day validates code dependencies and supports undo and retry',()=>{
  const {game,input}=puzzle('zero-day');
  assert.equal(input('undo'),false);
  input('block','probe');assert.equal(input('block','probe'),false,'a code block can only be used once');
  for(const block of ['input','capture','demonstrate'])input('block',block);
  input('submit');assert.equal(game.status,'running');assert.match(game.message,/Line 1: Create the input/);
  for(let i=0;i<4;i++)input('undo');assert.equal(game.progress,0);
  for(const block of ['input','probe','capture','demonstrate'])input('block',block);
  input('submit');assert.equal(game.status,'success');assert.equal(game.attempts,2);
});

for(const kind of ['phishing','blackbox','zero-day']){
  test(kind+' defender blocks even a correctly completed puzzle, ten seconds after interaction',()=>{
    const {game,input,solve,tick}=puzzle(kind,'defender-ai');
    tick(20000);assert.equal(game.status,'ready');assert.equal(game.elapsed,0);
    solve();assert.equal(game.status,'running');assert.equal(game.submitted,true);assert.equal(game.progress,1);
    assert.equal(canSubmitVector(game),false);assert.equal(input('submit'),false);
    tick(3500);assert.match(game.message,/reviewing/);tick(4000);assert.match(game.message,/Countermeasures/);
    tick(2499);assert.equal(game.status,'running');tick(1);assert.equal(game.status,'blocked');
    const completed=structuredClone(game);tick(20000);assert.equal(input('assist'),false);assert.deepEqual(game,completed);
  });
  test(kind+' attacker AI visibly assembles the task from one initiating action',()=>{
    const {game,input,tick}=puzzle(kind,'both-ai');
    tick(20000);assert.equal(game.status,'ready');assert.equal(game.progress,0);
    assert.equal(input('submit'),false);assert.equal(input('choice','schedule'),false);
    assert.equal(input('assist'),true);assert.equal(input('assist'),false);
    tick(750);assert.equal(game.status,'running');assert.ok(game.progress>0&&game.progress<1);
    tick(2249);assert.equal(game.status,'running');tick(1);assert.equal(game.status,'success');assert.equal(game.progress,1);
    assert.match(game.message,/AI ASSISTED/);
  });
  test(kind+' rejects unrelated and malformed actions without starting its clock',()=>{
    const {game,input}=puzzle(kind),initial=structuredClone(game);
    for(const [action,value] of [['assist'],['type'],['submit'],['field',-1],['field',NaN],['choice','__proto__'],['page','missing'],['inspect','missing'],['entrypoint',{}],['block','not-code']])assert.equal(input(action,value),false);
    assert.deepEqual(game,initial);
  });
}

import {createExperience,rounds,attackMethods} from './experience.js';
import {terminalText} from './minigames.js';
import {createVectorUI} from './vector-ui.js';
import {createHeadquartersScene} from './hq-scene.js';
import {APPROACH_DURATION,approachFrame} from './approach.js';

export function createExperienceUI({companies,onSelect,onReset,onApproach=()=>{},onApproachPause=()=>{},onSceneChange=()=>{}}){
  const $=id=>document.getElementById(id),shell=$('attack-dialog'),surface=$('map-surface'),prompt=$('session-prompt');
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),events=new AbortController();
  const views=[...document.querySelectorAll('[data-view]')],steps=[...document.querySelectorAll('[data-era-step]')];
  let previousPhase=null,previousRound=-1,previousTarget,restoreFocus=null,latest,hqScene=null;
  let last=performance.now();
  const vectorUI=createVectorUI({dispatch:(action,value)=>controller.dispatch('vector',{action,value}),signal:events.signal});
  const text=(id,value)=>{const element=$(id);if(element.textContent!==value)element.textContent=value;};
  function positionHeadquarters(pose){
    if(!latest||!['approach','method'].includes(latest.phase))return;
    const stage=$('hq-stage'),rect=$('hq-anchor').getBoundingClientRect(),dock=latest.phase==='method'?1:pose.dock;
    const reveal=latest.phase==='method'?1:pose.reveal;
    stage.style.left=rect.left*dock+'px';stage.style.top=rect.top*dock+'px';
    stage.style.width=(innerWidth+(rect.width-innerWidth)*dock)+'px';stage.style.height=(innerHeight+(rect.height-innerHeight)*dock)+'px';
    stage.style.opacity=reveal;
    document.body.style.setProperty('--hq-reveal',reveal);document.body.style.setProperty('--hq-dock',dock);
  }
  function draw(state){
    latest=state;const round=rounds[state.round],changed=previousPhase!==state.phase||previousRound!==state.round;
    if(changed)last=performance.now();
    const opening=['attract','intro'].includes(state.phase);
    const zooming=state.phase==='region-zoom',timelineVisible=zooming||state.phase==='timeline';
    const era=opening||zooming?'defender-ai':round.id;
    if(document.body.dataset.era!==era){document.body.dataset.era=era;window.dispatchEvent(new Event('experience-era'));}
    document.body.dataset.screen=state.phase;
    document.body.classList.toggle('launch-burst',round.id==='both-ai'&&state.game?.status==='running');
    shell.dataset.phase=state.game?.status==='blocked'?'blocked':round.id==='both-ai'&&state.game?.status==='running'?'burst':'idle';
    shell.dataset.outcome=state.phase==='result'?(state.round===1?'loss':'win'):state.game?.status||'';
    // Use the game clock so resets, pauses, and transitions cannot leave a tint behind.
    shell.classList.toggle('failure-impact',!motion.matches&&state.game?.status==='blocked'&&state.game.hold<1000);
    surface.inert=state.phase!=='target'||!!state.notice;
    $('intro-overlay').hidden=!opening;$('intro-overlay').inert=state.phase!=='attract'||!!state.notice;
    $('target-hud').hidden=state.phase!=='target';$('target-hud').inert=!!state.notice;
    $('approach-hud').hidden=state.phase!=='approach';
    onApproachPause(!!state.notice,state.phase==='approach'?state.elapsed:undefined);
    if(state.notice){
      if(!prompt.open){restoreFocus=document.activeElement;prompt.showModal();$('resume-session').focus();}
      text('prompt-title',state.notice==='idle'?'Still playing?':'Restart this experience?');
      text('prompt-description',state.notice==='idle'?'Returning to the start in '+Math.max(0,Math.ceil((100000-state.idleMs)/1000))+' seconds. Move the mouse or press a key to keep playing.':'Your current progress will be cleared.');
      $('confirm-restart').hidden=state.notice==='idle';
    }else if(prompt.open){prompt.close();if(restoreFocus?.isConnected)restoreFocus.focus({preventScroll:true});}
    shell.inert=zooming;
    if(opening||state.phase==='target'){if(shell.open)shell.close();}
    else if(!shell.open)shell.showModal();
    for(const view of views){view.hidden=view.dataset.view!==state.phase&&!(state.phase==='approach'&&view.dataset.view==='method')&&!(zooming&&view.dataset.view==='timeline');view.inert=state.phase==='approach'||zooming;}
    $('session-restart').hidden=opening||['target','approach'].includes(state.phase);
    $('experience-timeline').hidden=opening||['target','approach'].includes(state.phase);
    for(const step of steps){const index=Number(step.dataset.eraStep);step.classList.toggle('is-current',index===state.round);step.classList.toggle('is-done',index<state.round);if(index===state.round)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');}
    if(previousTarget!==state.target?.code){onSelect(state.target?.code||null);previousTarget=state.target?.code;}
    if(['attract','target'].includes(state.phase)&&previousPhase&&previousPhase!==state.phase)onReset();
    onSceneChange(state);
    document.querySelectorAll('[data-target-name]').forEach(el=>{el.textContent=state.target?.name||'';});
    document.querySelectorAll('[data-mode-label]').forEach(el=>{el.textContent=round.year+' / '+round.label;});
    text('experience-footer-label',opening?'SPECTER / VISITOR CONSOLE':round.year+' / '+round.label.toUpperCase());
    if(state.phase==='method'){
      text('method-title',state.round===0?'Choose your attack vector.':'Choose your next attack vector.');
      text('method-intro',state.round===0?'Choose an approach to begin the 2020 scenario.':'A new era. Choose an approach for '+round.label+'.');
      $('back-to-map').hidden=state.round!==0;
    }
    if(state.phase==='approach'&&changed){
      text('approach-company',state.target.name);
      onApproach(companies.find(c=>c.code===state.target.code));
    }
    const showHeadquarters=['approach','method'].includes(state.phase);
    $('hq-stage').hidden=!showHeadquarters;
    if(showHeadquarters){
      if(!hqScene)hqScene=createHeadquartersScene($('hq-canvas'),{onFrame:positionHeadquarters});
      if(changed&&!(state.phase==='method'&&previousPhase==='approach')){
        text('hq-company',state.target.name);
        $('hq-logo').src='./logos/'+state.target.code+'.png';
        hqScene.setTarget(state.target.code);
      }
      if(changed||motion.matches||$('hq-stage').dataset.renderer==='fallback'){
        hqScene.setApproachTime(state.phase==='approach'?state.elapsed:APPROACH_DURATION);
        positionHeadquarters(approachFrame(state.phase==='approach'?state.elapsed:APPROACH_DURATION));
      }
    }
    hqScene?.setActive(showHeadquarters);hqScene?.setPaused(!!state.notice);
    if(timelineVisible){
      text('transition-label',['REWINDING SIX YEARS','RETURNING TO 2026','SAME YEAR. A NEW CAPABILITY.'][state.round]);
      const yearWindow=$('transition-year');
      if(changed&&!(state.phase==='timeline'&&previousPhase==='region-zoom')){
        const reel=document.createElement('span');reel.className='year-reel';
        const years=state.round===2?[2026,2026,2026]:Array.from({length:7},(_,i)=>state.round===0?2026-i:2020+i);
        for(const year of years){const row=document.createElement('span');row.textContent=year;reel.append(row);}
        yearWindow.replaceChildren(reel);
        yearWindow.parentElement.dataset.direction=state.round===0?'rewind':state.round===1?'forward':'upgrade';
      }
      const timelineElapsed=zooming?0:state.elapsed,travel=Math.min(1,timelineElapsed/650);
      yearWindow.style.setProperty('--reel-offset',(-travel*(state.round===2?2:6)*1.1)+'em');
      yearWindow.parentElement.classList.toggle('is-traveling',!zooming&&timelineElapsed<750);
      yearWindow.parentElement.classList.toggle('has-arrived',timelineElapsed>=750);
      text('transition-title',round.title);
      text('transition-description',['No AI assistance. Your hands do the work.','The defender has AI. You still work manually.','Both sides have AI. This time, you have assistance.'][state.round]);
      $('transition-progress').style.width=Math.min(100,timelineElapsed/18)+'%';
    }
    if(state.phase==='vector-game')vectorUI.draw(state,changed);
    if(state.phase==='typing'){
      const game=state.game,ai=state.round===2,blocked=game.status==='blocked',completed=['success','blocked'].includes(game.status);
      const method=attackMethods[state.method],choice=method.options.find(option=>option.id===state.followup);
      text('typing-step','0'+state.typingStep+' / HACKER TYPER');
      text('typing-title','Execute the sequence.');
      text('typing-route',method.label+(choice?' / '+choice.label:''));
      text('typing-file',state.typingStep===1?'sequence-01.sim':'sequence-02.sim');
      text('typing-instruction',ai?'Press any typing key once. Let your AI assemble the sequence.':'Type any letters to build the simulated sequence. Accuracy does not matter.');
      text('typing-assistance',state.round===0?'Manual effort / no time limit':state.round===1?'Defender AI is watching this attempt.':game.status==='ready'?'Attacker AI is ready to assist.':'ATTACKER AI ASSISTING');
      const sequenceText='> APPROACH: '+method.label+'\n> STAGE: '+state.typingStep+(choice?' / '+choice.label:' / Initial sequence')+'\n'+terminalText;
      text('terminal-output',sequenceText.slice(0,Math.floor(sequenceText.length*game.progress)));
      $('terminal-output').scrollTop=$('terminal-output').scrollHeight;
      const progress=Math.floor(game.progress*100);$('typing-progress').value=progress;text('typing-percent',progress+'%');
      text('type-button',ai?'Use attacker AI':'Type');$('type-button').disabled=completed||(ai&&game.status==='running');
      text('typing-feedback',game.message||(game.status==='running'&&ai?'AI is assembling the sequence…':''));
      $('typing-intercept').hidden=!blocked;
    }
    if(state.phase==='followup'&&changed){
      const method=attackMethods[state.method];
      text('followup-title',method.question);text('followup-method',method.label);
      const buttons=method.options.map((option,index)=>{
        const button=document.createElement('button');button.type='button';button.dataset.followup=option.id;
        const number=document.createElement('span');number.className='method-number';number.textContent='0'+(index+1);
        const copy=document.createElement('span'),label=document.createElement('strong'),description=document.createElement('small');
        label.textContent=option.label;description.textContent=option.description;copy.append(label,description);
        const arrow=document.createElement('span');arrow.className='method-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent='→';
        button.append(number,copy,arrow);return button;
      });
      $('followup-options').replaceChildren(...buttons);
    }
    if(state.phase==='result'){
      const loss=state.round===1;text('result-era',round.year+' / '+round.label.toUpperCase());
      text('result-symbol',loss?'×':'✓');text('result-title',loss?'Attack Blocked':'Attack Successful');text('result-explanation',round.explanation);
      text('result-continue',state.round===2?'Space To Restart':'Space To Continue');
      if(changed){$('result-history').replaceChildren();state.results.forEach((result,index)=>{const item=document.createElement('span');item.className=result;item.textContent=rounds[index].year+' / '+rounds[index].label+': '+(result==='win'?'SUCCESS':'BLOCKED');$('result-history').append(item);});}
    }
    if(changed&&!state.notice){const heading=state.phase==='attract'?$('intro-heading'):state.phase==='target'?$('target-heading'):state.phase==='approach'?$('approach-heading'):views.find(v=>v.dataset.view===state.phase)?.querySelector('[data-focus]');heading?.focus({preventScroll:true});}
    previousPhase=state.phase;previousRound=state.round;
  }
  const controller=createExperience({onChange:draw,reducedMotion:motion.matches});
  document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>controller.dispatch(button.dataset.action),{signal:events.signal}));
  document.querySelectorAll('[data-method]').forEach(button=>button.addEventListener('click',()=>controller.dispatch('method',button.dataset.method),{signal:events.signal}));
  $('followup-options').addEventListener('click',event=>{const button=event.target.closest('[data-followup]');if(button)controller.dispatch('followup',button.dataset.followup);},{signal:events.signal});
  $('type-button').addEventListener('click',()=>controller.dispatch('type',4),{signal:events.signal});
  $('resume-session').addEventListener('click',()=>controller.dispatch('resume'),{signal:events.signal});
  $('confirm-restart').addEventListener('click',()=>controller.dispatch('confirmRestart'),{signal:events.signal});
  shell.addEventListener('cancel',event=>{event.preventDefault();controller.dispatch('restart');},{signal:events.signal});
  prompt.addEventListener('cancel',event=>{event.preventDefault();controller.dispatch('resume');},{signal:events.signal});
  window.addEventListener('keydown',event=>{
    if(event.ctrlKey||event.altKey||event.metaKey)return;
    if(controller.activity()){event.preventDefault();event.stopImmediatePropagation();return;}
    if(latest.notice)return;
    if(event.repeat){if(event.key.length===1||['Enter','Backspace'].includes(event.key))event.preventDefault();return;}
    if(event.key===' '&&latest.phase==='attract'){event.preventDefault();controller.dispatch('start');return;}
    if(event.key===' '&&['result','timeline','approach','intro','region-zoom'].includes(latest.phase)){event.preventDefault();controller.dispatch('advance');return;}
    if(event.target.closest('button')&&[' ','Enter'].includes(event.key))return;
    if(latest.phase==='typing'&&event.key.length===1){event.preventDefault();controller.dispatch('type',1);}
  },{signal:events.signal});
  let swallowClick=false;
  window.addEventListener('pointerdown',event=>{swallowClick=false;if(controller.activity()){event.preventDefault();event.stopImmediatePropagation();swallowClick=true;}},{capture:true,signal:events.signal});
  window.addEventListener('click',event=>{if(swallowClick){swallowClick=false;event.preventDefault();event.stopImmediatePropagation();}},{capture:true,signal:events.signal});
  window.addEventListener('pointermove',()=>controller.activity(),{passive:true,signal:events.signal});
  window.addEventListener('wheel',()=>controller.activity(),{passive:true,signal:events.signal});
  motion.addEventListener('change',event=>controller.setReducedMotion(event.matches),{signal:events.signal});
  controller.setHidden(document.hidden);
  const interval=setInterval(()=>{const now=performance.now();controller.tick(now-last);last=now;},100);
  document.addEventListener('visibilitychange',()=>{last=performance.now();controller.setHidden(document.hidden);onSceneChange(controller.snapshot());},{signal:events.signal});
  window.addEventListener('pagehide',()=>{clearInterval(interval);events.abort();hqScene?.dispose();controller.dispose();},{once:true});
  return {chooseTarget(company){if(!companies.some(c=>c.code===company?.code))throw Error('Unknown company');if(!controller.dispatch('target',company))throw Error('Press Space to start, then wait for the globe and rewind before selecting a company.');return {company:company.name,status:'target selected; choose an attack vector to begin the 2020 games',externalConnections:0};},snapshot:controller.snapshot};
}

import {createTyping,typeInput,tickTyping} from './minigames.js';
import {createVectorGame,vectorInput,tickVectorGame} from './vector-games.js';
import {APPROACH_DURATION,INTRO_DURATION,REGION_ZOOM_DURATION} from './approach.js';

export const rounds=[
  {id:'before-ai',year:'2020',label:'Before AI',title:'Back to manual.',explanation:'Manual effort overcame the defenses in this scenario.'},
  {id:'defender-ai',year:'2026',label:'Defender AI',title:'The defense evolved.',explanation:'AI defense detected and stopped the manual attempt.'},
  {id:'both-ai',year:'2026',label:'Attacker + Defender AI',title:'Now you have AI, too.',explanation:'AI assistance completed the steps with far less manual effort.'}
];

export const attackMethods={
  phishing:{label:'Phishing',question:'How do you want to perform the phishing?',options:[
    {id:'phone',label:'Phone Call',description:'A voice-call scenario'},
    {id:'sms',label:'SMS',description:'A text-message scenario'},
    {id:'work-mail',label:'Work Mail',description:'A workplace email scenario'}
  ]},
  blackbox:{label:'Black Box',question:'Which website do you want to research?',options:[
    {id:'main-site',label:'Main company website',description:'The public company site'},
    {id:'internal-site',label:'Internal organization website',description:'An employee-facing site'},
    {id:'support-portal',label:'Customer support portal',description:'A customer-facing help site'}
  ]},
  'zero-day':{label:'Zero-Day',question:'Which product do you want to target?',options:[
    {id:'cpanel',label:'cPanel',description:'Hosting Server'},
    {id:'exchange',label:'Exchange',description:'Mail Server'},
    {id:'fortigate',label:'FortiGate',description:'Firewall'}
  ]}
};

export function createExperience({onChange=()=>{},reducedMotion=false}={}){
  let state,disposed=false,hidden=false;
  const snapshot=()=>structuredClone(state);
  const emit=()=>{if(!disposed)onChange(snapshot());};
  function reset(){state={phase:'attract',round:0,target:null,method:null,followup:null,typingStep:1,game:null,elapsed:0,idleMs:0,notice:null,results:[]};emit();}
  function enter(phase){state.phase=phase;state.elapsed=0;state.game=phase==='typing'?createTyping():phase==='vector-game'?createVectorGame(state.method):null;}
  function finishTimeline(){enter(state.round===0?'target':'method');}
  function timeline(){state.method=null;state.typingStep=1;state.followup=null;enter('timeline');if(reducedMotion)finishTimeline();}
  function activity(){
    const dismissed=state.notice==='idle';state.idleMs=0;
    if(dismissed){state.notice=null;emit();}
    return dismissed;
  }
  function dispatch(action,value){
    if(disposed)return false;
    if(activity())return false;
    if(action==='confirmRestart'&&state.notice==='restart'){reset();return true;}
    if(action==='resume'){state.notice=null;emit();return true;}
    if(state.notice)return false;
    if(action==='restart'&&state.phase!=='attract'){state.notice='restart';emit();return true;}
    if(action==='start'){
      if(state.phase!=='attract')return false;
      if(reducedMotion)timeline();else enter('intro');
    }else if(action==='advance'){
      if(state.phase==='result'){
        if(state.round===2){reset();return true;}
        state.round++;timeline();
      }else return false;
    }else if(action==='target'){
      if(state.phase!=='target'||!value?.code||!value?.name)return false;
      state.target={code:value.code,name:value.name};enter(reducedMotion?'method':'approach');
    }else if(action==='method'){
      if(state.phase!=='method'||typeof value!=='string'||!Object.hasOwn(attackMethods,value))return false;
      state.method=value;state.typingStep=1;state.followup=null;enter('vector-game');
    }else if(action==='followup'){
      if(state.phase!=='followup'||!attackMethods[state.method].options.some(option=>option.id===value))return false;
      state.followup=value;state.typingStep=2;enter('typing');
    }else if(action==='backToMap'){
      if(state.phase!=='method'||state.round!==0)return false;
      state.target=null;state.method=null;enter('target');
    }else if(action==='vector'&&state.phase==='vector-game'){
      if(!vectorInput(state.game,rounds[state.round].id,value?.action,value?.value))return false;
    }else if(action==='type'&&state.phase==='typing')typeInput(state.game,rounds[state.round].id,value===4?4:1);
    else return false;
    emit();return true;
  }
  function tick(ms){
    if(disposed||hidden||!Number.isFinite(ms)||ms<=0)return;
    if(state.phase==='attract')return;
    state.idleMs+=ms;
    if(state.idleMs>=100000){reset();return;}
    if(state.idleMs>=90000){state.notice='idle';emit();return;}
    if(state.notice)return;
    state.elapsed+=ms;
    if(state.phase==='intro'&&state.elapsed>=INTRO_DURATION)enter('region-zoom');
    else if(state.phase==='region-zoom'&&state.elapsed>=REGION_ZOOM_DURATION)timeline();
    else if(state.phase==='timeline'&&state.elapsed>=1800)finishTimeline();
    else if(state.phase==='approach'&&state.elapsed>=APPROACH_DURATION)enter('method');
    else if(state.game){
      if(['success','blocked'].includes(state.game.status)){
        state.game.hold+=ms;
        if(state.game.hold>=1200){
          if(state.typingStep===1)enter('followup');
          else{state.results.push(state.round===1?'loss':'win');enter('result');}
        }
      }else if(state.phase==='vector-game')tickVectorGame(state.game,rounds[state.round].id,ms);
      else tickTyping(state.game,rounds[state.round].id,ms);
    }
    emit();
  }
  reset();
  return {snapshot,dispatch,tick,activity,setHidden(value){hidden=value;},setReducedMotion(value){reducedMotion=value;if(value&&['intro','region-zoom'].includes(state.phase)){timeline();emit();}else if(value&&state.phase==='timeline'){finishTimeline();emit();}else if(value&&state.phase==='approach'){enter('method');emit();}},dispose(){disposed=true;},reset};
}

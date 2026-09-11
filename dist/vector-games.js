// Authored exhibition puzzles. All websites and code below are local fiction.
export const phishingFields=[
  {id:'subject',label:'Subject',hint:'Match the employee’s expected schedule update.',options:[
    {id:'prize',text:'You have won a surprise reward!'},
    {id:'schedule',text:'Team schedule / updated for next week'},
    {id:'urgent',text:'URGENT!!! OPEN THIS NOW!!!'}
  ],answer:'schedule'},
  {id:'opening',label:'Message',hint:'Give the reader a familiar, relevant reason to read on.',options:[
    {id:'team',text:'Hi team, following today’s planning meeting, next week’s work schedule has been updated.'},
    {id:'stranger',text:'Hello stranger. I have an incredible offer that you cannot miss.'},
    {id:'vague',text:'There is something you need to do. I cannot explain why.'}
  ],answer:'team'},
  {id:'request',label:'Call to action',hint:'Keep the request consistent with the schedule update.',options:[
    {id:'share',text:'Forward this offer to everyone you know.'},
    {id:'reply',text:'Reply with your favorite movie to claim your reward.'},
    {id:'review',text:'Please review your updated shift in the staff portal before tomorrow’s team check-in.'}
  ],answer:'review'}
];

export const researchPages=[
  {id:'home',label:'Home',title:'A connected workplace.',description:'Public company website / exhibition replica',cards:[
    {id:'news',title:'Company news',text:'A new office. A growing team. Read the latest updates.'},
    {id:'portal',title:'Staff portal',text:'Your workspace, powered by PortalKit.',clue:'platform',finding:'Staff portal runs on PortalKit.'},
    {id:'careers',title:'Join the team',text:'Explore open positions in design and operations.'}
  ]},
  {id:'help',label:'Help',title:'How can we help?',description:'Public documentation / look for technical details',cards:[
    {id:'hours',title:'Support hours',text:'Our help desk is available on working days.'},
    {id:'guide',title:'Getting started',text:'Choose your department to find the right workspace.'},
    {id:'release',title:'Portal release notes',text:'Current installation: PortalKit 2.4. Preview and staff portal use the same build.',clue:'version',finding:'Live and preview portals share build 2.4.'}
  ]},
  {id:'status',label:'Status',title:'Service status.',description:'Public service directory / follow the evidence',cards:[
    {id:'main',title:'Company website',text:'Operational / public news and company information.'},
    {id:'preview',title:'Preview portal',text:'Online / old test environment. Sign-in gate: not enabled.',clue:'exposure',finding:'The preview portal is online without a sign-in gate.'},
    {id:'mail',title:'Message service',text:'Operational / routine maintenance complete.'}
  ]}
];
export const researchEntrypoints=[
  {id:'news',label:'Company news'},
  {id:'preview',label:'Preview portal'},
  {id:'help',label:'Help desk'}
];
export const exploitBlocks=[
  {id:'capture',code:'const finding = sandbox.capture(result);'},
  {id:'input',code:'const input = sandbox.input("edge-case");'},
  {id:'demonstrate',code:'return sandbox.demonstrate(finding);'},
  {id:'probe',code:'const result = sandbox.probe(input);'}
];
export const exploitOrder=['input','probe','capture','demonstrate'];

export const vectorGames={
  phishing:{label:'MESSAGE LAB',title:'Make the message convincing.',instruction:'An employee is expecting next week’s work schedule. Build a message that fits that context, then test it.',file:'message.draft',submit:'Test message',progress:'Message assembled',success:'MESSAGE ACCEPTED IN THE SCENARIO',blocked:'DEFENDER AI FLAGGED THE MESSAGE',ai:'AI is matching the subject, context, and request…'},
  blackbox:{label:'BLACK BOX / RECON',title:'Find a way in.',instruction:'Investigate this replica website. Inspect Home, Help, and Status, collect three connected clues, then choose the entry point they reveal.',file:'company.example / public site',submit:'Test entry point',progress:'Evidence collected',success:'ENTRY POINT IDENTIFIED',blocked:'DEFENDER AI CLOSED THE EXPOSED PORTAL',ai:'AI is connecting the public clues…'},
  'zero-day':{label:'EXPLOIT LAB',title:'Write the exploit sequence.',instruction:'Add code blocks in the order they need to run: create an input, probe it, capture the result, then demonstrate the finding.',file:'exploit.sim',submit:'Run simulation',progress:'Code assembled',success:'SIMULATED EXPLOIT COMPLETE',blocked:'DEFENDER AI CONTAINED THE SIMULATED EXPLOIT',ai:'AI is assembling and checking the code…'}
};

export function createVectorGame(method){
  if(!Object.hasOwn(vectorGames,method))throw new Error('Unknown vector game');
  return {kind:method,status:'ready',progress:0,elapsed:0,hold:0,message:'',submitted:false,attempts:0,
    field:0,draft:{subject:null,opening:null,request:null},page:'home',clues:[],entrypoint:null,blocks:[]};
}
function updateProgress(game){
  game.progress=game.kind==='phishing'?Object.values(game.draft).filter(Boolean).length/3:
    game.kind==='blackbox'?(game.clues.length+Number(!!game.entrypoint))/4:game.blocks.length/4;
}
export function canSubmitVector(game){
  return ['ready','running'].includes(game.status)&&!game.submitted&&game.progress===1;
}
function submit(game,round){
  game.attempts++;
  if(game.kind==='phishing'){
    const mismatch=phishingFields.find(field=>game.draft[field.id]!==field.answer);
    if(mismatch){game.field=phishingFields.indexOf(mismatch);game.message=mismatch.label+' needs another look. '+mismatch.hint;return;}
  }else if(game.kind==='blackbox'&&game.entrypoint!=='preview'){
    game.message='Follow all three clues: which portal shares the staff software but has no sign-in gate?';return;
  }else if(game.kind==='zero-day'){
    const incorrect=game.blocks.findIndex((block,index)=>block!==exploitOrder[index]);
    if(incorrect!==-1){game.message='Line '+(incorrect+1)+': '+[
      'Create the input before using it.',
      'Probe the input to produce a result.',
      'Capture the result before demonstrating it.',
      'Demonstrate the captured finding last.'
    ][incorrect]+' Undo blocks and try again.';return;}
  }
  game.submitted=true;
  if(round==='before-ai'){game.status='success';game.message=vectorGames[game.kind].success;}
  else game.message='Sequence ready. Defender AI is analyzing the attempt…';
}
export function vectorInput(game,round,action,value){
  if(!['ready','running'].includes(game.status)||game.submitted)return false;
  if(round==='both-ai'){
    if(action!=='assist'||game.status!=='ready')return false;
    game.status='running';game.message=vectorGames[game.kind].ai;return true;
  }
  if(action==='submit'){
    if(!canSubmitVector(game))return false;
    game.status='running';submit(game,round);return true;
  }
  if(game.kind==='phishing'&&action==='field'){
    if(!Number.isInteger(value)||value<0||value>=phishingFields.length)return false;
    game.field=value;return true;
  }else if(game.kind==='phishing'&&action==='choice'){
    const field=phishingFields[game.field];
    if(!field.options.some(option=>option.id===value))return false;
    game.draft[field.id]=value;
    const next=phishingFields.findIndex(item=>!game.draft[item.id]);
    if(next!==-1)game.field=next;
    game.message=next===-1?'Draft ready. Review the preview, then test your message.':'';
  }else if(game.kind==='blackbox'&&action==='page'){
    if(!researchPages.some(page=>page.id===value))return false;
    game.page=value;
  }else if(game.kind==='blackbox'&&action==='inspect'){
    const card=researchPages.find(page=>page.id===game.page).cards.find(item=>item.id===value);
    if(!card)return false;
    if(card.clue){if(!game.clues.includes(card.clue))game.clues.push(card.clue);game.message=card.finding;}
    else game.message='Public information, but no useful connection yet. Inspect another detail.';
  }else if(game.kind==='blackbox'&&action==='entrypoint'){
    if(!researchEntrypoints.some(entry=>entry.id===value))return false;
    game.entrypoint=value;game.message='Entry point selected. Collect all three clues to test your theory.';
  }else if(game.kind==='zero-day'&&action==='block'){
    if(!exploitBlocks.some(block=>block.id===value)||game.blocks.includes(value))return false;
    game.blocks.push(value);game.message=game.blocks.length===4?'Code ready. Run the simulation to test the sequence.':'';
  }else if(game.kind==='zero-day'&&action==='undo'){
    if(!game.blocks.length)return false;
    game.blocks.pop();game.message='Last line removed. Choose the next block.';
  }else return false;
  game.status='running';updateProgress(game);return true;
}
export function tickVectorGame(game,round,ms){
  if(game.status!=='running')return;
  const previous=game.elapsed;game.elapsed+=ms;
  if(round==='defender-ai'){
    // The clock begins on interaction; completing a puzzle never bypasses AI defense.
    if(previous<3500&&game.elapsed>=3500)game.message='Defender AI noticed the activity. It is reviewing your approach…';
    if(previous<7500&&game.elapsed>=7500)game.message='The defender has identified the attempt. Countermeasures incoming…';
    if(game.elapsed>=10000){game.status='blocked';game.message=vectorGames[game.kind].blocked;}
  }else if(round==='both-ai'){
    const steps=Math.min(4,Math.floor(game.elapsed/750));
    if(game.kind==='phishing'){
      phishingFields.forEach((field,index)=>{if(index<steps)game.draft[field.id]=field.answer;});
      game.field=Math.min(2,steps);
    }else if(game.kind==='blackbox'){
      game.clues=['platform','version','exposure'].slice(0,steps);
      game.page=['home','help','status'][Math.min(2,steps)];
      if(steps===4)game.entrypoint='preview';
    }else game.blocks=exploitOrder.slice(0,steps);
    updateProgress(game);
    if(game.elapsed>=3000){game.submitted=true;game.status='success';game.message=vectorGames[game.kind].success+' / AI ASSISTED';}
  }
}

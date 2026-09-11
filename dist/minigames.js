// Exhibition puzzles only: no commands, requests, or real authentication.
export function createTyping(){return {kind:'typing',status:'ready',progress:0,keys:0,elapsed:0,message:'',hold:0};}
export function typeInput(game,round,amount=1){
  if(!['ready','running'].includes(game.status))return;
  game.status='running';
  if(round==='both-ai')return;
  game.keys+=amount;
  // Resistance slows every input continuously instead of freezing at a cap.
  game.progress=round==='defender-ai'?game.keys/(game.keys+144):Math.min(1,game.keys/48);
  if(round==='before-ai'&&game.progress===1){game.status='success';game.message='MANUAL SEQUENCE COMPLETE';}
}
export function tickTyping(game,round,ms){
  if(game.status!=='running')return;
  game.elapsed+=ms;
  if(round==='defender-ai'&&game.elapsed>=3500)game.message='AI defense is slowing the sequence…';
  if(round==='defender-ai'&&game.elapsed>=7500)game.message='The defender has detected the attempt. Connection closing…';
  if(round==='defender-ai'&&game.elapsed>=10000){game.status='blocked';game.message='BLOCKED BY DEFENDER AI';}
  if(round==='both-ai'){
    game.progress=Math.min(1,game.elapsed/3000);
    if(game.progress===1){game.status='success';game.message='AI-ASSISTED SEQUENCE COMPLETE';}
  }
}

export const terminalText=[
  '> SPECTER / EXHIBITION SANDBOX',
  '> loading fictional scenario...',
  'const scenario = { environment: "simulation", network: "offline" };',
  'scene.attach(selectedTarget);',
  'visuals.traceRoute({ origin: "Israel", destination: selectedTarget });',
  'const sequence = ["observe", "assemble", "verify", "present"];',
  'for (const stage of sequence) {',
  '  display.write(stage);',
  '  timeline.mark(stage, "in progress");',
  '  renderer.drawPackets({ color: theme.accent });',
  '}',
  '> assembling the demonstration sequence...',
  'const segments = Array.from({ length: 48 }, (_, index) => index);',
  'segments.forEach(segment => {',
  '  scene.illuminate(segment);',
  '  progress.advance();',
  '});',
  '> checking the simulated sequence...',
  'scene.review({ approach: selectedApproach, choice: selectedChoice });',
  'display.queue("scenario response");',
  '> sequence assembled.',
  '> awaiting scenario response...'
].join('\n');

import {phishingFields,researchPages,researchEntrypoints,exploitBlocks,vectorGames,canSubmitVector} from './vector-games.js';

export function createVectorUI({dispatch,signal}){
  const $=id=>document.getElementById(id),root=$('vector-workspace');
  const text=(id,value)=>{if($(id).textContent!==value)$(id).textContent=value;};
  const element=(tag,className,copy)=>{const node=document.createElement(tag);if(className)node.className=className;if(copy)node.textContent=copy;return node;};
  function button(action,value,copy,className='vector-choice'){
    const node=element('button',className,copy);node.type='button';node.dataset.vectorAction=action;
    if(value!==undefined)node.dataset.value=value;return node;
  }
  const fields=phishingFields.map((field,index)=>{
    const tab=button('field',index,'0'+(index+1)+' / '+field.label,'workbench-tab');
    $('phishing-field-tabs').append(tab);
    const group=element('div','composer-options');group.setAttribute('role','group');group.setAttribute('aria-label',field.label+' choices');
    const options=field.options.map(option=>{const node=button('choice',option.id,option.text);group.append(node);return node;});
    $('phishing-options').append(group);return {tab,group,options};
  });
  const pages=researchPages.map(page=>{
    const tab=button('page',page.id,page.label,'workbench-tab');$('research-nav').append(tab);
    const section=element('section','replica-page'),title=element('h2','',page.title),description=element('p','replica-description',page.description);
    section.append(title,description);
    const cards=page.cards.map(card=>{
      const node=button('inspect',card.id),heading=element('strong','',card.title),copy=element('span','',card.text),hint=element('small','','INSPECT DETAIL ↗');
      node.append(heading,copy,hint);section.append(node);return node;
    });
    $('research-pages').append(section);return {tab,section,cards};
  });
  const clues=researchPages.flatMap(page=>page.cards).filter(card=>card.clue).map(card=>{
    const node=element('li'),mark=element('span','evidence-mark','○'),copy=element('span','','Undiscovered clue');
    mark.setAttribute('aria-hidden','true');node.append(mark,copy);$('research-evidence').append(node);return {node,mark,copy,card};
  });
  const entrypoints=researchEntrypoints.map(entry=>{const node=button('entrypoint',entry.id,entry.label);$('research-entrypoints').append(node);return node;});
  const blocks=exploitBlocks.map(block=>{const node=button('block',block.id);node.append(element('span','block-plus','+'),element('code','',block.code));$('exploit-blocks').append(node);return node;});
  const codeLines=Array.from({length:4},(_,index)=>{
    const node=element('li'),copy=element('code','','// Choose block '+(index+1));node.append(copy);$('exploit-lines').append(node);return {node,copy};
  });
  root.addEventListener('click',event=>{
    const node=event.target.closest('[data-vector-action]');if(!node||!root.contains(node)||node.disabled)return;
    dispatch(node.dataset.vectorAction,node.dataset.vectorAction==='field'?Number(node.dataset.value):node.dataset.value);
  },{signal});
  function selected(node,value){node.setAttribute('aria-pressed',String(value));}
  let previousField=-1;
  return {draw(state,changed){
    const game=state.game,spec=vectorGames[game.kind],ai=state.round===2;
    const completed=['success','blocked'].includes(game.status),locked=ai||completed||game.submitted;
    text('vector-step','01 / '+spec.label);text('vector-title',spec.title);text('vector-instruction',spec.instruction);
    text('vector-assistance',ai?'Use attacker AI once. Watch it complete the task for you.':state.round===1?'The defender now has AI. It will react to your activity.':'Manual mode / take your time. You can revise and retry.');
    text('vector-file',spec.file);text('vector-state',game.status==='blocked'?'INTERCEPTED':game.status==='success'?'COMPLETE':ai&&game.status==='running'?'AI ASSISTING':game.submitted?'DEFENSE ANALYSIS':'WORKSPACE');
    root.dataset.status=game.status;root.dataset.kind=game.kind;
    root.querySelectorAll('[data-vector-panel]').forEach(panel=>{panel.hidden=panel.dataset.vectorPanel!==game.kind;});
    root.querySelectorAll('[data-vector-action]').forEach(node=>{node.disabled=locked;});
    const submit=$('vector-submit');submit.hidden=ai;submit.disabled=!canSubmitVector(game);submit.textContent=spec.submit;
    $('vector-assist').hidden=!ai;$('vector-assist').disabled=game.status!=='ready';
    text('vector-feedback',game.message);text('vector-progress-label',spec.progress);
    const progress=Math.round(game.progress*100);$('vector-progress').value=progress;text('vector-percent',progress+'%');
    $('vector-intercept').hidden=game.status!=='blocked';
    if(game.kind==='phishing'){
      const focusWasInChoices=$('phishing-options').contains(document.activeElement);
      fields.forEach(({tab,group,options},index)=>{
        const field=phishingFields[index];selected(tab,index===game.field);tab.classList.toggle('is-filled',!!game.draft[field.id]);
        group.hidden=index!==game.field;
        options.forEach((node,i)=>selected(node,game.draft[field.id]===field.options[i].id));
        const choice=field.options.find(option=>option.id===game.draft[field.id]);
        text('mail-'+field.id,choice?.text||['Choose a subject…','Your message will appear here.','Choose a call to action…'][index]);
        $('mail-'+field.id).classList.toggle('is-placeholder',!choice);
      });
      text('composer-heading',phishingFields[game.field].label);text('composer-hint',phishingFields[game.field].hint);
      // Choices are persistent DOM nodes; move focus only when the next field opens.
      if(!changed&&!ai&&previousField!==game.field&&focusWasInChoices)$('composer-heading').focus({preventScroll:true});
      previousField=game.field;
    }else if(game.kind==='blackbox'){
      pages.forEach(({tab,section,cards},index)=>{
        const page=researchPages[index];selected(tab,page.id===game.page);section.hidden=page.id!==game.page;
        cards.forEach((node,i)=>{const found=game.clues.includes(page.cards[i].clue);node.classList.toggle('is-found',found);node.querySelector('small').textContent=found?'✓ EVIDENCE SAVED':'INSPECT DETAIL ↗';});
      });
      clues.forEach(({node,mark,copy,card},index)=>{const found=game.clues.includes(card.clue);node.classList.toggle('is-found',found);mark.textContent=found?'✓':'○';copy.textContent=found?card.finding:['Identify the staff portal software.','Find the version shared by its environments.','Locate an exposed copy.'][index];});
      text('research-count',game.clues.length+' / 3 CLUES');entrypoints.forEach(node=>selected(node,node.dataset.value===game.entrypoint));
    }else{
      codeLines.forEach(({node,copy},index)=>{const block=exploitBlocks.find(item=>item.id===game.blocks[index]);copy.textContent=block?.code||'// Choose block '+(index+1);node.classList.toggle('is-placeholder',!block);});
      blocks.forEach(node=>{const used=game.blocks.includes(node.dataset.value);node.disabled=locked||used;node.classList.toggle('is-used',used);node.querySelector('.block-plus').textContent=used?'✓':'+';});
      $('exploit-undo').disabled=locked||!game.blocks.length;
    }
  }};
}

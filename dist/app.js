const companies = [
  {name:'Rafael',code:'RF',label:'Advanced Defense Systems',point:[334,155]},
  {name:'Elbit Systems',code:'ES',label:'Defense technology',point:[348,178]},
  {name:'Israel Aerospace Industries',code:'IAI',label:'Aerospace & defense',point:[301,263]},
  {name:'Israel Weapon Industries',code:'IWI',label:'Defense manufacturing',point:[319,285]},
  {name:'Israel Shipyards',code:'IS',label:'Naval systems',point:[323,171]},
  {name:'Aeronautics',code:'AN',label:'Uncrewed aerial systems',point:[298,320]},
];
const $ = (id) => document.getElementById(id);
const dialog = $('attack-dialog');
let active = null, launchedAt = 0, previousFocus = null;
const utc = () => new Date().toISOString().slice(11,19);
function addLine(container,text,max=5){const line=document.createElement('div');const time=document.createElement('time');time.textContent=utc()+' ';line.append(time,document.createTextNode(text));container.append(line);while(container.children.length>max)container.firstElementChild.remove();}
function startSimulation(company){
  if(!company)throw new Error('Unknown simulation entity');
  if(!dialog.open)previousFocus=document.activeElement;
  active=company;launchedAt=Date.now();
  $('active-company').textContent=company.name.toUpperCase()+' / VISUAL SIMULATION';
  $('elapsed').textContent='00:00';$('packets').textContent='0';$('phase').textContent='INITIALIZING';$('attack-log').replaceChildren();
  addLine($('attack-log'),'[SIM] Visual sequence initialized: '+company.name,3);
  addLine($('attack-log'),'[SIM] Synthetic channels online. External connections: 0.',3);
  if(!dialog.open)dialog.showModal();
  addLine($('feed'),'Sequence started / '+company.code);
  return {company:company.name,status:'visual simulation running',externalConnections:0};
}
function stopSimulation(){if(dialog.open)dialog.close();}
dialog.addEventListener('close',()=>{active=null;previousFocus?.focus();});
$('close').addEventListener('click',stopSimulation);$('reset').addEventListener('click',stopSimulation);
for(const company of companies){
  const button=document.createElement('button');button.className='target';button.setAttribute('aria-haspopup','dialog');
  const code=document.createElement('span');code.className='target-code';code.textContent=company.code;
  const copy=document.createElement('span');const name=document.createElement('strong');name.textContent=company.name;const label=document.createElement('small');label.textContent=company.label;copy.append(name,label);
  const arrow=document.createElement('span');arrow.className='target-arrow';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');button.append(code,copy,arrow);button.addEventListener('click',()=>startSimulation(company));$('companies').append(button);
  for(const [radius,cls] of [[11,'node-halo'],[3.5,'node-core']]){const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.setAttribute('cx',company.point[0]);circle.setAttribute('cy',company.point[1]);circle.setAttribute('r',radius);circle.setAttribute('class',cls);$('map-nodes').append(circle);}
}
for(let i=0;i<32;i++){const bar=document.createElement('span');bar.style.height=(18+Math.sin(i*1.3)**2*82)+'%';bar.style.animationDelay=(-i*.17)+'s';$('bars').append(bar);}
const idleMessages=['Visual engine initialized','Regional overlay loaded','Synthetic channels synchronized','Local render buffer ready','Awaiting entity selection'];
idleMessages.forEach(text=>addLine($('feed'),text));
const sequenceMessages=['Rendering synthetic packet stream','Compositing signal overlays','Cycling visual channels','Drawing simulated trace paths','Updating local animation buffer'];
let tick=0;
function update(){
  $('clock').textContent=utc()+' UTC';tick++;
  if(tick%4===0)addLine($('feed'),idleMessages[(tick/4)%idleMessages.length]);
  if(!active)return;
  const elapsed=Math.floor((Date.now()-launchedAt)/1000);
  $('elapsed').textContent=String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(elapsed%60).padStart(2,'0');
  $('packets').textContent=(elapsed*1847).toLocaleString('en-US');
  $('phase').textContent=elapsed<3?'INITIALIZING':elapsed<8?'SYNCHRONIZING':'RENDERING';
  if(elapsed%2===0)addLine($('attack-log'),'[SIM] '+sequenceMessages[Math.floor(elapsed/2)%sequenceMessages.length],3);
}
update();setInterval(update,1000);
if(document.modelContext?.registerTool){
  const lifecycle=new AbortController();
  try{Promise.resolve(document.modelContext.registerTool({name:'start_visual_simulation',description:'Open the fictional cyber animation for a selected company. No network actions occur.',inputSchema:{type:'object',properties:{company:{type:'string',enum:companies.map(c=>c.name)}},required:['company'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input.company!=='string')throw new Error('A company name is required');const company=companies.find(c=>c.name===input.company);return startSimulation(company);}},{signal:lifecycle.signal})).catch(()=>{});}catch{}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}

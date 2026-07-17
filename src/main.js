import { defaultLensId, lenses, lensList } from './config.js';

const canvas=document.querySelector('#world'),ctx=canvas.getContext('2d');
const $=s=>document.querySelector(s);
const worker=new Worker('./src/worker.js',{type:'module'});
const playBtn=$('#playBtn'),stepBtn=$('#stepBtn'),speedBtn=$('#speedBtn'),resetBtn=$('#resetBtn'),stepLabel=$('#stepLabel'),stats=$('#stats'),sheet=$('#sheet'),delta=$('#deltaP1'),deltaOut=$('#deltaOut'),timeline=$('#timeline'),lensSelect=$('#lensSelect'),interventionLabel=$('#interventionLabel');
let activeLens=lenses[defaultLensId],config=structuredClone(activeLens.config);
let W=0,H=0,dpr=1,playing=false,speed=1,selected=-1,pan={x:0,y:0},zoom=1,pointers=new Map(),lastPinch=0,waiting=false;
let frame={step:0,values:new Float32Array(),positions:new Float32Array(),groups:new Uint8Array(),edges:new Float32Array(),analysis:{means:[],variances:[],density:0,edgeCount:0}};
const history=[];

for(const lens of lensList){ const option=document.createElement('option'); option.value=lens.id; option.textContent=lens.title; lensSelect.append(option); }
lensSelect.value=activeLens.id;

function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
function worldPosition(i){
  const visual=activeLens.visual?.position;
  if(visual?.mode==='parameters'){
    const D=config.dimensions,base=i*D;
    const x=((frame.values[base+visual.x]??0.5)-0.5)*(visual.spreadX||500);
    const y=((frame.values[base+visual.y]??0.5)-0.5)*(visual.spreadY||400);
    const jitter=visual.jitter||0;
    return[x+frame.positions[i*2]*jitter,y+frame.positions[i*2+1]*jitter];
  }
  return[frame.positions[i*2]||0,frame.positions[i*2+1]||0];
}
function screen(i){const p=worldPosition(i);return[W/2+pan.x+p[0]*zoom,H/2+pan.y+p[1]*zoom]}
function percent(v){return`${(v*100).toFixed(1)}%`}
function updateStats(){
  const a=frame.analysis,labels=activeLens.parameters;
  stepLabel.textContent=`STEP ${frame.step}`;
  let html=`<strong>${activeLens.title}</strong><br><span>${activeLens.description}</span><br><br>SEED ${config.seed}<br>${activeLens.nodeLabel.toUpperCase()}S ${a.nodes??config.nodeCount}<br>${activeLens.edgeLabel.toUpperCase()}S ${a.edgeCount??0}<br>DENSITY ${percent(a.density??0)}<br>`;
  html+=(a.means||[]).map((v,i)=>`${labels[i]?.label||`P${i+1}`} μ ${v.toFixed(3)} σ² ${(a.variances[i]??0).toFixed(3)}`).join('<br>');
  if(a.lensMetrics) html+=`<br><br>СТОРОННИКИ ${percent(a.lensMetrics.supporters)}<br>НЕЙТРАЛЬНЫЕ ${percent(a.lensMetrics.neutral)}<br>ПРОТИВНИКИ ${percent(a.lensMetrics.opponents)}<br>ПОЛЯРИЗАЦИЯ ${a.lensMetrics.polarization.toFixed(3)}`;
  stats.innerHTML=html;
  timeline.textContent=history.slice(-6).map(x=>`#${x.step} · ρ ${percent(x.density)}${x.polarization!=null?` · pol ${x.polarization.toFixed(3)}`:''}`).join('   ');
}
function applyLens(lensId){
  activeLens=lenses[lensId]; config=structuredClone(activeLens.config);
  playing=false; waiting=false; selected=-1; pan={x:0,y:0}; zoom=1; history.length=0;
  playBtn.textContent='▶';
  const dim=activeLens.intervention?.defaultDimension??0;
  interventionLabel.textContent=`${activeLens.parameters[dim]?.label||`P${dim+1}`} delta`;
  worker.postMessage({type:'reset',config});
}
worker.onmessage=e=>{frame=e.data;waiting=false;if(['analysis','intervention','reset'].includes(frame.type))history.push({step:frame.step,density:frame.analysis.density,polarization:frame.analysis.lensMetrics?.polarization});updateStats()};
worker.postMessage({type:'init',config});

function render(){
  ctx.fillStyle='#07090d';ctx.fillRect(0,0,W,H);ctx.lineCap='round';
  for(let e=0;e<frame.edges.length;e+=3){const a=frame.edges[e],b=frame.edges[e+1],s=frame.edges[e+2],A=screen(a),B=screen(b);ctx.strokeStyle=`rgba(225,233,247,${.015+s*.22})`;ctx.lineWidth=.3+s*1.05;ctx.beginPath();ctx.moveTo(...A);ctx.lineTo(...B);ctx.stroke()}
  const D=config.dimensions,N=config.nodeCount,visual=activeLens.visual||{};
  for(let i=0;i<N;i++){
    const [x,y]=screen(i),base=i*D,sizeValue=frame.values[base+(visual.size??0)]??0.5,opacityValue=frame.values[base+(visual.opacity??1)]??0.5,glowValue=frame.values[base+(visual.glow??2)]??0.5;
    const glow=visual.glowMode==='extremity'?Math.abs(glowValue-0.5)*2:glowValue;
    const r=(1.2+sizeValue*4.3)*(i===selected?1.85:1);
    if(i===selected||glow>.75){ctx.shadowBlur=i===selected?24:10*glow;ctx.shadowColor='white'}
    ctx.fillStyle=`rgba(239,244,255,${.1+opacityValue*.88})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  }
  requestAnimationFrame(render);
}
let acc=0,last=performance.now();function loop(t){const dt=t-last;last=t;if(playing&&!waiting){acc+=dt;const interval=1000/(30*speed);if(acc>=interval){waiting=true;worker.postMessage({type:'step',count:Math.max(1,Math.floor(speed/2))});acc=0}}requestAnimationFrame(loop)}
function pick(x,y){let best=-1,bd=20;for(let i=0;i<config.nodeCount;i++){const p=screen(i),d=Math.hypot(p[0]-x,p[1]-y);if(d<bd){bd=d;best=i}}selected=best}
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,px:e.clientX,py:e.clientY,t:performance.now()})});
canvas.addEventListener('pointermove',e=>{const p=pointers.get(e.pointerId);if(!p)return;p.px=p.x;p.py=p.y;p.x=e.clientX;p.y=e.clientY;if(pointers.size===1){pan.x+=p.x-p.px;pan.y+=p.y-p.py}else if(pointers.size===2){const q=[...pointers.values()],d=Math.hypot(q[0].x-q[1].x,q[0].y-q[1].y);if(lastPinch)zoom=Math.max(.25,Math.min(5,zoom*d/lastPinch));lastPinch=d}});
canvas.addEventListener('pointerup',e=>{const p=pointers.get(e.pointerId);if(p&&Math.hypot(p.x-p.sx,p.y-p.sy)<8&&performance.now()-p.t<350)pick(e.clientX,e.clientY);pointers.delete(e.pointerId);if(pointers.size<2)lastPinch=0});
playBtn.onclick=()=>{playing=!playing;playBtn.textContent=playing?'❚❚':'▶'};
stepBtn.onclick=()=>worker.postMessage({type:'step',count:1});
speedBtn.onclick=()=>{speed=speed===1?10:speed===10?100:1;speedBtn.textContent=`×${speed}`};
resetBtn.onclick=()=>applyLens(activeLens.id);
lensSelect.onchange=()=>applyLens(lensSelect.value);
$('#interveneBtn').onclick=()=>sheet.classList.remove('hidden');$('#closeSheet').onclick=()=>sheet.classList.add('hidden');delta.oninput=()=>deltaOut.value=`${delta.value>=0?'+':''}${Number(delta.value).toFixed(2)}`;
$('#applyIntervention').onclick=()=>{if(selected>=0)worker.postMessage({type:'intervene',target:'selected',nodeId:selected,dimension:activeLens.intervention?.defaultDimension??0,mode:'add',value:Number(delta.value)});sheet.classList.add('hidden')};
addEventListener('resize',resize);resize();render();loop(performance.now());

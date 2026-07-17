import { defaultConfig } from './config.js';

const canvas=document.querySelector('#world'),ctx=canvas.getContext('2d');
const $=s=>document.querySelector(s);
const worker=new Worker('./src/worker.js',{type:'module'});
const playBtn=$('#playBtn'),stepBtn=$('#stepBtn'),speedBtn=$('#speedBtn'),resetBtn=$('#resetBtn'),stepLabel=$('#stepLabel'),stats=$('#stats'),sheet=$('#sheet'),delta=$('#deltaP1'),deltaOut=$('#deltaOut'),timeline=$('#timeline');
let W=0,H=0,dpr=1,playing=false,speed=1,selected=-1,pan={x:0,y:0},zoom=1,pointers=new Map(),lastPinch=0,waiting=false;
let frame={step:0,values:new Float32Array(),positions:new Float32Array(),groups:new Uint8Array(),edges:new Float32Array(),analysis:{means:[],variances:[],density:0,edgeCount:0}};
const history=[];

function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
function screen(i){return[W/2+pan.x+frame.positions[i*2]*zoom,H/2+pan.y+frame.positions[i*2+1]*zoom]}
function updateStats(){const a=frame.analysis;stepLabel.textContent=`STEP ${frame.step}`;stats.innerHTML=`SEED ${frame.config?.seed??defaultConfig.seed}<br>NODES ${a.nodes??defaultConfig.nodeCount}<br>EDGES ${a.edgeCount??0}<br>DENSITY ${((a.density??0)*100).toFixed(2)}%<br>${(a.means||[]).map((v,i)=>`P${i+1} μ ${v.toFixed(3)} σ² ${(a.variances[i]??0).toFixed(3)}`).join('<br>')}`;timeline.textContent=history.slice(-5).map(x=>`#${x.step} · ρ ${(x.density*100).toFixed(2)}%`).join('   ')}
worker.onmessage=e=>{frame=e.data;waiting=false;if(frame.type==='analysis'||frame.type==='intervention'||frame.type==='reset')history.push({step:frame.step,density:frame.analysis.density});updateStats()};
worker.postMessage({type:'init',config:defaultConfig});
function render(){ctx.fillStyle='#07090d';ctx.fillRect(0,0,W,H);ctx.lineCap='round';for(let e=0;e<frame.edges.length;e+=3){const a=frame.edges[e],b=frame.edges[e+1],s=frame.edges[e+2],A=screen(a),B=screen(b);ctx.strokeStyle=`rgba(225,233,247,${.018+s*.20})`;ctx.lineWidth=.3+s*.9;ctx.beginPath();ctx.moveTo(...A);ctx.lineTo(...B);ctx.stroke()}const D=frame.config?.dimensions||defaultConfig.dimensions,N=frame.config?.nodeCount||defaultConfig.nodeCount;for(let i=0;i<N;i++){const [x,y]=screen(i),base=i*D,strength=((frame.values[base]||0)+(frame.values[base+1]||0)+(frame.values[base+2]||0))/3,r=(1.3+strength*3.5)*(i===selected?1.9:1);if(i===selected){ctx.shadowBlur=24;ctx.shadowColor='white'}ctx.fillStyle=`rgba(239,244,255,${.14+strength*.84})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}requestAnimationFrame(render)}
let acc=0,last=performance.now();function loop(t){const dt=t-last;last=t;if(playing&&!waiting){acc+=dt;const interval=1000/(30*speed);if(acc>=interval){waiting=true;worker.postMessage({type:'step',count:Math.max(1,Math.floor(speed/2))});acc=0}}requestAnimationFrame(loop)}
function pick(x,y){let best=-1,bd=20,N=frame.config?.nodeCount||0;for(let i=0;i<N;i++){const p=screen(i),d=Math.hypot(p[0]-x,p[1]-y);if(d<bd){bd=d;best=i}}selected=best}
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,px:e.clientX,py:e.clientY,t:performance.now()})});
canvas.addEventListener('pointermove',e=>{const p=pointers.get(e.pointerId);if(!p)return;p.px=p.x;p.py=p.y;p.x=e.clientX;p.y=e.clientY;if(pointers.size===1){pan.x+=p.x-p.px;pan.y+=p.y-p.py}else if(pointers.size===2){const q=[...pointers.values()],d=Math.hypot(q[0].x-q[1].x,q[0].y-q[1].y);if(lastPinch)zoom=Math.max(.25,Math.min(5,zoom*d/lastPinch));lastPinch=d}});
canvas.addEventListener('pointerup',e=>{const p=pointers.get(e.pointerId);if(p&&Math.hypot(p.x-p.sx,p.y-p.sy)<8&&performance.now()-p.t<350)pick(e.clientX,e.clientY);pointers.delete(e.pointerId);if(pointers.size<2)lastPinch=0});
playBtn.onclick=()=>{playing=!playing;playBtn.textContent=playing?'❚❚':'▶'};
stepBtn.onclick=()=>worker.postMessage({type:'step',count:1});
speedBtn.onclick=()=>{speed=speed===1?10:speed===10?100:1;speedBtn.textContent=`×${speed}`};
resetBtn.onclick=()=>{playing=false;playBtn.textContent='▶';selected=-1;pan={x:0,y:0};zoom=1;history.length=0;worker.postMessage({type:'reset',config:defaultConfig})};
$('#interveneBtn').onclick=()=>sheet.classList.remove('hidden');$('#closeSheet').onclick=()=>sheet.classList.add('hidden');delta.oninput=()=>deltaOut.value=`${delta.value>=0?'+':''}${Number(delta.value).toFixed(2)}`;
$('#applyIntervention').onclick=()=>{if(selected>=0)worker.postMessage({type:'intervene',target:'selected',nodeId:selected,dimension:0,mode:'add',value:Number(delta.value)});sheet.classList.add('hidden')};
addEventListener('resize',resize);resize();render();loop(performance.now());

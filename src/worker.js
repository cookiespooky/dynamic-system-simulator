import { defaultConfig } from './config.js';

let config = structuredClone(defaultConfig);
let step = 0;
let values, nextValues, positions, groups;
let edges = [];
let rngState = config.seed >>> 0;

const clamp = v => Math.max(0, Math.min(1, v));
function random(){ rngState = (rngState * 1664525 + 1013904223) >>> 0; return rngState / 4294967296; }
function between(a,b){ return a + random() * (b-a); }
function value(i,d){ return values[i*config.dimensions+d]; }
function setNext(i,d,v){ nextValues[i*config.dimensions+d]=clamp(v); }

function parameterDistance(i,j){
  let s=0;
  for(let d=0;d<config.dimensions;d++){ const q=value(i,d)-value(j,d); s+=q*q; }
  return Math.sqrt(s/config.dimensions);
}

function rebuildEdges(){
  edges=[];
  const idea=config.model?.type==='ideaSpread';
  for(let i=0;i<config.nodeCount;i++) for(let j=i+1;j<config.nodeCount;j++){
    if(idea){
      const convictionGap=Math.abs(value(i,3)-value(j,3));
      const affinity=1-convictionGap;
      const groupMultiplier=groups[i]===groups[j]?config.rules.sameGroupMultiplier:config.rules.crossGroupMultiplier;
      const probability=config.rules.baseLinkChance*groupMultiplier*(0.35+affinity);
      if(random()<probability) edges.push(i,j,clamp(0.2+affinity*0.8));
    } else {
      const d=parameterDistance(i,j);
      if(d<config.rules.linkDistance&&random()<config.rules.linkChance) edges.push(i,j,1-d/config.rules.linkDistance);
    }
  }
}

function tickConvergence(){
  const sums=new Float32Array(values.length), counts=new Uint16Array(config.nodeCount);
  for(let e=0;e<edges.length;e+=3){
    const a=edges[e],b=edges[e+1]; counts[a]++; counts[b]++;
    for(let d=0;d<config.dimensions;d++){
      sums[a*config.dimensions+d]+=value(b,d);
      sums[b*config.dimensions+d]+=value(a,d);
    }
  }
  for(let i=0;i<config.nodeCount;i++) for(let d=0;d<config.dimensions;d++){
    const v=value(i,d), mean=counts[i]?sums[i*config.dimensions+d]/counts[i]:v;
    setNext(i,d,v+(mean-v)*config.rules.convergence+between(-config.rules.noise,config.rules.noise));
  }
}

function tickIdeaSpread(){
  const influenceDelta=new Float32Array(config.nodeCount);
  const success=new Float32Array(config.nodeCount);
  const contacts=new Uint16Array(config.nodeCount);

  nextValues.set(values);
  for(let e=0;e<edges.length;e+=3){
    const a=edges[e],b=edges[e+1],weight=edges[e+2];
    contacts[a]++; contacts[b]++;
    const gap=value(b,3)-value(a,3), abs=Math.abs(gap);
    const pair=[[a,b,gap],[b,a,-gap]];
    for(const [target,source,diff] of pair){
      const susceptibility=value(target,0), trust=value(target,2), resistance=value(target,4);
      const activity=value(source,1), influence=value(source,5);
      let direction=0;
      if(abs<config.rules.attractionThreshold) direction=diff;
      else if(abs>config.rules.repulsionThreshold) direction=-Math.sign(diff)*config.rules.repulsionRate*(1-abs);
      else direction=diff*config.rules.mediumInfluence;
      const effect=direction*activity*influence*trust*susceptibility*weight*config.rules.influenceRate*(1-resistance);
      influenceDelta[target]+=effect;
      success[source]+=Math.abs(effect);
    }
    const similarity=1-abs;
    edges[e+2]=clamp(weight+(similarity-0.5)*config.rules.trustAdaptation);
  }

  for(let i=0;i<config.nodeCount;i++){
    const conviction=clamp(value(i,3)+influenceDelta[i]+between(-config.rules.noise,config.rules.noise));
    const fatigue=Math.min(1,success[i]*config.rules.activityFatigue*20);
    const activity=value(i,1)+(1-value(i,1))*config.rules.activityRecovery-fatigue;
    const influence=value(i,5)+success[i]*config.rules.influenceGrowth-(contacts[i]===0?config.rules.influenceDecay:0);
    const resistance=value(i,4)+Math.abs(influenceDelta[i])*config.rules.resistanceAdaptation*Math.sign(conviction-0.5);
    setNext(i,0,value(i,0));
    setNext(i,1,activity);
    setNext(i,2,value(i,2));
    setNext(i,3,conviction);
    setNext(i,4,resistance);
    setNext(i,5,influence);
  }
}

function analyse(){
  const means=new Array(config.dimensions).fill(0), variances=new Array(config.dimensions).fill(0);
  for(let i=0;i<config.nodeCount;i++) for(let d=0;d<config.dimensions;d++) means[d]+=value(i,d)/config.nodeCount;
  for(let i=0;i<config.nodeCount;i++) for(let d=0;d<config.dimensions;d++){ const q=value(i,d)-means[d]; variances[d]+=q*q/config.nodeCount; }
  const result={step,nodes:config.nodeCount,edgeCount:edges.length/3,means,variances,density:(edges.length/3)/(config.nodeCount*(config.nodeCount-1)/2)};
  if(config.model?.type==='ideaSpread'){
    let supporters=0,opponents=0,neutral=0;
    for(let i=0;i<config.nodeCount;i++){ const c=value(i,3); if(c>0.7)supporters++; else if(c<0.3)opponents++; else neutral++; }
    result.lensMetrics={supporters:supporters/config.nodeCount,opponents:opponents/config.nodeCount,neutral:neutral/config.nodeCount,polarization:variances[3]};
  }
  return result;
}

function emit(type='frame'){
  postMessage({type,step,values:values.slice(),positions:positions.slice(),groups:groups.slice(),edges:new Float32Array(edges),analysis:analyse(),config});
}

function reset(nextConfig=config){
  config=structuredClone(nextConfig); rngState=config.seed>>>0; step=0;
  values=new Float32Array(config.nodeCount*config.dimensions); nextValues=new Float32Array(values.length);
  positions=new Float32Array(config.nodeCount*2); groups=new Uint8Array(config.nodeCount);
  let index=0;
  config.groups.forEach((group,g)=>{
    for(let k=0;k<group.count&&index<config.nodeCount;k++,index++){
      groups[index]=g;
      for(let d=0;d<config.dimensions;d++){ const range=group.ranges[d]||[0,1]; values[index*config.dimensions+d]=between(range[0],range[1]); }
      const a=random()*Math.PI*2,r=45+g*100+random()*65;
      positions[index*2]=Math.cos(a)*r; positions[index*2+1]=Math.sin(a)*r;
    }
  });
  while(index<config.nodeCount){ for(let d=0;d<config.dimensions;d++) values[index*config.dimensions+d]=random(); index++; }
  rebuildEdges(); emit('reset');
}

function tick(count=1){
  for(let n=0;n<count;n++){
    if(config.model?.type==='ideaSpread') tickIdeaSpread(); else tickConvergence();
    values.set(nextValues); step++;
    if(step%config.rules.rebuildEvery===0) rebuildEdges();
  }
  emit(step%config.analysisEvery===0?'analysis':'frame');
}

function intervene({target='selected',nodeId=0,dimension=0,mode='add',value:amount=0}){
  const apply=i=>{ const at=i*config.dimensions+dimension; values[at]=clamp(mode==='set'?amount:mode==='multiply'?values[at]*amount:values[at]+amount); };
  if(target==='all') for(let i=0;i<config.nodeCount;i++) apply(i); else apply(Math.max(0,Math.min(config.nodeCount-1,nodeId)));
  rebuildEdges(); emit('intervention');
}

onmessage=e=>{
  const {type}=e.data;
  if(type==='init'||type==='reset') reset(e.data.config||config);
  if(type==='step') tick(e.data.count||1);
  if(type==='intervene') intervene(e.data);
  if(type==='snapshot') emit('snapshot');
};

reset(config);

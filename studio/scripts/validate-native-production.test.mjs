import {test} from 'node:test';
import assert from 'node:assert/strict';
import {originalProductionFindings} from './validate-native-production.mjs';
const project=()=>({
  status:'concept',engine:'hyperframes',format:'9:16',
  templateId:'kinetic-title',styleId:'route-journey',
  scenes:[{engine:'hyperframes',source:'scenes/intro/index.html'}]
});
const prod=()=>({
  sourceMethod:'original-motionforge',selectedStyle:'route-journey',
  templateSource:'templates/kinetic-title/index.html',
  parameterContract:'templates/kinetic-title/params.json',
  parameterValues:'scenes/intro/params.values.json',
  originalFormat:'9:16',engine:'hyperframes',
  gates:Object.fromEntries(['G1','G2','G3','G4','G5','G6','G7'].map(g=>[g,{status:'pending',evidence:null}]))
});
test('a scaffold is allowed to remain a concept with pending approvals',()=>{
  assert.deepEqual(originalProductionFindings(project(),prod()),[]);
});
test('READY cannot bypass any original MotionForge approval gate',()=>{
  const p=project();p.status='ready';
  assert.ok(originalProductionFindings(p,prod()).filter(f=>f.code==='APPROVAL').length>=6);
});
test('READY with documented evidence can pass',()=>{
  const p=project();p.status='ready';
  const d=prod();
  for(const [g,info] of Object.entries(d.gates))d.gates[g]={status:'passed',evidence:'qa/'+g+'.md'};
  d.gates.G3={status:'not_applicable',reason:'No paid calls',evidence:null};
  assert.deepEqual(originalProductionFindings(p,d,()=>true),[]);
});
test('changing scene engine breaks source provenance',()=>{
  const p=project();p.scenes=[{engine:'canvas',source:'scenes/intro/index.html'}];
  assert.ok(originalProductionFindings(p,prod()).some(f=>f.code==='SOURCE_SCENE'));
});

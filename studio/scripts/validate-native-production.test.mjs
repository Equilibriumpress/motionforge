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

test('16:9 adaptation is allowed only as draft with source-based design notes',()=>{
  const p=project();p.format='16:9';
  const d=prod();d.originalFormat='9:16';d.adaptation={
    targetFormat:'16:9',status:'draft',notes:'Original HTML/GSAP landscape redesign; waiting for storyboard still approval.'
  };
  assert.deepEqual(originalProductionFindings(p,d,()=>true),[]);
  p.status='ready';
  assert.ok(originalProductionFindings(p,d,()=>true).some(item=>item.code==='FORMAT_APPROVAL'));
});
test('multiple original scene sources are allowed with full provenance',()=>{
  const p=project();p.scenes=[{id:'globe',engine:'hyperframes',source:'scenes/globe/index.html'}];
  const d=prod();d.sourceScene='scenes/globe/index.html';
  d.sceneTemplates=[{id:'globe',template:'globe-arcs-3d',
    originalSource:'templates/globe-arcs-3d/index.html',
    source:'scenes/globe/index.html',parameters:'scenes/globe/params-values.json'}];
  assert.deepEqual(originalProductionFindings(p,d,()=>true),[]);
});

test('individual native 9:16 scenes require adaptation even when the first scene is native',()=>{
  const p=project();
  p.scenes=[{id:'intro',engine:'hyperframes',source:'scenes/intro/index.html'},
    {id:'landscape',engine:'hyperframes',source:'scenes/landscape/index.html'}];
  const d=prod();
  d.sceneTemplates=[
    {id:'intro',template:'kinetic-title',nativeFormat:'9:16',
      originalSource:'templates/kinetic-title/index.html',
      source:'scenes/intro/index.html',parameters:'scenes/intro/params.values.json'},
    {id:'landscape',template:'checklist-reveal',nativeFormat:'16:9',
      originalSource:'templates/checklist-reveal/index.html',
      source:'scenes/landscape/index.html',parameters:'scenes/landscape/params.values.json'}
  ];
  assert.ok(originalProductionFindings(p,d,()=>true).some(f=>f.code==='SCENE_FORMAT'));
  d.sceneTemplates[1].adaptation={
    targetFormat:'9:16',status:'draft',notes:'Authored from original HTML/GSAP'
  };
  assert.deepEqual(originalProductionFindings(p,d,()=>true),[]);
  p.status='ready';
  assert.ok(originalProductionFindings(p,d,()=>true).some(f=>f.code==='SCENE_APPROVAL'));
});
test('template source checksum is checked for valid SHA-256 format',()=>{
  const p=project(),d=prod();
  d.sceneTemplates=[{id:'intro',template:'kinetic-title',
    originalSource:'templates/kinetic-title/index.html',
    source:'scenes/intro/index.html',parameters:'scenes/intro/params.values.json',
    sourceSha256:'bad'}];
  assert.ok(originalProductionFindings(p,d,()=>true).some(f=>f.code==='SOURCE_HASH'));
});

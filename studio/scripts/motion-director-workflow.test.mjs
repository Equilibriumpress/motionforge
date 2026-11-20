import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requiredSkillsForGate,gateReadiness} from './motion-director-workflow.mjs';
const empty=()=>({gates:Object.fromEntries(['G1','G2','G3','G4','G5','G6','G7'].map(k=>[k,{status:'pending'}]))});
test('each stage resolves actual upstream skills, not a second copy',()=>{
  const x=requiredSkillsForGate('G5',{styleId:'route-journey',sceneTemplates:['kinetic-title','globe-arcs-3d']});
  assert.ok(x.includes('AGENTS.md'));
  assert.ok(x.includes('skills/motion-director/SKILL.md'));
  assert.ok(x.includes('skills/motion-director/references/direction-json.md'));
  assert.ok(x.includes('templates/globe-arcs-3d/params.json'));
  assert.ok(x.includes('templates/kinetic-title/index.html'));
});
test('script G2 blocked until confirmed brief G1',()=>{
  const p=empty();
  assert.deepEqual(gateReadiness(p,'G2'),{gate:'G2',canProceed:false,missing:['G1']});
  p.gates.G1.status='passed';
  assert.deepEqual(gateReadiness(p,'G2'),{gate:'G2',canProceed:true,missing:[]});
});
test('G5 storyboard cannot pass before script, G3 spend and G4 look',()=>{
  const p=empty();
  assert.deepEqual(gateReadiness(p,'G5').missing,['G2','G4','G3']);
  p.gates.G2.status='passed';
  p.gates.G4.status='passed';
  p.gates.G3.status='not_applicable';
  assert.ok(gateReadiness(p,'G5').canProceed);
});
test('only an approved QA gate allows independent critic',()=>{
  const p=empty();
  assert.deepEqual(gateReadiness(p,'G7').missing,['G6']);
  p.gates.G6.status='passed';
  assert.ok(gateReadiness(p,'G7').canProceed);
});

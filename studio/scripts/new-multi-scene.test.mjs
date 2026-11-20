import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access,mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateVideoPlan,preflightVideoPlan,scaffoldMultiScene} from './new-multi-scene.mjs';

const fixture=new URL('fixtures/multiscene-native.json',import.meta.url);
const load=async()=>JSON.parse(await readFile(fixture,'utf8'));
const specs=async()=>{
  const plan=await load(),map=new Map();
  for(const s of plan.scenes){
    map.set(s.template,JSON.parse(await readFile(
      new URL('../../templates/'+s.template+'/params.json',import.meta.url),'utf8')));
  }
  return map;
};
test('three genuine original templates form a 14-second, 420-frame timeline',async()=>{
  const plan=validateVideoPlan(await load(),await specs());
  assert.equal(plan.durationSeconds,14);
  assert.equal(plan.totalFrames,420);
  assert.deepEqual(plan.scenes.map(x=>[x.id,x.startSeconds,x.frames]),
    [['intro',0,120],['steps',4,180],['outro',10,120]]);
  assert.ok(plan.scenes.every(x=>x.nativeFormat==='9:16'));
});
test('preflight uses original STYLE.md and template schemas, without installing media',async()=>{
  const data=await preflightVideoPlan(fileURLToPath(fixture));
  assert.ok(data.sources.get('kinetic-title').includes('motionforge template: kinetic-title'));
  assert.ok(data.sources.get('checklist-reveal').includes('motionforge template: checklist-reveal'));
  assert.equal(data.plan.scenes.length,3);
});
test('dry-run leaves repo untouched and never invokes rendering',async()=>{
  const result=await scaffoldMultiScene(['--plan',fileURLToPath(fixture),'--dry-run']);
  assert.equal(result.totalFrames,420);
  assert.equal(result.rendered,false);
  assert.equal(result.approved,false);
  await assert.rejects(access(new URL('../../videos/original-workflow-test-reel',import.meta.url)));
});
test('duplicate IDs, non-original parameters and inconsistent durations fail before writing',async()=>{
  const original=await load(),contracts=await specs();
  const duplicate=structuredClone(original);
  duplicate.scenes[1].id='intro';
  assert.throws(()=>validateVideoPlan(duplicate,contracts),/unique kebab-case/);
  const unknown=structuredClone(original);
  unknown.scenes[0].params.inventedParameter='x';
  assert.throws(()=>validateVideoPlan(unknown,contracts),/Unsupported original parameter/);
  const badTime=structuredClone(original);badTime.durationSeconds=12;
  assert.throws(()=>validateVideoPlan(badTime,contracts),/sum of scene durations/);
  const subframe=structuredClone(original);subframe.scenes[1].durationSeconds=6.014;
  assert.throws(()=>validateVideoPlan(subframe,contracts),/align exactly/);
});
test('native portrait template cannot silently produce a 16:9 video',async()=>{
  const p=await load();p.format='16:9';
  const contracts=await specs();
  assert.throws(()=>validateVideoPlan(p,contracts),/authored 16:9 HTML adaptation/);
});
test('storyboard must follow upstream layout, cue and motif rules',async()=>{
  const p=await load(),spec=await specs();
  delete p.scenes[0].direction.motifRole;
  assert.throws(()=>validateVideoPlan(p,spec),/motifRole/);
  const p2=await load();p2.scenes[1].direction.layout=p2.scenes[0].direction.layout;
  p2.scenes[1].direction.entrance=p2.scenes[0].direction.entrance;
  assert.throws(()=>validateVideoPlan(p2,spec),/Adjacent scenes/);
});
test('a static cover cannot be used as a timed scene',async()=>{
  const p=await load(),contract=await specs();
  contract.set('cover-still',JSON.parse(await readFile(
    new URL('../../templates/cover-still/params.json',import.meta.url),'utf8')));
  p.scenes[1].template='cover-still';
  assert.throws(()=>validateVideoPlan(p,contract),/no duration control/);
});
test('adaptation preflight rejects fake 16:9 source without original motion code',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'mf-preflight-'));
  try{
    const plan=await load();plan.format='16:9';
    const fake='<html><body><div data-width="1920" data-height="1080"></div></body></html>';
    await writeFile(path.join(root,'fake.html'),fake);
    for(const s of plan.scenes)s.adaptation={source:'fake.html',notes:'Explicit source-based layout intended'};
    await writeFile(path.join(root,'plan.json'),JSON.stringify(plan));
    await assert.rejects(preflightVideoPlan(path.join(root,'plan.json')),/retain original template/);
  }finally{await rm(root,{recursive:true,force:true});}
});

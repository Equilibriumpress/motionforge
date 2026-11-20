import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exportPlan,frameAt,sampleFrames,captureCrop} from './hyperframes-plan.mjs';
const source=(id)=>'projects/peak-district-roadtrip/scenes/'+id+'/index.html';
const fixture=()=>({id:'peak-district-roadtrip',title:'Peak District',
  language:'nl',format:'16:9',durationSeconds:30,fps:30,
  scenes:[
   {id:'globe',startSeconds:0,durationSeconds:8,engine:'hyperframes'},
   {id:'route',startSeconds:8,durationSeconds:10,engine:'hyperframes'},
   {id:'highlights',startSeconds:18,durationSeconds:7,engine:'hyperframes'},
   {id:'outro',startSeconds:25,durationSeconds:5,engine:'hyperframes'}],
  previewSources:Object.fromEntries(['globe','route','highlights','outro'].map(id=>[id,source(id)]))
});
test('Peak District full MP4 plan has four original scenes and 900 contiguous frames',()=>{
 const plan=exportPlan(fixture());
 assert.equal(plan.width,1920);assert.equal(plan.height,1080);
 assert.equal(plan.frameCount,900);
 assert.deepEqual(plan.scenes.map(s=>[s.id,s.startFrame,s.frames]),
  [['globe',0,240],['route',240,300],['highlights',540,210],['outro',750,150]]);
 assert.deepEqual([0,239,240,539,540,749,750,899].map(x=>frameAt(plan,x).sceneId),
  ['globe','globe','route','route','highlights','highlights','outro','outro']);
 assert.equal(frameAt(plan,240).localSeconds,0);
 assert.ok(sampleFrames(plan).includes(0));
 assert.ok(sampleFrames(plan).includes(899));
});
test('draft is half-resolution without changing scene fps or order',()=>{
 const p=exportPlan(fixture(),{quality:'draft'});
 assert.deepEqual([p.width,p.height,p.fps,p.frameCount],[960,540,30,900]);
});
test('no synthetic gap/overlap, missing scene URLs or unsafe source injection',()=>{
 let f=fixture();f.scenes[1].startSeconds=9;
 assert.throws(()=>exportPlan(f),/gap, overlap/);
 f=fixture();delete f.previewSources.route;
 assert.throws(()=>exportPlan(f),/Missing original scene/);
 f=fixture();f.previewSources.route='projects/peak-district-roadtrip/../evil.html';
 assert.throws(()=>exportPlan(f),/Missing original scene/);
 f=fixture();f.scenes[0].engine='remotion';
 assert.throws(()=>exportPlan(f),/only original seekable HyperFrames/);
});
test('sampling and source viewport crop preserve expected aspect and timeline',()=>{
 const p=exportPlan(fixture());
 assert.ok(sampleFrames(p).length>=12);
 assert.deepEqual(captureCrop(1280,720,1280,720,{left:0,top:0,width:1280,height:720}),
 {x:0,y:0,width:1280,height:720});
 const crop=captureCrop(1280,960,1280,960,{left:0,top:120,width:1280,height:720});
 assert.deepEqual(crop,{x:0,y:120,width:1280,height:720});
 assert.throws(()=>frameAt(p,900),/outside/);
});

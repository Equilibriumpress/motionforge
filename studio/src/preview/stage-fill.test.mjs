import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateStageFill,expectedStage} from './stage-fill.mjs';
test('original 9:16 frame fills its native portrait export stage',()=>{
 for(const [w,h] of [[1080,1920],[405,720],[360,640],[540,960]]){
  const result=validateStageFill(expectedStage(1080,1920,w,h));
  assert.equal(result.ok,true,JSON.stringify(result));
 }
});
test('original 16:9 frame fills its native landscape export stage',()=>{
 for(const [w,h] of [[1920,1080],[1280,720],[960,540]]){
  assert.equal(validateStageFill(expectedStage(1920,1080,w,h)).ok,true);
 }
});
test('never permit a small portrait animation inside landscape output',()=>{
 const info=validateStageFill(expectedStage(1080,1920,1920,1080));
 assert.equal(info.ok,false);
 assert.match(info.reason,/verschilt/);
 assert.ok(info.coverageX<.34);
});
test('never permit a small landscape animation inside portrait output',()=>{
 const info=validateStageFill(expectedStage(1920,1080,1080,1920));
 assert.equal(info.ok,false);
 assert.ok(info.coverageY<.34);
});
test('reject nested half-size scene even when source and output share an aspect',()=>{
 const info=validateStageFill({nativeWidth:1080,nativeHeight:1920,
  viewportWidth:450,viewportHeight:800,width:225,height:400,left:112.5,top:200});
 assert.equal(info.ok,false);
 assert.match(info.reason,/onvoldoende/);
});
test('reject off-centre scene',()=>{
 const info=validateStageFill({...expectedStage(1080,1920,450,800),left:45});
 assert.equal(info.ok,false);
});
test('rounding of real browser frame bounds remains accepted',()=>{
 const info=validateStageFill({nativeWidth:1080,nativeHeight:1920,
  viewportWidth:444,viewportHeight:790,width:443.8,height:789,left:.1,top:.5});
 assert.equal(info.ok,true);
});
test('missing measurements cannot be treated as a completed render',()=>{
 assert.equal(validateStageFill(null).ok,false);
 assert.equal(validateStageFill({nativeWidth:1080}).ok,false);
});

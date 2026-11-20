import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {templateFormat,verifyContract,scaffold} from './new-from-upstream.mjs';

const original=async id=>JSON.parse(await readFile(new URL('../../templates/'+id+'/params.json',import.meta.url),'utf8'));
test('native format is read from ORIGINAL source dimensions',()=>{
  assert.equal(templateFormat([1080,1920]),'9:16');
  assert.equal(templateFormat([1920,1080]),'16:9');
  assert.equal(templateFormat([1000,1000]),'1:1');
});
test('original template selected at 16:9 must not silently turn into Canvas',async()=>{
  const spec=await original('globe-arcs-3d');
  assert.throws(()=>verifyContract(spec,{template:'globe-arcs-3d',format:'16:9',duration:8,
    params:{cities:[{name:'A',lat:1,lon:2}]}}),/separately authored layout/);
});
test('actual upstream params and 9:16 work, unknown params fail',async()=>{
  const spec=await original('globe-arcs-3d');
  assert.equal(verifyContract(spec,{template:'globe-arcs-3d',format:'9:16',duration:8,
    params:{cities:[{name:'A',lat:1,lon:2}],duration:8}}),'9:16');
  assert.throws(()=>verifyContract(spec,{template:'globe-arcs-3d',format:'9:16',duration:8,
    params:{foo:'invented'}}),/Unsupported original parameter/);
});
test('3D globe requires user-supplied location parameters',async()=>{
  const spec=await original('globe-arcs-3d');
  assert.throws(()=>verifyContract(spec,{template:'globe-arcs-3d',format:'9:16',duration:8,
    params:{duration:8}}),/needs custom cities/);
});
test('static cover template cannot be misrepresented as video',async()=>{
  const spec=await original('cover-still');
  assert.throws(()=>verifyContract(spec,{template:'cover-still',format:'9:16',duration:4,
    params:{}}),/no duration control/);
});
test('dry-run reads original source without rendering or creating a project',async()=>{
  const plan=await scaffold(['--template','kinetic-title','--style','route-journey',
    '--slug','upstream-preflight-test','--title','Roadtrip','--format','9:16',
    '--duration','4','--dry-run']);
  assert.equal(plan.engine,'hyperframes');
  assert.equal(plan.originalFormat,'9:16');
  assert.ok(plan.sourceSha256.length===64);
});

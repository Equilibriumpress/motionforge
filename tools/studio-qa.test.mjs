import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateManifest} from './studio-qa.mjs';
const project=()=>({
  schemaVersion:1,id:'example',title:'Example',status:'concept',format:'16:9',
  engine:'canvas',fps:30,durationSeconds:10,tags:['demo'],
  scenes:[{id:'intro',engine:'canvas',source:'scenes/intro/index.html',startSeconds:0,durationSeconds:10}]
});
test('valid manifest has no failures',()=>{
  assert.equal(validateManifest(project(),'example').filter(item=>item.level==='FAIL').length,0);
});
test('overlap and unsafe source are rejected',()=>{
  const p=project();
  p.scenes.push({id:'second',engine:'canvas',source:'../secret.html',startSeconds:4,durationSeconds:3});
  const codes=validateManifest(p,'example').map(item=>item.code);
  assert.ok(codes.includes('OVERLAP'));
  assert.ok(codes.includes('SOURCE'));
});
test('missing scenes are rejected',()=>{
  const p=project();p.scenes=[];
  assert.ok(validateManifest(p,'example').some(item=>item.code==='SCENES'));
});

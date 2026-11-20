import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {originalProductionFindings} from '../../studio/scripts/validate-native-production.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=async file=>readFile(path.join(root,file),'utf8');
test('Kyoto: original four-template film, native portrait and exactly 900 frames',async()=>{
 const p=JSON.parse(await read('project.json'));
 assert.equal(p.status,'concept');
 assert.equal(p.durationSeconds,30);
 assert.equal(p.fps,30);
 assert.equal(p.format,'9:16');
 assert.equal(p.engine,'hyperframes');
 assert.equal(p.scenes.length,4);
 assert.deepEqual(p.scenes.map(s=>s.startSeconds),[0,5,15,25]);
 assert.deepEqual(p.scenes.map(s=>s.durationSeconds*30),[150,300,300,150]);
 assert.equal(p.scenes.reduce((n,s)=>n+s.durationSeconds*30,0),900);
});
test('Kyoto: every original source and template schema is retained',async()=>{
 const p=JSON.parse(await read('project.json'));
 const d=JSON.parse(await read('production.json'));
 assert.equal(d.sceneTemplates.length,4);
 assert.deepEqual(d.sceneTemplates.map(s=>s.template),[
  'kinetic-title','globe-arcs-3d','checklist-reveal','stat-counter']);
 assert.deepEqual(originalProductionFindings(p,d,()=>true),[]);
 for(const item of d.sceneTemplates){
  const html=await read(item.source);
  const schema=JSON.parse(await read('scenes/'+item.id+'/params.json'));
  const values=JSON.parse(await read(item.parameters));
  assert.equal(schema.id,item.template);
  assert.match(html,new RegExp('motionforge template: '+item.template));
  assert.match(html,/MF\.timeline\(/);
  assert.match(html,/data-composition-id="main"/);
  assert.match(html,/data-width="1080" data-height="1920"/);
  const embedded=html.match(/<script id="params" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(embedded);
  const parsed=JSON.parse(embedded[1]);
  assert.deepEqual(parsed,values);
 }
});
test('Kyoto: verified places; no fictitious visitor data or false approval',async()=>{
 const p=JSON.parse(await read('video-plan.json'));
 const d=JSON.parse(await read('production.json'));
 assert.deepEqual(p.scenes[2].params.items,['Fushimi Inari','Kiyomizu-dera','Arashiyama']);
 assert.equal(p.scenes[3].params.value,3);
 assert.equal(p.scenes[3].params.ringPercent,0);
 assert.equal(p.scenes[1].params.route,'JAPAN · SCHEMATISCH');
 assert.ok(p.claims.every(c=>/^https:\/\//.test(c.source)));
 assert.ok(Object.values(d.gates).every(g=>g.status==='pending'));
});

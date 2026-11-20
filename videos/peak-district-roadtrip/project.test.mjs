import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateManifest} from '../../../tools/studio-qa.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url));
const read=async file=>readFile(path.join(dir,file),'utf8');

test('30 seconds, Dutch, 16:9 and exact contiguous scene timing',async()=>{
  const p=JSON.parse(await read('project.json'));
  assert.equal(p.language,'nl');assert.equal(p.format,'16:9');assert.equal(p.fps,30);
  assert.equal(p.durationSeconds,30);
  assert.deepEqual(p.scenes.map(s=>s.startSeconds),[0,8,18,25]);
  assert.deepEqual(p.scenes.map(s=>s.durationSeconds),[8,10,7,5]);
  assert.deepEqual(validateManifest(p,'peak-district-roadtrip').filter(c=>c.level==='FAIL'),[]);
});
test('original 3D scene, complete param contract and landscape canvas',async()=>{
  const html=await read('scenes/globe/index.html');
  const m=html.match(/<script id="params" type="application\/json">([\s\S]*?)<\/script>/);
  const p=JSON.parse(m[1]);
  assert.equal(p.duration,8);assert.equal(p.cities.length,4);
  assert.ok(html.includes('motionforge template: globe-arcs-3d'));
  assert.ok(html.includes('MF.timeline('));
  assert.ok(html.includes('onSeek(draw, ready)'));
  assert.ok(html.includes('data-width="1920" data-height="1080"'));
  assert.equal(JSON.parse(await read('scenes/globe/params.json')).id,'globe-arcs-3d');
});
test('other scenes are frame-seekable and valid JavaScript',async()=>{
  for(const id of ['route','highlights','outro']){
    const html=await read('scenes/'+id+'/index.html');
    assert.ok(html.includes('window.render=function(t)'));
    assert.ok(html.includes('window.READY=true'));
    assert.ok(html.includes('window.TEXTS=function(t)'));
    assert.doesNotMatch(html,/Math\.random\s*\(|Date\.now\s*\(|setInterval\s*\(/);
    const source=html.match(/<script>([\s\S]+?)<\/script>/)[1];
    assert.doesNotThrow(()=>new Function(source));
  }
});
test('geographic points are not represented as an invented road',async()=>{
  const fc=JSON.parse(await read('data/stops.geojson'));
  assert.equal(fc.type,'FeatureCollection');
  assert.equal(fc.features.length,4);
  assert.ok(fc.features.every(f=>f.geometry.type==='Point'));
  assert.deepEqual(fc.features.map(f=>f.properties.id),['castleton','mam-tor','ladybower','bakewell']);
  for(const item of fc.features){
    const [lon,lat]=item.geometry.coordinates;
    assert.ok(lon>-2&&lon<-1.5&&lat>53&&lat<53.5);
  }
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {validateManifest} from '../../tools/studio-qa.mjs';
import {originalProductionFindings} from '../../studio/scripts/validate-native-production.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const read=async file=>readFile(path.join(root,file),'utf8');
const json=async file=>JSON.parse(await read(file));

test('30s / 900f exact and four contiguous original HyperFrames scenes',async()=>{
  const project=await json('project.json');
  assert.equal(project.durationSeconds,30);
  assert.equal(project.fps,30);
  assert.equal(project.format,'16:9');
  assert.equal(project.language,'nl');
  assert.equal(project.status,'draft');
  assert.deepEqual(project.scenes.map(scene=>scene.startSeconds),[0,8,18,25]);
  assert.deepEqual(project.scenes.map(scene=>scene.durationSeconds),[8,10,7,5]);
  assert.ok(project.scenes.every(scene=>scene.engine==='hyperframes'));
  assert.deepEqual(validateManifest(project,project.id).filter(item=>item.level==='FAIL'),[]);
});
test('each scene contains original MotionForge source + original params contract',async()=>{
  const project=await json('project.json');
  const prod=await json('production.json');
  const expected=['globe-arcs-3d','checklist-reveal','kinetic-title','kinetic-title'];
  assert.deepEqual(prod.sceneTemplates.map(item=>item.template),expected);
  for(const [index,scene] of project.scenes.entries()){
    const html=await read(scene.source);
    const id=expected[index];
    assert.ok(html.includes('motionforge template: '+id),scene.id+' original source marker missing');
    assert.ok(html.includes('MF.timeline('),scene.id+' HyperFrames timeline missing');
    assert.ok(html.includes('data-width="1920" data-height="1080"'),scene.id+' 16:9 stage missing');
    const params=JSON.parse(html.match(/<script id="params" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(params.duration,scene.durationSeconds);
    assert.equal(params.lang,'nl');
    const original=await json('scenes/'+scene.id+'/params.json');
    assert.equal(original.id,id);
    const values=await json(prod.sceneTemplates[index].parameters);
    assert.equal(values.duration,scene.durationSeconds);
    const block=html.match(/<script>\s*const P = MF\.params\(\);([\s\S]*?)<\/script>/);
    assert.ok(block,scene.id+' original classic script missing');
    assert.doesNotThrow(()=>new Function('const P = MF.params();'+block[1]));
  }
});
test('original 3D globe still has real Three.js seeking layer',async()=>{
  const html=await read('scenes/globe/index.html');
  assert.ok(html.includes('import * as THREE from "three"'));
  assert.ok(html.includes('onSeek(draw, ready)'));
  assert.ok(html.includes('createStage({ width: 1240, height: 1080'));
  const params=JSON.parse(html.match(/<script id="params" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(params.cities.length,4);
  assert.deepEqual(params.cities.map(item=>item.name),['Castleton','Mam Tor','Ladybower','Bakewell']);
});
test('map displays four coordinate points and explicitly discloses schematic route',async()=>{
  const html=await read('scenes/route/index.html');
  const features=(await json('data/stops.geojson')).features;
  assert.equal(features.length,4);
  assert.ok(features.every(feature=>feature.geometry.type==='Point'));
  assert.ok(html.includes('VERBINDINGEN SCHEMATISCH'));
  assert.ok(html.includes('GEEN WEGENKAART'));
  assert.ok(html.includes('route-animated'));
  assert.ok(!html.includes('window.render='));
});
test('original source evidence is recorded, and READY is not falsely claimed',async()=>{
  const p=await json('project.json'),prod=await json('production.json');
  assert.equal(prod.sourceMethod,'original-motionforge');
  assert.equal(prod.originalFormat,'9:16');
  assert.equal(prod.adaptation.targetFormat,'16:9');
  assert.equal(prod.adaptation.status,'draft');
  assert.equal(prod.gates.G5.status,'pending');
  assert.deepEqual(originalProductionFindings(p,prod,()=>true),[]);
});

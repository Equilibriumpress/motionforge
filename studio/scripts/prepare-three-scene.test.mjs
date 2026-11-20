import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isNativeThreeScene,replaceNativeThreeModule} from './prepare-three-scene.mjs';
const scene=id=>readFileSync(new URL('../../videos/peak-district-weekend-kit-unboxing/scenes/'+id+'/index.html',import.meta.url),'utf8');
test('the original 16:9 box and item scenes retain Three.js and seek logic',()=>{
 for(const id of ['box-open','item-reveal']){
  const html=scene(id);
  assert.equal(isNativeThreeScene(html),true);
  assert.match(html,/data-width="1920" data-height="1080"/);
  assert.match(html,/onSeek\(draw\)/);
  assert.match(html,/hinges\.forEach/);
  const published=replaceNativeThreeModule(html);
  assert.match(published,/mf-native-three-preview\.js/);
  assert.doesNotMatch(published,/<script type="module">/);
  assert.match(published,/motionforge template: product-turntable-3d/);
 }
});
test('ordinary native HyperFrames title does not become a 3D scene',()=>{
 assert.equal(isNativeThreeScene(scene('hook')),false);
 assert.throws(()=>replaceNativeThreeModule(scene('hook')));
});

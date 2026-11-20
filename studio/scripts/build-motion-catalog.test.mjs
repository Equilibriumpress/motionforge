import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseScenes,parseStyles} from './build-motion-catalog.mjs';
const stylesFile=new URL('../../skills/style-library/styles/README.md',import.meta.url);
const scenesFile=new URL('../../templates/README.md',import.meta.url);
test('upstream style catalogue parses 100 styles in 20 categories',async()=>{
  const styles=parseStyles(await readFile(stylesFile,'utf8'));
  assert.ok(styles.length>=100);
  assert.ok(new Set(styles.map(item=>item.category)).size>=20);
  assert.equal(new Set(styles.map(item=>item.id)).size,styles.length);
  assert.ok(styles.every(item=>item.sourceUrl.endsWith('/STYLE.md')));
  assert.ok(styles.every(item=>item.previewUrl.endsWith('/preview.gif')));
});
test('upstream scene catalogue parses 16 animated templates',async()=>{
  const scenes=parseScenes(await readFile(scenesFile,'utf8'));
  assert.ok(scenes.length>=16);
  assert.equal(new Set(scenes.map(item=>item.id)).size,scenes.length);
  assert.ok(scenes.some(item=>item.id==='globe-arcs-3d'));
  assert.ok(scenes.some(item=>item.id==='kinetic-title'));
});
test('malformed entries do not generate URLs',()=>{
  const styles=parseStyles('## Test\n| [evil](../../password/STYLE.md) | X | Y | Z |');
  assert.deepEqual(styles,[]);
  assert.deepEqual(parseScenes('<img src="../../evil/preview.gif">'),[]);
});

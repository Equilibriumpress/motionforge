import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');

/**
 * Regression for 2026-11-20: portrait scene measured 255x293 instead of
 * the correct ~255x453 because a narrow-screen @media rule clamped
 * only height to 48vh, breaking CSS aspect-ratio:9/16.
 *
 * No breakpoint may cap stage height independently from its width.
 * The project modal itself scrolls when a tall scene exceeds its height.
 */
test('portrait and 4:5 native video frames use aspect-ratio without an independent height cap',()=>{
 for(const [aspect,selector] of [['9/16','9-16'],['4/5','4-5'],['1/1','1-1']]){
  assert.match(css,new RegExp('\\.player-stage\\.ratio-'+selector+'\\{aspect-ratio:'+aspect.replace('/','\\/')));
  const rules=[...css.matchAll(/\.player-stage\.ratio-(?:9-16|4-5|1-1)[^{]*\{([^}]*)\}/g)]
    .filter(m=>m[0].includes('ratio-'+selector));
  assert.ok(rules.length,'Missing ratio CSS for '+selector);
  for(const rule of rules){
   assert.doesNotMatch(rule[1],/(?:^|;)\s*max-height\s*:\s*(?!none)[^;}]*/i,
    'A max-height clamp breaks native video aspect ratio in '+selector);
   assert.doesNotMatch(rule[1],/(?:^|;)\s*height\s*:\s*\d/i,
    'Fixed stage height stretches or letterboxes '+selector);
  }
 }
});
test('responsive modal scrolls instead of shrinking the original video stage',()=>{
 assert.match(css,/@media\(max-width:850px\)\{\.detail-layout\{grid-template-columns:1fr\}\.detail-panel\{max-height:94vh\}\}/);
 assert.match(css,/\.detail-panel\{[^}]*overflow:auto/);
 assert.doesNotMatch(css,/\.player-stage\.ratio-9-16[^}]*\{[^}]*max-height:48vh/);
});

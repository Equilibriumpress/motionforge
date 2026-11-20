import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateCriticReview} from './studio-qa-critic.mjs';
const sha='f'.repeat(64),panels=[{file:'qa/board/001-start.png'},{file:'qa/board/002-end.png'}];
const review=()=>({
 freshContextConfirmed:true,renderSha256:sha,reviewer:'Independent chat reviewer',
 observation:{topic:'This video explains a local walking route.',audience:'Visitors planning a walk.',
 action:'Choose a suitable route and start planning.'},
 firstFrame:{status:'PASS',note:'The opening promise appears in the first frame.'},
 panels:panels.map(p=>({file:p.file,status:'PASS',note:'Text is readable and correctly positioned.'})),
 weakestScene:'Second scene',weaknessReason:'Small route labels are a little too dense.',resolutions:[]
});
test('actual independent panel review may be recorded only for the correct render',()=>{
 assert.equal(validateCriticReview(review(),panels,sha).status,'completed');
 assert.throws(()=>validateCriticReview(review(),panels,'a'.repeat(64)),/fresh independent/);
});
test('every panel needs an external PASS/FIX and written reason',()=>{
 const r=review();r.panels.pop();
 assert.throws(()=>validateCriticReview(r,panels,sha),/EVERY|Every rendered/);
});
test('open critic FIX blocks completion',()=>{
 const r=review();r.panels[0].status='FIX';
 assert.equal(validateCriticReview(r,panels,sha).status,'needs-fixes');
 r.resolutions=[{file:r.panels[0].file,disposition:'rebutted',
  evidence:'qa/phone.png',reason:'Verified intentional layout in original storyboard.'}];
 assert.equal(validateCriticReview(r,panels,sha).status,'completed');
 r.resolutions[0].disposition='fixed';
 assert.throws(()=>validateCriticReview(r,panels,sha),/re-rendering/);
});
test('no review may claim independent status without fresh-context attestation',()=>{
 const r=review();r.freshContextConfirmed=false;
 assert.throws(()=>validateCriticReview(r,panels,sha),/fresh independent/);
});

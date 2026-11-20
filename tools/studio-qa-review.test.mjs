import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ebur128,reportMd} from './studio-qa-review.mjs';
import {makePendingChecks} from './studio-qa-policy.mjs';
test('parses real FFmpeg EBU R128 summary',()=>{
 const log='[Parsed_ebur128] Summary:\n Integrated loudness:\n I: -14.2 LUFS\n True peak:\n Peak: -1.4 dBFS';
 assert.deepEqual(ebur128(log),{lufs:-14.2,peak:-1.4});
 assert.equal(ebur128('no audio measurement'),null);
});
test('markdown QA report includes source render hash and pending checks',()=>{
 const sha='a'.repeat(64);
 const s=reportMd({project:'demo',render:{file:'renders/demo.mp4',sha256:sha,date:'2026-11-20'},
   checks:makePendingChecks(),critic:{status:'pending'}});
 assert.match(s,/sha256: a{64}/);
 assert.match(s,/\| X10 \| pending \|/);
 assert.match(s,/Independent critic: pending/);
});

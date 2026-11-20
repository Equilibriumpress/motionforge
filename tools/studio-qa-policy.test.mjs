import {test} from 'node:test';
import assert from 'node:assert/strict';
import {QA_IDS,QA_CHECK_IDS,makePendingChecks,checkRecord,
 parseBlackFreeze,parseLuminance,flashBursts,wordBoundaryFindings,
 wordsPerSecond,captionFindings,renderGate,summarizeChecks}
 from './studio-qa-policy.mjs';
test('all 31 original MotionForge QA check IDs are present',()=>{
 assert.equal(QA_CHECK_IDS.length,31);
 assert.deepEqual(Object.keys(makePendingChecks()).sort(),[...QA_CHECK_IDS].sort());
});
test('PASS needs evidence and WARN needs a written acceptance reason',()=>{
 assert.throws(()=>checkRecord('T1','pass'),/evidence/);
 assert.throws(()=>checkRecord('T1','warn','qa/file','no'),/reason/);
 assert.equal(checkRecord('T1','pass','qa/ffprobe.json').status,'pass');
});
test('detect black and frozen intervals in actual FFmpeg output',()=>{
 const events=parseBlackFreeze('black_start: 1 black_end: 1.4 black_duration: 0.4\nfreeze_start: 2.8');
 assert.equal(events.black.length,1);
 assert.equal(events.freeze.length,1);
});
test('safety flash rule is three large luminance changes per second',()=>{
 const values=parseLuminance('frame:0 pts_time:0\nlavfi.signalstats.YAVG=20\nframe:1 pts_time:0.2\nlavfi.signalstats.YAVG=90');
 assert.equal(values.length,2);
 assert.equal(flashBursts(Array.from({length:9},(_,i)=>({t:i*.1,y:i%2?100:0}))).length,1);
});
test('word-cut and speaking pace failures come from measured words',()=>{
 const words=[{w:'first',s:0,e:1.1},{w:'second',s:1.3,e:2}];
 assert.equal(wordBoundaryFindings(words,[{startSeconds:0},{startSeconds:1}]).length,1);
 assert.equal(wordsPerSecond(words,[{id:'a',startSeconds:0,durationSeconds:.5}],1)[0].over,true);
});
test('captions enforce 0.6 seconds and no overlap',()=>{
 assert.deepEqual(captionFindings([{start:0,end:.8},{start:.8,end:1.5}],2),[]);
 assert.ok(captionFindings([{start:0,end:.2},{start:.15,end:.4}],1).length>0);
});
test('render hash, incomplete checks, missing independent critic and open FIX block READY',()=>{
 const sha='a'.repeat(64),r={schemaVersion:1,skill:'skills/qa-review/SKILL.md',
  render:{sha256:sha},checks:makePendingChecks(),critic:{status:'pending'}};
 assert.equal(renderGate(r,sha).ok,false);
 assert.ok(renderGate(r,'b'.repeat(64)).problems[0].includes('stale'));
 for(const id of QA_CHECK_IDS.filter(x=>!x.startsWith('H')))
   r.checks[id]=checkRecord(id,'pass','qa/log.json');
 r.critic={status:'completed',renderSha256:sha,freshContextConfirmed:true,
   unresolvedFixes:0,evidence:'qa/critic-review.json'};
 assert.equal(renderGate(r,sha).ok,true);
 r.checks.T3=checkRecord('T3','warn','qa/accepted-holds.json',
   'Black frame intentionally holds for a documented reveal.');
 assert.equal(summarizeChecks(r.checks).warn,1);
 assert.equal(renderGate(r,sha).ok,true);
 r.critic.unresolvedFixes=1;
 assert.equal(renderGate(r,sha).ok,false);
});

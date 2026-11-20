import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateWords,alignWords,createCaptionChunks,captionsSrt,resolveCue,sceneCues} from './studio-voice.mjs';
const sample=[
 {w:'Begin',s:.1,e:.45},
 {w:'in',s:.48,e:.63},
 {w:'Castleton.',s:.65,e:1.1},
 {w:'Bekijk',s:1.45,e:1.8},
 {w:'Mam',s:1.85,e:2.1},
 {w:'Tor.',s:2.14,e:2.55}
];
test('voice words must be real positive chronological measured intervals',()=>{
 assert.equal(validateWords(sample,3).length,6);
 assert.throws(()=>validateWords([{w:'no',s:2,e:1}],3),/Invalid word timing/);
 assert.throws(()=>validateWords([{w:'cut',s:.1,e:3.4}],3),/exceeds measured/);
});
test('ASR words inherit the exact spoken script spelling without fabricating times',()=>{
 const result=alignWords(sample,'Begin in Castleton. Bekijk Mam Tor.');
 assert.deepEqual(result.map(x=>x.w),sample.map(x=>x.w));
 assert.deepEqual(result.map(x=>x.s),sample.map(x=>x.s));
 assert.throws(()=>alignWords(sample,'Completely unrelated content and wrong script.'),/Word count mismatch|ASR\/transcript/);
});
test('actual caption timestamps yield SRT with no overlap',()=>{
 const captions=createCaptionChunks(sample,'16:9',3);
 assert.ok(captions.length>=2);
 for(let i=1;i<captions.length;i++)assert.ok(captions[i-1].end<=captions[i].start);
 assert.match(captionsSrt(captions),/00:00:00,100 -->/);
});
test('vertical chunks are smaller than horizontal and use the same spoken tokens',()=>{
 const a=createCaptionChunks(sample,'16:9',3);
 const b=createCaptionChunks(sample,'9:16',3);
 assert.ok(b.length>=a.length);
 assert.equal(a.map(x=>x.text).join(' '),b.map(x=>x.text).join(' '));
});
test('cue finder uses measured actual speech and fails on missing words',()=>{
 assert.equal(resolveCue(sample,'Bekijk',{after:1,before:3}),1.45);
 assert.throws(()=>resolveCue(sample,'Bekijk',{after:2,before:3}),/not found/);
});
test('scene cues reject missing expected narration in scene windows',()=>{
 const scenes={scenes:[{id:'start',start:0,end:1.3,cue:'Begin'},
  {id:'second',start:1.3,end:3,cue:'Bekijk'}]};
 assert.deepEqual(sceneCues(sample,scenes,'nl').map(x=>x.second),[.1,1.45]);
 scenes.scenes[1].cue='Nonexistent';
 assert.throws(()=>sceneCues(sample,scenes,'nl'),/not found/);
});

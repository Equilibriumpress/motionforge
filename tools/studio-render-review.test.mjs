import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkVideoProbe,reviewFrames} from './studio-render-review.mjs';
const project={format:'16:9',fps:30,durationSeconds:14,
  scenes:[{id:'intro',startSeconds:0,durationSeconds:4},
    {id:'route',startSeconds:4,durationSeconds:6},
    {id:'outro',startSeconds:10,durationSeconds:4}]};
const probe=()=>({format:{duration:'14.000000'},streams:[
  {codec_type:'video',codec_name:'h264',width:1920,height:1080,avg_frame_rate:'30/1',nb_read_frames:'420'}]});
test('measured MP4 must exactly match resolution, duration and frame count',()=>{
 const r=checkVideoProbe(probe(),project);
 assert.equal(r.plannedFrames,420);
 assert.equal(r.frames,420);
 assert.equal(r.audioPresent,false);
});
test('reject wrong format, wrong duration, missing frames or FPS',()=>{
 for(const edit of [
   p=>p.streams[0].width=1080,
   p=>p.format.duration='14.50',
   p=>p.streams[0].nb_read_frames='411',
   p=>p.streams[0].avg_frame_rate='25/1'
 ]){
   const p=probe();edit(p);assert.throws(()=>checkVideoProbe(p,project));
 }
});
test('three real video stills per scene at non-empty positions',()=>{
 const frames=reviewFrames(project);
 assert.equal(frames.length,9);
 assert.ok(frames.every(x=>x.time>=0&&x.time<14));
 assert.deepEqual(frames.filter(x=>x.scene==='route').map(x=>x.kind),['start','middle','end']);
});

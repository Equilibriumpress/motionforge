import {test} from 'node:test';
import assert from 'node:assert/strict';
import {probeCommand,inspectRuntime} from './studio-render-doctor.mjs';
test('doctor reports local runtime truthfully without installing packages',()=>{
 assert.ok(probeCommand(process.execPath,['--version']).includes('v'));
 const report=inspectRuntime({needsHyperFrames:false,needsThree:false,needsAudio:false});
 assert.ok(Array.isArray(report.checks)&&report.checks.some(x=>x.name==='FFmpeg'));
 assert.ok(report.checks.every(c=>typeof c.ok==='boolean'));
});

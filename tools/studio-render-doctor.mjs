#!/usr/bin/env node
/**
 * MF-12D local-only renderer preflight. Does not install packages or invoke render.
 */
import path from 'node:path';
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const runtimeBin=path.join(root,'render-worker','node_modules','.bin',process.platform==='win32'?'hyperframes.cmd':'hyperframes');
export function probeCommand(program,args=['-version']){
  const p=spawnSync(program,args,{encoding:'utf8',timeout:7000});
  return !p.error&&p.status===0?String(p.stdout||p.stderr||'').trim():null;
}
export function inspectRuntime({needsHyperFrames=true,needsThree=false,needsAudio=false}={}){
  const checks=[];
  const check=(name,ok,fix)=>checks.push({name,ok,fix:ok?null:fix});
  check('Node.js >=22',parseInt(process.versions.node,10)>=22,'Install Node.js 22 LTS.');
  check('FFmpeg',!!probeCommand('ffmpeg'),'Install FFmpeg with libx264.');
  check('FFprobe',!!probeCommand('ffprobe'),'Install FFmpeg/ffprobe.');
  if(needsHyperFrames){
    check('Local pinned HyperFrames executable',existsSync(runtimeBin),
      'cd render-worker && npm install --no-audit --no-fund (pinned 0.8.92)');
    check('Local GSAP',existsSync(path.join(root,'studio/node_modules/gsap/dist/gsap.min.js')),
      'cd studio && npm install --no-audit --no-fund');
    check('Chromium or supplied browser',Boolean(
      process.env.CHROME_BIN&&existsSync(process.env.CHROME_BIN)||
      probeCommand('chromium',['--version'])||
      probeCommand('chromium-browser',['--version'])||
      probeCommand('google-chrome',['--version'])||
      existsSync(path.join(root,'render-worker/node_modules/playwright'))),
      'Install Chromium or use a Playwright browser installation. Set CHROME_BIN as necessary.');
  }
  if(needsThree){
    for(const name of ['three','world-atlas','topojson-client','esbuild'])
      check('Three.js dependency '+name,existsSync(path.join(root,'studio/node_modules',name,'package.json')),
        'cd studio && npm install --no-audit --no-fund');
  }
  if(needsAudio){
    check('Python3 for local word alignment',!!probeCommand('python3',['--version']),
      'Install Python 3.10+ and optionally faster-whisper for word-accurate sync.');
  }
  return {ok:checks.every(c=>c.ok),checks,renderBinary:runtimeBin,
    explanation:'Local-only preflight; source checks do not prove successful browser/WebGL rendering.'};
}
const direct=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){
  const flags=new Set(process.argv.slice(2));
  const report=inspectRuntime({needsThree:flags.has('--three'),needsAudio:flags.has('--audio')});
  console.log(JSON.stringify(report,null,2));
  if(!report.ok)process.exitCode=1;
}

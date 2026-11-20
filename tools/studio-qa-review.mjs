#!/usr/bin/env node
/* MF-12E: Render-bound QA runner based on ORIGINAL skills/qa-review/SKILL.md.
 * This writes evidence, never approves G5, G6 or G7. */
import path from 'node:path';
import os from 'node:os';
import {existsSync,createReadStream} from 'node:fs';
import {cp,mkdir,mkdtemp,readFile,rm,writeFile,open} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {prepareHyperFramesSceneAssets} from '../studio/scripts/prepare-video-scene-assets.mjs';
import {prepareGlobeScene} from '../studio/scripts/prepare-globe-scene.mjs';
import {checkVideoProbe,reviewRenderedVideo} from './studio-render-review.mjs';
import {QA_IDS,makePendingChecks,checkRecord,parseBlackFreeze,parseLuminance,
flashBursts,wordBoundaryFindings,wordsPerSecond,SPEECH_PACE,summarizeChecks} from './studio-qa-policy.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const valid=s=>typeof s==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
const safe=s=>typeof s==='string'&&/^[\w./-]+$/.test(s)&&!s.startsWith('/')&&!s.split('/').includes('..');
const run=(cmd,args,timeout=900000)=>{
 const r=spawnSync(cmd,args,{encoding:'utf8',timeout,maxBuffer:64*1024*1024});
 return {ok:!r.error&&r.status===0,output:String(r.stdout||'')+'\n'+String(r.stderr||''),error:r.error?.message||null};
};
export const hashFile=filename=>new Promise((resolve,reject)=>{
 const hash=createHash('sha256'),stream=createReadStream(filename);
 stream.on('data',x=>hash.update(x));stream.on('error',reject);
 stream.on('end',()=>resolve(hash.digest('hex')));
});
export async function faststart(filename){
 const f=await open(filename,'r');
 try{
  const size=(await f.stat()).size;
  let pos=0,mdat=Infinity,moov=Infinity;
  for(let i=0;i<128&&pos+8<=size;i++){
   const b=Buffer.alloc(16),r=await f.read(b,0,16,pos);if(r.bytesRead<8)break;
   let n=b.readUInt32BE(0);const type=b.toString('ascii',4,8);
   if(n===1){if(r.bytesRead<16)break;n=Number(b.readBigUInt64BE(8));}
   else if(n===0)n=size-pos;
   if(n<8||!Number.isSafeInteger(n))break;
   if(type==='moov')moov=pos;
   if(type==='mdat')mdat=pos;
   pos+=n;
  }
  return moov!==Infinity&&mdat!==Infinity&&moov<mdat;
 }finally{await f.close();}
}
export function ebur128(log){
 const i=String(log).lastIndexOf('Summary:');
 if(i<0)return null;
 const s=log.slice(i),a=s.match(/^\s*I:\s*([-+\d.]+)\s*LUFS/m),
  b=s.match(/^\s*Peak:\s*([-+\d.]+)\s*dBFS/m);
 return a&&b?{lufs:Number(a[1]),peak:Number(b[1])}:null;
}
export function reportMd(r){
 const lines=['# QA · '+r.project,'',
  'Render: '+r.render.file+'   sha256: '+r.render.sha256+'   Date: '+r.render.date,
  '| id | status | evidence | note |','|---|---|---|---|'];
 for(const id of Object.values(QA_IDS).flat()){
  const c=r.checks[id];lines.push('| '+id+' | '+c.status+' | '+String(c.evidence||'').replaceAll('|','/')+
   ' | '+String(c.reason||'').replaceAll('|','/')+' |');
 }
 lines.push('','Independent critic: '+r.critic.status,
  'Source code and unreviewed frames are not a visual QA approval.',
  'Re-rendering invalidates this report by SHA-256.','');
 return lines.join('\n');
}
export async function runQa(slug,{video=null,comparison=null,skipBrowser=false}={}){
 if(!valid(slug))throw Error('Invalid project slug');
 const folder=path.join(root,'videos',slug),project=JSON.parse(
  await readFile(path.join(folder,'project.json'),'utf8'));
 const mp4=video?path.resolve(video):path.join(folder,'renders',slug+'.mp4');
 if(!existsSync(mp4))throw Error('No rendered MP4: '+mp4);
 const qa=path.join(folder,'qa');await mkdir(qa,{recursive:true});
 const sha=await hashFile(mp4);
 const r={schemaVersion:1,skill:'skills/qa-review/SKILL.md',project:slug,
  render:{file:path.relative(folder,mp4),sha256:sha,date:new Date().toISOString()},
  checks:makePendingChecks(),critic:{status:'pending',renderSha256:sha,
   freshContextConfirmed:false,unresolvedFixes:null},
  summary:{},note:'Evidence generated; no automatic G5/G6/G7 approval.'};
 const set=(id,status,evidence,reason='')=>r.checks[id]=checkRecord(id,status,evidence,reason);
 const pending=(id,reason,evidence=null)=>r.checks[id]={id,status:'pending',reason,evidence};
 const save=async(name,data)=>{
  await writeFile(path.join(qa,name),String(data));
  return 'qa/'+name;
 };
 const probeRun=run('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',mp4]);
 if(!probeRun.ok)throw Error('ffprobe failed: '+probeRun.output.slice(0,300));
 const probe=JSON.parse(probeRun.output),e=await save('ffprobe.json',JSON.stringify(probe,null,2));
 const v=probe.streams.find(x=>x.codec_type==='video'),a=probe.streams.find(x=>x.codec_type==='audio');
 let validProbe=true,error='';
 try{checkVideoProbe(probe,project)}catch(err){validProbe=false;error=err.message}
 const hasBT709=v?.color_primaries==='bt709'&&v?.color_transfer==='bt709'&&v?.color_space==='bt709';
 const t1=validProbe&&v?.codec_name==='h264'&&v?.pix_fmt==='yuv420p'&&hasBT709&&
   await faststart(mp4)&&(!a||(a.codec_name==='aac'&&Number(a.sample_rate)===48000));
 set('T1',t1?'pass':'fail',e,t1?'':error||'Require H.264 yuv420p BT.709, faststart and AAC 48kHz when voiced.');
 const vd=Number(v?.duration||probe.format?.duration),ad=Number(a?.duration);
 const t2=Number.isFinite(vd)&&(!a||Number.isFinite(ad)&&Math.abs(vd-ad)<=.15);
 set('T2',t2?'pass':'fail',e,t2?'':'Video and audio durations differ by more than 0.15s.');
 const black=run('ffmpeg',['-hide_banner','-nostats','-i',mp4,
   '-vf','blackdetect=d=0.1,freezedetect=n=0.003:d=3','-an','-f','null','-']);
 const be=await save('black-freeze.log',black.output);
 const events=parseBlackFreeze(black.output);
 if(!black.ok)pending('T3','FFmpeg black/freeze analysis unavailable.',be);
 else if(!events.black.length&&!events.freeze.length)set('T3','pass',be);
 else{
   // Original QA permits a frozen/black artistic hold only with a written reason.
   // Explicit exceptions are tied to this render and the exact event timestamps.
   const override=path.join(qa,'accepted-holds.json');
   let acceptance=null;
   if(existsSync(override)){
     try{acceptance=JSON.parse(await readFile(override,'utf8'))}
     catch(err){r.note+=' Invalid accepted-holds JSON: '+err.message}
   }
   const accepted=e=>acceptance?.renderSha256===sha&&
     (acceptance.events||[]).some(x=>Math.abs(x.start-e.start)<.1&&
       typeof x.reason==='string'&&x.reason.trim().length>=8);
   const all=[...events.black,...events.freeze];
   const reason=all.map(e=>acceptance?.events?.find(x=>
     Math.abs(x.start-e.start)<.1)?.reason).filter(Boolean).join('; ');
   set('T3',all.every(accepted)?'warn':'fail',
     all.every(accepted)?'qa/accepted-holds.json':be,
     all.every(accepted)?'Intentional holds reviewed: '+reason:
       'Unexplained black or frozen stretches: '+JSON.stringify(events));
 }
 const signal=run('ffmpeg',['-hide_banner','-nostats','-i',mp4,
   '-vf','signalstats,metadata=print:key=lavfi.signalstats.YAVG','-an','-f','null','-']);
 const se=await save('luminance.log',signal.output),luma=parseLuminance(signal.output),bursts=flashBursts(luma);
 if(!signal.ok||luma.length<2)pending('T4','No usable luminance samples for flash safety.',se);
 else set('T4',bursts.length?'fail':'pass',se,
   bursts.length?'Over three large flashes in 1s: '+JSON.stringify(bursts):'');
 if(comparison){
  const other=path.resolve(comparison);
  if(other===mp4)pending('T5','A second, separately produced render is required.');
  else{
   const checks=[];
   for(const scene of project.scenes.slice(0,8)){
    const t=(scene.startSeconds+scene.durationSeconds*.5).toFixed(3);
    const ff=source=>run('ffmpeg',['-v','error','-ss',t,'-i',source,'-frames:v','1',
      '-f','hash','-hash','SHA256','-']);
    const x=ff(mp4),y=ff(other);
    checks.push({scene:scene.id,t,match:x.ok&&y.ok&&x.output===y.output});
   }
   const proof=await save('determinism.json',JSON.stringify(checks,null,2));
   set('T5',checks.every(x=>x.match)?'pass':'fail',proof,
     checks.every(x=>x.match)?'':'Repeat render frames differ or cannot be decoded.');
  }
 }else pending('T5','Compare a second separately rendered MP4; source-only seeking is not proof.');
 try{
   const board=await reviewRenderedVideo(slug,{mp4});
   if(board.renderSha256!==sha)throw Error('MP4 changed during storyboard extraction.');
 }catch(err){r.note+=' Per-scene storyboard not verified: '+err.message;}
 for(const [name,args] of [['sheet.png',['--every','0.5','--cols','6']],
   ['phone.png',['--every','1','--width','360','--cols','4']]]){
  const result=run('python3',[path.join(root,'tools/contact_sheet.py'),mp4,
    ...args,'--out',path.join(qa,name)]);
  if(!result.ok)r.note+=' '+name+' missing: '+result.output.slice(-180);
 }
 const tmp=await mkdtemp(path.join(os.tmpdir(),'mf-qa-'));
 const textErrors=[],readErrors=[],toolErrors=[];
 try{
  if(!skipBrowser)for(const scene of project.scenes){
   if(!safe(scene.source)){toolErrors.push('Invalid source '+scene.id);continue;}
   const original=path.join(folder,scene.source),staged=path.join(tmp,scene.id);
   try{
    await cp(path.dirname(original),staged,{recursive:true});
    if(scene.engine==='hyperframes'){
      await prepareHyperFramesSceneAssets(staged);
      if((await readFile(path.join(staged,'index.html'),'utf8'))
        .includes('motionforge template: globe-arcs-3d'))
         await prepareGlobeScene(staged,{preview:true});
    }
    const sz=project.format==='16:9'?'1920x1080':
      project.format==='9:16'?'1080x1920':project.format==='1:1'?'1080x1080':'1080x1350';
    const html=path.join(staged,path.basename(original));
    const tx=run(process.execPath,[path.join(root,'tools/textcheck.mjs'),html,'--size',sz,'--root',staged],360000);
    await save('textcheck-'+scene.id+'.log',tx.output);
    if(!tx.ok)textErrors.push(scene.id+': '+tx.output.slice(-180));
    const rd=run(process.execPath,[path.join(root,'tools/readcheck.mjs'),html,
      '--size',sz,'--root',staged,'--ignore','caption','--lead','1.5',
      '--cps','16.7','--min','1.5'],360000);
    await save('readcheck-'+scene.id+'.log',rd.output);
    if(!rd.ok)readErrors.push(scene.id+': '+rd.output.slice(-180));
   }catch(err){toolErrors.push(scene.id+': '+err.message)}
  }
 }finally{await rm(tmp,{recursive:true,force:true})}
 if(skipBrowser||toolErrors.length){
  pending('X1','Browser textcheck not completed: '+(skipBrowser?'explicitly skipped':toolErrors.join('; ')));
  pending('X3','Browser readcheck not completed: '+(skipBrowser?'explicitly skipped':toolErrors.join('; ')));
 }else{
  set('X1',textErrors.length?'fail':'pass','qa/textcheck-*.log',textErrors.join('; '));
  set('X3',readErrors.length?'fail':'pass','qa/readcheck-*.log',readErrors.join('; '));
 }
 for(const [id,description,evidence] of [
  ['X2','Typography/contrast and caption size need visual review.','qa/phone.png'],
  ['X4','Check on-screen glyph coverage against installed font cmap.','qa/phone.png'],
  ['X5','Verify platform safe areas visually.','qa/phone.png'],
  ['X6','Verify cover crop with original cover_safe_area.py.','qa/phone.png'],
  ['X7','Review the exact frame-zero hook.','qa/sheet.png'],
  ['X8','Review the closing frame and 1s hold.','qa/sheet.png'],
  ['X9','Inspect generic styles, varied composition and transitions.','qa/sheet.png'],
  ['X10','Verify originals and third-party asset licenses.','assets/CREDITS.md'],
  ['P4','Inspect static/dead stretches >4 seconds.','qa/sheet.png'],
  ['P5','Match hook promise to ending and spoken hook.','script.md'],
  ['P6','Approve sourced high-risk claims.','script.md'],
  ['P7','Scan forbidden phrases in original script-and-hooks language lists.','script.md'],
  ['P8','Check all captions and display language/register.','qa/phone.png']])
  pending(id,description,evidence);
 const wordsPath=path.join(folder,'audio','words.json');
 if(a&&existsSync(wordsPath)){
  const words=JSON.parse(await readFile(wordsPath,'utf8'));
  const cuts=wordBoundaryFindings(words,project.scenes),
   pace=SPEECH_PACE[(project.language||'en').split('-')[0]]||2.3,
   rates=wordsPerSecond(words,project.scenes,pace);
  const timing=await save('speech-timing.json',JSON.stringify({cuts,rates},null,2));
  set('P2',cuts.length?'fail':'pass',timing,cuts.length?'Scene cut is inside a word.':'');
  set('P3',rates.some(x=>x.over)?'fail':'pass',timing,
    rates.some(x=>x.over)?'Spoken words per second exceed language pace by >10%.':'');
  pending('P1','Compare rendered frames at five actual word cues (tolerance ≤3 frames).',timing);
 }else for(const id of ['P1','P2','P3'])
   a?pending(id,'An audio stream exists but verified audio/words.json is missing.'):
    set(id,'warn',e,'There is no spoken track in this video, so spoken-word checks do not apply.');
 if(!a)for(const id of QA_IDS.audio)
  set(id,'warn',e,'The video has no audio stream; original voice and mix checks do not apply.');
 else{
  const meter=run('ffmpeg',['-hide_banner','-nostats','-i',mp4,'-vn',
    '-af','ebur128=peak=true','-f','null','-']);
  const me=await save('loudness.log',meter.output),n=ebur128(meter.output);
  if(!n)pending('A1','Cannot parse LUFS/true peak from actual audio.',me);
  else set('A1',Math.abs(n.lufs+14)<=1&&n.peak<=-1?'pass':'fail',me,
    Math.abs(n.lufs+14)<=1&&n.peak<=-1?'':'Require −14±1 LUFS and true peak ≤−1 dBTP: '+JSON.stringify(n));
  if(existsSync(wordsPath)){
   const words=JSON.parse(await readFile(wordsPath,'utf8'));
   set('A4',words[0]?.s<=.3?'pass':'fail','audio/words.json',
     words[0]?.s<=.3?'':'First spoken word is later than 0.3s.');
  }else pending('A4','No real measured first-word start.');
  pending('A2','Compare voice and mix parity, speech vs music-only sections.','qa/loudness.log');
  pending('A3','Verify presenter and TTS loudness match when both present.','qa/loudness.log');
  pending('A5','Listen on a phone speaker, then record user confirmation.','qa/phone.png');
 }
 for(const [id,reason] of [
  ['H1','User must watch complete final video on a phone with audio on and off.'],
  ['H2','User must confirm every marked factual claim.'],
  ['H3','User must verify names and number pronunciation.']])
   pending(id,reason,'qa/phone.png');

 // Manual observations and external critic belong to a particular MP4.
 // Reuse them only when SHA matches and their evidence still exists.
 const manual=path.join(qa,'manual-annotations.json');
 if(existsSync(manual)){
  try{
   const record=JSON.parse(await readFile(manual,'utf8'));
   if(record.renderSha256===sha){
    const allowed=new Set(['X2','X4','X5','X6','X7','X8','X9','X10',
      'P1','P4','P5','P6','P7','P8','A2','A3','A5','H1','H2','H3']);
    for(const [id,entry] of Object.entries(record.items||{})){
     if(allowed.has(id)&&entry.evidence&&safe(entry.evidence)&&
       existsSync(path.join(folder,entry.evidence)))
       r.checks[id]=checkRecord(id,entry.status,entry.evidence,entry.reason||'');
    }
   }
  }catch(err){r.note+=' Invalid manual QA annotations: '+err.message;}
 }
 const oldReport=path.join(qa,'report.json'),criticFile=path.join(qa,'critic-review.json');
 if(existsSync(oldReport)&&existsSync(criticFile)){
  try{
   const old=JSON.parse(await readFile(oldReport,'utf8'));
   if(old.render?.sha256===sha&&old.critic?.status==='completed'&&
     old.critic.renderSha256===sha&&old.critic.freshContextConfirmed===true&&
     old.critic.unresolvedFixes===0)r.critic=old.critic;
  }catch(err){r.note+=' Previous critic evidence unreadable: '+err.message;}
 }
 r.summary=summarizeChecks(r.checks);
 await writeFile(path.join(qa,'report.json'),JSON.stringify(r,null,2)+'\n');
 await writeFile(path.join(qa,'report.md'),reportMd(r));
 return r;
}
const direct=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){
 const args=process.argv.slice(2),slug=args[0],opt={};
 for(let i=1;i<args.length;i++){
  if(args[i]==='--skip-browser'){opt.skipBrowser=true;continue}
  if(!['--video','--comparison'].includes(args[i])||!args[i+1])
   throw Error('Usage: studio-qa-review.mjs <slug> [--video file] [--comparison second.mp4] [--skip-browser]');
  opt[args[i].slice(2)]=args[++i];
 }
 runQa(slug,opt).then(r=>{console.log(JSON.stringify({project:slug,sha:r.render.sha256,
   checks:r.summary,report:'qa/report.md'},null,2));if(r.summary.fail)process.exitCode=1})
 .catch(e=>{console.error(e.stack||e.message);process.exitCode=1});
}

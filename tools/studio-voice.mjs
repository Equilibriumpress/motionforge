#!/usr/bin/env node
/**
 * MF-12C: local voice ingestion and original word_timings.py integration.
 * No online service is contacted. No paid voice is synthesized here.
 * Does not approve G2/G3, replace source scripts, or mark a video READY.
 */
import path from 'node:path';
import os from 'node:os';
import {existsSync} from 'node:fs';
import {copyFile,mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const optionsAllowed=new Set(['mode','project','input','script','engine','language','model','license','provider','voice','cost','currency','price-source','rights']);
const assert=(x,m)=>{if(!x)throw Error(m);};
const json=o=>JSON.stringify(o,null,2)+'\n';
const safe=v=>typeof v==='string'&&/^[\w./-]+$/.test(v)&&!v.startsWith('/')&&!v.split('/').includes('..');
const speechTokens=s=>s.trim().split(/\s+/u).filter(Boolean);
const normal=s=>s.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const iso=t=>{const millis=Math.max(0,Math.round(t*1000));return String(Math.floor(millis/3600000)).padStart(2,'0')+':'+String(Math.floor(millis/60000)%60).padStart(2,'0')+':'+String(Math.floor(millis/1000)%60).padStart(2,'0')+','+String(millis%1000).padStart(3,'0');};

export function validateWords(words,duration){
  assert(Array.isArray(words)&&words.length>0,'Recorded voice must have at least one timed word.');
  assert(Number.isFinite(duration)&&duration>0,'Voice duration is invalid.');
  let previousStart=-1;
  for(const [i,w] of words.entries()){
    assert(w&&typeof w.w==='string'&&w.w.trim()&&
      Number.isFinite(w.s)&&Number.isFinite(w.e)&&w.s>=0&&w.e>w.s,
      'Invalid word timing at index '+i);
    assert(w.s>=previousStart-0.001,'Word starts must be chronological.');
    assert(w.e<=duration+0.1,'Word '+i+' exceeds measured voice duration.');
    previousStart=w.s;
  }
  return words;
}

export function alignWords(words,script){
  const desired=speechTokens(script);
  assert(desired.length>0,'No transcript words.');
  const lengthDiff=Math.abs(words.length-desired.length)/desired.length;
  assert(lengthDiff<=0.05,'Word alignment differs from source transcript by more than 5%; review the recording before sync.');
  assert(desired.length===words.length,'Word count mismatch: review and correct the ASR/transcript before sync.');
  const mismatches=words.reduce((n,w,i)=>n+(normal(w.w)!==normal(desired[i])?1:0),0);
  assert(mismatches<=Math.max(1,Math.floor(desired.length*.20)),
    'ASR/transcript mismatch exceeds 20%; manual correction required.');
  return words.map((w,i)=>({...w,w:desired[i]}));
}

export function createCaptionChunks(words,format,duration){
  validateWords(words,duration);
  assert(['16:9','9:16','1:1','4:5'].includes(format),'Unsupported caption aspect ratio.');
  const vertical=format!=='16:9',limit=vertical?24:42,maxWords=vertical?4:8;
  const captions=[];
  let segment=[];
  const commit=()=>{
    if(!segment.length)return;
    const first=segment[0],last=segment[segment.length-1];
    captions.push({start:first.s,end:last.e,text:segment.map(x=>x.w).join(' ')});
    segment=[];
  };
  for(const w of words){
    const next=[...segment,w],value=next.map(x=>x.w).join(' ');
    if(segment.length&&(value.length>limit||next.length>maxWords))commit();
    segment.push(w);
    if(/[.!?…]$/u.test(w.w)&&segment.length>=2)commit();
  }
  commit();
  // Min 0.6s readability: merge short fragments where possible; never overlap.
  for(let i=captions.length-1;i>0;i--){
    const c=captions[i],before=captions[i-1],combined=before.text+' '+c.text;
    if(c.end-c.start<.6&&combined.length<=limit*2){
      before.end=c.end;before.text=combined;captions.splice(i,1);
    }
  }
  for(let i=0;i<captions.length;i++){
    const c=captions[i],next=captions[i+1];
    c.end=Math.min(duration,next?next.start:duration,Math.max(c.end,c.start+.6));
    assert(c.end>c.start,'Caption '+i+' has no readable duration.');
    if(next)assert(c.end<=next.start+.001,'Caption chunks may not overlap.');
  }
  return captions;
}
export function captionsSrt(captions){
  return captions.map((c,i)=>String(i+1)+'\n'+iso(c.start)+' --> '+iso(c.end)+'\n'+c.text+'\n').join('\n')+'\n';
}
export function resolveCue(words,prefix,{after=0,before=Infinity,locale='nl'}={}){
  assert(typeof prefix==='string'&&prefix.trim(),'Cue prefix is required.');
  const want=prefix.trim().toLocaleLowerCase(locale);
  const hit=words.find(w=>w.s>=after-.01&&w.s<before&&
    w.w.replace(/^["“'«]/u,'').toLocaleLowerCase(locale).startsWith(want));
  assert(hit,'Cue word not found in the actual recording: '+prefix+' (after '+after+'s).');
  return hit.s;
}
export function sceneCues(words,direction,language){
  assert(Array.isArray(direction?.scenes),'direction.json with scenes required.');
  return direction.scenes.map(s=>{
    assert(Number.isFinite(s.start)&&Number.isFinite(s.end)&&s.end>s.start,
      'A scene must have start/end seconds.');
    return {id:s.id,word:s.cue,second:resolveCue(words,s.cue,{
      after:s.start,before:s.end,locale:language||'nl'}),window:[s.start,s.end]};
  });
}
function run(program,args,cwd=root){
  const r=spawnSync(program,args,{cwd,encoding:'utf8',timeout:15*60*1000});
  if(r.error||r.status!==0)throw Error(program+' failed: '+(r.stderr||r.error?.message||r.stdout||r.status).slice(0,1700));
  return r.stdout;
}
function options(argv){
  const result={};
  for(let i=0;i<argv.length;i++){
    assert(argv[i].startsWith('--')&&optionsAllowed.has(argv[i].slice(2)),
      'Unknown option: '+argv[i]);
    const name=argv[i].slice(2);
    assert(argv[i+1]&&!argv[i+1].startsWith('--'),'Missing value for '+argv[i]);
    result[name]=argv[++i];
  }
  return result;
}

export async function prepareVoice(argv){
  const o=options(argv);
  assert(SLUG.test(o.project||''),'Supply --project <slug>.');
  assert(['none','recorded','local-tts','paid-plan'].includes(o.mode),'Choose --mode none|recorded|local-tts|paid-plan.');
  const folder=path.join(root,'videos',o.project);
  const project=JSON.parse(await readFile(path.join(folder,'project.json'),'utf8'));
  const production=JSON.parse(await readFile(path.join(folder,'production.json'),'utf8'));
  const existing=path.join(folder,'audio','voice-plan.json');
  assert(!existsSync(existing),'Voice plan already exists. Preserve the previous audio decision and use a revision.');
  const info={schemaVersion:1,mode:o.mode,engine:null,source:null,
    status:'selected',costApproved:false,wordTiming:'none',
    scriptApproved:production.gates?.G2?.status==='passed'};
  if(o.mode==='paid-plan'){
    assert(production.gates?.G2?.status==='passed',
      'An approved G2 script is required before quoting any paid voice plan.');
    assert(o.provider&&o.voice&&o['price-source']&&Number.isFinite(Number(o.cost))&&Number(o.cost)>=0&&o.currency,
      'Paid-plan requires provider, voice, cost, currency and verified price-source.');
    assert(o.script&&existsSync(path.resolve(o.script)),'Paid voice cost needs a finalized text file.');
    const transcript=await readFile(path.resolve(o.script),'utf8');
    assert(speechTokens(transcript).length>0,'No text for cost calculation.');
    Object.assign(info,{status:'awaiting-G3-user-approval',provider:o.provider,voice:o.voice,
      estimatedCost:Number(o.cost),currency:o.currency,priceSource:o['price-source'],
      characters:transcript.length,
      note:'Plan only. No paid API call was made; retakes require separate budget.'});
    await mkdir(path.join(folder,'audio'),{recursive:true});
    await writeFile(existing,json(info));
    return info;
  }
  if(o.mode==='none'){
    Object.assign(info,{status:'no-voice',note:'Silent video. No word timestamps exist; all scene cue timings are provisional.'});
    await mkdir(path.join(folder,'audio'),{recursive:true});
    await writeFile(existing,json(info));
    return info;
  }
  assert(production.gates?.G2?.status==='passed',
    'G2 script approval required before preparing recorded or local TTS timing.');
  assert(o.input&&existsSync(path.resolve(o.input)),'Supply a local voice file with --input.');
  assert(o.script&&existsSync(path.resolve(o.script)),'Supply exactly spoken text via --script.');
  assert(o.rights==='confirmed','Confirm user owns/has permission to use the voice: --rights confirmed.');
  if(o.mode==='local-tts'){
    assert(o.model&&o.license&&existsSync(path.resolve(o.license)),
      'Local TTS needs its model name and a local license file.');
    const licenseText=await readFile(path.resolve(o.license),'utf8');
    assert(licenseText.trim().length>10,'A readable local TTS model license is required.');
    info.model=o.model;info.modelLicense='audio/local-tts-model-license.txt';
  }
  const lang=o.language||project.language;
  assert(/^[a-z]{2}(?:-[A-Z]{2})?$/.test(lang),'Language must be an ISO code.');
  const engine=o.engine||'words';
  assert(['words','segments'].includes(engine),'Choose words (real Whisper timings) or explicit segments (estimated).');
  // faster-whisper auto-downloads model names such as "small": never do that
  // without permission. Require a previously installed local ASR model.
  if(engine==='words')assert(o.model&&existsSync(path.resolve(o.model)),
    'Word-accurate ASR requires --model /existing/local/faster-whisper-model. No automatic model downloads.');
  const stage=await mkdtemp(path.join(os.tmpdir(),'mf-voice-'));
  try{
    const text=await readFile(path.resolve(o.script),'utf8');
    assert(speechTokens(text).length>0,'Script text is empty.');
    await writeFile(path.join(stage,'tts.txt'),text);
    run('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',path.resolve(o.input),
      '-vn','-ac','1','-ar','48000','-c:a','pcm_s16le',path.join(stage,'voice.wav')]);
    const prob=run('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nk=1:nw=1',
      path.join(stage,'voice.wav')]).trim();
    const duration=Number(prob);
    assert(Number.isFinite(duration)&&duration>0,'Voice has no measurable audio.');
    assert(duration<=project.durationSeconds+.05,
      'Voice is longer than video: '+duration+'s > '+project.durationSeconds+'s. Edit script or extend scenes.');
    const language=lang.split('-')[0];
    run('python3',[path.join(root,'tools/word_timings.py'),path.join(stage,'voice.wav'),
      '--out',path.join(stage,'words-raw.json'),'--segments-out',path.join(stage,'segments.json'),
      '--text',path.join(stage,'tts.txt'),'--language',language,'--engine',engine,
      ...(engine==='words'?['--model',path.resolve(o.model)]:[])]);
    const raw=JSON.parse(await readFile(path.join(stage,'words-raw.json'),'utf8'));
    const words=alignWords(validateWords(raw,duration),text);
    const captions=createCaptionChunks(words,project.format,duration);
    const direction=JSON.parse(await readFile(path.join(folder,'direction.json'),'utf8'));
    const cues=sceneCues(words,direction,lang); // Fail if a requested word cue is missing.
    await writeFile(path.join(stage,'words.json'),json(words));
    await writeFile(path.join(stage,'captions.srt'),captionsSrt(captions));
    await writeFile(path.join(stage,'scene-cues.json'),json(cues));
    Object.assign(info,{status:engine==='words'?'timed-review-required':'estimated-review-required',
      engine,source:o.mode==='recorded'?'user-recording':'licensed-local-tts',
      durationSeconds:duration,language:lang,
      wordTiming:engine==='words'?'ASR-word':'segment-estimates',
      wordCount:words.length,captionCount:captions.length,
      note:'User must listen, approve words and cues. Audio itself does not pass G3 or G5–G7.'});
    await mkdir(path.join(folder,'audio'),{recursive:true});
    for(const file of ['voice.wav','tts.txt','words.json','segments.json','captions.srt','scene-cues.json'])
      await copyFile(path.join(stage,file),path.join(folder,'audio',file));
    if(o.mode==='local-tts')
      await copyFile(path.resolve(o.license),path.join(folder,'audio','local-tts-model-license.txt'));
    await writeFile(existing,json(info));
    return info;
  }finally{await rm(stage,{recursive:true,force:true});}
}
const direct=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct)prepareVoice(process.argv.slice(2)).then(o=>console.log(json(o))).catch(e=>{
  console.error(e.message);process.exitCode=1;
});

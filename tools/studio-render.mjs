#!/usr/bin/env node
// Local MotionForge Studio video render. Requires Node 22, FFmpeg and scene engines.
// Source stays in videos/<slug>. Output goes only to videos/<slug>/renders/.
import {existsSync} from 'node:fs';
import {copyFile, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sizes={'16:9':[1920,1080],'9:16':[1080,1920],'1:1':[1080,1080],'4:5':[1080,1350]};
const slug=process.argv[2];
const validSlug=value=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value||'');
const validPath=value=>typeof value==='string'&&/^[a-zA-Z0-9_./-]+$/.test(value)&&
  !value.startsWith('/')&&!value.split('/').includes('..');
if(!validSlug(slug))throw Error('Use node tools/studio-render.mjs <slug> [--dry-run] [--quality draft|final] [--formats 9:16,1:1] [--audio audio/voice.wav] [--overwrite]');
const flags=new Map();
const args=process.argv.slice(3);
for(let i=0;i<args.length;i++){
  const value=args[i];
  if(!value.startsWith('--'))throw Error('Unknown argument: '+value);
  const key=value.slice(2);
  if(['dry-run','overwrite'].includes(key)){flags.set(key,true);continue;}
  if(!['quality','formats','audio'].includes(key)||!args[i+1]||args[i+1].startsWith('--'))throw Error('Invalid option '+value);
  flags.set(key,args[++i]);
}
const dry=flags.has('dry-run'),quality=flags.get('quality')||'final';
if(!['draft','final'].includes(quality))throw Error('Quality must be draft or final');
const extra=flags.get('formats')?.split(',').filter(Boolean)||[];
if(extra.some(value=>!sizes[value]))throw Error('Unknown output format');
const audio=flags.get('audio');
if(audio&&(!validPath(audio)||!audio.startsWith('audio/')))throw Error('Audio must be inside audio/');
const root=path.join(repo,'videos',slug);
const project=JSON.parse(await readFile(path.join(root,'project.json'),'utf8'));
if(project.schemaVersion!==1||project.id!==slug||!sizes[project.format])throw Error('Invalid project');
const fps=project.fps, total=Math.round(project.durationSeconds*fps);
if(!Number.isInteger(fps)||fps<12||fps>120||!Number.isFinite(total)||total<1)throw Error('Invalid timeline');
if(!Array.isArray(project.scenes)||!project.scenes.length)throw Error('No scenes');
const [w,h]=sizes[project.format], ordered=[...project.scenes].sort((a,b)=>a.startSeconds-b.startSeconds);
const shots=[];
let position=0;
for(const scene of ordered){
  if(!['canvas','hyperframes'].includes(scene.engine))throw Error('Use browser renderer for Remotion; local CLI supports Canvas/HyperFrames.');
  if(!validPath(scene.source)||!scene.source.startsWith('scenes/')||!scene.source.endsWith('.html'))throw Error('Unsafe source path');
  if(!Number.isFinite(scene.startSeconds)||scene.startSeconds<0||!Number.isFinite(scene.durationSeconds)||scene.durationSeconds<=0)throw Error('Invalid scene duration');
  const at=Math.round(scene.startSeconds*fps),frames=Math.round(scene.durationSeconds*fps);
  if(frames<1)throw Error('Scene shorter than one frame');
  if(at<position)throw Error('Overlapping scenes: '+scene.id);
  if(at>position)shots.push({type:'gap',frames:at-position});
  const source=path.join(root,scene.source);
  if(!existsSync(source))throw Error('Missing scene: '+scene.source);
  shots.push({type:scene.engine,id:scene.id,source,frames});
  position=at+frames;
}
if(position>total)throw Error('Scenes exceed project duration');
if(position<total)shots.push({type:'gap',frames:total-position});
if(audio&&!existsSync(path.join(root,audio)))throw Error('Missing audio file '+audio);
const outputDir=path.join(root,'renders'),master=path.join(outputDir,slug+'.mp4');
if(existsSync(master)&&!dry&&!flags.has('overwrite'))throw Error('Output exists; rerun with --overwrite');
console.log('Project '+slug+' · '+w+'×'+h+' · '+fps+' fps');
console.log(shots.map(s=>s.type==='gap'?'GAP '+s.frames+'f':s.id+' ['+s.type+'] '+s.frames+'f').join(' → '));
console.log('Master: '+master);
if(dry){console.log('Dry-run succeeded, no renderer invoked.');process.exit(0);}
async function run(command,args,cwd=repo){
  console.log('$ '+command+' '+args.join(' '));
  await new Promise((resolve,reject)=>{
    const p=spawn(command,args,{cwd,stdio:'inherit'});
    p.on('error',reject);
    p.on('close',status=>status===0?resolve():reject(Error(command+' exited '+status)));
  });
}
const temp=await mkdtemp(path.join(os.tmpdir(),'mf-studio-'));
try{
  await mkdir(outputDir,{recursive:true});
  const segments=[];
  let index=0;
  for(const shot of shots){
    const label=String(++index).padStart(3,'0');
    const normalized=path.join(temp,label+'.mp4');
    const crf=quality==='draft'?'27':'18';
    if(shot.type==='gap'){
      await run('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','lavfi','-i',
        'color=c=0x0d1822:s='+w+'x'+h+':r='+fps,'-frames:v',String(shot.frames),'-c:v','libx264',
        '-preset','veryfast','-crf',crf,'-pix_fmt','yuv420p',normalized]);
    }else{
      const raw=path.join(temp,label+'-raw.mp4');
      if(shot.type==='canvas'){
        await run(process.execPath,[path.join(repo,'engines/canvas/render.mjs'),'video',
          path.dirname(shot.source),'--fps',String(fps),'--workers','2','--out',raw]);
      }else{
        await run('npx',['--yes','hyperframes@0.8.92','render','-c',path.basename(shot.source),
          '-o',raw,'--fps',String(fps),...(quality==='draft'?['-q','draft']:[])],path.dirname(shot.source));
      }
      const filter='fps='+fps+',scale='+w+':'+h+':force_original_aspect_ratio=decrease,'+
        'pad='+w+':'+h+':(ow-iw)/2:(oh-ih)/2,setsar=1,'+
        'tpad=stop_mode=clone:stop_duration='+(shot.frames/fps)+
        ',trim=end_frame='+shot.frames+',setpts=PTS-STARTPTS';
      await run('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',raw,'-vf',filter,
        '-an','-r',String(fps),'-c:v','libx264','-preset','veryfast','-crf',crf,
        '-pix_fmt','yuv420p','-frames:v',String(shot.frames),normalized]);
    }
    segments.push(normalized);
  }
  const concat=path.join(temp,'files.txt');
  await writeFile(concat,segments.map(file=>"file '"+file.replaceAll("'","'\\''")+"'").join('\n')+'\n');
  const silent=path.join(temp,'joined.mp4');
  await run('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',concat,
    '-c','copy','-movflags','+faststart',silent]);
  if(audio){
    await run('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',silent,'-i',path.join(root,audio),
      '-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-af','apad',
      '-t',String(total/fps),'-movflags','+faststart',master]);
  }else await copyFile(silent,master);
  if(validPath(project.cover)&&existsSync(path.join(root,project.cover))){
    await copyFile(path.join(root,project.cover),path.join(outputDir,slug+'-cover'+path.extname(project.cover)));
  }
  if(existsSync(path.join(root,'audio/subtitles.srt'))){
    await copyFile(path.join(root,'audio/subtitles.srt'),path.join(outputDir,slug+'.srt'));
  }
  if(extra.length){
    await run(process.execPath,[path.join(repo,'tools/export.mjs'),master,
      '--formats',extra.join(','),'--mode','fill','--out',outputDir]);
  }
  console.log('Saved '+master);
}finally{await rm(temp,{recursive:true,force:true});}

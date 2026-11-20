#!/usr/bin/env node
/**
 * MF-12D: ffprobe-verified MP4 and G5/G6 storyboard evidence.
 * Produces files for human review. Does not approve any gate.
 */
import path from 'node:path';
import {existsSync} from 'node:fs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sizes={'9:16':[1080,1920],'16:9':[1920,1080],'1:1':[1080,1080],'4:5':[1080,1350]};
const slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function run(cmd,args){
  const p=spawnSync(cmd,args,{encoding:'utf8',timeout:15*60*1000});
  if(p.error||p.status!==0)throw Error(cmd+' failed: '+(p.stderr||p.error?.message||'').slice(0,1800));
  return p.stdout;
}
export function checkVideoProbe(probe,project){
  const video=probe.streams?.find(x=>x.codec_type==='video');
  if(!video)throw Error('MP4 has no video stream.');
  const dims=sizes[project.format];
  if(!dims||video.width!==dims[0]||video.height!==dims[1])
    throw Error('Rendered video size differs from native output '+project.format+'.');
  const frac=(video.avg_frame_rate||'0/1').split('/').map(Number);
  const rate=frac[1]?frac[0]/frac[1]:0;
  if(Math.abs(rate-project.fps)>.025)throw Error('Frame rate differs from project FPS.');
  const duration=Number(probe.format?.duration);
  if(!Number.isFinite(duration)||Math.abs(duration-project.durationSeconds)>Math.max(.07,2/project.fps))
    throw Error('MP4 duration does not match planned runtime.');
  const wanted=Math.round(project.durationSeconds*project.fps);
  const actual=Number(video.nb_read_frames||video.nb_frames);
  if(Number.isFinite(actual)&&actual>0&&Math.abs(actual-wanted)>1)
    throw Error('Incorrect video frame count: '+actual+' instead of '+wanted);
  return {width:video.width,height:video.height,fps:rate,durationSeconds:duration,
    frames:Number.isFinite(actual)&&actual>0?actual:null,plannedFrames:wanted,
    codec:video.codec_name,audioPresent:probe.streams.some(x=>x.codec_type==='audio')};
}
export function reviewFrames(project){
  const scenes=[...project.scenes].sort((a,b)=>a.startSeconds-b.startSeconds);
  return scenes.flatMap(s=>[.18,.5,.82].map((part,i)=>({
    scene:s.id,kind:['start','middle','end'][i],
    time:Math.min(project.durationSeconds-.05,s.startSeconds+s.durationSeconds*part)
  })));
}
export async function reviewRenderedVideo(projectSlug,{mp4=null,expectAudio=false}={}){
  if(!slug.test(projectSlug||''))throw Error('Invalid project slug.');
  const dir=path.join(root,'videos',projectSlug);
  const project=JSON.parse(await readFile(path.join(dir,'project.json'),'utf8'));
  const video=mp4?path.resolve(mp4):path.join(dir,'renders',projectSlug+'.mp4');
  if(!existsSync(video))throw Error('Rendered MP4 does not exist: '+video);
  const result=JSON.parse(run('ffprobe',['-v','error','-count_frames','-show_entries',
    'format=duration:stream=index,codec_type,codec_name,width,height,avg_frame_rate,nb_read_frames,nb_frames',
    '-of','json',video]));
  const measured=checkVideoProbe(result,project);
  if(expectAudio&&!measured.audioPresent)
    throw Error('Voice was requested but the rendered MP4 contains no audio stream.');
  const frames=reviewFrames(project);
  const board=path.join(dir,'qa','board');
  await mkdir(board,{recursive:true});
  const stills=[];
  for(const [i,x] of frames.entries()){
    const filename=String(i+1).padStart(3,'0')+'-'+x.scene+'-'+x.kind+'.png';
    const target=path.join(board,filename);
    run('ffmpeg',['-y','-hide_banner','-loglevel','error',
      '-ss',x.time.toFixed(3),'-i',video,'-frames:v','1',
      '-vf','scale=480:-2',target]);
    if(!existsSync(target))throw Error('Failed to extract still '+filename);
    stills.push({scene:x.scene,kind:x.kind,time:x.time,file:'qa/board/'+filename});
  }
  const sheet=path.join(dir,'qa','contact-sheet.png');
  run('ffmpeg',['-y','-hide_banner','-loglevel','error','-framerate','1',
    '-pattern_type','glob','-i',path.join(board,'*.png'),
    '-vf','tile=4x'+Math.ceil(frames.length/4),'-frames:v','1',sheet]);
  if(!existsSync(sheet))throw Error('Could not produce contact sheet.');
  const report={source:'actual-rendered-mp4',mp4:path.relative(dir,video),
    measured,stills,contactSheet:'qa/contact-sheet.png',
    humanApproval:false,independentCritic:false,
    gates:['G5','G6','G7'],note:'Evidence for inspection, NOT an approved or QA-passed video.'};
  await writeFile(path.join(dir,'qa','render-report.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}
const direct=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct)reviewRenderedVideo(process.argv[2],{mp4:process.argv[3]}).then(r=>
  console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});

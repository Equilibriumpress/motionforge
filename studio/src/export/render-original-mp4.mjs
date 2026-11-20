/**
 * MF-12F: real, user-authorized in-browser MP4 of original HyperFrames/Canvas HTML.
 *
 * An arbitrary cross-origin/opaque iframe cannot be drawn into Canvas directly.
 * User selects THIS TAB in getDisplayMedia. We hide the Studio UI behind a full-
 * viewport original-scene player, seek each scene using the existing MF_PREVIEW
 * bridge, and capture the composited DOM + WebGL pixels. Mediabunny encodes the
 * resulting Canvas frames in H.264/MP4 locally, without external services.
 *
 * No auto-approval of G1–G7, text/safe-area QA or independent critic.
 */
import {exportPlan,frameAt,sampleFrames,captureCrop} from './hyperframes-plan.mjs';

const PROTOCOL='MF_PREVIEW';
const CALIBRATION=[38,74,104];
const cancelError=()=>new DOMException('MP4-rendering geannuleerd.','AbortError');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const afterPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
function checkAbort(signal,track){
  if(signal?.aborted)throw cancelError();
  if(track?.readyState==='ended')throw Error('Schermdeling is beëindigd voordat de MP4 klaar was.');
}
function screenSupported(){
 return !!(window.isSecureContext&&navigator.mediaDevices?.getDisplayMedia&&
   window.VideoEncoder&&window.VideoFrame&&HTMLCanvasElement.prototype.toBlob);
}
export function browserExportSupport(){
 if(!window.isSecureContext)
   return {ok:false,message:'Browserexport werkt alleen via HTTPS.'};
 if(!navigator.mediaDevices?.getDisplayMedia)
   return {ok:false,message:'Deze browser ondersteunt geen tabbladopname. Probeer Chrome of Edge op desktop.'};
 if(!window.VideoEncoder||!window.VideoFrame)
   return {ok:false,message:'WebCodecs H.264 is hier niet beschikbaar. Gebruik de lokale render-worker.'};
 return {ok:true,message:'Browserexport mogelijk. Kies bij schermdeling “Dit tabblad”.'};
}
const sizeToStage=(box,aspect)=>{
 const vw=window.innerWidth,vh=window.innerHeight;
 const width=Math.min(vw,vh*aspect),height=width/aspect;
 Object.assign(box.style,{width:width+'px',height:height+'px',margin:'0',flex:'none',
   position:'relative',overflow:'hidden'});
};
function overlayFor(plan,signal){
 const overlay=document.createElement('div');
 overlay.setAttribute('aria-label','MotionForge: originele scène opnemen');
 overlay.dataset.mfExport='active';
 Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'2147483647',
   display:'flex',alignItems:'center',justifyContent:'center',
   background:'rgb(38,74,104)',overflow:'hidden',padding:'0',margin:'0'});
 const stage=document.createElement('div');
 stage.style.display='none';
 overlay.appendChild(stage);
 document.body.appendChild(overlay);
 const aspect=plan.nativeWidth/plan.nativeHeight;
 const resize=()=>sizeToStage(stage,aspect);
 resize();window.addEventListener('resize',resize);
 const original=document.title;
 const stop=event=>{if(event.key==='Escape')signal?.abort?.()};
 window.addEventListener('keydown',stop);
 return {
  overlay,stage,
  begin(){overlay.style.background='#000';stage.style.display='block';resize()},
  label(text){document.title='MF · '+text},
  close(){document.title=original;window.removeEventListener('resize',resize);
   window.removeEventListener('keydown',stop);overlay.remove()}
 };
}
function awaitMessage(iframe,kind,requestId=null,signal,timeout=20000){
 return new Promise((resolve,reject)=>{
  let finished=false;
  const dispose=()=>{window.removeEventListener('message',onMessage);
    signal?.removeEventListener('abort',onAbort);clearTimeout(timer)};
  const finish=(error,data)=>{if(finished)return;finished=true;dispose();
    if(error)reject(error);else resolve(data)};
  const onAbort=()=>finish(cancelError());
  const onMessage=event=>{
   if(event.source!==iframe.contentWindow||event.data?.type!==PROTOCOL)return;
   const msg=event.data;
   if(msg.kind==='error')return finish(Error(msg.message||'Originele scène kon niet worden geladen.'));
   if(msg.kind===kind&&(requestId===null||msg.requestId===requestId))
     finish(null,msg);
  };
  const timer=setTimeout(()=>finish(Error('Scène heeft niet op tijd een origineel frame bevestigd.')),timeout);
  window.addEventListener('message',onMessage);
  signal?.addEventListener('abort',onAbort,{once:true});
  if(signal?.aborted)onAbort();
 });
}
async function switchScene(stage,scene,baseUrl,signal){
 const iframe=document.createElement('iframe');
 iframe.setAttribute('title','MotionForge render: '+scene.title);
 iframe.setAttribute('sandbox','allow-scripts');
 iframe.setAttribute('referrerpolicy','no-referrer');
 Object.assign(iframe.style,{display:'block',width:'100%',height:'100%',border:'0',
   background:'#000'});
 const ready=awaitMessage(iframe,'ready',null,signal,30000);
 stage.replaceChildren(iframe);
 iframe.src=baseUrl+scene.source;
 await ready;
 return iframe;
}
async function seekScene(iframe,seconds,requestId,signal){
 const ack=awaitMessage(iframe,'frame',requestId,signal,12000);
 iframe.contentWindow.postMessage({type:PROTOCOL,kind:'seek',seconds,requestId},'*');
 await ack;
}
// Await a fresh captured tab frame (even when the seeked source is a WebGL canvas).
function capturedPaint(video,signal){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted)return reject(cancelError());
  let completed=false;
  const finish=()=>{if(completed)return;completed=true;
    signal?.removeEventListener('abort',abort);clearTimeout(timer);resolve()};
  const abort=()=>{if(completed)return;completed=true;clearTimeout(timer);
    signal?.removeEventListener('abort',abort);reject(cancelError())};
  signal?.addEventListener('abort',abort,{once:true});
  // Screen-capture tracks are sometimes static. The fallback prevents stalls.
  const timer=setTimeout(finish,90);
  if(typeof video.requestVideoFrameCallback==='function')
    video.requestVideoFrameCallback(()=>finish());
  else requestAnimationFrame(()=>requestAnimationFrame(finish));
 });
}
async function calibrationOK(video){
 const canvas=document.createElement('canvas');
 canvas.width=canvas.height=2;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 for(let i=0;i<12;i++){
  if(video.readyState>=2&&video.videoWidth>0){
   ctx.drawImage(video,video.videoWidth*.45,video.videoHeight*.45,
     video.videoWidth*.1,video.videoHeight*.1,0,0,2,2);
   const p=ctx.getImageData(1,1,1,1).data;
   if(CALIBRATION.every((v,j)=>Math.abs(v-p[j])<34))return true;
  }
  await pause(120);
 }
 return false;
}
function drawCurrent(video,stage,canvas){
 const crop=captureCrop(video.videoWidth,video.videoHeight,
   window.innerWidth,window.innerHeight,stage.getBoundingClientRect());
 const ctx=canvas.getContext('2d',{alpha:false});
 ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.drawImage(video,crop.x,crop.y,crop.width,crop.height,0,0,canvas.width,canvas.height);
}
const blobCanvas=(canvas,type='image/png')=>new Promise((resolve,reject)=>{
 canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Browser kon het beeld niet exporteren.')),type);
});
function sheetCanvas(plan,frames){
 const cellW=320,cellH=Math.round(cellW*plan.height/plan.width),label=26,cols=4;
 const rows=Math.ceil(frames.length/cols);
 const sheet=document.createElement('canvas');
 sheet.width=cols*cellW;sheet.height=rows*(cellH+label);
 const ctx=sheet.getContext('2d',{alpha:false});
 ctx.fillStyle='#0f1921';ctx.fillRect(0,0,sheet.width,sheet.height);
 return {sheet,add(canvas,index,frame){
  const x=index%cols*cellW,y=Math.floor(index/cols)*(cellH+label);
  ctx.drawImage(canvas,x,y+label,cellW,cellH);
  ctx.fillStyle='#122030';ctx.fillRect(x,y,cellW,label);
  ctx.fillStyle='#fff';ctx.font='14px sans-serif';
  ctx.fillText(frameAt(plan,frame).sceneId+' · '+(frame/plan.fps).toFixed(2)+'s',x+8,y+18);
 }};
}
async function decodeAudio(file,seconds){
 if(!file)return null;
 const Context=window.AudioContext||window.webkitAudioContext;
 if(!Context)throw Error('Audio import niet beschikbaar in deze browser.');
 const context=new Context({sampleRate:48000});
 try{
  const decoded=await context.decodeAudioData(await file.arrayBuffer());
  if(decoded.duration>seconds+.15)
   throw Error('Geluid duurt langer dan de video. Pas de audio eerst aan.');
  const samples=Math.round(seconds*48000);
  const padded=context.createBuffer(Math.min(2,decoded.numberOfChannels),samples,48000);
  for(let i=0;i<padded.numberOfChannels;i++)
   padded.getChannelData(i).set(decoded.getChannelData(i).subarray(0,samples));
  return padded;
 }finally{await context.close()}
}
export async function renderOriginalMp4(manifest,{
 quality='draft',audioFile=null,subtitleFile=null,onProgress=()=>{},controller=new AbortController()
}={}){
 const plan=exportPlan(manifest,{quality});
 if(!screenSupported())throw Error(browserExportSupport().message);
 const abort=controller;
 const screen=overlayFor(plan,abort);
 let stream=null,video=null,output=null,source=null,audioSource=null,audioTask=null;
 try{
  // This call MUST be made synchronously in the user click handler.
  // Browsers reject display capture after the transient user gesture expires.
  const capturePromise=navigator.mediaDevices.getDisplayMedia({
   video:{displaySurface:'browser',frameRate:{ideal:30}},
   audio:false,preferCurrentTab:true,selfBrowserSurface:'include',
   surfaceSwitching:'exclude'
  });
  stream=await capturePromise;
  const track=stream.getVideoTracks()[0];
  if(!track)throw Error('Geen videobron geselecteerd.');
  if(track.getSettings()?.displaySurface&&track.getSettings().displaySurface!=='browser')
   throw Error('Selecteer “Dit tabblad”, geen volledig scherm of ander venster.');
  checkAbort(abort.signal,track);
  video=document.createElement('video');
  video.muted=true;video.playsInline=true;video.srcObject=stream;
  // Not inserted in DOM: no recursive screen-share mirror appears in captured tab.
  await video.play();
  if(!await calibrationOK(video))
   throw Error('Het verkeerde tabblad is geselecteerd. Kies bij opname “Dit tabblad”.');
  screen.begin();
  // Module is bundled with Pages; no network render service or API key.
  const {Output,Mp4OutputFormat,BufferTarget,CanvasSource,AudioBufferSource,Quality}
    =await import('mediabunny');
  const config={codec:'avc',quality:new Quality(quality==='final'?'high':'medium')};
  const canvas=document.createElement('canvas');
  canvas.width=plan.width;canvas.height=plan.height;
  const target=new BufferTarget();
  output=new Output({format:new Mp4OutputFormat(),target});
  source=new CanvasSource(canvas,config);
  output.addVideoTrack(source,{frameRate:plan.fps});
  const audio=await decodeAudio(audioFile,plan.durationSeconds);
  if(audio){
   audioSource=new AudioBufferSource({codec:'aac',quality:new Quality('high')});
   output.addAudioTrack(audioSource);
  }
  output.setMetadataTags({title:plan.title,description:'MotionForge original HTML/GSAP/Three.js scene capture'});
  await output.start();
  if(audio)audioTask=audioSource.add(audio); // concurrently produce the two MP4 tracks
  const picks=sampleFrames(plan),selected=new Map(picks.map((f,i)=>[f,i]));
  const sheet=sheetCanvas(plan,picks);
  let coverBlob=null,active=null,iframe=null;
  const base=import.meta.env.BASE_URL;
  for(let frame=0;frame<plan.frameCount;frame++){
   checkAbort(abort.signal,track);
   const moment=frameAt(plan,frame);
   if(moment.sceneId!==active){
    iframe=await switchScene(screen.stage,moment.scene,base,abort.signal);
    active=moment.sceneId;
   }
   await seekScene(iframe,moment.localSeconds,'frame-'+frame,abort.signal);
   await capturedPaint(video,abort.signal);
   checkAbort(abort.signal,track);
   drawCurrent(video,screen.stage,canvas);
   if(frame===0)coverBlob=await blobCanvas(canvas);
   if(selected.has(frame))sheet.add(canvas,selected.get(frame),frame);
   await source.add(frame/plan.fps,1/plan.fps,{keyFrame:frame%plan.fps===0});
   if(frame%10===0||frame===plan.frameCount-1){
    screen.label(Math.round((frame+1)/plan.frameCount*100)+'%');
    onProgress({frame:frame+1,total:plan.frameCount,scene:moment.sceneId});
   }
  }
  source.close();
  if(audioTask){await audioTask;audioSource.close()}
  await output.finalize();
  const buffer=target.buffer;
  if(!buffer||buffer.byteLength===0)throw Error('H.264/MP4-encoder leverde geen videobestand op.');
  const mp4=new Blob([buffer],{type:'video/mp4'});
  const sheetBlob=await blobCanvas(sheet.sheet);
  const report={
   schemaVersion:1,project:plan.id,format:plan.format,source:'browser-tab-capture-original-scenes',
   output:{width:plan.width,height:plan.height,fps:plan.fps,
    requestedFrames:plan.frameCount,encodedFrames:plan.frameCount,
    durationSeconds:plan.durationSeconds,bytes:mp4.size,videoCodec:'avc',audio:!!audio},
   scenes:plan.scenes.map(s=>({id:s.id,startFrame:s.startFrame,frames:s.frames,source:s.source})),
   originalSkill:'skills/qa-review/SKILL.md',
   qa:{status:'requires-review',G5:'pending',G6:'pending',G7:'pending',
    explanation:'Contact sheet generated from captured frames. Browser export does not replace textcheck, ffprobe, audio QA, independent critic or user approval.'},
   createdAt:new Date().toISOString()
  };
  return {plan,mp4,cover:coverBlob,sheet:sheetBlob,
   subtitles:subtitleFile||null,
   qa:new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json'}),
   report};
 }finally{
  // A failed or canceled export must never download a partial file.
  stream?.getTracks().forEach(t=>t.stop());
  video?.pause();
  if(video)video.srcObject=null;
  screen.close();
 }
}

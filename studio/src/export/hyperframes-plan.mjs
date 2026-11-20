/**
 * Browser-only MotionForge MP4 export. Independent of the media encoder and DOM.
 * Original scene HTML and its MF_PREVIEW seek bridge are the source of every frame.
 */
export const OUTPUT_SIZE=Object.freeze({
  '16:9':[1920,1080],
  '9:16':[1080,1920],
  '1:1':[1080,1080],
  '4:5':[1080,1350]
});
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const safeSource=(url,id)=>typeof url==='string'&&
  url.startsWith('projects/'+id+'/scenes/')&&
  !url.split('/').includes('..')&&/^[a-zA-Z0-9_.\/-]+$/.test(url)&&url.endsWith('.html');
export function exportPlan(manifest,{quality='final'}={}){
  if(!manifest||!SLUG.test(manifest.id)||!OUTPUT_SIZE[manifest.format])
    throw Error('Unsupported MotionForge project or aspect ratio.');
  if(!['draft','final'].includes(quality))throw Error('Unknown browser render quality.');
  if(!Number.isInteger(manifest.fps)||manifest.fps<12||manifest.fps>60||
    !Number.isFinite(manifest.durationSeconds)||manifest.durationSeconds<=0||
    manifest.durationSeconds>120)throw Error('Browser exports must be 1–120s at 12–60fps.');
  const frames=manifest.durationSeconds*manifest.fps;
  if(!Number.isInteger(frames))throw Error('Duration must align to an exact frame.');
  if(!Array.isArray(manifest.scenes)||!manifest.scenes.length||
    !manifest.scenes.every(s=>['hyperframes','canvas'].includes(s.engine)))
    throw Error('Browserexport requires original seekable HyperFrames or Canvas scenes.');
  const scenes=[...manifest.scenes].sort((a,b)=>a.startSeconds-b.startSeconds);
  let at=0;
  const slots=scenes.map(s=>{
    const start=s.startSeconds*manifest.fps,length=s.durationSeconds*manifest.fps;
    if(!Number.isInteger(start)||!Number.isInteger(length)||length<1||start!==at)
      throw Error('Scene '+s.id+' has a gap, overlap or subframe duration. Export stopped.');
    const source=manifest.previewSources?.[s.id];
    if(!SLUG.test(s.id)||!safeSource(source,manifest.id))
      throw Error('Missing original scene preview for '+s.id);
    at=start+length;
    return {id:s.id,title:s.title,startFrame:start,frames:length,
      engine:s.engine,source};
  });
  if(at!==frames)throw Error('Project scenes must fill every video frame.');
  const [nativeWidth,nativeHeight]=OUTPUT_SIZE[manifest.format];
  const divisor=quality==='draft'?2:1;
  return {id:manifest.id,title:manifest.title,language:manifest.language,
    fps:manifest.fps,frameCount:frames,durationSeconds:manifest.durationSeconds,
    width:nativeWidth/divisor,height:nativeHeight/divisor,
    nativeWidth,nativeHeight,format:manifest.format,quality,scenes:slots};
}
export function frameAt(plan,frame){
  if(!Number.isInteger(frame)||frame<0||frame>=plan.frameCount)
    throw Error('Frame is outside the exported timeline.');
  const scene=plan.scenes.find(s=>frame>=s.startFrame&&frame<s.startFrame+s.frames);
  if(!scene)throw Error('No source scene for frame '+frame);
  return {frame,seconds:frame/plan.fps,localSeconds:(frame-scene.startFrame)/plan.fps,
    sceneId:scene.id,scene};
}
export function sampleFrames(plan){
  const picks=new Set([0,plan.frameCount-1]);
  for(const s of plan.scenes)
    for(const ratio of [.05,.5,.95])
      picks.add(Math.min(plan.frameCount-1,s.startFrame+
        Math.min(s.frames-1,Math.floor((s.frames-1)*ratio))));
  return [...picks].sort((a,b)=>a-b);
}
/** Crop the exact visible scene rectangle out of a user-authorized tab capture. */
export function captureCrop(videoWidth,videoHeight,viewportWidth,viewportHeight,rect){
  if([videoWidth,videoHeight,viewportWidth,viewportHeight,rect?.width,rect?.height]
    .some(n=>!Number.isFinite(n)||n<=0))throw Error('Capture viewport not ready.');
  const x=Math.max(0,rect.left/viewportWidth*videoWidth);
  const y=Math.max(0,rect.top/viewportHeight*videoHeight);
  const width=Math.min(videoWidth-x,rect.width/viewportWidth*videoWidth);
  const height=Math.min(videoHeight-y,rect.height/viewportHeight*videoHeight);
  if(width<80||height<80)throw Error('Captured source stage is too small.');
  return {x,y,width,height};
}

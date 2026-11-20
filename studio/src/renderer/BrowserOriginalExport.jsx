import {useEffect,useRef,useState} from 'react';
import {browserExportSupport,renderOriginalMp4} from '../export/render-original-mp4.mjs';
import {exportPlan} from '../export/hyperframes-plan.mjs';

const fileName=(id,suffix)=>id+suffix;
function saveBlob(blob,name){
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),60000);
}
export default function BrowserOriginalExport({manifest}){
 const [support,setSupport]=useState({ok:false,message:'Browsercompatibiliteit controleren…'});
 const [quality,setQuality]=useState('draft');
 const [audio,setAudio]=useState(null);
 const [subtitles,setSubtitles]=useState(null);
 const [progress,setProgress]=useState(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [result,setResult]=useState(null);
 const [sheetUrl,setSheetUrl]=useState('');
 const controller=useRef(null);
 useEffect(()=>{
  let active=true;
  const basic=browserExportSupport();
  if(!basic.ok){setSupport(basic);return()=>{controller.current?.abort()};}
  const check=async()=>{
   try{
    const [w,h]=[1920,1080];
    const [width,height]=manifest.format==='9:16'?[1080,1920]:
      manifest.format==='1:1'?[1080,1080]:
      manifest.format==='4:5'?[1080,1350]:[w,h];
    const result=await VideoEncoder.isConfigSupported({
     codec:'avc1.42E028',width,height,framerate:manifest.fps,bitrate:8000000
    });
    if(active)setSupport(result.supported?basic:{ok:false,
      message:'H.264-encoder ondersteunt deze resolutie niet. Probeer een kleinere render of de lokale render-worker.'});
   }catch(error){
    if(active)setSupport({ok:false,message:'Browserencoder kon niet worden gecontroleerd: '+error.message});
   }
  };
  check();
  return()=>{active=false;controller.current?.abort()};
 },[manifest.fps,manifest.format]);
 useEffect(()=>{
  if(!result?.sheet){setSheetUrl('');return}
  const url=URL.createObjectURL(result.sheet);
  setSheetUrl(url);
  return()=>URL.revokeObjectURL(url);
 },[result]);
 const start=async()=>{
  if(controller.current)return;
  setError('');setResult(null);setProgress({frame:0,total:manifest.fps*manifest.durationSeconds});
  const task=new AbortController();
  controller.current=task;setBusy(true);
  try{
   // renderOriginalMp4 calls getDisplayMedia before its first await, under
   // this click's transient user activation. Never add an await above it.
   const promise=renderOriginalMp4(manifest,{
     quality,audioFile:audio,subtitleFile:subtitles,controller:task,onProgress:setProgress
   });
   const files=await promise;
   if(!task.signal.aborted)setResult(files);
  }catch(e){
   setError(e.name==='AbortError'?'Browserrender geannuleerd.':e.message||String(e));
  }finally{
   if(controller.current===task)controller.current=null;
   setBusy(false);setProgress(null);
  }
 };
 let shape=null,reason='';
 try{shape=exportPlan(manifest,{quality})}
 catch(e){reason=e.message}
 const allowed=support.ok&&!reason;
 return (
  <section className="browser-original-export export-panel" aria-labelledby="browser-export-title">
   <div className="export-title">
    <strong id="browser-export-title">Render originele scènes als MP4</strong>
    <span>GitHub Pages · H.264 · lokaal in je browser</span>
   </div>
   <p className="export-note">HyperFrames, HTML, GSAP en Three.js blijven de bron. Je browser vraagt één keer toestemming om <strong>dit tabblad</strong> vast te leggen. De scènes worden daarna frame voor frame opgenomen, zonder renderdienst of GitHub Actions.</p>
   <p className="export-support" role="status">{reason||support.message}</p>
   <div className="local-options">
    <label>Renderkwaliteit
     <select value={quality} onChange={event=>setQuality(event.target.value)} disabled={busy}>
      <option value="draft">Proef · halve resolutie</option>
      <option value="final">Definitief · volledige resolutie</option>
     </select>
    </label>
    <label>Eigen audio (optioneel)
     <input type="file" accept="audio/*,.wav,.mp3,.m4a" disabled={busy}
      onChange={event=>setAudio(event.target.files?.[0]||null)}/>
    </label>
    <label>Ondertitels (optioneel)
     <input type="file" accept=".srt,text/plain" disabled={busy}
      onChange={event=>setSubtitles(event.target.files?.[0]||null)}/>
    </label>
   </div>
   {shape&&<p className="export-note">{shape.width} × {shape.height} · {shape.fps} fps · {shape.frameCount} frames · {shape.scenes.length} originele scènes. Audio wordt uit je eigen bestand toegevoegd en niet geüpload.</p>}
   <div className="export-actions">
    <button type="button" className="button button-primary"
      onClick={start} disabled={!allowed||busy}>
      {busy?'Opnemen in browser…':'Render MP4 in Pages'}
    </button>
    {busy&&<button type="button" className="button button-outline"
      onClick={()=>controller.current?.abort()}>Annuleren</button>}
   </div>
   {busy&&<p className="export-note" role="status">De animatie bedekt tijdelijk het Studio-scherm. Kies “Dit tabblad” bij de schermdelingsvraag. Druk op Esc om te stoppen. De voortgang verschijnt in de tabbladtitel.</p>}
   {progress&&<progress className="export-progress" max={progress.total}
      value={progress.frame} aria-label="Browser MP4-render voortgang"/>}
   {error&&<p className="export-error" role="alert">{error}</p>}
   {result&&<div className="browser-render-result" role="status">
    <p className="export-done">MP4 opgenomen: {result.report.output.encodedFrames} frames. Controleer het resultaat en keur G5–G7 afzonderlijk goed.</p>
    {sheetUrl&&<img className="browser-contact-preview" src={sheetUrl} alt="Contact sheet van de werkelijk opgenomen scènes"/>}
    <div className="export-actions browser-downloads">
     <button type="button" className="button button-primary" onClick={()=>saveBlob(result.mp4,fileName(manifest.id,'.mp4'))}>Download MP4</button>
     <button type="button" className="button button-outline" onClick={()=>saveBlob(result.cover,fileName(manifest.id,'-cover.png'))}>Cover</button>
     <button type="button" className="button button-outline" onClick={()=>saveBlob(result.sheet,fileName(manifest.id,'-contact-sheet.png'))}>Storyboard</button>
     <button type="button" className="button button-outline" onClick={()=>saveBlob(result.qa,fileName(manifest.id,'-browser-qa.json'))}>QA-rapport</button>
     {result.subtitles&&<button type="button" className="button button-outline" onClick={()=>saveBlob(result.subtitles,fileName(manifest.id,'.srt'))}>Ondertitels</button>}
    </div>
   </div>}
   <p className="export-note">Browseropname vereist schermdeeltoestemming, een actieve desktopbrowser en ondersteuning voor WebCodecs H.264. De browserrapportage vervangt de originele FFmpeg-, beeld-, geluid- en onafhankelijke QA niet.</p>
  </section>
 );
}

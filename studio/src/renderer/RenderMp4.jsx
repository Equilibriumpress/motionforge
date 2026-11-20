import {useEffect,useRef,useState} from 'react';
import TitleSequence from './TitleSequence.jsx';
import {browserComposition,renderProps} from './render-settings.js';

export default function RenderMp4({manifest}) {
  const [check,setCheck]=useState({loading:true,ok:false,message:''});
  const [progress,setProgress]=useState(null);
  const [error,setError]=useState('');
  const [done,setDone]=useState(false);
  const controller=useRef(null);
  const composition=browserComposition(manifest,TitleSequence);

  useEffect(() => {
    let mounted=true;
    const verify=async () => {
      try {
        const {canRenderMediaOnWeb}=await import('@remotion/web-renderer');
        const result=await canRenderMediaOnWeb({
          container:'mp4',videoCodec:'h264',width:composition.width,height:composition.height,muted:true
        });
        if (mounted) setCheck({
          loading:false,ok:result.canRender,
          message:result.canRender?'Browser ondersteunt H.264 MP4-export':
            result.issues.map(issue=>issue.message).join(' · ') || 'Browser ondersteunt deze export niet'
        });
      } catch (reason) {
        if (mounted) setCheck({loading:false,ok:false,message:reason.message||String(reason)});
      }
    };
    verify();
    return () => {mounted=false; controller.current?.abort();};
  },[composition.width,composition.height]);

  const start=async () => {
    setError('');
    setDone(false);
    setProgress(0);
    const abort=new AbortController();
    controller.current=abort;
    try {
      const {renderMediaOnWeb}=await import('@remotion/web-renderer');
      const result=await renderMediaOnWeb({
        composition,
        inputProps:renderProps(manifest),
        container:'mp4',
        videoCodec:'h264',
        muted:true,
        signal:abort.signal,
        pageResponsiveness:'medium',
        onProgress:({progress:amount})=>setProgress(Math.max(0,Math.min(100,Math.round(amount*100)))),
      });
      if (abort.signal.aborted) return;
      const blob=await result.getBlob();
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');
      anchor.href=url;
      anchor.download=manifest.id+'.mp4';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),60000);
      setDone(true);
    } catch(reason) {
      if (!abort.signal.aborted) setError(reason.message||String(reason));
    } finally {
      if (controller.current===abort) controller.current=null;
      setProgress(null);
    }
  };

  const cancel=()=>controller.current?.abort();
  return (
    <section className="export-panel" aria-label="MP4 export">
      <div className="export-title"><strong>MP4-export</strong><span>H.264 · zonder audio</span></div>
      <p className="export-note">Video wordt lokaal in je browser gerenderd. Er is geen serverrender of GitHub Action nodig.</p>
      <p className="export-support" role="status">{check.loading?'Browsercompatibiliteit controleren…':check.message}</p>
      <div className="export-actions">
        <button type="button" className="button button-primary" onClick={start}
          disabled={!check.ok||check.loading||progress!==null}>
          {progress===null?'Render MP4': 'Renderen '+progress+'%'}
        </button>
        {progress!==null && <button type="button" className="button button-outline" onClick={cancel}>Annuleren</button>}
      </div>
      {progress!==null && <progress className="export-progress" max="100" value={progress} aria-label="MP4-rendering voortgang"/>}
      {done && <p className="export-done" role="status">MP4 is klaargezet als download.</p>}
      {error && <p className="export-error" role="alert">{error}</p>}
    </section>
  );
}

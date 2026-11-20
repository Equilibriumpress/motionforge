import { useEffect, useMemo, useRef, useState } from 'react';
import { loadProject } from '../lib/projects.js';

const protocol = 'MF_PREVIEW';
const clock = (value) => {
  const n = Math.max(0,Math.round(value));
  return String(Math.floor(n/60)).padStart(2,'0') + ':' + String(n%60).padStart(2,'0');
};
function sceneFor(scenes, seconds) {
  return scenes.find(scene => seconds >= scene.startSeconds && seconds < scene.startSeconds + scene.durationSeconds)
    || [...scenes].reverse().find(scene => scene.startSeconds <= seconds)
    || scenes[0] || null;
}

export default function PreviewPlayer({ project, coverUrl }) {
  const [loaded,setLoaded] = useState({data:null,loading:true,error:null});
  const [seconds,setSeconds] = useState(0);
  const [playing,setPlaying] = useState(false);
  const [ready,setReady] = useState(false);
  const [error,setError] = useState(null);
  const iframe = useRef(null);
  const time = useRef(0);

  useEffect(() => {
    let active = true;
    loadProject(project.id).then(data => {
      if (active) setLoaded({data,loading:false,error:null});
    },reason => {
      if (active) setLoaded({data:null,loading:false,error:reason.message});
    });
    return () => { active = false; };
  },[project.id]);

  const manifest = loaded.data;
  const duration = manifest?.durationSeconds || project.durationSeconds;
  const scenes = useMemo(() => [...(manifest?.scenes || [])].sort((a,b) => a.startSeconds - b.startSeconds),[manifest]);
  const scene = sceneFor(scenes, Math.min(seconds,Math.max(0,duration-0.0001)));
  const source = scene && manifest?.previewSources?.[scene.id];
  const url = source ? import.meta.env.BASE_URL + source : null;
  useEffect(() => { time.current = seconds; },[seconds]);

  useEffect(() => {
    if (!playing || !duration) return;
    const initial = time.current >= duration ? 0 : time.current;
    if (time.current >= duration) setSeconds(0);
    const start = performance.now();
    let request;
    const nextFrame = (now) => {
      const next = Math.min(duration,initial+(now-start)/1000);
      setSeconds(next);
      if (next >= duration) setPlaying(false);
      else request=requestAnimationFrame(nextFrame);
    };
    request=requestAnimationFrame(nextFrame);
    return () => cancelAnimationFrame(request);
  },[playing,duration]);

  useEffect(() => {setReady(false);setError(null);},[url]);

  useEffect(() => {
    const handle = (event) => {
      if (event.source !== iframe.current?.contentWindow || event.data?.type !== protocol) return;
      if (event.data.kind === 'ready') {
        setReady(true);
        setError(null);
        iframe.current?.contentWindow?.postMessage({type:protocol,kind:'seek',seconds:Math.max(0,time.current-(scene?.startSeconds||0))},'*');
      }
      if (event.data.kind === 'error') {
        setError(event.data.message||'Scène laden mislukt');
        setPlaying(false);
      }
    };
    window.addEventListener('message',handle);
    return () => window.removeEventListener('message',handle);
  },[url,scene?.startSeconds]);

  useEffect(() => {
    if (ready && url) iframe.current?.contentWindow?.postMessage({
      type:protocol,kind:'seek',seconds:Math.max(0,seconds-(scene?.startSeconds||0))
    },'*');
  },[ready,url,seconds,scene?.startSeconds]);

  const seek = value => {setPlaying(false);setSeconds(Math.max(0,Math.min(duration,value)));};
  return (
    <div className="player">
      <div className={'player-stage ratio-' + project.format.replace(':','-')}>
        {url ? <iframe ref={iframe} key={url} src={url} title={'Voorbeeld: ' + scene.title}
          sandbox="allow-scripts" referrerPolicy="no-referrer"
          onLoad={() => iframe.current?.contentWindow?.postMessage({type:protocol,kind:'ping'},'*')} />
          : coverUrl ? <img src={coverUrl} alt={'Cover ' + project.title}/> : <span aria-hidden="true">▶</span>}
        {loaded.loading && <div className="player-overlay" role="status">Scènes laden…</div>}
        {loaded.error && <div className="player-overlay" role="alert">{loaded.error}</div>}
        {!loaded.loading && !loaded.error && !url && <div className="player-overlay">Geen browserpreview voor deze scène</div>}
        {error && <div className="player-overlay" role="alert">{error}</div>}
        {url && !ready && !error && <div className="player-overlay" role="status">Preview laden…</div>}
      </div>
      <div className="player-controls">
        <div className="player-controls-top">
          <button type="button" className="player-button" disabled={!url || !ready || !!error}
            onClick={() => setPlaying(value => !value)}>{playing ? 'Ⅱ Pauze' : '▶ Afspelen'}</button>
          <span className="player-time">{clock(seconds)} / {clock(duration)}</span>
          <span className="player-engine">{scene?.engine || project.engine} · {project.format}</span>
        </div>
        <label className="player-scrub">
          <span className="sr-only">Tijdlijn</span>
          <input type="range" aria-label="Tijdlijn" min="0" max={duration}
            step={1/(manifest?.fps || project.fps || 30)} value={seconds}
            onChange={event => seek(Number(event.target.value))} disabled={!manifest || !scenes.length}/>
        </label>
        <div className="scene-strip" aria-label="Scènes">
          {scenes.map((item,index) => (
            <button type="button" key={item.id} onClick={() => seek(item.startSeconds)}
              className={'scene-chip' + (scene?.id===item.id ? ' active' : '')}>
              {String(index+1).padStart(2,'0')} · {item.title}
            </button>
          ))}
        </div>
      </div>
      <p className="player-hint">Interactief scènevoorbeeld. Originele HyperFrames-projecten kunnen nu ook via de browser worden geëxporteerd.</p>
    </div>
  );
}

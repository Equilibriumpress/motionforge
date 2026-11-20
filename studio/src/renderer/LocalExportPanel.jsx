import {useState} from 'react';
import BrowserOriginalExport from './BrowserOriginalExport.jsx';

export default function LocalExportPanel({manifest}) {
  const [quality,setQuality]=useState('final');
  const [extra,setExtra]=useState('none');
  const [message,setMessage]=useState('');
  const command='node tools/studio-render.mjs '+manifest.id+' --quality '+quality+
    (extra==='none'?'':' --formats '+extra);
  const copy=async()=>{
    try {
      await navigator.clipboard.writeText(command);
      setMessage('Rendercommando gekopieerd.');
    }catch {
      setMessage('Selecteer het commando hierboven en kopieer het handmatig.');
    }
  };
  return (
    <>
    <BrowserOriginalExport manifest={manifest}/>
    <section className="local-export" aria-labelledby="local-export-heading">
      <div className="export-title"><strong id="local-export-heading">MP4 · Lokale export</strong><span>{manifest.engine}</span></div>
      <p className="export-note">Canvas- en HyperFrames-scènes renderen via je eigen computer. GitHub Pages voert geen video-render uit.</p>
      <div className="local-options">
        <label>Kwaliteit
          <select value={quality} onChange={event=>{setQuality(event.target.value);setMessage('');}}>
            <option value="final">Definitief</option><option value="draft">Proefrender</option>
          </select>
        </label>
        <label>Extra verhouding
          <select value={extra} onChange={event=>{setExtra(event.target.value);setMessage('');}}>
            <option value="none">Origineel formaat</option>
            <option value="9:16">9:16</option><option value="16:9">16:9</option>
            <option value="1:1">1:1</option><option value="4:5">4:5</option>
          </select>
        </label>
      </div>
      <div className="local-command"><code>{command}</code></div>
      <button type="button" className="button button-outline" onClick={copy}>Kopieer rendercommando</button>
      {message && <p className="export-support" role="status">{message}</p>}
      <p className="export-note">Voer het commando uit vanuit je lokale MotionForge-repository met Node.js 22+, FFmpeg en de renderdependencies. De MP4 verschijnt in videos/{manifest.id}/renders/.</p>
    </section>
    </>
  );
}

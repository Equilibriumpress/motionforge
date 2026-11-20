import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ProjectMedia from '../renderer/ProjectMedia.jsx';
import { loadProjectIndex, projectCoverUrl } from '../lib/projects.js';

const SOURCE = 'https://github.com/Equilibriumpress/motionforge/tree/main/videos/';

const statusLabel = {
  concept: 'Concept',
  draft: 'In bewerking',
  review: 'Ter beoordeling',
  ready: 'Gereed',
};

function ProjectCard({ project, onOpen }) {
  const cover = projectCoverUrl(project);
  return (
    <article className="project-card">
      <button className="project-open" type="button" onClick={() => onOpen(project)} aria-label={'Open project ' + project.title}>
        <div className="project-cover">
          {cover ? <img src={cover} alt="" loading="lazy" /> : <span aria-hidden="true">▶</span>}
          <span className="project-duration">{project.durationSeconds}s · {project.format}</span>
        </div>
        <div className="project-body">
          <div className="project-meta"><span className="project-status">{statusLabel[project.status] || project.status}</span><span>{project.engine} · {project.sceneCount} scènes</span></div>
          <h3>{project.title}</h3>
          <p>{project.description}</p>
          <span className="project-source">Project bekijken <span aria-hidden="true">↗</span></span>
        </div>
      </button>
    </article>
  );
}

function ProjectDetails({ project, onClose }) {
  const closeButton = useRef(null);
  useEffect(() => {
    const oldFocus = document.activeElement;
    closeButton.current?.focus();
    function onKey(event) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const items=Array.from(document.querySelectorAll('.detail-panel button:not([disabled]),.detail-panel a[href],.detail-panel input:not([disabled])'));
        if (!items.length) return;
        if (event.shiftKey && document.activeElement === items[0]) {event.preventDefault();items[items.length-1].focus();}
        else if (!event.shiftKey && document.activeElement === items[items.length-1]) {event.preventDefault();items[0].focus();}
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      oldFocus?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="detail-panel" role="dialog" aria-modal="true" aria-labelledby="project-dialog-title">
        <header className="detail-header">
          <span className="section-kicker">PROJECTDETAILS</span>
          <button type="button" className="close-detail" aria-label="Sluit projectdetails" onClick={onClose} ref={closeButton}>×</button>
        </header>
        <div className="detail-layout">
          <div className="detail-hero">
            <ProjectMedia key={project.id} project={project} coverUrl={projectCoverUrl(project)} />
          </div>
          <div className="detail-info">
            <div className="project-meta"><span className="project-status">{statusLabel[project.status] || project.status}</span><span>{project.language.toUpperCase()}</span></div>
            <h2 id="project-dialog-title">{project.title}</h2>
            <p>{project.description}</p>
            <dl className="detail-facts">
              <div><dt>Lengte</dt><dd>{project.durationSeconds} seconden</dd></div>
              <div><dt>Beeldformaat</dt><dd>{project.format}</dd></div>
              <div><dt>Videomotor</dt><dd>{project.engine}</dd></div>
              <div><dt>Scènes</dt><dd>{project.sceneCount}</dd></div>
              <div><dt>Beeldsnelheid</dt><dd>{project.fps} fps</dd></div>
            </dl>
            <div className="detail-tags">{project.tags.map((tag) => <span key={tag} className="tag-pill">{tag}</span>)}</div>
            <a className="button button-primary" href={SOURCE + encodeURIComponent(project.id)} target="_blank" rel="noreferrer">Open project op GitHub ↗</a>
            <p className="detail-next">Bekijk de scènes op de tijdlijn. Originele HyperFrames-video's hebben nu browser-MP4-export, inclusief cover en contact sheet.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ProjectLibrary() {
  const [state, setState] = useState({ loading: true, projects: [], error: null });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [engine, setEngine] = useState('all');
  const [tag, setTag] = useState('all');
  const [sort, setSort] = useState('title');
  const [selected, setSelected] = useState(null);
  const openSelected=useCallback(project=>{
    setSelected(project);
    const url=new URL(window.location.href);
    url.searchParams.set('project',project.id);
    window.history.replaceState(null,'',url);
  },[]);
  const closeSelected=useCallback(()=>{
    setSelected(null);
    const url=new URL(window.location.href);
    url.searchParams.delete('project');
    window.history.replaceState(null,'',url);
  },[]);

  useEffect(() => {
    let active = true;
    loadProjectIndex().then(
      (projects) => {
        if(!active)return;
        setState({loading:false,projects,error:null});
        const requested=new URLSearchParams(window.location.search).get('project');
        if(requested)setSelected(projects.find(p=>p.id===requested)||null);
      },
      (error) => { if (active) setState({ loading: false, projects: [], error: error.message }); },
    );
    return () => { active = false; };
  }, []);

  const tags = useMemo(() => [...new Set(state.projects.flatMap((project) => project.tags))].sort((a, b) => a.localeCompare(b, 'nl')), [state.projects]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('nl');
    const results = state.projects.filter((project) =>
      (status === 'all' || project.status === status)
      && (engine === 'all' || project.engine === engine)
      && (tag === 'all' || project.tags.includes(tag))
      && (!normalized || [project.title, project.description, project.id, ...project.tags].join(' ').toLocaleLowerCase('nl').includes(normalized)));
    return results.sort((a, b) => {
      if (sort === 'duration') return a.durationSeconds - b.durationSeconds || a.title.localeCompare(b.title, 'nl');
      if (sort === 'scenes') return b.sceneCount - a.sceneCount || a.title.localeCompare(b.title, 'nl');
      return a.title.localeCompare(b.title, 'nl');
    });
  }, [state.projects, query, status, engine, tag, sort]);

  function clearFilters() {
    setQuery('');
    setStatus('all');
    setEngine('all');
    setTag('all');
    setSort('title');
  }

  return (
    <section className="library-section" aria-label="Projectbibliotheek">
      <div className="section-heading">
        <div><span className="section-kicker">STUDIO</span><h2>Projectbibliotheek</h2></div>
        <span className="counter">{state.loading ? 'Laden…' : filtered.length + ' van ' + state.projects.length}</span>
      </div>
      {!state.loading && !state.error && state.projects.length > 0 && (
        <div className="library-toolbar">
          <label className="search-field">Zoeken<input type="search" placeholder="Titel, beschrijving of trefwoord" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Alle statussen</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Motor<select value={engine} onChange={(event) => setEngine(event.target.value)}><option value="all">Alle motoren</option><option value="canvas">Canvas</option><option value="hyperframes">HyperFrames</option><option value="remotion">Remotion</option></select></label>
          <label>Trefwoord<select value={tag} onChange={(event) => setTag(event.target.value)}><option value="all">Alle onderwerpen</option>{tags.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>Sorteren<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="title">Titel</option><option value="duration">Duur kort → lang</option><option value="scenes">Meeste scènes</option></select></label>
        </div>
      )}
      {state.loading && <div className="empty-library" role="status"><p>Projecten laden…</p></div>}
      {state.error && <section className="empty-library" role="alert"><h3>Projectindex niet beschikbaar</h3><p>{state.error}</p></section>}
      {!state.loading && !state.error && state.projects.length === 0 && (
        <section className="empty-library"><div className="empty-mark" aria-hidden="true">▶</div><h3>Nog geen videoprojecten</h3><p>Voeg een project toe in videos/ en publiceer de studio opnieuw.</p></section>
      )}
      {!state.loading && !state.error && state.projects.length > 0 && filtered.length === 0 && (
        <div className="empty-library"><h3>Geen projecten gevonden</h3><p>Pas je zoekopdracht of filters aan.</p><button type="button" className="button button-outline" onClick={clearFilters}>Filters wissen</button></div>
      )}
      {!state.loading && !state.error && filtered.length > 0 && (
        <div className="project-grid">{filtered.map((project) => <ProjectCard key={project.id} project={project} onOpen={openSelected} />)}</div>
      )}
      {selected && <ProjectDetails project={selected} onClose={closeSelected} />}
    </section>
  );
}

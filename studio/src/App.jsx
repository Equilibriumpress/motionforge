import { useEffect, useState } from 'react';
import { loadProjectIndex, projectCoverUrl } from './lib/projects.js';

const features = [
  { number: '01', title: 'Projectbibliotheek', description: 'Videoprojecten worden vanuit GitHub geïndexeerd.', stage: 'MF-02 · BASIS' },
  { number: '02', title: 'Live preview', description: 'Bekijk scènes en een tijdlijn in de browser.', stage: 'MF-04' },
  { number: '03', title: 'Video export', description: 'Download ondersteunde composities als MP4.', stage: 'MF-06 & MF-07' },
];

function Brand() {
  return (
    <div className="brand" aria-label="MotionForge Studio">
      <span className="brand-mark" aria-hidden="true"><span className="brand-play" /></span>
      <span className="brand-name">motionforge <b>studio</b></span>
    </div>
  );
}

function ProjectLibrary() {
  const [state, setState] = useState({ loading: true, projects: [], error: null });
  useEffect(() => {
    let active = true;
    loadProjectIndex().then(
      (projects) => { if (active) setState({ loading: false, projects, error: null }); },
      (error) => { if (active) setState({ loading: false, projects: [], error: error.message }); },
    );
    return () => { active = false; };
  }, []);

  return (
    <>
      <div className="section-heading">
        <div><span className="section-kicker">STUDIO</span><h2>Projectbibliotheek</h2></div>
        <span className="counter">{state.loading ? 'Laden…' : state.projects.length + ' projecten'}</span>
      </div>
      {state.loading ? <div className="empty-library" role="status"><p>Projecten laden…</p></div> : null}
      {state.error ? (
        <section className="empty-library" role="alert"><h3>Projectindex niet beschikbaar</h3><p>{state.error}</p></section>
      ) : null}
      {!state.loading && !state.error && state.projects.length === 0 ? (
        <section className="empty-library">
          <div className="empty-mark" aria-hidden="true">▶</div>
          <h3>Nog geen videoprojecten</h3>
          <p>Voeg een map toe in videos/ met een project.json. De index wordt bij de volgende Pages-build vernieuwd.</p>
        </section>
      ) : null}
      {!state.loading && !state.error && state.projects.length > 0 ? (
        <section className="project-grid" aria-label="Videoprojecten">
          {state.projects.map((project) => (
            <article className="project-card" key={project.id}>
              <div className="project-cover">
                {projectCoverUrl(project) ? <img src={projectCoverUrl(project)} alt={'Cover van ' + project.title} loading="lazy" /> : <span aria-hidden="true">▶</span>}
                <span className="project-duration">{project.durationSeconds}s · {project.format}</span>
              </div>
              <div className="project-body">
                <div className="project-meta"><span className="project-status">{project.status}</span><span>{project.engine} · {project.sceneCount} scènes</span></div>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <a className="project-source" href={'https://github.com/Equilibriumpress/motionforge/tree/main/videos/' + encodeURIComponent(project.id)} target="_blank" rel="noreferrer">Bekijk bronbestanden <span aria-hidden="true">↗</span></a>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </>
  );
}

export default function App() {
  const [view, setView] = useState('library');
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Brand />
          <nav className="navigation" aria-label="Hoofdnavigatie">
            <button type="button" className={view === 'library' ? 'nav-item selected' : 'nav-item'} aria-current={view === 'library' ? 'page' : undefined} onClick={() => setView('library')}>Bibliotheek</button>
            <button type="button" className={view === 'about' ? 'nav-item selected' : 'nav-item'} aria-current={view === 'about' ? 'page' : undefined} onClick={() => setView('about')}>Over de studio</button>
          </nav>
          <a className="github-link" href="https://github.com/Equilibriumpress/motionforge" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
        </div>
      </header>
      <main className="container">
        {view === 'library' ? (
          <>
            <section className="intro">
              <div className="eyebrow"><span className="eyebrow-dot" /> VIDEOPRODUCTIE MET CHATGPT EN GITHUB</div>
              <h1>Jouw verhalen.<br /><em>In beweging.</em></h1>
              <p className="lead">Maak videoprojecten met ChatGPT, bewaar de bronbestanden in GitHub en bekijk het resultaat in MotionForge Studio.</p>
              <div className="intro-actions">
                <a className="button button-primary" href="https://github.com/Equilibriumpress/motionforge/tree/main" target="_blank" rel="noreferrer">Open repository <span aria-hidden="true">↗</span></a>
                <span className="status-label"><span className="status-dot" /> Projectregister actief na MF-02</span>
              </div>
            </section>
            <ProjectLibrary />
            <div className="section-heading workflow-heading"><div><span className="section-kicker">ROADMAP</span><h2>Van idee naar video</h2></div></div>
            <section className="feature-grid" aria-label="Mogelijkheden">
              {features.map((feature) => (
                <article className="feature" key={feature.number}>
                  <div className="feature-top"><span className="feature-number">{feature.number}</span><span className="feature-stage">{feature.stage}</span></div>
                  <h3>{feature.title}</h3><p>{feature.description}</p>
                </article>
              ))}
            </section>
          </>
        ) : (
          <section className="about-panel">
            <span className="section-kicker">OVER MOTIONFORGE STUDIO</span>
            <h1>Een open videowerkruimte</h1>
            <p className="lead">Deze webapp is een aparte laag boven op MotionForge. De bestaande HyperFrames-, Remotion- en Canvas-engines blijven behouden.</p>
            <a className="button button-primary" href="https://github.com/Equilibriumpress/motionforge/blob/main/AGENTS.md" target="_blank" rel="noreferrer">Lees de agentinstructies <span aria-hidden="true">↗</span></a>
          </section>
        )}
      </main>
      <footer className="footer"><div className="container footer-inner"><span>MotionForge Studio · Equilibriumpress</span><span>Projecten in GitHub · Preview via Pages</span></div></footer>
    </div>
  );
}

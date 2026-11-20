import { useState } from 'react';
import ProjectLibrary from './library/ProjectLibrary.jsx';
import MotionCatalog from './library/MotionCatalog.jsx';

const features = [
  { number: '01', title: 'Projectbibliotheek', description: 'Projecten zoeken, filteren en openen vanuit de studio.', stage: 'MF-03' },
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

export default function App() {
  const [view, setView] = useState('library');
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Brand />
          <nav className="navigation" aria-label="Hoofdnavigatie">
            <button type="button" className={view === 'library' ? 'nav-item selected' : 'nav-item'} aria-current={view === 'library' ? 'page' : undefined} onClick={() => setView('library')}>Bibliotheek</button>
            <button type="button" className={view === 'catalog' ? 'nav-item selected' : 'nav-item'} aria-current={view === 'catalog' ? 'page' : undefined} onClick={() => setView('catalog')}>Stijlen &amp; scènes</button>
            <button type="button" className={view === 'about' ? 'nav-item selected nav-about' : 'nav-item nav-about'} aria-current={view === 'about' ? 'page' : undefined} onClick={() => setView('about')}>Over de studio</button>
          </nav>
          <a className="github-link" href="https://github.com/Equilibriumpress/motionforge" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
        </div>
      </header>
      <main className="container">
        {view === 'library' ? (
          <>
            <section className="intro intro-compact">
              <div className="eyebrow"><span className="eyebrow-dot" /> CHATGPT · GITHUB · MOTIONFORGE</div>
              <h1>Jouw verhalen.<br /><em>In beweging.</em></h1>
              <p className="lead">Maak videoprojecten met ChatGPT en bekijk de resultaten in jouw MotionForge-bibliotheek.</p>
            </section>
            <ProjectLibrary />
            <section className="catalog-entry" aria-label="Animatiestijlen en scènes">
              <div><span className="section-kicker">STIJLEN EN ANIMATIES</span><h2>Van stijl naar video</h2><p>Bekijk de oorspronkelijke MotionForge-stijlen en animatiescènes, met bewegende voorbeelden en ChatGPT-opdrachten.</p></div>
              <button type="button" className="button button-primary" onClick={() => {setView("catalog"); window.scrollTo({top:0,behavior:"smooth"});}}>Bekijk de catalogus</button>
            </section>
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
        ) : view === "catalog" ? (
          <div className="catalog-route">
            <MotionCatalog />
          </div>
        ) : (
          <section className="about-panel">
            <span className="section-kicker">OVER MOTIONFORGE STUDIO</span>
            <h1>Een open videowerkruimte</h1>
            <p className="lead">De webstudio is een aparte laag boven MotionForge. HyperFrames, Remotion, Canvas en de bestaande skills blijven behouden.</p>
            <a className="button button-primary" href="https://github.com/Equilibriumpress/motionforge/blob/main/AGENTS.md" target="_blank" rel="noreferrer">Agentinstructies bekijken ↗</a>
          </section>
        )}
      </main>
      <footer className="footer"><div className="container footer-inner"><span>MotionForge Studio · Equilibriumpress</span><span>Projecten in GitHub · Preview via Pages</span><button type="button" className="footer-about" onClick={() => {setView("about");window.scrollTo({top:0,behavior:"smooth"});}}>Over de studio</button></div></footer>
    </div>
  );
}

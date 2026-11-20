import {useState} from 'react';
import {templates,templateNames} from '../../project-templates/library.mjs';

const example={
  'book-trailer':['london-book-trailer','LONDON ON FOOT'],
  'walking-route':['walking-route-demo','SCHEMATISCHE WANDELING'],
  'data-story':['california-infographic','CALIFORNIA MAPS'],
  'app-preview':['app-intro','MOBILE APP'],
};

export default function TemplateGallery(){
  const [message,setMessage]=useState('');
  const copy=async(name)=>{
    const [slug,title]=example[name];
    const prompt='Maak een nieuw videoproject in Equilibriumpress/motionforge met het '+name+
      ' template. Titel: '+title+'. Slug: '+slug+
      '. Maak eerst originele scènes en controleer de inhoud. Sla alles op in videos/'+slug+
      '/, voer studio QA uit en maak een PR. Gebruik geen externe betaalde diensten zonder toestemming.';
    try{
      await navigator.clipboard.writeText(prompt);
      setMessage('ChatGPT-opdracht voor '+templates[name].name+' gekopieerd.');
    }catch{
      setMessage('Kopiëren niet beschikbaar. Gebruik de generator vanuit je lokale repository.');
    }
  };
  return (
    <section className="templates-section" aria-labelledby="template-heading">
      <div className="section-heading">
        <div><span className="section-kicker">HERBRUIKBARE PROJECTEN</span><h2 id="template-heading">Videotemplates</h2></div>
        <span className="counter">4 formats</span>
      </div>
      <p className="template-intro">Kies een opzet en kopieer de opdracht voor ChatGPT. De bronbestanden worden daarna via GitHub opgeslagen.</p>
      <div className="template-grid">
        {templateNames.map((name,index)=>{
          const item=templates[name],exampleSlug=example[name][0];
          return (
            <article className="template-card" key={name}>
              <div className={'template-preview template-preview-'+(index+1)} aria-hidden="true">
                <span className="template-preview-mark">{String(index+1).padStart(2,'0')}</span>
                <span className="template-preview-line"/>
                <span className="template-preview-type">{item.name}</span>
              </div>
              <div className="template-content">
                <h3>{item.name}</h3><p>{item.description}</p>
                <button type="button" className="template-copy" onClick={()=>copy(name)}>Kopieer ChatGPT-opdracht</button>
                <code className="template-command">node studio/scripts/new-from-template.mjs --template {name} --slug {exampleSlug} --title "{example[name][1]}"</code>
              </div>
            </article>
          );
        })}
      </div>
      {message && <p className="template-feedback" role="status">{message}</p>}
    </section>
  );
}

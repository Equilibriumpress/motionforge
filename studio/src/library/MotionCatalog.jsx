import {useEffect,useMemo,useState} from 'react';
import {templates as ownTemplates,templateNames as ownTemplateNames} from '../../project-templates/library.mjs';

const PER_PAGE=24;
const SCENE_LIMIT=6;

function normalized(text){
  return String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('nl');
}
function Preview({item}){
  const [broken,setBroken]=useState(false);
  if(!item.previewUrl||broken){
    return <div className="catalog-image-fallback" aria-label="Geen animatievoorbeeld beschikbaar"><span aria-hidden="true">▶</span><span>Bekijk voorbeeld op GitHub</span></div>;
  }
  return <img src={item.previewUrl} loading="lazy" decoding="async" alt={'Bewegend voorbeeld: '+item.title}
    onError={()=>setBroken(true)} />;
}
function CatalogCard({item,selected,onPick,type}){
  const description=item.description||'Bekijk het voorbeeld en de bijbehorende bronbestanden.';
  return (
    <article className={'catalog-card'+(selected?' picked':'')}>
      <div className="catalog-card-preview"><Preview key={item.id} item={item}/></div>
      <div className="catalog-card-body">
        <div className="catalog-card-type">{item.category}</div>
        <h3>{item.title}</h3>
        <p>{description}</p>
        {type==='style'&&item.bestFor&&<p className="catalog-uses"><span>Geschikt voor: </span>{item.bestFor}</p>}
        <div className="catalog-card-actions">
          <button type="button" className={selected?'catalog-pick selected':'catalog-pick'}
            onClick={()=>onPick(item.id)} aria-pressed={selected}>
            {selected?'Geselecteerd ✓':type==='style'?'Kies stijl':'Kies scène'}
          </button>
          <a href={item.sourceUrl} target="_blank" rel="noreferrer" aria-label={'Bekijk bron van '+item.title}>Bron ↗</a>
        </div>
      </div>
    </article>
  );
}
function OwnCard({item,name,selected,onPick}){
  return (
    <article className={'catalog-card own-card'+(selected?' picked':'')}>
      <div className="catalog-own-preview" aria-hidden="true"><span>{item.name}</span><span className="catalog-own-line"/></div>
      <div className="catalog-card-body">
        <div className="catalog-card-type">MotionForge Studio</div>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <div className="catalog-card-actions">
          <button type="button" className={selected?'catalog-pick selected':'catalog-pick'}
            onClick={()=>onPick(name)} aria-pressed={selected}>{selected?'Geselecteerd ✓':'Kies format'}</button>
          <a href={'https://github.com/Equilibriumpress/motionforge/blob/main/studio/project-templates/library.mjs'} target="_blank" rel="noreferrer">Bron ↗</a>
        </div>
      </div>
    </article>
  );
}
function makePrompt({style,scenes,own,title,aspect,length}){
  const chosenTitle=title.trim()||'[vul onderwerp of titel in]';
  const sceneNames=scenes.map(item=>item.id);
  const renderMode=own?'Eigen Studio-template: '+own:sceneNames.length?'Originele MotionForge-scènes: '+sceneNames.join(', '):'Kies passende scènes op basis van de stijl';
  const templateInstruction=own?'Gebruik studio/project-templates/library.mjs en het Studio-projectprotocol.':
    'Gebruik de originele scènes uit templates/ als bron en neem hun params.json en rendertechniek over.';
  return [
    'Maak een volledig nieuw videoproject in de GitHub-repository Equilibriumpress/motionforge.',
    'Onderwerp/titel: '+chosenTitle+'.',
    'Duur: '+length+' seconden. Beeldformaat: '+aspect+'. Taal: Nederlands.',
    'Geselecteerde MotionForge-stijl: '+(style?.id||'[nog geen stijl geselecteerd]')+'.',
    'Lees de volledige stijlregels in skills/style-library/styles/'+(style?.id||'[stijl]')+'/STYLE.md.',
    renderMode+'.',
    templateInstruction,
    'Gebruik de bestaande MotionForge-engines en herbruikbare bronbestanden. Schrijf een origineel script en storyboard. Leg feiten, echte kaartinformatie en bronrechten vast.',
    'Maak één videos/<slug>/ map met project.json, brief, script, brand, direction, scènes, media en cover.',
    'Zorg dat de preview via de Studio-bibliotheek werkt. Draai de relevante project-QA en bouwcontrole.',
    'Sla alles op via een featurebranch en maak een pull request. Niet mergen zonder mijn opdracht.',
    'Geen betaalde calls of externe media zonder voorafgaande toestemming. Genereer geen MP4 in GitHub Actions.'
  ].join('\n');
}

export default function MotionCatalog(){
  const [state,setState]=useState({loading:true,data:null,error:''});
  const [tab,setTab]=useState('styles');
  const [term,setTerm]=useState('');
  const [category,setCategory]=useState('all');
  const [limit,setLimit]=useState(PER_PAGE);
  const [styleId,setStyleId]=useState('');
  const [sceneIds,setSceneIds]=useState([]);
  const [ownId,setOwnId]=useState('');
  const [title,setTitle]=useState('');
  const [aspect,setAspect]=useState('16:9');
  const [length,setLength]=useState('30');
  const [notice,setNotice]=useState('');

  useEffect(()=>{
    const controller=new AbortController();
    fetch(import.meta.env.BASE_URL+'catalog/index.json',{cache:'no-store',signal:controller.signal})
      .then(async response=>{
        if(!response.ok)throw Error('Catalogus niet bereikbaar ('+response.status+')');
        const data=await response.json();
        if(data.schemaVersion!==1||!Array.isArray(data.styles)||!Array.isArray(data.scenes))
          throw Error('Onbekend catalogusformaat.');
        setState({loading:false,data,error:''});
      }).catch(error=>{
        if(error.name!=='AbortError')setState({loading:false,data:null,error:error.message});
      });
    return()=>controller.abort();
  },[]);

  const data=state.data;
  const selectedStyle=data?.styles.find(item=>item.id===styleId);
  const selectedScenes=data?.scenes.filter(item=>sceneIds.includes(item.id))||[];
  const tabs=[
    {id:'styles',label:'Animatiestijlen',count:data?.styles.length||0},
    {id:'scenes',label:'Originele scènes',count:data?.scenes.length||0},
    {id:'own',label:'Eigen formats',count:ownTemplateNames.length},
  ];
  const list=useMemo(()=>{
    if(!data)return [];
    const source=tab==='styles'?data.styles:tab==='scenes'?data.scenes:[];
    const needle=normalized(term.trim());
    return source.filter(item=>
      (category==='all'||item.category===category)&&
      (!needle||normalized([item.title,item.id,item.category,item.description,item.bestFor,item.engine].join(' ')).includes(needle))
    );
  },[data,tab,term,category]);
  const ownList=useMemo(()=>ownTemplateNames.filter(id=>!term.trim()||normalized(id+' '+ownTemplates[id].name+' '+ownTemplates[id].description).includes(normalized(term.trim()))),[term]);
  const shown=tab==='own'?ownList.slice(0,limit):list.slice(0,limit);
  const total=tab==='own'?ownList.length:list.length;
  const categories=tab==='styles'?data?.categories||[]:tab==='scenes'?[...new Set(data?.scenes.map(item=>item.category)||[])]:[];
  const prompt=makePrompt({style:selectedStyle,scenes:selectedScenes,own:ownId,title,aspect,length});
  const ready=Boolean(styleId&&(ownId||sceneIds.length));

  function chooseStyle(id){
    setStyleId(old=>old===id?'':id);
    setNotice('');
  }
  function chooseScene(id){
    if(sceneIds.includes(id))setSceneIds(current=>current.filter(item=>item!==id));
    else if(sceneIds.length<SCENE_LIMIT){
      setSceneIds(current=>[...current,id]);
      setOwnId('');
    }else{
      setNotice('Kies maximaal '+SCENE_LIMIT+' scènes per project.');
    }
  }
  function chooseOwn(id){
    setOwnId(current=>current===id?'':id);
    setSceneIds([]);
    setNotice('');
  }
  function changeTab(next){
    setTab(next);setCategory('all');setTerm('');setLimit(PER_PAGE);
  }
  async function copyPrompt(){
    if(!ready){setNotice('Kies eerst één stijl en minimaal één scène of eigen format.');return;}
    try{
      await navigator.clipboard.writeText(prompt);
      setNotice('Opdracht gekopieerd. Plak deze in een ChatGPT-gesprek met toegang tot je GitHub-repository.');
    }catch{
      setNotice('Automatisch kopiëren is niet beschikbaar. Selecteer de tekst in het opdrachtveld.');
    }
  }

  return (
    <section className="motion-catalog" aria-labelledby="motion-catalog-heading">
      <div className="section-heading">
        <div><span className="section-kicker">MOTIONFORGE · OORSPRONKELIJKE BIBLIOTHEEK</span><h2 id="motion-catalog-heading">Animaties en videostijlen</h2></div>
        <span className="counter">{state.loading?'Laden…':(data?.styles.length||0)+' stijlen · '+(data?.scenes.length||0)+' scènes'}</span>
      </div>
      <p className="catalog-lead">Kies een stijl, voeg bestaande MotionForge-scènes toe en stel daarna één opdracht voor ChatGPT samen. De bestaande GIF-voorbeelden tonen de animaties.</p>
      {state.error&&<div className="empty-library" role="alert"><h3>Catalogus niet geladen</h3><p>{state.error}</p></div>}
      {state.loading&&<div className="empty-library" role="status"><p>MotionForge-catalogus wordt geladen…</p></div>}
      {data&&<>
        <div className="catalog-tabs" role="tablist" aria-label="Catalogusonderdelen">
          {tabs.map(item=><button role="tab" type="button" aria-selected={tab===item.id}
            className={'catalog-tab'+(tab===item.id?' active':'')} key={item.id} onClick={()=>changeTab(item.id)}>
            {item.label} <span>{item.count}</span>
          </button>)}
        </div>
        <div className="catalog-toolbar">
          <label className="catalog-search">Zoeken<input type="search" value={term} onChange={event=>setTerm(event.target.value)} placeholder="Zoek stijl, onderwerp of scène…"/></label>
          {tab!=='own'&&<label>Categorie<select value={category} onChange={event=>setCategory(event.target.value)}>
            <option value="all">Alle categorieën</option>
            {categories.map(item=><option key={item} value={item}>{item}</option>)}
          </select></label>}
          <span className="catalog-counter">{total} resultaten</span>
        </div>
        {total===0?<div className="catalog-no-results">Geen resultaten. Probeer een andere zoekterm of categorie.</div>:null}
        <div className="catalog-grid">
          {tab==='own'?shown.map(name=><OwnCard key={name} name={name} item={ownTemplates[name]}
            selected={ownId===name} onPick={chooseOwn}/>):shown.map(item=><CatalogCard key={item.id} item={item}
            selected={tab==='styles'?styleId===item.id:sceneIds.includes(item.id)}
            onPick={tab==='styles'?chooseStyle:chooseScene}
            type={tab==='styles'?'style':'scene'}/>)}
        </div>
        {total>limit&&<button type="button" className="catalog-more" onClick={()=>setLimit(value=>value+PER_PAGE)}>
          Toon meer ({Math.min(PER_PAGE,total-limit)} van {total-limit} resterend)
        </button>}
        <div className="catalog-composer" id="studio-create-from-style">
          <div className="catalog-composer-header">
            <div><span className="section-kicker">SAMENSTELLEN</span><h3>Van stijl naar videoproject</h3></div>
            <span className="catalog-selection-count">{styleId?'1 stijl':'0 stijlen'} · {sceneIds.length+(ownId?1:0)} onderdelen</span>
          </div>
          <div className="catalog-selected">
            <div><span>Gekozen stijl</span><strong>{selectedStyle?.title||'Kies een animatiestijl'}</strong></div>
            <div><span>Gekozen scènes of format</span><strong>{ownId?ownTemplates[ownId].name:selectedScenes.length?selectedScenes.map(item=>item.title).join(', '):'Kies minstens één scène'}</strong></div>
          </div>
          <div className="catalog-composer-actions">
            <button type="button" onClick={()=>changeTab('styles')} className="catalog-subnav">1 · Stijlen kiezen</button>
            <button type="button" onClick={()=>changeTab('scenes')} className="catalog-subnav">2 · Scènes kiezen</button>
            <button type="button" onClick={()=>changeTab('own')} className="catalog-subnav">Of eigen format kiezen</button>
          </div>
          <div className="catalog-brief">
            <label>Onderwerp of videotitel<input value={title} onChange={event=>setTitle(event.target.value)}
              placeholder="Bijvoorbeeld LONDON ON FOOT" maxLength={100}/></label>
            <label>Beeldformaat<select value={aspect} onChange={event=>setAspect(event.target.value)}>
              <option>16:9</option><option>9:16</option><option>1:1</option><option>4:5</option>
            </select></label>
            <label>Lengte<select value={length} onChange={event=>setLength(event.target.value)}>
              <option value="15">15 seconden</option><option value="30">30 seconden</option>
              <option value="45">45 seconden</option><option value="60">60 seconden</option>
            </select></label>
          </div>
          <label className="catalog-prompt-label">ChatGPT-opdracht<textarea readOnly rows={9} value={prompt}
            aria-label="Samengestelde opdracht voor ChatGPT" onFocus={event=>event.target.select()}/></label>
          <div className="catalog-composer-footer">
            <button type="button" className="button button-primary" onClick={copyPrompt}
              disabled={!ready}>Kopieer ChatGPT-opdracht</button>
            <p>{ready?'Gereed om als GitHub-project uit te werken.':'Selecteer een stijl en minimaal één scène of eigen format.'}</p>
          </div>
          {notice&&<p className="catalog-message" role="status">{notice}</p>}
        </div>
      </>}
    </section>
  );
}

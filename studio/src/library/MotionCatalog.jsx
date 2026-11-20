import {useEffect,useMemo,useRef,useState} from 'react';
import {templates as ownTemplates,templateNames as ownTemplateNames} from '../../project-templates/library.mjs';
import {makePrompt,canCopyStylePrompt} from '../lib/catalog-prompt.mjs';

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
function CatalogCard({item,selected,onPick,type,onCopyPrompt,copied}){
  const description=item.description||'Bekijk het voorbeeld en de bijbehorende bronbestanden.';
  return (
    <article className={'catalog-card'+(selected?' picked':'')}>
      <div className="catalog-card-preview"><Preview key={item.id} item={item}/></div>
      <div className="catalog-card-body">
        <div className="catalog-card-type">{item.category}</div>
        <h3>{item.title}</h3>
        <p>{description}</p>
        {type==='style'&&item.bestFor&&<p className="catalog-uses"><span>Geschikt voor: </span>{item.bestFor}</p>}
        {type==='scene'&&<p className="catalog-native-spec">Origineel: {item.nativeFormat||'formaat onbekend'} · {item.nativeSize?.join(' × ')||'zie params.json'} · {item.engine||'HyperFrames'}</p>}
        {type==='scene'&&item.supportsDuration===false&&<p className="catalog-native-spec">Statisch covertemplate, geen bewegende videoscène</p>}
        <div className="catalog-card-actions">
          <button type="button" className={selected?'catalog-pick selected':'catalog-pick'}
            onClick={()=>onPick(item.id)} aria-pressed={selected}>
            {selected?'Geselecteerd ✓':type==='style'?'Kies stijl':'Kies scène'}
          </button>
          {type==='style'&&<button type="button" className="catalog-copy-style"
            onClick={()=>onCopyPrompt(item)} aria-label={'Kopieer ChatGPT-prompt voor '+item.title}>
            {copied?'Gekopieerd ✓':'Kopieer prompt'}
          </button>}
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
        <div className="catalog-card-type">Eigen Studio-format · niet origineel</div>
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
/**
 * iPad/Safari and embedded browsers sometimes deny navigator.clipboard.
 * Use a user-initiated selection fallback before reporting success.
 * Never clear the source prompt on a failed clipboard permission.
 */
async function copyText(text){
  if(!text||!text.trim())throw Error('Er is nog geen opdracht samengesteld.');
  if(navigator.clipboard?.writeText){
    try{await navigator.clipboard.writeText(text);return true}
    catch{ /* Fall back for Safari/iPad and denied clipboard permission. */ }
  }
  const scratch=document.createElement('textarea');
  scratch.value=text;
  scratch.setAttribute('aria-hidden','true');
  scratch.style.cssText='position:fixed;top:0;left:-9999px;opacity:0;';
  document.body.appendChild(scratch);
  try{
    scratch.focus();
    scratch.select();
    scratch.setSelectionRange(0,text.length);
    return document.execCommand?.('copy')===true;
  }finally{scratch.remove()}
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
  const [copiedStyleId,setCopiedStyleId]=useState('');
  const promptRef=useRef(null);

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
  const formatConflicts=selectedScenes.filter(item=>item.nativeFormat&&item.nativeFormat!==aspect);
  const prompt=makePrompt({style:selectedStyle,scenes:selectedScenes,own:ownId,title,aspect,length});
  // Choosing one original style is enough. Scene selection is optional.
  const ready=canCopyStylePrompt(selectedStyle);

  function chooseStyle(id){
    setStyleId(old=>old===id?'':id);
    setNotice('');setCopiedStyleId('');
  }
  function chooseScene(id){
    setCopiedStyleId('');
    if(sceneIds.includes(id))setSceneIds(current=>current.filter(item=>item!==id));
    else if(sceneIds.length<SCENE_LIMIT){
      setSceneIds(current=>[...current,id]);
      setOwnId('');
    }else{
      setNotice('Kies maximaal '+SCENE_LIMIT+' scènes per project.');
    }
  }
  function chooseOwn(id){
    setCopiedStyleId('');
    setOwnId(current=>current===id?'':id);
    setSceneIds([]);
    setNotice('');
  }
  function changeTab(next){
    setTab(next);setCategory('all');setTerm('');setLimit(PER_PAGE);
  }
  function showManualPrompt(){
    window.requestAnimationFrame(()=>{
      document.getElementById('studio-create-from-style')?.scrollIntoView({behavior:'smooth',block:'start'});
      promptRef.current?.focus();
      promptRef.current?.select();
    });
  }
  async function copyPrompt(){
    if(!ready){setNotice('Kies eerst één MotionForge-stijl. Scènes kiezen is optioneel.');return;}
    try{
      const success=await copyText(prompt);
      if(!success){
        setNotice('Je browser blokkeert automatisch kopiëren. De volledige opdracht staat hieronder: selecteer de tekst en kopieer handmatig.');
        showManualPrompt();
      }else{
        setCopiedStyleId(styleId);
        setNotice('Volledige ChatGPT-opdracht gekopieerd ('+prompt.length+' tekens). Plak deze in ChatGPT met toegang tot GitHub.');
      }
    }catch(error){setNotice(error.message);showManualPrompt()}
  }
  async function copyStylePrompt(style){
    if(!canCopyStylePrompt(style))return;
    // A style-only prompt is immediately useful, even without any scenes.
    const text=makePrompt({style,scenes:selectedScenes,own:ownId,title,aspect,length});
    setStyleId(style.id);
    try{
      const success=await copyText(text);
      if(success){
        setCopiedStyleId(style.id);
        setNotice('Stijlopdracht voor '+style.title+' gekopieerd ('+text.length+' tekens).');
      }else{
        setCopiedStyleId('');
        setNotice('Kopiëren geblokkeerd. De volledige stijlopdracht staat onderaan in het opdrachtveld.');
        showManualPrompt();
      }
    }catch(error){setNotice(error.message);showManualPrompt()}
  }

  return (
    <section className="motion-catalog" aria-labelledby="motion-catalog-heading">
      <div className="section-heading">
        <div><span className="section-kicker">MOTIONFORGE · OORSPRONKELIJKE BIBLIOTHEEK</span><h2 id="motion-catalog-heading">Animaties en videostijlen</h2></div>
        <span className="counter">{state.loading?'Laden…':(data?.styles.length||0)+' stijlen · '+(data?.scenes.length||0)+' scènes'}</span>
      </div>
      <p className="catalog-lead">Kies een stijl en een origineel MotionForge-template. De GIF toont alleen een voorbeeld. Voor een echte video gebruikt de productieworkflow het originele scene-script, parameters, renderengine en de G1–G7 kwaliteitsstappen.</p>
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
            onCopyPrompt={copyStylePrompt} copied={copiedStyleId===item.id}
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
          {formatConflicts.length>0&&<p className="catalog-format-warning" role="status">
            Deze oorspronkelijke templates zijn {formatConflicts.map(item=>item.nativeFormat).join(', ')}:
            {' '}{formatConflicts.map(item=>item.title).join(', ')}.
            Voor {aspect} is een nieuwe opmaak vanuit de originele code en een goedgekeurde storyboardstill nodig.
            Studio maakt geen automatische vervanging.
          </p>}
          <div className="catalog-pipeline-info">
            <strong>Origineel MotionForge-proces</strong>
            <span>Brief (G1) → script (G2) → kosten (G3) → stijl (G4) → echte storyboardstills (G5) → render-QA (G6) → onafhankelijke beoordeling (G7)</span>
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
          <label className="catalog-prompt-label">ChatGPT-opdracht
            <span className="catalog-prompt-count" role="status">
              {ready?'Direct beschikbaar · '+prompt.length+' tekens · '+(selectedScenes.length?'met jouw scènes':'scènes kiezen is optioneel'):
                'Selecteer één stijl om te beginnen'}
            </span>
            <textarea ref={promptRef} readOnly rows={11} value={prompt}
              aria-label="Samengestelde opdracht voor ChatGPT" onFocus={event=>event.target.select()}/>
          </label>
          <div className="catalog-composer-footer">
            <button type="button" className="button button-primary" onClick={copyPrompt}
              disabled={!ready}>Kopieer ChatGPT-opdracht</button>
            <p>{ready?'Gereed om te kopiëren. Zonder scènekeuze vraagt de prompt ChatGPT om originele MotionForge-scènes voor te stellen.':'Selecteer één stijl. Je hoeft geen scène te kiezen.'}</p>
          </div>
          {notice&&<p className="catalog-message" role="status">{notice}</p>}
        </div>
      </>}
    </section>
  );
}

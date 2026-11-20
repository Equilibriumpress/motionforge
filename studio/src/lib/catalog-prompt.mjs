/**
 * MF-style catalogue composition. Pure and testable: any one of the original
 * MotionForge styles is sufficient for a meaningful ChatGPT work order.
 * Scene choice is optional and must use ORIGINAL source contracts after G1.
 */
export function canCopyStylePrompt(style){
  return !!(style&&typeof style.id==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(style.id));
}
export function makePrompt({style,scenes=[],own='',title='',aspect='16:9',length='30'}={}){
  if(!canCopyStylePrompt(style))
    return 'Kies één van de 100 MotionForge-stijlen om een complete ChatGPT-opdracht samen te stellen. Je hoeft nog geen scène te kiezen.';
  const subject=String(title||'').trim()||'[onderwerp of videotitel invullen]';
  const sourceScenes=Array.isArray(scenes)?scenes.filter(Boolean):[];
  const sources=sourceScenes.map(scene=>'templates/'+scene.id+
    ' · '+(scene.engine||'hyperframes')+
    ' · origineel '+(scene.nativeFormat||'onbekend formaat')+
    ' ('+(scene.nativeSize?.join('×')||'zie params.json')+')');
  const incompatible=sourceScenes.filter(scene=>scene.nativeFormat&&scene.nativeFormat!==aspect);
  const formatStep=incompatible.length?
    'FORMAATCONFLICT: '+incompatible.map(scene=>scene.id+' is '+scene.nativeFormat).join(', ')+
    '. Maak vóór productie een nieuwe brongetrouwe layout voor '+aspect+
    ', toon die ter goedkeuring (G5) en controleer de render. Rek/crop de originele preview niet en vervang het template niet door een Canvas-imitatie.':
    'Controleer voor elke gekozen scène het native formaat, het volledige videokader en veilige marges. Pas bij een andere verhouding de echte broncode gericht aan.';
  const sceneStep=own?
    'Eigen Studio-format: '+own+' (geen upstream MotionForge-template). Gebruik studio/project-templates/library.mjs en vermeld deze afwijking uitdrukkelijk.':
    sourceScenes.length?
      'Door de gebruiker geselecteerde ORIGINELE scènes:\n'+sources.map(x=>'- '+x).join('\n'):
      'Er is nog GEEN scène gekozen. Stel bij G1/G2 zelf 3 tot 5 passende ORIGINELE MotionForge-templates voor op basis van de gekozen stijl en het onderwerp. Motiveer elke keuze met de originele preview, het doel van de scène en het native formaat. Vraag akkoord op de scènekeuze vóór G5. Gebruik geen generieke vervangers.';
  const sourceInstruction=own?
    'Voor het eigen format: gebruik de bestaande eigen broncode en benoem dat dit niet één van de oorspronkelijke MotionForge-templates is.':
    'Gebruik uitsluitend de originele code, parameters, animatie- en rendertechniek van ieder gekozen template. Lees templates/<id>/index.html en params.json en gebruik engines/hyperframes/scripts/new-scene.sh --template <id> --params <values.json>. Gebruik studio/scripts/new-from-upstream.mjs --plan <video-plan.json> bij 3 of meer scènes. Behoud de originele GSAP-, Three.js-/WebGL- en assetlogica; geen zelfbedachte Canvas-imitatie.';
  return [
    'PRODUCTIEVERZOEK · ORIGINELE MOTIONFORGE-METHODE',
    'Repository: Equilibriumpress/motionforge.',
    'Onderwerp/titel: '+subject+'. Taal: Nederlands. Totale lengte: '+length+' seconden. Gewenst formaat: '+aspect+'.',
    'Gekozen MotionForge-stijl: '+style.id+' ('+(style.title||style.id)+').',
    'Lees de VOLLEDIGE skills/style-library/styles/'+style.id+'/STYLE.md. Sla een projectkopie op onder style/STYLE.md. Gebruik het oorspronkelijke palette, de typografie, het ritme, de kadrering en de beweging.',
    'Doel en visuele richting van de gekozen stijl: '+(style.description||'Zie de originele STYLE.md.')+
      (style.bestFor?' Geschikt voor: '+style.bestFor+'.':''),
    sceneStep,
    'Lees AGENTS.md, de VOLLEDIGE skills/motion-director/SKILL.md, de originele script-, voice-, brand- en qa-review-skills en docs/STUDIO_AGENT_WORKFLOW.md. Houd ChatGPT als Motion Director; maak geen extra AI-agent.',
    'G1: maak de vijfregelige briefing. Controleer het gekozen onderwerp, de doelgroep, het platform en de doelstelling. Bij ontbrekende gegevens: schrijf aannames in het voorstel en vraag goedkeuring.',
    'G2: schrijf drie hookopties, het script, de visuele scènestructuur en de controleerbare claimlijst. Laat het script goedkeuren.',
    'G3: vraag expliciet toestemming vóór iedere betaalde dienst. Maak bij ontbreken van goedgekeurde audio een stille conceptversie, zonder verzonnen woordtiming.',
    'G4: werk de gekozen stijl consequent uit in de originele scènes. Leg alle bewuste afwijkingen van STYLE.md vast.',
    sourceInstruction,
    formatStep,
    'G5: render echte storyboardstills uit de originele scènes, toon die voor akkoord, en verifieer bronnen en rechten van alle gebruikte media.',
    'G6: voer de oorspronkelijke HyperFrames-lint, textcheck, readcheck, volledige-render-, duur-, geluids- en videokadercontroles uit. Een geslaagde codebuild is geen video-QA.',
    'G7: laat een critic in een onafhankelijke context de echte frames beoordelen. Los alle FAIL/FIX-punten op vóór een projectstatus ready.',
    'Leg G1–G7 en werkelijk bewijs vast in production.json. Gebruik node studio/scripts/motion-director-workflow.mjs --project <slug> om de originele skills per fase te raadplegen.',
    'Sla project.json, brief.md, script.md, direction.json, brand.json, style/STYLE.md, originele scène-HTML, params.json, bronvermeldingen en QA-bestanden op onder videos/<slug>/.',
    'Publiceer de broncode via een featurebranch en pull request. Niet automatisch mergen zonder mijn toestemming. Maak de video zichtbaar in de GitHub Pages Studio. Bied een browser-MP4-export aan waar ondersteund, met lokale render-worker als alternatief.',
    'Rapporteer nauwkeurig wat werkelijk is gerenderd, getest en beoordeeld. Geen GitHub Actions-video-render, ongeautoriseerde kosten of ongecontroleerde externe assets.'
  ].join('\n\n');
}

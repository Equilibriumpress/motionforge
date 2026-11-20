#!/usr/bin/env node
/**
 * MF-12B — multi-scene original MotionForge scaffold.
 * Every scene is instantiated using the upstream new-scene.sh and its params.json.
 * No media generation, TTS, MP4 or remote calls are performed.
 */
import path from 'node:path';
import os from 'node:os';
import {existsSync} from 'node:fs';
import {copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {repoRoot, studioRoot, templateFormat, verifyContract} from './new-from-upstream.mjs';
import {checkOriginalProject} from './validate-native-production.mjs';

const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DIMENSIONS={'9:16':[1080,1920],'16:9':[1920,1080],'1:1':[1080,1080],'4:5':[1080,1350]};
const GATES=['G1','G2','G3','G4','G5','G6','G7'];
const json=o=>JSON.stringify(o,null,2)+'\n';
const sha=s=>createHash('sha256').update(s).digest('hex');
const clean=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const nonempty=v=>typeof v==='string'&&v.trim().length>0;
const validSlug=v=>typeof v==='string'&&SLUG.test(v);
const isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const assert=(test,message)=>{if(!test)throw Error(message);};
const frameValue=(n,fps)=>Number.isFinite(n)&&n>=1&&Number.isInteger(Math.round(n*fps))&&Math.abs(n*fps-Math.round(n*fps))<1e-6;

function requiredRuntime(template,spec){
  const deps=['gsap'];
  if(template.endsWith('-3d')||spec.requires?.some(r=>typeof r==='string'&&r.includes('three')))deps.push('three');
  if(template==='globe-arcs-3d')deps.push('world-atlas','topojson-client');
  return deps;
}
function checkedAdaptationName(planPath,scene){
  const input=scene.adaptation?.source;
  assert(typeof input==='string'&&input.endsWith('.html')&&!path.isAbsolute(input)&&
    !input.split(/[\\/]/).includes('..'),'Scene '+scene.id+': adaptation.source must be a project-plan-relative .html file');
  return path.resolve(path.dirname(planPath),input);
}
function normalizedParams(plan,scene,spec){
  assert(isObject(scene.params),'Scene '+scene.id+': provide original template params object (no sample demo values).');
  const params={...scene.params};
  if(spec.parameters?.lang&&!Object.hasOwn(params,'lang'))params.lang=plan.language;
  params.duration=scene.durationSeconds;
  // Require explicitly authored, scene-specific values beyond engine controls.
  assert(Object.keys(scene.params).some(k=>!['duration','lang','theme','start','stagger','exit','underline'].includes(k)),
    'Scene '+scene.id+': provide real content-specific params, not only timing/theme.');
  return params;
}
export function validateVideoPlan(plan,specs){
  assert(isObject(plan),'Video plan must be a JSON object.');
  assert(validSlug(plan.slug)&&nonempty(plan.title)&&plan.title.length<=100,
    'Provide a valid slug and title (max 100 chars).');
  assert(validSlug(plan.style),'Style must be an original MotionForge style slug.');
  assert(/^[a-z]{2}(?:-[A-Z]{2})?$/.test(plan.language||''),'Valid language required, such as nl or en.');
  assert(Object.hasOwn(DIMENSIONS,plan.format),'Format must be 9:16, 16:9, 1:1 or 4:5.');
  const fps=plan.fps??30;
  assert(Number.isInteger(fps)&&fps>=12&&fps<=120,'FPS must be an integer from 12 to 120.');
  assert(Number.isInteger(plan.storyFormat)&&plan.storyFormat>=1&&plan.storyFormat<=8,
    'Specify original MotionForge storyFormat (1–8).');
  assert(isObject(plan.brief)&&['goal','audience','platform','tone'].every(k=>nonempty(plan.brief[k])),
    'A complete five-line brief needs goal, audience, platform and tone.');
  assert(isObject(plan.direction)&&['concept','visualRule','motif'].every(k=>nonempty(plan.direction[k])),
    'Specify concept, visualRule and recurring motif for direction.json.');
  assert(Array.isArray(plan.scenes)&&plan.scenes.length>=3&&plan.scenes.length<=30,
    'Provide 3–30 scenes: original MotionForge direction requires a recurring motif in at least three scenes.');
  assert(!Object.hasOwn(plan,'paidCalls')||plan.paidCalls===false,
    'Paid calls are outside the scaffold. Request explicit approval under G3 first.');
  let frame=0;
  const seen=new Set(),motifRoles=[];
  const scenes=plan.scenes.map(scene=>{
    assert(isObject(scene)&&validSlug(scene.id)&&!seen.has(scene.id),
      'Scene IDs must be unique kebab-case strings.');
    seen.add(scene.id);
    assert(validSlug(scene.template)&&nonempty(scene.title),
      'Scene '+scene.id+': template slug and title are required.');
    const spec=specs.get(scene.template);
    assert(spec,'Scene '+scene.id+': original template contract is missing.');
    assert(frameValue(scene.durationSeconds,fps),
      'Scene '+scene.id+': duration must be >=1s and align exactly with '+fps+' fps.');
    assert(isObject(scene.direction)&&['layout','entrance','hero','onScreenText','cue','motifRole'].every(k=>nonempty(scene.direction[k])),
      'Scene '+scene.id+': explicit cue, layout, entrance, hero, onScreenText and motifRole required.');
    motifRoles.push(scene.direction.motifRole);
    const native=templateFormat(spec.size),params=normalizedParams(plan,scene,spec);
    verifyContract(spec,{template:scene.template,format:native,duration:scene.durationSeconds,params});
    if(native!==plan.format){
      assert(isObject(scene.adaptation)&&nonempty(scene.adaptation.notes)&&nonempty(scene.adaptation.source),
        'Scene '+scene.id+': original '+native+' template requires an authored '+plan.format+
        ' HTML adaptation and review notes. No automatic stretch or Canvas substitution.');
    }
    if(scene.adaptation){
      assert(nonempty(scene.adaptation.notes)&&nonempty(scene.adaptation.source),
        'Scene '+scene.id+': adaptation needs source and notes.');
    }
    const result={...scene,params,nativeFormat:native,nativeSize:spec.size,
      startSeconds:frame/fps,startFrame:frame,frames:Math.round(scene.durationSeconds*fps)};
    frame+=result.frames;
    return result;
  });
  for(let i=1;i<scenes.length;i++){
    const a=scenes[i-1].direction,b=scenes[i].direction;
    assert(a.layout!==b.layout||a.entrance!==b.entrance,
      'Adjacent scenes '+scenes[i-1].id+' and '+scenes[i].id+
      ' must differ in layout or entrance (original direction-json contract).');
  }
  assert(new Set(motifRoles).size>=2,
    'The recurring motif must change role in at least one scene (original direction-json contract).');
  const duration=frame/fps;
  assert(Number.isInteger(frame)&&frame>0,'Frame total must be positive.');
  assert(Math.abs((plan.durationSeconds??duration)-duration)<1e-6,
    'Planned durationSeconds must exactly equal the sum of scene durations ('+duration+'s).');
  assert(scenes.some(s=>s.nativeFormat!==plan.format)===false||
    scenes.filter(s=>s.nativeFormat!==plan.format).every(s=>s.adaptation),
    'All non-native scene formats must be explicitly adapted.');
  return {...plan,fps,durationSeconds:duration,totalFrames:frame,scenes};
}

export async function preflightVideoPlan(filename){
  const planFile=path.resolve(filename);
  const raw=JSON.parse(await readFile(planFile,'utf8'));
  assert(isObject(raw)&&Array.isArray(raw.scenes),'Video plan must contain scenes.');
  const stylePath=path.join(repoRoot,'skills/style-library/styles',raw.style||'','STYLE.md');
  assert(validSlug(raw.style)&&existsSync(stylePath),'Selected original STYLE.md missing: '+raw.style);
  const specs=new Map(),sources=new Map();
  for(const scene of raw.scenes){
    assert(isObject(scene)&&validSlug(scene.template),'Invalid original template ID.');
    if(specs.has(scene.template))continue;
    const base=path.join(repoRoot,'templates',scene.template);
    const schema=path.join(base,'params.json'),html=path.join(base,'index.html');
    assert(existsSync(schema)&&existsSync(html),'Original template missing: '+scene.template);
    specs.set(scene.template,JSON.parse(await readFile(schema,'utf8')));
    sources.set(scene.template,await readFile(html,'utf8'));
  }
  const plan=validateVideoPlan(raw,specs);
  const adaptations=new Map();
  for(const scene of plan.scenes){
    if(!scene.adaptation)continue;
    const html=await readFile(checkedAdaptationName(planFile,scene),'utf8');
    const [w,h]=DIMENSIONS[plan.format];
    assert(html.includes('motionforge template: '+scene.template)&&
      html.includes('MF.timeline(')&&html.includes('const P = MF.params()')&&
      html.includes('data-width="'+w+'" data-height="'+h+'"'),
      'Scene '+scene.id+': adaptation must retain original template, HyperFrames timeline and '+w+'x'+h+' scene stage.');
    if(scene.template.endsWith('-3d'))
      assert(html.includes('onSeek(')&&html.includes('import * as THREE from "three"'),
        'Scene '+scene.id+': original Three.js rendering/seek code must be preserved.');
    const block=html.match(/<script id="params" type="application\/json">([\s\S]*?)<\/script>/);
    assert(block,'Scene '+scene.id+': adapted source has no original params block.');
    JSON.parse(block[1]);
    adaptations.set(scene.id,html);
  }
  return {plan,planFile,stylePath,specs,sources,adaptations};
}

function validateSceneFiles(dir,scene,spec){
  const required=['index.html','params.json','assets/base.css','assets/mf-runtime.js','assets/vendor/gsap.min.js'];
  if(requiredRuntime(scene.template,spec).includes('three'))
    required.push('assets/vendor/three.module.min.js','assets/vendor/mf-three.js');
  if(scene.template==='globe-arcs-3d')
    required.push('assets/vendor/land-50m.json','assets/vendor/topojson-client.min.js');
  for(const rel of required)
    assert(existsSync(path.join(dir,rel)),'Scene '+scene.id+': upstream asset missing: '+rel);
}
function insertOriginalParams(adapted,generated,scene){
  const re=/(<script id="params" type="application\/json">)[\s\S]*?(<\/script>)/;
  const generatedBlock=generated.match(re);
  assert(generatedBlock,'Generated scene is missing original params.');
  const embedded=JSON.parse(generatedBlock[0].replace(/^<script[^>]*>/,'').replace(/<\/script>$/,''));
  for(const [key,value] of Object.entries(scene.params))
    assert(JSON.stringify(embedded[key])===JSON.stringify(value),
      'Upstream new-scene.sh did not apply '+key+' for scene '+scene.id);
  const rebuilt=adapted.replace(re,()=>generatedBlock[0]);
  assert(rebuilt!==adapted||adapted.includes(generatedBlock[0]),
    'Scene '+scene.id+': unable to install original params.');
  return rebuilt;
}
const pendingGates=()=>Object.fromEntries(GATES.map(g=>[g,{status:'pending',evidence:null}]));
function sceneRecord(scene){
  return {id:scene.id,title:scene.title,startSeconds:scene.startSeconds,durationSeconds:scene.durationSeconds,
    engine:'hyperframes',source:'scenes/'+scene.id+'/index.html'};
}
export async function scaffoldMultiScene(argv){
  let planFile=null,dryRun=false;
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--dry-run'){dryRun=true;continue;}
    assert(argv[i]==='--plan'&&!planFile&&argv[i+1],'Usage: --plan <file.json> [--dry-run]');
    planFile=argv[++i];
  }
  assert(planFile,'Provide --plan path/to/video-plan.json');
  const prep=await preflightVideoPlan(planFile),p=prep.plan;
  const finalDir=path.join(repoRoot,'videos',p.slug);
  assert(!existsSync(finalDir),'Project already exists; refusing overwrite: '+p.slug);
  const summary={dryRun,slug:p.slug,style:p.style,format:p.format,durationSeconds:p.durationSeconds,
    totalFrames:p.totalFrames,scenes:p.scenes.map(s=>({
      id:s.id,template:s.template,nativeFormat:s.nativeFormat,frames:s.frames,
      startSeconds:s.startSeconds,adapted:!!s.adaptation
    })),sourceMethod:'original-motionforge',rendered:false,approved:false};
  if(dryRun){process.stdout.write(json(summary));return summary;}

  const deps=new Set();
  for(const s of p.scenes)for(const dep of requiredRuntime(s.template,prep.specs.get(s.template)))deps.add(dep);
  for(const dep of deps)
    assert(existsSync(path.join(studioRoot,'node_modules',dep,'package.json')),
      'Missing '+dep+'; cd studio && npm install. No files created.');
  const root=path.join(repoRoot,'videos');
  await mkdir(root,{recursive:true});
  const staging=await mkdtemp(path.join(root,'.'+p.slug+'-staging-'));
  let published=false;
  try{
    for(const sub of ['style','assets','qa','scenes'])await mkdir(path.join(staging,sub),{recursive:true});
    await copyFile(prep.stylePath,path.join(staging,'style/STYLE.md'));
    const refs=[];
    for(const s of p.scenes){
      const values=path.join(staging,'scenes',s.id+'-params.json');
      await writeFile(values,json(s.params));
      const run=spawnSync('bash',[path.join(repoRoot,'engines/hyperframes/scripts/new-scene.sh'),
        s.id,'--dest',path.join(staging,'scenes'),'--template',s.template,'--params',values],
        {cwd:studioRoot,encoding:'utf8',timeout:120000});
      assert(run.status===0,'Original new-scene.sh failed in '+s.id+': '+(run.stderr||run.error?.message||run.stdout));
      const sceneDir=path.join(staging,'scenes',s.id),spec=prep.specs.get(s.template);
      validateSceneFiles(sceneDir,s,spec);
      const templateHtml=await readFile(path.join(sceneDir,'index.html'),'utf8');
      const adapted=prep.adaptations.get(s.id);
      if(adapted)await writeFile(path.join(sceneDir,'index.html'),insertOriginalParams(adapted,templateHtml,s));
      await copyFile(values,path.join(sceneDir,'params.values.json'));
      await rm(values,{force:true});
      await rm(path.join(sceneDir,'preview.gif'),{force:true});
      const css=await readFile(path.join(sceneDir,'assets/base.css'),'utf8');
      const fonts=[...new Set([...css.matchAll(/fonts\/([^"'()]+\.woff2)/g)].map(m=>m[1]))];
      for(const font of fonts)
        assert(existsSync(path.join(sceneDir,'assets/fonts',font)),
          'Original font missing for '+s.id+': '+font+'. Install @fontsource packages.');
      refs.push({id:s.id,template:s.template,originalSource:'templates/'+s.template+'/index.html',
        source:'scenes/'+s.id+'/index.html',parameters:'scenes/'+s.id+'/params.values.json',
        nativeFormat:s.nativeFormat,nativeSize:s.nativeSize,sourceSha256:sha(prep.sources.get(s.template)),
        ...(s.adaptation?{adaptation:{targetFormat:p.format,status:'draft',notes:s.adaptation.notes,evidence:null}}:{})});
    }
    const dims=DIMENSIONS[p.format],first=refs[0];
    const manifest={schemaVersion:1,id:p.slug,title:p.title,description:p.description||'Origineel MotionForge multi-scene concept; storyboard en rendering nog niet goedgekeurd.',
      status:'concept',language:p.language,format:p.format,engine:'hyperframes',
      durationSeconds:p.durationSeconds,fps:p.fps,cover:'assets/cover.svg',
      tags:[p.style,...new Set(p.scenes.map(s=>s.template)),'upstream-source'],
      styleId:p.style,templateId:first.template,scenes:p.scenes.map(sceneRecord)};
    const direction={slug:p.slug,language:p.language,format:{main:p.format,extra:[],width:dims[0],height:dims[1],fps:p.fps},
      story_format:p.storyFormat,style:'style/STYLE.md',brand:'brand.json',concept:p.direction.concept,
      visual_rule:p.direction.visualRule,motif:p.direction.motif,approved_by:null,
      scenes:p.scenes.map(s=>({id:s.id,start:s.startSeconds,end:s.startSeconds+s.durationSeconds,
        cue:s.direction.cue,estimate:true,engine:'hyperframes',template:'templates/'+s.template,
        layout:s.direction.layout,entrance:s.direction.entrance,hero:s.direction.hero,
        on_screen_text:s.direction.onScreenText,assets:[],sfx:[],notes:s.direction.notes||''}))};
    const hasAdapt=p.scenes.some(s=>s.adaptation);
    const prod={schemaVersion:1,sourceMethod:'original-motionforge',workflow:{
      agent:'ChatGPT',entrypoint:'skills/motion-director/SKILL.md',
      protocol:'docs/STUDIO_AGENT_WORKFLOW.md',state:'awaiting-G1'},selectedStyle:p.style,
      templateSource:first.originalSource,parameterContract:'templates/'+first.template+'/params.json',
      parameterValues:first.parameters,sourceScene:first.source,originalFormat:first.nativeFormat,
      engine:'hyperframes',sourceSha256:first.sourceSha256,sceneTemplates:refs,
      ...(hasAdapt?{adaptation:{targetFormat:p.format,status:'draft',
        notes:'Original source-based layouts for: '+p.scenes.filter(s=>s.adaptation).map(s=>s.id).join(', '),
        evidence:null}}:{}),gates:pendingGates()};
    await writeFile(path.join(staging,'project.json'),json(manifest));
    await writeFile(path.join(staging,'production.json'),json(prod));
    await writeFile(path.join(staging,'direction.json'),json(direction));
    await writeFile(path.join(staging,'brand.json'),json({sourceStyle:'style/STYLE.md',brand:null,overrides:[]}));
    await writeFile(path.join(staging,'brief.md'),[
      'Goal: '+p.brief.goal,'Audience: '+p.brief.audience,
      'Platform + format: '+p.brief.platform+' · '+p.format+' ('+dims.join('×')+')',
      'Length: '+p.durationSeconds+' seconds · '+p.fps+' fps','Tone + brand: '+p.brief.tone+' · '+p.style
    ].join('\n')+'\n');
    await writeFile(path.join(staging,'script.md'),'# '+p.title+'\n\nStatus: concept. The agent must use skills/script-and-hooks/SKILL.md for hook options, script, scene table and sourced claim list. G2 remains pending until explicit approval.\n');
    await writeFile(path.join(staging,'decisions.md'),'# Production decisions\n\nOriginal MotionForge templates: '+
      refs.map(r=>r.template).join(', ')+'.\nAll G1–G7 stages are pending. No voice, sound or paid calls were made. Source assets may be sample material: review rights and replace before delivery.\n');
    await writeFile(path.join(staging,'assets/CREDITS.md'),'# Original MotionForge source and media review\n\n'+
      refs.map(r=>'- '+r.originalSource+' (MotionForge contributors, MIT)').join('\n')+
      '\n- Style: skills/style-library/styles/'+p.style+'/STYLE.md\n- Runtime dependencies: see npm licences.\n- Any sample photos/audio/screens require a separate rights check before final delivery.\n');
    await writeFile(path.join(staging,'qa/README.md'),'No frame has been rendered or approved. Follow skills/qa-review/SKILL.md; G5/G6/G7 remain pending. Use contact sheets, audio/text/safe-area checks and an independent critic.\n');
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+dims.join(' ')+
      '"><rect width="100%" height="100%" fill="#16282a"/><text x="7%" y="35%" fill="#ffffff" font-family="sans-serif" font-size="50">'+
      clean(p.title)+'</text><text x="7%" y="83%" fill="#b8c5c5" font-family="sans-serif" font-size="25">DRAFT · MOTIONFORGE SOURCE PROJECT</text></svg>\n';
    await writeFile(path.join(staging,'assets/cover.svg'),svg);
    const check=await checkOriginalProject(staging);
    assert(!check.some(x=>x.level==='FAIL'),'Native production provenance invalid: '+JSON.stringify(check));
    assert(!existsSync(finalDir),'Project destination appeared during build; refusing overwrite.');
    await rename(staging,finalDir);
    published=true;
    process.stdout.write(json({...summary,dryRun:false,created:'videos/'+p.slug,
      message:'Original source project created. G1–G7, preview and MP4 remain pending.'}));
    return summary;
  }finally{
    if(!published)await rm(staging,{recursive:true,force:true});
  }
}
const direct=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct)scaffoldMultiScene(process.argv.slice(2)).catch(error=>{
  console.error(error.message);process.exitCode=1;
});

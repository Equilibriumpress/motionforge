#!/usr/bin/env node
/**
 * MF-10: instantiate ORIGINAL MotionForge scenes, never a generic replacement.
 *
 * The upstream engines/hyperframes/scripts/new-scene.sh is the scene authoring
 * path. Studio adds a source-tracked project manifest and explicit approval gates.
 *
 * Example:
 * node studio/scripts/new-from-upstream.mjs --template kinetic-title --style route-journey \
 *   --slug test-intro --title "Test" --format 9:16 --duration 4 --language nl
 *
 * For custom params: --params /path/to/values.json
 * A 9:16 source is NOT implicitly converted into 16:9. Redesign + board QA is required.
 */
import path from 'node:path';
import os from 'node:os';
import {existsSync} from 'node:fs';
import {copyFile,readFile,writeFile,mkdir,rm,mkdtemp} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const studioRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const repoRoot=path.resolve(studioRoot,'..');
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FORMATS={'16:9':[16,9],'9:16':[9,16],'1:1':[1,1],'4:5':[4,5]};
export function templateFormat([width,height]){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0)throw Error('Invalid template size');
  return Object.entries(FORMATS).find(([,pair])=>pair[0]*height===pair[1]*width)?.[0]||'custom';
}
export function verifyContract(spec,{template,format,duration,params={}}){
  if(!spec||spec.id!==template||spec.engine!=='hyperframes')throw Error('Template source contract not supported');
  const original=templateFormat(spec.size);
  if(original!==format)throw Error('Original '+template+' is '+spec.size.join('×')+' ('+original+'). '+format+
    ' requires a separately authored layout and reviewed storyboard. Studio does not substitute a Canvas scene or stretch the preview.');
  if(!spec.parameters?.duration)throw Error('This template has no duration control. Use it as a still, not as a time-based scene.');
  if(!(Number.isFinite(duration)&&duration>=1&&duration<=600))throw Error('Duration must be 1–600 seconds');
  for(const [name,value] of Object.entries(params)){
    const rule=spec.parameters?.[name];
    if(!rule)throw Error('Unsupported original parameter: '+name);
    const type=rule.type;
    const ok=type==='integer'?Number.isInteger(value):
      type==='number'?typeof value==='number'&&Number.isFinite(value):
      type==='array'?Array.isArray(value):
      type==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):
      type==='boolean'?typeof value==='boolean':
      type==='string'?typeof value==='string':true;
    if(!ok||rule.enum&&!rule.enum.includes(value))throw Error('Invalid original parameter '+name+' ('+type+')');
  }
  if(template==='globe-arcs-3d'&&!Array.isArray(params.cities))throw Error('globe-arcs-3d needs custom cities in --params; default example cities must not be presented as user locations.');
  if(/<\/script/i.test(JSON.stringify(params)))throw Error('Scene parameter contains an unsafe script closing tag.');
  return original;
}
function options(argv){
  const map=new Map();
  for(let i=0;i<argv.length;i++){
    const key=argv[i];
    if(key==='--dry-run'){map.set('dry-run',true);continue;}
    if(!key.startsWith('--')||!argv[i+1]||argv[i+1].startsWith('--'))throw Error('Use --name value pairs.');
    const name=key.slice(2);
    if(!['template','style','slug','title','format','duration','language','params'].includes(name))throw Error('Unknown option: '+key);
    map.set(name,argv[++i]);
  }
  return map;
}
const json=value=>JSON.stringify(value,null,2)+'\n';
const xml=s=>s.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
const sha=s=>createHash('sha256').update(s).digest('hex');

export async function scaffold(argv){
  const opt=options(argv);
  const template=opt.get('template'),style=opt.get('style'),slug=opt.get('slug');
  const title=opt.get('title'),lang=opt.get('language')||'nl';
  if(![template,style,slug].every(x=>SLUG.test(x||'')))throw Error('Supply valid --template, --style and --slug.');
  if(!title?.trim()||title.length>100)throw Error('A project --title is required (max 100 chars).');
  if(!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(lang))throw Error('Invalid language code.');
  const specPath=path.join(repoRoot,'templates',template,'params.json');
  const templateHtml=path.join(repoRoot,'templates',template,'index.html');
  const stylePath=path.join(repoRoot,'skills','style-library','styles',style,'STYLE.md');
  for(const file of [specPath,templateHtml,stylePath])if(!existsSync(file))throw Error('Missing original MotionForge source: '+file);
  const spec=JSON.parse(await readFile(specPath,'utf8'));
  const format=opt.get('format')||templateFormat(spec.size);
  if(!FORMATS[format])throw Error('Studio project requires a supported format: 9:16, 16:9, 1:1 or 4:5');
  let inputs={};
  if(opt.has('params')){
    inputs=JSON.parse(await readFile(path.resolve(opt.get('params')),'utf8'));
    if(!inputs||Array.isArray(inputs)||typeof inputs!=='object')throw Error('--params must be a JSON object');
  }
  const duration=Number(opt.get('duration')??inputs.duration??spec.parameters?.duration?.default??0);
  const overrides={...inputs};
  if(spec.parameters.lang&&!('lang' in overrides))overrides.lang=lang;
  if(spec.parameters.title&&!('title' in overrides))overrides.title=title;
  if(spec.parameters.headline&&!('headline' in overrides))overrides.headline=title;
  if(spec.parameters.lines&&!('lines' in overrides))overrides.lines=[title];
  overrides.duration=duration;
  verifyContract(spec,{template,format,duration,params:overrides});
  const destination=path.join(repoRoot,'videos',slug);
  if(existsSync(destination))throw Error('Project folder already exists; no overwrite: '+slug);
  const source=await readFile(templateHtml,'utf8');
  const plan={
    project:slug,engine:spec.engine,sourceTemplate:'templates/'+template,
    originalFormat:format,originalSize:spec.size,style:'skills/style-library/styles/'+style+'/STYLE.md',
    durationSeconds:duration,parameters:overrides,sourceSha256:sha(source),
    pipeline:'original MotionForge new-scene.sh'
  };
  if(opt.has('dry-run')){
    process.stdout.write(json({dryRun:true,...plan,notice:'No scene was copied, no browser QA or video render occurred.'}));
    return plan;
  }
  // Require the upstream runtime before any mutation: don't produce an inert
  // project whose GIF looks polished while the original code cannot run.
  const modules=path.join(studioRoot,'node_modules');
  const dependencies=['gsap'];
  if(template.endsWith('-3d')||spec.requires?.some(x=>x.includes('three@')))dependencies.push('three');
  if(template==='globe-arcs-3d')dependencies.push('world-atlas','topojson-client');
  for(const pkg of dependencies){
    if(!existsSync(path.join(modules,pkg,'package.json')))throw Error('Install Studio dependencies first: cd studio && npm install (missing '+pkg+')');
  }
  const tmp=await mkdtemp(path.join(os.tmpdir(),'motionforge-template-'));
  let owned=false;
  try{
    await writeFile(path.join(tmp,'params.json'),json(overrides));
    await mkdir(destination);
    owned=true;
    await mkdir(path.join(destination,'style'),{recursive:true});
    await mkdir(path.join(destination,'assets'),{recursive:true});
    await mkdir(path.join(destination,'qa'),{recursive:true});
    await copyFile(stylePath,path.join(destination,'style','STYLE.md'));
    const generator=path.join(repoRoot,'engines','hyperframes','scripts','new-scene.sh');
    const run=spawnSync('bash',[generator,'intro','--dest',path.join(destination,'scenes'),
      '--template',template,'--params',path.join(tmp,'params.json')],{
      cwd:studioRoot,encoding:'utf8'
    });
    if(run.error||run.status!==0)throw Error('Original MotionForge new-scene.sh failed:\n'+(run.stderr||run.error?.message||run.stdout));
    const scene=path.join(destination,'scenes','intro');
    for(const file of ['index.html','params.json','assets/base.css','assets/mf-runtime.js','assets/vendor/gsap.min.js']){
      if(!existsSync(path.join(scene,file)))throw Error('Original scene preparation incomplete: '+file);
    }
    if(dependencies.includes('three')){
      for(const file of ['assets/vendor/three.module.min.js','assets/vendor/mf-three.js']){
        if(!existsSync(path.join(scene,file)))throw Error('Original 3D runtime missing: '+file);
      }
    }
    // Missing upstream font files are not silently accepted: otherwise a
    // scene differs from its original style despite technically rendering.
    const baseCss=await readFile(path.join(scene,'assets/base.css'),'utf8');
    const expectedFonts=[...new Set([...baseCss.matchAll(/fonts\/([^"'()]+\.woff2)/g)].map(match=>match[1]))];
    for(const font of expectedFonts){
      if(!existsSync(path.join(scene,'assets','fonts',font)))throw Error('Required original template font missing: '+font+
        '. Install @fontsource packages in studio and retry.');
    }
    await rm(path.join(scene,'preview.gif'),{force:true}); // upstream GIF stays in templates/, not duplicated in every project
    if(template==='globe-arcs-3d')for(const f of ['assets/vendor/land-50m.json','assets/vendor/topojson-client.min.js']){
      if(!existsSync(path.join(scene,f)))throw Error('Globe requires original map dependency: '+f);
    }
    const [w,h]=spec.size;
    const manifest={
      schemaVersion:1,id:slug,title,description:'Origineel MotionForge-templateproject. Script en storyboard nog niet goedgekeurd.',
      status:'concept',language:lang,format,engine:'hyperframes',durationSeconds:duration,fps:30,
      cover:'assets/cover.svg',tags:[style,template,'upstream-source'],
      styleId:style,templateId:template,scenes:[{
        id:'intro',title:'Origineel template: '+template,startSeconds:0,durationSeconds:duration,
        engine:'hyperframes',source:'scenes/intro/index.html'
      }]
    };
    await writeFile(path.join(destination,'project.json'),json(manifest));
    // Original protocol: five-line brief. Decisions are separate.
    await writeFile(path.join(destination,'brief.md'),[
      'Goal: '+title,
      'Audience: To be confirmed',
      'Platform + format: '+format+' ('+w+'×'+h+')',
      'Length: '+duration+' seconds',
      'Tone + brand: '+style+' (source specification in style/STYLE.md)'
    ].join('\n')+'\n');
    await writeFile(path.join(destination,'decisions.md'),'# Production decisions\n\n- Original MotionForge template: '+template+
      '\n- Style: '+style+'\n- Approval: pending for script, storyboard, rendered preview and QA.\n');
    await writeFile(path.join(destination,'script.md'),'# '+title+'\n\nConcept only. Write hooks, script, claim list and timing, then obtain G2 approval before final rendering.\n');
    await writeFile(path.join(destination,'direction.json'),json({
      slug,language:lang,format:{main:format,extra:[],width:w,height:h,fps:30},
      style:'style/STYLE.md',brand:null,story_format:null,
      concept:'Original upstream template scaffold, creative direction pending',
      visual_rule:'Follow style/STYLE.md. Do not replace the selected template with a generic animation.',
      motif:null,approved_by:null,
      scenes:[{id:'intro',start:0,end:duration,estimate:true,engine:'hyperframes',
        template:'templates/'+template,layout:'Original template layout',entrance:'Original GSAP motion',
        hero:title,on_screen_text:title,assets:[],sfx:[]}]
    }));
    await writeFile(path.join(destination,'brand.json'),json({sourceStyle:'style/STYLE.md',brand:null,overrides:[]}));
    const cover='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'">'+
      '<rect width="'+w+'" height="'+h+'" fill="#172226"/>'+
      '<text x="'+w*.08+'" y="'+h*.35+'" fill="#e7f0ec" font-family="system-ui" font-size="'+Math.max(28,Math.round(w/24))+'" font-weight="700">'+xml(title)+'</text>'+
      '<text x="'+w*.08+'" y="'+h*.84+'" fill="#a9bcb7" font-family="system-ui" font-size="'+Math.max(16,Math.round(w/42))+'">CONCEPT / ORIGINEEL MOTIONFORGE-TEMPLATE</text></svg>\n';
    await writeFile(path.join(destination,'assets/cover.svg'),cover);
    await writeFile(path.join(destination,'assets/CREDITS.md'),
      '# Source and credits\n\n- Template: templates/'+template+' (original MotionForge contributors, MIT)\n'+
      '- Style: skills/style-library/styles/'+style+'/STYLE.md (MotionForge contributors, MIT)\n'+
      '- Runtime: original HyperFrames / GSAP engine. Check package licences before distribution.\n'+
      '- Other media in the template are demonstration assets and must be reviewed before delivery.\n');
    await writeFile(path.join(destination,'production.json'),json({
      schemaVersion:1,sourceMethod:'original-motionforge',selectedStyle:style,
      templateSource:'templates/'+template+'/index.html',
      parameterContract:'templates/'+template+'/params.json',
      parameterValues:'scenes/intro/params.values.json',sourceSha256:sha(source),
      originalFormat:format,engine:'hyperframes',
      gates:Object.fromEntries(['G1','G2','G3','G4','G5','G6','G7'].map(g=>[g,{status:'pending',evidence:null}]))
    }));
    await copyFile(path.join(tmp,'params.json'),path.join(scene,'params.values.json'));
    await writeFile(path.join(destination,'qa','README.md'),'Render actual stills and run qa-review before marking the project ready. See skills/qa-review/SKILL.md. Source QA is not visual QA.\n');
    process.stdout.write('Created '+path.relative(repoRoot,destination)+' from the ORIGINAL '+template+' source.\n');
    process.stdout.write('Next: script-and-hooks → G2 → voice/timing → G3 → storyboard stills → G5 → lint/render → G6 → independent critic → G7.\n');
    return plan;
  }catch(error){
    if(owned)await rm(destination,{recursive:true,force:true});
    throw error;
  }finally{await rm(tmp,{recursive:true,force:true});}
}
const main=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(main)scaffold(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1;});

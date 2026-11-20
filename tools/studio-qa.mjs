#!/usr/bin/env node
// Fast, source-level QA for MotionForge Studio projects.
// No video encoding, GitHub API, Playwright, or external services required.
import {existsSync} from 'node:fs';
import {readFile,readdir,stat,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const formats=new Set(['16:9','9:16','1:1','4:5']);
const engines=new Set(['canvas','hyperframes','remotion']);
const statuses=new Set(['concept','draft','review','ready']);
const safePath=value=>typeof value==='string'&&/^[a-zA-Z0-9_./-]+$/.test(value)
  && !value.startsWith('/')&&!value.split('/').includes('..');
const finding=(level,code,message)=>({level,code,message});

export function validateManifest(project,slug) {
  const findings=[];
  const fail=(code,message)=>findings.push(finding('FAIL',code,message));
  const warn=(code,message)=>findings.push(finding('WARN',code,message));
  if(!project||project.schemaVersion!==1||project.id!==slug||!slugPattern.test(slug))fail('SCHEMA','Invalid schema version or folder slug');
  if(typeof project?.title!=='string'||!project.title.trim())fail('TITLE','Project needs a title');
  if(!formats.has(project?.format))fail('FORMAT','Unsupported aspect ratio');
  if(!engines.has(project?.engine))fail('ENGINE','Unsupported engine');
  if(!statuses.has(project?.status))fail('STATUS','Unknown project status');
  if(!Number.isInteger(project?.fps)||project.fps<12||project.fps>120)fail('FPS','Invalid fps');
  if(!Number.isFinite(project?.durationSeconds)||project.durationSeconds<=0)fail('DURATION','Invalid project duration');
  if(!Array.isArray(project?.tags))fail('TAGS','Tags must be an array');
  if(!Array.isArray(project?.scenes)||!project.scenes.length){fail('SCENES','No project scenes');return findings;}
  const seen=new Set();
  const scenes=[...project.scenes].sort((a,b)=>a.startSeconds-b.startSeconds);
  let position=0;
  for(const scene of scenes){
    if(!slugPattern.test(scene.id||'')||seen.has(scene.id))fail('SCENE_ID','Missing/duplicate scene id');
    seen.add(scene.id);
    if(!engines.has(scene.engine))fail('SCENE_ENGINE','Unsupported scene engine');
    if(!safePath(scene.source)||!scene.source.startsWith('scenes/')||!scene.source.endsWith('.html'))fail('SOURCE','Unsafe/invalid source: '+scene.id);
    if(!Number.isFinite(scene.startSeconds)||scene.startSeconds<0||
      !Number.isFinite(scene.durationSeconds)||scene.durationSeconds<=0){
      fail('TIME','Invalid timeline values: '+scene.id);continue;
    }
    const start=Math.round(scene.startSeconds*(project.fps||30)),frames=Math.round(scene.durationSeconds*(project.fps||30));
    if(start<position)fail('OVERLAP','Overlapping scene: '+scene.id);
    if(start>position)warn('GAP','Blank frames before scene: '+scene.id);
    position=start+frames;
    if(frames<1)fail('SHORT','Scene shorter than one frame: '+scene.id);
    if(scene.startSeconds+scene.durationSeconds>project.durationSeconds+.001)fail('END','Scene extends beyond project: '+scene.id);
  }
  if(project.fps&&Number.isFinite(project.durationSeconds)&&position<Math.round(project.durationSeconds*project.fps))warn('TAIL','Unused frames at end of project');
  if(project.browserRender){
    if(project.engine!=='remotion'||project.browserRender.template!=='title-card-v1')fail('BROWSER_TEMPLATE','Unsupported browser render declaration');
  }
  return findings;
}

export async function auditProject(slug) {
  if(!slugPattern.test(slug))throw Error('Invalid slug '+slug);
  const folder=path.join(repo,'videos',slug);
  const manifestPath=path.join(folder,'project.json');
  const report={project:slug,engine:null,checks:[],failures:0,warnings:0};
  const push=(level,code,message)=>report.checks.push(finding(level,code,message));
  if(!existsSync(manifestPath)){
    push('FAIL','MANIFEST','Missing project.json');
  }else{
    let project;
    try{project=JSON.parse(await readFile(manifestPath,'utf8'));}
    catch(error){push('FAIL','JSON','Invalid project.json: '+error.message);}
    if(project===null){push('FAIL','SCHEMA','Project must be a JSON object');}
    if(project){
      report.engine=project.engine;
      report.checks.push(...validateManifest(project,slug));
      for(const file of ['brief.md','direction.json','brand.json','script.md','assets/CREDITS.md']){
        if(!existsSync(path.join(folder,file)))push('WARN','DOSSIER','Missing '+file);
      }
      if(project.cover){
        if(!safePath(project.cover)||!project.cover.startsWith('assets/'))push('FAIL','COVER','Unsafe cover path');
        else if(!existsSync(path.join(folder,project.cover)))push('FAIL','COVER','Cover file not found');
      }
      for(const scene of (project.scenes||[])){
        if(!safePath(scene.source)||!scene.source.startsWith('scenes/'))continue;
        const full=path.join(folder,scene.source);
        if(!existsSync(full)){push('FAIL','SCENE_FILE','Missing scene: '+scene.id);continue;}
        if(!(await stat(full)).isFile()){push('FAIL','SCENE_FILE','Scene is not a file: '+scene.id);continue;}
        const html=await readFile(full,'utf8');
        if(scene.engine==='canvas'){
          if(!html.includes('window.render')&&!html.includes('window["render"]'))push('FAIL','CANVAS_SEEK','Canvas scene missing render(t): '+scene.id);
          if(!html.includes('window.READY'))push('WARN','READY','Canvas scene missing readiness flag: '+scene.id);
          if(!html.includes('window.TEXTS'))push('WARN','TEXTS','Canvas scene missing text bounding boxes: '+scene.id);
        }else if(scene.engine==='hyperframes'){
          if(!html.includes('__timelines') && !/\bMF\.timeline\s*\(/.test(html))push('FAIL','HF_SEEK','HyperFrames scene missing paused timeline: '+scene.id);
        }
        if(/Math\.random\s*\(|Date\.now\s*\(|setInterval\s*\(|@keyframes\b/.test(html)){
          push('WARN','NONDETERMINISTIC','Potential wall-clock animation: '+scene.id);
        }
        if(/<script[^>]*src\s*=\s*["']https?:/i.test(html))push('WARN','CDN','Externally loaded script: '+scene.id);
      }
      if(existsSync(path.join(folder,'production.json'))){
        const {checkOriginalProject}=await import('../studio/scripts/validate-native-production.mjs');
        for(const item of await checkOriginalProject(folder))push(item.level,item.code,item.reason);
        if(project.status!=='ready')push('WARN','APPROVALS','Original workflow approvals and rendered storyboard/video QA are pending.');
      }
      if(project.status==='ready')push('WARN','VISUAL','Source QA does not replace contact-sheet review, audio checks or final video validation');
    }
  }
  report.failures=report.checks.filter(item=>item.level==='FAIL').length;
  report.warnings=report.checks.filter(item=>item.level==='WARN').length;
  report.passed=report.failures===0;
  return report;
}

async function main(){
  const args=process.argv.slice(2),all=args.includes('--all'),json=args.includes('--json');
  const write=args.includes('--write-report');
  const slug=args.find(x=>!x.startsWith('--'));
  if(!all&&!slug)throw Error('Use node tools/studio-qa.mjs <slug> [--json] [--write-report] or --all');
  const folders=all?(await readdir(path.join(repo,'videos'),{withFileTypes:true}))
    .filter(entry=>entry.isDirectory()&&slugPattern.test(entry.name)).map(entry=>entry.name)
    :[slug];
  const results=[];
  for(const name of folders){
    if(all&&!existsSync(path.join(repo,'videos',name,'project.json')))continue;
    const result=await auditProject(name);results.push(result);
    if(write){
      const dir=path.join(repo,'videos',name,'qa');
      await mkdir(dir,{recursive:true});
      await writeFile(path.join(dir,'studio-qa.json'),JSON.stringify(result,null,2)+'\n');
    }
  }
  if(json)console.log(JSON.stringify({results},null,2));
  else for(const result of results){
    console.log(result.project+': '+(result.passed?'PASS':'FAIL')+
      ', '+result.failures+' errors, '+result.warnings+' warnings');
    for(const item of result.checks)console.log('  '+item.level+' '+item.code+' · '+item.message);
  }
  if(results.some(result=>!result.passed))process.exitCode=1;
}

if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)){
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}

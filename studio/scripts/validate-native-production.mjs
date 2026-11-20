#!/usr/bin/env node
// MF-10 source provenance and original production approval gates.
// This is a source gate, NOT a substitute for rendered-frame or audio QA.
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function originalProductionFindings(project,production,exists=()=>true){
  const issues=[];
  const fail=(code,reason)=>issues.push({level:'FAIL',code,reason});
  const warn=(code,reason)=>issues.push({level:'WARN',code,reason});
  if(!production||production.sourceMethod!=='original-motionforge'){
    fail('SOURCE_METHOD','Original workflow must declare the source method.');return issues;
  }
  const template=project?.templateId,style=project?.styleId;
  if(!slugPattern.test(template||'')||!slugPattern.test(style||''))
    fail('SOURCE_IDS','Template and style IDs must be declared.');
  if(production.templateSource!=='templates/'+template+'/index.html')
    fail('TEMPLATE_SOURCE','The chosen source must be the original template.');
  if(production.parameterContract!=='templates/'+template+'/params.json')
    fail('TEMPLATE_PARAMS','Original params.json contract not recorded.');
  if(production.selectedStyle!==style)fail('STYLE','Project style and approved source style differ.');
  if(project?.engine!==production.engine)fail('ENGINE','Production engine and project engine differ.');
  if(project?.format!==production.originalFormat)
    fail('FORMAT','Original template size differs from the project format. A new approved layout is required.');
  if(!exists('style/STYLE.md'))fail('STYLE_FILE','Project copy of the selected STYLE.md missing.');
  if(!exists(production.parameterValues))fail('PARAMETER_VALUES','Edited original parameter file missing.');
  if(!Array.isArray(project?.scenes)||!project.scenes.some(scene=>
    scene.engine===production.engine&&scene.source==='scenes/intro/index.html'))
    fail('SOURCE_SCENE','Original source scene missing from the project. Do not replace with generic Canvas.');
  const gates=production.gates||{};
  const required=['G1','G2','G3','G4','G5','G6','G7'];
  for(const gate of required){
    const info=gates[gate];
    if(!info){fail('MISSING_GATE',gate+' is not recorded.');continue;}
    if(project.status==='ready'){
      const allowed=info.status==='passed'||(gate==='G3'&&info.status==='not_applicable');
      if(!allowed)fail('APPROVAL',gate+' must be approved before READY.');
      if(info.status==='passed'&&(!info.evidence||!exists(info.evidence)))
        fail('EVIDENCE',gate+' approval evidence is missing.');
      if(info.status==='not_applicable'&&(!info.reason||!info.reason.trim()))
        fail('SPEND',gate+' not_applicable requires a written reason.');
    }else if(!['passed','not_applicable','pending'].includes(info.status)){
      warn('GATE_STATUS',gate+' has an unknown status '+info.status);
    }
  }
  return issues;
}

export async function checkOriginalProject(folder){
  const manifest=JSON.parse(await readFile(path.join(folder,'project.json'),'utf8'));
  const file=path.join(folder,'production.json');
  if(!existsSync(file))return [];
  const prod=JSON.parse(await readFile(file,'utf8'));
  // Every evidence path is checked as a project-relative path, never outside
  // the user's project. Source and parameter files are stable references.
  return originalProductionFindings(manifest,prod,value=>{
    if(typeof value!=='string'||value.startsWith('/')||value.split('/').includes('..'))return false;
    return existsSync(path.join(folder,value));
  });
}
const direct=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){
  const slug=process.argv[2];
  if(!slugPattern.test(slug||'')){console.error('Usage: node studio/scripts/validate-native-production.mjs <slug>');process.exitCode=2;}
  else checkOriginalProject(path.join(repo,'videos',slug)).then(findings=>{
    if(findings.length)for(const item of findings)console.log(item.level+' '+item.code+': '+item.reason);
    else console.log('PASS original MotionForge source provenance and declared approval stage.');
    if(findings.some(i=>i.level==='FAIL'))process.exitCode=1;
  }).catch(error=>{console.error(error.message);process.exitCode=1;});
}

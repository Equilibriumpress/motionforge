#!/usr/bin/env node
/**
 * MF-12A: ChatGPT's Motion Director context and explicit approval records.
 * Reads the ORIGINAL upstream skill files; does not define a second skill.
 * This command neither generates paid assets nor renders a video.
 */
import path from 'node:path';
import {existsSync} from 'node:fs';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {repoRoot} from './new-from-upstream.mjs';

const GATES=['G1','G2','G3','G4','G5','G6','G7'];
const DIR='skills/motion-director/';
const REQUIRED=[
  'AGENTS.md',DIR+'SKILL.md','docs/STUDIO_AGENT_WORKFLOW.md',
  'docs/STUDIO_ORIGINAL_PRODUCTION.md'
];
const STEPS={
  G1:[DIR+'references/story-formats.md'],
  G2:['skills/script-and-hooks/SKILL.md',DIR+'references/story-formats.md'],
  G3:['skills/voice-and-timing/SKILL.md'],
  G4:['skills/style-library/SKILL.md','skills/brand-kit/SKILL.md'],
  G5:[DIR+'references/direction-json.md',DIR+'references/building-scenes.md',
    DIR+'references/motion-craft.md'],
  G6:['skills/qa-review/SKILL.md','skills/voice-and-timing/SKILL.md'],
  G7:['skills/qa-review/SKILL.md','skills/qa-review/references/critic.md',DIR+'references/delivery.md']
};
const deps={
  G1:[],G2:['G1'],G3:['G2'],G4:['G1'],G5:['G2','G4','G3'],
  G6:['G5'],G7:['G6']
};
const pass=entry=>entry?.status==='passed'||entry?.status==='not_applicable';
const slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const validRel=v=>typeof v==='string'&&v.length>0&&!v.startsWith('/')&&!v.includes('\\')&&
  v.split('/').every(x=>x!=='..')&&/^[a-zA-Z0-9_.\/-]+$/.test(v);
const fail=s=>{throw Error(s)};
function projectPath(slugName){
  if(!slug.test(slugName||''))fail('Project slug must be kebab-case.');
  return path.join(repoRoot,'videos',slugName);
}
export function requiredSkillsForGate(gate,{language,styleId,sceneTemplates=[]}={}){
  if(!GATES.includes(gate))fail('Unknown original MotionForge gate: '+gate);
  const paths=[...REQUIRED,...STEPS[gate]];
  if(gate==='G2'&&typeof language==='string'){
    const languageKey=language.split('-')[0];
    const langFile='skills/script-and-hooks/i18n/'+languageKey+'.md';
    if(existsSync(path.join(repoRoot,langFile)))paths.push(langFile);
  }
  if(gate==='G4'&&styleId){
    if(!slug.test(styleId))fail('Invalid style name.');
    paths.push('skills/style-library/styles/'+styleId+'/STYLE.md');
  }
  if(gate==='G5'||gate==='G6'){
    for(const template of new Set(sceneTemplates)){
      if(!slug.test(template))fail('Invalid source template name.');
      paths.push('templates/'+template+'/params.json','templates/'+template+'/index.html');
    }
  }
  return [...new Set(paths)];
}
export function gateReadiness(production,gate){
  if(!GATES.includes(gate))fail('Unknown gate: '+gate);
  const missing=deps[gate].filter(x=>!pass(production.gates?.[x]));
  return {gate,canProceed:missing.length===0,missing};
}
export async function workflowStatus(slugName,gate=null){
  const folder=projectPath(slugName);
  const manifest=JSON.parse(await readFile(path.join(folder,'project.json'),'utf8'));
  const production=JSON.parse(await readFile(path.join(folder,'production.json'),'utf8'));
  if(production.sourceMethod!=='original-motionforge')fail('Original MotionForge project required.');
  const selected=gate||GATES.find(g=>!pass(production.gates[g]))||'G7';
  const templates=production.sceneTemplates?.map(s=>s.template)||
    (manifest.templateId?[manifest.templateId]:[]);
  const paths=requiredSkillsForGate(selected,{language:manifest.language,
    styleId:manifest.styleId,sceneTemplates:templates});
  for(const file of paths)if(!existsSync(path.join(repoRoot,file)))
    fail('Original skill or reference file missing: '+file);
  return {project:slugName,status:manifest.status,agent:'ChatGPT',
    entrypoint:DIR+'SKILL.md',nextGate:selected,
    readiness:gateReadiness(production,selected),requiredReading:paths,
    gates:production.gates,decisions:production.decisions||[],
    note:'Read the complete original files. Do not assert approvals, renders or QA without evidence.'};
}
export async function recordGate(slugName,{gate,status,actor,evidence,reason,decision}){
  const folder=projectPath(slugName),file=path.join(folder,'production.json');
  const production=JSON.parse(await readFile(file,'utf8'));
  if(production.sourceMethod!=='original-motionforge')fail('Original MotionForge record missing.');
  if(!GATES.includes(gate)||!['passed','not_applicable'].includes(status))
    fail('Use G1–G7 with passed or not_applicable.');
  if(status==='not_applicable'&&gate!=='G3')fail('Only G3 spend gate supports not_applicable.');
  if(!['user','agent'].includes(actor))fail('Actor must be user or agent.');
  const prior=gateReadiness(production,gate);
  if(!prior.canProceed)fail('Previous MotionForge gates still pending: '+prior.missing.join(', '));
  if(gate==='G3'&&status==='passed'&&actor!=='user')
    fail('Paid service approval requires the user, with recorded cost and evidence.');
  if((gate==='G1'||gate==='G2'||gate==='G5')&&actor!=='user')
    fail(gate+' requires explicit user approval of the brief, script or rendered storyboard.');
  if(gate==='G4'&&actor==='agent'&&!production.workflow?.styleDelegated)
    fail('The user must explicitly delegate the style choice before agent G4 approval.');
  if(status==='not_applicable'){
    if(typeof reason!=='string'||reason.trim().length<8)
      fail('No-spend gate must explain why paid services are not required.');
  } else {
    if(!validRel(evidence)||!existsSync(path.join(folder,evidence)))
      fail('Approval needs real project-relative evidence file.');
    if(typeof decision!=='string'||decision.trim().length<8)
      fail('Record the actual decision and approval context, not a default success value.');
  }
  const old=production.gates?.[gate];
  if(old?.status==='passed')fail(gate+' already passed. Do not overwrite approval history.');
  production.gates??={};
  production.gates[gate]={status,actor,
    evidence:status==='passed'?evidence:null,
    ...(status==='not_applicable'?{reason}:{}),
    ...(status==='passed'?{decision}: {})};
  production.decisions??=[];
  production.decisions.push({gate,status,actor,
    evidence:status==='passed'?evidence:null,
    decision:status==='passed'?decision:reason});
  production.workflow??={};
  production.workflow.state=GATES.find(g=>!pass(production.gates[g]))||'awaiting-final-render';
  await writeFile(file,JSON.stringify(production,null,2)+'\n','utf8');
  return {gate,status,project:slugName,nextGate:production.workflow.state};
}
function parse(argv){
  const opt={};
  for(let i=0;i<argv.length;i++){
    const name=argv[i];
    if(!name.startsWith('--')||!argv[i+1]||argv[i+1].startsWith('--'))
      fail('Usage: --project <slug> [--gate G1] [--record passed|not_applicable --actor user|agent --evidence path --decision text|--reason text]');
    opt[name.slice(2)]=argv[++i];
  }
  return opt;
}
const direct=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){
  const cli=parse(process.argv.slice(2));
  const work=cli.record?recordGate(cli.project,{gate:cli.gate,status:cli.record,
    actor:cli.actor,evidence:cli.evidence,reason:cli.reason,decision:cli.decision}):
    workflowStatus(cli.project,cli.gate);
  work.then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{
    console.error(e.message);process.exitCode=1;
  });
}

#!/usr/bin/env node
/* MF-12E: original fresh-context critic packet and external review validation.
 * Never pretend the author ran an independent review. */
import path from 'node:path';
import {existsSync} from 'node:fs';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {hashFile,reportMd} from './studio-qa-review.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const safe=s=>typeof s==='string'&&/^[\w./-]+$/.test(s)&&!s.startsWith('/')&&!s.split('/').includes('..');
const meaningful=s=>typeof s==='string'&&s.trim().length>=8;
function requireValue(ok,message){if(!ok)throw Error(message)}
async function context(video){
 requireValue(slug.test(video||''),'Invalid project slug.');
 const folder=path.join(root,'videos',video);
 const project=JSON.parse(await readFile(path.join(folder,'project.json'),'utf8'));
 const report=JSON.parse(await readFile(path.join(folder,'qa/report.json'),'utf8'));
 const actualSha=await hashFile(path.resolve(folder,report.render.file));
 requireValue(actualSha===report.render.sha256,'QA report is stale for the actual MP4.');
 const board=JSON.parse(await readFile(path.join(folder,'qa/render-report.json'),'utf8'));
 requireValue(board.renderSha256===actualSha,'Board images belong to a different MP4.');
 for(const file of ['qa/sheet.png','qa/phone.png'])
   requireValue(existsSync(path.join(folder,file)),'Actual rendered visual missing: '+file);
 return {folder,project,report,board,sha:actualSha};
}
export function validateCriticReview(result,panels,sha){
 requireValue(result?.freshContextConfirmed===true&&result.renderSha256===sha&&
   meaningful(result.reviewer)&&result.reviewer.toLowerCase()!=='builder',
   'The reviewer must attest a fresh independent context for this exact render.');
 requireValue(result.observation&&['topic','audience','action']
   .every(k=>meaningful(result.observation[k])),
   'The independent reviewer must describe topic, audience and action from images alone.');
 requireValue(['PASS','FIX'].includes(result.firstFrame?.status)&&meaningful(result.firstFrame?.note),
   'The reviewer must explicitly judge frame zero.');
 requireValue(meaningful(result.weakestScene)&&meaningful(result.weaknessReason),
   'Weakest scene and a concrete reason are required.');
 const files=panels.map(p=>p.file);
 requireValue(Array.isArray(result.panels)&&result.panels.length===files.length&&
   new Set(result.panels.map(p=>p.file)).size===files.length&&
   result.panels.every(p=>files.includes(p.file)&&['PASS','FIX'].includes(p.status)&&meaningful(p.note)),
   'Every rendered storyboard panel must receive a PASS or FIX with a reason.');
 const fixes=result.panels.filter(p=>p.status==='FIX');
 let unresolved=0;
 for(const fix of fixes){
   const answer=(result.resolutions||[]).find(r=>r.file===fix.file);
   if(!answer){unresolved++;continue}
   requireValue(answer.disposition!=='fixed',
     'A visual fix requires re-rendering, new SHA and a new critic review.');
   if(answer.disposition!=='rebutted'||!meaningful(answer.reason)||!safe(answer.evidence))
     unresolved++;
 }
 if(result.firstFrame.status==='FIX')unresolved++;
 return {status:unresolved?'needs-fixes':'completed',unresolved,fixes:fixes.length,
   panelCount:files.length};
}
export async function prepareCritic(slugName){
 const c=await context(slugName);
 const original=await readFile(path.join(root,'skills/qa-review/references/critic.md'),'utf8');
 const section=original.split('## Prompt (fill the brackets, send as is)')[1]||'';
 const fence=String.fromCharCode(96).repeat(3);
 const originalPrompt=section.split(fence)[1];
 requireValue(meaningful(originalPrompt),'Original MotionForge critic instructions missing.');
 const brief=(await readFile(path.join(c.folder,'brief.md'),'utf8')).split('\n')
   .filter(line=>/^(Goal|Audience|Platform \+ format|Length):/i.test(line));
 const text=[
   '# MotionForge independent critic: FRESH CONTEXT ONLY','',
   'Pass this file and the images to a SEPARATE reviewer who has not read the code or script.',
   'Do not include the original project scenes, chosen style or the main conversation.',
   'Render SHA-256: '+c.sha,'',
   'Goal, audience, platform and length:',
   ...brief,'Video language: '+c.project.language,'Video format: '+c.project.format,'',
   'Actual rendered images:',
   '- qa/sheet.png','- qa/phone.png',
   ...c.board.stills.map(s=>'- '+s.file+' at '+s.time.toFixed(2)+' seconds'),
   '', 'ORIGINAL QA-REVIEW CRITIC PROMPT:',originalPrompt,
   '', 'Return a standalone JSON review following docs/STUDIO_QA_REVIEW.md.',
   'This handoff is NOT an independent review result.'
 ];
 await writeFile(path.join(c.folder,'qa/critic-request.md'),text.join('\n')+'\n');
 return {packet:'qa/critic-request.md',renderSha256:c.sha,
   panels:c.board.stills.length,criticPerformed:false};
}
export async function recordCritic(slugName,external){
 const c=await context(slugName);
 const result=JSON.parse(await readFile(path.resolve(external),'utf8'));
 const validation=validateCriticReview(result,c.board.stills,c.sha);
 for(const resolution of result.resolutions||[])
   if(resolution.evidence)
     requireValue(safe(resolution.evidence)&&existsSync(path.join(c.folder,resolution.evidence)),
       'Critic resolution evidence missing: '+resolution.evidence);
 await writeFile(path.join(c.folder,'qa/critic-review.json'),JSON.stringify(result,null,2)+'\n');
 c.report.critic={status:validation.status,renderSha256:c.sha,
   freshContextConfirmed:true,reviewer:result.reviewer,unresolvedFixes:validation.unresolved,
   panels:validation.panelCount,fixes:validation.fixes,evidence:'qa/critic-review.json',
   note:'External reviewer attested a fresh context; file validation cannot independently prove isolation.'};
 await writeFile(path.join(c.folder,'qa/report.json'),JSON.stringify(c.report,null,2)+'\n');
 await writeFile(path.join(c.folder,'qa/report.md'),reportMd(c.report));
 return c.report.critic;
}
const direct=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){
 const [command,slugName,file]=process.argv.slice(2);
 const task=command==='prepare'?prepareCritic(slugName):
   command==='record'&&file?recordCritic(slugName,file):
   Promise.reject(Error('Usage: studio-qa-critic.mjs prepare <slug> | record <slug> <external-review.json>'));
 task.then(x=>console.log(JSON.stringify(x,null,2)))
 .catch(e=>{console.error(e.message);process.exitCode=1});
}

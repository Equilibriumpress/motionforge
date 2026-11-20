#!/usr/bin/env node
/**
 * Record real visual/human QA observations, never mark checks approved by default.
 * Every annotation is tied to one MP4 hash and must cite a real local artifact.
 */
import path from 'node:path';
import {existsSync} from 'node:fs';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {checkRecord,QA_IDS,summarizeChecks} from './studio-qa-policy.mjs';
import {hashFile,reportMd} from './studio-qa-review.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const slugRe=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const manual=new Set([
 'X2','X4','X5','X6','X7','X8','X9','X10',
 'P1','P4','P5','P6','P7','P8',
 'A2','A3','A5',...QA_IDS.human]);
const safe=v=>typeof v==='string'&&/^[\w./-]+$/.test(v)&&!v.startsWith('/')&&!v.split('/').includes('..');
function parsed(argv){
 const opt={};for(let i=0;i<argv.length;i++){
  const key=argv[i];if(!key.startsWith('--')||!argv[i+1])throw Error('Use --key value arguments.');
  opt[key.slice(2)]=argv[++i];
 }return opt;
}
export async function recordObservation(slug,{id,status,evidence,reason,actor,confirmation}){
 if(!slugRe.test(slug||''))throw Error('Invalid project slug.');
 if(!manual.has(id))throw Error('Automated QA '+id+' cannot be manually overridden.');
 if(!['user','independent-reviewer'].includes(actor))throw Error('Record the actual user or reviewer.');
 if(QA_IDS.human.includes(id)&&actor!=='user')throw Error(id+' requires a user observation.');
 if(typeof reason!=='string'||reason.trim().length<8)
  throw Error('Every observation needs a written reason based on actual viewing/listening.');
 if(!safe(evidence))throw Error('Provide a safe project-relative evidence file.');
 const folder=path.join(root,'videos',slug),target=path.join(folder,evidence);
 if(!existsSync(target))throw Error('Actual evidence file missing: '+evidence);
 if(actor==='user'&&(!confirmation||confirmation.trim().length<8))
  throw Error('Record the explicit user approval or feedback reference.');
 const qa=path.join(folder,'qa'),reportFile=path.join(qa,'report.json');
 const report=JSON.parse(await readFile(reportFile,'utf8'));
 const video=path.resolve(folder,report.render.file);
 const sha=await hashFile(video);
 if(report.render.sha256!==sha)throw Error('QA is stale; rerun the original review on the new MP4.');
 const checked=checkRecord(id,status,evidence,reason);
 const file=path.join(qa,'manual-annotations.json');
 const existing=existsSync(file)?JSON.parse(await readFile(file,'utf8')):{
  schemaVersion:1,renderSha256:sha,items:{}};
 if(existing.renderSha256!==sha)throw Error('Manual annotations belong to a previous render.');
 const entry={...checked,actor,confirmation:confirmation||null};
 existing.items[id]=entry;
 await writeFile(file,JSON.stringify(existing,null,2)+'\n');
 report.checks[id]=entry;
 report.summary=summarizeChecks(report.checks);
 await writeFile(reportFile,JSON.stringify(report,null,2)+'\n');
 await writeFile(path.join(qa,'report.md'),reportMd(report));
 return {project:slug,id,status,evidence,renderSha256:sha};
}
const direct=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){
 const [slug,...argv]=process.argv.slice(2);
 recordObservation(slug,parsed(argv)).then(x=>console.log(JSON.stringify(x,null,2)))
 .catch(e=>{console.error(e.message);process.exitCode=1});
}

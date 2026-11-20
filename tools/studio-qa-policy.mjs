/**
 * Original skills/qa-review/SKILL.md check contract.
 * No source-only test may be reported as rendered-video QA.
 */
export const QA_IDS=Object.freeze({
 technical:['T1','T2','T3','T4','T5'],
 visual:['X1','X2','X3','X4','X5','X6','X7','X8','X9','X10'],
 story:['P1','P2','P3','P4','P5','P6','P7','P8'],
 audio:['A1','A2','A3','A4','A5'],
 human:['H1','H2','H3']
});
export const QA_CHECK_IDS=Object.freeze(Object.values(QA_IDS).flat());
export const QA_STATUSES=Object.freeze(['pass','fail','warn','pending']);
export const isSha256=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
export function checkRecord(id,status,evidence,reason=''){
 if(!QA_CHECK_IDS.includes(id)||!QA_STATUSES.includes(status))
   throw Error('Invalid original QA ID or status: '+id+'/'+status);
 if(status==='warn'&&String(reason).trim().length<8)
   throw Error(id+' accepted warning needs a written reason.');
 if(status==='pass'&&!String(evidence||'').trim())
   throw Error(id+' PASS requires evidence.');
 return {id,status,evidence:evidence||null,reason:reason||null};
}
export function makePendingChecks(){
 return Object.fromEntries(QA_CHECK_IDS.map(id=>[id,{
   id,status:'pending',evidence:null,reason:'Original check has not been completed.'
 }]));
}
export function parseBlackFreeze(log){
 const black=[...String(log).matchAll(/black_start:\s*([\d.]+)\s+black_end:\s*([\d.]+)\s+black_duration:\s*([\d.]+)/g)]
   .map(m=>({start:+m[1],end:+m[2],duration:+m[3]}));
 const freezeStart=[...String(log).matchAll(/freeze_start:\s*([\d.]+)/g)]
   .map(m=>({start:+m[1]}));
 return {black,freeze:freezeStart};
}
export function parseLuminance(log){
 const list=[];let t=null;
 for(const line of String(log).split('\n')){
   const m=line.match(/pts_time:\s*([\d.]+)/);if(m)t=+m[1];
   const y=line.match(/lavfi\.signalstats\.YAVG=([\d.]+)/);
   if(y&&Number.isFinite(t))list.push({t,y:+y[1]});
 }
 return list;
}
export function flashBursts(samples,{threshold=51,maxPerSecond=3}={}){
 const counts=new Map();
 for(let i=1;i<samples.length;i++){
   if(Math.abs(samples[i].y-samples[i-1].y)<=threshold)continue;
   const k=Math.floor(samples[i].t);
   counts.set(k,(counts.get(k)||0)+1);
 }
 return [...counts].filter(([,n])=>n>maxPerSecond).map(([second,count])=>({second,count}));
}
export function wordBoundaryFindings(words,scenes){
 const cuts=[...scenes].sort((a,b)=>a.startSeconds-b.startSeconds)
   .slice(1).map(s=>s.startSeconds);
 return cuts.flatMap(cut=>words.filter(w=>w.s<cut+.02&&w.e>cut-.02)
   .map(w=>({cut,word:w.w,start:w.s,end:w.e})));
}
export const SPEECH_PACE=Object.freeze({
 en:2.6,tr:2.2,es:2.8,pt:2.7,fr:2.7,de:2.3,
 zh:5,ja:6,ko:2,hi:2.5,nl:2.3
});
export function wordsPerSecond(words,scenes,pace=2.3){
 return scenes.map(s=>{
   const count=words.filter(w=>w.s>=s.startSeconds&&w.s<s.startSeconds+s.durationSeconds).length;
   const rate=count/s.durationSeconds;
   return {scene:s.id,rate,limit:pace*1.1,count,over:rate>pace*1.1};
 });
}
export function captionFindings(captions,duration){
 const issues=[];let prev=0;
 for(const [i,c] of captions.entries()){
   if(!Number.isFinite(c.start)||!Number.isFinite(c.end)||
     c.start<0||c.end>duration+.1||c.end<=c.start)issues.push('Invalid caption window '+(i+1));
   if(c.start<prev-.01)issues.push('Overlapping caption '+(i+1));
   if(c.end-c.start<.59)issues.push('Caption '+(i+1)+' shorter than 0.6s');
   prev=c.end;
 }
 return issues;
}
export function renderGate(report,sha){
 const issues=[];
 if(!report||report.schemaVersion!==1||!isSha256(sha)||report.render?.sha256!==sha)
   return {ok:false,problems:['QA report missing or stale for the actual MP4 SHA-256.']};
 if(report.skill!=='skills/qa-review/SKILL.md')
   issues.push('Original qa-review skill contract not recorded.');
 for(const id of QA_CHECK_IDS.filter(x=>!x.startsWith('H'))){
   const c=report.checks?.[id];
   if(!c||!['pass','warn'].includes(c.status))issues.push(id+' not complete.');
   else if(c.status==='warn'&&String(c.reason||'').trim().length<8)
     issues.push(id+' has unreasoned warning.');
   else if(c.status==='pass'&&!c.evidence)issues.push(id+' has no evidence.');
 }
 if(report.critic?.status!=='completed'||!report.critic?.evidence||
   report.critic?.renderSha256!==sha||
   report.critic?.freshContextConfirmed!==true||report.critic?.unresolvedFixes!==0)
   issues.push('Independent critic not completed for this render or open FIX remains.');
 for(const id of QA_IDS.human){
   const c=report.checks?.[id];
   if(!c||!QA_STATUSES.includes(c.status)||c.status==='fail')
     issues.push('Human QA '+id+' is missing or failed.');
 }
 return {ok:issues.length===0,problems:issues};
}
export function summarizeChecks(checks){
 return Object.fromEntries(QA_STATUSES.map(s=>[s,Object.values(checks||{})
   .filter(x=>x.status===s).length]));
}

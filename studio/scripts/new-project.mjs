#!/usr/bin/env node
// Create one editable MotionForge Studio project. Refuse to overwrite.
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..','..');
const args = process.argv.slice(2);
const opts = new Map();
for (let i=0; i<args.length; i+=2) {
  if (!args[i]?.startsWith('--') || !args[i+1]) throw Error('Use --option value pairs');
  opts.set(args[i].slice(2), args[i+1]);
}
const slug=opts.get('slug'), title=opts.get('title'), format=opts.get('format')||'16:9';
const language=opts.get('language')||'nl',duration=Number(opts.get('duration')||8),fps=Number(opts.get('fps')||30);
const formats={'16:9':[1920,1080],'9:16':[1080,1920],'1:1':[1080,1080],'4:5':[1080,1350]};
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw Error('Invalid slug');
if (!title?.trim() || title.length>90) throw Error('Title is required (max 90 chars)');
if (!formats[format]) throw Error('Invalid format');
if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(language)) throw Error('Invalid language');
if (!(duration>0 && duration<=3600)) throw Error('Invalid duration');
if (!Number.isInteger(fps) || fps<12 || fps>120) throw Error('Invalid FPS');
const dest=path.join(root,'videos',slug);
if (existsSync(dest)) throw Error('Project already exists; refusing to overwrite: '+slug);
const [width,height]=formats[format];
const xml=text=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const scene={id:'intro',title:'Opening',startSeconds:0,durationSeconds:duration,engine:'canvas',source:'scenes/intro/index.html'};
const project={schemaVersion:1,id:slug,title,description:'Conceptvideo, uit te werken in ChatGPT.',status:'concept',language,format,engine:'canvas',durationSeconds:duration,fps,cover:'assets/cover.svg',tags:['concept'],scenes:[scene]};
const sceneHtml='<!doctype html><html lang="'+language+'"><head><meta charset="utf-8"><style>html,body{margin:0;background:#0e1622}canvas{display:block;width:100%;height:100%}</style></head><body><canvas id="c" width="'+width+'" height="'+height+'"></canvas><script>'+
  'const c=document.querySelector("#c"),g=c.getContext("2d");'+
  'window.DUR='+duration+';window.SIZE=['+width+','+height+'];'+
  'window.render=t=>{g.fillStyle="#0e1622";g.fillRect(0,0,c.width,c.height);g.globalAlpha=Math.max(0,Math.min(1,t));g.fillStyle="#f5f7fa";g.font="bold '+Math.max(42,Math.round(width/24))+'px system-ui";g.fillText('+JSON.stringify(title)+',Math.round(c.width*.08),Math.round(c.height*.5));g.globalAlpha=1};'+
  'window.TEXTS=t=>t<.1?[]:[{id:"title",text:'+JSON.stringify(title)+',x0:0,y0:0,x1:c.width,y1:c.height}];'+
  'window.render(0);window.READY=true;</script></body></html>\n';
const cover='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+'"><rect width="'+width+'" height="'+height+'" fill="#0e1622"/><text x="'+width*.08+'" y="'+height*.5+'" fill="#f5f7fa" font-family="system-ui" font-weight="700" font-size="'+Math.max(40,width/24)+'">'+xml(title)+'</text></svg>\n';
const json=v=>JSON.stringify(v,null,2)+'\n';
await mkdir(path.join(dest,'scenes','intro'),{recursive:true});
await mkdir(path.join(dest,'assets'),{recursive:true});
const files={
  'project.json':json(project),
  'brief.md':'Goal: Introduce '+title+'\nAudience: To be defined\nPlatform + format: '+format+'\nLength: '+duration+' seconds\nTone + brand: To be defined\n',
  'script.md':'# '+title+'\n\nWrite and approve a real script before production.\n',
  'brand.json':json({name:title,colors:{background:'#0e1622',foreground:'#f5f7fa',accent:'#a9f0ad'}}),
  'direction.json':json({concept:title,visualRule:'Editable text introduction',scenes:[{id:'intro',startSeconds:0,durationSeconds:duration,engine:'canvas'}]}),
  'scenes/intro/index.html':sceneHtml,
  'assets/cover.svg':cover,
  'assets/CREDITS.md':'# Credits\n\nNo third-party media in this starter.\n',
};
for (const [file,content] of Object.entries(files)) await writeFile(path.join(dest,file),content,{flag:'wx'});
process.stdout.write('Created videos/'+slug+'/\n');

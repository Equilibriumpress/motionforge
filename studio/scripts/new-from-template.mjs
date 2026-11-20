#!/usr/bin/env node
// Generate a three-scene video project using a built-in Studio template.
// Local-only: no paid calls, no repo credentials, never overwrites projects.
import {existsSync} from 'node:fs';
import {readFile,mkdir,rm,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {templates,templateNames,storyboard,coverSvg,embedScene} from '../project-templates/library.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const args=process.argv.slice(2),options=new Map();
for(let i=0;i<args.length;i+=2){
  if(!args[i]?.startsWith('--')||!args[i+1])throw Error('Use --name value argument pairs');
  options.set(args[i].slice(2),args[i+1]);
}
const kind=options.get('template')||'book-trailer';
const slug=options.get('slug');
const title=options.get('title');
const subtitle=options.get('subtitle')||'EEN MOTIONFORGE STUDIO PROJECT';
const duration=Number(options.get('duration')||15);
const fps=Number(options.get('fps')||30);
const language=options.get('language')||'nl',format=options.get('format')||'16:9';
const sizes={'16:9':[1920,1080],'9:16':[1080,1920],'1:1':[1080,1080],'4:5':[1080,1350]};
if(!templates[kind])throw Error('Unknown template. Use: '+templateNames.join(', '));
if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug||''))throw Error('Invalid slug');
if(typeof title!=='string'||!title.trim()||title.length>80)throw Error('Title required (max 80 chars)');
if(subtitle.length>130)throw Error('Subtitle max 130 chars');
if(!sizes[format])throw Error('Unsupported format');
if(!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(language))throw Error('Invalid language');
if(!Number.isFinite(duration)||duration<3||duration>600)throw Error('Duration must be 3–600 seconds');
if(!Number.isInteger(fps)||fps<12||fps>120)throw Error('FPS must be 12–120');
const root=path.join(repo,'videos',slug);
if(existsSync(root))throw Error('Project already exists: '+slug);
const [width,height]=sizes[format],frames=Math.round(duration*fps);
const scenes=storyboard(kind,frames,fps);
const spec=templates[kind];
const sceneTemplate=await readFile(path.join(repo,'studio/project-templates/scene.html'),'utf8');
const project={
  schemaVersion:1,id:slug,title,description:spec.description,status:'concept',language,format,
  engine:'canvas',durationSeconds:frames/fps,fps,cover:'assets/cover.svg',
  tags:spec.tags,scenes:scenes.map(({phase,...scene})=>scene)
};
const json=data=>JSON.stringify(data,null,2)+'\n';
let created=false;
try{
  await mkdir(root);created=true;
  await mkdir(path.join(root,'assets'),{recursive:true});
  for(const scene of scenes){
    const folder=path.join(root,'scenes',scene.id);
    await mkdir(folder,{recursive:true});
    await writeFile(path.join(folder,'index.html'),embedScene(sceneTemplate,{
      phase:scene.phase,template:kind,feature:spec.feature,
      title,subtitle,accent:spec.accent,width,height,duration:scene.durationSeconds
    }));
  }
  await writeFile(path.join(root,'project.json'),json(project));
  await writeFile(path.join(root,'assets/cover.svg'),coverSvg({title,subtitle,accent:spec.accent,width,height}));
  await writeFile(path.join(root,'assets/CREDITS.md'),'# Credits\n\nOriginal vector graphics and example text. No external assets.\n');
  await writeFile(path.join(root,'brand.json'),json({name:title,colors:{background:'#0d1822',foreground:'#f5f3ea',accent:spec.accent}}));
  await writeFile(path.join(root,'brief.md'),
    'Goal: '+title+'\nAudience: To be defined\nPlatform + format: '+format+'\nLength: '+project.durationSeconds+' seconds\nTone + brand: '+spec.name+'\n');
  await writeFile(path.join(root,'script.md'),'# '+title+'\n\nPlaceholder only. Replace and approve the script before final publication.\n');
  await writeFile(path.join(root,'direction.json'),json({
    concept:spec.name,visualRule:spec.description,
    scenes:scenes.map(({phase,...scene})=>({...scene,phase}))
  }));
  console.log('Created videos/'+slug+'/ ('+kind+', '+scenes.length+' scenes)');
}catch(error){
  if(created)await rm(root,{recursive:true,force:true});
  throw error;
}

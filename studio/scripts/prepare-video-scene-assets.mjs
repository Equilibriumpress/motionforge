#!/usr/bin/env node
// Source-preserving preparation: copy local npm/runtime dependencies to
// HyperFrames scenes without changing original template code or parameters.
// Never fetches remote media, never runs GitHub Actions, never writes MP4.
import path from 'node:path';
import {existsSync} from 'node:fs';
import {copyFile,mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {prepareGlobeScene} from './prepare-globe-scene.mjs';
const studio=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.resolve(studio,'..');
const mods=path.join(studio,'node_modules');
const fonts=[
  ['outfit-latin-500-normal.woff2','@fontsource/outfit/files/outfit-latin-500-normal.woff2'],
  ['outfit-latin-800-normal.woff2','@fontsource/outfit/files/outfit-latin-800-normal.woff2'],
  ['overpass-mono-latin-600-normal.woff2','@fontsource/overpass-mono/files/overpass-mono-latin-600-normal.woff2'],
];
export async function prepareHyperFramesSceneAssets(folder){
  const dir=path.resolve(folder),file=path.join(dir,'index.html');
  if(!existsSync(file))throw Error('Scene missing index.html: '+dir);
  const html=await readFile(file,'utf8');
  if(!html.includes('motionforge template: '))throw Error('Expected the original MotionForge HyperFrames source: '+file);
  const base=path.join(dir,'assets'),vendor=path.join(base,'vendor');
  await mkdir(vendor,{recursive:true});
  const required=[
    ['GSAP','gsap/dist/gsap.min.js','vendor/gsap.min.js'],
    ['original HyperFrames CSS','../engines/hyperframes/base.css','base.css'],
    ['original HyperFrames runtime','../engines/hyperframes/mf-runtime.js','mf-runtime.js'],
  ];
  for(const [name,sourceRel,relative] of required){
    const from=sourceRel.startsWith('../')?path.resolve(studio,sourceRel):path.join(mods,sourceRel);
    const to=path.join(base,relative);
    if(!existsSync(from))throw Error(name+' missing: '+from+' . Run cd studio && npm install.');
    await mkdir(path.dirname(to),{recursive:true});
    if(!existsSync(to))await copyFile(from,to);
  }
  if(html.includes('route-journey-landscape')){
    for(const [name,src] of fonts){
      const from=path.join(mods,src),to=path.join(base,'fonts',name);
      if(!existsSync(from))throw Error('Route Journey font missing: '+src+'. Run cd studio && npm install.');
      await mkdir(path.dirname(to),{recursive:true});
      if(!existsSync(to))await copyFile(from,to);
    }
  }
  if(html.includes('motionforge template: globe-arcs-3d'))
    await prepareGlobeScene(dir,{preview:false});
  return {scene:dir,originalTemplate:html.match(/motionforge template:\s*([a-z0-9-]+)/)?.[1]};
}
const direct=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){
  const target=process.argv[2];
  if(!target){console.error('Usage: node studio/scripts/prepare-video-scene-assets.mjs videos/<slug>/scenes/<id>');process.exitCode=2;}
  else prepareHyperFramesSceneAssets(path.resolve(repo,target)).then(result=>
    console.log('Original scene assets ready: '+result.scene)).catch(error=>{
      console.error(error.message);process.exitCode=1;
    });
}

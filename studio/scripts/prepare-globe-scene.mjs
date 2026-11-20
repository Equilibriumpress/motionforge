#!/usr/bin/env node
// Prepare local assets for the original globe-arcs-3d HyperFrames template.
// Copies existing licensed npm packages to the scene; never downloads packages.
// In preview mode: bundle the original Three.js module into a classic script so
// a sandboxed GitHub Pages iframe (opaque origin) can load it without ESM CORS.
import path from 'node:path';
import {existsSync} from 'node:fs';
import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const studio=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(studio,'..');
const mods=path.join(studio,'node_modules');

async function copyRequired(name,files,destination){
  const candidates=Array.isArray(files)?files:[files];
  const source=candidates.find(candidate=>existsSync(candidate));
  if(!source)throw Error('Missing '+name+'. Run cd studio && npm install before building the Globe 3D scene.');
  await mkdir(path.dirname(destination),{recursive:true});
  if(!existsSync(destination))await copyFile(source,destination);
  return destination;
}
export async function prepareGlobeScene(folder,{preview=false}={}){
  const dir=path.resolve(folder);
  const source=path.join(dir,'index.html');
  if(!existsSync(source))throw Error('Globe index.html not found: '+source);
  const html=await readFile(source,'utf8');
  if(!html.includes('motionforge template: globe-arcs-3d'))throw Error('Not a globe-arcs-3d source scene: '+source);
  const vendor=path.join(dir,'assets','vendor');
  await mkdir(vendor,{recursive:true});
  await copyRequired('GSAP',path.join(mods,'gsap/dist/gsap.min.js'),path.join(vendor,'gsap.min.js'));
  await copyRequired('Base CSS',path.join(root,'engines/hyperframes/base.css'),path.join(dir,'assets/base.css'));
  await copyRequired('MotionForge runtime',path.join(root,'engines/hyperframes/mf-runtime.js'),path.join(dir,'assets/mf-runtime.js'));
  await copyRequired('MotionForge Three.js bridge',path.join(root,'engines/hyperframes/three/mf-three.js'),path.join(vendor,'mf-three.js'));
  await copyRequired('Three.js',[
    path.join(mods,'three/build/three.module.min.js'),
    path.join(mods,'three/build/three.module.js')
  ],path.join(vendor,'three.module.min.js'));
  const addonRoot=path.join(mods,'three/examples/jsm');
  for(const item of ['environments/RoomEnvironment.js','geometries/RoundedBoxGeometry.js',
    'loaders/GLTFLoader.js','utils/BufferGeometryUtils.js']){
    await copyRequired('Three.js addon: '+item,path.join(addonRoot,item),path.join(vendor,'three-addons',item));
  }
  await copyRequired('world-atlas land data',path.join(mods,'world-atlas/land-50m.json'),path.join(vendor,'land-50m.json'));
  await copyRequired('topojson-client',[
    path.join(mods,'topojson-client/dist/topojson-client.min.js'),
    path.join(mods,'topojson-client/dist/topojson-client.js')
  ],path.join(vendor,'topojson-client.min.js'));
  if(!preview)return {source,prepared:true,bundled:false};

  const pattern=/<script type="module">([\s\S]*?)<\/script>/i;
  const match=html.match(pattern);
  if(!match)throw Error('Original globe Three.js module script was not found in '+source);
  const oldFetch='const topo = await (await fetch("assets/vendor/land-50m.json")).json();';
  if(!match[1].includes(oldFetch))throw Error('Unknown atlas loader in globe template; refusing silent rewrite');
  const entry='import * as topojson from "topojson-client";\n'+
    match[1].replace(oldFetch,'const topo = JSON.parse(document.getElementById("mf-land-atlas").textContent);');
  const {build}=await import('esbuild');
  const built=await build({
    stdin:{contents:entry,resolveDir:dir,sourcefile:'globe-embedded-entry.js',loader:'js'},
    bundle:true,platform:'browser',format:'iife',target:'es2020',
    nodePaths:[mods],define:{'process.env.NODE_ENV':'"production"'},
    minify:false,write:false,logLevel:'warning'
  });
  if(!built.outputFiles?.length)throw Error('Three.js bundle is empty');
  await writeFile(path.join(vendor,'mf-globe-preview.js'),built.outputFiles[0].text,'utf8');
  const atlas=(await readFile(path.join(vendor,'land-50m.json'),'utf8')).replace(/</g,'\\u003c');
  const replacement='<script id="mf-land-atlas" type="application/json">'+atlas+'</script>\n'+
    '<script src="assets/vendor/mf-globe-preview.js"></script>';
  await writeFile(source,html.replace(pattern,replacement),'utf8');
  return {source,prepared:true,bundled:true};
}
const direct=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){
  const target=process.argv[2];
  if(!target){console.error('Usage: node studio/scripts/prepare-globe-scene.mjs videos/<slug>/scenes/globe');process.exitCode=2;}
  else prepareGlobeScene(path.resolve(root,target)).then(result=>{
    console.log('Globe assets prepared:',result.source);
  }).catch(error=>{console.error(error.message);process.exitCode=1;});
}

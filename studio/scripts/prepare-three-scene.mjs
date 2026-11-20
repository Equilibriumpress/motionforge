#!/usr/bin/env node
/**
 * Pages adapter for original HyperFrames Three.js scenes, with source intact.
 * An opaque sandboxed iframe cannot reliably import ESM scripts. Esbuild
 * bundles the exact authored 3D module into a classic script for publication.
 * This does NOT generate the video or replace 3D with a Canvas drawing.
 */
import path from 'node:path';
import {existsSync} from 'node:fs';
import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const studio=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.resolve(studio,'..');
const modules=path.join(studio,'node_modules');
const nativeModule=/<script type="module">([\s\S]*?)<\/script>/i;
export function isNativeThreeScene(html){
  return /motionforge template:\s*[a-z0-9-]+-3d/.test(html)&&nativeModule.test(html)&&
    /import \* as THREE from ["']three["']/.test(html);
}
export function replaceNativeThreeModule(html){
  if(!isNativeThreeScene(html))throw Error('Original HyperFrames Three.js source required.');
  return html.replace(nativeModule,'<script src="assets/vendor/mf-native-three-preview.js"></script>');
}
export async function prepareThreeScene(folder,{preview=false}={}){
  const dir=path.resolve(folder),source=path.join(dir,'index.html');
  if(!existsSync(source))throw Error('Missing original source: '+source);
  const html=await readFile(source,'utf8');
  if(!isNativeThreeScene(html))throw Error('Expected original Three.js HyperFrames scene: '+source);
  const vendor=path.join(dir,'assets/vendor');
  await mkdir(vendor,{recursive:true});
  const helper=path.join(vendor,'mf-three.js');
  if(!existsSync(helper))
    await copyFile(path.join(repo,'engines/hyperframes/three/mf-three.js'),helper);
  if(!preview)return {source,bundled:false};
  const entry=html.match(nativeModule)[1];
  const {build}=await import('esbuild');
  const result=await build({
    stdin:{contents:entry,resolveDir:dir,sourcefile:'native-three-scene.js',loader:'js'},
    bundle:true,platform:'browser',format:'iife',target:'es2020',
    nodePaths:[modules],define:{'process.env.NODE_ENV':'"production"'},
    write:false,minify:false,logLevel:'warning'
  });
  if(!result.outputFiles?.[0]?.text)throw Error('Original Three.js bundle is empty');
  await writeFile(path.join(vendor,'mf-native-three-preview.js'),result.outputFiles[0].text,'utf8');
  await writeFile(source,replaceNativeThreeModule(html),'utf8');
  return {source,bundled:true,engine:'original-three-hyperframes'};
}

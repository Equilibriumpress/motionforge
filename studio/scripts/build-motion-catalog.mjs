#!/usr/bin/env node
// Generate the upstream MotionForge style / scene catalogue for a static Pages site.
// The Markdown READMEs remain the source of truth. No GitHub API, runtime token,
// large GIF copies, executable scene HTML or remote script imports are needed.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';

const studio=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(studio,'..');
const OWNER='Equilibriumpress/motionforge';
const RAW='https://raw.githubusercontent.com/'+OWNER+'/main/';
const SOURCE='https://github.com/'+OWNER+'/blob/main/';
const ID=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function clean(value){
  return value.replace(/<[^>]*>/g,'')
    .replace(/&amp;/g,'&').replace(/&quot;/g,'"')
    .replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
}
function title(value){
  return value.split('-').map(part=>part==='3d'?'3D':part[0].toUpperCase()+part.slice(1)).join(' ');
}
export function parseStyles(readme){
  const styles=[],seen=new Set();
  let category=null;
  for(const line of readme.split(/\r?\n/)){
    const heading=/^##\s+(.+?)\s*$/.exec(line);
    if(heading){category=clean(heading[1]);continue;}
    const row=/^\|\s*\[([a-z0-9-]+)\]\(\1\/STYLE\.md\)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/.exec(line);
    if(!row||!category)continue;
    const id=row[1];
    if(!ID.test(id)||seen.has(id))throw Error('Invalid/duplicate style: '+id);
    seen.add(id);
    const dir='skills/style-library/styles/'+id+'/';
    styles.push({
      id,title:title(id),category,
      description:clean(row[2]),bestFor:clean(row[3]),engine:clean(row[4]),
      previewUrl:RAW+dir+'preview.gif',sourceUrl:SOURCE+dir+'STYLE.md'
    });
  }
  return styles;
}
export function parseScenes(readme){
  const scenes=[],seen=new Set();
  const pattern=/<img\s+src="([a-z0-9-]+)\/preview\.gif"[^>]*>[\s\S]*?<b><code>\1<\/code><\/b><br><sub>([\s\S]*?)<\/sub>/g;
  for(const match of readme.matchAll(pattern)){
    const id=match[1];
    if(!ID.test(id)||seen.has(id))throw Error('Invalid/duplicate scene template: '+id);
    seen.add(id);
    const folder='templates/'+id+'/';
    scenes.push({
      id,title:title(id),category:id.endsWith('-3d')?'3D scenes':id.includes('avatar')||id.includes('character')?'Avatars':'2D scenes',
      description:clean(match[2]),
      previewUrl:RAW+folder+'preview.gif',
      sourceUrl:'https://github.com/'+OWNER+'/tree/main/'+folder.slice(0,-1),
      paramsUrl:SOURCE+folder+'params.json'
    });
  }
  return scenes;
}
export async function buildCatalog(){
  const [styleMd,sceneMd]=await Promise.all([
    readFile(path.join(root,'skills/style-library/styles/README.md'),'utf8'),
    readFile(path.join(root,'templates/README.md'),'utf8')
  ]);
  const styles=parseStyles(styleMd),sceneIndex=parseScenes(sceneMd);
  if(styles.length<1||sceneIndex.length<1)throw Error('Could not parse MotionForge catalogue.');
  // Read original scene contracts, not just the README cards. Studio must know
  // the native size, engine and supported parameter names before promising reuse.
  const scenes=await Promise.all(sceneIndex.map(async scene=>{
    const file=path.join(root,'templates',scene.id,'params.json');
    const spec=JSON.parse(await readFile(file,'utf8'));
    if(spec.id!==scene.id || !Array.isArray(spec.size) || spec.size.length!==2 ||
      !spec.size.every(x=>Number.isInteger(x)&&x>0) || !spec.parameters ||
      spec.engine!=='hyperframes')throw Error('Unsupported original template contract: '+scene.id);
    const [w,h]=spec.size;
    const nativeFormat=w*9===h*16?'16:9':w*16===h*9?'9:16':
      w===h?'1:1':w*5===h*4?'4:5':'custom';
    return {...scene,engine:spec.engine,nativeSize:spec.size,
      nativeFormat,parameterNames:Object.keys(spec.parameters),
      requires:spec.requires||[],supportsDuration:!!spec.parameters.duration};
  }));
  const categories=[...new Set(styles.map(style=>style.category))];
  const catalog={schemaVersion:1,source:'MotionForge upstream library',
    generatedFrom:['skills/style-library/styles/README.md','templates/README.md'],
    counts:{styles:styles.length,scenes:scenes.length,categories:categories.length},
    categories,styles,scenes};
  const out=path.join(studio,'public','catalog');
  await mkdir(out,{recursive:true});
  await writeFile(path.join(out,'index.json'),JSON.stringify(catalog,null,2)+'\n');
  return catalog;
}
const direct=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct)buildCatalog()
  .then(data=>console.log('MotionForge catalogue: '+data.counts.styles+' styles, '+data.counts.scenes+' scenes in '+data.counts.categories+' categories.'))
  .catch(error=>{console.error(error);process.exitCode=1;});

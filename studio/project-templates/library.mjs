// MotionForge Studio production templates (editable Canvas project starters).
// All generated titles and data are examples until the agent supplies verified content.
export const templates = {
  'book-trailer': {
    name:'Boektrailer',
    description:'Cover, redactionele introductie en afsluiting.',
    accent:'#b3e3b6',
    tags:['boektrailer','boeken'],
    feature:'book'
  },
  'walking-route':{
    name:'Wandelroute',
    description:'Schematische route met start, haltes en eindpunt. Geen echte kaart.',
    accent:'#efc68b',
    tags:['wandelroute','kaartanimatie'],
    feature:'route'
  },
  'data-story':{
    name:'Infographic',
    description:'Bewegende voorbeeldgegevens, zonder ongecontroleerde feiten.',
    accent:'#88c9f1',
    tags:['infographic','data'],
    feature:'data'
  },
  'app-preview':{
    name:'App-preview',
    description:'Een duidelijk als concept gemarkeerd mobiel app-scherm.',
    accent:'#e6abca',
    tags:['app','demo'],
    feature:'app'
  }
};

export const templateNames = Object.keys(templates);

export function storyboard(template, frames, fps) {
  if(!templates[template]) throw Error('Unknown template '+template);
  if(!Number.isInteger(frames)||frames<9||!Number.isInteger(fps)||fps<12)throw Error('Invalid timeline');
  const a=Math.max(1,Math.round(frames*.30));
  const b=Math.max(1,Math.round(frames*.45));
  const c=frames-a-b;
  if(c<1)throw Error('Duration too short for storyboard');
  return [
    {id:'intro',title:'Opening',phase:'intro',startSeconds:0,durationSeconds:a/fps,engine:'canvas',source:'scenes/intro/index.html'},
    {id:'feature',title:'Hoofdscène',phase:'feature',startSeconds:a/fps,durationSeconds:b/fps,engine:'canvas',source:'scenes/feature/index.html'},
    {id:'outro',title:'Afsluiting',phase:'outro',startSeconds:(a+b)/fps,durationSeconds:c/fps,engine:'canvas',source:'scenes/outro/index.html'}
  ];
}

function xml(value) {
  return value.replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[character]));
}
export function coverSvg({title,subtitle,accent,width,height}) {
  const font=Math.max(30,Math.min(width*.068,height*.13));
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+'">'+
    '<rect width="'+width+'" height="'+height+'" fill="#0d1822"/>'+
    '<path d="M '+(width*.08)+' '+(height*.70)+' Q '+(width*.36)+' '+(height*.46)+' '+(width*.65)+' '+(height*.64)+' T '+(width*.92)+' '+(height*.40)+'" fill="none" stroke="'+accent+'" stroke-width="'+(width*.006)+'"/>'+
    '<text x="'+(width*.08)+'" y="'+(height*.34)+'" fill="#f5f3ea" font-size="'+font+'" font-family="Arial, sans-serif" font-weight="700">'+xml(title)+'</text>'+
    '<text x="'+(width*.08)+'" y="'+(height*.85)+'" fill="'+accent+'" font-size="'+(font*.42)+'" font-family="Arial, sans-serif">'+xml(subtitle)+'</text></svg>\n';
}
export function embedScene(templateHtml,spec) {
  const json=JSON.stringify(spec).replace(/</g,'\\u003c');
  return templateHtml.replace('/*__SCENE_SPEC__*/','const SCENE_SPEC='+json+';');
}

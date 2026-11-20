import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canCopyStylePrompt,makePrompt} from './catalog-prompt.mjs';

const styles=[
  {id:'route-journey',title:'Route Journey',description:'Geografische reisanimaties',
    bestFor:'Routes en reisvideo'},
  {id:'neighborhood-guide',title:'Neighborhood Guide',description:'Wijken met herkenbare plekken'},
  {id:'passport-stamps',title:'Passport Stamps',description:'Reisdocumentanimaties'}
];
const scene={id:'kinetic-title',title:'Kinetic Title',engine:'hyperframes',
 nativeFormat:'9:16',nativeSize:[1080,1920],supportsDuration:true};

test('each original style alone produces a complete copyable prompt',()=>{
  for(const style of styles){
    assert.equal(canCopyStylePrompt(style),true);
    const text=makePrompt({style,scenes:[],title:'Kyoto',aspect:'9:16',length:'30'});
    assert.ok(text.length>1800,style.id+' prompt is unexpectedly empty');
    assert.match(text,new RegExp('styles/'+style.id+'/STYLE\\.md'));
    assert.match(text,/Er is nog GEEN scène gekozen/);
    assert.match(text,/templates\/<id>\/index\.html/);
    assert.match(text,/G1:|G1：/);
    assert.match(text,/G7:|G7：/);
    assert.match(text,/Kyoto/);
  }
});
test('with original user-selected scene the prompt binds the actual source',()=>{
  const text=makePrompt({style:styles[0],scenes:[scene],title:'Amsterdam',
    aspect:'9:16',length:'45'});
  assert.match(text,/templates\/kinetic-title/);
  assert.match(text,/1080×1920/);
  assert.doesNotMatch(text,/Er is nog GEEN scène gekozen/);
});
test('wrong format is visible in the copied work order',()=>{
  const text=makePrompt({style:styles[1],scenes:[scene],aspect:'16:9'});
  assert.match(text,/FORMAATCONFLICT/);
  assert.match(text,/9:16/);
});
test('an own format is properly labeled, not misrepresented as upstream',()=>{
  const text=makePrompt({style:styles[2],own:'book-reel',scenes:[]});
  assert.match(text,/Eigen Studio-format: book-reel/);
  assert.doesNotMatch(text,/Er is nog GEEN scène gekozen/);
});
test('no selection still offers clear user guidance rather than a blank textarea',()=>{
  const text=makePrompt({style:null});
  assert.ok(text.length>70);
  assert.match(text,/100 MotionForge-stijlen/);
  assert.equal(canCopyStylePrompt(null),false);
});
test('title and format changes are reflected in a new prompt',()=>{
  const a=makePrompt({style:styles[0],title:'Kyoto',aspect:'9:16',length:'30'});
  const b=makePrompt({style:styles[0],title:'Porto',aspect:'16:9',length:'60'});
  assert.notEqual(a,b);
  assert.match(b,/Porto/);
  assert.match(b,/60 seconden/);
  assert.match(b,/16:9/);
});

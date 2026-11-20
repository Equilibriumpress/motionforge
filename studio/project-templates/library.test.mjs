import {test} from 'node:test';
import assert from 'node:assert/strict';
import {templates,templateNames,storyboard,coverSvg,embedScene} from './library.mjs';
import {readFile} from 'node:fs/promises';

test('production templates expose four distinct formats',()=>{
  assert.deepEqual(templateNames.sort(),['app-preview','book-trailer','data-story','walking-route']);
  for(const key of templateNames)assert.ok(templates[key].feature);
});
test('storyboard covers timeline without overlaps',()=>{
  for(const name of templateNames){
    const scenes=storyboard(name,450,30);
    assert.equal(scenes.length,3);
    assert.equal(scenes[0].startSeconds,0);
    for(let i=1;i<scenes.length;i++){
      assert.equal(Math.round(scenes[i].startSeconds*30),
        Math.round((scenes[i-1].startSeconds+scenes[i-1].durationSeconds)*30));
    }
    assert.equal(Math.round((scenes[2].startSeconds+scenes[2].durationSeconds)*30),450);
  }
});
test('scene injection escapes HTML script terminators',async()=>{
  const html=await readFile(new URL('./scene.html',import.meta.url),'utf8');
  const rendered=embedScene(html,{
    phase:'intro',title:'</script><script>alert(1)</script>',subtitle:'test',
    width:1280,height:720,duration:5,feature:'book',template:'book-trailer',accent:'#a9f0ad'
  });
  assert.ok(!rendered.includes('</script><script>alert'));
  assert.ok(rendered.includes('window.render='));
  assert.ok(rendered.includes('window.READY='));
});
test('cover markup escapes unsafe text',()=>{
  const svg=coverSvg({title:'A < B & C',subtitle:'Preview',accent:'#abcdef',width:1280,height:720});
  assert.ok(svg.includes('A &lt; B &amp; C'));
});

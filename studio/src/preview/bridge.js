/* Generated-scene bridge. Never edit canonical video project source. */
(() => {
  'use strict';
  let ready = false;
  let pending = null;
  let busy = false;
  const send = (kind, extra = {}) => window.parent.postMessage({type:'MF_PREVIEW',kind,...extra}, '*');
  function timeline() {
    const all = window.__timelines || {};
    const id = document.querySelector('[data-composition-id]')?.dataset.compositionId || 'main';
    return all[id] || Object.values(all)[0];
  }
  function resizeStage() {
    if (typeof window.render === 'function') return;
    const root = document.querySelector('[data-composition-id]');
    if (!root) return;
    const w = Number(root.dataset.width), h = Number(root.dataset.height);
    if (!(w > 0 && h > 0)) return;
    // The iframe's actual visible viewport is the video canvas.
    // Never fit the original video inside an already letterboxed HTML wrapper.
    const vw = window.innerWidth, vh = window.innerHeight;
    const z = Math.min(vw / w, vh / h);
    Object.assign(root.style, {
      transformOrigin:'top left',
      transform:'scale(' + z + ')',
      position:'absolute',
      width:w+'px',height:h+'px',
      left:((vw-w*z)/2)+'px',top:((vh-h*z)/2)+'px',margin:'0'
    });
    document.documentElement.style.overflow='hidden';
    document.body.style.overflow='hidden';
  }
  function stageGeometry(){
    const root=document.querySelector('[data-composition-id]');
    if(!root)return null;
    const rect=root.getBoundingClientRect();
    return {nativeWidth:Number(root.dataset.width),nativeHeight:Number(root.dataset.height),
      viewportWidth:window.innerWidth,viewportHeight:window.innerHeight,
      width:rect.width,height:rect.height,left:rect.left,top:rect.top};
  }
  async function draw(t,requestId=null) {
    pending = {seconds:Math.max(0,Number(t)||0),requestId};
    if (!ready || busy) return;
    busy = true;
    while (pending !== null) {
      const {seconds,requestId} = pending;
      pending = null;
      try {
        if (typeof window.render === 'function') await window.render(seconds);
        else if (typeof timeline()?.seek === 'function') {
          timeline().seek(seconds);
          // HyperFrames 3D layers listen for hf-seek; GSAP .seek() alone only moves HTML.
          window.dispatchEvent(new CustomEvent('hf-seek',{detail:{time:seconds}}));
        }
        else throw Error('Geen tijdgestuurde Canvas- of HyperFrames-scène gevonden');
        // Export requests need a completed browser paint, including 3D WebGL.
        if(requestId!==null)
          await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
        send('frame',{seconds,requestId,stage:stageGeometry()});
      } catch (error) {
        send('error',{message:String(error?.message || error),requestId});
        break;
      }
    }
    busy = false;
  }
  function init() {
    if (window.READY === false) {
      if (++init.attempts < 125) return setTimeout(init,80);
      return send('error',{message:'Scène niet gereed na 10 seconden'});
    }
    if (typeof window.render !== 'function' && !timeline()) {
      return send('error',{message:'Deze scène ondersteunt geen browserpreview'});
    }
    resizeStage();
    ready = true;
    send('ready',{stage:stageGeometry()});
    draw(0);
  }
  init.attempts = 0;
  window.addEventListener('resize',resizeStage);
  window.addEventListener('message',event => {
    if (event.source !== window.parent || event.data?.type !== 'MF_PREVIEW') return;
    if (event.data.kind === 'seek') draw(event.data.seconds,event.data.requestId);
    if (event.data.kind === 'ping' && ready) send('ready',{stage:stageGeometry()});
  });
  if (document.readyState === 'complete') init();
  else window.addEventListener('load',init,{once:true});
})();

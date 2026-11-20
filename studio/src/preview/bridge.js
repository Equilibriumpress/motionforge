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
    const z = Math.min(innerWidth / w, innerHeight / h);
    Object.assign(root.style, {transformOrigin:'top left',transform:'scale(' + z + ')',
      position:'absolute',left:Math.max(0,(innerWidth-w*z)/2)+'px',
      top:Math.max(0,(innerHeight-h*z)/2)+'px',margin:'0'});
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }
  async function draw(t) {
    pending = {seconds:Math.max(0,Number(t)||0),requestId:arguments[1]??null};
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
        send('frame',{seconds,requestId});
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
    send('ready');
    draw(0);
  }
  init.attempts = 0;
  window.addEventListener('resize',resizeStage);
  window.addEventListener('message',event => {
    if (event.source !== window.parent || event.data?.type !== 'MF_PREVIEW') return;
    if (event.data.kind === 'seek') draw(event.data.seconds,event.data.requestId);
    if (event.data.kind === 'ping' && ready) send('ready');
  });
  if (document.readyState === 'complete') init();
  else window.addEventListener('load',init,{once:true});
})();

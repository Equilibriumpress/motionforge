// Explicit allowlist: project files are data and never execute arbitrary
// browser-rendering code in the Studio's origin.
export const FORMATS={
  '16:9':[1280,720],
  '9:16':[720,1280],
  '1:1':[1080,1080],
  '4:5':[864,1080],
};
const COLOR=/^#[0-9a-fA-F]{6}$/;
export function acceptsBrowserRender(manifest) {
  const r=manifest?.browserRender;
  return manifest?.engine==='remotion' && r?.template==='title-card-v1'
    && typeof r.title==='string' && r.title.length>0 && r.title.length<=80
    && typeof r.subtitle==='string' && r.subtitle.length<=110
    && COLOR.test(r.background) && COLOR.test(r.accent)
    && !!FORMATS[manifest.format] && manifest.durationSeconds>0;
}
export function browserComposition(manifest, component) {
  if (!acceptsBrowserRender(manifest)) throw Error('Dit project heeft geen ondersteunde browsercompositie.');
  const [width,height]=FORMATS[manifest.format];
  return {
    component,
    id:'motionforge-'+manifest.id,
    width,height,
    fps:manifest.fps,
    durationInFrames:Math.ceil(manifest.durationSeconds*manifest.fps),
    calculateMetadata:null,
  };
}
export function renderProps(manifest) {
  return {
    title:manifest.browserRender.title,
    subtitle:manifest.browserRender.subtitle,
    background:manifest.browserRender.background,
    accent:manifest.browserRender.accent,
  };
}

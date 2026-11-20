# Peak District roadtrip · QA log

Source goals:
- 30 seconds / 900 frames / 16:9 / Dutch / four contiguous scenes.
- Globe scene derived from original MotionForge globe-arcs-3d source and params.
- Route-journey styling and accurate place names.
- Real point coordinates; no invented navigable road or driving time.
- Original procedurally drawn cover and scene images, no stock media.
- Zero paid generation or media requests.

To run after checkout:
    node tools/studio-qa.mjs peak-district-roadtrip
    node --test videos/peak-district-roadtrip/project.test.mjs
    cd studio && npm install && npm run build

Pending for final release:
- Build in a runtime with npm dependencies.
- Headless Chromium/WebGL scene preview and contact sheet.
- MP4 render, 00/08/18/25s transition check, 30.00s duration ffprobe validation.
- Narration approval (G2), storyboard approval (G5), independent review (G7).

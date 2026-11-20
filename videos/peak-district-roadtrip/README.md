# PEAK DISTRICT · ROADTRIP

Original Dutch 30-second MotionForge Studio project in 16:9 (1920×1080, 30 fps).

Timeline: 0–8s original HyperFrames globe-arcs-3d scene, 8–18s geographic point route diagram, 18–25s original vector illustrations, 25–30s outro. Selected style: route-journey.

The map's four points have real approximate coordinates. Connecting lines are schematic, not a routable road network. Sources: data/SOURCES.md. No paid media, external photos or audio are included.

## Develop and preview

    cd studio && npm install && npm run build
    cd .. && node studio/scripts/prepare-globe-scene.mjs videos/peak-district-roadtrip/scenes/globe
    node tools/studio-qa.mjs peak-district-roadtrip
    node --test videos/peak-district-roadtrip/project.test.mjs
    node tools/studio-render.mjs peak-district-roadtrip --dry-run

The original Globe Arcs 3D template uses GSAP, Three.js, world-atlas and topojson-client. The Studio builds an isolated browser-preview bundle while preserving the authored scene source.

Full local MP4 rendering needs Chromium/Playwright and FFmpeg. Review actual stills and timing before claiming a finished video. Script and storyboard are drafts awaiting approval. Source-level QA is distinct from final audiovisual QA.

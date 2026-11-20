# Source and 16:9 adaptation

Based directly on templates/globe-arcs-3d/index.html (MotionForge contributors, MIT), using the original paused GSAP timeline and Three.js globe/arc code.

Original parameter schema: templates/globe-arcs-3d/params.json (included here). Edited params: params-values.json (and embedded in index.html).

Landscape stage: 1920×1080. WebGL canvas: 1240×1080 on the right. Four real Peak District points, Dutch copy, 8s duration, Route Journey palette. Globe-scale labels may overlap, so the full stop names are presented in the second geographic scene.

Local preparation (no paid calls):
    cd studio && npm install
    cd .. && node studio/scripts/prepare-globe-scene.mjs videos/peak-district-roadtrip/scenes/globe

The generated Pages copy bundles the original Three.js module as a classic script for the sandboxed iframe.

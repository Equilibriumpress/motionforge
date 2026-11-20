# Original-source 16:9 stage adaptation

Approved G1/G2/G4; G3 unpaid silent concept.

- All 5 original template sources were read, parameter JSON reused unchanged and stage dimensions changed in source to 1920x1080.
- Original kinetic-title scene keeps MF.timeline and word-by-word GSAP; original checklist-reveal keeps timed GSAP rows and check animations.
- Original product-turntable-3d scene keeps Three.js import, mf-three createStage/environment/lights/shadowCatcher/onSeek and GSAP title timeline. The upstream speaker/pedestal/orbit scene is purposefully rewritten as a physical cardboard box with 4 independent hinged flaps, tissue paper and 4 simple fictional items. This is a Three.js source adaptation, not a Canvas rendering.
- Unboxing Pop palette #CDA77C #FFFDF7 #1E1A16 #FF3E8A #FFD23F #8A6F52 is embedded. Rubik is declared but font binaries are not included. Name stickers use original GSAP timeline and follow source style's slap overshoot.
- 5 x 1920x1080 source stages verified; timeline exactly 4+6+9+6+5=30s=900 frames. Text positions, visual fills and asset loading have NOT been verified on rendered frames.
- The original generator's --plan schema is now filled in. The original CLI is NOT executed because local npm GSAP/Three/Fontsource and HyperFrames render dependencies are absent. The generator refuses overwriting the existing project; stage in a clean target and preserve approved G1/G2/G4 decisions when rebuilding.
- Existing scene folders include index.html, original params.json, selected params.values.json and source runtime files where available. The original GSAP and Three.js vendor binaries remain UNBUNDLED until the upstream scaffold step is run.
- No still frames, lint, textcheck, readcheck, video QA, independent critic or MP4 were made.

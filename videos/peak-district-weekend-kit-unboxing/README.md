# PEAK DISTRICT · THE WEEKEND KIT

Fictieve Unboxing Pop-promovideo, Nederlands, 30s, 1920x1080, 30fps.

G1, G2 and G4 approved by the user, G3 silent with no paid services. Project is a source-authored concept until actual video rendering, G5 storyboard approval, G6 complete QA and G7 independent critic.

## Native source-based scenes
- 0–4s `hook` original kinetic-title, source 16:9
- 4–10s `box-open` original product-turntable-3d, real Three.js four flap animation
- 10–19s `item-reveal` original product-turntable-3d, four modelled products, name stickers
- 19–25s `contents` original checklist-reveal + illustrated flatlay
- 25–30s `outro` original kinetic-title

Source adaptations are stored in `source-adaptations/` and under the corresponding `scenes/<id>/index.html`. The approved, CLI-format `video-plan.json` supplies per-scene `adaptation.source`.

## Next steps
The original `new-from-upstream.mjs --plan` cannot overwrite this project folder. In an authorized local checkout with gsap, three, Fontsource fonts and pinned HyperFrames installed, move the source plan and adaptations into a clean staging location, generate a clean project with the original CLI, then reconcile the generated vendor assets and preserve user-approval evidence. No alternate Canvas implementation.

No local render occurred, no real MP4 or preview verification exists. The GitHub PR is not merged. Pages can list the project only after merge and proper assets.

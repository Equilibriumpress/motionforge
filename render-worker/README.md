# Original MotionForge local renderer

Install Studio JS deps with `cd studio && npm install --no-audit --no-fund` and the separately pinned HyperFrames CLI with `cd render-worker && npm install --no-audit --no-fund`.

`node tools/studio-render-doctor.mjs --three` verifies dependencies without downloads.

`node tools/studio-render.mjs peak-district-roadtrip --dry-run` checks the timeline.

`node tools/studio-render.mjs peak-district-roadtrip --quality draft` renders locally, then produces `qa/board/`, `qa/contact-sheet.png`, and a measured `qa/render-report.json` for manual G5–G7 review. It does **not** approve any gate.

Browser/3D source files are copied into temporary scene directories and bundled there. The original committed HTML and parameters remain unchanged. Nothing invokes GitHub Actions; scripts perform no paid service calls.

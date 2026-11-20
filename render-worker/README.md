# MotionForge render worker (MF-12D)

The original HyperFrames CLI is pinned to version 0.8.92. The worker is separate from the GitHub Pages build, does not create another agent, call paid APIs, download footage or render MP4 in GitHub Actions.

## Native setup

1. Install Node.js 22, Python 3, Chromium, FFmpeg and FFprobe.
2. Run: cd studio && npm install --no-audit --no-fund
3. Run: cd render-worker && npm install --no-audit --no-fund
4. From repo root: node tools/studio-render-doctor.mjs --three
5. Check a project: node tools/studio-render.mjs peak-district-roadtrip --dry-run
6. Draft render: node tools/studio-render.mjs peak-district-roadtrip --quality draft
7. Inspect videos/<slug>/qa/contact-sheet.png and qa/render-report.json before G5–G7.

--audio auto chooses locally prepared voice files from audio/voice-plan.json subject to approval. Original tools/word_timings.py extracts actual word timings. The renderer refuses audio longer than the scene timeline.

The runner copies each scene to temporary storage before adapting vendor files or bundling the 3D globe, leaving original committed HTML untouched. It runs the local pinned HyperFrames binary, not npx --yes.

A successful render creates an MP4, actual frames, a contact sheet and FFprobe measurements. These are evidence for review, not automatic G5/G6/G7 approval.

## Container (optional)

From the repository root:

    docker build -f render-worker/Dockerfile -t motionforge-render .
    docker run --rm -v "$PWD/videos:/app/videos" motionforge-render peak-district-roadtrip --dry-run
    docker run --rm -v "$PWD/videos:/app/videos" motionforge-render peak-district-roadtrip --quality draft

The image installs Node 22, Chromium, FFmpeg, Python and local npm dependencies. It pulls open-source packages during build. Keep confidential voice/media in a private host workspace. Host videos are mounted to preserve the rendered outputs.

Dockerfile presence alone is not successful browser/WebGL validation. Check browser flags and fonts on your actual render machine.

## Follow-up

Use node tools/studio-render-review.mjs <slug> to regenerate the stills and FFprobe report from an existing MP4. Failed frames or missing browser dependencies must be fixed before delivery.


## MF-12E QA

Rendering now automatically starts tools/studio-qa-review.mjs after creating the MP4 and scene storyboard. It writes qa/report.json, qa/report.md, time-stamped qa/sheet.png, qa/phone.png, ffprobe and FFmpeg diagnostics. A second MP4 may be passed for T5 determinism. Missing dependencies and human observations stay pending. A nonzero fail count yields a nonzero renderer exit status without deleting the MP4. See docs/STUDIO_QA_REVIEW.md and the original skills/qa-review/SKILL.md. No video rendering is added to GitHub Actions.

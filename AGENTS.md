# motionforge — instructions for coding agents

motionforge turns a request like "make a 45-second reel about X" into a checked MP4: story, hook, script, voice, style, scenes in code, render, QA, delivery. This file is the entry point for any agent (Claude Code, Codex, Cursor, others).

## Start here
For any video, reel, short, animated explainer, motion graphics, 3D scene, talking character or avatar, kinetic type, voice-over-to-video, or cover/caption request: **read and follow [`skills/motion-director/SKILL.md`](skills/motion-director/SKILL.md)**. It calls the other skills in order.

| Skill | Purpose |
|---|---|
| [`skills/motion-director`](skills/motion-director/SKILL.md) | the umbrella workflow and its gates |
| [`skills/script-and-hooks`](skills/script-and-hooks/SKILL.md) | hooks, script, claim list, banned phrases in 10 languages |
| [`skills/voice-and-timing`](skills/voice-and-timing/SKILL.md) | TTS with a consent/cost gate, word timings, captions, mixing, loudness |
| [`skills/style-library`](skills/style-library/) | the catalog of looks (`STYLE.md` per style) |
| [`skills/brand-kit`](skills/brand-kit/SKILL.md) | `brand.json`: colors, fonts, logos, watermark, outro, tone |
| [`skills/qa-review`](skills/qa-review/SKILL.md) | contact sheets, text/safe-area/loudness checks, independent critic |
| [`skills/faceless-ugc`](skills/faceless-ugc/SKILL.md) | faceless and UGC videos: no-face formats, 3D character, photo puppet, AI avatar; consent, honesty, cost gate, lip-sync QA |

Engines: `engines/hyperframes` (default), `engines/remotion` (optional, license note in motion-director), `engines/canvas` (hand-drawn/procedural), 3D layer `engines/hyperframes/three` (three.js). Reusable scenes: `templates/` (2D, 3D, `character-3d`, `photo-avatar`). Helpers: `tools/` (`word_timings.py`, `cutout.py`, `loudness.sh`, `contact_sheet.py`, `textcheck.mjs`, `export.mjs`, `cover_safe_area.py`, `mouth_curve.py`, `avatar/` for AI or local lip-sync, landmarks and `sync_check.py`).

## Rules that always apply
1. **Reply in the user's language.** Write scripts, on-screen text and captions in the video's language. Skill files stay in English.
2. **No paid call without a yes.** TTS, image/video generation, lip-sync, paid music: state what will be generated and the estimated cost, then wait for explicit approval. Tests count.
3. **Keys from the environment only** (`ELEVENLABS_API_KEY`, `OPENAI_API_KEY`, `FAL_KEY`, `WIRO_API_KEY`, …). Never print, store, log or commit them.
4. **No invented facts.** Checkable claims go into a list for the user; unsourced high-risk claims are softened or removed.
5. **No banned phrases** from `skills/script-and-hooks/i18n/<lang>.md`, in any text you produce.
6. **Deterministic frames.** Seeded randomness, no wall clock, no self-running CSS animations.
7. **Real logos and real screens**; mock content is disclosed at delivery.
8. **No delivery without QA** (`qa-review`), including a fresh-context critic when the environment allows it.
9. **Licensing.** Use only assets the user owns or that carry a license allowing the use, and record them in `assets/CREDITS.md`. GSAP comes from npm, not vendored. Do not clone voices or faces without the documented consent of the person.

## Requirements
Node 18+ (22 recommended), ffmpeg on PATH, Python 3.10+ with numpy. Optional: `three` (3D, npm), `faster-whisper` (word timings), `rembg` (cut-outs), `fonttools` (glyph check), `mediapipe` (face landmarks), `fal-client` (fal.ai), Playwright Chromium (screenshots). Check them at the start of a job; if something is missing, give the install command and continue only with what works.

## Working in this repository (contributors)
- Skills are agent-facing: numbered steps, exact commands, explicit gates. Keep them short.
- Every SKILL.md has frontmatter: `name`, `description` (when to trigger), `license: MIT`.
- Examples use only original or fictional content. No personal data, client brands, voice IDs or keys.

## Studio authoring (MF-05)

For requests to publish or edit a MotionForge Studio project, read docs/STUDIO_WORKFLOW.md after the existing motion-director skill. Author all files in videos/<slug>/, update the v1 project manifest, and use a GitHub feature branch and PR. Preserve existing approval gates, asset licensing, and QA. The public Pages site is read-only, and Actions only deploys the site, not the video.

## Studio templates and QA (MF-08)

When a Studio video fits a book trailer, walking route, infographic or app-preview format, consult docs/STUDIO_TEMPLATES.md and use the reusable source template in studio/project-templates. Run node tools/studio-qa.mjs <slug> before opening a project PR. Do not publish schematic route drawings as genuine maps, demo numbers as real statistics, or concept UI as real app screenshots. Maintain all motion-director approvals and licensing checks.


## Original MotionForge style/scene selection (MF-09)

When a Studio project uses chosen style and scene IDs, read docs/STUDIO_UPSTREAM_CATALOG.md and the exact STYLE.md and template source files before authoring. A style is a design specification; a GIF is only an animated preview. Existing motion-director approvals, asset rights, project manifests and QA still apply.


## MF-10: mandatory original video workflow

For original template-based video requests, first read docs/STUDIO_ORIGINAL_PRODUCTION.md and skills/motion-director/SKILL.md. Keep original HTML/Three.js/GSAP code, parameter contract, engine and approvals. Use studio/scripts/new-from-upstream.mjs for native scaffolds and the original new-scene.sh. Never substitute generic Canvas for a chosen original template. READY requires the original G1–G7 approval evidence.

## MF-12A/B · ChatGPT is Motion Director

For every new or revised Studio video, read `docs/STUDIO_AGENT_WORKFLOW.md` immediately after the original `skills/motion-director/SKILL.md`. The original upstream skills are authoritative: do not write an alternative simplified skill. The companion CLI `studio/scripts/motion-director-workflow.mjs` lists original files needed per G1–G7 gate and records user-approved evidence/decisions without inventing approvals. Multiple original templates are authored through `studio/scripts/new-from-upstream.mjs --plan <video-plan.json>`, which invokes the original `new-scene.sh` for every scene. A storyboard project is a concept until actual rendered frames and QA have passed. Never claim an MP4 exists merely because a PR merged.


## MF-12C / MF-12D · Original voice, timing and local rendering

After G2, read the COMPLETE original skills/voice-and-timing/SKILL.md and docs/STUDIO_VOICE_AND_TIMING.md. Use tools/studio-voice.mjs to select silent/user-recording/local-TTS or to document paid voice cost. Never call paid TTS without explicit G3 user approval. The local helper imports a recorded voice with real or explicitly estimated word timings, captions, and spoken-word scene cues. ChatGPT must incorporate the measured cues into original seekable HyperFrames scenes before G5; writing a JSON file alone does not make the animation word-synced.

For actual video frames, read render-worker/README.md and use the local worker. Run node tools/studio-render-doctor.mjs and node tools/studio-render.mjs <slug> --quality draft. HyperFrames remains the original pinned engine, the 3D scene is bundled in a staging copy, and FFmpeg/FFprobe produce actual frame evidence and contact sheets. No MP4 in GitHub Actions. Do NOT mark G5–G7 passed without a human storyboard approval, real QA and a fresh-context critic.

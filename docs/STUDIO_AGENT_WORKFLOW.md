# MotionForge Studio · ChatGPT as the original Motion Director (MF-12A)

This file is a **bridge** to upstream skills, not a replacement skill. The agent is ChatGPT. The original `AGENTS.md` and `skills/motion-director/SKILL.md` always take precedence on creative decisions, costs, approvals and QA.

## Every new video request

1. Read `AGENTS.md` and the full `skills/motion-director/SKILL.md`. Read the original sibling skills for the active stage and its reference files. Use `node studio/scripts/motion-director-workflow.mjs --project <slug>` for a stage-specific list once the project exists. Do not merely mention skills in a prompt without consulting their instructions.
2. Write the original **five-line brief**. Read back a one-sentence interpretation. G1 requires actual approval, not an inferred approval.
3. Use `skills/script-and-hooks/SKILL.md` for 2–3 hook options, the timed script and a factual claim list. Use language-specific phrases lists where available. Get G2 approval.
4. Use `skills/voice-and-timing/SKILL.md` for voice path and word cues. Request explicit permission **before any paid call**, including test calls. A no-spend choice is recorded with G3 as `not_applicable` and a reason. Never fake speech timings when audio is absent.
5. Read the chosen complete `skills/style-library/styles/<id>/STYLE.md` and `skills/brand-kit/SKILL.md`. Record G4 approval or an explicit delegation to ChatGPT.
6. Use original `templates/<id>/index.html`, `params.json` and `engines/hyperframes/scripts/new-scene.sh`. For three or more scenes, use the plan-based original-source scaffold described below. Other engines are permitted only when the original Motion Director selects them for a suitable style; they are not substitutions for an explicitly selected HyperFrames template.
7. Render **real** storyboard stills with the chosen engine and get G5. Lint, render actual frames and run original `skills/qa-review/SKILL.md` with no outstanding FAIL (G6). Use `skills/qa-review/references/critic.md` in a fresh context for G7 where available; report if unavailable.
8. Deliver a checked MP4, cover and captions/description only after the gates, and state explicitly what was tested or missing. A GitHub PR, source files or a GIF preview is **not** a completed video.

## Approval records and choices

Each project maintains `videos/<slug>/production.json`: `workflow.agent = "ChatGPT"`, original source references, creative decisions and G1–G7 state. Newly generated projects begin as `concept`, with all gates `pending`.

Read the next required skills and progress:
`node studio/scripts/motion-director-workflow.mjs --project <slug>`

Retrieve the original files for a specific gate:
`node studio/scripts/motion-director-workflow.mjs --project <slug> --gate G5`

Recording approval requires an existing project-local evidence file and explicit human confirmation, for example:
`node studio/scripts/motion-director-workflow.mjs --project <slug> --gate G1 --record passed --actor user --evidence qa/brief-approval.md --decision "User confirmed brief in chat"`

A choice such as G4 delegation must be explicitly recorded before an agent claims approval. For G3 no-spend:
`node studio/scripts/motion-director-workflow.mjs --project <slug> --gate G3 --record not_applicable --actor agent --reason "No paid media, TTS, music or render services requested"`

These commands **record** evidence; they do not themselves seek or imply user consent. Do not create fake evidence or mark a gate passed merely because a GitHub commit succeeded.

## Multi-scene source scaffold (MF-12B)

The original single-scene generator remains:
`node studio/scripts/new-from-upstream.mjs --template kinetic-title --style route-journey --slug example --title "Example" --duration 4 --format 9:16`

For full timeline generation, author one JSON plan and pass it to the same generator:

`node studio/scripts/new-from-upstream.mjs --plan studio/scripts/fixtures/multiscene-native.json --dry-run`

`node studio/scripts/new-from-upstream.mjs --plan path/to/your-video-plan.json`

The plan contains `slug`, `title`, `language`, `style`, `format`, `fps`, `durationSeconds`, `storyFormat`, a five-line brief (goal, audience, platform, tone), a direction (concept, visualRule, motif), **2–3 typed hook options**, a **factual claim list** (empty when none), and **3–30 scenes**. Each scene must declare a unique `id`, `template`, `title`, frame-exact `durationSeconds`, content-specific original `params` and a `direction` with cue, layout, entrance, hero, onScreenText, narration and motifRole.

A 9:16 original template requested at 16:9 **must** provide `adaptation: { "source": "relative/path/to/16x9-source.html", "notes": "..." }` per affected scene. The source must preserve the chosen original template marker, parameter contract, GSAP/Three.js code and native seek interface, with an explicit 1920×1080 composition. The generator refuses silent stretching or a hand-built Canvas replacement. Actual rendered stills and G5 approval remain necessary.

The generator validates all scenes **before writing**, then invokes the original `new-scene.sh` for each, checks runtime/font assets, writes `params.values.json`, applies authored layout adaptations, builds the exact shared timeline and records source provenance, decisions and pending gates. It publishes atomically to one `videos/<slug>/` directory or rolls back on failure. Existing project folders are never overwritten.

The generator does **not** write finished scripts, create a voice, download third-party media, make paid calls, automatically approve anything or render MP4. Those follow the original skill stages.

## Runtime and boundaries

The GitHub Pages site is a read-only catalogue, editor and preview, not a trusted render agent or a ChatGPT session. ChatGPT uses the connected GitHub repository to read/write source. A working Node + dependencies + Chromium/HyperFrames + FFmpeg execution environment is needed to render and validate actual video. GitHub Actions must not render MP4.

The source registry and static builder read `project.json` and `production.json`, and `ready` must not be set until G1–G7 are properly evidenced. Mixed engines remain a later production concern; MF-12B specifically scaffolds **multiple original HyperFrames templates**.


## MF-12C / MF-12D · Voice as clock and offline render worker

After G2, original skills/voice-and-timing/SKILL.md governs recording/TTS, word-level timing, captions and audio cost approval. The local helper tools/studio-voice.mjs follows this original skill and records a selected voice path in audio/voice-plan.json. It accepts user-owned recordings or previously generated, licensed local/approved-paid audio; it never performs a paid call or invents word timestamps. With a local ASR model, the original tools/word_timings.py produces actual word times. Explicit segment fallback produces estimates requiring listening review. audio/scene-cues.json resolves spoken cues per direction scene.

Audio integration: node tools/studio-render.mjs <slug> --audio auto --quality draft. This requires G2/G3 approval and actual words/cues, and rejects speech longer than the video.

MF-12D uses the pinned original HyperFrames CLI installed locally in render-worker/, with Node 22, FFmpeg, FFprobe and Chromium. A staged scene copy keeps original source untouched, including bundled Three.js for globes. After rendering, tools/studio-render-review.mjs verifies dimensions/FPS/duration/frame count and generates actual frame stills plus a contact sheet. The results remain REVIEW EVIDENCE, not G5/G6/G7 approval. The Pages workflow never renders MP4. See render-worker/README.md and docs/STUDIO_VOICE_AND_TIMING.md.


## MF-12E · Original render-bound QA review

The original skills/qa-review/SKILL.md governs QA and its independent critic protocol. After a real local MP4, invoke tools/studio-qa-review.mjs; the local renderer does this by default. Review all real stills, contact sheets and phone-scale frames, resolve FAILs, then pass ONLY the images and a factual brief to a separate fresh-context critic. Record its external JSON response with studio-qa-critic.mjs. User observations are recorded with studio-qa-annotations.mjs and genuine references. The MP4 SHA-256 invalidates stale reports. READY requires a matching qa/report.json, completed checks and documented critic with no open FIX; original G5/G6/G7 approvals remain separate. See docs/STUDIO_QA_REVIEW.md.

# MotionForge Studio · Original production method

The Studio is a selection and project-library interface for original MotionForge, not a substitute video engine. Always begin with AGENTS.md and skills/motion-director/SKILL.md, then the selected STYLE.md and original scene source. Do not recreate the animated sample GIF with an approximate Canvas drawing.

## Original scene workflow

1. Select a style from skills/style-library/styles/<style>/STYLE.md and read all nine sections. Save a project copy under style/STYLE.md. Follow G4 for approval.
2. Inspect templates/<template>/index.html and templates/<template>/params.json. These files define native resolution, engine and editable parameters.
3. Create a scene using engines/hyperframes/scripts/new-scene.sh --template <template> --params <values.json>, which copies the original HTML, CSS, assets and local dependencies.
4. Write direction.json according to skills/motion-director/references/direction-json.md, with meaningful layout, entrance, hero and timing. When a voice exists, cue animation from audio/words.json.
5. Render actual storyboard stills and obtain G5 approval. The original preview.gif is NOT a substitute for newly rendered storyboard stills.
6. Lint and render using the selected original engine. Inspect contact sheets, audio and text, then complete independent critic review (G6 and G7).

Original HyperFrames templates use their native resolution, usually 1080×1920 (9:16). A request for 16:9 requires an explicitly designed 16:9 layout from the original source, rendered example frames, and G5 approval. Do not stretch the portrait animation or replace it with a generic Canvas animation. The native scaffold refuses mismatched formats.

## Start a source-preserving project

Install Studio dependencies from a local checkout:

    cd studio && npm install
    cd ..
    node studio/scripts/new-from-upstream.mjs --template kinetic-title --style route-journey --slug native-test --title "ROADTRIP" --duration 4 --format 9:16 --language nl --dry-run
    node studio/scripts/new-from-upstream.mjs --template kinetic-title --style route-journey --slug native-test --title "ROADTRIP" --duration 4 --format 9:16 --language nl

The script validates the original template contract, uses the upstream new-scene.sh and refuses to overwrite projects. It creates a five-line brief, copies the selected STYLE.md, preserves the template params, original scene code, direction.json and source provenance, then records the approval status in production.json.

For globe-arcs-3d supply real named cities with the --params filename. Example-city defaults cannot be used for a real client trip.

The output status is concept. An original scene scaffold is NOT a complete video.

## Original production gates

- G1 Brief: user confirms the one-sentence read-back
- G2 Script: approved hook, narration, scene table and claim list
- G3 Spend: explicit consent before any paid call; otherwise document why not applicable
- G4 Look: approved style or explicitly delegated agent choice
- G5 Storyboard: rendered stills approved per scene
- G6 QA: HyperFrames lint, textcheck/readcheck, contact sheets, audio and final render tests with no open FAIL
- G7 Critic: independent review of actual visual material; documented fixes

Record these statuses and evidence in videos/<slug>/production.json. A project marked ready must have all required evidence. The Studio build and quick QA enforce the approval record. Generated source checks never replace visual QA.

## Multiple original scenes

Instantiate each selected upstream scene separately with new-scene.sh and its own parameter values. Do not substitute a self-written scene when an original template was selected. Keep timeline windows contiguous and frame-accurate. Use FFmpeg or an approved Remotion compositor for final editing, retaining the source-engine scene files.

Only true procedural/hand-drawn styles should use engines/canvas. The four in-house Studio templates are explicitly separate from the original 16 HyperFrames templates.

## Deployment and limitations

GitHub Pages is a read-only interface. It cannot run ffmpeg or commit to GitHub. The Studio creates an exact ChatGPT production brief which a GitHub-connected coding agent then follows. A GitHub PR does not constitute an approved rendered MP4.

Original 3D scenes may need an additional browser preview bundle; use local HyperFrames/Chromium rendering to verify compatibility. Do not claim preview or MP4 success from a source-only check.

Check with:

    cd studio && npm run test:catalog && npm run test:upstream && npm run build
    cd .. && node tools/studio-qa.mjs <slug>
    node studio/scripts/validate-native-production.mjs <slug>

The existing Peak District roadtrip project predates this source-preserving workflow. The integration does not silently rework that project. A separate content and render revision is needed.

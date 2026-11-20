# MotionForge Studio · ChatGPT production workflow

This protocol extends MotionForge's existing motion-director instructions. Keep the original skills, engines, licensing requirements, QA, and G1–G7 gates. Every video belongs to exactly one source directory under videos/<slug>/.

## User request to published project

1. Read AGENTS.md, skills/motion-director/SKILL.md, docs/STUDIO_PROJECTS.md, and this document.
2. Choose a unique lowercase project slug. Revisions keep the existing slug and source folder.
3. Create or update project.json, brief.md, script.md, direction.json, brand.json, scenes/<id>/index.html, assets/cover.svg, and assets/CREDITS.md.
4. Ensure every scene supports deterministic seeking. Canvas uses window.render(t). HyperFrames uses window.__timelines. Choose Remotion only for templates supported by the Studio browser renderer.
5. Keep project.json schemaVersion=1, duration/fps/format consistent and source paths relative to the project folder.
6. Verify creative approvals and explicit consent for any paid call. Never commit secrets or credentials. Record image, music, font and footage usage rights.
7. If a local runner exists, validate using cd studio && npm install && npm run build. Otherwise perform source/manifest checks and report which runtime tests were not possible.
8. Commit all authored source files to a dedicated GitHub branch and open a PR to main. If the user specifically asks to merge, inspect the diff and merge.
9. Merging to main triggers the GitHub Pages site build and regenerates the project index. Confirm deployment status before claiming publication.
10. Future revisions edit the same source project rather than creating a duplicate entry. Record decisions in brief.md.

## Suggested local command

node studio/scripts/new-project.mjs --slug amsterdam-book-trailer --title "AMSTERDAM THE CITY GUIDE" --duration 12 --format 16:9 --language nl

The scaffold is a starter only. ChatGPT must still write the actual script, scenes, and creative content.

## Standard project structure

videos/<slug>/
  project.json
  brief.md
  script.md
  direction.json
  brand.json
  scenes/intro/index.html
  assets/cover.svg
  assets/CREDITS.md
  qa/
  renders/  (ignored in Git)

## Publication and editing rules

- GitHub is the source of truth, GitHub Pages is a read-only viewer.
- Do not commit rendered video binaries. Browser rendering and local workers are separate from Pages site deployment.
- Do not reimplement upstream MotionForge engines or bypass QA/approval gates.
- Store original media in projects only if the user has the appropriate permissions, and credit source/licence.
- A ChatGPT agent may create/edit project files using its connected GitHub app; the public Pages site cannot write to GitHub without a separate authenticated backend.
- Project index is generated in studio/public/projects and is not committed.
- For project-specific edits, rerun scene QA and the static build, not a full repository render.

## Prompt examples

"Maak LONDON ON FOOT als 15 seconden boektrailer in Equilibriumpress/motionforge, 16:9. Maak één project en een PR."
"Wijzig scène twee van london-on-foot-demo, houd dezelfde slug, werk het manifest bij, maak een PR zonder te mergen."
"Maak een originele Remotion titelvideo als Studio-project dat geschikt is voor browser-MP4-export."


## MF-08: templates and quick QA

When creating a book trailer, walking route, data story or app preview, use the corresponding built-in template rather than inventing a new HTML scene. Run the local generator with --template, --slug and --title or create the equivalent source files via the GitHub connector. Do not copy false geographic facts, figures or screenshots from demo scenes.

The generated three-scene storyboard is an editable starter, not completed editorial content. Replace placeholder titles, sample data and mock UI with approved content. For real route animations use verified GPX/GeoJSON and a documented, properly projected map.

Before opening a PR, run node tools/studio-qa.mjs <slug>. A full media review is still required before a project is marked ready. QA must flag missing files, overlaps, frame timing problems, non-deterministic code and incomplete credits.

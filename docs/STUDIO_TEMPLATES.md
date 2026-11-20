# MotionForge Studio · Reusable video templates

Templates live in studio/project-templates/. They are editable Canvas projects with deterministic seekable scenes, a vector cover and normal MotionForge project metadata.

Available:
- book-trailer: editorial title, conceptual book mockup and outro.
- walking-route: schematic line animation with location pins. NOT a real geographic map.
- data-story: sample bar data only. Replace values and add sources before publication.
- app-preview: generic concept phone UI. Replace with genuine app images before publishing.

Create one project without overwriting existing projects:

    node studio/scripts/new-from-template.mjs --template book-trailer --slug my-book --title "MY BOOK" --duration 18 --format 16:9
    node studio/scripts/new-from-template.mjs --template walking-route --slug route-demo --title "WALKING ROUTE"
    node studio/scripts/new-from-template.mjs --template data-story --slug concept-stats --title "INFOGRAPHIC"
    node studio/scripts/new-from-template.mjs --template app-preview --slug my-app-preview --title "MOBILE APP"

Optional: --subtitle "SHORT LINE", --language nl, --fps 30, --format 9:16, and --duration 15.

Each generated project has project.json, brief.md, script.md, direction.json, brand.json, a credits file, a cover SVG and intro/feature/outro HTML scenes. The template data live in studio/project-templates/library.mjs, and the generic seekable Canvas drawing code lives in scene.html.

The Studio UI lists all four templates with a copyable ChatGPT prompt. GitHub Pages is read-only: use ChatGPT with a GitHub connection or a local checkout to author and commit a project. No background jobs or video rendering are started by the UI.

Sample projects:
- videos/london-on-foot-demo: original opening preserved, plus book preview and outro.
- videos/studio-data-story-demo: three-scene infographic with sample-only values.

Do not label example route maps as real locations, demo chart values as verified statistics, or concept app UI as an actual screenshot. Add permitted images, music and credits to each project after review.

Quality control:

    node tools/studio-qa.mjs --all
    node tools/studio-qa.mjs london-on-foot-demo --json
    node tools/studio-qa.mjs studio-data-story-demo --write-report
    cd studio && npm run test:studio

The quick QA checks manifest structure, timings, required files, deterministic scene markers and credits. It does NOT inspect rendered frames or prove an MP4 is correct. Full contact-sheet and audio checks are still needed before release.

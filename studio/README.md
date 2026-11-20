# MotionForge Studio

A lightweight React/Vite project studio for the existing MotionForge toolkit. MotionForge's HyperFrames, Canvas, Remotion, skills, and templates stay unchanged.

## Develop locally

Requires Node.js 20.19+ (Node 22 recommended).

~~~bash
cd studio
npm install
npm run dev
~~~

The npm predev and prebuild hooks automatically scan videos/ projects and generate a static project registry.

~~~bash
npm run build
npm run preview
~~~

Vite uses the GitHub Pages base path /motionforge/ for production and / for local development.

## Publish to GitHub Pages

1. Repository Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Merge MF-01 and MF-02 in order to main.
3. The Deploy MotionForge Studio workflow builds the static site on studio/, videos/, or workflow changes.
4. Open https://equilibriumpress.github.io/motionforge/.

Only site builds run in Actions. Video rendering is intentionally outside the workflow.

## Add a project

Create videos/<slug>/project.json. Follow the contract in docs/STUDIO_PROJECTS.md. Commit the project and required cover/scene assets to the repository. The next site build indexes it, shows the metadata and copies its cover image. Future MF-04 adds live scene preview.

The source project structure follows skills/motion-director/SKILL.md; this avoids duplicating MotionForge projects in a new folder.

## Roadmap

- MF-01: studio shell and Pages deployment.
- MF-02: validated project contract, generated static index and example project.
- MF-03: search, tags and project detail.
- MF-04: live preview and timeline.
- MF-05+: ChatGPT workflow, rendering and export.


## Interactive preview (MF-04)
Open a project detail in the library to see the scene player. Canvas and HyperFrames HTML scenes are copied into the Pages output with an isolated postMessage bridge. Scrub the timeline or play the sample scene. This does not create an MP4; exporting follows in MF-06.

## ChatGPT project workflow (MF-05)

Read docs/STUDIO_WORKFLOW.md. To create a local starter: node studio/scripts/new-project.mjs --slug my-video --title "My video" --duration 8 --format 16:9. This does not replace writing the finished scene content. GitHub remains the project storage, and Pages remains a read-only viewer.


## Browser MP4 export (MF-06)

Supported Remotion title-card-v1 projects get a Remotion Player and a browser MP4 export button. See videos/studio-mp4-demo for an example. Browser compatibility is checked before rendering. Output uses H.264 MP4 and no audio. Canvas / HyperFrames remain preview-only in this production round. Remotion dependencies are pinned at 4.0.545. Consult https://www.remotion.dev/license before commercial usage.


## MF-07: Local Canvas/HyperFrames MP4 workflow

Run these commands from a checked-out MotionForge repository using Node.js 22+, FFmpeg and a Chromium/Playwright installation as needed:

    node tools/studio-render.mjs london-on-foot-demo --dry-run
    node tools/studio-render.mjs london-on-foot-demo --quality draft
    node tools/studio-render.mjs london-on-foot-demo --quality final --formats 9:16,1:1 --overwrite

The renderer handles Canvas through engines/canvas/render.mjs, and HyperFrames through pinned npx hyperframes@0.8.92. Each scene is normalized to the project's fps and aspect ratio, gaps are filled, and overlapping scenes are rejected. It concatenates the segments using FFmpeg.

Optional soundtrack: --audio audio/voice.wav (must be an owned local file). If audio/subtitles.srt exists, it is copied alongside the MP4. A copy of the original cover is saved. Output stays in videos/<slug>/renders/ and is ignored by Git.

The optional --formats flag uses the existing tools/export.mjs with blurred fill. The extra proportions are quick conversions, not redesigned compositions.

The GitHub Pages app displays a render command for Canvas/HyperFrames. It cannot run arbitrary HyperFrames HTML through FFmpeg inside the browser. Remotion template projects retain the browser renderer. Rendering does not run in GitHub Actions.

Full 3D scenes, module imports, audio synchronization, cross-scene effects, layout overflow and visual quality still require a production preview and final QA review.

## MF-08 · Video templates and QA

Four reusable video templates can be created with npm run new:template -- --template book-trailer --slug my-book --title "MY BOOK". See docs/STUDIO_TEMPLATES.md. Use npm run qa:projects for fast structural checks and npm run test:studio for the built-in template and manifest tests. Source projects remain in videos/ and are rendered locally, not on GitHub Actions.

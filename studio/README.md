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

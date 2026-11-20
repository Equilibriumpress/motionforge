# MotionForge Studio

A lightweight React/Vite project studio for the existing MotionForge toolkit. This web app does not replace HyperFrames, Canvas, Remotion, or the skills in the repository.

## Develop locally

Requires Node.js 20.19+ (Node 22 recommended).

~~~bash
cd studio
npm install
npm run dev
~~~

Visit the URL printed by Vite. For production:

~~~bash
npm run build
npm run preview
~~~

Vite uses the project-pages base path \`/motionforge/\` for production builds and \`/\` for local development.

## Publish to GitHub Pages

1. Repository Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Merge this branch to \`main\` (the Pages workflow runs for changes to \`studio/\`, \`videos/\`, or its own workflow file).
3. Wait for the \`Deploy MotionForge Studio\` workflow to complete.
4. Open https://equilibriumpress.github.io/motionforge/.

The build and deployment use GitHub Actions, but no video renders run in Actions. Videos will be rendered separately in later product rounds.

## Roadmap

- MF-01: Studio shell and Pages deployment.
- MF-02: GitHub project contract and generated project index.
- MF-03: Project cards, search and filters.
- MF-04: Live preview and timeline.
- MF-05+: ChatGPT production protocol and exports.

Keep projects under \`videos/<slug>/\` according to \`skills/motion-director/SKILL.md\`.

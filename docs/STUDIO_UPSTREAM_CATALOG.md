# MotionForge Studio: original styles and animated templates

The original MotionForge Markdown files are the catalogue source of truth. The Studio does not duplicate the specifications or executable scene code.

## Included libraries

- 100 animation styles in 20 categories, parsed from skills/style-library/styles/README.md.
- 16 original animated scene templates, parsed from templates/README.md.
- Four Studio-owned Canvas formats in studio/project-templates/library.mjs.

Each original item has a title, category, description, animated GIF and GitHub source link. GIFs load lazily from raw.githubusercontent.com. When a GIF is missing, the interface shows a fallback with a link to the source.

## Creating a video

1. Open Stijlen & scènes in the Studio.
2. Choose a style, then one to six original scenes, or one Studio-owned format.
3. Specify subject, duration and aspect ratio.
4. Copy the generated prompt into ChatGPT with GitHub connected.
5. The agent reads the selected style specification and source scenes, builds one project under videos/<slug>/, runs QA and creates a PR.

The public GitHub Pages site is read-only. It does not send ChatGPT messages, commit to GitHub or render arbitrary HTML into an MP4. The user pastes the prompt into their ChatGPT conversation.

## Rebuilding the catalogue

Run from a local clone:

    cd studio
    node scripts/build-motion-catalog.mjs
    npm run test:catalog
    npm run build

The generator writes studio/public/catalog/index.json, which is ignored by Git. GitHub Pages is rebuilt if studio, templates or the original style catalogue change.

Updates from upstream only appear after the relevant files have been synchronized into the fork and Pages has deployed the updated catalogue.

## Scope

The 100 styles are design specifications, not video compositions. Original scenes can have additional dependencies such as GSAP, three.js, fonts, timing data and media.

A final project must be rendered using the appropriate MotionForge engine. Current browser MP4 support remains limited to recognized Remotion compositions, while arbitrary Canvas/HyperFrames use a local renderer.

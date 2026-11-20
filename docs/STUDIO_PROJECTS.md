# MotionForge Studio project contract (v1)

Every Studio project is a directory under videos/<slug>/ using MotionForge's existing motion-director project structure. The browser library reads a generated JSON registry, not the GitHub API. This keeps the public GitHub Pages site static and avoids tokens, secrets and a backend.

## Minimal layout

~~~text
videos/my-video/
  project.json          Studio contract (required)
  brief.md              MotionForge brief
  script.md             Optional approved script
  direction.json        MotionForge scene direction
  brand.json            Brand tokens
  scenes/intro/index.html
  assets/cover.svg
  qa/                   Optional quality-control outputs
  renders/              Local exports: ignored by Git
~~~

## project.json

~~~json
{
  "schemaVersion": 1,
  "id": "my-video",
  "title": "My video",
  "description": "Short description for the library.",
  "status": "draft",
  "language": "en",
  "format": "16:9",
  "engine": "canvas",
  "durationSeconds": 8,
  "fps": 30,
  "cover": "assets/cover.svg",
  "tags": ["travel", "book-trailer"],
  "scenes": [
    {
      "id": "intro",
      "title": "Opening",
      "startSeconds": 0,
      "durationSeconds": 8,
      "engine": "canvas",
      "source": "scenes/intro/index.html"
    }
  ]
}
~~~

Validation rules:
- schemaVersion must be 1; id must equal its folder name using lowercase slugs.
- status: concept, draft, review or ready.
- engine and scene engine: hyperframes, remotion or canvas.
- format: 9:16, 16:9, 1:1 or 4:5.
- fps: integer from 12 to 120; durationSeconds: positive number.
- Scene IDs are unique. Each scene fits inside project duration.
- Source scene paths are local scenes/ HTML files present in the project.
- Cover is an optional local assets/ SVG, JPEG, PNG, WebP or AVIF file, up to 5 MB.
- tags is a string array. All validation runs at build time; an invalid project fails the build.

## How the static registry works

The script studio/scripts/build-project-index.mjs scans videos/<slug>/project.json and generates studio/public/projects/index.json, project-specific public manifests and cover images. The generated folder is git-ignored. Vite includes it in the site's dist/ output.

The browser fetches projects/index.json under its Vite base URL. No personal token and no live GitHub API calls are needed. MF-04 will add safe publication of previewable scenes.

## Scope limits for MF-02

The library lists metadata and a cover. It does not execute scene code or render MP4. Those features belong to MF-04 and MF-06/07. Add project source data only to the repository: do not embed paid API keys or personal credentials in manifests or HTML.


## Browser previews (MF-04)
After indexing, the studio copies supported Canvas and HyperFrames scene folders and approved assets into its generated static public/projects tree. The original videos/ sources are unchanged. A small seek bridge is injected in each generated HTML scene. The parent controls it with postMessage inside a sandboxed iframe without allow-same-origin.

Canvas uses window.render(t), HyperFrames uses window.__timelines[id].seek(t). The studio offers play/pause, scrubbing, project-time scene switching, a seconds readout and responsive aspect ratios.

Only selected file extensions are published. No symlinks, no files above 12 MB, and no more than 48 MB of preview assets per project. The builder supplies missing HyperFrames base.css, mf-runtime.js, and npm GSAP when available. Audio mix, Remotion, some 3D module scenes, and MP4 export are excluded from this initial preview.


## MF-06 · Browser MP4 export (limited Remotion templates)

For projects using the Remotion engine, define a browserRender block. This studio release supports only an explicit safe template identifier, title-card-v1, with short text and hex colors:

~~~json
{
  "engine": "remotion",
  "browserRender": {
    "template": "title-card-v1",
    "title": "MOTIONFORGE STUDIO",
    "subtitle": "VAN PROJECT NAAR MP4",
    "background": "#0d1822",
    "accent": "#a9f0ad"
  }
}
~~~

The other normal schema-v1 fields, scenes and cover remain mandatory. The project stores editable data. The rendering component code is a reviewed template in studio/src/renderer/TitleSequence.jsx. Arbitrary project JavaScript is never evaluated in the Studio application origin.

The Remotion Player previews supported template projects. RenderMp4 checks H.264 support with canRenderMediaOnWeb before enabling the button, calls renderMediaOnWeb with an AbortSignal and progress callback, then downloads the resulting MP4. Video is intentionally muted: no audio mix in MF-06. Browser support requires WebCodecs, sufficient local resources and the applicable Remotion licence. Browser errors are shown explicitly.

Canvas and HyperFrames projects remain seekable in the existing scene player. They are NOT automatically compatible with Remotion browser export. Their MP4 export remains planned for MF-07. There is no server renderer and no video-render step in GitHub Actions.

# G5–G7 render-preflight · 20 november 2026

Status: SOURCE PREFLIGHT ONLY, no rendered video.

## Bevestigd
- Project heeft vijf originele MotionForge HyperFrames-afgeleide HTML-bronnen; tijdvakken 0–4, 4–10, 10–19, 19–25, 25–30 seconden bij 30 fps.
- De originele stijlgids staat in `style/STYLE.md`.
- Node v22.16.0, FFmpeg 7.1.5 en Chromium zijn beschikbaar in de uitvoeromgeving.
- Deze uitvoeromgeving heeft geen lokale checkout van `Equilibriumpress/motionforge`; `git ls-remote` faalt op DNS voor github.com.
- De lokale HyperFrames 0.8.92 CLI, GSAP, Three.js en Rubik-binaries zijn niet aanwezig.
- Voorgaande sourceversie had 15 registratie-/formaatvelden die strijdig waren met `studio/scripts/validate-native-production.mjs`; deze commit corrigeert die JSON-registratie, zonder visuele goedkeuring te suggereren.

## G5
PENDING. Er zijn **geen** echte afbeeldingen gemaakt met de oorspronkelijke GSAP/Three.js-bron en een seekbare HyperFrames-render. De gebruiker heeft G1/G2 goedgekeurd, niet de niet-bestaande storyboardstills.

## G6
PENDING. Er bestaat geen lokaal gerenderde MP4; `npx hyperframes lint`, textcheck, readcheck, videoframecontrole, audioanalyse, originele qa-review en onafhankelijke tweede render zijn niet uitgevoerd.

## G7
PENDING. Er is geen onafhankelijke critic uit een verse context. Zo'n beoordeling vereist echte renderframes, eerst G5 en G6.

## Werkelijk benodigde opdrachten op een werkstation met repo-clone en package-toegang
```bash
cd studio && npm install --no-audit --no-fund && cd ..
cd render-worker && npm install --no-audit --no-fund && cd ..
node tools/studio-render-doctor.mjs --three
node studio/scripts/validate-native-production.mjs peak-district-weekend-kit-unboxing
node tools/studio-render.mjs peak-district-weekend-kit-unboxing --dry-run
node tools/studio-render.mjs peak-district-weekend-kit-unboxing --quality draft
```

Voor daadwerkelijk renderen moeten de scripts in `engines/hyperframes/scripts/new-scene.sh` of de oorspronkelijke Studio-scaffolder eerst de ontbrekende per-scène runtimebestanden en fonts bundelen. Controleer in de schone staging expliciet of `assets/vendor/gsap.min.js`, `assets/vendor/three.module.min.js`, `assets/vendor/mf-three.js` en Rubik-bestanden aanwezig zijn. Start géén vervangende Canvas-engine.

Na echte storyboardstills: toon alle vijf scènes aan de gebruiker, leg goedkeuring vast in `production.json`. Pas daarna volledige qa-review en onafhankelijke critic uitvoeren. Zonder die bewijzen geen status `ready`, geen G5/G6/G7 pass en geen claim over een afgewerkte MP4.

Geen betaalde externe media en geen GitHub Actions-video-render gebruikt.

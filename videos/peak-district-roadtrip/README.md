# PEAK DISTRICT · ROADTRIP

30 seconden / Nederlands / 1920×1080 / 30 fps / 4 originele HyperFrames-scènes.

Herzien volgens het oorspronkelijke MotionForge-protocol:
- 0–8s: `globe-arcs-3d` (Three.js + GSAP)
- 8–18s: `checklist-reveal` (GSAP + kaart met echte coördinaten)
- 18–25s: `kinetic-title` (GSAP)
- 25–30s: `kinetic-title` (GSAP)

Alle scènes zijn landschapsaanpassingen van oorspronkelijke MotionForge-broncode, niet generiek vervangen door Canvas.

## Productie

Lees `style/STYLE.md`, `direction.json`, `script.md`, `production.json` en `qa/QA.md`. De originele templates blijven te vinden onder `templates/`; de projectwaarden staan in `scenes/<id>/params.values.json` of `params-values.json`.

Voor de lokale Studio-build:

    cd studio && npm install && npm run test:upstream && npm run build
    cd ..
    node tools/studio-qa.mjs peak-district-roadtrip
    node studio/scripts/validate-native-production.mjs peak-district-roadtrip

Op een computer met HyperFrames, Chromium/WebGL en FFmpeg volgt de daadwerkelijke video-render. Bekijk de contact sheet en raadpleeg `skills/qa-review/SKILL.md`. Het dossier en de scènes blijven draft tot de goedkeuringsstappen zijn uitgevoerd.

Geen actuele OSM-wegen, echte routeberekening of externe beelden opgenomen; verbindingen zijn schematisch en dus geen routeadvies.

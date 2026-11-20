# QA · MF-11 / Peak District Roadtrip

## Structurele controles
- [x] Zelfde projectslug, vier scènes, totaal 30 seconden, 1920×1080 / 30 fps / Nederlands
- [x] Originele template-source `globe-arcs-3d`, `checklist-reveal` en `kinetic-title` gebruikt
- [x] Originele parameterschemas en projectspecifieke parameters voor elke scène
- [x] Kaart bevat alleen geografische punten en een schematische verbinding
- [x] Geen nepautoroute, verzonnen reistijd, betaalde calls, muziek of stockvideo
- [x] Projectstatus `draft` met expliciete G1–G7-toestemmingsregistratie

## Nog nodig vóór publicatie als definitieve video
- [ ] Node.js-installatie, Vite-build en originele HyperFrames-lints
- [ ] Vrij gelicentieerde Outfit- en Overpass Mono-fonts daadwerkelijk geladen in preview en lokale export
- [ ] 3D-WebGL globe daadwerkelijk afspelen en beoordelen in de Studio
- [ ] Stilbeelden op 0, 4, 8, 13, 18, 22, 25 en 29,9 seconden controleren
- [ ] Kaartlabels, leestijd, overgangen en typografische veilige marges controleren
- [ ] MP4 render met framecontrole en ffprobe (30 seconden, H.264)
- [ ] Goedkeuring van script en nieuwe storyboardbeelden (G2/G5)
- [ ] Onafhankelijke kwaliteitscontrole op werkelijk gerenderde frames (G7)

De oorspronkelijke MotionForge-workflow laat geen `ready` toe zonder deze bewijsstukken.

## Praktijkcontrole MF-12E (broncode, 20 november 2026)

- De oorspronkelijke vier scènes blijven ongewijzigd en het project telt 900 frames (30 s op 30 fps).
- De huidige oorspronkelijke-productievalidator vereist per scène een vastgelegde omzetting van het originele 9:16-template naar het 16:9-project. Deze registratie is toegevoegd met status `draft`, zonder goedkeuring of renderbewijs te suggereren.
- De werkelijke WebGL/HyperFrames-uitvoer, storyboardstills en onafhankelijke critic zijn nog niet gevalideerd. De repository bevat geen MP4- of `qa/report.json`-eindbewijs voor Peak District.
- De G1–G7-statussen blijven intact en `project.status` blijft `draft`.

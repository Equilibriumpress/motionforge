# PEAK DISTRICT · THE WEEKEND KIT

Origineel MotionForge Unboxing Pop-productiedossier. 30s, Nederlands, 16:9 (1920×1080, 30fps), fictief productconcept.

## Huidige fase
G1 en G2 zijn uitgewerkt maar nog niet goedgekeurd. Geen betaalde diensten, geen gegeneerde media, geen fysieke doos en geen gerenderde video. De geselecteerde originele stijl is exact gekopieerd naar `style/STYLE.md`.

## Inhoud
- `brief.md`: precies vijf briefingregels
- `script.md`: drie hooks, script, shotlist en claims
- `direction.json`: voorlopige kaders, bewegingen en on-screen teksten
- `video-plan.json`: **conceptvoorstel**, niet uitvoerbaar als originele scaffold zonder per-scène 16:9-bronbestanden
- `production.json`: expliciete G1–G7- en bronstatus
- `qa/template-audit.md`: kandidaattemplates, GIF-previews, native formats en kloof in doosanimatie

## Volgende fase (alleen na expliciete goedkeuring)
1. Gerichte 1920×1080-bronafgeleiden schrijven vanuit originele `templates/<id>/index.html`.
2. `video-plan.json` omzetten naar het exacte originele CLI-plan met per scène `adaptation.source` naar de werkelijke aangepaste bronbestanden.
3. Met Node, echte dependencies en de originele `new-from-upstream.mjs --plan` de native scènes aanmaken. Geen GitHub Actions-videorender.
4. Werkelijke frames renderen, G5-goedkeuring vragen; vervolgens G6/G7 en master-MP4.
5. Na later toegestane merge de Studio op Pages bekijken en waar ondersteund lokaal browser-MP4 exporteren.

Studio: https://equilibriumpress.github.io/motionforge/

## Rechten
Alles is een concept en wordt niet als bestaand product aangeboden. Geen externe beelden, audio of fonts meegecommit.

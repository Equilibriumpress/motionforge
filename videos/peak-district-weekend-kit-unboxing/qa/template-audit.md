# Origineel template-audit · G1/G2
Basiscommit: `82fb907e8a47b01db704008f2591c533a4d120e3`

| Template | Originele preview | Native | Toepassing en risico |
|---|---|---|---|
| kinetic-title | [preview](https://github.com/Equilibriumpress/motionforge/blob/main/templates/kinetic-title/preview.gif) | 1080×1920 | Hook en eindscherm; originele woordopbouw behouden, bronlayout ombouwen naar Rubik en 16:9 |
| product-turntable-3d | [preview](https://github.com/Equilibriumpress/motionforge/blob/main/templates/product-turntable-3d/preview.gif) | 1080×1920 | Basis voor 3D-doos en item-ontdekkingen; originele speaker en sokkel zijn GEEN unboxing. 3D-kleppen, top-down camera, producten en stickers vereisen nieuwe source-native Three.js/GSAP-logica |
| checklist-reveal | [preview](https://github.com/Equilibriumpress/motionforge/blob/main/templates/checklist-reveal/preview.gif) | 1080×1920 | Vier namen naast flatlay; checklistanimatie behouden, layout aanpassen aan 16:9 en echte 3D-scènebeelden |
| cover-still | [preview](https://github.com/Equilibriumpress/motionforge/blob/main/templates/cover-still/preview.gif) | 1080×1920 | Optionele afzonderlijke thumbnail, geen videoscène en geen duurparameter. Origineel 9:16-cropcontract vervangen door echt 16:9 ontwerp na goedkeuring |

Alle vier originele `index.html` en `params.json` zijn geraadpleegd. De voorbeelddoos is geen standaard-MotionForge-asset. De originele 3D-template bevat een 3D-speaker en geen flapanimatie. Die beweging mag uitsluitend als gerichte uitbreiding op de echte Three.js-scène worden gebouwd, met `hf-seek`, GSAP, oorspronkelijke params en bronvermelding behouden.

## Stijlvereisten
- Kraft `#CDA77C`, sticker `#FFFDF7`, inkt `#1E1A16`, roze `#FF3E8A`, geel `#FFD23F`, schaduw `#8A6F52`.
- Rubik 900 titel op stickers, 700 korte naamstickers, 600 captions, 500 itemtellingen.
- Flap rotatie 0→−170° in 0,35s met 0,08s stagger; item-rise 220 px met overshoot en squash; sticker-slap scale 1.6→1 in 0,22s.
- Top-down, vaste camera, doos links, informatie rechts, geen productafdekking. Roze maximaal twee stickers/frame, geel alleen cijfers.
- Stijlvoorbeeld is beschrijving, geen bewijs dat de broncode deze beweging al ondersteunt.

## Uitvoering
- Volledige originele Agent/Director, script, voice, style, brand, qa en workflowbestanden geraadpleegd.
- Vooruitlopend op user approvals uitsluitend documenten, broninventaris en stijl-kopie opgenomen.
- Niet uitgevoerd: `new-scene.sh`, `new-from-upstream.mjs --plan`, `motion-director-workflow.mjs --project`, `hyperframes lint`, `textcheck`, `readcheck`, Three.js-browserframes, screenshot, audio, echte MP4, onafhankelijke critic.
- De officiële `new-from-upstream.mjs` weigert de originele 9:16-scène voor 16:9 totdat een werkelijk 1920×1080-bronaanpassing bestaat. Geen onjuiste bypass toepassen.

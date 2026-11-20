# Unboxing Pop in MotionForge Studio op GitHub Pages

Dit project gebruikt de bestaande PreviewPlayer en BrowserOriginalExport. De originele HyperFrames/GSAP/Three.js-scènes worden door de GitHub Pages-build gepubliceerd. De desktopbrowser biedt daarna **Render MP4 in Pages** met lokale tab-capture, H.264 WebCodecs en Mediabunny.

Directe projectlink na publicatie:
https://equilibriumpress.github.io/motionforge/?project=peak-district-weekend-kit-unboxing

De Pages-build bundelt de originele, door de gebruiker samengestelde Three.js-module als compatibel script voor de sandboxed iframe. Dit is alleen een Pages-kopie. De bronbestanden in videos/ veranderen niet. Geen Canvas-vervanging en geen externe rendermotor.

De build kopieert de oorspronkelijke GSAP-runtime, HyperFrames-runtime en licentiegeschikte Rubik-lettertypen (500, 600, 700 en 900, latin en latin-ext) vanuit de geïnstalleerde npm-pakketten naar de statische publicatie. Er worden geen fontbestanden aan GitHub toegevoegd.

## Werkwijze
1. Open de projectlink in Chrome of Edge op desktop na een geslaagde Pages-deploy.
2. Bekijk de vijf scènes en controleer vooral het openen van de doos op 4–10 seconden en de vier productonthullingen op 10–19 seconden.
3. Selecteer een proefrender of definitief formaat, druk op Render MP4 in Pages en geef toestemming voor **Dit tabblad**.
4. Download en beoordeel de MP4, cover, contact sheet en browser-QA.
5. G5, G6 en G7 vereisen daarna apart echte storyboardgoedkeuring, video-QA en een onafhankelijke reviewer. Browserrender betekent niet automatisch READY.

## Lokale ontwikkelcontrole
```
cd studio
npm install --no-audit --no-fund
npm run test:browser-original
npm run build
```

Een werkelijke browserrender is nog niet uitgevoerd bij deze wijziging. Safari op iPad ondersteunt de benodigde tab-capture/encoder mogelijk niet; gebruik waar mogelijk Chrome/Edge op desktop.

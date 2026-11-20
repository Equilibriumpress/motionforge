# MF-12F · Originele MotionForge-video's renderen via GitHub Pages

De bestaande workflow blijft:

ChatGPT Motion Director → originele skills → originele HyperFrames-scènes op GitHub → Studio op Pages → preview → lokale browser-MP4.

Er wordt geen afzonderlijke AI-agent gebouwd en geen video gerenderd in GitHub Actions. GitHub Pages is statisch, maar moderne browsers hebben de Media Capture API en WebCodecs voor lokale MP4-export.

## Bediening

1. Open PEAK DISTRICT · ROADTRIP of een ander project met uitsluitend originele, seekbare HyperFrames-scènes.
2. Bekijk de huidige scèneplayer en scrub de tijdlijn.
3. Kies proef (halve resolutie, voor 16:9 960×540) of definitief (native 1920×1080).
4. Kies desgewenst een lokaal opgenomen/mixed audiobestand en een bestaand SRT-bestand.
5. Klik Render MP4 in Pages en kies bij de browsertoestemming Dit tabblad. Niet een ander tabblad, volledig scherm of venster.
6. De originele scène wordt tijdelijk schermvullend getoond. De browser legt de DOM- en WebGL-beelden vast na een bevestigde scene seek. Druk op Esc om te annuleren. De voortgang staat in de browsertitel.
7. Bekijk de opgenomen MP4 rechtstreeks in de Studio en download afzonderlijk video, cover, contact sheet, JSON-rapport, posttekst en eventuele SRT.

## Implementatie

De bestaande hyperframes-scriptbron wordt niet vervangen. Een opaque sandboxed iframe kan niet rechtstreeks naar Canvas worden getekend. Daarom gebruikt de renderer een door de gebruiker goedgekeurde opname van het huidige tabblad. Die opname neemt de gecompositeerde HTML, GSAP en Three.js-beelden over. De bestaande MF_PREVIEW bridge bevestigt elke scene seek na twee paintcycli.

- studio/src/export/hyperframes-plan.mjs: bron-URL-validatie, native verhouding, aaneengesloten tijdlijn, exacte frames en storyboard-samples
- studio/src/preview/bridge.js: requestId en paint-acknowledgement voor ieder bronframe
- studio/src/export/render-original-mp4.mjs: getDisplayMedia, eigen-tab-kalibratie, scene-source, cropped capture, canvas encode via WebCodecs en Mediabunny
- studio/src/renderer/BrowserOriginalExport.jsx: browserchecks, formaatkeuze, audio/SRT import, opname, playback en download
- studio/src/renderer/LocalExportPanel.jsx: de bestaande lokale Node/Chromium/FFmpeg-render blijft als fallback
- mediabunny 1.66.1: vaste browser encode/mux dependency (MPL 2.0)

## Beperkingen en eerlijkheid

- Browser-export heeft expliciete schermdeeltoestemming nodig. Chrome/Edge desktop zijn de beoogde testbrowsers. Mobiel Safari/iPad en iedere videoencoder op iedere resolutie zijn niet gegarandeerd.
- Een traag apparaat of screen-capture-compositor kan dezelfde browserafbeelding in opeenvolgende outputframes vastleggen. Frame-exacte scene seeks garanderen niet dat iedere schermopname een uniek visueel frame bevat. Controleer de MP4 zelf.
- Video's worden lokaal in de browser gerenderd en gedownload. Pages schrijft de MP4 niet automatisch terug naar GitHub.
- Een gekozen audiobestand wordt in de browser aan de MP4 toegevoegd en niet geüpload. De gebruiker levert zelf rechten en voice aan.
- SRT wordt als sidecar gedownload, niet in de video ingebrand. De export genereert geen voice-over, bronnen of claims.
- Browser-QA documenteert aangeleverde frames, scènes, formaat en status. Het vervangt geen oorspronkelijke FFprobe-, textcheck-, readcheck-, audio-, visuele of onafhankelijke controle. G5/G6/G7 blijven pending tot werkelijk geaccordeerd.
- De echte HyperFrames-browserexport moet op Pages in een geschikte browser getest worden. Een succesvolle merge of Vite-build is geen bewijs dat WebGL en tab capture functioneren.

## Acceptance test: PEAK DISTRICT

- 4 oorspronkelijke HyperFrames-scènes: globe, route, highlights, outro.
- 900 frames / 30 fps / 30 seconden / 16:9.
- Scene cuts exact op frames 240, 540 en 750, overeenkomend met 8s, 18s, 25s.
- Eén proef-MP4 op Chrome desktop met getDisplayMedia (Dit tabblad), daarna één definitieve MP4.
- Kijk echt naar globe-WebGL, routekaart, tekst, scene cuts, frame 0 en einde.
- Download MP4, cover, contact sheet en QA-bestand. Voer daarna de originele MF-12E-review uit.

## Ontwikkelaarstest

Vanuit een Node-checkout met npm-toegang:

    cd studio
    npm install --no-audit --no-fund
    npm run test:browser-original
    npm run build

Pages: https://equilibriumpress.github.io/motionforge/

Geen externe betaalde mediadienst of GitHub Actions-render is nodig. Browsercompatibiliteit en echte scenebeelden moeten wel op een apparaat worden geverifieerd.

## Volledig videokader: herstel kleine scène

Een originele HyperFrames-scène moet het volledige uitvoerkader vullen.
Een portret-template mag niet onbedoeld als een klein vak in een landschapsexport verschijnen.

1. Build-time: controleer originele data-width en data-height van de compositie tegen het projectformaat. STAGE_ASPECT blokkeert een foutieve publicatie.
2. Preview: de originele scène wordt opgeschaald naar het volledige iframekader. De brug rapporteert de gemeten afmetingen aan de Studio. Bij onjuiste vulling verschijnt een duidelijke foutmelding.
3. MP4: elke browserframe-sample wordt aan de brongeometrie getoetst. Minder dan 98,5% kaderdekking, een verkeerde beeldverhouding of foutieve centrering stopt de export.
4. Andere Canvas-previewprojecten blijven werken via hun eigen renderer.

Een klein 3D-object of één titel in een correct volledig gevuld beeld is een ontwerpkwestie die bij de visuele QA beoordeeld moet worden.
Dit herstel produceert niet zelfstandig een nieuwe MP4; de browserexport en oorspronkelijke QA blijven nodig.

Regressie: cd studio && npm run test:browser-original. De nieuwe stage-fill-test draait ook vóór iedere Pages-build.

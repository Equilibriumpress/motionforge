# MF-12E · Original MotionForge qa-review, end to end

The original skill remains authoritative: skills/qa-review/SKILL.md and skills/qa-review/references/critic.md. The Studio adds an evidence runner, not a replacement skill or a second AI agent. ChatGPT performs the workflow; the independent critic MUST be a different fresh context.

## Workflow after rendering

1. Read the FULL original qa-review skill and the source report. Finish G1–G5. Render a real MP4 using tools/studio-render.mjs. The local renderer now invokes MF-12E automatically unless --no-review is supplied (which prevents READY).
2. For a video already rendered, run from the repository root:

       node tools/studio-qa-review.mjs <slug>
       node tools/studio-qa-review.mjs <slug> --comparison /path/to/independent-second-render.mp4

   Add --skip-browser only for troubleshooting. In this case X1 and X3 remain pending, never pass.
3. Inspect actual qa/sheet.png, qa/phone.png, qa/contact-sheet.png, qa/board/ and qa/report.md. Fix findings, render again and repeat. Never mark a check passed from source code alone.
4. Supply a second independently rendered MP4 for T5 deterministic frame verification. The runner compares decoded frame hashes at representative scene times. Supplying the same filename is rejected.
5. Complete any original QA checks that require visual judgement, licensing research or human listening. The machine does not invent evidence.
6. Prepare an independent critic packet:

       node tools/studio-qa-critic.mjs prepare <slug>

   Open a **new** ChatGPT chat or other separate context. Provide only qa/critic-request.md, the real images and the limited brief. Never give the critic this build conversation, scripts, code or style.
7. After the independent reviewer returns its assessment in a local JSON file, record it:

       node tools/studio-qa-critic.mjs record <slug> /path/to/external-critic.json

   Any unresolved FIX blocks G7. A changed scene must be re-rendered with a new QA report. A rebutted FIX needs a written explanation and a real evidence file. Reviewer independence is self-attested and cannot be proven from the JSON alone.
8. Record real visual and human observations. Example, ONLY after actually viewing the image:

       node tools/studio-qa-annotations.mjs <slug> --id X7 --status pass --actor user --evidence qa/sheet.png --reason "I inspected the first frame and confirmed the approved hook." --confirmation "User approved frame zero in this conversation."

   Automated checks cannot be manually overwritten. Human H1–H3 require user feedback. Every annotation requires a real file and belongs to a single MP4 SHA-256.
9. Complete original G5/G6/G7 approvals with existing motion-director-workflow.mjs **after** obtaining genuine user signoff and review. The READY gate checks the current MP4 hash against the full QA report.

## Original checks and policy

The 31 original IDs appear in the report, in the original order.

| IDs | Requirement | Automatic status |
|---|---|---|
| T1–T2 | H.264, yuv420p, BT.709, faststart, optional AAC 48 kHz, frame count, duration and A/V alignment | PASS/FAIL from ffprobe and actual MP4 |
| T3 | black/frozen stretches | PASS or FAIL from FFmpeg; accepted artistic holds require written, render-hash-bound justification |
| T4 | >3 luminance swings per second | PASS/FAIL from FFmpeg signalstats |
| T5 | seek/render determinism | PENDING until a separate second render; comparison uses decoded frame hashes |
| X1/X3 | text clipping, overlap and reading duration | Original textcheck.mjs and readcheck.mjs in a staged local source copy; missing browser/engine is PENDING |
| X2/X4–X10 | size, contrast, glyphs, safe areas, cover crop, frame zero, ending, originality, media rights | PENDING until real visual/typographic/rights evidence is reviewed |
| P1 | word-synchronous key animation | PENDING until measured audio words and rendered cue frames are actually compared |
| P2–P3 | no cut in a word, speaking rate | Automatic when real words.json and voice exist |
| P4–P8 | dead time, hook fulfilled, sourced claims, banned phrases, language/register | PENDING for editorial verification |
| A1/A4 | loudness and true peak, start of narration | Automatic for a voiced video with measured words |
| A2/A3/A5 | voice/music parity, TTS/footage parity, phone listening | PENDING until real audio reviewed |
| H1–H3 | final phone watch, factual claim confirmation, pronunciations | PENDING until user confirmation |

For a fully silent MP4, voice-only IDs are WARN with an explicit not-applicable reason, never artificially PASS. All other WARNs require an accepted written reason. Human PENDING items must be disclosed at delivery.

## Evidence layout

- qa/report.json: structured statuses, original skill name and SHA-256 of the **exact** rendered master
- qa/report.md: readable T/X/P/A/H table with evidence and reasons
- qa/ffprobe.json, qa/black-freeze.log, qa/luminance.log, qa/loudness.log
- qa/sheet.png, qa/phone.png: actual time-stamped and phone-resolution image sheets
- qa/board/, qa/contact-sheet.png, qa/render-report.json: actual start/middle/end stills for every scene
- qa/determinism.json: repeat-render frame hashes when supplied
- qa/manual-annotations.json: real human/reviewer notes tied to the current render
- qa/critic-request.md and qa/critic-review.json: isolated critic handoff and external feedback

For intentional frozen/black sequences, create qa/accepted-holds.json:

    {"renderSha256":"<sha256 of CURRENT MP4>","events":[{"start":2.2,"reason":"Intentional black frame as a narrative pause, confirmed in storyboard."}]}

An unexplained black/frozen stretch is FAIL. An accepted exception becomes WARN with the written reason. Flash safety findings never silently pass.

## External critic-result JSON

This file MUST come from the independent fresh-context reviewer, not from the builder. Use the exact rendered storyboard paths in qa/render-report.json:

    {
      "freshContextConfirmed": true,
      "renderSha256": "<sha256>",
      "reviewer": "Fresh-context reviewer",
      "observation": {
        "topic": "A video about a local walking route.",
        "audience": "People planning a city walk.",
        "action": "Choose a walking route before leaving."
      },
      "firstFrame": {"status":"PASS","note":"The first frame states what the video offers."},
      "panels": [
        {"file":"qa/board/001-intro-start.png","status":"PASS","note":"The main title is readable."}
      ],
      "weakestScene": "Scene two",
      "weaknessReason": "Its small labels are hard to read on a phone.",
      "resolutions": []
    }

The example has only one panel. A real response must evaluate **every** actual storyboard image. A FIX needs a documented rebuttal with evidence, or a new render followed by fresh QA and criticism. A frame-zero FIX blocks completion.

## READY and revisions

The qa-review report is tied to the SHA-256 of one actual MP4. Any re-render changes the hash and invalidates evidence. The Studio's native-production validator refuses project status READY without the actual MP4, its matching QA report, completed nonhuman checks and independent critic with no open FIX. Recording notes never marks G5, G6 or G7 as passed automatically.

Source validation or a successful GitHub PR does not constitute visual, audio or independent QA. Workflows running on GitHub Pages only build the static site. They never render user videos. The complete QA pipeline runs locally or in the isolated render-worker environment.

## Testing

From a checkout with dependencies installed:

    cd studio
    npm run test:qa-original
    npm run build
    cd ..
    node tools/studio-render-doctor.mjs --three
    node tools/studio-qa-review.mjs <slug>

No paid APIs or model downloads are part of MF-12E.

# MF-12C · Original voice and timing in Studio

ChatGPT is the Motion Director. First follow skills/motion-director/SKILL.md, then the complete original skills/voice-and-timing/SKILL.md. The local helper tools/studio-voice.mjs is not a replacement TTS model or skill.

## Voice selection

- Silent: node tools/studio-voice.mjs --project <slug> --mode none. Creates a no-voice decision without inventing word timestamps.
- User recording: after G2 script approval, run node tools/studio-voice.mjs --project <slug> --mode recorded --input /local/voice.wav --script /local/exact-voice.txt --rights confirmed.
- Locally generated Kokoro/Piper: follow original model licensing, then import with --mode local-tts --model <model> --license /local/model-license.txt --input /local/voice.wav --script /local/exact-voice.txt --rights confirmed.
- Paid TTS plan: --mode paid-plan --script /local/exact-voice.txt --provider <provider> --voice <voice> --cost <number> --currency EUR --price-source <checked-source>. This is only a cost proposal. No API call is performed; G3 needs express user permission before a separate paid invocation.

The source text must match spoken words. Default --engine words requires local faster-whisper, an already downloaded model via --asr-model /local/model-directory, and original tools/word_timings.py. This avoids implicit model downloads. Optional --engine segments yields estimated word positions and requires listening review. A script/ASR mismatch stops rather than silently shifting motion.

Files under videos/<slug>/audio/:

    voice-plan.json      voice choice, timing quality, approval status
    voice.wav            mono 48 kHz recording
    tts.txt              exact spoken script
    words.json           original {w,s,e} word records
    segments.json        recognized segments
    captions.srt         subtitles
    scene-cues.json      time of actually spoken cue words per scene

Cues resolve from direction.json and voice timing. Missing words or cues outside scene windows fail. ChatGPT must connect the measured cues to the original GSAP/HyperFrames animations before G5.

This helper never marks G2/G3 as approved, produces placeholder voice, licenses music, or claims lip-sync QA. Original voice-and-timing plus qa-review retain final audio checks.

A local render can use node tools/studio-render.mjs <slug> --audio auto --quality draft. It requires G2 approved, G3 passed or not-applicable, plus actual words and cues. Spoken audio longer than video duration fails rather than being truncated.


## Paid voice delivery after approval

The first --mode paid-plan records the verified cost and leaves G3 awaiting user permission. When the user has approved G3 in production.json and the authorized TTS audio exists locally, ingest it with --mode paid-import --input /local/approved-voice.wav --script /local/exact-text.txt --rights confirmed --asr-model /local/faster-whisper-model. This imports an existing file; no paid service is invoked. The previous cost proposal is archived as audio/approved-paid-plan.json.

For local-tts, --model names the TTS voice model and --license references its license file; --asr-model identifies the separate local Whisper model used to measure word positions. If a local Whisper model is not available, --engine segments gives estimates and requires audible verification before precise motion cues are approved.

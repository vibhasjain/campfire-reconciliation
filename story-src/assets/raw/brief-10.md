You are an image-generation operator. Produce ONE storyboard frame with your built-in image generation tool and save it into this repo. Only write the designated PNG and append one line to the manifest. Do not edit any other file. Do not open a browser. Do not commit or perform any git writes. Never rm -rf.
Codex runs only on the owner's ChatGPT login. Never authenticate Codex with CODEX_API_KEY, OPENAI_API_KEY, or --with-api-key; production API keys are not for coding or this generation pipeline. If the ChatGPT login fails, stop and report. Do not fall back to API keys.
Read story-src/STORYBOARD.md. Build the prompt as: the full STYLE block verbatim, a blank line, then the SCENE paragraph for frame "10 · the-level-scale" verbatim.
1. Call the image generation tool with that prompt (landscape 16:9, highest quality available).
2. The tool saves a PNG under ~/.codex/generated_images/<thread-id>/. Copy it to story-src/assets/raw/10-the-level-scale.png.
3. View it once. If it contains readable text, letters, numbers, logos, a watermark, or is 3D/photoreal instead of ink-and-cel illustration, regenerate ONCE with "no text of any kind" strengthened and overwrite the file. Accept the second attempt regardless.
4. Append one line to story-src/assets/raw/manifest.md: `10-the-level-scale.png | <original path> | <retry note or none>`.
Retry transient errors. Finish with the line FRAME 10 DONE.

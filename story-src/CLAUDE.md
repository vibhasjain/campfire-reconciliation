# /story — Maya's close

A 12-frame illustrated opening for Vibhas's Campfire take-home presentation, before the bank-reconciliation prototypes. Intended URL: https://firecamp-recon.netlify.app/story/. Vite publishes `public/story/`; working sources live in `story-src/`. Work only inside those story folders. No git writes. Never `rm -rf`.

Maya Patel is the staff accountant at Arbor Analytics. It is business day 3 of the September close for Chase Operating ••4821: about 200 transactions already auto-matched, 14 unmatched, difference ($82,741.31). Daniel Kim is the controller waiting to sign off; Priya Shah is in AP; Ember is Campfire's AI agent. The arc follows the owner's voice notes: pleasure at having only fourteen left, control, checkable reasoning, shared context, freedom to change her mind, momentum, certainty, and release. The shut laptop is the final frame. No generic tagline after it.

## Files

| Path (from the repository root) | Purpose |
|---|---|
| `public/story/index.html` | One section per slide; sequential eyebrows; `#tot` matches the count. |
| `public/story/deck.css` | Original deck layout and motion, with Campfire colour values. Full-bleed cropped frames and variable-height captions. |
| `public/story/deck.js` | Original keyboard/hash/touch navigation; continuous phone scroll at ≤700px; dashed `GENERATING` placeholders for missing images. |
| `story-src/STORYBOARD.md` | Binding STYLE and one SCENE per frame, plus inference boundaries. |
| `public/story/assets/NN-slug.jpg` | Desktop frames, 1920×1080 JPEG. |
| `public/story/assets/m/NN-slug.jpg` | Phone variants, 960×540 JPEG, selected by `<picture>`. |
| `story-src/assets/raw/NN-slug.png` | Generated originals; preserve for future crops. |
| `story-src/assets/raw/brief-NN.md` | One ready-to-run image-operator brief per frame. |
| `story-src/assets/raw/compress.sh` | Original PNG → desktop/phone JPEG pipeline; ImageMagick, sips, or Pillow. |
| `story-src/assets/raw/manifest.md` | PNG filename, original generated-image path, retry note. |
| `public/story/og-image.jpg` | Future 1200×630 crop of frame 01; social preview asset. |

## Slide anatomy

```html
<section class="slide">
  <figure class="frame" data-label="NN-slug"><picture><source media="(max-width:700px)" srcset="assets/m/NN-slug.jpg"><img src="assets/NN-slug.jpg" alt="One-sentence description of the scene" loading="lazy" decoding="async"></picture></figure>
  <div class="copy">
    <p class="eyebrow">NN · Section</p>
    <h1>One picturable headline, ending with a period.</h1>
    <p>Short, direct, human copy in the owner's voice.</p>
  </div>
</section>
```

The first slide has `is-active` and loads eagerly, as in the original. Keep full-bleed frames, `object-fit: cover`, caption anatomy, motion, keyboard/hash/touch navigation, phone scroll mode, and `<picture>` sources. Never letterbox, inset frames, equalise caption heights, or push captions down to fit art. Change content slots and colour values only. The wordmark is text: `Campfire × Vibhas`. No vendor strips or product screenshots.

Keep `noindex, nofollow`, relative asset URLs, and the Campfire OG URLs.

## Illustration and review rules

Use the full STYLE block in `STORYBOARD.md` verbatim for every image, followed by that frame's SCENE paragraph verbatim. Editorial ink-and-cel illustration; one focal Ember lime (#B2EC96) element; contemporary American finance teams. No text, letters, numbers, logos, readable UI or watermarks anywhere in the art. No exceptions. No 3D or photoreal frames. Captions carry all accounting amounts and names.

Every SCENE is one paragraph of 80–140 words. State the camera position, include concrete background details, name the single lime element with “Only X is lime,” and communicate one idea through objects. Repeat the two paper tapes on a lightbox, the balance scale, removable paperclips, and translucent wireframe Ember figure/hands. Put each character's identifying details directly in each applicable SCENE because generation sessions are independent.

One point per frame. Headlines must be picturable. Captions explain why this matters to Maya; UI controls, shortcuts and implementation details belong in the prototypes. Keep the voice notes' positive “only fourteen left” turn; don't stretch the opening into a misery story. Model learning is an intended design benefit, not a verified current Campfire capability. End on Maya enjoying her evening with the laptop shut.

## Generate a frame (later, one session per frame)

Codex runs **only on the owner's ChatGPT login**. Run `codex login status` first and confirm the ChatGPT login. Never authenticate Codex with `CODEX_API_KEY`, `OPENAI_API_KEY`, or `--with-api-key`. API keys in the environment or `.env` are for customer production features and their testing, never coding work or this pipeline. If the ChatGPT login fails, stop and report; do not fall back to API keys.

From the repository root (`~/Projects/campfire-reconciliation`), use the original one-`codex exec`-per-frame command, adapted only to this deck's paths. Example for frame 01:

```bash
codex exec -m gpt-6-astra -c model_reasoning_effort=medium -s workspace-write -C ~/Projects/campfire-reconciliation - < story-src/assets/raw/brief-01.md
```

Use `brief-02.md` through `brief-12.md` for the other frames, each in its own session. Confirm `reasoning effort: medium` in the log header. Frames can take several minutes: launch separate background sessions or use a long process timeout, then wait for each `FRAME NN DONE`. Do not generate the whole deck in one session. Keep the brief files for the orchestrator. The published deck includes generated frames; regenerate only when requested.

Each brief instructs the operator to:

1. Read `story-src/STORYBOARD.md`; prompt with STYLE + the chosen SCENE verbatim, landscape 16:9, highest available quality.
2. Copy the PNG from `~/.codex/generated_images/<thread-id>/` to the designated `story-src/assets/raw/NN-slug.png`.
3. View once. If there is text, lettering, numbers, logos, a watermark, 3D or photorealism, regenerate once with the no-text constraint strengthened; accept the second attempt.
4. Append `NN-slug.png | <original path> | <retry note or none>` to `story-src/assets/raw/manifest.md`.

After PNGs arrive:

```bash
story-src/assets/raw/compress.sh
```

The compressor reads `story-src/assets/raw/` and writes desktop/phone JPEGs to `public/story/assets/`. It does not generate the separate OG image. Verify the resulting desktop/phone dimensions and crops before presenting. Missing images keep the dashed `GENERATING · NN-slug` state until the JPEGs exist.

## Verify and preview

Check every section has a frame, eyebrow, headline and copy; eyebrows are sequential; `#tot` equals the section count; each referenced JPEG has a SCENE and `brief-NN.md`. Verify that desktop loads only the active and adjacent frames, and resizing restores continuous phone scrolling.

From the repository root, start and stop the local server by its PID:

```bash
npm run preview -- --port 4204 --strictPort > /tmp/story-preview.log 2>&1 &
story_server_pid=$!
curl -s localhost:4204/story/ | grep -c '<section'
kill "$story_server_pid"
```

Expected count: `12`. In a browser, verify desktop navigation and the phone's continuous scroll. Art and OG-image generation are separate from the prepared storyboard and placeholder verification. No commit, push or deployment is part of this lane.

# Free Local AI Models Directory

A permanent, plain-English directory of notable **free-to-run local AI models** — Llama, Mistral, Qwen, Gemma, Phi, DeepSeek, SmolLM, and OLMo families — with honest per-model cards: rough download size, RAM needs, strengths, weaknesses, a beginner verdict, and a link to its official download home. Nothing is bundled, nothing needs a key, and there are no affiliate links. The whole directory is **one offline HTML file** you can open with a double-click, email to a friend, or drop onto any USB stick.

Built with care by **Asdale Dynamics, LLC** as part of Dylan Asdale's beginner-friendly AI education collection (*The Massive AI Manual*, dylanasdale.github.io). It complements two sibling resources:

- **local-ai-handbook** — the step-by-step *how-to* for installing and using local models
- **free-ai-tools-directory** — free AI tools that run in your browser instead of on your machine

Distinctions: the handbook teaches *how to run models*; the free-ai-tools directory lists *web tools*; this directory answers *"which model should I download for the computer I already own?"*

## How to use it

Open `index.html` in any modern browser — fully offline, no server needed.

1. Pick your **RAM budget** in the filter (this is the number from your computer's specs, e.g. 8 GB).
2. Look for the **green "Great first pick"** badge if you are new.
3. Click through to the model's official page, or copy the one-line `ollama run ...` install hint.

Cards carry a per-model **recheck date** — the day we last verified its size and details. Model facts drift fast; when in doubt, trust the linked page over the card.

## Project layout

| Path | Role |
| --- | --- |
| `index.html` | The finished single-file directory (committed, ready to share as-is) |
| `models.json` | The data source of truth — one JSON object per model card |
| `template.html` | Page shell; tokens `%%STYLES%%`, `%%MODELS_JSON%%`, `%%APP_JS%%` get inlined |
| `assets/styles.css` | Page styles (inlined into `index.html` at build time) |
| `assets/app.js` | Filter + card-rendering logic (inlined; also unit-testable in Node) |
| `scripts/build.js` | Assembles `index.html` from the sources above |
| `scripts/test.js` | Validates JSON schema, card logic, and the built page |
| `LICENSE` | MIT, © 2026 Asdale Dynamics, LLC |

## For maintainers: the card fields

Everything the page renders comes from `models.json`. Field rules (enforced by `scripts/test.js`):

- `id` — short lowercase slug, unique (`llama-3-1-8b-instruct`)
- `name`, `creator`, `family` — display strings; `family` drives the Family filter
- `blurb` — one warm sentence in conversational English
- `params` — like `"8B"` or `"1.7B"`
- `approxDownloadGB` — approximate size of a common 4-bit (`Q4`-style) quantized download; a number, Gigabytes
- `ramGB.min` / `ramGB.max` — comfortable *system* RAM range in GB; `min` drives the RAM filter (stepping used: 4 / 8 / 12 / 16 / 24 / 32)
- `device` — one of `cpu-friendly`, `cpu-or-small-gpu`, `gpu-recommended`, `gpu-required`
- `license` — short honest description, e.g. `Apache 2.0 (very permissive)` or `Llama Community License (free with conditions)`
- `strengths`, `weaknesses` — 1–5 short bullets each
- `verdict.level` — `great-first-pick`, `solid-pick`, or `for-enthusiasts`; `verdict.text` — one sentence of advice
- `links` — 1–3 links, each to `huggingface.co` or `ollama.com` only (the official download homes)
- `installHint` — optional, matching `ollama run <tag>`
- `rechecked` — `YYYY-MM-DD`; bump it **every** time you re-verify the card

Example card:

```json
{
  "id": "llama-3-1-8b-instruct",
  "name": "Llama 3.1 8B Instruct",
  "creator": "Meta",
  "family": "Llama",
  "blurb": "The model that made local AI mainstream - balanced, friendly, backed by the biggest ecosystem.",
  "params": "8B",
  "approxDownloadGB": 4.7,
  "ramGB": { "min": 8, "max": 16 },
  "device": "cpu-or-small-gpu",
  "license": "Llama Community License (free with conditions)",
  "strengths": ["All-purpose: chat, writing, light coding", "128K-token context window"],
  "weaknesses": ["Knowledge stops around 2023", "Sometimes stiff or wordy in tone"],
  "verdict": { "level": "great-first-pick", "text": "If you install one model ever, make it this." },
  "links": [
    { "label": "Hugging Face model card", "url": "https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct" },
    { "label": "Get it on Ollama", "url": "https://ollama.com/library/llama3.1" }
  ],
  "installHint": "ollama run llama3.1",
  "rechecked": "2026-10-27"
}
```

## Maintenance routine

Suggested rhythm: **recheck quarterly**, or before any release.

1. For each card, open its linked model pages and confirm the size, license, and family of the quantized download.
2. Update `approxDownloadGB`, text, or verdict if anything drifted.
3. **Bump `rechecked` on every card you touched** (and any card you verified unchanged).
4. Remove cards for models that are no longer freely available; add a new card at the correct RAM-sorted spot in `models.json`.
5. Rebuild and test:

```sh
npm run build   # re-inlines models.json + assets into index.html
npm test        # schema + render + offline checks (must be all PASS)
```

Commit both `models.json` **and** the rebuilt `index.html` together, so the repo always ships a current single file.

Two hard rules, enforced by tests:

- `index.html` must equal the build output (no stale artifacts get committed by accident).
- Links may only point to the official model homes (`huggingface.co`, `ollama.com`) — never mirrors, marketplace listings, or affiliate URLs. No downloads are bundled into this repo.

## Testing details

`scripts/test.js` (run with `npm test`) checks four layers:

1. **Schema** — required fields, types, id slugs, ISO dates (not in the future), RAM stepping, plausible sizes, device/verdict enums, https-only links restricted to official hosts, unique ids.
2. **Logic** — the RAM filter ladder is monotonic, family/search filters behave, sorting is stable by size.
3. **Rendering** — every card renders with its name, RAM range, verdict, recheck date, and links; no `undefined` leaks.
4. **Page** — `index.html` is byte-identical to a fresh build, its embedded JSON equals `models.json`, it contains no external scripts/styles/images (true offline single file), and no affiliate/store links.

## Design choices

- **JSON-driven, single file**: the JSON is inlined into `index.html` at build time so double-clicking the file works offline (a fetch from `file://` would fail).
- **No dependencies**: Node's standard library only; no `node_modules`, no network in build or test.
- **Beginner-first copy**: warm, plain English, never condescending; verdicts tell you *what to do*, not just what we think.

## Credit and license

Project and content © **Asdale Dynamics, LLC**, released under the MIT License — see `LICENSE`. Created by Dylan Asdale as part of a beginner-friendly AI education collection. Not affiliated with Meta, Google, Microsoft, Mistral AI, Alibaba, DeepSeek, Hugging Face, or the Allen Institute for AI; all model names are trademarks of their owners. This directory is educational information only.

# STATUS - free-local-models-directory

Last updated: 2026-10-27

## What was built

A static, offline, single-file directory of **19 notable free-to-run local AI models** (Llama, Mistral, Qwen, Gemma, Phi, DeepSeek R1, SmolLM, OLMo families), maintained by Asdale Dynamics, LLC as part of Dylan Asdale's beginner-friendly AI education collection.

- `index.html` - the finished directory: generated, ~40 KB, works offline by double-clicking, no external scripts/styles/images, no bundled downloads, no keys, no affiliate links, no tracking.
- Per-model cards: parameters, approximate 4-bit download size, comfortable system-RAM range, device class (CPU-friendly to GPU-required), license, strengths, weaknesses, a color-coded beginner verdict (green "Great first pick" / blue "Solid pick" / amber "For hardware enthusiasts"), an `ollama run ...` install hint, and a per-card recheck date (all `2026-10-27` at initial release).
- **RAM-range filter** ("Runs on 4/8/16/32/64 GB or more" ladder), plus family filter and text search; results and counts update live.
- **JSON-driven**: `models.json` is the source of truth; `npm run build` inlines it + CSS + JS into the single file.
- Links go only to official download homes (huggingface.co, ollama.com) - enforced by tests.
- `scripts/test.js` - dependency-free test suite validating JSON schema, filter/render logic, and the built page (including a stale-artifact check).
- `README.md` - maintenance guide (field rules, quarterly recheck routine, rebuild + test workflow).
- `LICENSE` - MIT, Copyright (c) 2026 Asdale Dynamics, LLC.

Complements **local-ai-handbook** (setup how-to) and **free-ai-tools-directory** (web tools), per the README and page footer.

## How to run / verify

- Use: open `index.html` in a browser (no server needed).
- Build: `npm run build` (or `node scripts/build.js`) - regenerates `index.html` from sources.
- Test: `npm test` (or `node scripts/test.js`).

## Verification results

- `node scripts/build.js` - "Built index.html (39.9 KB, single file, offline) from 5 sources."
- `node scripts/test.js` - **ALL PASS: 36 passed, 0 failed** (2026-10-27), covering:
  - JSON schema (19/19 cards: field types, unique slugs, ISO recheck dates not in the future, RAM stepping, https-only links restricted to official hosts)
  - filter logic (RAM ceiling monotonicity, family + search combos, sorting)
  - card rendering (all 19 cards render complete HTML with name, RAM, verdict, links, recheck date; escapeHtml neutralizes markup)
  - built page (single-file, verbatim-embedded sources, embedded JSON equals models.json, no external/network assets, no affiliate/store links, exact license line in footer, < 200 KB)
- Sanity probes: `renderCard` output inspected for `Llama 3.1 8B Instruct`; RAM=16 filter returns 17 of 19 (correctly excludes the two 24 GB+-floor models); `Copyright (c) 2026 Asdale Dynamics, LLC` confirmed character-for-character in `LICENSE`.

## Known gaps

- **Data currency**: sizes/claims reflect the initial recheck date on each card; local-model releases move fast, so newer model generations may exist - this is why every card carries a `rechecked` date and the page says to trust the linked model page. Recommend a quarterly recheck (documented in README).
- Approximate numbers: download sizes assume a common 4-bit (`Q4`-style) quant; RAM ranges are comfortable-floor estimates, not lab benchmarks.
- Ollama library slugs can change; tests constrain hosts (never the exact repo paths) so a renamed model only needs a JSON edit.
- No CLI-model knowledge, no live "latest releases" feed, and no screenshot/browser-based visual QA here - card rendering is validated in Node (pure functions), not in a real browser.
- The single-file design means edits require a rebuild (`npm run build`) before the page reflects them; the test suite catches stale artifacts.

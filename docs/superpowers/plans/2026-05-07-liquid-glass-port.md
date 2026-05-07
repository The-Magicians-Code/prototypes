# Liquid Glass Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reproduce the upstream Liquid Glass demo (https://liquid-glass-eta.vercel.app/) faithfully inside `prototypes/liquid-glass/` — both renderers, full controls, drag-to-reposition, and background picker — with attribution and run instructions.

**Architecture:** Four files copied verbatim from upstream (`index.html` SVG renderer, `webgl.html` WebGL renderer, `index.css` shared styling, `bg-picker.js` shared widget) plus a project-local `README.md`. No build step, no framework wrapping. The two renderers stay independent and share only chrome and the bg picker.

**Tech Stack:** Vanilla HTML / CSS / JS. WebGL renderer uses Three.js r128 from cdnjs. SVG renderer uses native `<feDisplacementMap>` + `<feImage>` filters. Static, server-with-anything (e.g. `python3 -m http.server`).

**Spec:** `docs/superpowers/specs/2026-05-07-liquid-glass-port-design.md`

---

## Pre-flight: Codex review

Per the global "Pre-implementation Codex review" rule in `~/.claude/CLAUDE.md`, this plan should be reviewed by `codex:codex-rescue` before any code touches disk.

- [ ] **Pre-flight 1: Hand this plan to `codex:codex-rescue`**

Use the Agent tool with subagent_type `codex:codex-rescue`. Prompt:

```
Review this implementation plan for porting https://liquid-glass-eta.vercel.app/
into prototypes/liquid-glass/. Plan path: docs/superpowers/plans/2026-05-07-liquid-glass-port.md.
Spec path: docs/superpowers/specs/2026-05-07-liquid-glass-port-design.md.

What's wrong with the plan? What would you do differently? What did I miss?
Specifically check:
- Are all upstream assets accounted for (HTML, JS, CSS, images, CDN scripts)?
- Are there any references between files that would break under the new directory layout?
- Does the smoke-test cover both renderers and both browsers we expect to support?
- Is the license/attribution approach reasonable given we don't yet know the upstream license?
- Any sequencing issues (e.g., committing before verifying the demo loads)?

Return a punch list of concrete adjustments, ordered by priority.
```

- [ ] **Pre-flight 2: Apply Codex feedback**

Apply the feedback you agree with by editing this plan inline. Push back on the items you disagree with in the user-facing summary. Do not start Task 1 until the plan reflects the post-review state.

---

## Task 1: Create directory and fetch upstream sources

**Files:**
- Create: `prototypes/liquid-glass/index.html`
- Create: `prototypes/liquid-glass/webgl.html`
- Create: `prototypes/liquid-glass/index.css`
- Create: `prototypes/liquid-glass/bg-picker.js`

- [ ] **Step 1: Create the target directory**

Run:
```bash
mkdir -p /Users/strange616/code/prototypes/liquid-glass
```

Expected: directory created, no output. Verify with `ls /Users/strange616/code/prototypes/liquid-glass/` returning empty.

- [ ] **Step 2: Fetch the four upstream files with curl**

Run:
```bash
cd /Users/strange616/code/prototypes/liquid-glass
curl -fSL https://liquid-glass-eta.vercel.app/ -o index.html
curl -fSL https://liquid-glass-eta.vercel.app/webgl.html -o webgl.html
curl -fSL https://liquid-glass-eta.vercel.app/index.css -o index.css
curl -fSL https://liquid-glass-eta.vercel.app/bg-picker.js -o bg-picker.js
ls -la
```

Expected: all four files exist with non-zero size. `curl -f` will fail loudly if any 404s.

- [ ] **Step 3: Verify each file contains expected upstream markers**

Run:
```bash
cd /Users/strange616/code/prototypes/liquid-glass
grep -q 'liquid-glass-filter' index.html && echo "index.html: ok"
grep -q 'THREE.WebGLRenderer' webgl.html && echo "webgl.html: ok"
grep -q 'controls' index.css && echo "index.css: ok"
grep -q 'BgPicker' bg-picker.js && echo "bg-picker.js: ok"
```

Expected: four `: ok` lines. If any fails, the upstream returned the wrong content (e.g., HTML shell instead of asset) — re-fetch with explicit Content-Type check before continuing.

- [ ] **Step 4: Inventory references — broad scan for any asset reference**

The grep below catches double-quoted, single-quoted, and unquoted attribute values, plus CSS `url(...)`, `@import`, ES `import`, and runtime `fetch(...)` calls. This is intentionally broad so we don't silently miss an asset.

Run:
```bash
cd /Users/strange616/code/prototypes/liquid-glass
echo '--- HTML href/src (any quoting) ---'
grep -hoE '(href|src)=("[^"]*"|'"'"'[^'"'"']*'"'"'|[^[:space:]>]+)' index.html webgl.html | sort -u
echo '--- CSS url() (any quoting) ---'
grep -hoE 'url\(([^)]*)\)' index.css | sort -u
echo '--- @import in CSS ---'
grep -nE '@import' index.css || echo '(none)'
echo '--- ES import in JS ---'
grep -nE '^[[:space:]]*import[[:space:]]' bg-picker.js || echo '(none)'
echo '--- inline fetch() / new Image() / new Worker() / XMLHttpRequest ---'
grep -nE 'fetch\(|new Image|new Worker|XMLHttpRequest|importScripts' index.html webgl.html bg-picker.js index.css || echo '(none)'
```

Expected: every emitted reference resolves to either:
- A sibling file we already fetched (`./index.css`, `./bg-picker.js`, `./webgl.html`, `./`).
- An external CDN URL we expect (`https://cdnjs.cloudflare.com/.../three.min.js`).
- An external image URL we expect (`https://images.unsplash.com/...`).
- An inline data URL (e.g., the SVG icons inside `<button>` markup).

If any reference points to a sibling file we did NOT fetch (e.g., `./icons/foo.svg`, `./bg-picker.css`), fetch it now with `curl -fSL https://liquid-glass-eta.vercel.app/<path>` and re-run this inventory until it converges.

- [ ] **Step 5: Stage the fetched sources (do NOT commit yet)**

We are intentionally deferring the commit until after Task 4's smoke test passes. This avoids a "ship-broken-then-patch" history if smoke testing reveals a missing asset or a broken cross-link.

Run:
```bash
cd /Users/strange616/code/prototypes
git add liquid-glass/
git status --short
```

Expected: `liquid-glass/` files are staged (`A` prefix). No commit on `main` yet.

---

## Task 2: Discover upstream license and author

**Files:**
- Modify: none yet (write findings to terminal; will land in README in Task 3)

- [ ] **Step 1: Check fetched HTML and JS for any author/license references**

Run:
```bash
cd /Users/strange616/code/prototypes/liquid-glass
grep -iE '(author|license|copyright|github\.com|twitter\.com|x\.com|@[a-z0-9_]+)' index.html webgl.html index.css bg-picker.js | head -20
```

Expected: zero or more lines. If found, note the GitHub/social link.

- [ ] **Step 2: WebFetch the demo's HTML for any meta tags we may have grep-missed**

Use the WebFetch tool on `https://liquid-glass-eta.vercel.app/` with prompt: "List all author attribution, license references, and source-repo links visible in the HTML, including meta tags, comments, and footer content."

Expected: WebFetch returns either a clear attribution or an explicit "no attribution found in page."

- [ ] **Step 3: If a GitHub repo is identified, fetch its LICENSE**

If Step 1 or 2 surfaces a `github.com/<owner>/<repo>` URL:

Use WebFetch on `https://github.com/<owner>/<repo>` with prompt: "What license does this repo declare? What's the project's stated description and primary author?"

If a LICENSE file is present and readable (e.g., MIT, Apache 2.0), try both common default branches:

```bash
curl -fSL https://raw.githubusercontent.com/<owner>/<repo>/main/LICENSE -o /Users/strange616/code/prototypes/liquid-glass/LICENSE \
  || curl -fSL https://raw.githubusercontent.com/<owner>/<repo>/master/LICENSE -o /Users/strange616/code/prototypes/liquid-glass/LICENSE
head /Users/strange616/code/prototypes/liquid-glass/LICENSE
```

Expected: LICENSE downloaded and contains the canonical license text. If no LICENSE is found at the repo root, skip the file and document this in README's Credit section.

- [ ] **Step 3b: Hardened fallback search if Step 1 + 2 found no repo**

Skip this step if Step 2 already surfaced a GitHub repo URL.

If neither Step 1 nor Step 2 turned up a repo, run a deliberate GitHub search rather than giving up. The demo page title is "Liquid Glass" and the SVG version uses `liquid-glass-filter` as the SVG `<filter>` id — distinctive enough that GitHub code search should find it.

Use WebFetch on each of these URLs in turn, stopping at the first result that clearly matches (i.e., a repo whose code contains the same `liquid-glass-filter` id and references `feDisplacementMap`):

1. `https://github.com/search?q=%22liquid-glass-filter%22+%22feDisplacementMap%22&type=code` — search for the distinctive id pattern.
2. `https://github.com/search?q=%22liquid-glass-eta%22&type=repositories` — search for the Vercel subdomain.
3. `https://github.com/search?q=liquid+glass+svg+webgl+three+%22BgPicker%22&type=code` — search for the BgPicker name.

Prompt for each WebFetch: "List the top 3 results. For each, give the repo URL, primary language, star count, and a one-line description of how it relates to a liquid glass / SVG-displacement-map demo."

If a confident match is found, return to Step 3 and download the LICENSE. If after all three searches no confident match is found, mark `upstream_repo: not found` in the scratch note — but record the search URLs that were tried so the README can document the discovery effort.

- [ ] **Step 4: Write findings to a scratch note for Task 3**

Append a short note to `/tmp/lg-attribution.txt` summarizing: upstream URL, repo URL (if found), author name (if found), license (if found). This is consumed by Task 3, then deleted.

```bash
cat > /tmp/lg-attribution.txt <<'EOF'
upstream_demo: https://liquid-glass-eta.vercel.app/
upstream_repo: <fill in or "not found">
author:        <fill in or "not found">
license:       <MIT/Apache/none-found>
license_file:  <prototypes/liquid-glass/LICENSE if downloaded, else "none">
EOF
cat /tmp/lg-attribution.txt
```

Expected: the file echoes back with values filled in.

---

## Task 3: Write the README

**Files:**
- Create: `prototypes/liquid-glass/README.md`

- [ ] **Step 1: Read the attribution scratch note**

Run: `cat /tmp/lg-attribution.txt` — confirm values are concrete (not placeholders) before writing the README.

- [ ] **Step 2: Write the README using the Write tool**

Path: `/Users/strange616/code/prototypes/liquid-glass/README.md`.

The README content is shown in a quadruple-backtick fence below — write the content **between** the outer `~~~LITERAL~~~` markers exactly as it appears, then replace the three placeholder lines (the ones starting with `Original demo:`, `Author:`, and `License:`) with the literal values from `/tmp/lg-attribution.txt`.

~~~LITERAL~~~
# Liquid Glass

Local copy of the [Liquid Glass](https://liquid-glass-eta.vercel.app/) demo — an interactive lens that refracts the page background using either an SVG `<feDisplacementMap>` filter (Chrome only) or a WebGL fragment shader (all browsers).

## Run

This is a static demo. Serve the directory with any HTTP server:

```bash
cd prototypes/liquid-glass
python3 -m http.server 8000
```

Then open:
- http://localhost:8000/           — SVG version (requires Chrome / Chromium)
- http://localhost:8000/webgl.html — WebGL version (works in Chrome, Safari, Firefox)

## How it works

Both renderers implement the same physical model: a **height field** describes the glass surface, **Snell's law** computes how light bends through it, and the bend is converted into a **UV offset** that re-samples the background somewhere different from where each pixel actually sits.

- **SVG version:** CPU rasterizes the displacement map and specular map to two `<canvas>` data URLs, then feeds them through an SVG filter chain (`feGaussianBlur` → `feDisplacementMap` → `feColorMatrix` → `feComposite` → `feBlend`). Uses CSS `backdrop-filter`, which is currently Chromium-only for SVG filters.
- **WebGL version:** Renders a full-screen quad with a fragment shader that does signed-distance-field for the rounded rect, computes the surface slope analytically, applies Snell's law, samples the background texture with a 16-tap Poisson blur, and composites specular + tint + shadow. Uses Three.js r128.

## Credit

Original demo: REPLACE_WITH_UPSTREAM_URL
Author: REPLACE_WITH_AUTHOR
License: REPLACE_WITH_LICENSE
~~~LITERAL~~~

Replace `REPLACE_WITH_UPSTREAM_URL`, `REPLACE_WITH_AUTHOR`, and `REPLACE_WITH_LICENSE` with the literal values from `/tmp/lg-attribution.txt`. **Do not commit until all three placeholders are gone.**

- [ ] **Step 3: Verify the README has no unfilled placeholders**

Run:
```bash
grep -nE 'REPLACE_WITH_|TODO|TBD|FIXME' /Users/strange616/code/prototypes/liquid-glass/README.md || echo "no placeholders"
```

Expected: `no placeholders`. If any line is returned, fill it from `/tmp/lg-attribution.txt` and re-run.

- [ ] **Step 4: Clean up scratch note and stage README/LICENSE (do NOT commit yet)**

The single end-of-pipeline commit happens in Task 5. We're still gating on smoke-test results.

Run:
```bash
rm /tmp/lg-attribution.txt
cd /Users/strange616/code/prototypes
git add liquid-glass/README.md
[ -f liquid-glass/LICENSE ] && git add liquid-glass/LICENSE
git status --short
```

Expected: `README.md` (and `LICENSE` if present) are staged alongside the four source files from Task 1. No commit yet.

---

## Task 4: Smoke test both renderers in Chrome via MCP

**Files:** none modified — read-only verification.

- [ ] **Step 1: Start a local HTTP server in the background**

Run:
```bash
cd /Users/strange616/code/prototypes/liquid-glass && python3 -m http.server 8765
```

with `run_in_background: true` on the Bash tool call. Capture the bash_id so we can kill it later.

Sanity-check it's up:
```bash
curl -fsI http://localhost:8765/ | head -1
curl -fsI http://localhost:8765/webgl.html | head -1
```

Expected: both return `HTTP/1.0 200 OK`.

- [ ] **Step 2: SVG version — DOM presence + lens interaction**

Load tools: `ToolSearch select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__read_console_messages`

Get tab context, create a new tab, navigate to `http://localhost:8765/`.

**2a — DOM presence.** Run this JS in the tab:
```js
({
  hasGlass: !!document.getElementById('glass'),
  hasFilter: !!document.getElementById('liquid-glass-filter'),
  filterPrimitives: [...document.querySelectorAll('#liquid-glass-filter > *')].map(n => n.tagName.toLowerCase()),
  controlsPresent: ['glass-width','glass-thickness','refractive-index'].every(id => !!document.getElementById(id))
})
```

Expected:
- `hasGlass: true`
- `hasFilter: true`
- `filterPrimitives` contains `fegaussianblur`, `feimage`, `fedisplacementmap`, `fecolormatrix`, `fecomposite`, `feblend`
- `controlsPresent: true`

**2b — Slider mutates the displacement map.** The SVG version rebuilds `<feImage href="...data:image/png;base64,...">` whenever certain sliders change. We can detect a real rebuild by snapshotting the displacement-map data URL, dispatching an `input` event on the IOR slider, waiting past the 30 ms debounce, and confirming the data URL changed.

```js
(async () => {
  const dispBefore = document.querySelector('#liquid-glass-filter feImage')?.getAttribute('href') || '';
  const slider = document.getElementById('refractive-index');
  slider.value = '1.5';
  slider.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 80));
  const dispAfter = document.querySelector('#liquid-glass-filter feImage')?.getAttribute('href') || '';
  return { changed: dispBefore !== dispAfter, beforeLen: dispBefore.length, afterLen: dispAfter.length };
})()
```

Expected: `changed: true` (the displacement map data URL is different after the slider input). Both lengths > 0.

**2c — Drag the lens.** Read the lens position, simulate a pointer drag, then verify position changed.

```js
const g = document.getElementById('glass');
const x0 = g.offsetLeft, y0 = g.offsetTop;
const send = (type, dx, dy) => g.dispatchEvent(new PointerEvent(type, {
  bubbles: true, clientX: x0 + 50 + dx, clientY: y0 + 50 + dy, pointerId: 1, button: 0
}));
send('pointerdown', 0, 0);
document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x0 + 100, clientY: y0 + 80, pointerId: 1 }));
document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x0 + 100, clientY: y0 + 80, pointerId: 1 }));
({ moved: g.offsetLeft !== x0 || g.offsetTop !== y0, x0, y0, x1: g.offsetLeft, y1: g.offsetTop })
```

Expected: `moved: true`. (Note: if the upstream uses delegated handlers on `document` instead of element-local listeners, the drag may need `dispatchEvent(...)` on `document` for `pointermove`/`pointerup` — already handled above.)

**2d — Background picker interaction.** Find the bg-picker UI, click one option, confirm the body/`#bg` background changed.

```js
const picker = document.getElementById('bg-picker');
const bgBefore = document.body.style.background || getComputedStyle(document.body).background;
const firstOption = picker?.querySelector('button, [role="button"], img, .bg-option, [data-url]');
if (firstOption) firstOption.click();
({ pickerPresent: !!picker, optionFound: !!firstOption, bgBefore: bgBefore.slice(0, 80) })
```

Expected: `pickerPresent: true`, `optionFound: true`. Wait ~500 ms (image load), then re-check `document.body.style.background` — it should contain a `url(...)` value or differ from `bgBefore`.

**2e — Console health.** Call `mcp__claude-in-chrome__read_console_messages` and verify there are no error-level messages. Acceptable: Unsplash CORS warnings, Three.js deprecation notices.

- [ ] **Step 3: WebGL version — DOM presence + lens interaction**

Navigate the same tab to `http://localhost:8765/webgl.html`.

**3a — DOM presence + WebGL context.**
```js
({
  hasCanvas: !!document.getElementById('gl'),
  canvasContextOk: (() => {
    const c = document.getElementById('gl');
    return c && c.getContext && (c.getContext('webgl2') || c.getContext('webgl')) !== null;
  })(),
  hasDragger: !!document.getElementById('dragger'),
  controlsPresent: ['gw','thick','ior','blur'].every(id => !!document.getElementById(id))
})
```

Expected: all four `true`.

**3b — Slider updates the shader uniform.** The WebGL version writes slider values into `material.uniforms` on every `requestAnimationFrame`. We can read the uniform value before and after a slider input. Three.js exposes the renderer's program list, but a more direct approach is to read the global `state` variable (defined in the page's inline script).

```js
(async () => {
  const before = state.ior;
  const slider = document.getElementById('ior');
  slider.value = '1.5';
  slider.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  return { changed: state.ior !== before, before, after: state.ior };
})()
```

Expected: `changed: true`, `after: 1.5`.

**3c — Drag the dragger.**
```js
const d = document.getElementById('dragger');
const x0 = state.x, y0 = state.y;
d.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x0, clientY: y0, pointerId: 1, button: 0 }));
document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x0 + 60, clientY: y0 + 40, pointerId: 1 }));
document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x0 + 60, clientY: y0 + 40, pointerId: 1 }));
({ moved: state.x !== x0 || state.y !== y0, x0, y0, x1: state.x, y1: state.y })
```

Expected: `moved: true`.

**3d — Background picker interaction.** Same as 2d but on the WebGL page. The WebGL version's `loadBgTexture` swaps the `uBgTex` uniform; verify by checking `material.uniforms.uBgTex.value` is non-null after a click.

```js
const pickerW = document.getElementById('bg-picker');
const firstOptionW = pickerW?.querySelector('button, [role="button"], img, .bg-option, [data-url]');
const before = !!material?.uniforms?.uBgTex?.value;
if (firstOptionW) firstOptionW.click();
({ pickerPresent: !!pickerW, optionFound: !!firstOptionW, beforeTex: before })
```

After ~700 ms (texture load), re-run `({ afterTex: !!material?.uniforms?.uBgTex?.value })` and confirm `afterTex: true`.

**3e — Console health.** Call `read_console_messages`. No error-level messages. Warnings about Unsplash CORS or Three.js deprecation are acceptable.

- [ ] **Step 4: Verify the cross-link buttons**

In the WebGL tab, run:
```js
const link = document.querySelector('.switch-btn');
({ text: link?.textContent.trim(), href: link?.getAttribute('href') })
```

Expected: `text` mentions "SVG", `href` is `./` or `index.html`.

Navigate to `http://localhost:8765/` and run:
```js
const link = document.querySelector('.switch-btn');
({ text: link?.textContent.trim(), href: link?.getAttribute('href') })
```

Expected: `text` mentions "WebGL", `href` is `./webgl.html`.

- [ ] **Step 5: Manual cross-browser check (Safari + Firefox)**

The Chrome MCP only exercises Chrome. The spec calls for the WebGL renderer to work in Chrome, Safari, and Firefox. Ask the user — directly, in the terminal — to open both URLs in Safari and Firefox while the local server is still running:

> "Server is running on http://localhost:8765. Please open `http://localhost:8765/webgl.html` in Safari and Firefox and confirm: (1) the lens is visible, (2) dragging it works, (3) at least one slider (e.g., IOR) updates the lens. The SVG version (`/`) is expected to NOT work in Safari/Firefox — that's a known limitation, not a bug."

Wait for the user's confirmation before stopping the server in Step 6.

If a browser fails unexpectedly (e.g., WebGL renders blank in Firefox): capture the user's report verbatim, do not try to "fix" the upstream behavior in this plan — open it as a follow-up item in Task 5's hand-back report instead.

- [ ] **Step 6: Stop the HTTP server**

Use the BashOutput tool / KillBash on the bash_id captured in Step 1, or run:
```bash
pkill -f 'http.server 8765'
```

Verify:
```bash
curl -fsI http://localhost:8765/ 2>&1 | head -1
```

Expected: connection refused.

- [ ] **Step 7: If smoke test required fixes, stage them too**

If any of the interactive checks (2a–2e, 3a–3e, Step 4 cross-links) failed and you applied a fix, stage those changes — DO NOT commit yet, the single commit happens in Task 5.

```bash
cd /Users/strange616/code/prototypes
git add liquid-glass/
git status --short
```

Expected: working tree shows only staged changes under `liquid-glass/` and (in Task 5) the spec status update. If anything else is dirty, investigate before continuing.

If a smoke test failure cannot be quickly fixed, stop here and report BLOCKED to the controller — do NOT proceed to Task 5 with a known-broken demo.

---

## Task 5: Single end-of-pipeline commit + final report

**Files:**
- Modify: `docs/superpowers/specs/2026-05-07-liquid-glass-port-design.md` (status line)

This task is intentionally the only commit of the port. Tasks 1–4 staged changes; this task lands them as one atomic "add liquid-glass port" commit, after smoke testing has passed.

- [ ] **Step 1: Mark the spec complete**

Edit `docs/superpowers/specs/2026-05-07-liquid-glass-port-design.md`. Change the status line from:

```
**Status:** Approved (option A from brainstorming companion)
```

to:

```
**Status:** Implemented in `prototypes/liquid-glass/` — see plans/2026-05-07-liquid-glass-port.md
```

- [ ] **Step 2: Stage the spec update and verify the staged set is complete**

```bash
cd /Users/strange616/code/prototypes
git add docs/superpowers/specs/2026-05-07-liquid-glass-port-design.md
git status --short
```

Expected staged set:
- `A  liquid-glass/index.html`
- `A  liquid-glass/webgl.html`
- `A  liquid-glass/index.css`
- `A  liquid-glass/bg-picker.js`
- `A  liquid-glass/README.md`
- `A  liquid-glass/LICENSE` (only if Task 2 found one)
- `M  docs/superpowers/specs/2026-05-07-liquid-glass-port-design.md`

If anything is missing or extra, fix the working tree before committing.

- [ ] **Step 3: Single commit**

```bash
git commit -m "$(cat <<'EOF'
liquid-glass: port liquid-glass-eta.vercel.app demo into prototypes/

Faithful 1:1 vanilla-HTML copy: SVG and WebGL renderers, controls panel,
drag-to-reposition, background picker. Smoke-tested in Chrome via MCP
(both renderers, lens drag, slider mutation, bg-picker). Spec marked
Implemented.

Spec:  docs/superpowers/specs/2026-05-07-liquid-glass-port-design.md
Plan:  docs/superpowers/plans/2026-05-07-liquid-glass-port.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git log --oneline -2
```

Expected: one new commit on top of the pre-port state. Do **not** `git push` unless the user has explicitly authorized it (per system prompt git safety rules).

- [ ] **Step 4: Hand back to user**

Report:
- File list under `prototypes/liquid-glass/` (with sizes)
- Commit SHA and message
- Demo URL to manually open in Safari/Firefox if Task 4 Step 5 was skipped: `cd prototypes/liquid-glass && python3 -m http.server 8000`
- Upstream attribution result (repo URL if found, or "not found — search URLs documented in README")
- Any follow-up items surfaced during smoke test (e.g., console warnings worth noting)

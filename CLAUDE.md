# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

This is a **collection of standalone static HTML/CSS/JS prototypes** — no package manager, no build step, no test suite, no linter. Each subdirectory is its own self-contained demo. Treat changes as edits to plain files served as-is.

Active prototype groups:

- **`liquid-glass-pill/`** — original implementation of a refractive header-pill, based on the kube.io technique. Has an `ASTRO-PORT.md` for porting the prototype into an Astro component (read this before refactoring for reuse).
- **`liquid-glass/`** — local copy of Chris Feijoo's [Liquid Glass demo](https://liquid-glass-eta.vercel.app/). See `liquid-glass/README.md`. **License caveat:** upstream is not open source; this directory is personal-reference-only and not for redistribution. Do not extract / repackage / publish code from here.
- **`web/`** — older HTML demos (`gradients*.html`, `portfolio_proto.html`, `mail.html`, etc.). Served via the Docker nginx setup in `web/run.sh`.
- Loose top-level demos: `iconsglassed.html`, `index.html` (the latter tries to fetch the GitHub contents API for directory indexing).

## Running prototypes

Static files only — serve any directory over HTTP. Examples:

```bash
# Liquid-glass-pill or liquid-glass
cd liquid-glass-pill && python3 -m http.server 8000
# then http://localhost:8000/

# web/ — uses nginx in Docker
cd web && ./run.sh
# serves on :80 ; container name "localpage"
```

The `liquid-glass/webgl.html` and `liquid-glass-pill/pill.css` (background image) load remote assets at runtime — **the demos are not fully offline**.

## Liquid-glass-pill conventions (non-obvious)

- **Refraction tunables live in `pill.css` `:root`, not in JS.** `pill.js` reads `--lg-thickness`, `--lg-bezel`, `--lg-ior`, `--lg-uniform-shift` via `getComputedStyle` + `parseFloat`. They are intentionally **unitless** so JS can use them as plain numbers. Edit the CSS values, not the JS defaults.
- **Single-pill only.** The SVG filter `id="lg-pill-filter"` and `feImage` ids are global; rendering more than one pill on the same page would collide. For multi-pill use, see `liquid-glass-pill/ASTRO-PORT.md` §7 (per-instance filters appended to a singleton `<defs>`).
- **Cross-browser layering:** Chromium gets the real `<feDisplacementMap>` lens via `backdrop-filter: url(#lg-pill-filter)`. Safari/Firefox fall through to a `backdrop-filter: blur(20px) saturate(1.5)` frosted-glass fallback. The branch is selected by `@supports (backdrop-filter: url(#lg-pill-filter))`. Both `-webkit-` and unprefixed properties are set in both branches so the fallback doesn't leak into the supported branch.
- **Client-side only.** The displacement and specular maps are generated at runtime via Canvas 2D + `toDataURL()`. Any port (e.g. to Astro) must keep this code on the client — see `ASTRO-PORT.md` §4.

## When porting to Astro

`liquid-glass-pill/ASTRO-PORT.md` is the source of truth for porting the pill into a portfolio. It covers component API, why the script must be client-side, CSS scoping pitfalls (filter IDs are not Astro-scoped), SSR/hydration order, and the singleton-`<defs>` pattern. Read it before suggesting a refactor.

## Git / history

Commits follow a `<area>: <summary>` style (e.g. `liquid-glass-pill: portfolio header pill prototype with Astro porting guide`). Each prototype lands as a sequence of spec → plan → implementation commits in the same area.

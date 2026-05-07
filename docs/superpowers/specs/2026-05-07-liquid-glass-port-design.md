# Liquid Glass Port — Design Spec

**Date:** 2026-05-07
**Source:** https://liquid-glass-eta.vercel.app/ (Vercel-hosted demo; upstream repo URL TBD during fetch)
**Target:** `prototypes/liquid-glass/`
**Status:** Approved (option A from brainstorming companion)

## Goal

Reproduce the Liquid Glass demo locally inside `prototypes/`, preserving both rendering paths (SVG `<feDisplacementMap>` filter and WebGL/Three.js fragment shader), the full controls panel, drag-to-reposition behavior, and the background picker. The port is faithful — no framework wrapping, no behavioral changes.

## Why

The user wants a runnable copy of the demo for two reasons:
1. Reference implementation they can read, modify, and learn from offline.
2. Foundation for any future integration into other projects (personal site, crockpot, etc.) — but that's out of scope here.

## Non-Goals

- Not wrapping in Astro/React/any framework.
- Not minifying, bundling, or adding a build step.
- Not changing any visual or interactive behavior.
- Not integrating into the personal site or crockpot. (Future work; would be its own spec.)

## Architecture

The port is four files plus a README:

```
prototypes/liquid-glass/
├── index.html       SVG version (Chrome / Chromium only — uses backdrop-filter on SVG)
├── webgl.html       WebGL/Three.js version (works in all browsers)
├── index.css        Shared styling: controls panel, layout, dragger, panel toggle
├── bg-picker.js     Background picker widget (used by both versions)
└── README.md        How to run + brief description of each renderer
```

Each unit has one purpose:

| File | Purpose | Inputs | Outputs |
|------|---------|--------|---------|
| `index.html` | SVG renderer | User controls, background URL | DOM with SVG filter applied to `<div id="glass">` |
| `webgl.html` | WebGL renderer | Same controls + shader uniforms | `<canvas>` with full-screen quad rendering the lens |
| `index.css` | Layout/style | — | Visual chrome (panel, sliders, toggle, dragger) |
| `bg-picker.js` | Background picker | A list of URLs + current selection | Calls `onApply(url)` callback |

Both HTML files import `bg-picker.js` and `index.css`. The two renderers are deliberately independent — they share only chrome and the background picker, not the rendering logic.

## What's preserved 1:1

From the upstream source, copied verbatim:

**SVG version (`index.html`):**
- `SURFACE_FNS` height function table (convex_squircle, lip, convex_circle, concave)
- `calculateRefractionProfile()` — Snell's law over 128 samples
- `generateDisplacementMap()` — CPU rasterization of profile to RGB canvas
- `generateSpecularMap()` — rim-lighting mask
- `rebuildFilter()` — assembles `<feGaussianBlur>` + `<feImage>` + `<feDisplacementMap>` + `<feColorMatrix>` + `<feComposite>` + `<feBlend>` chain
- All control sliders, drag handler, debounce on rebuild

**WebGL version (`webgl.html`):**
- Full GLSL fragment shader: `sdRoundedRect`, `surfaceHeight`, `sampleBg`, `sampleBgBlurred` (16-tap Poisson), and the `main()` body that does refraction → offset → background sample → specular/tint/shadow composite
- All uniforms wired to control sliders
- Three.js r128 from cdnjs (same version as upstream)
- Drag handler on `<div id="dragger">`

**Shared:**
- Background picker UI and the default Unsplash image URL
- Panel toggle / close behavior
- Bottom bar with cross-link between versions

## What changes vs. upstream

Three small adjustments — all explicit:

1. **README.md** added at the directory root. Contains:
   - One-paragraph description of what the demo is.
   - Run instructions: `cd prototypes/liquid-glass && python3 -m http.server 8000`, then visit `http://localhost:8000/`.
   - One-line note on browser support: SVG version requires Chromium; WebGL version is universal.
   - Link back to upstream demo + license attribution.

2. **License attribution.** The new port needs an attribution to upstream. **Decision:** Add a `## Credit` section in `README.md` linking to the upstream demo and naming the original author (resolved during fetch). If the upstream repo declares a license (MIT, Apache, etc.), include a copy in `prototypes/liquid-glass/LICENSE`; if no license is found, the README will state the source URL and that the port is for personal reference only.

3. **Cross-link sanity check (no change expected).** The upstream "Switch to SVG / WebGL" buttons point to `./` and `./webgl.html`, which resolve correctly when the directory is served as root. Listed here for awareness — only fix if the smoke test reveals a break.

## Data flow

Both renderers follow the same conceptual flow:

```
User control input (slider/picker)
      ↓
Update internal state object
      ↓ (debounced 30ms in SVG, immediate in WebGL)
Re-derive renderer inputs
      ↓
SVG: rebuild displacement + specular maps as data URLs → swap into <filter>
WebGL: write to ShaderMaterial uniforms → next requestAnimationFrame redraws
      ↓
Browser composites result on top of background div / canvas
```

There is no shared state between the two renderers — each HTML file has its own state object. They cannot run in the same tab (one would need to be loaded at a time).

## Error handling

The upstream demo has minimal error handling and the port preserves that:
- If the WebGL context fails to init (very old browsers), Three.js logs an error to the console; the page is mostly blank. Acceptable for a demo.
- If the background image fails to load (network), the lens still renders against whatever is in the `#bg` div CSS background. Acceptable.
- If a slider receives a non-numeric value (impossible from `<input type=range>`), `+el.value` returns `NaN` which silently propagates. Acceptable for a demo; not worth defensive coding.

## Testing

Manual smoke test only — this is a static demo, not application code:

1. **SVG path:** Open `index.html` in Chrome, drag the lens, change Width/Height/Radius/Bezel/IOR sliders, change background. Verify:
   - Lens renders with refraction visible against background.
   - All sliders update the lens within ~50ms.
   - Drag is smooth.
   - "Switch to WebGL →" link goes to `webgl.html`.
2. **WebGL path:** Open `webgl.html` in Chrome, Safari, and Firefox. Same checks as above. Verify:
   - Renders identically across all three browsers.
   - "← Switch to SVG version" link goes to `index.html`.
3. **No automated tests** — this is a demo with no entry points to exercise programmatically.

## Open Questions

None expected. The port is mechanical. If issues surface during implementation:
- Cross-link paths might break if the dev server roots somewhere unexpected → fix to absolute paths if so.
- License clarity — check upstream repo before claiming MIT.

## Implementation Plan (handoff to writing-plans)

Step ordering will be:
1. Fetch all four upstream files (`index.html`, `webgl.html`, `index.css`, `bg-picker.js`) into `prototypes/liquid-glass/`.
2. Verify no file references break (cross-links, asset URLs, CDN imports).
3. Write `README.md` and license attribution.
4. Manual smoke test in Chrome and Safari.
5. Commit.

Hand off to the `writing-plans` skill for the detailed step-by-step plan.

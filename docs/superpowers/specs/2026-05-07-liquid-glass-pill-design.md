# Liquid Glass Pill Prototype — Design Spec

**Date:** 2026-05-07
**Target:** `prototypes/liquid-glass-pill/`
**Status:** Approved (proceed)
**Related work:** `prototypes/liquid-glass/` (faithful port of upstream demo) — see `2026-05-07-liquid-glass-port-design.md`. This prototype is *original* code applying the same publicly-explained technique to a portfolio-style header pill.

## Goal

Build a Chromium-only prototype that places a refractive **liquid-glass header pill** above a scrollable lorem-ipsum page, demonstrating how the SVG `<feDisplacementMap>` + `backdrop-filter` technique works in a portfolio-style header context. Ship a runnable demo plus a markdown guide for porting the implementation into modular Astro components for a real portfolio site.

## Why

1. The user wants this technique on a personal portfolio. A standalone prototype lets them validate look-and-feel and tuning before integrating into the real site.
2. The prior `prototypes/liquid-glass/` port is upstream code (not redistributable). This prototype writes the implementation from scratch based on the publicly-explained physics — clear ownership for portfolio reuse.
3. The Astro porting guide turns the prototype into a reusable artifact: future-user can drop a `<LiquidGlassPill>` component into any Astro layout.

## Non-Goals

- Not WebGL. SVG/`backdrop-filter` only. (Chromium-only is acceptable; a portfolio header that degrades gracefully in non-Chromium is a real-site concern, not a prototype concern.)
- Not a Three.js dependency.
- Not full responsive design / mobile-first work. The prototype targets desktop Chrome viewport.
- Not actually integrating into the user's real portfolio. That's a separate spec.
- Not a copy-paste of the upstream `liquid-glass` demo's code. We re-implement the displacement-map generation from the published physics.

## Architecture

```
prototypes/liquid-glass-pill/
├── index.html        Page shell, lorem-ipsum sections, pill markup, hero with Unsplash background
├── pill.css          Pill styling, layout, scroll-smoothing, page typography
├── pill.js           SVG filter generation: displacement map + specular map → data URLs → wired into <feImage> hrefs
└── ASTRO-PORT.md     Guide: how to turn this into a modular Astro component
```

Each unit has one responsibility:

| File | Purpose | Inputs | Outputs |
|------|---------|--------|---------|
| `index.html` | Static markup | — | DOM: header pill (`<nav class="lg-pill">`), hero, 4 lorem-ipsum sections, SVG `<defs>` for the filter |
| `pill.css` | Visual chrome | — | Pill positioning (fixed top-center), shape, typography, page layout |
| `pill.js` | Filter generation | Pill width/height/radius from CSS computed values | Two canvas-rendered data URLs assigned to `<feImage href>` inside the filter |
| `ASTRO-PORT.md` | Documentation | — | Markdown guide |

Files share knowledge of the pill's pixel dimensions. The CSS owns the source-of-truth (pill width / height / border-radius); `pill.js` reads computed styles via `getComputedStyle` rather than maintaining its own copies. This avoids drift if the pill is resized.

## Pill design

**Layout:**
- Fixed position, top-center, ~24px from the top of the viewport
- Width 480px, height 52px, border-radius 26px → pill shape
- Inside: left-side text logo "Brand"; right-side 4 nav anchors (Home / Work / About / Contact)
- Anchors point to `#home`, `#work`, `#about`, `#contact` on the page; CSS `scroll-behavior: smooth`

**Filter parameters (tuned for a thin header strip — different from the original demo which targets a square lens):**
- Bezel width: 10 px (small relative to 52 px height; preserves a flat center where logo and nav text sit unrefracted)
- Surface profile: `convex_squircle` (matches upstream's default; gives a soft bulge at the rim)
- Glass thickness: 30
- Index of refraction (IOR): 1.5
- Specular saturation: 4
- Specular opacity: 0.4 (subtle, not glaring)
- Tint: 6% white
- Blur on backdrop: 0.3 (slight)
- Inner shadow: white-ish, blur 12, spread -3
- Outer shadow: blur 18

These are starting values. The prototype includes them as CSS custom properties so they can be tuned by editing `pill.css` rather than hunting through JS.

## Page design

- **Hero section** at top (`#home`): full-viewport-height, fixed background image (the same Unsplash landscape the upstream demo uses by default), large "Brand — Portfolio" headline, brief tagline. The pill floats over this.
- **3 more sections** (`#work`, `#about`, `#contact`): each ~300 words of lorem ipsum, alternating off-white / light-gray backgrounds, padding for visual breathing room.
- **Total page height:** ~4× viewport, so the user can scroll and see the pill floating over different content (image hero, then text on solid background, etc.) — the lens reveals the technique's behavior across different backdrops.

The hero's `background-attachment: fixed` is a deliberate choice: as the user scrolls past the hero, the pill moves over the lorem-ipsum text, and the refraction visibly changes from "warping a photo" to "warping text."

## Astro porting guide (`ASTRO-PORT.md`)

Sections:

1. **What you're porting** — one paragraph: this is a script-block-based pill that needs client-side filter generation (canvas APIs aren't available in SSR), and the SVG `<defs>` should be a singleton in the root layout, not duplicated per component instance.

2. **File split** — proposed Astro structure:
   ```
   src/components/LiquidGlassPill.astro    — markup + scoped styles + <script>
   src/layouts/Layout.astro                — root layout that hosts the singleton <svg><defs>
   ```

3. **Component API:**
   ```astro
   ---
   interface Props {
     links: { label: string; href: string }[];
     width?: number;       // default 480
     height?: number;      // default 52
     bezel?: number;       // default 10
     ior?: number;         // default 1.5
     tint?: number;        // default 0.06
   }
   const { links, width = 480, height = 52, bezel = 10, ior = 1.5, tint = 0.06 } = Astro.props;
   ---
   ```

4. **Why the script must run client-side** — `canvas.toDataURL()` requires `document` + `window`. Astro server-renders by default; the filter-generation code must be inside a client-only `<script>` block (Astro's default `<script>` is processed and bundled client-side).

5. **CSS scoping** — Astro auto-scopes component CSS. The pill's CSS works as-is when moved into `<style>` inside `LiquidGlassPill.astro`. The one exception: the SVG filter `id="lg-pill-filter"` must be globally unique because `backdrop-filter: url(#lg-pill-filter)` references it by ID — name it deliberately.

6. **SSR/client hydration order** — the `<svg><filter>` is rendered server-side with empty `<feImage href="">`. The client `<script>` runs after DOMContentLoaded, generates the canvases, sets the `href` attributes. Until the script runs, the pill renders unfiltered (a plain semi-transparent pill). For a portfolio, that ~50 ms unfiltered flash is acceptable.

7. **Where to put the singleton SVG `<defs>`** — in `Layout.astro`, right after `<body>`:
   ```html
   <svg width="0" height="0" style="position:absolute;overflow:hidden">
     <defs id="liquid-glass-defs"><!-- LiquidGlassPill component injects its filter here --></defs>
   </svg>
   ```
   The component, on mount, finds `#liquid-glass-defs` and appends its filter element. This keeps multiple instances on a page (unlikely but possible) from creating ID collisions.

8. **Drop-in usage example:**
   ```astro
   ---
   import LiquidGlassPill from '../components/LiquidGlassPill.astro';
   const links = [
     { label: 'Home', href: '#home' },
     { label: 'Work', href: '#work' },
     { label: 'About', href: '#about' },
     { label: 'Contact', href: '#contact' },
   ];
   ---
   <Layout>
     <LiquidGlassPill {links} />
     <main><!-- ... --></main>
   </Layout>
   ```

9. **Caveats:** Chromium-only (Safari/Firefox don't support SVG `feDisplacementMap` via `backdrop-filter`); you'll want a fallback. Recommended fallback: detect support with a feature query (`@supports (backdrop-filter: url(#x))`) and fall back to a solid translucent pill in non-Chromium browsers.

## Attribution and licensing

This prototype is **original implementation of a publicly-explained technique**. Credit appears in:
- HTML comment at the top of `index.html`: `<!-- Liquid-glass technique by Chris Feijoo (kube.io). Refraction approach explained at https://kube.io/blog/liquid-glass-css-svg. Implementation here is original. -->`
- JSDoc-style header comment at the top of `pill.js` with the same content.
- First paragraph of `ASTRO-PORT.md`.

There is **no `## License` non-redistribution disclaimer** like the prior `liquid-glass/` port had. That disclaimer existed because the prior port was the upstream's actual code; this prototype is the user's own implementation, so it can ship freely under whatever license the broader `prototypes/` repo uses.

## Data flow

```
DOMContentLoaded
      ↓
pill.js reads computed styles of .lg-pill (width, height, borderRadius)
      ↓
generateDisplacementMap(w, h, r, bezel, profile, maxDisp)
      ↓ canvas.toDataURL() → data:image/png;base64,...
      ↓ setAttribute('href', ...) on <feImage id="lg-pill-disp">
      ↓
generateSpecularMap(w, h, r, bezel, angle)
      ↓ canvas.toDataURL() → ...
      ↓ setAttribute('href', ...) on <feImage id="lg-pill-spec">
      ↓
Filter is now live; CSS backdrop-filter renders the pill with refraction
```

The displacement-map generation algorithm is the standard one explained in Chris Feijoo's blog post: numerically sample the height function (convex squircle), apply Snell's law per sample to get a 1D displacement profile, then rasterize that profile around the rounded-rectangle boundary into a 2D RGB image (R = horizontal displacement, G = vertical, both centered around 128 = "no shift").

## Error handling

- **No backdrop-filter support** (older browsers): pill renders as a plain rounded rectangle with the inner shadow + tint. Acceptable degraded state — the design intentionally has visible chrome even without the lens effect.
- **Canvas generation failure** (extremely unlikely on desktop): `pill.js` catches the error, logs a console warning, and leaves the `href` empty so the filter renders pass-through. Pill still works as a translucent shape.
- **Window resize:** `pill.js` debounces resize with a 100 ms timer and re-runs the filter generation only if the pill's computed width/height changed.

## Testing

Manual smoke test in Chrome:

1. Open `index.html` via `python3 -m http.server` and visit `http://localhost:8000/`.
2. Verify the pill is visible centered at top, with the refraction effect: scrolling the page should make the pill bend the underlying content.
3. Verify each nav anchor smooth-scrolls to its section.
4. Resize the window: pill stays centered; if the pill's CSS-computed dimensions change (e.g., via media query — there are none in v1), the filter re-generates.
5. Open in Safari and Firefox: pill renders as a plain translucent rounded rectangle (no refraction). Acceptable degraded state.

No automated tests — this is a static demo prototype.

## Open Questions

None. All decisions resolved during brainstorming:
- Pill position: floating top-center (decided)
- Background: Unsplash hero with `background-attachment: fixed` (decided)
- License framing: original implementation, credit Chris Feijoo, no non-redistribution disclaimer (decided)
- Astro porting guide: shipped as a single `ASTRO-PORT.md` markdown alongside the prototype (decided)

## Implementation handoff

The implementation plan should cover:

1. Create directory and skeleton files (`index.html`, `pill.css`, `pill.js`, `ASTRO-PORT.md`).
2. Implement the SVG filter generation in `pill.js` from scratch (height function → refraction profile → 2D displacement map → specular map → data URLs into `<feImage>`). Reference the upstream `liquid-glass/index.html` ONLY for understanding the math; the new code is written, not copied.
3. Build the page (`index.html` markup + `pill.css` styling + lorem-ipsum content + Unsplash hero).
4. Wire the pill nav to smooth-scroll anchors.
5. Write `ASTRO-PORT.md` covering all 9 sections above.
6. Smoke test in Chrome via MCP (pill renders, refraction visible, nav scrolls, no console errors).
7. Manual user check in Safari + Firefox (degrades to plain pill — acceptable).
8. Single end-of-pipeline commit.

Hand off to the `writing-plans` skill.

# Liquid Glass Pill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `prototypes/liquid-glass-pill/` — a Chromium-only refractive header-pill prototype over a scrollable lorem-ipsum page, plus a markdown guide for porting the implementation into modular Astro components.

**Architecture:** Vanilla HTML + CSS + JS. The pill is a fixed-position rounded rectangle styled in CSS with two layered backdrop-filter rules (frosted-glass fallback + `@supports`-gated SVG refractive filter). A small JS module reads the pill's computed dimensions, generates two canvas-backed PNG data URLs (displacement map + specular map) via the standard Snell's-law refraction algorithm, and assigns them to two `<feImage>` nodes inside an SVG `<filter>` defined in `index.html`'s `<defs>`. No build step, no framework.

**Tech Stack:** Vanilla HTML/CSS/JS. Canvas 2D for map generation. SVG `<feDisplacementMap>` + `<feImage>` + `<feGaussianBlur>` + `<feColorMatrix>` + `<feComposite>` + `<feComponentTransfer>` + `<feBlend>` for the filter chain. `backdrop-filter: blur() saturate()` for the non-Chromium fallback.

**Spec:** `docs/superpowers/specs/2026-05-07-liquid-glass-pill-design.md`

---

## Pre-flight: Codex review

Per the global "Pre-implementation Codex review" rule in `~/.claude/CLAUDE.md`.

- [ ] **Pre-flight 1: Hand this plan to `codex:codex-rescue`**

Use the Agent tool with subagent_type `codex:codex-rescue`. Prompt:

```
Review this implementation plan for a liquid-glass header-pill prototype.

Plan: docs/superpowers/plans/2026-05-07-liquid-glass-pill.md
Spec: docs/superpowers/specs/2026-05-07-liquid-glass-pill-design.md
Reference (DO NOT copy code from): prototypes/liquid-glass/index.html (the upstream port)

What's wrong with the plan? What would you do differently? What did I miss?
Specifically check:

1. Is the displacement-map math algorithm correct as described in Task 3? Does it match the standard Snell's-law refraction approach used in the prior port (without copying the code verbatim)?
2. Are the @supports query and CSS layering for the frosted-glass fallback correct? Will Safari/Firefox actually render the blur fallback when the SVG filter URL fails to apply?
3. Is the SVG filter chain in Task 2's index.html markup complete? It should produce a refractive lens, not a no-op or broken filter.
4. Is the smoke test in Task 5 exercising the right assertions (pill rendered, refraction visible in Chromium, blur visible in non-Chromium)?
5. Are there any sequencing issues (e.g., committing before smoke test)?
6. Is the ASTRO-PORT.md guide in Task 4 complete enough to actually port the prototype, or does it leave gaps?

Return a concrete punch list, ordered by priority. Use file:line refs where applicable.
```

- [ ] **Pre-flight 2: Apply Codex feedback**

Apply feedback you agree with by editing this plan inline. Push back in the user-facing summary on items you disagree with. Do not start Task 1 until the plan reflects the post-review state.

---

## Task 1: Directory + skeleton HTML + base CSS (frosted-glass fallback works without JS)

**Files:**
- Create: `prototypes/liquid-glass-pill/index.html`
- Create: `prototypes/liquid-glass-pill/pill.css`

The deliverable for this task: opening `index.html` in a browser shows the lorem-ipsum page with a frosted-glass pill at the top — even before any JS runs. The SVG filter `<defs>` is in place but its `<feImage>` href attributes are empty (Task 3 fills them).

- [ ] **Step 1: Create the target directory**

Run:
```bash
mkdir -p /Users/strange616/code/prototypes/liquid-glass-pill
```

Verify with `ls /Users/strange616/code/prototypes/liquid-glass-pill/` returning empty.

- [ ] **Step 2: Write `index.html`**

Path: `/Users/strange616/code/prototypes/liquid-glass-pill/index.html`. Content (no escaping; this is the literal file content):

````html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Liquid Glass Pill — Prototype</title>
  <link rel="stylesheet" href="./pill.css" />
  <!--
    Liquid-glass technique by Chris Feijoo (kube.io).
    Refraction approach explained at https://kube.io/blog/liquid-glass-css-svg.
    Implementation here is original.
  -->
</head>
<body>

  <nav class="lg-pill" id="lg-pill">
    <a class="lg-pill__brand" href="#home">Brand</a>
    <ul class="lg-pill__nav">
      <li><a href="#home">Home</a></li>
      <li><a href="#work">Work</a></li>
      <li><a href="#about">About</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>
  </nav>

  <header id="home" class="hero">
    <h1>Brand &mdash; Portfolio</h1>
    <p class="hero__tagline">A scrollable demo of a refractive header pill.</p>
  </header>

  <main>
    <section id="work" class="page-section">
      <h2>Work</h2>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum vestibulum. Cras venenatis euismod malesuada. Nullam ac erat ante. Nulla varius enim quis tortor pellentesque, eget hendrerit augue volutpat. Donec porta enim eget tortor luctus, eget aliquam metus rhoncus. Aliquam erat volutpat. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Mauris ut velit at nibh dictum suscipit. Phasellus a est tortor. Quisque feugiat, leo eu efficitur ornare, mi nibh maximus felis, sed varius lectus magna at risus. Donec quis tortor non magna posuere placerat ut at ante.</p>
      <p>Sed pharetra, magna vel maximus condimentum, urna ipsum bibendum nibh, in finibus elit risus a sapien. Cras in lacus eget ante semper sodales. Curabitur faucibus magna in tortor luctus, ut suscipit dolor congue. Integer non sem ac magna placerat suscipit. Suspendisse potenti. Aliquam erat volutpat. In hac habitasse platea dictumst. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Nulla facilisi. Vivamus sit amet pretium nibh. Maecenas pulvinar ligula nec urna sodales, ac vehicula urna scelerisque.</p>
    </section>

    <section id="about" class="page-section page-section--alt">
      <h2>About</h2>
      <p>Aenean lacinia bibendum nulla sed consectetur. Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Nullam quis risus eget urna mollis ornare vel eu leo. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec ullamcorper nulla non metus auctor fringilla. Donec sed odio dui. Maecenas faucibus mollis interdum. Nullam id dolor id nibh ultricies vehicula ut id elit. Curabitur blandit tempus porttitor. Etiam porta sem malesuada magna mollis euismod.</p>
      <p>Cras justo odio, dapibus ac facilisis in, egestas eget quam. Morbi leo risus, porta ac consectetur ac, vestibulum at eros. Vestibulum id ligula porta felis euismod semper. Donec sed odio dui. Sed posuere consectetur est at lobortis. Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Donec id elit non mi porta gravida at eget metus. Maecenas faucibus mollis interdum. Cras mattis consectetur purus sit amet fermentum. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor.</p>
    </section>

    <section id="contact" class="page-section">
      <h2>Contact</h2>
      <p>Etiam porta sem malesuada magna mollis euismod. Donec ullamcorper nulla non metus auctor fringilla. Cras mattis consectetur purus sit amet fermentum. Donec sed odio dui. Maecenas sed diam eget risus varius blandit sit amet non magna. Donec ullamcorper nulla non metus auctor fringilla. Curabitur blandit tempus porttitor. Aenean lacinia bibendum nulla sed consectetur. Cras justo odio, dapibus ac facilisis in, egestas eget quam.</p>
      <p>Nullam quis risus eget urna mollis ornare vel eu leo. Maecenas faucibus mollis interdum. Vestibulum id ligula porta felis euismod semper. Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Sed posuere consectetur est at lobortis. Donec id elit non mi porta gravida at eget metus. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Nullam id dolor id nibh ultricies vehicula ut id elit.</p>
    </section>
  </main>

  <!--
    Singleton SVG <defs> for the liquid-glass filter; pill.js fills feImage
    hrefs at runtime.

    NOTE: this prototype is single-pill only. The filter id and feImage ids
    are global; rendering more than one pill on this page would collide.
    For multi-pill use, see ASTRO-PORT.md section 7 (per-instance filters).
  -->
  <svg width="0" height="0" style="position:absolute;overflow:hidden" aria-hidden="true">
    <defs>
      <filter id="lg-pill-filter" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.3" result="blurred_source" />
        <feImage id="lg-pill-disp" href="" result="disp_map" />
        <feDisplacementMap in="blurred_source" in2="disp_map" scale="0" xChannelSelector="R" yChannelSelector="G" result="displaced" />
        <feColorMatrix in="displaced" type="saturate" values="4" result="displaced_sat" />
        <feImage id="lg-pill-spec" href="" result="spec_layer" />
        <feComposite in="displaced_sat" in2="spec_layer" operator="in" result="spec_masked" />
        <feComponentTransfer in="spec_layer" result="spec_faded">
          <feFuncA type="linear" slope="0.4" />
        </feComponentTransfer>
        <feBlend in="spec_masked" in2="displaced" mode="normal" result="with_sat" />
        <feBlend in="spec_faded" in2="with_sat" mode="normal" />
      </filter>
    </defs>
  </svg>

  <script src="./pill.js"></script>
</body>
</html>
````

Note: the `<feDisplacementMap scale="0">` starts at 0 because the disp_map href is empty until `pill.js` runs; `pill.js` will overwrite this attribute with the real scale value. Same logic for the other `<feImage>` href attributes.

- [ ] **Step 3: Write `pill.css`**

Path: `/Users/strange616/code/prototypes/liquid-glass-pill/pill.css`. Content:

````css
:root {
  --pill-w: 480px;
  --pill-h: 52px;
  --pill-r: 26px;
  --pill-tint: rgba(255, 255, 255, 0.06);
  --pill-inner-shadow: inset 0 0 12px -3px rgba(255, 255, 255, 0.6);
  --pill-outer-shadow: 0 18px 30px -10px rgba(0, 0, 0, 0.35);
  --pill-bg-url: url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop');

  /* Refraction tunables — read by pill.js via getComputedStyle. Edit here,
     not in JS. Unitless because pill.js does parseFloat() and uses them as
     plain numbers. */
  --lg-thickness: 30;
  --lg-bezel: 10;
  --lg-ior: 1.5;
}

* { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-weight: 300;
  color: #1c1c1e;
  background: #f5f5f7;
}

/* Pill: positioning + frosted-glass fallback that works in Safari + Firefox */
.lg-pill {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: var(--pill-w);
  height: var(--pill-h);
  border-radius: var(--pill-r);
  background: var(--pill-tint);
  box-shadow: var(--pill-inner-shadow), var(--pill-outer-shadow);

  /* Frosted-glass fallback */
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  backdrop-filter: blur(20px) saturate(1.5);

  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  z-index: 100;
}

/* Real refractive lens — Chromium only (overrides the blur fallback) */
@supports (backdrop-filter: url(#lg-pill-filter)) {
  .lg-pill {
    backdrop-filter: url(#lg-pill-filter);
  }
}

.lg-pill__brand {
  font-weight: 600;
  font-size: 15px;
  text-decoration: none;
  color: #1c1c1e;
  letter-spacing: 0.02em;
}

.lg-pill__nav {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 18px;
}

.lg-pill__nav a {
  font-size: 13px;
  text-decoration: none;
  color: #1c1c1e;
  opacity: 0.85;
}

.lg-pill__nav a:hover { opacity: 1; }

/* Hero with fixed background — gives the pill a colorful backdrop to refract */
.hero {
  height: 100vh;
  background: var(--pill-bg-url) center/cover no-repeat fixed;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: white;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.4);
}

.hero h1 {
  font-size: clamp(36px, 6vw, 72px);
  font-weight: 200;
  margin: 0;
}

.hero__tagline {
  font-size: 18px;
  margin-top: 8px;
  opacity: 0.9;
}

/* Page sections */
.page-section {
  padding: 80px 24px;
  max-width: 800px;
  margin: 0 auto;
}

.page-section--alt {
  background: #ffffff;
  max-width: 100%;
  margin: 0;
  padding: 80px 24px;
}

.page-section--alt > * { max-width: 800px; margin-left: auto; margin-right: auto; }

.page-section h2 {
  font-size: 36px;
  font-weight: 300;
  margin-top: 0;
}

.page-section p {
  line-height: 1.7;
  font-size: 16px;
  margin-bottom: 1em;
}
````

- [ ] **Step 4: Verify the page loads as frosted glass (no JS yet)**

Run a quick local server check:
```bash
cd /Users/strange616/code/prototypes/liquid-glass-pill
python3 -m http.server 8766 &
SERVER_PID=$!
sleep 1
curl -fsI http://localhost:8766/ | head -1
curl -fsI http://localhost:8766/pill.css | head -1
kill $SERVER_PID
```
Expected: both `HTTP/1.0 200 OK`. (The pill.js 404 is expected at this stage — we haven't written it yet. We'll smoke-test the rendered look in Task 5.)

- [ ] **Step 5: Stage (do NOT commit)**

```bash
cd /Users/strange616/code/prototypes
git add liquid-glass-pill/index.html liquid-glass-pill/pill.css
git status --short
```
Expected: `A  liquid-glass-pill/index.html` and `A  liquid-glass-pill/pill.css`.

---

## Task 2: pill.js — height function + refraction profile + displacement map

**Files:**
- Create: `prototypes/liquid-glass-pill/pill.js`

This task implements the core math. After this task, `pill.js` writes a generated displacement-map data URL into the `<feImage id="lg-pill-disp">` and sets the `<feDisplacementMap scale>` to a real value, but does NOT yet write the specular map. So opening the page in Chromium will show the refraction effect partially (no specular highlights).

The math comes from Chris Feijoo's blog post (https://kube.io/blog/liquid-glass-css-svg) and standard graphics-textbook treatment of Snell's law:

- A **height function** `h(t)` for `t ∈ [0, 1]` describes the glass surface from outer rim (`t=0`, height 0) to flat top (`t=1`, full thickness). We use a *convex squircle*: `h(t) = (1 - (1-t)^4)^(1/4)`.
- For each `t`, derive the local **slope** numerically: `dh/dt ≈ (h(t + ε) - h(t)) / ε`. Use a backward delta at `t = 1` since the height plateaus there.
- The **surface normal** at each sample is the unit vector `n̂ = (-deriv, -1) / |(-deriv, -1)|`.
- **Snell's law in vector form** (the standard GLSL `refract` specialized to a downward incident ray): given `eta = 1/n`, compute `k = 1 - eta² · (1 - n̂_y²)`. If `k < 0`, total internal reflection — the ray doesn't refract through; record displacement 0. Otherwise the refracted ray is `r = (-(eta · n̂_y + √k) · n̂_x, eta - (eta · n̂_y + √k) · n̂_y)`.
- The **lateral displacement** at this sample is `r_x · (h · bezelWidth + thickness) / r_y` — the refracted ray's horizontal exit offset over the path length through the glass.
- We compute this for 128 samples to build a 1D *refraction profile*. Then we rasterize that 1D profile around the rounded-rectangle boundary: for each pixel inside the bezel band, we compute its distance from the nearest corner-center, look up the displacement at that distance, and write `(R, G) = (-cos(angle) × displacement, -sin(angle) × displacement)` into a 2D RGB canvas (centered around 128, normalized so the largest absolute displacement maps to ±127).

- [ ] **Step 1: Create `pill.js` with the math primitives**

Path: `/Users/strange616/code/prototypes/liquid-glass-pill/pill.js`. Content:

````javascript
/**
 * Liquid-glass technique by Chris Feijoo (kube.io).
 * Refraction approach explained at https://kube.io/blog/liquid-glass-css-svg.
 * Implementation here is original.
 */
(function () {
  'use strict';

  // --- Math primitives -------------------------------------------------------

  // Convex-squircle height function: maps t ∈ [0, 1] to surface height ∈ [0, 1].
  // t = 0 at outer rim (height 0), t = 1 at flat top (full thickness).
  function heightAt(t) {
    return Math.pow(1 - Math.pow(1 - t, 4), 0.25);
  }

  /**
   * Snell's law in vector form. Given a unit-length surface normal (nx, ny)
   * pointing outward from the glass and the index of refraction `ior`,
   * returns the refracted ray as [rx, ry], or null on total internal
   * reflection (k < 0).
   *
   * Setup: incident ray is straight down (0, -1). The standard GLSL `refract`
   * specializes to this expression for that incident direction.
   */
  function refractRay(nx, ny, ior) {
    const eta = 1 / ior;
    const dot = ny;
    const k = 1 - eta * eta * (1 - dot * dot);
    if (k < 0) return null;
    const sq = Math.sqrt(k);
    return [-(eta * dot + sq) * nx, eta - (eta * dot + sq) * ny];
  }

  /**
   * Build a 1D refraction profile by tracing a refracted ray at each
   * sample point along the bezel surface. Vector refraction; handles total
   * internal reflection by zeroing the displacement at that sample.
   *
   * @param {number} thickness  - glass thickness in px (vertical dimension)
   * @param {number} bezelWidth - bezel width in px (horizontal extent of the slope)
   * @param {number} ior        - refractive index, e.g. 1.5
   * @param {number} samples    - number of sample points (default 128)
   * @returns {Float64Array}    - profile[i] = displacement at t = i/samples
   */
  function buildRefractionProfile(thickness, bezelWidth, ior, samples) {
    samples = samples || 128;
    const profile = new Float64Array(samples);
    for (let i = 0; i < samples; i++) {
      const t = i / samples;
      const y = heightAt(t);
      // Forward delta everywhere except the last sample (avoids a near-zero
      // denominator since the height function plateaus at t = 1).
      const dt = t < 1 ? 0.0001 : -0.0001;
      const y2 = heightAt(t + dt);
      const deriv = (y2 - y) / dt;
      const mag = Math.sqrt(deriv * deriv + 1);
      // Surface normal: tilts horizontally as the slope steepens.
      const nx = -deriv / mag;
      const ny = -1 / mag;
      const ref = refractRay(nx, ny, ior);
      if (!ref) {
        profile[i] = 0;
        continue;
      }
      // Lateral exit offset: refracted ray's horizontal component scaled
      // by path length through the glass divided by its vertical component.
      profile[i] = ref[0] * ((y * bezelWidth + thickness) / ref[1]);
    }
    return profile;
  }

  // Will be exported / used in next steps:
  window.__lgPill = { heightAt, refractRay, buildRefractionProfile };
})();
````

The `window.__lgPill` export is only for inspection/debugging; the IIFE pattern will be cleaned up in the next step once we have a single `init()` entry point.

- [ ] **Step 2: Verify the math primitives by running them in a browser console**

Run:
```bash
cd /Users/strange616/code/prototypes/liquid-glass-pill
python3 -m http.server 8766 &
SERVER_PID=$!
sleep 1
```

Open `http://localhost:8766/` in Chrome. In the DevTools console, run:
```js
const lg = window.__lgPill;
console.log('heightAt(0) =', lg.heightAt(0), '(expected: 0 exactly)');
console.log('heightAt(1) =', lg.heightAt(1), '(expected: 1 exactly)');
console.log('heightAt(0.5) =', lg.heightAt(0.5), '(expected: ~0.987 — bulges fast)');
const profile = lg.buildRefractionProfile(30, 10, 1.5, 128);
console.log('profile[0] =', profile[0], '(expected: large positive, ~30-35 — bezel slope is steep at outer rim)');
console.log('profile[64] =', profile[64], '(expected: small positive, ~1-3 — slope gentle near top)');
console.log('profile[127] =', profile[127], '(expected: very small, approaching 0)');
console.log('profile decreases from rim → top:',
  profile[0] > profile[64] && profile[64] > profile[127],
  '(expected: true)');
console.log('refractRay handles total internal reflection:',
  lg.refractRay(0.99, -0.01, 1.5),
  '(expected: an [rx, ry] array, NOT null — n=1.5 doesn\'t TIR with this normal)');
```

Then `kill $SERVER_PID`.

Expected: `heightAt(0) === 0` exactly, `heightAt(1) === 1` exactly, `heightAt(0.5) ≈ 0.987`. The profile decreases monotonically from `profile[0]` (largest, ~30s) to `profile[127]` (near 0). If `profile[0]` is near zero or negative, the surface-normal sign is wrong; if all entries are NaN, the height function is broken. Debug before continuing.

- [ ] **Step 3: Add the displacement-map rasterizer**

Replace the contents of `pill.js` with the following (everything from Step 1 stays, plus a new `generateDisplacementMap` function):

````javascript
/**
 * Liquid-glass technique by Chris Feijoo (kube.io).
 * Refraction approach explained at https://kube.io/blog/liquid-glass-css-svg.
 * Implementation here is original.
 */
(function () {
  'use strict';

  // --- Math primitives -------------------------------------------------------

  function heightAt(t) {
    return Math.pow(1 - Math.pow(1 - t, 4), 0.25);
  }

  function refractRay(nx, ny, ior) {
    const eta = 1 / ior;
    const dot = ny;
    const k = 1 - eta * eta * (1 - dot * dot);
    if (k < 0) return null;
    const sq = Math.sqrt(k);
    return [-(eta * dot + sq) * nx, eta - (eta * dot + sq) * ny];
  }

  function buildRefractionProfile(thickness, bezelWidth, ior, samples) {
    samples = samples || 128;
    const profile = new Float64Array(samples);
    for (let i = 0; i < samples; i++) {
      const t = i / samples;
      const y = heightAt(t);
      const dt = t < 1 ? 0.0001 : -0.0001;
      const y2 = heightAt(t + dt);
      const deriv = (y2 - y) / dt;
      const mag = Math.sqrt(deriv * deriv + 1);
      const nx = -deriv / mag;
      const ny = -1 / mag;
      const ref = refractRay(nx, ny, ior);
      if (!ref) {
        profile[i] = 0;
        continue;
      }
      profile[i] = ref[0] * ((y * bezelWidth + thickness) / ref[1]);
    }
    return profile;
  }

  // --- Displacement-map rasterizer ------------------------------------------

  /**
   * Rasterize the refraction profile as a 2D PNG data URL the SVG
   * <feDisplacementMap> can consume.
   *
   * Output channels: R = horizontal displacement, G = vertical displacement,
   * both centered around 128 (so 128 = no shift; 0 = max negative shift;
   * 255 = max positive shift).
   *
   * @param {number} w      - canvas width in px (= pill width)
   * @param {number} h      - canvas height in px (= pill height)
   * @param {number} radius - corner radius in px
   * @param {number} bezelWidth - bezel width in px
   * @param {Float64Array} profile - 1D refraction profile
   * @param {number} maxDisp - max absolute value in profile (for normalization)
   * @returns {string} data URL
   */
  function generateDisplacementMap(w, h, radius, bezelWidth, profile, maxDisp) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(w, h);
    const data = img.data;

    // Initialize entire canvas to "no shift": R=128, G=128, B=0, A=255
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 128;
      data[i + 1] = 128;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }

    const r = radius;
    const rSq = r * r;
    const r1Sq = (r + 1) * (r + 1);
    const rBSq = Math.max(r - bezelWidth, 0) * Math.max(r - bezelWidth, 0);
    const wB = w - r * 2;
    const hB = h - r * 2;
    const samples = profile.length;

    // For each pixel, find the nearest corner center and compute distance.
    // Pixels inside the bezel band (between r-bezelWidth and r) get a non-zero
    // displacement looked up from the profile.
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        // Map pixel to corner-relative coords: distance from the nearest corner center.
        const x = px < r ? px - r : (px >= w - r ? px - r - wB : 0);
        const y = py < r ? py - r : (py >= h - r ? py - r - hB : 0);
        const dSq = x * x + y * y;

        if (dSq > r1Sq || dSq < rBSq) continue;

        const dist = Math.sqrt(dSq);
        if (dist === 0) continue;

        const fromSide = r - dist;
        // Anti-alias edge: opacity tapers from 1 inside the rect to 0 just past it.
        const op = dSq < rSq ? 1 : 1 - (dist - Math.sqrt(rSq)) / (Math.sqrt(r1Sq) - Math.sqrt(rSq));
        if (op <= 0) continue;

        const t = Math.max(0, Math.min(1, fromSide / bezelWidth));
        const sampleIdx = Math.min((t * samples) | 0, samples - 1);
        const disp = profile[sampleIdx] || 0;

        const cos = x / dist;
        const sin = y / dist;
        const dX = (-cos * disp) / maxDisp;
        const dY = (-sin * disp) / maxDisp;

        const idx = (py * w + px) * 4;
        data[idx] = Math.round(128 + dX * 127 * op);
        data[idx + 1] = Math.round(128 + dY * 127 * op);
      }
    }

    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL();
  }

  // --- Helpers --------------------------------------------------------------

  function readCssNumber(el, prop, fallback) {
    const raw = getComputedStyle(el).getPropertyValue(prop).trim();
    const v = parseFloat(raw);
    return Number.isFinite(v) ? v : fallback;
  }

  // --- Init -----------------------------------------------------------------

  /**
   * Idempotent: safe to call multiple times (resize handler relies on this).
   * On any failure (canvas init, DOM access), logs a warning and leaves the
   * frosted-glass fallback active so the pill is still visible.
   */
  function init() {
    const pill = document.getElementById('lg-pill');
    if (!pill) return;

    try {
      const styles = getComputedStyle(pill);
      const w = parseFloat(styles.width);
      const h = parseFloat(styles.height);
      const radius = parseFloat(styles.borderRadius);

      // Tunable params come from CSS custom properties on :root so they can
      // be edited in pill.css without touching JS. Defaults if a prop is missing.
      const root = document.documentElement;
      const thickness = readCssNumber(root, '--lg-thickness', 30);
      const bezelWidth = readCssNumber(root, '--lg-bezel', 10);
      const ior = readCssNumber(root, '--lg-ior', 1.5);
      const samples = 128;

      const clampedBezel = Math.min(bezelWidth, radius - 1, Math.min(w, h) / 2 - 1);
      const profile = buildRefractionProfile(thickness, clampedBezel, ior, samples);
      const maxDisp = Math.max(...Array.from(profile).map(Math.abs)) || 1;

      const dispUrl = generateDisplacementMap(w, h, radius, clampedBezel, profile, maxDisp);

      const dispEl = document.getElementById('lg-pill-disp');
      if (dispEl) {
        dispEl.setAttribute('href', dispUrl);
        // Position and size the feImage so it covers the pill exactly:
        dispEl.setAttribute('width', String(w));
        dispEl.setAttribute('height', String(h));
      }

      // Update <feDisplacementMap scale> so the displacement is actually applied.
      const dispMapEl = document.querySelector('#lg-pill-filter feDisplacementMap');
      if (dispMapEl) {
        dispMapEl.setAttribute('scale', String(maxDisp));
      }

      // Expose for debugging.
      window.__lgPill = { heightAt, refractRay, buildRefractionProfile, generateDisplacementMap, init };
    } catch (err) {
      console.warn('liquid-glass-pill: filter generation failed; frosted-glass fallback remains active.', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
````

- [ ] **Step 4: Visual verification — Chromium shows refraction at the rim**

Run:
```bash
cd /Users/strange616/code/prototypes/liquid-glass-pill
python3 -m http.server 8766 &
SERVER_PID=$!
sleep 1
```

Open `http://localhost:8766/` in Chrome. The pill should now show *some* refraction (the bezel area visibly bends the underlying hero image, even without specular highlights). The flat center of the pill should look unrefracted (logo and nav text readable as before).

In the DevTools console, sanity-check:
```js
const disp = document.getElementById('lg-pill-disp');
console.log('disp href starts with data:image/png?', disp.getAttribute('href').slice(0, 22));
console.log('disp scale:', document.querySelector('#lg-pill-filter feDisplacementMap').getAttribute('scale'));
```
Expected: `data:image/png` and a numeric scale > 0.

**Programmatic pixel assertion** — verify the center of the displacement map is the "no-shift" sentinel `(R, G, B, A) = (128, 128, 0, 255)`. Run this in the same console:
```js
(async () => {
  const pill = document.getElementById('lg-pill');
  const w = parseFloat(getComputedStyle(pill).width);
  const h = parseFloat(getComputedStyle(pill).height);
  const dispUrl = document.getElementById('lg-pill-disp').getAttribute('href');
  const probe = new Image();
  await new Promise(r => { probe.onload = r; probe.src = dispUrl; });
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const cctx = c.getContext('2d');
  cctx.drawImage(probe, 0, 0);
  const center = cctx.getImageData((w / 2) | 0, (h / 2) | 0, 1, 1).data;
  console.log('center pixel:', [...center], '(expected: [128, 128, 0, 255] — flat-top region has no displacement)');
})();
```
Expected: `[128, 128, 0, 255]`. If the center pixel is anything else, the displacement map's flat-region initialization is wrong and the pill's center will visibly shift the backdrop. Debug before continuing.

Then `kill $SERVER_PID`.

If the pill shows NO refraction (looks identical to the frosted-glass fallback): check `@supports` rule in `pill.css` is matching, and that `disp.getAttribute('href')` is a long base64 string (not empty).

- [ ] **Step 5: Stage (do NOT commit)**

```bash
cd /Users/strange616/code/prototypes
git add liquid-glass-pill/pill.js
git status --short
```
Expected: `A  liquid-glass-pill/pill.js` added to the staged set.

---

## Task 3: pill.js — specular map + resize handling

**Files:**
- Modify: `prototypes/liquid-glass-pill/pill.js`

After this task, the pill is fully functional: refraction + specular highlights, and resizing the window gracefully re-runs the filter generation if the pill's computed dimensions change.

- [ ] **Step 1: Add `generateSpecularMap` to `pill.js`**

Edit `pill.js`. Insert this function immediately after `generateDisplacementMap`, before the `// --- Init ---` comment:

````javascript
/**
 * Rasterize a specular highlight map: a directional rim-light that brightens
 * the bezel where the surface normal aligns with a fixed light direction.
 *
 * Output: grayscale (R=G=B=col, A=col*coeff*op) so the SVG filter chain can
 * use this as the spec_layer in <feComposite>.
 *
 * @param {number} w - canvas width
 * @param {number} h - canvas height
 * @param {number} radius - corner radius
 * @param {number} bezelWidth - bezel width (in px), or a fattening multiplier of bezel
 * @param {number} angle - light direction angle in radians (default π/3)
 * @returns {string} data URL
 */
function generateSpecularMap(w, h, radius, bezelWidth, angle) {
  angle = angle != null ? angle : Math.PI / 3;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  const data = img.data;
  data.fill(0);

  const r = radius;
  const rSq = r * r;
  const r1Sq = (r + 1) * (r + 1);
  const rBSq = Math.max(r - bezelWidth, 0) * Math.max(r - bezelWidth, 0);
  const wB = w - r * 2;
  const hB = h - r * 2;
  const lightX = Math.cos(angle);
  const lightY = Math.sin(angle);

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const x = px < r ? px - r : (px >= w - r ? px - r - wB : 0);
      const y = py < r ? py - r : (py >= h - r ? py - r - hB : 0);
      const dSq = x * x + y * y;
      if (dSq > r1Sq || dSq < rBSq) continue;
      const dist = Math.sqrt(dSq);
      if (dist === 0) continue;
      const fromSide = r - dist;
      const op = dSq < rSq ? 1 : 1 - (dist - Math.sqrt(rSq)) / (Math.sqrt(r1Sq) - Math.sqrt(rSq));
      if (op <= 0) continue;

      const cos = x / dist;
      const sin = -y / dist;
      const dot = Math.abs(cos * lightX + sin * lightY);
      const edge = Math.sqrt(Math.max(0, 1 - (1 - fromSide) * (1 - fromSide)));
      const coeff = dot * edge;
      const col = (255 * coeff) | 0;
      const alpha = (col * coeff * op) | 0;
      const idx = (py * w + px) * 4;
      data[idx] = col;
      data[idx + 1] = col;
      data[idx + 2] = col;
      data[idx + 3] = alpha;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}
````

- [ ] **Step 2: Wire the specular map into the filter inside `init()`**

In `init()`, after the block that sets `dispEl.setAttribute(...)` and the `dispMapEl.setAttribute('scale', ...)`, add:

````javascript
// Specular map — slightly fattened bezel for a softer highlight band.
const specBezel = clampedBezel * 2.5;
const specUrl = generateSpecularMap(w, h, radius, specBezel);
const specEl = document.getElementById('lg-pill-spec');
if (specEl) {
  specEl.setAttribute('href', specUrl);
  specEl.setAttribute('width', String(w));
  specEl.setAttribute('height', String(h));
}
````

- [ ] **Step 3: Add a debounced resize handler at MODULE scope**

The resize listener must be registered exactly ONCE — not inside `init()`. If you call `init()` from inside the resize handler (which is the design — it's idempotent), but ALSO register the listener inside `init()`, every resize accumulates another listener and the next resize fires N+1 times.

Find the bottom of `pill.js`, right above the `if (document.readyState === 'loading') { ... }` block. Insert this:

````javascript
// Resize handler — registered once at module scope. init() is idempotent so
// calling it on every resize replaces the existing maps in place.
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(init, 100);
});
````

After this insertion, the bottom of `pill.js` should look like:

```javascript
// ... (specular-map function from Step 1, init() updated in Step 2) ...

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(init, 100);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
})();
```

No `lastW/lastH/lastR` early-exit needed: `init()` is cheap (~5 ms on a 480×52 pill), and Canvas 2D `getImageData` round-trips dominate either way. Keeping the resize handler trivial means fewer chances of stale-state bugs.

- [ ] **Step 4: Visual verification**

Run a local server:
```bash
cd /Users/strange616/code/prototypes/liquid-glass-pill
python3 -m http.server 8766 &
SERVER_PID=$!
sleep 1
```

Open `http://localhost:8766/` in Chrome. Verify:
- Pill shows the full refraction effect (bezel bends the backdrop).
- Pill has a visible specular highlight along the rim (a soft bright band).
- Click each nav anchor — page smooth-scrolls to the corresponding section.
- Resize the window: pill stays centered; refraction continues to work.

In the DevTools console:
```js
const spec = document.getElementById('lg-pill-spec');
console.log('spec href is data url?', spec.getAttribute('href').startsWith('data:image/png'));
```
Expected: `true`.

`kill $SERVER_PID`.

- [ ] **Step 5: Stage (do NOT commit)**

```bash
cd /Users/strange616/code/prototypes
git add liquid-glass-pill/pill.js
git status --short
```
Expected: `pill.js` shows as `M` if it was previously staged (Task 2) or `A` if it's a fresh staged change.

---

## Task 4: ASTRO-PORT.md — porting guide

**Files:**
- Create: `prototypes/liquid-glass-pill/ASTRO-PORT.md`

This is a documentation-only task. Write the markdown file with all 9 sections specified in the spec.

- [ ] **Step 1: Write `ASTRO-PORT.md`**

Path: `/Users/strange616/code/prototypes/liquid-glass-pill/ASTRO-PORT.md`. Content (literal — write verbatim):

````markdown
# Porting the Liquid-Glass Pill into Astro Components

This guide covers turning the `liquid-glass-pill/` prototype into a reusable Astro component you can drop into any layout. The technique itself is by Chris Feijoo (kube.io); this implementation is original code based on the published technique. Reference: https://kube.io/blog/liquid-glass-css-svg.

## 1. What you're porting

A fixed-position rounded-rectangle "pill" that uses an SVG `<feDisplacementMap>` filter (in Chromium) or `backdrop-filter: blur()` (everywhere else) to overlay refractive/frosted-glass chrome on whatever scrolls underneath. The displacement-map image is generated client-side at runtime via Canvas 2D, so the script must be hydrated client-side — `canvas.toDataURL()` does not exist in SSR.

## 2. File split

```
src/components/LiquidGlassPill.astro    — markup + scoped styles + <script>
src/layouts/Layout.astro                — root layout that hosts the singleton <svg><defs>
```

Two files because the filter `<defs>` should be a singleton — instantiated once at the layout level, not per-component-instance, to avoid duplicate filter IDs if multiple pills ever appear on the same page.

## 3. Component API

```astro
---
// LiquidGlassPill.astro
interface Props {
  links: { label: string; href: string }[];
  width?: number;       // default 480
  height?: number;      // default 52
  radius?: number;      // default 26
  bezel?: number;       // default 10
  ior?: number;         // default 1.5
  thickness?: number;   // default 30
  tint?: number;        // default 0.06
  brand?: string;       // default 'Brand'
  filterId?: string;    // default 'lg-pill-filter' — must be globally unique
}
const {
  links,
  width = 480,
  height = 52,
  radius = 26,
  bezel = 10,
  ior = 1.5,
  thickness = 30,
  tint = 0.06,
  brand = 'Brand',
  filterId = 'lg-pill-filter',
} = Astro.props;
---
```

## 4. Why the script must run client-side

The displacement-map and specular-map are generated by:

```js
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
// ... fill imageData ...
canvas.toDataURL();
```

`document`, `window`, and Canvas 2D do not exist during SSR. In an `.astro` component (Astro 4.x), a `<script>` tag is processed by Vite and bundled into a client-side ES module that runs once on page load. You do NOT add a `client:*` directive — those are specifically for *framework islands* (React/Vue/Svelte/Solid components), not for plain `.astro` components. Put the JS inside a `<script>` tag at the bottom of the component template:

```astro
<script>
  // Same code as pill.js — runs once on page load.
  // ...
</script>
```

If you need the script to run before any other client-side code (rare for this use case), use `<script is:inline>` to opt out of bundling and emit a literal inline `<script>` in the rendered HTML — but that bypasses Vite's transforms and you lose imports. The default behavior is what you want here.

Reference: https://docs.astro.build/en/guides/client-side-scripts/ (verify against the Astro version your portfolio uses; this guide assumes Astro 4.x).

## 5. CSS scoping

Astro auto-scopes CSS in `<style>` blocks. Pill styles work as-is when copied from `pill.css` into `<style>` inside `LiquidGlassPill.astro`. The two exceptions:

- **CSS custom properties** (`--pill-w`, `--pill-h`, etc.) need to be set on the component's host element, ideally derived from the `Props` so that prop changes propagate. Use Astro's `style` attribute with template interpolation:
  ```astro
  <nav class="lg-pill" style={`--pill-w: ${width}px; --pill-h: ${height}px; --pill-r: ${radius}px;`}>
  ```
- **The filter ID** referenced in `backdrop-filter: url(#lg-pill-filter)` is a global SVG element ID, NOT a CSS class — Astro's CSS scoping doesn't touch it. **For a single pill on the page**, hardcoding `#lg-pill-filter` works fine. **For multiple pills on the same page**, naming the filter via a CSS variable + `url(var(--x))` is *not* reliably supported across browsers — `backdrop-filter: url(...)` typically requires a literal `#fragment` reference. The robust workaround is to inject a per-instance `<style>` block at runtime, after you create the per-instance `<filter>` element (see section 7):

  ```js
  // In LiquidGlassPill.astro's <script>, after creating <filter id={filterId}>:
  const inst = document.createElement('style');
  inst.textContent = `
    @supports (backdrop-filter: url(#${filterId})) {
      .lg-pill[data-filter-id="${filterId}"] { backdrop-filter: url(#${filterId}); }
    }
  `;
  document.head.appendChild(inst);
  ```

  Then mark each pill instance with a `data-filter-id` attribute matching its `filterId` prop. This keeps the per-instance style outside Astro's static CSS pipeline (which can't expand IDs in `url()`).

  For the single-pill case, none of this is needed — the prototype's static CSS is fine as-is.

## 6. SSR/client hydration order

The `<svg><filter>` markup renders on the server with empty `<feImage href="">` attributes. The client `<script>` runs after `DOMContentLoaded`, generates the canvases, sets the `href` attributes. Until the script runs (typically tens of ms after first paint), the pill renders as the frosted-glass fallback, NOT as a flat shape — because the `@supports` query for `backdrop-filter: url(#x)` won't match yet (or matches but applies a no-op filter), so `backdrop-filter: blur(...) saturate(...)` from the unsupported branch wins.

For a portfolio header, this <100 ms unfiltered → frosted → refractive transition is invisible to most users. If it bothers you, the script can be inlined and run synchronously, but at the cost of blocking initial paint — usually not worth it.

## 7. Singleton SVG `<defs>` placement

In `Layout.astro`, right after `<body>`:

```astro
<svg width="0" height="0" style="position:absolute;overflow:hidden" aria-hidden="true">
  <defs id="liquid-glass-defs"></defs>
</svg>
<slot />
```

`LiquidGlassPill.astro`'s client script, on init, creates a `<filter>` element with the component's `filterId` and appends it to `#liquid-glass-defs` — instead of including the `<filter>` markup in the component itself. This way, multiple pills on the same page each get their own filter, and the SVG `<defs>` block stays a singleton.

```js
// In LiquidGlassPill.astro's <script>:
const defs = document.getElementById('liquid-glass-defs');
const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
filter.id = filterId;
filter.setAttribute('color-interpolation-filters', 'sRGB');
filter.innerHTML = `<feGaussianBlur ... />`;  // same primitives as the prototype's <defs>
defs.appendChild(filter);
```

## 8. Drop-in usage example

```astro
---
// src/pages/index.astro
import Layout from '../layouts/Layout.astro';
import LiquidGlassPill from '../components/LiquidGlassPill.astro';

const links = [
  { label: 'Home', href: '#home' },
  { label: 'Work', href: '#work' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];
---
<Layout title="My Portfolio">
  <LiquidGlassPill {links} brand="Tanel" />
  <main>
    <section id="home"><!-- ... --></section>
    <section id="work"><!-- ... --></section>
    <section id="about"><!-- ... --></section>
    <section id="contact"><!-- ... --></section>
  </main>
</Layout>
```

## 9. Cross-browser strategy

Chromium gets the full refractive lens; Safari/Firefox get a `backdrop-filter: blur(20px) saturate(1.5)` frosted-glass fallback. The CSS layering:

```css
.lg-pill {
  /* Frosted-glass fallback — Safari, Firefox, Chromium */
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  backdrop-filter: blur(20px) saturate(1.5);
}
@supports (backdrop-filter: url(#lg-pill-filter)) {
  .lg-pill {
    /* Real refractive lens — Chromium only */
    backdrop-filter: url(#lg-pill-filter);
  }
}
```

The `@supports (backdrop-filter: url(#x))` query is best-effort. If it returns `true` in a browser that doesn't actually render SVG filters via `backdrop-filter`, you'll see neither the lens nor the blur — a flat translucent pill. If you encounter that in a real browser version, switch to a JS-based feature detect (e.g., `CSS.supports('(backdrop-filter: url(#test))')` plus a UA sniff for the known-broken combination) and toggle a `.no-svg-filter` class on `<html>` to force the blur path.

## What this guide does NOT cover

- Mobile-first responsive design (the prototype is desktop-only).
- Reduced-motion fallback (consider adding `@media (prefers-reduced-motion: reduce) { .lg-pill { backdrop-filter: blur(20px); } }` to disable the heavier SVG filter).
- Accessibility audit of the pill as a navigation landmark.
- Bundling `pill.js` as a real ES module instead of an IIFE — fine for the prototype, worth refactoring for production.

These are reasonable next steps once the pill is in your portfolio.
````

- [ ] **Step 2: Stage (do NOT commit)**

```bash
cd /Users/strange616/code/prototypes
git add liquid-glass-pill/ASTRO-PORT.md
git status --short
```
Expected: `A  liquid-glass-pill/ASTRO-PORT.md` added to the staged set.

---

## Task 5: Smoke test in Chrome via MCP + manual cross-browser handoff

**Files:** none modified — read-only verification.

This task verifies the prototype actually works before Task 6's single end-of-pipeline commit. The **implementer** does Steps 1-2 (server up + Chrome MCP smoke); the **controller** does Steps 3-4 (Safari/Firefox manual handoff to the user, then stop server).

- [ ] **Step 1: Start a local HTTP server in the background**

```bash
cd /Users/strange616/code/prototypes/liquid-glass-pill && python3 -m http.server 8767
```

with `run_in_background: true` on the Bash tool call. Capture the bash_id. Sanity-check:
```bash
curl -fsI http://localhost:8767/ | head -1
curl -fsI http://localhost:8767/pill.css | head -1
curl -fsI http://localhost:8767/pill.js | head -1
```
All three: `HTTP/1.0 200 OK`.

- [ ] **Step 2: Smoke test via Chrome MCP**

Load tools: `ToolSearch select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__read_console_messages`

Get tab context, create a new tab, navigate to `http://localhost:8767/`.

**2a — Pill markup + filter wiring:**
```js
({
  pillExists: !!document.getElementById('lg-pill'),
  filterExists: !!document.getElementById('lg-pill-filter'),
  dispHrefIsDataUrl: document.getElementById('lg-pill-disp')?.getAttribute('href')?.startsWith('data:image/png') || false,
  specHrefIsDataUrl: document.getElementById('lg-pill-spec')?.getAttribute('href')?.startsWith('data:image/png') || false,
  dispScale: parseFloat(document.querySelector('#lg-pill-filter feDisplacementMap')?.getAttribute('scale') || '0'),
  navLinkCount: document.querySelectorAll('.lg-pill__nav a').length
})
```
Expected: `pillExists: true`, `filterExists: true`, both data-URL flags `true`, `dispScale > 0`, `navLinkCount === 4`.

**2b — Backdrop-filter actually applied:**
```js
const cs = getComputedStyle(document.getElementById('lg-pill'));
({
  backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter,
  position: cs.position,
  zIndex: cs.zIndex
})
```
Expected: `backdropFilter` contains either `url(...)` (Chromium with `@supports` matching) or `blur(20px) saturate(1.5)` (fallback). `position: fixed`. `zIndex: 100`.

**2c — Smooth-scroll nav:**
```js
(async () => {
  const before = window.scrollY;
  document.querySelector('.lg-pill__nav a[href="#contact"]').click();
  await new Promise(r => setTimeout(r, 800));  // wait for smooth-scroll
  const after = window.scrollY;
  return { scrolled: after > before + 100, before, after };
})()
```
Expected: `scrolled: true`.

**2d — Console health.** Call `mcp__claude-in-chrome__read_console_messages`. No error-level messages. (Cross-origin warnings on the Unsplash image are acceptable.)

- [ ] **Step 2-end: Implementer reports back to controller (server STILL RUNNING)**

In the report, include:
- Output of all four smoke-test JS calls (2a, 2b, 2c, 2d).
- Confirmation that the server is still running on port 8767 (run `curl -fsI http://localhost:8767/ | head -1` one more time).
- Any console warnings worth flagging.

**Do NOT proceed to Step 3 or Step 4** — those are controller-only.

- [ ] **Step 3: Controller asks user to do Safari + Firefox manual check**

Controller prompts the user (in chat) something like:

> The server is running on http://localhost:8767. Please open it in Safari and Firefox and confirm: (1) the pill is visible centered at top, (2) it has the frosted-glass blur effect (NOT a flat translucent rectangle), (3) clicking nav anchors smooth-scrolls. Reply when done.

Wait for user reply. If the user reports any issue, do NOT proceed to Step 4 — escalate to the user for direction.

- [ ] **Step 4: Controller stops the server**

After user confirms cross-browser is OK:
```bash
pkill -f 'http.server 8767'
```
Verify:
```bash
curl -fsI http://localhost:8767/ 2>&1 | head -1
```
Expected: connection refused.

---

## Task 6: Single end-of-pipeline commit + final report

**Files:**
- No new file modifications. This task commits the work staged in Tasks 1–4 in a single commit.

- [ ] **Step 1: Verify the staged set is complete**

```bash
cd /Users/strange616/code/prototypes
git status --short
```

Expected staged set:
- `A  liquid-glass-pill/index.html`
- `A  liquid-glass-pill/pill.css`
- `A  liquid-glass-pill/pill.js`
- `A  liquid-glass-pill/ASTRO-PORT.md`

Plus untracked (which the implementer should `git add`):
- `?? docs/superpowers/plans/2026-05-07-liquid-glass-pill.md`

```bash
git add docs/superpowers/plans/2026-05-07-liquid-glass-pill.md
git status --short
```

Final expected staged set is the four prototype files plus the plan doc.

- [ ] **Step 2: Single commit**

```bash
git commit -m "$(cat <<'EOF'
liquid-glass-pill: header pill prototype with Astro porting guide

Original implementation of an SVG/feDisplacementMap refractive header pill
over a scrollable lorem-ipsum page. Frosted-glass fallback for Safari/Firefox.
Includes ASTRO-PORT.md guide for turning the prototype into a reusable
Astro component. Technique by Chris Feijoo (kube.io); implementation is
original code based on the publicly explained physics.

Spec: docs/superpowers/specs/2026-05-07-liquid-glass-pill-design.md
Plan: docs/superpowers/plans/2026-05-07-liquid-glass-pill.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git log --oneline -3
```

Expected: one new commit on top of `7506292`. Do NOT `git push` unless the user explicitly authorizes it.

- [ ] **Step 3: Hand back to user**

Report:
- File list under `prototypes/liquid-glass-pill/` with sizes.
- Commit SHA and first line of message.
- The local-run command: `cd prototypes/liquid-glass-pill && python3 -m http.server 8000`, with the URL.
- Pointer to `ASTRO-PORT.md` for the next step (porting into the user's Astro portfolio).
- Any follow-up items surfaced during smoke test (e.g., a console warning, a slight visual oddity).

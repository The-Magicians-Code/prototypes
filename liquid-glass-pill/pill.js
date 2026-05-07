/**
 * Liquid-glass technique by Chris Feijoo (kube.io).
 * Refraction approach explained at https://kube.io/blog/liquid-glass-css-svg.
 * Implementation here is original.
 */
(function () {
  'use strict';

  // --- Math primitives -------------------------------------------------------

  /**
   * Convex-squircle height function describing the glass-bezel surface.
   * Maps t ∈ [0, 1] to surface height ∈ [0, 1]: t=0 is the outer rim
   * (height 0); t=1 is the flat top (full thickness). The shape bulges
   * fast near t=0 (vertical tangent) and plateaus near t=1.
   */
  function heightAt(t) {
    return Math.pow(1 - Math.pow(1 - t, 4), 0.25);
  }

  /**
   * Snell's law in vector form. Returns the refracted ray direction for a
   * downward incident ray (0, -1) striking a glass surface with outward
   * unit normal (nx, ny). On total internal reflection (k < 0) returns null.
   *
   * This is the standard GLSL `refract` formula specialized to a vertical
   * incident direction:
   *     η = 1 / ior
   *     I·N = ny  (since the incident direction's components are (0, -1))
   *     k = 1 - η² · (1 - (I·N)²)
   *     refracted = η·I − (η·(I·N) + √k)·N
   *
   * @param {number} nx   - x-component of the unit surface normal
   * @param {number} ny   - y-component of the unit surface normal (negative when pointing up)
   * @param {number} ior  - refractive index of the glass (e.g. 1.5)
   * @returns {[number, number] | null} refracted direction [rx, ry], or null on TIR
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
   * Build a 1D refraction profile by tracing a refracted ray at each radial
   * sample across the bezel surface. The profile entry at index `i` is the
   * lateral displacement (in pixels) that a ray entering above sample
   * `t = i / samples` of the bezel ends up at when it exits the bottom of
   * the glass slab.
   *
   * The lateral exit offset of the refracted ray after travelling vertically
   * through (h·bezelWidth + thickness) px is
   *     offset = ref_x · (h·bezelWidth + thickness) / ref_y
   * where (ref_x, ref_y) is the refracted direction returned by `refractRay`.
   *
   * On total internal reflection the displacement is recorded as 0.
   *
   * @param {number} thickness  - glass thickness in px (vertical dimension of the slab)
   * @param {number} bezelWidth - bezel width in px (horizontal extent of the slope)
   * @param {number} ior        - refractive index, e.g. 1.5
   * @param {number} [samples]  - number of radial sample points (default 128)
   * @returns {Float64Array}    - profile[i] = lateral displacement at t = i/samples
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
      // Surface normal points up-and-out; it tilts horizontally as the slope steepens.
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
   * Two effects are layered:
   *   - **Phase 1: uniform slab shift** — every pixel inside the pill area
   *     gets a constant R offset, modeling a tilted-slab refraction across
   *     the whole pill (the Apple "Liquid Glass" look).
   *   - **Phase 2: bezel rim curl** — pixels in the bezel band overwrite
   *     phase 1 with the per-pixel refraction profile combined with the
   *     uniform offset (kube.io-style magnifying-glass curl).
   *
   * @param {number} w               - canvas width in px (= pill width)
   * @param {number} h               - canvas height in px (= pill height)
   * @param {number} radius          - corner radius in px
   * @param {number} bezelWidth      - bezel width in px
   * @param {Float64Array} profile   - 1D refraction profile (rim curl)
   * @param {number} maxDisp         - max absolute value to normalize against
   * @param {number} uniformShiftPx  - uniform rightward shift in screen px
   *                                    (positive = content visually shifts right)
   * @returns {string} data URL
   */
  function generateDisplacementMap(w, h, radius, bezelWidth, profile, maxDisp, uniformShiftPx) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(w, h);
    const data = img.data;

    const r = radius;
    const rSq = r * r;
    const r1Sq = (r + 1) * (r + 1);                                 // outer (anti-alias) radius squared
    const rBSq = Math.max(r - bezelWidth, 0) * Math.max(r - bezelWidth, 0); // inner bezel boundary squared
    const wB = w - r * 2;                                           // straight-edge width between corners
    const hB = h - r * 2;                                           // straight-edge height between corners
    const samples = profile.length;

    // Encoded uniform-slab offset for the R (horizontal) channel.
    // feDisplacementMap decoder is `Δx = scale · (R/255 − 0.5)`, so to get a
    // visible shift of `uniformShiftPx` to the RIGHT, we want Δx = −uniformShiftPx
    // (output reads from source to the left → content appears further right).
    // That requires R offset = −uniformShiftPx · 255 / scale (using full byte
    // range, not the half-range `* 127` that the rim curl uses).
    const uniformR = -((uniformShiftPx || 0) / maxDisp) * 255;

    // Phase 1 — initialize: pixels INSIDE the pill get the uniform-slab offset;
    // pixels OUTSIDE get the no-shift sentinel (128, 128, 0, 255).
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        // Sample at pixel CENTER (+0.5) rather than pixel corner. This makes
        // both the left and right rims sit at dist = r − 0.5 instead of one
        // at r and the other at r − 1, which would bias the lens magnitude
        // asymmetrically on even-width pills.
        const cx = px + 0.5, cy = py + 0.5;
        const x = cx < r ? cx - r : (cx >= w - r ? cx - r - wB : 0);
        const y = cy < r ? cy - r : (cy >= h - r ? cy - r - hB : 0);
        const dSq = x * x + y * y;
        const idx = (py * w + px) * 4;
        const insidePill = dSq <= rSq;
        data[idx] = 128 + (insidePill ? Math.round(uniformR) : 0);
        data[idx + 1] = 128;
        data[idx + 2] = 0;
        data[idx + 3] = 255;
      }
    }

    // Phase 2 — rim curl: combine the bezel refraction profile ON TOP of the
    // uniform offset. Pixels in the bezel band overwrite phase 1's value with
    // (uniform + curl) clamped to byte range.
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        // Sample at pixel CENTER (+0.5) rather than pixel corner. This makes
        // both the left and right rims sit at dist = r − 0.5 instead of one
        // at r and the other at r − 1, which would bias the lens magnitude
        // asymmetrically on even-width pills.
        const cx = px + 0.5, cy = py + 0.5;
        const x = cx < r ? cx - r : (cx >= w - r ? cx - r - wB : 0);
        const y = cy < r ? cy - r : (cy >= h - r ? cy - r - hB : 0);
        const dSq = x * x + y * y;

        if (dSq > r1Sq || dSq < rBSq) continue;

        const dist = Math.sqrt(dSq);
        if (dist === 0) continue;

        const fromSide = r - dist;
        const op = dSq < rSq ? 1 : 1 - (dist - Math.sqrt(rSq)) / (Math.sqrt(r1Sq) - Math.sqrt(rSq));
        if (op <= 0) continue;

        const t = Math.max(0, Math.min(1, fromSide / bezelWidth));
        const sampleIdx = Math.min((t * samples) | 0, samples - 1);
        const disp = profile[sampleIdx] || 0;

        // Unit direction vector from corner center to this pixel.
        const dirX = x / dist;
        const dirY = y / dist;
        const dX = (-dirX * disp) / maxDisp;
        const dY = (-dirY * disp) / maxDisp;

        // For pixels inside the pill the uniform offset is applied at full
        // strength; in the 1-pixel anti-alias edge it tapers with `op`.
        const baseR = 128 + uniformR * (dSq <= rSq ? 1 : op);
        const idx = (py * w + px) * 4;
        data[idx] = Math.max(0, Math.min(255, Math.round(baseR + dX * 127 * op)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(128 + dY * 127 * op)));
      }
    }

    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL();
  }

  // --- Specular-map rasterizer ----------------------------------------------

  /**
   * Rasterize a specular highlight map: a directional rim-light that brightens
   * the bezel where the surface direction aligns with a fixed light vector.
   *
   * Output is grayscale RGBA (R=G=B=col, A=alpha) where col is `255 · coeff`
   * and alpha is `255 · coeff² · op` — the squared coefficient on alpha is
   * deliberate; it sharpens the specular hot-spot's falloff so the brightest
   * pixels are also the most opaque, while dimmer rim pixels fade out twice
   * as fast. The SVG filter chain composites this as `spec_layer` via
   * `<feComposite>`.
   *
   * Default angle of π/3 (60°) gives a typical product-photography key-light
   * direction (upper-left); override for a different look.
   *
   * @param {number} w           - canvas width in px
   * @param {number} h           - canvas height in px
   * @param {number} radius      - corner radius in px
   * @param {number} bezelWidth  - effective bezel width for the highlight band
   *                                (typically wider than the displacement bezel)
   * @param {number} [angle]     - light direction angle in radians (default π/3 ≈ 60°)
   * @returns {string} PNG data URL
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
    const r1Sq = (r + 1) * (r + 1);                                 // outer (anti-alias) radius squared
    const rBSq = Math.max(r - bezelWidth, 0) * Math.max(r - bezelWidth, 0); // inner bezel boundary squared
    const wB = w - r * 2;                                           // straight-edge width between corners
    const hB = h - r * 2;                                           // straight-edge height between corners
    // Light direction in screen space (Y axis points up, so callers think
    // of angle 0 as "from the right" and π/2 as "from the top").
    const lightX = Math.cos(angle);
    const lightY = Math.sin(angle);

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        // Sample at pixel CENTER (+0.5) rather than pixel corner. This makes
        // both the left and right rims sit at dist = r − 0.5 instead of one
        // at r and the other at r − 1, which would bias the lens magnitude
        // asymmetrically on even-width pills.
        const cx = px + 0.5, cy = py + 0.5;
        const x = cx < r ? cx - r : (cx >= w - r ? cx - r - wB : 0);
        const y = cy < r ? cy - r : (cy >= h - r ? cy - r - hB : 0);
        const dSq = x * x + y * y;
        if (dSq > r1Sq || dSq < rBSq) continue;
        const dist = Math.sqrt(dSq);
        if (dist === 0) continue; // guard against divide-by-zero at exact corner center
        const fromSide = r - dist;
        const op = dSq < rSq ? 1 : 1 - (dist - Math.sqrt(rSq)) / (Math.sqrt(r1Sq) - Math.sqrt(rSq));
        if (op <= 0) continue;

        // Unit vector from corner center to this pixel. Y is flipped because
        // the light vector above uses screen-up = positive, while pixel y
        // counts downward. After this flip both vectors live in the same
        // coordinate system and the dot product is meaningful.
        const dirX = x / dist;
        const dirY = -y / dist;
        const dot = Math.abs(dirX * lightX + dirY * lightY);
        const edge = Math.sqrt(Math.max(0, 1 - (1 - fromSide) * (1 - fromSide)));
        const coeff = dot * edge;
        const col = (255 * coeff) | 0;
        // Alpha squares the coefficient: brightest rim pixels stay fully
        // opaque, mid-rim pixels fade quickly. This makes the highlight read
        // as a sharp specular hot-spot rather than a uniform rim wash.
        const alpha = (255 * coeff * coeff * op) | 0;
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
      // Uniform horizontal slab shift (px), in addition to the rim curl. Apple's
      // "Liquid Glass" reads as a tilted-slab refraction across the whole pill;
      // this adds that uniform offset on top of the kube.io-style bezel curl.
      const uniformShift = readCssNumber(root, '--lg-uniform-shift', 5);
      const samples = 128; // radial profile resolution; 128 is the upstream default

      const clampedBezel = Math.min(bezelWidth, radius - 1, Math.min(w, h) / 2 - 1);
      const profile = buildRefractionProfile(thickness, clampedBezel, ior, samples);
      const maxRimDisp = Math.max(...Array.from(profile).map(Math.abs)) || 1;
      // maxDisp = scale must accommodate the WORST-CASE combined encoding at
      // the rim, where the rim curl (peak ≈ maxRimDisp/2 px) and the uniform
      // shift add. The factor of 2 on uniformShift is because the uniform uses
      // the full `* 255` byte-range encoding, while the rim curl uses `* 127`
      // (half range). This formula keeps the combined R within [0, 255].
      const maxDisp = (maxRimDisp + 2 * Math.abs(uniformShift)) || 1;

      const dispUrl = generateDisplacementMap(w, h, radius, clampedBezel, profile, maxDisp, uniformShift);

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

      // Specular map — uses a fattened bezel band so the highlight extends
      // into the flat top of the pill, giving a softer rim glow rather than
      // a hard ring at the edge. 2.5× chosen empirically to match the
      // highlight breadth in the upstream reference; tune if it looks wrong.
      // Light angle π/2 = straight up. A symmetric (left/right balanced)
      // light direction prevents the rim brightness from creating an
      // asymmetric perception of the converging-lens compression. Override
      // this to π/3 (upper-right) or 2π/3 (upper-left) if you want a
      // directional key-light look.
      const specBezel = clampedBezel * 2.5;
      const specUrl = generateSpecularMap(w, h, radius, specBezel, Math.PI / 2);
      const specEl = document.getElementById('lg-pill-spec');
      if (specEl) {
        specEl.setAttribute('href', specUrl);
        specEl.setAttribute('width', String(w));
        specEl.setAttribute('height', String(h));
      }

      // Expose for debugging.
      window.__lgPill = { heightAt, refractRay, buildRefractionProfile, generateDisplacementMap, generateSpecularMap, init };
    } catch (err) {
      console.warn('liquid-glass-pill: filter generation failed; frosted-glass fallback remains active.', err);
    }
  }

  // Resize handler — registered once at module scope. init() is idempotent so
  // calling it on every resize replaces the existing maps in place.
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

# Liquid Glass

Local copy of the [Liquid Glass](https://liquid-glass-eta.vercel.app/) demo by Chris Feijoo — an interactive lens that refracts the page background using either an SVG `<feDisplacementMap>` filter (Chrome only) or a WebGL fragment shader (all browsers).

## Run

This is a static demo. Serve the directory with any HTTP server:

```bash
cd prototypes/liquid-glass
python3 -m http.server 8000
```

Then open:
- http://localhost:8000/           — SVG version (requires Chrome / Chromium)
- http://localhost:8000/webgl.html — WebGL version (works in Chrome, Safari, Firefox)

The WebGL version loads Three.js r128 from cdnjs and the default background image from Unsplash, both at runtime. The demo will not run fully offline.

## How it works

Both renderers implement the same physical model: a **height field** describes the glass surface, **Snell's law** computes how light bends through it, and the bend is converted into a **UV offset** that re-samples the background somewhere different from where each pixel actually sits.

- **SVG version:** CPU rasterizes a displacement map and a specular map to two `<canvas>` data URLs, then feeds them through an SVG filter chain: `feGaussianBlur` blurs the source, `feDisplacementMap` warps it via the displacement-map image, `feColorMatrix` saturates the warped result, and the specular layer is composited on top with `feComposite` + `feComponentTransfer` (for opacity) + two `feBlend` passes. Uses CSS `backdrop-filter`, which is currently Chromium-only for SVG filters.
- **WebGL version:** Renders a full-screen quad with a fragment shader that uses a signed-distance field for the rounded rect, computes the bezel slope by finite differencing an analytic height function, applies Snell's law to derive a per-pixel UV offset, and samples the background texture with a 16-tap Poisson blur. On top of the sampled background it composites a directional specular highlight, an inner shadow near the rim, and a tint; pixels *outside* the glass rect get a separate Gaussian-shaped drop shadow rendered in an early-return branch. Uses Three.js r128.

For a deeper walkthrough, see [the author's blog post](https://kube.io/blog/liquid-glass-css-svg).

## Credit

Original demo and technique by **Chris Feijoo** (kube.io, [@KubeKhrm](https://x.com/KubeKhrm), [github.com/kube](https://github.com/kube)).

Live demo: https://liquid-glass-eta.vercel.app/
Blog post: https://kube.io/blog/liquid-glass-css-svg

## License

The upstream code is **not open-sourced** as of the time this copy was made. In the linked blog post, the author stated the code "needs a cleanup pass and perf work before any possible open-source release." There is no public repository and no LICENSE file.

This local copy is for **personal reference only** — to read, modify, and learn from offline (with the caveats above about Three.js and Unsplash needing the network). It is **not for redistribution**. If you found this directory in someone else's repo and want to use the code yourself, please go to the original demo and contact Chris Feijoo for permission, or wait for the author's official open-source release.

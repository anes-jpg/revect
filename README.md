# Revect

A fast, friendly raster-to-vector image tracer for the desktop — drop in a PNG, JPG, WEBP or GIF and get an editable vector outline you can tune, tweak, and export as SVG.

Built with [Tauri](https://tauri.app) (Rust + WebView2) and React, powered by [VTracer](https://github.com/visioncortex/vtracer) running in a Web Worker with WASM.

## Features

- **Drag-and-drop tracing** — drop an image and get vectors instantly with live preview
- **Tracing presets** — B&W, Photo, and Poster, plus fine-grained controls (color precision, speckle filter, corner threshold, gradient step, spline settings, path precision)
- **Color modes** — full color or black & white (with threshold), stacked or cutout layering
- **Tracing modes** — pixel, polygon, and spline output
- **Vector editing** — select paths on the canvas to move, resize (from any corner, anchored at center), recolor, adjust opacity, duplicate, delete, or toggle layer visibility
- **Undo / redo** — full history (Ctrl+Z / Ctrl+Shift+Z), with keyboard shortcuts that never hijack typing in inputs
- **Canvas tools** — zoom, pan (space or middle mouse), fit, rotate view, and split/original/vector comparison views
- **Exports** — SVG download, PNG export at 1×/2×/4× scale, or copy the SVG source
- **Polished shell** — custom frameless window with working minimize/maximize/fullscreen/close controls, branded app icon, and a boot animation

## Development

```bash
npm install
npm run dev        # vite dev server only
npm run tauri dev  # full desktop app (debug build)
```

## Building

```bash
npm run tauri build
```

The release bundle (installer + executable) lands in `src-tauri/target/release/bundle/`.

## Project layout

```
src/                React frontend
  components/       canvas, path editor, layers, settings, window chrome, boot screen
  hooks/            settings, history (undo/redo), toasts, preferences
  worker/           VTracer WASM tracing worker
src-tauri/          Rust shell, capabilities, icons
```

## Tech notes

- Tracing runs off the UI thread in a Web Worker (WASM), with stale-result guarding so out-of-order traces are discarded.
- SVG paths are tracked with stable `data-revect-id` attributes injected at parse time; the parser skips paths that already carry an id so serialized edits round-trip safely.
- All pointer-drag math converts screen deltas through the SVG screen CTM, so moving and scaling stay pixel-exact at any zoom or rotation.

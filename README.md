# Revect

A fast, friendly raster-to-vector image tracer for the desktop — drop in a PNG, JPG, WEBP or GIF and get an editable vector outline you can tune, tweak, and export as SVG.

Built with [Tauri](https://tauri.app) (Rust + WebView2) and React, powered by [VTracer](https://github.com/visioncortex/vtracer) running in a Web Worker with WASM.

## Features

- **Beginner-Friendly Canvas Studio Suite**:
  - **Backdrop Switcher**: 4 modes (Checkerboard grid, Studio Dark, Studio Light, and Neon Pink contrast keying)
  - **X-Ray / Wireframe Mode (`W`)**: High-contrast neon-green outline rendering to inspect curves and overlapping paths
  - **Onion-Skin & Quick Peek (`O`)**: Ghost blend slider (0–100%) plus instant Hold-`O`-to-peek bitmap comparison
  - **Floating Canvas HUD**: Real-time resolution chip, vector path counter, and 1-click zoom fit (`F`)
  - **Hover Color Eyedropper**: Instant live color chip and 1-click hex clipboard copy
  - **Symmetry Flip (`H` & `V`)**: 1-click horizontal and vertical design mirroring
  - **Zoom Minimap Navigator**: Intelligent draggable navigator thumbnail that auto-appears when zoomed in
- **Ona & Swift Bloodline Desktop Shell**:
  - Centered frosted options dock with quick actions
  - Framer-inspired Command Palette (`Ctrl+K` / `⌘K`)
  - Native Windows-style window controls (`—`, `□`, `✕`) with custom borderless acrylic styling
  - Lenis smooth inertia momentum scrolling in the settings drawer
- **Fast Vector Tracing Engine**:
  - Powered by VTracer compiled to WebAssembly running in a dedicated Web Worker
  - B&W, Photo, and Poster presets with fine-grained color, curve, speckle, and corner precision tuning
  - Color and Black & White tracing modes (stacked or cutout layering)
  - Pixel, polygon, and spline curve generation
- **Direct Canvas Vector Editing**:
  - Select, drag, resize (anchored at center), recolor, adjust opacity, duplicate, and delete vector paths
  - Full multi-step Undo / Redo history (`Ctrl+Z` / `Ctrl+Shift+Z`)
- **Exports**:
  - SVG download, copy SVG source, and PNG raster exports at 1×, 2×, and 4× scale

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

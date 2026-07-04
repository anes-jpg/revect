import { init, convertImageToSvg, TracerConfig, ColorMode, Hierarchical, PathSimplifyMode } from 'wasm_vtracer';

// The wasm module itself is instantiated at import time by vite-plugin-wasm.
// `init()` only runs vtracer's internal one-time setup (panic hook etc.), so we
// call it once, synchronously — it does NOT load the module.
let isInitialized = false;

/**
 * Normalize VTracer's raw SVG output:
 *  - guarantee a viewBox so the markup scales predictably in the UI,
 *  - drop the empty `transform="translate()"` VTracer stamps on zero-offset paths,
 *  - in B&W (Binary) mode, give the shapes a real fill (VTracer emits `fill="none"`).
 */
function normalizeSvg(svg: string, width: number, height: number, isBinary: boolean): string {
  let out = svg;

  if (!out.includes('viewBox=')) {
    out = out.replace('<svg ', `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" `);
  }

  // Remove no-op transforms: translate() or translate(0,0)/translate(0 0).
  out = out.replace(/\s*transform="translate\(\s*(?:0\s*[, ]\s*0\s*)?\)"/g, '');

  // Binary mode paths come back as `fill="none"` — render them as solid black shapes.
  if (isBinary) {
    out = out.replace(/fill="none"/g, 'fill="#000000"');
  }

  return out;
}

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;
  if (type !== 'TRACE') return;

  const { requestId, imageData, settings } = payload;
  let config: TracerConfig | null = null;

  try {
    if (!isInitialized) {
      init();
      isInitialized = true;
    }

    const isBinary = settings.colorMode === 'bw';

    config = new TracerConfig();
    config.setColorMode(isBinary ? ColorMode.Binary : ColorMode.Color);
    config.setHierarchical(settings.hierarchical === 'cutout' ? Hierarchical.Cutout : Hierarchical.Stacked);

    let mode = PathSimplifyMode.Spline;
    if (settings.tracingMode === 'pixel') mode = PathSimplifyMode.None;
    if (settings.tracingMode === 'polygon') mode = PathSimplifyMode.Polygon;
    config.setPathSimplifyMode(mode);

    config.setFilterSpeckle(settings.filterSpeckle);
    // In B&W the image is already 2-color, so precision is irrelevant; keep it maxed.
    config.setColorPrecision(isBinary ? 8 : settings.colorPrecision);
    config.setLayerDifference(settings.gradientStep);
    config.setCornerThreshold(settings.cornerThreshold);

    if (settings.tracingMode === 'spline') {
      config.setLengthThreshold(settings.segmentLength);
      config.setSpliceThreshold(settings.spliceThreshold);
    }

    config.setPathPrecision(settings.pathPrecision);

    // Work on a copy so the caller's cached ImageData is never mutated.
    const pixels = new Uint8Array(imageData.data);

    if (isBinary) {
      const threshold = settings.bwThreshold ?? 128;
      for (let i = 0; i < pixels.length; i += 4) {
        // Composite over white so transparent regions read as background — VTracer's
        // Binary clustering keys on alpha and would otherwise trace them as shapes.
        const a = pixels[i + 3] / 255;
        const r = pixels[i] * a + 255 * (1 - a);
        const g = pixels[i + 1] * a + 255 * (1 - a);
        const b = pixels[i + 2] * a + 255 * (1 - a);

        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        const val = luma > threshold ? 255 : 0;
        pixels[i] = pixels[i + 1] = pixels[i + 2] = val;
        pixels[i + 3] = 255;
      }
    }

    const raw = convertImageToSvg(pixels, imageData.width, imageData.height, config);
    const svgString = normalizeSvg(raw, imageData.width, imageData.height, isBinary);

    self.postMessage({ type: 'RESULT', requestId, svg: svgString });
  } catch (error) {
    console.error('VTracer Worker Error:', error);
    self.postMessage({ type: 'ERROR', requestId, error: String(error) });
  } finally {
    config?.free();
  }
};

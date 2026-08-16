// Minimal 2D affine helpers that work with both DOMMatrix (Chromium/WebView2)
// and the legacy SVGMatrix returned by getScreenCTM() in some webviews.
// Only the a/b/c/d/e/f fields are used, which both interfaces expose.

export interface Matrix2D {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export function transformPoint(m: Matrix2D, x: number, y: number): { x: number; y: number } {
  return {
    x: m.a * x + m.c * y + m.e,
    y: m.b * x + m.d * y + m.f,
  };
}

// Resolve a path element inside a parsed SVG document by its data-revect-id.
// Fresh trace output carries no data-revect-id attributes (they are injected
// at render time), so fall back to document order — ids are assigned
// positionally (path-0, path-1, ...).
export function resolvePathInDoc(doc: Document, pathId: string): Element | null {
  const byId = doc.querySelector(`[data-revect-id="${pathId}"]`);
  if (byId) return byId;
  const m = pathId.match(/^path-(\d+)$/);
  if (m) {
    return doc.querySelectorAll('path')[parseInt(m[1], 10)] ?? null;
  }
  return null;
}

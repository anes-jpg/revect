import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { transformPoint } from './svgMath';

interface TransformOverlayProps {
  pathEl: SVGPathElement;
  containerEl: HTMLDivElement;
  svgRef: React.RefObject<SVGSVGElement | null>;
  zoom: number;
  onDragEnd: (transformStr: string) => void;
}

interface ScaleGroup {
  cx: number;
  cy: number;
  sx: number;
  sy: number;
}

export function TransformOverlay({ pathEl, containerEl, svgRef, zoom, onDragEnd }: TransformOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

  // Dragging state
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });

  // Scaling state
  const isScaling = useRef(false);
  const scaleCorner = useRef<string | null>(null);
  const origUserSize = useRef({ w: 0, h: 0 });

  // Transform model (all in SVG user units).
  // Attribute form: translate(T) [scaleGroup]* [prefix]
  // where scaleGroup = translate(cx, cy) scale(sx, sy) translate(-cx, -cy)
  const translate = useRef({ x: 0, y: 0 });
  const groups = useRef<ScaleGroup[]>([]);
  const prefix = useRef('');

  const updateRect = useCallback(() => {
    if (!pathEl || !containerEl) return;

    const pathRect = pathEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();

    setRect({
      x: (pathRect.left - containerRect.left) / zoom,
      y: (pathRect.top - containerRect.top) / zoom,
      w: pathRect.width / zoom,
      h: pathRect.height / zoom,
    });
  }, [pathEl, containerEl, zoom]);

  // Parse the current transform attribute into our model. Called when the
  // attribute changes externally (undo/redo, layer edits) or at gesture start.
  const parseFromAttribute = useCallback(() => {
    const t = pathEl.getAttribute('transform') || '';

    const lead = t.match(/^translate\(([^,]+)[, ]+([^)]+)\)/);
    translate.current = lead ? { x: parseFloat(lead[1]), y: parseFloat(lead[2]) } : { x: 0, y: 0 };

    groups.current = [];
    const re = /translate\(([^,]+)[, ]+([^)]+)\)\s*scale\(([^,]+)[, ]+([^)]+)\)\s*translate\((-[^,]+)[, ]+(-[^)]+)\)/g;
    let m: RegExpExecArray | null;
    let groupEnd = -1;
    while ((m = re.exec(t)) !== null) {
      groups.current.push({
        cx: parseFloat(m[1]),
        cy: parseFloat(m[2]),
        sx: parseFloat(m[3]),
        sy: parseFloat(m[4]),
      });
      groupEnd = m.index + m[0].length;
    }

    // prefix = whatever remains after the leading translate and all groups
    const head = lead ? (lead.index ?? 0) + lead[0].length : 0;
    prefix.current = t.slice(groupEnd !== -1 ? groupEnd : head).trim();
  }, [pathEl]);

  const writeTransform = () => {
    const parts: string[] = [];
    if (translate.current.x !== 0 || translate.current.y !== 0) {
      parts.push(`translate(${fmt(translate.current.x)}, ${fmt(translate.current.y)})`);
    }
    for (const g of groups.current) {
      parts.push(
        `translate(${fmt(g.cx)}, ${fmt(g.cy)}) scale(${fmt(g.sx)}, ${fmt(g.sy)}) translate(${fmt(-g.cx)}, ${fmt(-g.cy)})`
      );
    }
    if (prefix.current) parts.push(prefix.current);
    pathEl.setAttribute('transform', parts.join(' '));
  };

  // Convert a screen-space pointer delta into SVG user units via the SVG's
  // screen CTM (which includes the container's zoom/pan/rotate CSS transforms).
  const screenDeltaToUser = (dx: number, dy: number) => {
    const inv = svgRef.current?.getScreenCTM()?.inverse();
    if (!inv) return { x: dx, y: dy };
    const p0 = transformPoint(inv, dragStartPos.current.x, dragStartPos.current.y);
    const p1 = transformPoint(inv, dragStartPos.current.x + dx, dragStartPos.current.y + dy);
    return { x: p1.x - p0.x, y: p1.y - p0.y };
  };

  // useLayoutEffect: the overlay's first paint must already have a measured
  // rect, and this is a layout measurement, not a side-effect sync. The rule
  // below is a false positive for the canonical measure-on-mount pattern.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- measuring the DOM on mount is required to position the overlay
    updateRect();
    parseFromAttribute();
    const observer = new MutationObserver(() => {
      // Re-sync our transform model when the attribute changes externally
      // (undo/redo, layer edits) — never while we are mid-gesture, because
      // our own writes are the ones being observed.
      if (!isDragging.current && !isScaling.current) parseFromAttribute();
      updateRect();
    });
    observer.observe(pathEl, { attributes: true, attributeFilter: ['d', 'transform'] });
    window.addEventListener('resize', updateRect);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateRect);
    };
  }, [pathEl, updateRect, parseFromAttribute]);

  // Handle Dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation(); // Prevent panning
    if ((e.target as HTMLElement).dataset.handle) return; // Clicking a handle

    isDragging.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    parseFromAttribute();
    translateStart.current = { ...translate.current };
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is best-effort; dragging still works without it.
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging.current) {
      const d = screenDeltaToUser(e.clientX - dragStartPos.current.x, e.clientY - dragStartPos.current.y);
      translate.current = {
        x: translateStart.current.x + d.x,
        y: translateStart.current.y + d.y,
      };
      writeTransform();
      updateRect();
    }

    if (isScaling.current) {
      const d = screenDeltaToUser(e.clientX - dragStartPos.current.x, e.clientY - dragStartPos.current.y);
      const { w, h } = origUserSize.current;
      if (w > 0 && h > 0) {
        let fx = 1;
        let fy = 1;
        switch (scaleCorner.current) {
          case 'se':
            fx = 1 + d.x / w;
            fy = 1 + d.y / h;
            break;
          case 'sw':
            fx = 1 - d.x / w;
            fy = 1 + d.y / h;
            break;
          case 'ne':
            fx = 1 + d.x / w;
            fy = 1 - d.y / h;
            break;
          case 'nw':
            fx = 1 - d.x / w;
            fy = 1 - d.y / h;
            break;
        }

        if (e.shiftKey) {
          const uniform = Math.max(fx, fy);
          fx = uniform;
          fy = uniform;
        }

        const last = groups.current[groups.current.length - 1];
        if (last) {
          last.sx = Math.max(0.01, fx);
          last.sy = Math.max(0.01, fy);
          writeTransform();
          updateRect();
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging.current) {
      isDragging.current = false;
      onDragEnd(pathEl.getAttribute('transform') || '');
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Best-effort: the capture may already be gone.
      }
    }

    if (isScaling.current) {
      isScaling.current = false;
      scaleCorner.current = null;
      onDragEnd(pathEl.getAttribute('transform') || '');
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Best-effort: the capture may already be gone.
      }
    }
  };

  // Handle Scaling
  const handleHandleDown = (e: React.PointerEvent, corner: string) => {
    e.stopPropagation();
    isScaling.current = true;
    scaleCorner.current = corner;
    dragStartPos.current = { x: e.clientX, y: e.clientY };

    // Anchor the scale at the shape's LOCAL bbox center. The scale groups
    // operate in the path's pre-translate coordinate space, so the anchor must
    // be expressed there — using the visual (screen-space) center would drift
    // by the translate amount after the shape has been moved.
    const bb = pathEl.getBBox();
    const c = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };

    // The gesture factor is relative to the CURRENT visual size (all previous
    // scales included), so the dragged corner tracks the cursor exactly.
    const pathRect = pathEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    const r = {
      x: (pathRect.left - containerRect.left) / zoom,
      y: (pathRect.top - containerRect.top) / zoom,
      w: pathRect.width / zoom,
      h: pathRect.height / zoom,
    };
    const inv = svgRef.current?.getScreenCTM()?.inverse();
    if (inv) {
      const a = transformPoint(inv, r.x, r.y);
      const b = transformPoint(inv, r.x + r.w, r.y + r.h);
      origUserSize.current = { w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
    } else {
      origUserSize.current = { w: bb.width, h: bb.height };
    }

    // The new group starts at identity, so appending it causes no visual
    // jump; it accumulates on top of any previous scale groups.
    groups.current.push({ cx: c.x, cy: c.y, sx: 1, sy: 1 });

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is best-effort; scaling still works without it.
    }
  };

  if (!rect) return null;

  return (
    <div
      ref={overlayRef}
      className="absolute border-[1.5px] border-lime"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        transformOrigin: '0 0',
        // eslint-disable-next-line react-hooks/refs -- cosmetic cursor, not a render dependency
        cursor: isDragging.current ? 'grabbing' : 'grab',
        pointerEvents: 'auto',
        zIndex: 30,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Corner Handles */}
      <div
        data-handle="nw"
        className="absolute w-2 h-2 bg-white border border-lime rounded-full -left-1 -top-1 cursor-nwse-resize hover:scale-125 transition-transform"
        onPointerDown={(e) => handleHandleDown(e, 'nw')}
      />
      <div
        data-handle="ne"
        className="absolute w-2 h-2 bg-white border border-lime rounded-full -right-1 -top-1 cursor-nesw-resize hover:scale-125 transition-transform"
        onPointerDown={(e) => handleHandleDown(e, 'ne')}
      />
      <div
        data-handle="sw"
        className="absolute w-2 h-2 bg-white border border-lime rounded-full -left-1 -bottom-1 cursor-nesw-resize hover:scale-125 transition-transform"
        onPointerDown={(e) => handleHandleDown(e, 'sw')}
      />
      <div
        data-handle="se"
        className="absolute w-2 h-2 bg-white border border-lime rounded-full -right-1 -bottom-1 cursor-nwse-resize hover:scale-125 transition-transform"
        onPointerDown={(e) => handleHandleDown(e, 'se')}
      />
    </div>
  );
}

// Round to 3 decimals so serialized transforms stay compact and stable.
function fmt(n: number): number {
  return Math.round(n * 1000) / 1000;
}

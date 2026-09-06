import React, { useMemo, useRef, useEffect, useState } from 'react';
import { TransformOverlay } from './TransformOverlay';
import { transformPoint } from './svgMath';

interface InteractiveVectorProps {
  svgOutput: string;
  zoom: number;
  selectedPathId: string | null;
  onSelectPath: (id: string | null) => void;
  onSvgEdit: (newSvg: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isWireframe?: boolean;
  onHoverColor?: (color: string | null, clientX: number, clientY: number) => void;
}

interface PathNode {
  id: string;
  d: string;
  fill: string;
  opacity: string;
  transform: string;
  display: string;
  element: SVGPathElement | null;
}

export function InteractiveVector({ svgOutput, zoom, selectedPathId, onSelectPath, onSvgEdit, containerRef, isWireframe = false, onHoverColor }: InteractiveVectorProps) {
  // Parse SVG string into structured React state
  const { viewBox, nodes } = useMemo(() => {
    if (!svgOutput) return { viewBox: '0 0 100 100', nodes: [] };

    // Inject stable IDs only into <path> tags that don't already carry one.
    // The string may already contain data-revect-id because it was serialized
    // from a previous edit (e.g. after moving a shape). Re-injecting blindly
    // creates duplicate attributes, which is a FATAL XML parse error and
    // blanks the whole canvas.
    let counter = 0;
    for (const m of svgOutput.matchAll(/data-revect-id="path-(\d+)"/g)) {
      counter = Math.max(counter, parseInt(m[1], 10) + 1);
    }
    const taggedSvg = svgOutput.replace(/<path(?![^>]*data-revect-id)/gi, () => `<path data-revect-id="path-${counter++}"`);

    const parser = new DOMParser();
    const doc = parser.parseFromString(taggedSvg, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    const viewBox = svgEl?.getAttribute('viewBox') || '0 0 100 100';

    const pathEls = Array.from(doc.querySelectorAll('path'));
    const parsedNodes: PathNode[] = pathEls.map(p => ({
      id: p.getAttribute('data-revect-id') || '',
      d: p.getAttribute('d') || '',
      fill: p.getAttribute('fill') || '#000000',
      opacity: p.getAttribute('opacity') || '1',
      transform: p.getAttribute('transform') || '',
      display: p.getAttribute('display') || '',
      element: null, // to be populated by refs
    }));

    return { viewBox, nodes: parsedNodes };
  }, [svgOutput]);

  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<{ [key: string]: SVGPathElement | null }>({});

  // The overlay needs the selected path's live DOM element and the container.
  // Reading refs during render is disallowed by the react-hooks rules, so
  // mirror both into state (effects run after every commit, so these are
  // always up to date by the time the user can interact).
  const [selectedEl, setSelectedEl] = useState<SVGPathElement | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedEl(selectedPathId ? pathRefs.current[selectedPathId] ?? null : null);
  }, [selectedPathId, nodes]);

  useEffect(() => {
    setContainerEl(containerRef.current);
  }, [containerRef]);

  // Helper to serialize back to string and save
  const saveStateToParent = () => {
    if (!svgRef.current) return;
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    const serializer = new XMLSerializer();
    onSvgEdit(serializer.serializeToString(clone));
  };

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="w-full h-full max-w-full max-h-full object-contain"
        xmlns="http://www.w3.org/2000/svg"
        onClick={(e) => {
          if ((e.target as SVGElement).tagName === 'svg') {
            onSelectPath(null);
          }
        }}
      >
        {nodes.map((node) => (
          <DraggablePath
            key={node.id}
            node={node}
            svgRef={svgRef}
            isSelected={selectedPathId === node.id}
            isWireframe={isWireframe}
            onSelect={() => onSelectPath(node.id)}
            onDragEnd={saveStateToParent}
            registerRef={(el) => (pathRefs.current[node.id] = el)}
            onHoverColor={onHoverColor}
          />
        ))}
      </svg>

      {selectedEl && containerEl && (
        <TransformOverlay
          pathEl={selectedEl}
          containerEl={containerEl}
          svgRef={svgRef}
          zoom={zoom}
          onDragEnd={saveStateToParent}
        />
      )}
    </div>
  );
}

interface DraggablePathProps {
  node: PathNode;
  svgRef: React.RefObject<SVGSVGElement | null>;
  isSelected: boolean;
  isWireframe?: boolean;
  onSelect: () => void;
  onDragEnd: () => void;
  registerRef: (el: SVGPathElement | null) => void;
  onHoverColor?: (color: string | null, clientX: number, clientY: number) => void;
}

function DraggablePath({ node, svgRef, isSelected, isWireframe = false, onSelect, onDragEnd, registerRef, onHoverColor }: DraggablePathProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const transformStart = useRef('');
  const currentTranslate = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const hasMoved = useRef(false);

  useEffect(() => {
    registerRef(pathRef.current);
    // Null the entry on unmount so a deleted path can never leave a stale
    // (detached) element behind for the selection overlay.
    return () => registerRef(null);
  }, [registerRef]);

  // Convert a screen-space pointer delta into SVG user units. getScreenCTM()
  // already includes the container's zoom/pan/rotate CSS transforms, so the
  // conversion stays exact at any zoom level or rotation.
  const screenDeltaToUser = (dx: number, dy: number) => {
    const inv = svgRef.current?.getScreenCTM()?.inverse();
    if (!inv) return { x: dx, y: dy };
    const p0 = transformPoint(inv, dragStart.current.x, dragStart.current.y);
    const p1 = transformPoint(inv, dragStart.current.x + dx, dragStart.current.y + dy);
    return { x: p1.x - p0.x, y: p1.y - p0.y };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();

    isDragging.current = true;
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };

    // Read the transform state BEFORE capturing — if capture throws (e.g. the
    // pointer is not active) the drag origin is still correct.
    const t = pathRef.current?.getAttribute('transform') || '';
    // Strip only OUR leading translate(). Inner translate()s belong to scale
    // anchor groups and must be preserved.
    transformStart.current = t.replace(/^translate\([^)]+\)\s*/, '');

    const match = t.match(/^translate\(([^,]+)[, ]+([^)]+)\)/);
    if (match) {
      currentTranslate.current = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
    } else {
      currentTranslate.current = { x: 0, y: 0 };
    }

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is best-effort; dragging still works without it.
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !pathRef.current) return;

    const d = screenDeltaToUser(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y);

    if (Math.abs(d.x) > 0.5 || Math.abs(d.y) > 0.5) {
      hasMoved.current = true;
    }

    const newTransform = `translate(${fmt(currentTranslate.current.x + d.x)}, ${fmt(currentTranslate.current.y + d.y)}) ${transformStart.current}`.trim();
    pathRef.current.setAttribute('transform', newTransform);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Best-effort: the capture may already be gone.
    }

    if (hasMoved.current) {
      onDragEnd();
    }
  };

  const handlePointerEnter = (e: React.PointerEvent) => {
    if (!isSelected && pathRef.current) {
      pathRef.current.style.stroke = '#8AE25A';
      pathRef.current.style.strokeWidth = '1.5px';
    }
    if (node.fill && node.fill !== 'none') {
      onHoverColor?.(node.fill, e.clientX, e.clientY);
    }
  };

  const handlePointerLeave = () => {
    if (!isSelected && pathRef.current) {
      pathRef.current.style.stroke = isWireframe ? '#8AE25A' : '';
      pathRef.current.style.strokeWidth = isWireframe ? '1px' : '';
    }
    onHoverColor?.(null, 0, 0);
  };

  return (
    <path
      ref={pathRef}
      data-revect-id={node.id}
      d={node.d}
      fill={isWireframe ? 'transparent' : node.fill}
      opacity={isWireframe ? 0.9 : node.opacity}
      transform={node.transform}
      display={node.display || undefined}
      cursor="pointer"
      onPointerDown={handlePointerDown}
      onPointerMove={(e) => {
        handlePointerMove(e);
        if (!isDragging.current && node.fill && node.fill !== 'none') {
          onHoverColor?.(node.fill, e.clientX, e.clientY);
        }
      }}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      style={{
        stroke: isSelected ? '#5FBF2A' : (isWireframe ? '#8AE25A' : undefined),
        strokeWidth: isSelected ? '2.5px' : (isWireframe ? '1px' : undefined),
        strokeDasharray: isSelected ? '6 3' : undefined,
        vectorEffect: isWireframe ? 'non-scaling-stroke' : undefined,
      }}
    />
  );
}

// Round to 3 decimals so serialized transforms stay compact and stable.
function fmt(n: number): number {
  return Math.round(n * 1000) / 1000;
}

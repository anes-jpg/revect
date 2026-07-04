import React, { useMemo, useRef, useEffect } from 'react';
import { TransformOverlay } from './TransformOverlay';

interface InteractiveVectorProps {
  svgOutput: string;
  zoom: number;
  selectedPathId: string | null;
  onSelectPath: (id: string | null) => void;
  onSvgEdit: (newSvg: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
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

export function InteractiveVector({ svgOutput, zoom, selectedPathId, onSelectPath, onSvgEdit, containerRef }: InteractiveVectorProps) {
  // Parse SVG string into structured React state
  const { viewBox, nodes } = useMemo(() => {
    if (!svgOutput) return { viewBox: '0 0 100 100', nodes: [] };
    
    // Inject stable IDs into the raw SVG string before parsing
    let counter = 0;
    const taggedSvg = svgOutput.replace(/<path/gi, () => `<path data-revect-id="path-${counter++}"`);
    
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

  // Helper to serialize back to string and save
  const saveStateToParent = () => {
    if (!svgRef.current) return;
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    // Strip react-specific added attributes if needed, but XMLSerializer handles it
    // Wait, the paths have data-revect-id, which we want to keep
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
            zoom={zoom}
            isSelected={selectedPathId === node.id}
            onSelect={() => onSelectPath(node.id)}
            onDragEnd={saveStateToParent}
            registerRef={(el) => (pathRefs.current[node.id] = el)}
          />
        ))}
      </svg>
      
      {/* Optional: Add the resize TransformOverlay for the selected path if they want corners */}
      {selectedPathId && pathRefs.current[selectedPathId] && containerRef.current && (
        <TransformOverlay
          pathId={selectedPathId}
          pathEl={pathRefs.current[selectedPathId]!}
          containerEl={containerRef.current}
          zoom={zoom}
          onDragEnd={saveStateToParent}
        />
      )}
    </div>
  );
}

interface DraggablePathProps {
  node: PathNode;
  zoom: number;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: () => void;
  registerRef: (el: SVGPathElement | null) => void;
}

function DraggablePath({ node, zoom, isSelected, onSelect, onDragEnd, registerRef }: DraggablePathProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const transformStart = useRef('');
  const currentTranslate = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const hasMoved = useRef(false);

  useEffect(() => {
    registerRef(pathRef.current);
  }, [registerRef]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    
    isDragging.current = true;
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const t = pathRef.current?.getAttribute('transform') || '';
    transformStart.current = t.replace(/translate\([^)]+\)\s*/g, '');
    
    const match = t.match(/translate\(([^,]+)[, ]+([^)]+)\)/);
    if (match) {
      currentTranslate.current = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
    } else {
      currentTranslate.current = { x: 0, y: 0 };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !pathRef.current) return;
    
    const dx = (e.clientX - dragStart.current.x) / zoom;
    const dy = (e.clientY - dragStart.current.y) / zoom;
    
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      hasMoved.current = true;
    }
    
    const newX = currentTranslate.current.x + dx;
    const newY = currentTranslate.current.y + dy;
    
    const newTransform = `translate(${newX}, ${newY}) ${transformStart.current}`.trim();
    pathRef.current.setAttribute('transform', newTransform);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    
    if (hasMoved.current) {
      onDragEnd();
    }
  };

  const handlePointerEnter = (_e: React.PointerEvent) => {
    if (!isSelected && pathRef.current) {
      pathRef.current.style.stroke = '#8AE25A';
      pathRef.current.style.strokeWidth = '1.5px';
    }
  };

  const handlePointerLeave = (_e: React.PointerEvent) => {
    if (!isSelected && pathRef.current) {
      pathRef.current.style.stroke = '';
      pathRef.current.style.strokeWidth = '';
    }
  };

  return (
    <path
      ref={pathRef}
      data-revect-id={node.id}
      d={node.d}
      fill={node.fill}
      opacity={node.opacity}
      transform={node.transform}
      display={node.display || undefined}
      cursor="pointer"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      style={{
        stroke: isSelected ? '#5FBF2A' : undefined,
        strokeWidth: isSelected ? '2.5px' : undefined,
        strokeDasharray: isSelected ? '6 3' : undefined,
      }}
    />
  );
}

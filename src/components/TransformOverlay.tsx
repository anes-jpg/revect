import React, { useEffect, useRef, useState } from 'react';


interface TransformOverlayProps {
  pathId: string;
  pathEl: SVGPathElement;
  containerEl: HTMLDivElement;
  zoom: number;
  onDragEnd: (transformStr: string) => void;
}

export function TransformOverlay({ pathId: _pathId, pathEl, containerEl, zoom, onDragEnd }: TransformOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  
  // Dragging state
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const startTransform = useRef('');
  const currentTranslate = useRef({ x: 0, y: 0 });
  
  // Scaling state
  const isScaling = useRef(false);
  const scaleCorner = useRef<string | null>(null);
  const startScale = useRef({ sx: 1, sy: 1 });
  const originalBBox = useRef<{ x: number, y: number, w: number, h: number } | null>(null);

  const updateRect = () => {
    if (!pathEl || !containerEl) return;
    
    // Get the bounding box in the SVG's local coordinate system
    // But since the SVG could have complex viewBox, it's easier to use getBoundingClientRect
    // relative to the container element
    const pathRect = pathEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    
    setRect({
      x: (pathRect.left - containerRect.left) / zoom,
      y: (pathRect.top - containerRect.top) / zoom,
      w: pathRect.width / zoom,
      h: pathRect.height / zoom
    });
  };

  useEffect(() => {
    updateRect();
    const observer = new MutationObserver(updateRect);
    observer.observe(pathEl, { attributes: true, attributeFilter: ['d', 'transform'] });
    window.addEventListener('resize', updateRect);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateRect);
    };
  }, [pathEl, zoom, containerEl]);

  useEffect(() => {
    // Parse initial transform if exists
    const t = pathEl.getAttribute('transform') || '';
    startTransform.current = t;
    
    // Extract translation
    const match = t.match(/translate\(([^,]+)[, ]+([^)]+)\)/);
    if (match) {
      currentTranslate.current = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
    } else {
      currentTranslate.current = { x: 0, y: 0 };
    }
    
    // Extract scale
    const scaleMatch = t.match(/scale\(([^,]+)[, ]+([^)]+)\)/) || t.match(/scale\(([^)]+)\)/);
    if (scaleMatch) {
      startScale.current = { 
        sx: parseFloat(scaleMatch[1]), 
        sy: parseFloat(scaleMatch[2] || scaleMatch[1]) 
      };
    } else {
      startScale.current = { sx: 1, sy: 1 };
    }
  }, [pathEl]);

  // Handle Dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation(); // Prevent panning
    if ((e.target as HTMLElement).dataset.handle) return; // Clicking a handle
    
    isDragging.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    // Save base transform without the translate component to easily append new translate
    const t = pathEl.getAttribute('transform') || '';
    startTransform.current = t.replace(/translate\([^)]+\)\s*/g, '');
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging.current) {
      const dx = (e.clientX - dragStartPos.current.x) / zoom;
      const dy = (e.clientY - dragStartPos.current.y) / zoom;
      
      const newX = currentTranslate.current.x + dx;
      const newY = currentTranslate.current.y + dy;
      
      const newTransform = `translate(${newX}, ${newY}) ${startTransform.current}`.trim();
      pathEl.setAttribute('transform', newTransform);
      updateRect();
    }
    
    if (isScaling.current && originalBBox.current) {
      const dx = (e.clientX - dragStartPos.current.x) / zoom;
      const dy = (e.clientY - dragStartPos.current.y) / zoom;
      
      let scaleX = startScale.current.sx;
      let scaleY = startScale.current.sy;
      
      const w = originalBBox.current.w;
      const h = originalBBox.current.h;
      
      // Calculate scale factor based on which corner is dragged
      switch(scaleCorner.current) {
        case 'se':
          scaleX = startScale.current.sx * (1 + dx / w);
          scaleY = startScale.current.sy * (1 + dy / h);
          break;
        case 'sw':
          scaleX = startScale.current.sx * (1 - dx / w);
          scaleY = startScale.current.sy * (1 + dy / h);
          break;
        case 'ne':
          scaleX = startScale.current.sx * (1 + dx / w);
          scaleY = startScale.current.sy * (1 - dy / h);
          break;
        case 'nw':
          scaleX = startScale.current.sx * (1 - dx / w);
          scaleY = startScale.current.sy * (1 - dy / h);
          break;
      }
      
      // Keep aspect ratio (optional, simple proportional scale here if shift pressed)
      if (e.shiftKey) {
        const uniform = Math.max(scaleX, scaleY);
        scaleX = uniform;
        scaleY = uniform;
      }

      // Update transform
      const t = pathEl.getAttribute('transform') || '';
      const baseT = t.replace(/scale\([^)]+\)\s*/g, '');
      const newTransform = `${baseT} scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`.trim();
      
      pathEl.setAttribute('transform', newTransform);
      updateRect();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging.current) {
      isDragging.current = false;
      const dx = (e.clientX - dragStartPos.current.x) / zoom;
      const dy = (e.clientY - dragStartPos.current.y) / zoom;
      currentTranslate.current.x += dx;
      currentTranslate.current.y += dy;
      
      onDragEnd(pathEl.getAttribute('transform') || '');
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
    
    if (isScaling.current) {
      isScaling.current = false;
      scaleCorner.current = null;
      onDragEnd(pathEl.getAttribute('transform') || '');
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  // Handle Scaling
  const handleHandleDown = (e: React.PointerEvent, corner: string) => {
    e.stopPropagation();
    isScaling.current = true;
    scaleCorner.current = corner;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    const t = pathEl.getAttribute('transform') || '';
    const scaleMatch = t.match(/scale\(([^,]+)[, ]+([^)]+)\)/) || t.match(/scale\(([^)]+)\)/);
    if (scaleMatch) {
      startScale.current = { sx: parseFloat(scaleMatch[1]), sy: parseFloat(scaleMatch[2] || scaleMatch[1]) };
    } else {
      startScale.current = { sx: 1, sy: 1 };
    }
    
    if (rect) {
      originalBBox.current = { ...rect };
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
        cursor: isDragging.current ? 'grabbing' : 'grab',
        pointerEvents: 'auto',
        zIndex: 30
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

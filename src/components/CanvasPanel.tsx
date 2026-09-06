import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize, RotateCw } from 'lucide-react';
import { InteractiveVector } from './InteractiveVector';

interface CanvasPanelProps {
  originalImage: string | null;
  svgOutput: string | null;
  isTracing: boolean;
  onSelectPath?: (pathId: string | null, pathEl?: SVGPathElement | null) => void;
  selectedPathId?: string | null;
  onSvgEdit?: (newSvg: string) => void;
}

export function CanvasPanel({ originalImage, svgOutput, isTracing, onSelectPath, selectedPathId, onSvgEdit }: CanvasPanelProps) {
  const [activeTab, setActiveTab] = useState<'original' | 'vector' | 'split'>('vector');
  const [splitPos, setSplitPos] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [rotation, setRotation] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const isDraggingSplit = useRef(false);

  const handleFit = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // Keyboard listeners for space-to-pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't hijack shortcuts while the user is typing in an input.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpaceHeld(true);
      }
      if (e.code === 'KeyF') {
        handleFit();
      }
      if (e.code === 'Escape') {
        onSelectPath?.(null, null);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpaceHeld(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onSelectPath]);

  // Zoom with scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.1, Math.min(10, prev + delta * prev)));
  }, []);

  const handleZoomIn = () => setZoom(prev => Math.min(10, prev * 1.25));
  const handleZoomOut = () => setZoom(prev => Math.max(0.1, prev / 1.25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  // Pan handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (spaceHeld || e.button === 1) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
      panOffsetRef.current = { ...pan };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, [spaceHeld, pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan({
        x: panOffsetRef.current.x + dx,
        y: panOffsetRef.current.y + dy,
      });
    }

    if (isDraggingSplit.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setSplitPos(Math.max(5, Math.min(95, (x / rect.width) * 100)));
    }
  }, [isPanning]);

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
    isDraggingSplit.current = false;
  }, []);

  const cursorStyle = isPanning ? 'grabbing' : spaceHeld ? 'grab' : (activeTab === 'vector' ? 'crosshair' : 'default');
  const zoomPercent = Math.round(zoom * 100);

  if (!originalImage) return null;

  return (
    <div className="w-full h-full flex flex-col relative bg-transparent overflow-hidden">

      {/* Top Floating Controls */}
      <div className="absolute top-4 inset-x-0 flex justify-center z-20 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* View Tabs */}
          <div className="flex bg-white/80 dark:bg-[#1E1E24]/80 backdrop-blur-md p-1 rounded-full border border-black/5 dark:border-white/10 shadow-sm">
            {(['original', 'vector', 'split'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-[12px] font-bold rounded-full capitalize transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-white dark:bg-white/20 text-ink dark:text-white shadow-sm'
                    : 'text-ink-muted dark:text-white/60 hover:text-ink dark:hover:text-white'
                }`}
              >
                {tab === 'split' ? 'Split' : tab === 'original' ? 'Original' : 'Vector'}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center bg-white/80 dark:bg-[#1E1E24]/80 backdrop-blur-md p-1 rounded-full border border-black/5 dark:border-white/10 shadow-sm gap-0.5">
            <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center text-ink-muted dark:text-white/60 hover:text-ink dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/15 rounded-full transition-all" title="Zoom In">
              <ZoomIn size={14} />
            </button>
            <div className="font-mono text-[10px] text-ink-muted dark:text-white/60 min-w-[36px] text-center select-none">
              {zoomPercent}%
            </div>
            <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center text-ink-muted dark:text-white/60 hover:text-ink dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/15 rounded-full transition-all" title="Zoom Out">
              <ZoomOut size={14} />
            </button>
            <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-0.5" />
            <button onClick={handleFit} className="w-8 h-8 flex items-center justify-center text-ink-muted dark:text-white/60 hover:text-ink dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/15 rounded-full transition-all" title="Fit to View">
              <Maximize size={14} />
            </button>
            <button onClick={handleRotate} className="w-8 h-8 flex items-center justify-center text-ink-muted dark:text-white/60 hover:text-ink dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/15 rounded-full transition-all" title="Rotate 90°">
              <RotateCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport */}
      <div
        ref={containerRef}
        className="flex-1 relative w-full h-full overflow-hidden"
        style={{ cursor: cursorStyle }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Checkerboard */}
        <div
          className="absolute inset-0 z-0 opacity-10 dark:opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #fff 25%, #fff 75%, #000 75%, #000)`,
            backgroundPosition: `0 0, 10px 10px`,
            backgroundSize: `20px 20px`,
          }}
        />

        {/* Zoomable / Pannable content */}
        <div
          className="absolute inset-0 flex items-center justify-center z-10"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          {/* Original Image */}
          {(activeTab === 'original' || activeTab === 'split') && (
            <div className="absolute inset-8 flex items-center justify-center">
              <img
                src={originalImage}
                className="max-w-full max-h-full object-contain drop-shadow-md"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  clipPath: activeTab === 'split' ? `inset(0 ${100 - splitPos}% 0 0)` : undefined,
                }}
                draggable={false}
              />
            </div>
          )}

          {/* Vector SVG */}
          {(activeTab === 'vector' || activeTab === 'split') && svgOutput && (
            <div
              ref={svgContainerRef}
              className="absolute inset-8"
              style={{
                transform: `rotate(${rotation}deg)`,
                clipPath: activeTab === 'split' ? `inset(0 0 0 ${splitPos}%)` : undefined,
              }}
            >
              <InteractiveVector
                svgOutput={svgOutput}
                zoom={zoom}
                selectedPathId={selectedPathId || null}
                onSelectPath={(id) => onSelectPath?.(id, null)}
                onSvgEdit={(newSvg) => onSvgEdit?.(newSvg)}
                containerRef={svgContainerRef}
              />
            </div>
          )}
        </div>

        {/* Split Divider */}
        {activeTab === 'split' && (
          <div
            className="absolute top-0 bottom-0 w-1 bg-lime z-20 shadow-[0_0_10px_rgba(138,226,90,0.5)] group"
            style={{ left: `calc(${splitPos}% - 2px)`, cursor: 'ew-resize' }}
            onPointerDown={(e) => {
              isDraggingSplit.current = true;
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
            }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-10 bg-white dark:bg-[#1E1E24] rounded-full border-2 border-lime flex items-center justify-center gap-0.5 shadow-md transition-transform group-hover:scale-110">
              <span className="text-[8px] text-lime-dark dark:text-lime font-bold select-none">◀▶</span>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isTracing && (
          <div className="absolute inset-0 bg-white/50 dark:bg-black/60 backdrop-blur-sm z-30 flex items-center justify-center transition-all duration-300">
            <div className="bg-white dark:bg-[#1E1E24] border border-black/5 dark:border-white/10 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4">
              <svg width="24" height="24" viewBox="0 0 24 24" className="animate-spin">
                <circle cx="12" cy="12" r="10" fill="none" stroke="#8AE25A" strokeWidth="3" strokeDasharray="50 15" strokeLinecap="round" />
              </svg>
              <span className="font-display font-bold text-ink dark:text-white">Tracing…</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { 
  ZoomIn, ZoomOut, Maximize, RotateCw, 
  FlipHorizontal, FlipVertical, Grid
} from 'lucide-react';
import { InteractiveVector } from './InteractiveVector';

interface CanvasPanelProps {
  originalImage: string | null;
  svgOutput: string | null;
  isTracing: boolean;
  onSelectPath?: (pathId: string | null, pathEl?: SVGPathElement | null) => void;
  selectedPathId?: string | null;
  onSvgEdit?: (newSvg: string) => void;
}

export function CanvasPanel({ 
  originalImage, 
  svgOutput, 
  isTracing, 
  onSelectPath, 
  selectedPathId, 
  onSvgEdit 
}: CanvasPanelProps) {
  const [activeTab, setActiveTab] = useState<'original' | 'vector' | 'split' | 'ghost'>('vector');
  const [splitPos, setSplitPos] = useState(50);
  const [ghostOpacity, setGhostOpacity] = useState(0.5);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // New Canvas Studio States
  const [backdropMode, setBackdropMode] = useState<'checker' | 'dark' | 'light' | 'contrast'>('checker');
  const [isWireframe, setIsWireframe] = useState(false);
  const [isPeekingOriginal, setIsPeekingOriginal] = useState(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [hoveredColor, setHoveredColor] = useState<{ color: string; x: number; y: number } | null>(null);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const isDraggingSplit = useRef(false);

  // Measure natural dimensions of the raster image
  useEffect(() => {
    if (!originalImage) return;
    const img = new Image();
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = originalImage;
  }, [originalImage]);

  // Derived vector paths count
  const pathCount = useMemo(() => {
    if (!svgOutput) return 0;
    return (svgOutput.match(/<path(?![^>]*data-revect-id="overlay")/gi) || []).length;
  }, [svgOutput]);

  const handleFit = () => { 
    setZoom(1); 
    setPan({ x: 0, y: 0 }); 
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  };

  // Keyboard listeners for space-to-pan and canvas shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't hijack shortcuts while the user is typing in an input
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpaceHeld(true);
      }
      if (e.code === 'KeyF') {
        handleFit();
      }
      if (e.code === 'KeyW') {
        setIsWireframe(prev => !prev);
      }
      if (e.code === 'KeyH') {
        setFlipH(prev => !prev);
      }
      if (e.code === 'KeyV') {
        setFlipV(prev => !prev);
      }
      if (e.code === 'KeyO' && !e.repeat) {
        setIsPeekingOriginal(true);
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
      if (e.code === 'KeyO') {
        setIsPeekingOriginal(false);
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
  const handleFlipH = () => setFlipH(prev => !prev);
  const handleFlipV = () => setFlipV(prev => !prev);

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
    <div className="w-full h-full flex flex-col relative bg-transparent overflow-hidden select-none">

      {/* Top Floating Controls */}
      <div className="absolute top-4 inset-x-0 flex justify-center z-20 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto flex-wrap justify-center px-4">
          
          {/* View Tabs */}
          <div className="flex bg-white/80 dark:bg-[#1E1E24]/80 backdrop-blur-md p-1 rounded-full border border-black/5 dark:border-white/10 shadow-sm">
            {(['original', 'vector', 'split', 'ghost'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 text-[12px] font-bold rounded-full capitalize transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-white dark:bg-white/20 text-ink dark:text-white shadow-sm'
                    : 'text-ink-muted dark:text-white/60 hover:text-ink dark:hover:text-white'
                }`}
              >
                {tab === 'split' ? 'Split' : tab === 'ghost' ? 'Ghost' : tab === 'original' ? 'Original' : 'Vector'}
              </button>
            ))}
          </div>

          {/* Ghost Opacity Slider (when Ghost tab is active) */}
          {activeTab === 'ghost' && (
            <div className="flex items-center gap-2 bg-white/80 dark:bg-[#1E1E24]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-black/5 dark:border-white/10 shadow-sm animate-fadeIn">
              <span className="text-[11px] font-mono text-ink-muted dark:text-white/60">Vector:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={ghostOpacity}
                onChange={(e) => setGhostOpacity(parseFloat(e.target.value))}
                className="w-20 h-1.5 bg-black/10 dark:bg-white/20 rounded-full appearance-none cursor-pointer accent-lime"
              />
              <span className="text-[10px] font-mono text-ink dark:text-white w-7 text-right">
                {Math.round(ghostOpacity * 100)}%
              </span>
            </div>
          )}

          {/* Canvas Tools Bar */}
          <div className="flex items-center bg-white/80 dark:bg-[#1E1E24]/80 backdrop-blur-md p-1 rounded-full border border-black/5 dark:border-white/10 shadow-sm gap-0.5">
            
            {/* Zoom Controls */}
            <button 
              onClick={handleZoomIn} 
              className="w-7 h-7 flex items-center justify-center text-ink-muted dark:text-white/60 hover:text-ink dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/15 rounded-full transition-all" 
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
            <div className="font-mono text-[10px] text-ink-muted dark:text-white/60 min-w-[34px] text-center select-none">
              {zoomPercent}%
            </div>
            <button 
              onClick={handleZoomOut} 
              className="w-7 h-7 flex items-center justify-center text-ink-muted dark:text-white/60 hover:text-ink dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/15 rounded-full transition-all" 
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            
            <div className="w-px h-3.5 bg-black/10 dark:bg-white/10 mx-0.5" />
            
            {/* Fit View */}
            <button 
              onClick={handleFit} 
              className="w-7 h-7 flex items-center justify-center text-ink-muted dark:text-white/60 hover:text-ink dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/15 rounded-full transition-all" 
              title="Fit to View (F)"
            >
              <Maximize size={13} />
            </button>

            {/* Rotate */}
            <button 
              onClick={handleRotate} 
              className="w-7 h-7 flex items-center justify-center text-ink-muted dark:text-white/60 hover:text-ink dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/15 rounded-full transition-all" 
              title="Rotate 90°"
            >
              <RotateCw size={13} />
            </button>

            {/* Flip Horizontal */}
            <button 
              onClick={handleFlipH} 
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                flipH 
                  ? 'bg-lime text-black font-semibold shadow-xs' 
                  : 'text-ink-muted dark:text-white/60 hover:text-ink dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/15'
              }`}
              title="Flip Horizontal (H)"
            >
              <FlipHorizontal size={13} />
            </button>

            {/* Flip Vertical */}
            <button 
              onClick={handleFlipV} 
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                flipV 
                  ? 'bg-lime text-black font-semibold shadow-xs' 
                  : 'text-ink-muted dark:text-white/60 hover:text-ink dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/15'
              }`}
              title="Flip Vertical (V)"
            >
              <FlipVertical size={13} />
            </button>

            <div className="w-px h-3.5 bg-black/10 dark:bg-white/10 mx-0.5" />

            {/* X-Ray Wireframe Mode */}
            <button
              onClick={() => setIsWireframe(prev => !prev)}
              className={`px-2.5 h-7 flex items-center gap-1.5 rounded-full text-[11px] font-bold transition-all ${
                isWireframe 
                  ? 'bg-lime text-black shadow-xs' 
                  : 'text-ink-muted dark:text-white/60 hover:text-ink dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/15'
              }`}
              title="Toggle X-Ray Wireframe (W)"
            >
              <Grid size={13} />
              <span>X-Ray</span>
            </button>

            <div className="w-px h-3.5 bg-black/10 dark:bg-white/10 mx-0.5" />

            {/* Backdrop Switcher Dots */}
            <div className="flex items-center gap-1 px-1.5">
              {[
                { id: 'checker', label: 'Transparency Grid', bg: 'bg-[#999999]' },
                { id: 'dark', label: 'Studio Dark', bg: 'bg-[#141416]' },
                { id: 'light', label: 'Studio Light', bg: 'bg-white' },
                { id: 'contrast', label: 'Contrast Keying (Pink)', bg: 'bg-[#FF007F]' },
              ].map(b => (
                <button
                  key={b.id}
                  onClick={() => setBackdropMode(b.id as any)}
                  className={`w-3.5 h-3.5 rounded-full border transition-all ${
                    backdropMode === b.id 
                      ? 'border-lime scale-125 shadow-xs' 
                      : 'border-black/30 dark:border-white/30 opacity-60 hover:opacity-100'
                  } ${b.bg}`}
                  title={`Canvas Backdrop: ${b.label}`}
                />
              ))}
            </div>

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
        {/* Dynamic Canvas Backdrop */}
        {backdropMode === 'checker' && (
          <div
            className="absolute inset-0 z-0 opacity-15 dark:opacity-[0.05]"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #fff 25%, #fff 75%, #000 75%, #000)`,
              backgroundPosition: `0 0, 10px 10px`,
              backgroundSize: `20px 20px`,
            }}
          />
        )}
        {backdropMode === 'dark' && (
          <div className="absolute inset-0 z-0 bg-[#141416]" />
        )}
        {backdropMode === 'light' && (
          <div className="absolute inset-0 z-0 bg-[#FFFFFF]" />
        )}
        {backdropMode === 'contrast' && (
          <div className="absolute inset-0 z-0 bg-[#FF007F]" />
        )}

        {/* Zoomable / Pannable content container */}
        <div
          className="absolute inset-0 flex items-center justify-center z-10"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom * (flipH ? -1 : 1)}, ${zoom * (flipV ? -1 : 1)}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          {/* Original Image (rendered in Original, Split, Ghost, or when Peeking with O key) */}
          {(activeTab === 'original' || activeTab === 'split' || activeTab === 'ghost' || isPeekingOriginal) && (
            <div 
              className="absolute inset-8 flex items-center justify-center transition-opacity duration-150"
              style={{
                zIndex: isPeekingOriginal ? 15 : 1,
                clipPath: activeTab === 'split' && !isPeekingOriginal ? `inset(0 ${100 - splitPos}% 0 0)` : undefined,
              }}
            >
              <img
                src={originalImage}
                className="max-w-full max-h-full object-contain drop-shadow-md"
                draggable={false}
              />
            </div>
          )}

          {/* Vector SVG */}
          {(activeTab === 'vector' || activeTab === 'split' || activeTab === 'ghost') && svgOutput && (
            <div
              ref={svgContainerRef}
              className="absolute inset-8 transition-opacity duration-150"
              style={{
                zIndex: 5,
                opacity: activeTab === 'ghost' ? ghostOpacity : 1,
                clipPath: activeTab === 'split' && !isPeekingOriginal ? `inset(0 0 0 ${splitPos}%)` : undefined,
              }}
            >
              <InteractiveVector
                svgOutput={svgOutput}
                zoom={zoom}
                selectedPathId={selectedPathId || null}
                onSelectPath={(id) => onSelectPath?.(id, null)}
                onSvgEdit={(newSvg) => onSvgEdit?.(newSvg)}
                containerRef={svgContainerRef}
                isWireframe={isWireframe}
                onHoverColor={(color, x, y) => {
                  if (color) {
                    setHoveredColor({ color, x, y });
                  } else {
                    setHoveredColor(null);
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Split Divider */}
        {activeTab === 'split' && !isPeekingOriginal && (
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

        {/* Floating Color Eyedropper Chip */}
        {hoveredColor && activeTab !== 'original' && !isWireframe && (
          <div
            className="fixed z-50 pointer-events-auto px-2.5 py-1 rounded-md bg-black/85 dark:bg-[#1E1E24]/90 backdrop-blur-md border border-white/10 text-white text-[11px] font-mono flex items-center gap-1.5 shadow-xl transition-opacity animate-fadeIn cursor-pointer"
            style={{ left: `${hoveredColor.x + 14}px`, top: `${hoveredColor.y + 14}px` }}
            onClick={() => {
              navigator.clipboard.writeText(hoveredColor.color);
              setCopiedColor(hoveredColor.color);
              setTimeout(() => setCopiedColor(null), 1500);
            }}
            title="Click to copy HEX color"
          >
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/30"
              style={{ backgroundColor: hoveredColor.color }}
            />
            <span>{copiedColor === hoveredColor.color ? '✓ Copied' : hoveredColor.color.toUpperCase()}</span>
          </div>
        )}

        {/* Floating Canvas HUD Badge (Bottom-Left) */}
        <div className="absolute bottom-4 left-4 z-20 pointer-events-auto flex items-center gap-2 bg-white/80 dark:bg-[#1E1E24]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-black/5 dark:border-white/10 shadow-sm text-ink dark:text-white text-[11px] font-mono select-none">
          {dimensions && (
            <>
              <span className="text-ink-muted dark:text-white/60">
                {dimensions.width}×{dimensions.height}
              </span>
              <span className="w-1 h-1 rounded-full bg-black/20 dark:bg-white/20" />
            </>
          )}
          {pathCount > 0 && (
            <>
              <span className="text-lime-dark dark:text-lime font-medium">
                {pathCount} paths
              </span>
              <span className="w-1 h-1 rounded-full bg-black/20 dark:bg-white/20" />
            </>
          )}
          <button 
            onClick={handleFit}
            className="hover:text-lime transition-colors"
            title="Reset Zoom & Pan (F)"
          >
            {zoomPercent}%
          </button>
          
          {/* Subtle Peek Hint */}
          <span className="text-[10px] text-ink-muted dark:text-white/40 hidden sm:inline ml-1 border-l border-black/10 dark:border-white/10 pl-2">
            Hold <kbd className="font-bold text-ink dark:text-white">O</kbd> to peek
          </span>
        </div>

        {/* Zoom Minimap Navigator (Bottom-Right, auto-shows when zoomed in) */}
        {zoom > 1.25 && (
          <div 
            className="absolute bottom-4 right-4 z-20 pointer-events-auto bg-black/75 dark:bg-[#18181c]/90 backdrop-blur-md p-1.5 rounded-2xl border border-black/10 dark:border-white/10 shadow-xl flex flex-col items-center gap-1 animate-fadeIn"
            style={{ width: '130px' }}
          >
            <div 
              className="w-full relative overflow-hidden rounded-xl bg-black/40 cursor-crosshair"
              style={{ 
                height: dimensions ? `${Math.max(50, Math.min(85, Math.round(120 * (dimensions.height / dimensions.width))))}px` : '70px' 
              }}
              onPointerDown={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const relX = (e.clientX - rect.left) / rect.width - 0.5;
                const relY = (e.clientY - rect.top) / rect.height - 0.5;
                if (containerRef.current) {
                  const cw = containerRef.current.clientWidth;
                  const ch = containerRef.current.clientHeight;
                  setPan({ x: -relX * cw, y: -relY * ch });
                }
              }}
            >
              <img 
                src={originalImage} 
                className="w-full h-full object-contain opacity-50 pointer-events-none" 
                style={{
                  transform: `scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1}) rotate(${rotation}deg)`,
                }}
              />
              {/* Draggable Viewport Frame Indicator */}
              <div 
                className="absolute border-2 border-lime rounded-md bg-lime/15 pointer-events-none transition-all duration-75"
                style={{
                  width: `${Math.max(20, Math.min(100, 100 / zoom))}%`,
                  height: `${Math.max(20, Math.min(100, 100 / zoom))}%`,
                  left: `${Math.max(0, Math.min(100 - (100 / zoom), 50 - (50 / zoom) - (pan.x / (containerRef.current?.clientWidth || 800) * 100)))}%`,
                  top: `${Math.max(0, Math.min(100 - (100 / zoom), 50 - (50 / zoom) - (pan.y / (containerRef.current?.clientHeight || 600) * 100)))}%`,
                }}
              />
            </div>
            <span className="text-[8px] font-mono text-white/50 tracking-wider">NAVIGATOR</span>
          </div>
        )}

      </div>
    </div>
  );
}

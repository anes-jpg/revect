import { useState, useEffect } from 'react';
import { Trash2, Copy, Palette, X } from 'lucide-react';

interface PathEditorProps {
  pathId: string;
  pathEl: SVGPathElement | null;
  svgOutput: string;
  onSvgEdit: (newSvg: string) => void;
  onClose: () => void;
  onToast: (message: string, type?: 'success' | 'warning' | 'error') => void;
}

export function PathEditor({ pathId, pathEl, svgOutput, onSvgEdit, onClose, onToast }: PathEditorProps) {
  const [fill, setFill] = useState('#000000');
  const [opacity, setOpacity] = useState(100);
  const [pointCount, setPointCount] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (!pathEl) return;
    setFill(pathEl.getAttribute('fill') || '#000000');
    setOpacity(Math.round(parseFloat(pathEl.getAttribute('opacity') || '1') * 100));
    const d = pathEl.getAttribute('d') || '';
    setPointCount((d.match(/[MLHVCSQTAZ]/gi) || []).length);
  }, [pathEl]);

  const editSvg = (mutate: (doc: Document) => void) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgOutput, 'image/svg+xml');
    mutate(doc);
    const serializer = new XMLSerializer();
    onSvgEdit(serializer.serializeToString(doc.documentElement));
  };

  const handleColorChange = (newColor: string) => {
    setFill(newColor);
    editSvg(doc => {
      const el = doc.querySelector(`[data-revect-id="${pathId}"]`);
      if (el) el.setAttribute('fill', newColor);
    });
  };

  const handleOpacityChange = (newOpacity: number) => {
    setOpacity(newOpacity);
    editSvg(doc => {
      const el = doc.querySelector(`[data-revect-id="${pathId}"]`);
      if (el) el.setAttribute('opacity', String(newOpacity / 100));
    });
  };

  const handleDelete = () => {
    editSvg(doc => {
      const el = doc.querySelector(`[data-revect-id="${pathId}"]`);
      if (el) el.remove();
    });
    onToast('Path deleted', 'success');
    onClose();
  };

  const handleDuplicate = () => {
    editSvg(doc => {
      const el = doc.querySelector(`[data-revect-id="${pathId}"]`);
      if (el) {
        const clone = el.cloneNode(true) as Element;
        clone.setAttribute('data-revect-id', `path-dup-${Date.now()}`);
        // Slight offset
        const transform = clone.getAttribute('transform') || '';
        clone.setAttribute('transform', `${transform} translate(5, 5)`);
        el.parentNode?.insertBefore(clone, el.nextSibling);
      }
    });
    onToast('Path duplicated', 'success');
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-40 transition-all duration-200"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 150ms ease-out',
      }}
    >
      <div className="mx-4 mb-4 bg-white/95 backdrop-blur-xl rounded-2xl border border-black/10 shadow-2xl p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Path info */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold text-ink bg-black/5 px-2 py-1 rounded-lg">{pathId}</span>
          </div>

          {/* Color swatch */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-1.5 bg-black/5 hover:bg-black/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              <div className="w-4 h-4 rounded border border-black/20" style={{ backgroundColor: fill }} />
              <span className="font-mono text-[11px] text-ink">{fill}</span>
              <Palette size={12} className="text-ink-muted" />
            </button>

            {/* Color picker popover */}
            {showColorPicker && (
              <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-2xl border border-black/10 p-3 w-[220px] z-50">
                <input
                  type="color"
                  value={fill}
                  onChange={e => handleColorChange(e.target.value)}
                  className="w-full h-32 rounded-lg cursor-pointer border-0 p-0"
                />
                <input
                  type="text"
                  value={fill}
                  onChange={e => handleColorChange(e.target.value)}
                  className="w-full mt-2 px-3 py-1.5 bg-black/5 rounded-lg text-[12px] font-mono text-ink border-0 outline-none focus:ring-2 ring-lime"
                />
              </div>
            )}
          </div>

          {/* Opacity */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-ink-muted">Opacity</span>
            <input
              type="range"
              min={0} max={100}
              value={opacity}
              onChange={e => handleOpacityChange(parseInt(e.target.value))}
              className="w-20 h-1 bg-black/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-lime [&::-webkit-slider-thumb]:rounded-full"
            />
            <span className="font-mono text-[10px] text-ink-muted w-8">{opacity}%</span>
          </div>

          {/* Points */}
          <span className="text-[11px] text-ink-muted font-mono">Points: {pointCount}</span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleDuplicate}
              className="flex items-center gap-1 px-3 py-1.5 bg-black/5 hover:bg-lime/20 rounded-lg transition-colors text-[11px] font-bold text-ink"
            >
              <Copy size={12} /> Duplicate
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors text-[11px] font-bold text-red-600"
            >
              <Trash2 size={12} /> Delete
            </button>
            <button
              onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
            >
              <X size={14} className="text-ink-muted" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

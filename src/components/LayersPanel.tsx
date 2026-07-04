import { useState, useMemo } from 'react';
import { Eye, EyeOff, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { useTranslation } from '../i18n';

interface LayersPanelProps {
  svgOutput: string | null;
  onSelectPath: (pathId: string) => void;
  selectedPathId: string | null;
  onSvgEdit: (newSvg: string) => void;
}

interface PathInfo {
  id: string;
  fill: string;
  visible: boolean;
}

export function LayersPanel({ svgOutput, onSelectPath, selectedPathId, onSvgEdit }: LayersPanelProps) {
  useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const paths = useMemo((): PathInfo[] => {
    if (!svgOutput) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgOutput, 'image/svg+xml');
    const pathEls = doc.querySelectorAll('path');
    return Array.from(pathEls).map((el, i) => ({
      id: el.getAttribute('data-revect-id') || `path-${i}`,
      fill: el.getAttribute('fill') || '#000000',
      visible: el.getAttribute('display') !== 'none',
    }));
  }, [svgOutput]);

  const toggleVisibility = (pathId: string) => {
    if (!svgOutput) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgOutput, 'image/svg+xml');
    const el = doc.querySelector(`[data-revect-id="${pathId}"]`);
    if (el) {
      const isVisible = el.getAttribute('display') !== 'none';
      if (isVisible) {
        el.setAttribute('display', 'none');
      } else {
        el.removeAttribute('display');
      }
    }
    const serializer = new XMLSerializer();
    onSvgEdit(serializer.serializeToString(doc.documentElement));
  };

  if (!svgOutput || paths.length === 0) return null;

  return (
    <div className="border-t border-black/10 mt-2 pt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-1 py-1.5 hover:bg-black/5 rounded-lg transition-colors"
      >
        {isExpanded ? <ChevronDown size={14} className="text-ink" /> : <ChevronRight size={14} className="text-ink" />}
        <span className="font-sans font-bold text-[12px] text-ink">Layers</span>
        <span className="font-mono text-[10px] text-ink-muted bg-black/10 px-1.5 rounded-full">{paths.length}</span>
      </button>

      {isExpanded && (
        <div
          className="mt-1 max-h-[200px] overflow-y-auto space-y-0.5"
          style={{
            animation: 'slideDown 250ms ease-out',
          }}
        >
          {paths.map((path, index) => (
            <div
              key={path.id}
              onClick={() => onSelectPath(path.id)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all text-[11px] ${
                selectedPathId === path.id
                  ? 'bg-lime/20 border border-lime/30'
                  : 'hover:bg-black/5 border border-transparent'
              }`}
            >
              <GripVertical size={10} className="text-ink-muted/50 flex-shrink-0" />
              <div className="w-3 h-3 rounded-sm border border-black/20 flex-shrink-0" style={{ backgroundColor: path.fill }} />
              <span className="font-mono text-ink-muted flex-1 truncate">#{index + 1}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleVisibility(path.id);
                }}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 transition-colors"
              >
                {path.visible
                  ? <Eye size={10} className="text-ink-muted" />
                  : <EyeOff size={10} className="text-ink-muted/40" />
                }
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

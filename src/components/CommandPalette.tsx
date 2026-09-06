import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, Play, Copy, Download, Image as ImageIcon, Sparkles, 
  Settings, Keyboard, Moon, Sun, Monitor, Maximize2, Minus, X,
  Sliders, Palette, RefreshCw
} from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { usePreferences } from '../hooks/PreferencesContext';

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  shortcut?: string;
  icon: React.ReactNode;
  perform: () => void | Promise<void>;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onRunTrace: () => void;
  onCopySvg?: () => void;
  onDownloadSvg?: () => void;
  onDownloadPng?: (scale: number) => void;
  onLoadPreset: (preset: 'bw' | 'photo' | 'poster') => void;
  onUpdateSetting: (key: string, value: any) => void;
  onOpenPreferences: () => void;
  onToggleShortcuts: () => void;
  onClearImage?: () => void;
  hasImage: boolean;
  hasSvg: boolean;
}

export function CommandPalette({
  isOpen,
  onClose,
  onRunTrace,
  onCopySvg,
  onDownloadSvg,
  onDownloadPng,
  onLoadPreset,
  onUpdateSetting,
  onOpenPreferences,
  onToggleShortcuts,
  onClearImage,
  hasImage,
  hasSvg,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { updatePreference } = usePreferences();

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  // Auto-focus input and reset state on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  // Global escape handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Commands
  const allCommands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [];

    if (hasImage) {
      list.push({
        id: 'action-trace',
        title: 'Trace & Vectorize',
        category: 'Actions',
        shortcut: 'Ctrl+Enter',
        icon: <Play className="w-4 h-4 text-lime" />,
        perform: () => { onRunTrace(); onClose(); },
      });
    }

    if (hasSvg) {
      list.push(
        {
          id: 'action-copy-svg',
          title: 'Copy SVG Code',
          category: 'Actions',
          shortcut: 'Ctrl+C',
          icon: <Copy className="w-4 h-4 text-lime" />,
          perform: () => { onCopySvg?.(); onClose(); },
        },
        {
          id: 'action-download-svg',
          title: 'Download SVG',
          category: 'Actions',
          shortcut: 'Ctrl+S',
          icon: <Download className="w-4 h-4 text-lime" />,
          perform: () => { onDownloadSvg?.(); onClose(); },
        },
        {
          id: 'action-export-png-2x',
          title: 'Export PNG (2x Retina)',
          category: 'Actions',
          icon: <ImageIcon className="w-4 h-4" />,
          perform: () => { onDownloadPng?.(2); onClose(); },
        },
        {
          id: 'action-export-png-4x',
          title: 'Export PNG (4x Ultra)',
          category: 'Actions',
          icon: <ImageIcon className="w-4 h-4" />,
          perform: () => { onDownloadPng?.(4); onClose(); },
        }
      );
    }

    // Presets
    list.push(
      {
        id: 'preset-bw',
        title: 'Preset: Black & White',
        category: 'Presets',
        icon: <Sparkles className="w-4 h-4 text-lime" />,
        perform: () => { onLoadPreset('bw'); onClose(); },
      },
      {
        id: 'preset-photo',
        title: 'Preset: Photo',
        category: 'Presets',
        icon: <Sparkles className="w-4 h-4 text-lime" />,
        perform: () => { onLoadPreset('photo'); onClose(); },
      },
      {
        id: 'preset-poster',
        title: 'Preset: Poster',
        category: 'Presets',
        icon: <Sparkles className="w-4 h-4 text-lime" />,
        perform: () => { onLoadPreset('poster'); onClose(); },
      }
    );

    // Modes
    list.push(
      {
        id: 'mode-color',
        title: 'Color Mode: Full Color',
        category: 'Modes',
        icon: <Palette className="w-4 h-4" />,
        perform: () => { onUpdateSetting('colorMode', 'color'); onClose(); },
      },
      {
        id: 'mode-bw',
        title: 'Color Mode: B&W Threshold',
        category: 'Modes',
        icon: <Palette className="w-4 h-4" />,
        perform: () => { onUpdateSetting('colorMode', 'bw'); onClose(); },
      },
      {
        id: 'mode-spline',
        title: 'Curve Mode: Spline (Bezier)',
        category: 'Modes',
        icon: <Sliders className="w-4 h-4" />,
        perform: () => { onUpdateSetting('mode', 'spline'); onClose(); },
      },
      {
        id: 'mode-polygon',
        title: 'Curve Mode: Polygon',
        category: 'Modes',
        icon: <Sliders className="w-4 h-4" />,
        perform: () => { onUpdateSetting('mode', 'polygon'); onClose(); },
      }
    );

    // Settings & View
    list.push(
      {
        id: 'view-shortcuts',
        title: 'Toggle Shortcuts Bar',
        category: 'View',
        shortcut: '?',
        icon: <Keyboard className="w-4 h-4" />,
        perform: () => { onToggleShortcuts(); onClose(); },
      },
      {
        id: 'view-preferences',
        title: 'Preferences',
        category: 'View',
        shortcut: 'Ctrl+,',
        icon: <Settings className="w-4 h-4" />,
        perform: () => { onOpenPreferences(); onClose(); },
      },
      {
        id: 'theme-dark',
        title: 'Theme: Dark Studio Mode',
        category: 'Theme',
        icon: <Moon className="w-4 h-4" />,
        perform: () => { updatePreference('theme', 'dark'); onClose(); },
      },
      {
        id: 'theme-light',
        title: 'Theme: Light Mode',
        category: 'Theme',
        icon: <Sun className="w-4 h-4" />,
        perform: () => { updatePreference('theme', 'light'); onClose(); },
      },
      {
        id: 'theme-system',
        title: 'Theme: Follow System',
        category: 'Theme',
        icon: <Monitor className="w-4 h-4" />,
        perform: () => { updatePreference('theme', 'system'); onClose(); },
      }
    );

    if (hasImage && onClearImage) {
      list.push({
        id: 'action-clear',
        title: 'Clear Canvas & Reset',
        category: 'Actions',
        icon: <RefreshCw className="w-4 h-4 text-red-400" />,
        perform: () => { onClearImage(); onClose(); },
      });
    }

    if (isTauri) {
      list.push(
        {
          id: 'win-fullscreen',
          title: 'Toggle Fullscreen',
          category: 'Window',
          shortcut: 'F11',
          icon: <Maximize2 className="w-4 h-4" />,
          perform: async () => {
            const w = getCurrentWindow();
            const fs = await w.isFullscreen();
            await w.setFullscreen(!fs);
            onClose();
          },
        },
        {
          id: 'win-minimize',
          title: 'Minimize Window',
          category: 'Window',
          icon: <Minus className="w-4 h-4" />,
          perform: async () => {
            await getCurrentWindow().minimize();
            onClose();
          },
        },
        {
          id: 'win-close',
          title: 'Close Window',
          category: 'Window',
          icon: <X className="w-4 h-4 text-red-400" />,
          perform: async () => {
            await getCurrentWindow().close();
            onClose();
          },
        }
      );
    }

    return list;
  }, [hasImage, hasSvg, isTauri, onRunTrace, onCopySvg, onDownloadSvg, onDownloadPng, onClearImage, onLoadPreset, onUpdateSetting, onOpenPreferences, onToggleShortcuts, updatePreference, onClose]);

  // Filter
  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCommands;
    return allCommands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q)
    );
  }, [allCommands, query]);

  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(Math.max(0, filteredCommands.length - 1));
    }
  }, [filteredCommands.length, selectedIndex]);

  // Scroll into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector('[data-selected="true"]');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredCommands[selectedIndex];
      if (current) current.perform();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[14vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm command-palette-backdrop" />

      {/* Palette Card — exact Ona Framer style */}
      <div
        className="relative w-full max-w-xl overflow-hidden bg-white dark:bg-[#18181c] border border-black/10 dark:border-white/10 rounded-[15px] shadow-[0_24px_80px_rgba(0,0,0,0.5)] command-palette-card z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/[0.08] dark:border-white/[0.08]">
          <Search className="w-4 h-4 text-ink-muted dark:text-white/50 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search actions, modes, presets…"
            className="flex-1 bg-transparent text-sm text-ink dark:text-white placeholder:text-ink-muted/50 dark:placeholder:text-white/40 outline-none font-medium tracking-tight"
          />
          <kbd className="text-[11px] text-ink-muted dark:text-white/50 border border-black/10 dark:border-white/10 rounded px-1.5 py-0.5 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div 
          ref={listRef} 
          className="max-h-[380px] overflow-y-auto p-1.5"
        >
          {filteredCommands.length === 0 ? (
            <p className="text-sm text-ink-muted dark:text-white/40 text-center py-8">
              No results for “{query}”
            </p>
          ) : (
            filteredCommands.map((cmd, i) => {
              const isSelected = i === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  data-selected={isSelected}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onClick={() => cmd.perform()}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-left transition-colors cursor-pointer ${
                    isSelected 
                      ? 'bg-lime/15 dark:bg-lime/12 text-ink dark:text-white' 
                      : 'hover:bg-black/5 dark:hover:bg-white/5 text-ink/80 dark:text-white/80'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {cmd.icon}
                  </div>
                  <span className="text-sm text-ink dark:text-white flex-1 font-medium tracking-tight">
                    {cmd.title}
                  </span>
                  <span className="text-[11px] text-ink-muted dark:text-white/40 font-mono">
                    {cmd.shortcut || cmd.category}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

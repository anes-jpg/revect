import React from 'react';
import { 
  Command, Copy, Download, Keyboard, Settings, 
  Minus, Square, X, Check
} from 'lucide-react';
import Logo from './Logo';

interface TopNavIslandProps {
  onOpenCommandPalette: () => void;
  onOpenPreferences: () => void;
  onToggleShortcuts: () => void;
  showShortcuts: boolean;
  hasSvg: boolean;
  onCopySvg?: () => void;
  onDownloadSvg?: () => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

export function TopNavIsland({
  onOpenCommandPalette,
  onOpenPreferences,
  onToggleShortcuts,
  showShortcuts,
  hasSvg,
  onCopySvg,
  onDownloadSvg,
  isMaximized,
  onToggleMaximize,
  onMinimize,
  onClose,
}: TopNavIslandProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!hasSvg || !onCopySvg) return;
    onCopySvg();
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <header 
      className="relative h-12 w-full flex items-center justify-between bg-white/80 dark:bg-[#141416]/90 border-b border-black/[0.07] dark:border-white/[0.08] backdrop-blur-md select-none flex-shrink-0 z-40 transition-colors" 
      data-tauri-drag-region
    >
      {/* Left: Minimal, clean brand mark matching Ona's exact style */}
      <div className="flex items-center gap-2 h-full px-4 select-none" data-tauri-drag-region>
        <div className="h-5 w-auto text-ink dark:text-lime transition-colors">
          <Logo />
        </div>
        <span className="font-display font-bold text-[14px] tracking-tight text-ink dark:text-white">
          revect
        </span>
      </div>

      {/* Center: Ona-style centered floating options cluster */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 bg-black/[0.04] dark:bg-[#1E1E22]/80 backdrop-blur-md rounded-full p-1 border border-black/[0.06] dark:border-white/[0.08]">
        {/* Command Palette (Ctrl+K) */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink dark:text-white/70 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none"
          title="Command Palette (Ctrl+K)"
          aria-label="Command Palette"
        >
          <Command className="w-4 h-4" />
        </button>

        <span className="w-px h-4 bg-black/10 dark:bg-white/10 mx-0.5" aria-hidden />

        {/* Copy SVG */}
        <button
          type="button"
          disabled={!hasSvg}
          onClick={handleCopy}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none ${
            hasSvg 
              ? 'text-ink-muted hover:text-ink dark:text-white/70 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer' 
              : 'opacity-25 cursor-not-allowed text-ink-muted dark:text-white/40'
          }`}
          title={hasSvg ? (copied ? "Copied!" : "Copy SVG (Ctrl+C)") : "No SVG available"}
          aria-label="Copy SVG"
        >
          {copied ? <Check className="w-4 h-4 text-lime" /> : <Copy className="w-4 h-4" />}
        </button>

        {/* Download SVG */}
        <button
          type="button"
          disabled={!hasSvg}
          onClick={onDownloadSvg}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none ${
            hasSvg 
              ? 'text-ink-muted hover:text-ink dark:text-white/70 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer' 
              : 'opacity-25 cursor-not-allowed text-ink-muted dark:text-white/40'
          }`}
          title={hasSvg ? "Download SVG (Ctrl+S)" : "No SVG available"}
          aria-label="Download SVG"
        >
          <Download className="w-4 h-4" />
        </button>

        <span className="w-px h-4 bg-black/10 dark:bg-white/10 mx-0.5" aria-hidden />

        {/* Keyboard Shortcuts */}
        <button
          type="button"
          onClick={onToggleShortcuts}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none ${
            showShortcuts 
              ? 'bg-ink text-white dark:bg-lime dark:text-black font-semibold shadow-sm' 
              : 'text-ink-muted hover:text-ink dark:text-white/70 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
          }`}
          title="Toggle Shortcuts (?)"
          aria-label="Keyboard Shortcuts"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Preferences */}
        <button
          type="button"
          onClick={onOpenPreferences}
          className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink dark:text-white/70 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none"
          title="Preferences (Ctrl+,)"
          aria-label="Preferences"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Ona-style flush window control buttons */}
      <div className="flex items-center h-full">
        <button
          type="button"
          onClick={onMinimize}
          className="w-11 h-full flex items-center justify-center text-ink-muted hover:text-ink dark:text-white/60 dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors focus:outline-none"
          aria-label="Minimize"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onToggleMaximize}
          className="w-11 h-full flex items-center justify-center text-ink-muted hover:text-ink dark:text-white/60 dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors focus:outline-none"
          aria-label="Maximize"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-11 h-full flex items-center justify-center text-ink-muted hover:text-white dark:text-white/60 hover:bg-[#e81123] dark:hover:text-white transition-colors focus:outline-none"
          aria-label="Close"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

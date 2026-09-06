import React from 'react';
import { 
  Command, Copy, Download, Keyboard, Settings, Check 
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
      className="relative h-11 w-full flex items-center justify-between bg-white/80 dark:bg-[#141416]/90 border-b border-black/[0.06] dark:border-white/[0.08] backdrop-blur-md select-none flex-shrink-0 z-40 transition-colors" 
      data-tauri-drag-region
    >
      {/* Left: Authentic Apple Mac Traffic Lights + Brand Mark */}
      <div className="flex items-center gap-3 h-full pl-3.5 pr-4 select-none" data-tauri-drag-region>
        {/* macOS Traffic Lights */}
        <div className="flex items-center gap-2 group/traffic py-1 pr-1" data-tauri-drag-region>
          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] flex items-center justify-center transition-all active:brightness-90 focus:outline-none cursor-pointer"
          >
            <svg viewBox="0 0 12 12" width="6" height="6" className="opacity-0 group-hover/traffic:opacity-100 transition-opacity pointer-events-none">
              <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="#4D0000" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          {/* Minimize */}
          <button
            type="button"
            onClick={onMinimize}
            aria-label="Minimize"
            title="Minimize"
            className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] flex items-center justify-center transition-all active:brightness-90 focus:outline-none cursor-pointer"
          >
            <svg viewBox="0 0 12 12" width="6" height="6" className="opacity-0 group-hover/traffic:opacity-100 transition-opacity pointer-events-none">
              <line x1="2" y1="6" x2="10" y2="6" stroke="#5E3D00" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          {/* Maximize / Zoom */}
          <button
            type="button"
            onClick={onToggleMaximize}
            aria-label={isMaximized ? "Restore" : "Zoom"}
            title={isMaximized ? "Restore" : "Zoom"}
            className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] flex items-center justify-center transition-all active:brightness-90 focus:outline-none cursor-pointer"
          >
            <svg viewBox="0 0 12 12" width="6" height="6" className="opacity-0 group-hover/traffic:opacity-100 transition-opacity pointer-events-none">
              {isMaximized ? (
                <line x1="2" y1="6" x2="10" y2="6" stroke="#004D00" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M2.5 6h7M6 2.5v7" stroke="#004D00" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>

        <span className="w-px h-3.5 bg-black/10 dark:bg-white/10" aria-hidden />

        {/* Minimal clean brand mark */}
        <div className="flex items-center gap-2 select-none" data-tauri-drag-region>
          <div className="h-4 w-auto text-ink dark:text-lime transition-colors">
            <Logo />
          </div>
          <span className="font-display font-bold text-[13px] tracking-tight text-ink dark:text-white">
            revect
          </span>
        </div>
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

      {/* Right: Clean macOS drag region & subtle status */}
      <div className="flex items-center h-full pr-4 select-none" data-tauri-drag-region>
        {hasSvg ? (
          <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-lime/15 text-lime-dark dark:text-lime border border-lime/20 flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
            Vector Ready
          </span>
        ) : (
          <span className="text-[11px] font-mono text-black/25 dark:text-white/25 tracking-wider select-none pointer-events-none">
            v0.3.0
          </span>
        )}
      </div>
    </header>
  );
}

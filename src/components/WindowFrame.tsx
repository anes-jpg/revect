import React, { useEffect, useState, useCallback } from 'react';
import { KeyboardShortcutsBar } from './KeyboardShortcutsBar';
import { TopNavIsland } from './TopNavIsland';
import { getCurrentWindow, type Window } from '@tauri-apps/api/window';

export function WindowFrame({ 
  children, 
  rightPanel, 
  showShortcuts,
  onOpenCommandPalette,
  onOpenPreferences,
  onToggleShortcuts,
  hasSvg = false,
  onCopySvg,
  onDownloadSvg,
}: { 
  children: React.ReactNode; 
  rightPanel?: React.ReactNode; 
  showShortcuts?: boolean;
  onOpenCommandPalette?: () => void;
  onOpenPreferences?: () => void;
  onToggleShortcuts?: () => void;
  hasSvg?: boolean;
  onCopySvg?: () => void;
  onDownloadSvg?: () => void;
}) {
  const [appWindow, setAppWindow] = useState<Window | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  // Browser fallbacks for the window controls. Only meaningful in a top-level
  // browser tab (embedded webviews can react badly to the Fullscreen API).
  const isTopLevelBrowser = useCallback(
    () => !appWindow && window.self === window.top,
    [appWindow]
  );

  // Window control functions. Every call is guarded with .catch() so a denied
  // or failed operation surfaces as a console warning instead of an unhandled
  // rejection; in a plain browser we fall back to the closest browser
  // equivalents so the buttons are never dead.
  const minimize = useCallback(() => {
    if (appWindow) {
      appWindow.minimize().catch((e) => console.warn('minimize failed:', e));
    }
  }, [appWindow]);

  const maximize = useCallback(() => {
    if (appWindow) {
      appWindow.toggleMaximize().catch((e) => console.warn('toggleMaximize failed:', e));
    } else if (isTopLevelBrowser()) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    }
  }, [appWindow, isTopLevelBrowser]);

  const close = useCallback(() => {
    if (appWindow) {
      appWindow.close().catch((e) => console.warn('close failed:', e));
    } else if (isTopLevelBrowser()) {
      window.close();
    }
  }, [appWindow, isTopLevelBrowser]);

  // Initialize window and track state
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let unlistenMoved: (() => void) | undefined;

    try {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const win = getCurrentWindow();
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time native window init
        setAppWindow(win);

        // Check initial state
        win.isMaximized().then(setIsMaximized).catch(() => {});

        // Single listener for all window state changes
        win.onResized(() => {
          win.isMaximized().then(setIsMaximized).catch(() => {});
        }).then((fn) => { unlisten = fn; }).catch((e) => console.warn('onResized failed:', e));

        // Keep the maximize/fullscreen icons in sync while dragging the window
        // or changing state through the OS (double-click titlebar, etc.).
        win.onMoved(() => {
          win.isMaximized().then(setIsMaximized).catch(() => {});
        }).then((fn) => { unlistenMoved = fn; }).catch(() => {});
      }
    } catch {
      console.warn("Not running in Tauri environment");
    }

    return () => {
      unlisten?.();
      unlistenMoved?.();
    };
  }, []);

  return (
    <div
      className="w-screen h-screen bg-white dark:bg-canvas-bg flex flex-col overflow-hidden select-none"
      data-tauri-drag-region
    >
      {/* Ona & Swift Bloodline Title Bar */}
      <TopNavIsland
        onOpenCommandPalette={onOpenCommandPalette || (() => {})}
        onOpenPreferences={onOpenPreferences || (() => {})}
        onToggleShortcuts={onToggleShortcuts || (() => {})}
        showShortcuts={!!showShortcuts}
        hasSvg={hasSvg}
        onCopySvg={onCopySvg}
        onDownloadSvg={onDownloadSvg}
        isMaximized={isMaximized}
        onToggleMaximize={maximize}
        onMinimize={minimize}
        onClose={close}
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Canvas Area */}
        <div className="flex-1 h-full relative bg-white dark:bg-canvas-bg">
          {children}
        </div>

        {/* Right Settings Sidebar */}
        <div className="w-[30%] min-w-[280px] max-w-[340px] h-full bg-panel-bg dark:bg-panel-dark flex flex-col relative overflow-hidden border-l border-black/5 dark:border-white/5 transition-colors duration-200">
          <div className="absolute inset-0 bg-white/20 dark:bg-black/20 pointer-events-none" />
          
          <div className="absolute inset-0">
            {rightPanel}
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Bar */}
      {showShortcuts && <KeyboardShortcutsBar />}
    </div>
  );
}

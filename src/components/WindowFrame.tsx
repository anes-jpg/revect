import React, { useEffect, useState, useCallback } from 'react';
import { Copy, Maximize2, Minus, X } from 'lucide-react';
import { KeyboardShortcutsBar } from './KeyboardShortcutsBar';
import { getCurrentWindow, type Window } from '@tauri-apps/api/window';

export function WindowFrame({ 
  children, 
  rightPanel, 
  showShortcuts 
}: { 
  children: React.ReactNode; 
  rightPanel?: React.ReactNode; 
  showShortcuts?: boolean;
}) {
  const [appWindow, setAppWindow] = useState<Window | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Window control functions
  const minimize = useCallback(() => {
    appWindow?.minimize();
  }, [appWindow]);

  const maximize = useCallback(() => {
    appWindow?.toggleMaximize();
  }, [appWindow]);

  const close = useCallback(() => {
    appWindow?.close();
  }, [appWindow]);

  const fullscreen = useCallback(() => {
    if (appWindow) {
      appWindow.isFullscreen().then((fs) => {
        appWindow.setFullscreen(!fs);
      });
    }
  }, [appWindow]);

  // Initialize window and track state
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    try {
      if ('__TAURI_INTERNALS__' in window || '__TAURI__' in window) {
        const win = getCurrentWindow();
        setAppWindow(win);

        // Check initial state
        win.isMaximized().then(setIsMaximized).catch(() => {});
        win.isFullscreen().then(setIsFullscreen).catch(() => {});

        // Single listener for all window state changes
        win.onResized(() => {
          win.isMaximized().then(setIsMaximized).catch(() => {});
          win.isFullscreen().then(setIsFullscreen).catch(() => {});
        }).then((fn) => { unlisten = fn; });
      }
    } catch (e) {
      console.warn("Not running in Tauri environment");
    }

    return () => {
      unlisten?.();
    };
  }, []);

  return (
    <div className="w-screen h-screen p-6 flex items-center justify-center bg-transparent">
      <div 
        className="w-full h-full rounded-[24px] flex flex-col overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] ring-[8px] ring-lime"
        style={{ animation: 'windowEnter 500ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Canvas Area */}
          <div className="flex-1 h-full relative bg-white">
            {children}
          </div>

          {/* Right Settings Sidebar */}
          <div className="w-[30%] min-w-[280px] max-w-[340px] h-full bg-lime flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 bg-white/20 pointer-events-none" />
            
            {/* Titlebar / Drag Region */}
            <div 
              data-tauri-drag-region 
              className="absolute top-0 inset-x-0 h-14 z-50 flex items-center justify-end px-3 pointer-events-none"
            >
              <div className="flex items-center bg-black/10 backdrop-blur-md rounded-full p-[2px] gap-[2px] pointer-events-auto">
                {/* Minimize Button */}
                <button
                  onClick={minimize}
                  className="flex items-center justify-center w-[22px] h-[22px] rounded-full hover:bg-black/10 text-ink cursor-pointer transition-all group"
                  title="Minimize"
                >
                  <Minus size={12} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                </button>

                {/* Maximize/Restore Button */}
                <button
                  onClick={maximize}
                  className="flex items-center justify-center w-[22px] h-[22px] rounded-full hover:bg-black/10 text-ink cursor-pointer transition-all group"
                  title={isMaximized ? "Restore" : "Maximize"}
                >
                  {isMaximized ? (
                    <Copy size={10} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                  ) : (
                    <Maximize2 size={10} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                  )}
                </button>

                {/* Fullscreen Button */}
                <button
                  onClick={fullscreen}
                  className="flex items-center justify-center w-[22px] h-[22px] rounded-full hover:bg-black/10 text-ink cursor-pointer transition-all group"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  <svg 
                    width="10" 
                    height="10" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="group-hover:scale-110 transition-transform"
                  >
                    {isFullscreen ? (
                      <>
                        <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                        <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                        <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                        <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                      </>
                    ) : (
                      <>
                        <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                        <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                        <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                        <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                      </>
                    )}
                  </svg>
                </button>

                {/* Close Button */}
                <button
                  onClick={close}
                  className="flex items-center justify-center w-[22px] h-[22px] rounded-full bg-[#FF3B30] text-white hover:bg-[#FF3B30]/90 cursor-pointer transition-all group shadow-sm"
                  title="Close"
                >
                  <X size={10} strokeWidth={2.5} className="transition-transform group-hover:scale-110" />
                </button>
              </div>
            </div>
            
            <div className="absolute inset-0">
              {rightPanel}
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Bar */}
        {showShortcuts && <KeyboardShortcutsBar />}
      </div>
    </div>
  );
}

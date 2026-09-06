import React, { useReducer, useState, useRef, useEffect, useCallback } from 'react';
import { WindowFrame } from './components/WindowFrame';
import { SettingsPanel } from './components/SettingsPanel';
import { CanvasPanel } from './components/CanvasPanel';
import { PreferencesModal } from './components/PreferencesModal';
import { CommandPalette } from './components/CommandPalette';
import { PathEditor } from './components/PathEditor';
import { BootScreen } from './components/BootScreen';
import { settingsReducer, defaultSettings } from './hooks/useSettings';
import { useTranslation } from './i18n';
import { useToast } from './hooks/useToast';
import { useSvgHistory } from './hooks/useSvgHistory';

// True when a keyboard event originates from a text-editing target, so global
// shortcuts (undo/redo, pan, zoom) don't hijack typing.
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}

function App() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const svgHistory = useSvgHistory();

  const [settings, dispatch] = useReducer(settingsReducer, defaultSettings);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [svgOutput, setSvgOutput] = useState<string | null>(null);
  const [isTracing, setIsTracing] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isBooting, setIsBooting] = useState(true);

  const workerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const [imageVersion, setImageVersion] = useState(0);

  // Monotonic id so out-of-order / stale worker results can be discarded.
  const requestIdRef = useRef(0);
  const latestRequestIdRef = useRef(0);

  // The worker is created once, but its onmessage must always see the *current*
  // svgHistory/addToast. Route messages through a ref that we refresh every render,
  // otherwise the handler captures mount-time closures (stale history = broken undo/redo).
  const handleWorkerMessage = useCallback((e: MessageEvent) => {
    // Ignore results from a superseded trace.
    if (e.data.requestId !== latestRequestIdRef.current) return;

    if (e.data.type === 'RESULT') {
      setSvgOutput(e.data.svg);
      svgHistory.pushState(e.data.svg);
      setError(null);
      setIsTracing(false);
      addToast('✓ Vector ready', 'success');
    } else if (e.data.type === 'ERROR') {
      console.error("VTracer Error:", e.data.error);
      setError(e.data.error);
      setIsTracing(false);
      addToast('⚠ Trace failed — try a simpler image', 'warning');
    }
  }, [svgHistory, addToast]);

  const messageHandlerRef = useRef(handleWorkerMessage);
  useEffect(() => { messageHandlerRef.current = handleWorkerMessage; });

  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker/vtracer.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (e) => messageHandlerRef.current(e);
    return () => { workerRef.current?.terminate(); };
  }, []);

  // Cache ImageData when originalImage changes. Bumping imageVersion is what
  // triggers a trace (via the debounced effect below) — no direct trace here,
  // so a load produces exactly one trace instead of two.
  useEffect(() => {
    if (!originalImage) {
      imageDataRef.current = null;
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.src = originalImage;
    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error("Could not create canvas context");

        ctx.clearRect(0, 0, img.width, img.height);
        ctx.drawImage(img, 0, 0);

        imageDataRef.current = ctx.getImageData(0, 0, img.width, img.height);
        setImageVersion(v => v + 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to cache image data");
      }
    };
    img.onerror = () => {
      if (!cancelled) setError("Failed to load the image.");
    };
    return () => { cancelled = true; };
  }, [originalImage]);

  const handleRunTrace = useCallback(() => {
    if (!imageDataRef.current || !workerRef.current) return;
    const requestId = ++requestIdRef.current;
    latestRequestIdRef.current = requestId;
    setIsTracing(true);
    setError(null);
    workerRef.current.postMessage({
      type: 'TRACE',
      payload: { requestId, imageData: imageDataRef.current, settings }
    });
  }, [settings]);

  // Single debounced trace trigger: fires on settings changes AND new images.
  useEffect(() => {
    if (!settings.livePreview || !imageDataRef.current) return;
    const timeoutId = setTimeout(handleRunTrace, 150);
    return () => clearTimeout(timeoutId);
  }, [settings, imageVersion, handleRunTrace]);

  // File handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > 20 * 1024 * 1024) {
      addToast('⚠ File exceeds 20MB limit', 'warning');
      return;
    }

    // Validate format
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      addToast('✕ Only PNG, JPG, WEBP, GIF', 'error');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setOriginalImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      addToast('⚠ File exceeds 20MB limit', 'warning');
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      addToast('✕ Only PNG, JPG, WEBP, GIF', 'error');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setOriginalImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, [addToast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Export functions
  const handleDownloadSvg = useCallback(() => {
    if (!svgOutput) return;
    const blob = new Blob([svgOutput], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = fileName ? fileName.replace(/\.[^.]+$/, '') : 'output';
    a.download = `${baseName}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`✓ Saved as ${baseName}.svg`, 'success');
  }, [svgOutput, fileName, addToast]);

  const handleDownloadPng = useCallback((scale: number = 2) => {
    if (!svgOutput) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgOutput, 'image/svg+xml');
    const svgEl = doc.documentElement;
    // Prefer explicit width/height, but fall back to the viewBox so aspect ratio
    // survives even when the SVG only carries a viewBox.
    const viewBox = (svgEl.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    const width = parseInt(svgEl.getAttribute('width') || '') || viewBox[2] || 800;
    const height = parseInt(svgEl.getAttribute('height') || '') || viewBox[3] || 600;

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const blob = new Blob([svgOutput], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(b => {
        if (!b) return;
        const dlUrl = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = dlUrl;
        const baseName = fileName ? fileName.replace(/\.[^.]+$/, '') : 'output';
        a.download = `${baseName}_${scale}x.png`;
        a.click();
        URL.revokeObjectURL(dlUrl);
        URL.revokeObjectURL(url);
        addToast(`✓ Saved as ${baseName}_${scale}x.png`, 'success');
      }, 'image/png');
    };
    img.src = url;
  }, [svgOutput, fileName, addToast]);

  const handleCopySvg = useCallback(async () => {
    if (!svgOutput) return;
    try {
      await navigator.clipboard.writeText(svgOutput);
      addToast('✓ SVG copied', 'success');
    } catch {
      addToast('⚠ Failed to copy', 'error');
    }
  }, [svgOutput, addToast]);

  // SVG editing
  const handleSvgEdit = useCallback((newSvg: string) => {
    setSvgOutput(newSvg);
    svgHistory.pushState(newSvg);
  }, [svgHistory]);

  // Path selection
  const handleSelectPath = useCallback((id: string | null) => {
    setSelectedPathId(id);
  }, []);

  // Clear canvas
  const handleClearImage = useCallback(() => {
    setOriginalImage(null);
    setFileName(null);
    setSvgOutput(null);
    setSelectedPathId(null);
    imageDataRef.current = null;
    setImageVersion(v => v + 1);
    addToast('Canvas cleared', 'success');
  }, [addToast]);

  // Keyboard shortcuts for undo/redo and Command Palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Toggle Command Palette with Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Don't hijack shortcuts while the user is typing in an input.
      if (isTypingTarget(e.target)) return;

      // Question mark toggles keyboard shortcuts
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
        return;
      }

      if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
        e.preventDefault();
        const svg = svgHistory.redo();
        if (svg) {
          setSvgOutput(svg);
          addToast('↪ Redone', 'success');
        }
      } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        const svg = svgHistory.undo();
        if (svg) {
          setSvgOutput(svg);
          addToast('↩ Undone', 'success');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [svgHistory, addToast]);

  const rightPanel = (
    <SettingsPanel
      settings={settings}
      dispatch={dispatch}
      onRunTrace={handleRunTrace}
      isTracing={isTracing}
      hasImage={!!originalImage}
      fileSizeEstimate={svgOutput ? `~ ${(svgOutput.length / 1024).toFixed(1)} KB` : undefined}
      error={error}
      onOpenPreferences={() => setIsPreferencesOpen(true)}
      onDownloadSvg={handleDownloadSvg}
      onDownloadPng={handleDownloadPng}
      onCopySvg={handleCopySvg}
      svgOutput={svgOutput}
      selectedPathId={selectedPathId}
      onSelectPath={(id: string) => handleSelectPath(id)}
      onSvgEdit={handleSvgEdit}
      showShortcuts={showShortcuts}
      onToggleShortcuts={() => setShowShortcuts(prev => !prev)}
    />
  );

  return (
    <WindowFrame 
      rightPanel={rightPanel} 
      showShortcuts={showShortcuts}
      onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      onOpenPreferences={() => setIsPreferencesOpen(true)}
      onToggleShortcuts={() => setShowShortcuts(prev => !prev)}
      hasSvg={!!svgOutput}
      onCopySvg={handleCopySvg}
      onDownloadSvg={handleDownloadSvg}
    >
      {isBooting && <BootScreen onFinished={() => setIsBooting(false)} />}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp, image/gif"
        className="hidden"
      />

      {!originalImage ? (
        <div
          className="w-full h-full flex flex-col items-center justify-center p-6"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-[420px] max-w-[90%] h-[300px] border border-dashed border-lime/40 hover:border-lime rounded-[28px] bg-black/[0.02] dark:bg-white/[0.02] hover:bg-lime/[0.03] dark:hover:bg-lime/[0.04] backdrop-blur-sm flex flex-col items-center justify-center transition-all duration-300 cursor-pointer group shadow-[0_10px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.2)] animate-breathe"
          >
            <div className="w-18 h-18 mb-5 relative transition-transform duration-300 group-hover:scale-105">
              <div className="absolute inset-0 bg-ink rounded-[18px] opacity-10 dark:opacity-20 translate-x-1.5 translate-y-1.5" />
              <div className="absolute inset-0 border-2 border-lime/80 rounded-[18px] flex items-center justify-center bg-white dark:bg-[#1C1C20] shadow-md">
                <span className="font-display font-bold text-2xl text-lime">R</span>
              </div>
            </div>
            <h2 className="font-display font-bold text-[17px] text-ink dark:text-white mb-1.5 tracking-tight">{t('drop.title')}</h2>
            <div className="px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[11px] font-mono text-ink-muted dark:text-white/50">
              {t('drop.subtitle')}
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-full relative" onDrop={handleDrop} onDragOver={handleDragOver}>
          <CanvasPanel
            originalImage={originalImage}
            svgOutput={svgOutput}
            isTracing={isTracing}
            onSelectPath={handleSelectPath}
            selectedPathId={selectedPathId}
            onSvgEdit={handleSvgEdit}
          />

          {/* Path Editor */}
          {selectedPathId && svgOutput && (
            <PathEditor
              pathId={selectedPathId}
              svgOutput={svgOutput}
              onSvgEdit={handleSvgEdit}
              onClose={() => handleSelectPath(null)}
              onToast={addToast}
            />
          )}
        </div>
      )}

      {isPreferencesOpen && (
        <PreferencesModal onClose={() => setIsPreferencesOpen(false)} />
      )}

      {/* Ctrl+K Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onRunTrace={handleRunTrace}
        onCopySvg={handleCopySvg}
        onDownloadSvg={handleDownloadSvg}
        onDownloadPng={handleDownloadPng}
        onLoadPreset={(preset) => dispatch({ type: 'LOAD_PRESET', payload: preset })}
        onUpdateSetting={(key, value) => dispatch({ type: 'UPDATE', payload: { [key]: value } })}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
        onToggleShortcuts={() => setShowShortcuts(prev => !prev)}
        onClearImage={handleClearImage}
        hasImage={!!originalImage}
        hasSvg={!!svgOutput}
      />
    </WindowFrame>
  );
}

export default App;

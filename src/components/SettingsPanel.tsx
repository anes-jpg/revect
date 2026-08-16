import React, { useState } from 'react';
import { Info, Download, Copy, Play, Settings, Keyboard } from 'lucide-react';
import type { TraceSettings, SettingsAction } from '../hooks/useSettings';
import Logo from './Logo';
import { LayersPanel } from './LayersPanel';
import { useTranslation } from '../i18n';

interface SettingsPanelProps {
  settings: TraceSettings;
  dispatch: React.Dispatch<SettingsAction>;
  onRunTrace: () => void;
  isTracing: boolean;
  fileSizeEstimate?: string;
  hasImage: boolean;
  error?: string | null;
  onOpenPreferences: () => void;
  onDownloadSvg?: () => void;
  onDownloadPng?: (scale: number) => void;
  onCopySvg?: () => void;
  svgOutput?: string | null;
  selectedPathId?: string | null;
  onSelectPath?: (id: string) => void;
  onSvgEdit?: (newSvg: string) => void;
  showShortcuts: boolean;
  onToggleShortcuts: () => void;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
  tooltip?: string;
}

const Slider = ({ label, value, min, max, step = 1, onChange, unit = '', tooltip }: SliderProps) => (
  <div className="mb-4">
    <div className="flex justify-between items-center mb-2">
      <div className="flex items-center gap-1.5">
        <label className="font-sans font-semibold text-[12px] text-ink">{label}</label>
        {tooltip && (
          <div className="group relative cursor-help">
            <Info size={12} className="text-ink-muted" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-ink text-canvas-bg text-[10px] rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <div className="font-mono text-[11px] bg-black/10 px-2 py-0.5 rounded-full text-ink font-bold min-w-[36px] text-center">
        {value}{unit}
      </div>
    </div>
    <input 
      type="range" 
      min={min} max={max} step={step} 
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-black/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110"
    />
  </div>
);

export function SettingsPanel({ settings, dispatch, onRunTrace, isTracing, fileSizeEstimate, hasImage, error, onOpenPreferences, onDownloadSvg, onDownloadPng, onCopySvg, svgOutput, selectedPathId, onSelectPath, onSvgEdit, showShortcuts, onToggleShortcuts }: SettingsPanelProps) {
  const { t } = useTranslation();
  const [showPngScale, setShowPngScale] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const update = (key: keyof TraceSettings, value: TraceSettings[keyof TraceSettings]) => {
    dispatch({ type: 'UPDATE', payload: { [key]: value } });
  };

  const handleCopy = () => {
    onCopySvg?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto pt-4 pb-4 transform-gpu">
      {/* Header */}
      <div className="px-6 pb-4 flex justify-between items-start relative min-h-[80px]">
        <div className="h-16 w-auto text-ink">
          <Logo />
        </div>
        <div className="absolute right-6 top-8 flex items-center gap-2">
          <button 
            onClick={onToggleShortcuts}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 ${
              showShortcuts 
                ? 'bg-ink text-white shadow-md' 
                : 'bg-black/5 hover:bg-black/10 text-ink-muted hover:text-ink'
            }`}
            title={showShortcuts ? "Hide Controls" : "Show Controls"}
          >
            <Keyboard size={16} />
          </button>
          <button 
            onClick={onOpenPreferences}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-ink-muted hover:text-ink transition-colors"
            title="Preferences"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 flex flex-col gap-6">
        
        {/* Presets */}
        <div className="flex gap-2">
          {(['bw', 'photo', 'poster'] as const).map((presetKey) => (
            <button 
              key={presetKey}
              onClick={() => dispatch({ type: 'LOAD_PRESET', payload: presetKey })}
              className="flex-1 py-1.5 rounded-full text-[12px] font-bold border border-black/10 hover:border-black/30 transition-all bg-white/40 hover:bg-white/60 text-ink active:scale-[0.96]"
            >
              {t(`preset.${presetKey}`)}
            </button>
          ))}
        </div>

        {/* Color Mode */}
        <div className="relative flex bg-black/10 p-1 rounded-full">
          <div 
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full transition-transform duration-300 ease-out shadow-sm"
            style={{ transform: settings.colorMode === 'bw' ? 'translateX(100%)' : 'translateX(0)' }}
          />
          <button 
            onClick={() => update('colorMode', 'color')}
            className={`flex-1 py-1.5 z-10 text-[13px] font-bold transition-colors ${settings.colorMode === 'color' ? 'text-ink' : 'text-ink-muted hover:text-ink'}`}
          >
             {t('mode.color')}
          </button>
          <button 
            onClick={() => update('colorMode', 'bw')}
            className={`flex-1 py-1.5 z-10 text-[13px] font-bold transition-colors ${settings.colorMode === 'bw' ? 'text-ink' : 'text-ink-muted hover:text-ink'}`}
          >
            {t('mode.bw')}
          </button>
        </div>

        {/* Tracing Mode */}
        <div className="relative flex bg-black/10 p-1 rounded-full">
          <div 
            className="absolute top-1 bottom-1 w-[calc(33.33%-2.66px)] bg-white rounded-full transition-transform duration-300 ease-out shadow-sm"
            style={{ 
              transform: settings.tracingMode === 'pixel' ? 'translateX(0)' 
                       : settings.tracingMode === 'polygon' ? 'translateX(100%)' 
                       : 'translateX(200%)' 
            }}
          />
          {(['pixel', 'polygon', 'spline'] as const).map((mode) => (
            <button 
              key={mode}
              onClick={() => update('tracingMode', mode)}
              className={`flex-1 py-1.5 z-10 text-[12px] capitalize font-bold transition-colors ${settings.tracingMode === mode ? 'text-ink' : 'text-ink-muted hover:text-ink'}`}
            >
              {t(`trace.${mode}`)}
            </button>
          ))}
        </div>

        {/* Sliders */}
        <div className="space-y-1">
          {settings.colorMode === 'color' && (
            <Slider label={t('slider.colorPrecision.label')} value={settings.colorPrecision} min={1} max={8} onChange={(v: number) => update('colorPrecision', v)} tooltip={t('slider.colorPrecision.tooltip')} />
          )}
          {settings.colorMode === 'bw' && (
            <Slider label={t('slider.bwThreshold.label')} value={settings.bwThreshold} min={1} max={255} onChange={(v: number) => update('bwThreshold', v)} tooltip={t('slider.bwThreshold.tooltip')} />
          )}
          <Slider label={t('slider.filterSpeckle.label')} value={settings.filterSpeckle} min={1} max={128} onChange={(v: number) => update('filterSpeckle', v)} tooltip={t('slider.filterSpeckle.tooltip')} />
          <Slider label={t('slider.cornerThreshold.label')} value={settings.cornerThreshold} min={0} max={180} onChange={(v: number) => update('cornerThreshold', v)} unit="°" tooltip={t('slider.cornerThreshold.tooltip')} />
          
          {settings.colorMode === 'color' && (
            <Slider label={t('slider.gradientStep.label')} value={settings.gradientStep} min={0} max={255} onChange={(v: number) => update('gradientStep', v)} tooltip={t('slider.gradientStep.tooltip')} />
          )}
          
          {settings.tracingMode === 'spline' && (
            <>
              <Slider label={t('slider.segmentLength.label')} value={settings.segmentLength} min={2} max={20} onChange={(v: number) => update('segmentLength', v)} tooltip={t('slider.segmentLength.tooltip')} />
              <Slider label={t('slider.spliceThreshold.label')} value={settings.spliceThreshold} min={0} max={180} onChange={(v: number) => update('spliceThreshold', v)} unit="°" tooltip={t('slider.spliceThreshold.tooltip')} />
            </>
          )}
          
          <Slider label={t('slider.pathPrecision.label')} value={settings.pathPrecision} min={0} max={8} onChange={(v: number) => update('pathPrecision', v)} tooltip={t('slider.pathPrecision.tooltip')} />
        </div>

        {/* Hierarchical Mode */}
        {settings.colorMode === 'color' && (
          <div className="relative flex bg-black/10 p-1 rounded-full">
            <div 
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full transition-transform duration-300 ease-out shadow-sm"
              style={{ transform: settings.hierarchical === 'cutout' ? 'translateX(100%)' : 'translateX(0)' }}
            />
            <button 
              onClick={() => update('hierarchical', 'stacked')}
              className={`flex-1 py-1 z-10 text-[12px] font-bold transition-colors ${settings.hierarchical === 'stacked' ? 'text-ink' : 'text-ink-muted hover:text-ink'}`}
            >
               {t('hierarchical.stacked')}
            </button>
            <button 
              onClick={() => update('hierarchical', 'cutout')}
              className={`flex-1 py-1 z-10 text-[12px] font-bold transition-colors ${settings.hierarchical === 'cutout' ? 'text-ink' : 'text-ink-muted hover:text-ink'}`}
            >
              {t('hierarchical.cutout')}
            </button>
          </div>
        )}

        {/* Live Preview Toggle */}
        <div className="flex items-center gap-3 bg-black/5 p-3 rounded-[12px]">
          <button 
            onClick={() => update('livePreview', !settings.livePreview)}
            className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${settings.livePreview ? 'bg-lime-dark' : 'bg-black/20'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${settings.livePreview ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
          <span className="font-sans text-[12px] font-bold text-ink flex-1">{t('preview.live')}</span>
          {isTracing && settings.livePreview && (
            <div className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {!settings.livePreview && (
          <button 
            onClick={onRunTrace}
            disabled={!hasImage || isTracing}
            className="w-full py-3 bg-ink text-canvas-bg rounded-[12px] font-bold text-[14px] flex justify-center items-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-50 active:scale-[0.97]"
          >
            {isTracing ? <div className="w-4 h-4 border-2 border-canvas-bg border-t-transparent rounded-full animate-spin" /> : <Play size={16} />}
            {t('button.runTrace')}
          </button>
        )}

        {/* Layers Panel */}
        {svgOutput && onSelectPath && onSvgEdit && (
          <LayersPanel
            svgOutput={svgOutput}
            onSelectPath={onSelectPath}
            selectedPathId={selectedPathId || null}
            onSvgEdit={onSvgEdit}
          />
        )}

        {/* Export Section */}
        <div className="mt-auto pt-4 flex flex-col gap-2">
          <div className="flex justify-between items-center mb-1">
            <span className="font-sans font-bold text-[12px] text-ink">{t('export.title')}</span>
            {fileSizeEstimate && <span className="text-[10px] font-mono text-ink-muted">{fileSizeEstimate}</span>}
          </div>
          <button 
            onClick={onDownloadSvg}
            className="w-full py-2.5 bg-white/60 hover:bg-white border border-white/40 rounded-[10px] font-bold text-[12px] text-ink flex justify-center items-center gap-2 transition-all shadow-sm active:scale-[0.97]"
          >
            <Download size={14} /> {t('export.downloadSvg')}
          </button>
          
          {/* PNG with scale dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowPngScale(!showPngScale)}
              className="w-full py-2.5 bg-white/60 hover:bg-white border border-white/40 rounded-[10px] font-bold text-[12px] text-ink flex justify-center items-center gap-2 transition-all shadow-sm active:scale-[0.97]"
            >
              <Download size={14} /> {t('export.downloadPng')}
            </button>
            {showPngScale && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-xl shadow-xl border border-black/10 overflow-hidden z-20">
                {[1, 2, 4].map(scale => (
                  <button
                    key={scale}
                    onClick={() => { onDownloadPng?.(scale); setShowPngScale(false); }}
                    className="w-full px-4 py-2 text-[12px] font-bold text-ink hover:bg-lime/10 transition-colors text-left"
                  >
                    {scale}× Scale
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={handleCopy}
            className="w-full py-2.5 bg-white/60 hover:bg-white border border-white/40 rounded-[10px] font-bold text-[12px] text-ink flex justify-center items-center gap-2 transition-all shadow-sm active:scale-[0.97]"
          >
            <Copy size={14} /> {copied ? '✓ Copied!' : t('export.copySvg')}
          </button>
        </div>
        
        {/* Error State */}
        {error && (
          <div className="mt-2 p-3 bg-red-500/20 border border-red-500/50 rounded-[10px] text-[11px] text-red-900 font-medium">
            ⚠️ {error}
          </div>
        )}

      </div>
    </div>
  );
}

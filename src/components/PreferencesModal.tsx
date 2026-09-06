
import { X, Monitor, HardDrive, Cpu, Globe } from 'lucide-react';
import { usePreferences } from '../hooks/PreferencesContext';

import { useTranslation } from '../i18n';

interface PreferencesModalProps {
  onClose: () => void;
}

export function PreferencesModal({ onClose }: PreferencesModalProps) {
  const { preferences, updatePreference } = usePreferences();
  const { t } = useTranslation();

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm transition-all animate-in fade-in duration-200">
      <div className="w-[480px] bg-canvas-bg rounded-[16px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col border border-ink/5 animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="h-14 border-b border-ink/5 flex items-center justify-between px-5 bg-canvas-bg">
          <h2 className="font-display font-bold text-[16px] text-ink">{t('pref.title')}</h2>
          <button 
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-ink/5 text-ink-muted hover:text-ink transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 bg-canvas-bg flex flex-col gap-6 overflow-y-auto max-h-[70vh]">
          
          {/* Section: Appearance */}
          <div className="flex flex-col gap-3">
            <h3 className="font-sans font-bold text-[11px] uppercase tracking-wider text-ink-muted flex items-center gap-2">
              <Monitor size={12} /> {t('pref.appearance')}
            </h3>
            <div className="flex gap-2">
              {(['system', 'light', 'dark'] as const).map((themeKey) => {
                const isSelected = preferences.theme === themeKey;
                return (
                  <button 
                    key={themeKey}
                    onClick={() => updatePreference('theme', themeKey)}
                    className={`flex-1 py-2 rounded-[8px] font-bold text-[13px] transition-all ${
                      isSelected 
                        ? 'bg-lime/20 dark:bg-lime/20 border-2 border-lime text-ink dark:text-white shadow-sm' 
                        : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/5 dark:border-white/10 text-ink-muted dark:text-white/70 hover:text-ink dark:hover:text-white'
                    }`}
                  >
                    {t(`pref.${themeKey}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full h-px bg-ink/5 dark:bg-white/10" />

          {/* Section: Language */}
          <div className="flex flex-col gap-3">
            <h3 className="font-sans font-bold text-[11px] uppercase tracking-wider text-ink-muted flex items-center gap-2">
              <Globe size={12} /> {t('pref.language')}
            </h3>
            <div className="flex gap-2">
              {(['en', 'fr'] as const).map((langKey) => {
                const isSelected = preferences.language === langKey;
                return (
                  <button 
                    key={langKey}
                    onClick={() => updatePreference('language', langKey)}
                    className={`flex-1 py-2 rounded-[8px] font-bold text-[13px] transition-all ${
                      isSelected 
                        ? 'bg-lime/20 dark:bg-lime/20 border-2 border-lime text-ink dark:text-white shadow-sm' 
                        : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/5 dark:border-white/10 text-ink-muted dark:text-white/70 hover:text-ink dark:hover:text-white'
                    }`}
                  >
                    {langKey === 'en' ? 'English' : 'Français'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full h-px bg-ink/5 dark:bg-white/10" />

          {/* Section: Export */}
          <div className="flex flex-col gap-3">
            <h3 className="font-sans font-bold text-[11px] uppercase tracking-wider text-ink-muted flex items-center gap-2">
              <HardDrive size={12} /> {t('pref.export')}
            </h3>
            <select 
              value={preferences.exportPath}
              onChange={(e) => updatePreference('exportPath', e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-[8px] px-3 py-2.5 text-[13px] font-bold text-ink dark:text-white cursor-pointer outline-none focus:ring-2 focus:ring-lime [&>option]:bg-white dark:[&>option]:bg-[#1E1E24] [&>option]:text-ink dark:[&>option]:text-white"
            >
              <option value="Ask every time">{t('pref.export.ask')}</option>
              <option value="~/Downloads/Revect">~/Downloads/Revect</option>
              <option value="~/Desktop">~/Desktop</option>
            </select>
          </div>

          <div className="w-full h-px bg-ink/5 dark:bg-white/10" />

          {/* Section: Advanced */}
          <div className="flex flex-col gap-3">
            <h3 className="font-sans font-bold text-[11px] uppercase tracking-wider text-ink-muted flex items-center gap-2">
              <Cpu size={12} /> {t('pref.advanced')}
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-[13px] text-ink">{t('pref.hardware')}</div>
                <div className="text-[11px] text-ink-muted">{t('pref.hardware.desc')}</div>
              </div>
              <button 
                onClick={() => updatePreference('hardwareAccel', !preferences.hardwareAccel)}
                className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${preferences.hardwareAccel ? 'bg-lime-dark dark:bg-lime' : 'bg-black/20 dark:bg-white/20'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${preferences.hardwareAccel ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

        </div>
        
        {/* Footer */}
        <div className="h-14 bg-ink/5 flex items-center justify-end px-5 border-t border-ink/5">
          <button 
            onClick={onClose}
            className="px-6 py-1.5 bg-ink text-canvas-bg dark:bg-lime dark:text-black dark:hover:bg-lime-dark rounded-full font-bold text-[13px] hover:opacity-90 transition-all shadow-sm"
          >
            {t('pref.done')}
          </button>
        </div>

      </div>
    </div>
  );
}

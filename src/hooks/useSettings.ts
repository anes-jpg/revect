export type ColorMode = 'color' | 'bw';
export type TracingMode = 'pixel' | 'polygon' | 'spline';
export type HierarchicalMode = 'stacked' | 'cutout';

export interface TraceSettings {
  colorMode: ColorMode;
  tracingMode: TracingMode;
  hierarchical: HierarchicalMode;
  filterSpeckle: number;
  colorPrecision: number;
  gradientStep: number;
  cornerThreshold: number;
  segmentLength: number;
  spliceThreshold: number;
  pathPrecision: number;
  livePreview: boolean;
  bwThreshold: number;
  invert: boolean;
  bwOutputColor?: 'black' | 'white';
}

export const defaultSettings: TraceSettings = {
  colorMode: 'color',
  tracingMode: 'spline',
  hierarchical: 'stacked',
  filterSpeckle: 4,
  colorPrecision: 6,
  gradientStep: 16,
  cornerThreshold: 60,
  segmentLength: 6,
  spliceThreshold: 45,
  pathPrecision: 8,
  livePreview: true,
  bwThreshold: 128,
  invert: false,
  bwOutputColor: 'black',
};

export const presets = {
  bw: {
    ...defaultSettings,
    colorMode: 'bw' as ColorMode,
    tracingMode: 'spline' as TracingMode,
    filterSpeckle: 4,
  },
  photo: {
    ...defaultSettings,
    colorMode: 'color' as ColorMode,
    tracingMode: 'spline' as TracingMode,
    colorPrecision: 8,
    filterSpeckle: 2,
    gradientStep: 16,
  },
  poster: {
    ...defaultSettings,
    colorMode: 'color' as ColorMode,
    tracingMode: 'polygon' as TracingMode,
    colorPrecision: 4,
    filterSpeckle: 16,
    gradientStep: 32,
  }
};

export type SettingsAction = 
  | { type: 'UPDATE'; payload: Partial<TraceSettings> }
  | { type: 'LOAD_PRESET'; payload: keyof typeof presets };

export function settingsReducer(state: TraceSettings, action: SettingsAction): TraceSettings {
  switch (action.type) {
    case 'UPDATE':
      return { ...state, ...action.payload };
    case 'LOAD_PRESET':
      return { ...presets[action.payload] };
    default:
      return state;
  }
}

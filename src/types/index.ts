export type BlendMode =
  | 'source-over'    // Normal
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export const BLEND_MODE_LABELS: Record<BlendMode, string> = {
  'source-over': 'Normal',
  'multiply': 'Multiply',
  'screen': 'Screen',
  'overlay': 'Overlay',
  'darken': 'Darken',
  'lighten': 'Lighten',
  'color-dodge': 'Color Dodge',
  'color-burn': 'Color Burn',
  'hard-light': 'Hard Light',
  'soft-light': 'Soft Light',
  'difference': 'Difference',
  'exclusion': 'Exclusion',
  'hue': 'Hue',
  'saturation': 'Saturation',
  'color': 'Color',
  'luminosity': 'Luminosity',
};

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  type: 'raster' | 'text' | 'shape' | 'adjustment' | 'group';
  thumbnail?: string;
  children?: string[]; // for groups
  parentId?: string;
  clipMask?: boolean;
  adjustmentType?: AdjustmentType;
  adjustmentValues?: Record<string, number>;
}

export type AdjustmentType =
  | 'brightness-contrast'
  | 'hue-saturation'
  | 'levels'
  | 'curves'
  | 'color-balance'
  | 'exposure'
  | 'vibrance';

export type Tool =
  | 'move'
  | 'marquee-rect'
  | 'marquee-ellipse'
  | 'lasso'
  | 'lasso-poly'
  | 'magic-wand'
  | 'crop'
  | 'eyedropper'
  | 'healing'
  | 'clone-stamp'
  | 'spot-removal'
  | 'brush'
  | 'eraser'
  | 'gradient'
  | 'paint-bucket'
  | 'blur-tool'
  | 'sharpen-tool'
  | 'dodge'
  | 'burn'
  | 'pen'
  | 'text'
  | 'shape-rect'
  | 'shape-ellipse'
  | 'shape-polygon'
  | 'shape-line'
  | 'hand'
  | 'zoom'
  | 'liquify';

export interface BrushSettings {
  size: number;
  hardness: number;
  opacity: number;
  flow: number;
}

export interface GradientStop {
  offset: number;
  color: string;
}

export interface GradientSettings {
  type: 'linear' | 'radial' | 'angle' | 'reflected';
  stops: GradientStop[];
}

export interface CropSettings {
  ratio: 'free' | '1:1' | '4:3' | '16:9' | '3:2' | '5:4';
}

export interface HistoryEntry {
  id: string;
  label: string;
  timestamp: number;
  snapshot: string; // serialized canvas state
}

export interface ColorAdjustments {
  brightness: number;
  contrast: number;
  exposure: number;
  highlights: number;
  shadows: number;
  temperature: number;
  tint: number;
  hue: number;
  saturation: number;
  luminance: number;
  vibrance: number;
  clarity: number;
}

export interface FilterSettings {
  type: string;
  values: Record<string, number>;
}

export interface Selection {
  type: 'rect' | 'ellipse' | 'lasso' | 'magic-wand' | 'none';
  path?: number[][];
  feather: number;
  active: boolean;
}

export interface DocumentInfo {
  width: number;
  height: number;
  name: string;
  zoom: number;
}

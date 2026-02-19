import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { Layer, Tool, BlendMode, BrushSettings, HistoryEntry, Selection, DocumentInfo, ColorAdjustments } from '../types';

interface EditorState {
  // Document
  document: DocumentInfo;
  setDocument: (doc: Partial<DocumentInfo>) => void;

  // Layers
  layers: Layer[];
  activeLayerId: string | null;
  addLayer: (layer?: Partial<Layer>) => string;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  setActiveLayer: (id: string | null) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  duplicateLayer: (id: string) => void;
  flattenLayers: () => void;

  // Tools
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  previousTool: Tool;

  // Brush
  brushSettings: BrushSettings;
  setBrushSettings: (settings: Partial<BrushSettings>) => void;

  // Colors
  foregroundColor: string;
  backgroundColor: string;
  setForegroundColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  swapColors: () => void;
  resetColors: () => void;

  // History
  history: HistoryEntry[];
  historyIndex: number;
  maxHistory: number;
  pushHistory: (label: string, snapshot: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Selection
  selection: Selection;
  setSelection: (sel: Partial<Selection>) => void;
  clearSelection: () => void;

  // Color adjustments (for active adjustment layer or filter preview)
  adjustments: ColorAdjustments;
  setAdjustments: (adj: Partial<ColorAdjustments>) => void;
  resetAdjustments: () => void;

  // UI state
  showGrid: boolean;
  showRulers: boolean;
  showGuides: boolean;
  snapToGrid: boolean;
  toggleGrid: () => void;
  toggleRulers: () => void;
  toggleGuides: () => void;
  toggleSnap: () => void;

  // Canvas reference
  fabricCanvas: fabric.Canvas | null;
  setFabricCanvas: (canvas: fabric.Canvas | null) => void;
}

const defaultAdjustments: ColorAdjustments = {
  brightness: 0,
  contrast: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  temperature: 0,
  tint: 0,
  hue: 0,
  saturation: 0,
  luminance: 0,
  vibrance: 0,
  clarity: 0,
};

export const useEditorStore = create<EditorState>((set, get) => ({
  // Document
  document: { width: 1920, height: 1080, name: 'Untitled', zoom: 1 },
  setDocument: (doc) => set((s) => ({ document: { ...s.document, ...doc } })),

  // Layers
  layers: [],
  activeLayerId: null,
  addLayer: (partial) => {
    const id = uuid();
    const layer: Layer = {
      id,
      name: partial?.name || `Layer ${get().layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'source-over',
      type: partial?.type || 'raster',
      ...partial,
    };
    set((s) => ({
      layers: [...s.layers, layer],
      activeLayerId: id,
    }));
    return id;
  },
  removeLayer: (id) =>
    set((s) => ({
      layers: s.layers.filter((l) => l.id !== id),
      activeLayerId: s.activeLayerId === id ? (s.layers[0]?.id ?? null) : s.activeLayerId,
    })),
  updateLayer: (id, updates) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })),
  setActiveLayer: (id) => set({ activeLayerId: id }),
  reorderLayers: (from, to) =>
    set((s) => {
      const layers = [...s.layers];
      const [moved] = layers.splice(from, 1);
      layers.splice(to, 0, moved);
      return { layers };
    }),
  duplicateLayer: (id) => {
    const layer = get().layers.find((l) => l.id === id);
    if (!layer) return;
    const newId = uuid();
    set((s) => ({
      layers: [...s.layers, { ...layer, id: newId, name: `${layer.name} copy` }],
      activeLayerId: newId,
    }));
  },
  flattenLayers: () =>
    set((s) => {
      if (s.layers.length <= 1) return s;
      return {
        layers: [{ ...s.layers[0], name: 'Background', id: s.layers[0].id }],
        activeLayerId: s.layers[0].id,
      };
    }),

  // Tools
  activeTool: 'move',
  previousTool: 'move',
  setActiveTool: (tool) => set((s) => ({ activeTool: tool, previousTool: s.activeTool })),

  // Brush
  brushSettings: { size: 20, hardness: 100, opacity: 1, flow: 1 },
  setBrushSettings: (settings) =>
    set((s) => ({ brushSettings: { ...s.brushSettings, ...settings } })),

  // Colors
  foregroundColor: '#000000',
  backgroundColor: '#ffffff',
  setForegroundColor: (color) => set({ foregroundColor: color }),
  setBackgroundColor: (color) => set({ backgroundColor: color }),
  swapColors: () =>
    set((s) => ({ foregroundColor: s.backgroundColor, backgroundColor: s.foregroundColor })),
  resetColors: () => set({ foregroundColor: '#000000', backgroundColor: '#ffffff' }),

  // History
  history: [],
  historyIndex: -1,
  maxHistory: 50,
  pushHistory: (label, snapshot) =>
    set((s) => {
      const newHistory = s.history.slice(0, s.historyIndex + 1);
      newHistory.push({ id: uuid(), label, timestamp: Date.now(), snapshot });
      if (newHistory.length > s.maxHistory) newHistory.shift();
      return { history: newHistory, historyIndex: newHistory.length - 1 };
    }),
  undo: () =>
    set((s) => ({
      historyIndex: Math.max(0, s.historyIndex - 1),
    })),
  redo: () =>
    set((s) => ({
      historyIndex: Math.min(s.history.length - 1, s.historyIndex + 1),
    })),
  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // Selection
  selection: { type: 'none', feather: 0, active: false },
  setSelection: (sel) => set((s) => ({ selection: { ...s.selection, ...sel } })),
  clearSelection: () => set({ selection: { type: 'none', feather: 0, active: false } }),

  // Adjustments
  adjustments: { ...defaultAdjustments },
  setAdjustments: (adj) => set((s) => ({ adjustments: { ...s.adjustments, ...adj } })),
  resetAdjustments: () => set({ adjustments: { ...defaultAdjustments } }),

  // UI
  showGrid: false,
  showRulers: true,
  showGuides: true,
  snapToGrid: false,
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleRulers: () => set((s) => ({ showRulers: !s.showRulers })),
  toggleGuides: () => set((s) => ({ showGuides: !s.showGuides })),
  toggleSnap: () => set((s) => ({ snapToGrid: !s.snapToGrid })),

  // Canvas
  fabricCanvas: null,
  setFabricCanvas: (canvas) => set({ fabricCanvas: canvas }),
}));

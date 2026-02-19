import React, { useEffect, useCallback } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import type { Tool } from '../../types';

/* ------------------------------------------------------------------ */
/*  Tool definitions: id, label, keyboard shortcut, SVG icon          */
/* ------------------------------------------------------------------ */

interface ToolDef {
  id: Tool;
  label: string;
  shortcut?: string;       // primary key (lowercase)
  shiftShortcut?: boolean;  // true = requires Shift held
  icon: React.ReactNode;
}

// Separator sentinel
const SEP = 'separator' as const;

type ToolbarEntry = ToolDef | typeof SEP;

const TOOLS: ToolbarEntry[] = [
  /* -- Selection / Transform ---------------------------------------- */
  {
    id: 'move',
    label: 'Move Tool',
    shortcut: 'v',
    icon: (
      <svg viewBox="0 0 18 18">
        <path d="M3 3l5 14 2-5 5-2z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'marquee-rect',
    label: 'Rectangular Marquee',
    shortcut: 'm',
    icon: (
      <svg viewBox="0 0 18 18">
        <rect x="3" y="4" width="12" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" rx="0.5"/>
      </svg>
    ),
  },
  {
    id: 'marquee-ellipse',
    label: 'Elliptical Marquee',
    shortcut: 'm',
    shiftShortcut: true,
    icon: (
      <svg viewBox="0 0 18 18">
        <ellipse cx="9" cy="9" rx="7" ry="5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2"/>
      </svg>
    ),
  },
  {
    id: 'lasso',
    label: 'Lasso Tool',
    shortcut: 'l',
    icon: (
      <svg viewBox="0 0 18 18">
        <path d="M9 2C5 2 2 5.5 2 8.5S5 15 9 15c2 0 3.5-1 4.5-2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="13.5" cy="13" r="2" fill="none" stroke="currentColor" strokeWidth="1.2"/>
        <line x1="15" y1="14.5" x2="16.5" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'lasso-poly',
    label: 'Polygonal Lasso',
    shortcut: 'l',
    shiftShortcut: true,
    icon: (
      <svg viewBox="0 0 18 18">
        <polyline points="3,14 5,4 12,2 16,10 10,16 3,14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'magic-wand',
    label: 'Magic Wand',
    shortcut: 'w',
    icon: (
      <svg viewBox="0 0 18 18">
        <line x1="2" y1="16" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 6l-1.5-3L14 4.5z" fill="currentColor"/>
        <line x1="14" y1="2" x2="14.5" y2="0.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        <line x1="16" y1="4" x2="17.5" y2="3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        <line x1="15" y1="6" x2="16.5" y2="7" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    ),
  },
  SEP,
  /* -- Crop / Sample ------------------------------------------------ */
  {
    id: 'crop',
    label: 'Crop Tool',
    shortcut: 'c',
    icon: (
      <svg viewBox="0 0 18 18">
        <path d="M4 0v14h14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M0 4h14v14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'eyedropper',
    label: 'Eyedropper',
    shortcut: 'i',
    icon: (
      <svg viewBox="0 0 18 18">
        <path d="M14.5 2.5a2 2 0 0 0-2.8 0l-1.5 1.5 3 3 1.5-1.5a2 2 0 0 0 0-2.8z" fill="none" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M10.2 4L4 10.2 3 15l4.8-1L14 7.8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round"/>
        <line x1="2" y1="16" x2="3" y2="15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  SEP,
  /* -- Retouching --------------------------------------------------- */
  {
    id: 'healing',
    label: 'Healing Brush',
    shortcut: 'j',
    icon: (
      <svg viewBox="0 0 18 18">
        <rect x="5" y="5" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" transform="rotate(45 9 9)"/>
        <line x1="9" y1="6" x2="9" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <line x1="6" y1="9" x2="12" y2="9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'clone-stamp',
    label: 'Clone Stamp',
    shortcut: 's',
    icon: (
      <svg viewBox="0 0 18 18">
        <circle cx="9" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.3"/>
        <line x1="9" y1="11" x2="9" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="6.5" y1="14" x2="11.5" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  SEP,
  /* -- Painting ----------------------------------------------------- */
  {
    id: 'brush',
    label: 'Brush',
    shortcut: 'b',
    icon: (
      <svg viewBox="0 0 18 18">
        <path d="M13 2c1-1 3.5-.5 3 2s-4 5-6 7c-1 1-2.5 2-3.5 3S4 16 3 16s-1.5-1-.5-2.5S5.5 11 7 10c2-1.5 5-5 6-8z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'eraser',
    label: 'Eraser',
    shortcut: 'e',
    icon: (
      <svg viewBox="0 0 18 18">
        <path d="M6 15h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M3.5 12.5l8-8a1.5 1.5 0 0 1 2 0l1 1a1.5 1.5 0 0 1 0 2l-8 8H4a1 1 0 0 1-.7-.3l-.5-.5a1.5 1.5 0 0 1 0-2z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        <line x1="7" y1="7" x2="11" y2="11" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'gradient',
    label: 'Gradient',
    shortcut: 'g',
    icon: (
      <svg viewBox="0 0 18 18">
        <defs>
          <linearGradient id="tb-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="currentColor" stopOpacity="1"/>
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.1"/>
          </linearGradient>
        </defs>
        <rect x="2" y="3" width="14" height="12" rx="1.5" fill="url(#tb-grad)" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
  },
  {
    id: 'paint-bucket',
    label: 'Paint Bucket',
    shortcut: 'g',
    shiftShortcut: true,
    icon: (
      <svg viewBox="0 0 18 18">
        <path d="M10 2L3 9l5 5 7-7z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        <path d="M2 14.5c0 0 1-2 2-2s2 2 2 2 1 2-1 2-3-2-3-2z" fill="currentColor" opacity="0.6"/>
        <line x1="5" y1="3" x2="10" y2="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  SEP,
  /* -- Focus / Tonal ------------------------------------------------ */
  {
    id: 'blur-tool',
    label: 'Blur Tool',
    icon: (
      <svg viewBox="0 0 18 18">
        <circle cx="9" cy="9" r="5" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5"/>
        <circle cx="9" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.5"/>
        <circle cx="9" cy="9" r="1" fill="currentColor" opacity="0.4"/>
        <line x1="5" y1="15" x2="3" y2="17" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'sharpen-tool',
    label: 'Sharpen Tool',
    icon: (
      <svg viewBox="0 0 18 18">
        <polygon points="9,2 12,14 9,12 6,14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        <line x1="9" y1="14" x2="9" y2="17" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'dodge',
    label: 'Dodge',
    shortcut: 'o',
    icon: (
      <svg viewBox="0 0 18 18">
        <circle cx="9" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.3"/>
        <line x1="9" y1="11.5" x2="9" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'burn',
    label: 'Burn',
    shortcut: 'o',
    shiftShortcut: true,
    icon: (
      <svg viewBox="0 0 18 18">
        <path d="M9 7c0 0 3-3 3-5S10 0 9 2C8 0 6 0 6 2s3 5 3 5z" fill="currentColor" opacity="0.7"/>
        <circle cx="9" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.3"/>
        <line x1="9" y1="11.5" x2="9" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  SEP,
  /* -- Vector / Text ------------------------------------------------ */
  {
    id: 'pen',
    label: 'Pen Tool',
    shortcut: 'p',
    icon: (
      <svg viewBox="0 0 18 18">
        <path d="M5 16L9 2l4 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round"/>
        <line x1="6.5" y1="11" x2="11.5" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="9" cy="2" r="1.2" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'text',
    label: 'Type Tool',
    shortcut: 't',
    icon: (
      <svg viewBox="0 0 18 18">
        <line x1="3" y1="4" x2="15" y2="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="9" y1="4" x2="9" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="6" y1="15" x2="12" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'shape-rect',
    label: 'Rectangle Shape',
    shortcut: 'u',
    icon: (
      <svg viewBox="0 0 18 18">
        <rect x="2.5" y="4" width="13" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    id: 'shape-ellipse',
    label: 'Ellipse Shape',
    icon: (
      <svg viewBox="0 0 18 18">
        <ellipse cx="9" cy="9" rx="7" ry="5.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  SEP,
  /* -- Navigation --------------------------------------------------- */
  {
    id: 'hand',
    label: 'Hand Tool',
    shortcut: 'h',
    icon: (
      <svg viewBox="0 0 18 18">
        <path d="M9 1.5v10M6.5 3.5v8M11.5 3v8M4.5 6v7c0 2 1.5 3.5 4.5 3.5s4.5-1.5 4.5-3.5V4.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 6c.8 0 1.5.5 1.5 1.3V13c0 2.5-2 4-5.5 4S4 15.5 4 13V7.3C4 6.5 3.7 6 3 6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'zoom',
    label: 'Zoom Tool',
    shortcut: 'z',
    icon: (
      <svg viewBox="0 0 18 18">
        <circle cx="7.5" cy="7.5" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="11.5" y1="11.5" x2="16" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="5" y1="7.5" x2="10" y2="7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <line x1="7.5" y1="5" x2="7.5" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  SEP,
  /* -- Special ------------------------------------------------------ */
  {
    id: 'liquify',
    label: 'Liquify',
    icon: (
      <svg viewBox="0 0 18 18">
        <path d="M9 2c-2 3-5 5-5 9a5 5 0 0 0 10 0c0-4-3-6-5-9z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        <path d="M7 12c0 1 .9 2 2 2s2-1 2-2" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Build keyboard shortcut map                                       */
/* ------------------------------------------------------------------ */

interface ShortcutMapping {
  tool: Tool;
  shift: boolean;
}

const shortcutMap = new Map<string, ShortcutMapping[]>();

for (const entry of TOOLS) {
  if (entry === SEP) continue;
  if (!entry.shortcut) continue;
  const key = entry.shortcut.toLowerCase();
  if (!shortcutMap.has(key)) shortcutMap.set(key, []);
  shortcutMap.get(key)!.push({
    tool: entry.id,
    shift: !!entry.shiftShortcut,
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

const Toolbar: React.FC = () => {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const foregroundColor = useEditorStore((s) => s.foregroundColor);
  const backgroundColor = useEditorStore((s) => s.backgroundColor);
  const swapColors = useEditorStore((s) => s.swapColors);
  const resetColors = useEditorStore((s) => s.resetColors);
  const setForegroundColor = useEditorStore((s) => s.setForegroundColor);
  const setBackgroundColor = useEditorStore((s) => s.setBackgroundColor);

  /* Keyboard shortcuts */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if user is typing in an input / textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Ignore if Ctrl / Meta held (reserved for app shortcuts like Ctrl+Z)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // Swap colors with X
      if (key === 'x') {
        e.preventDefault();
        swapColors();
        return;
      }

      // Reset colors with D
      if (key === 'd') {
        e.preventDefault();
        resetColors();
        return;
      }

      const mappings = shortcutMap.get(key);
      if (!mappings || mappings.length === 0) return;

      e.preventDefault();

      if (mappings.length === 1) {
        setActiveTool(mappings[0].tool);
        return;
      }

      // Multiple mappings: Shift selects the shift variant, plain selects the plain variant
      const shiftHeld = e.shiftKey;
      const match = mappings.find((m) => m.shift === shiftHeld);
      if (match) {
        setActiveTool(match.tool);
      } else {
        // Fallback: cycle between the variants
        const currentIdx = mappings.findIndex((m) => m.tool === activeTool);
        const next = mappings[(currentIdx + 1) % mappings.length];
        setActiveTool(next.tool);
      }
    },
    [activeTool, setActiveTool, swapColors, resetColors],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  /* Tooltip text helper */
  const tooltipFor = (entry: ToolDef): string => {
    let tip = entry.label;
    if (entry.shortcut) {
      const display = entry.shiftShortcut
        ? `Shift+${entry.shortcut.toUpperCase()}`
        : entry.shortcut.toUpperCase();
      tip += ` (${display})`;
    }
    return tip;
  };

  /* Render */
  let sepIdx = 0;
  return (
    <div className="toolbar">
      {TOOLS.map((entry) => {
        if (entry === SEP) {
          return <div className="toolbar-separator" key={`sep-${sepIdx++}`} />;
        }
        const isActive = activeTool === entry.id;
        return (
          <button
            key={entry.id}
            className={`toolbar-btn${isActive ? ' active' : ''}`}
            onClick={() => setActiveTool(entry.id)}
            data-tooltip={tooltipFor(entry)}
            aria-label={entry.label}
          >
            {entry.icon}
          </button>
        );
      })}

      {/* ---- Color swatches at bottom ---- */}
      <div style={{ flex: 1 }} />
      <div className="color-swatches">
        {/* Foreground */}
        <div
          className="color-swatch-fg"
          style={{ backgroundColor: foregroundColor }}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'color';
            input.value = foregroundColor;
            input.addEventListener('input', (ev) =>
              setForegroundColor((ev.target as HTMLInputElement).value),
            );
            input.click();
          }}
          title="Foreground color"
        />
        {/* Background */}
        <div
          className="color-swatch-bg"
          style={{ backgroundColor: backgroundColor }}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'color';
            input.value = backgroundColor;
            input.addEventListener('input', (ev) =>
              setBackgroundColor((ev.target as HTMLInputElement).value),
            );
            input.click();
          }}
          title="Background color"
        />
        {/* Swap button */}
        <button
          className="color-swap"
          onClick={swapColors}
          title="Swap Colors (X)"
          aria-label="Swap foreground and background colors"
        >
          <svg viewBox="0 0 12 12" width="12" height="12">
            <path d="M2 4h6l-2-2M10 8H4l2 2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {/* Reset button */}
        <button
          className="color-reset"
          onClick={resetColors}
          title="Default Colors (D)"
          aria-label="Reset to default colors"
        >
          <div className="color-reset-icon" />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;

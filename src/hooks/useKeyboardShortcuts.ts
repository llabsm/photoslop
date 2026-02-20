import { useEffect } from 'react';
import { useEditorStore } from '../stores/editorStore';

export function useKeyboardShortcuts() {
  const store = useEditorStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const key = e.key.toLowerCase();

      // Non-ctrl shortcuts (tool shortcuts handled by Toolbar component)
      if (!ctrl && !e.altKey) {
        // Brush size shortcuts
        if (key === '[') {
          e.preventDefault();
          store.setBrushSettings({ size: Math.max(1, store.brushSettings.size - 5) });
          return;
        }
        if (key === ']') {
          e.preventDefault();
          store.setBrushSettings({ size: Math.min(500, store.brushSettings.size + 5) });
          return;
        }
      }

      // Ctrl shortcuts
      if (ctrl) {
        switch (key) {
          case 'z':
            e.preventDefault();
            if (shift) {
              store.redo();
            } else {
              store.undo();
            }
            // Restore canvas state from the history snapshot (use queueMicrotask to ensure store updated)
            queueMicrotask(() => {
              const state = useEditorStore.getState();
              const entry = state.history[state.historyIndex];
              if (entry?.snapshot && state.fabricCanvas) {
                state.fabricCanvas.loadFromJSON(JSON.parse(entry.snapshot)).then(() => {
                  state.fabricCanvas?.requestRenderAll();
                });
              }
            });
            break;
          case 'n':
            e.preventDefault();
            if (shift) {
              store.addLayer();
            } else {
              window.dispatchEvent(new CustomEvent('photoslop:new-document'));
            }
            break;
          case 'o':
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('photoslop:open'));
            break;
          case 's':
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('photoslop:save'));
            break;
          case 'a':
            e.preventDefault();
            store.setSelection({ type: 'rect', active: true });
            break;
          case 'd':
            e.preventDefault();
            store.clearSelection();
            break;
          case '=':
          case '+':
            e.preventDefault();
            store.setDocument({ zoom: Math.min(32, store.document.zoom * 1.25) });
            break;
          case '-':
            e.preventDefault();
            store.setDocument({ zoom: Math.max(0.05, store.document.zoom / 1.25) });
            break;
          case '0':
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('photoslop:fitToScreen'));
            break;
        }
      }

      // Delete selected object
      if (key === 'delete' || key === 'backspace') {
        if (!ctrl && store.fabricCanvas) {
          const active = store.fabricCanvas.getActiveObject();
          // Don't delete if currently editing text
          if (active && 'isEditing' in active && (active as any).isEditing) return;
          if (active && !(active as any)._isDocBackground) {
            store.fabricCanvas.remove(active);
            store.fabricCanvas.renderAll();
          }
        }
      }

    };

    // Space-to-pan is handled by EditorCanvas
    const keyUpHandler = (_e: KeyboardEvent) => {
      // Placeholder for future key-up handling
    };

    window.addEventListener('keydown', handler);
    window.addEventListener('keyup', keyUpHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('keyup', keyUpHandler);
    };
  }, [store]);
}

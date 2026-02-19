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

      // Tool shortcuts
      if (!ctrl && !e.altKey) {
        const toolMap: Record<string, () => void> = {
          v: () => store.setActiveTool('move'),
          m: () => store.setActiveTool(shift ? 'marquee-ellipse' : 'marquee-rect'),
          l: () => store.setActiveTool(shift ? 'lasso-poly' : 'lasso'),
          w: () => store.setActiveTool('magic-wand'),
          c: () => store.setActiveTool('crop'),
          i: () => store.setActiveTool('eyedropper'),
          j: () => store.setActiveTool('healing'),
          s: () => store.setActiveTool('clone-stamp'),
          b: () => store.setActiveTool('brush'),
          e: () => store.setActiveTool('eraser'),
          g: () => store.setActiveTool(shift ? 'paint-bucket' : 'gradient'),
          o: () => store.setActiveTool(shift ? 'burn' : 'dodge'),
          p: () => store.setActiveTool('pen'),
          t: () => store.setActiveTool('text'),
          u: () => store.setActiveTool('shape-rect'),
          h: () => store.setActiveTool('hand'),
          z: () => store.setActiveTool('zoom'),
          x: () => store.swapColors(),
          d: () => { if (!ctrl) store.resetColors(); },
        };

        if (toolMap[key]) {
          e.preventDefault();
          toolMap[key]();
          return;
        }

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
            if (shift) store.redo();
            else store.undo();
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
            store.setDocument({ zoom: 1 });
            break;
        }
      }

      // Delete
      if (key === 'delete' || key === 'backspace') {
        if (!ctrl && store.fabricCanvas) {
          const active = store.fabricCanvas.getActiveObject();
          if (active && active.name !== 'background') {
            store.fabricCanvas.remove(active);
            store.fabricCanvas.renderAll();
          }
        }
      }

      // Space for hand tool
      if (key === ' ' && !ctrl) {
        e.preventDefault();
        store.setActiveTool('hand');
      }
    };

    const keyUpHandler = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        store.setActiveTool(store.previousTool);
      }
    };

    window.addEventListener('keydown', handler);
    window.addEventListener('keyup', keyUpHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('keyup', keyUpHandler);
    };
  }, [store]);
}

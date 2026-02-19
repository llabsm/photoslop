import { useState, useEffect, useCallback } from 'react';
import * as fabric from 'fabric';
import Toolbar from './components/toolbar/Toolbar';
import MenuBar from './components/menus/MenuBar';
import PanelDock from './components/panels/PanelDock';
import EditorCanvas from './components/canvas/EditorCanvas';
import OptionsBar from './components/canvas/OptionsBar';
import StatusBar from './components/canvas/StatusBar';
import NewDocumentDialog from './components/dialogs/NewDocumentDialog';
import ImageResizeDialog from './components/dialogs/ImageResizeDialog';
import ExportDialog from './components/dialogs/ExportDialog';
import FilterDialog from './components/dialogs/FilterDialog';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useEditorStore } from './stores/editorStore';
import './styles/global.css';
import './styles/layout.css';

export default function App() {
  useKeyboardShortcuts();

  const { addLayer, fabricCanvas, setDocument } = useEditorStore();

  // Dialog states
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [showImageResize, setShowImageResize] = useState(false);
  const [showCanvasResize, setShowCanvasResize] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'webp' | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  // Initialize with a default layer
  useEffect(() => {
    const layers = useEditorStore.getState().layers;
    if (layers.length === 0) {
      addLayer({ name: 'Background', type: 'raster' });
    }
  }, [addLayer]);

  // File open handler
  const handleOpen = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !fabricCanvas) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const imgEl = new Image();
        imgEl.onload = () => {
          const fabricImg = new fabric.FabricImage(imgEl, {
            left: 0,
            top: 0,
            selectable: true,
          });

          // Resize document to fit image
          setDocument({
            width: imgEl.width,
            height: imgEl.height,
            name: file.name.replace(/\.[^.]+$/, ''),
          });

          fabricCanvas.clear();
          // Re-add background
          const bg = new fabric.Rect({
            left: 0,
            top: 0,
            width: imgEl.width,
            height: imgEl.height,
            fill: '#ffffff',
            selectable: false,
            evented: false,
          });
          (bg as any)._isDocBackground = true;
          fabricCanvas.add(bg);
          fabricCanvas.add(fabricImg);
          fabricCanvas.renderAll();

          // Reset layers
          const store = useEditorStore.getState();
          store.layers.forEach(l => store.removeLayer(l.id));
          addLayer({ name: 'Background', type: 'raster' });
          addLayer({ name: file.name, type: 'raster' });
        };
        imgEl.src = dataUrl;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [fabricCanvas, setDocument, addLayer]);

  // Save handler (download as PNG)
  const handleSave = useCallback(() => {
    if (!fabricCanvas) return;
    const dataURL = fabricCanvas.toDataURL({ format: 'png', multiplier: 1 });
    const link = document.createElement('a');
    link.download = `${useEditorStore.getState().document.name}.png`;
    link.href = dataURL;
    link.click();
  }, [fabricCanvas]);

  // Flip handler
  const handleFlip = useCallback((direction: string) => {
    if (!fabricCanvas) return;
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if (direction === 'horizontal') {
        obj.flipX = !obj.flipX;
      } else {
        obj.flipY = !obj.flipY;
      }
      obj.setCoords();
    });
    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  // Rotate handler
  const handleRotate = useCallback((degrees: number) => {
    if (!fabricCanvas) return;
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      obj.rotate((obj.angle || 0) + degrees);
      obj.setCoords();
    });
    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  // Select all
  const handleSelectAll = useCallback(() => {
    if (!fabricCanvas) return;
    const objs = fabricCanvas.getObjects().filter(o => !(o as any)._isDocBackground);
    if (objs.length > 0) {
      const sel = new fabric.ActiveSelection(objs, { canvas: fabricCanvas });
      fabricCanvas.setActiveObject(sel);
      fabricCanvas.renderAll();
    }
  }, [fabricCanvas]);

  // Copy/Paste via clipboard API
  const handleCopy = useCallback(() => {
    if (!fabricCanvas) return;
    const active = fabricCanvas.getActiveObject();
    if (active) {
      active.clone().then((cloned: any) => {
        (window as any).__photoslop_clipboard = cloned;
      });
    }
  }, [fabricCanvas]);

  const handlePaste = useCallback(() => {
    if (!fabricCanvas) return;
    const cloned = (window as any).__photoslop_clipboard;
    if (cloned) {
      cloned.clone().then((pasted: any) => {
        pasted.set({
          left: (pasted.left || 0) + 20,
          top: (pasted.top || 0) + 20,
        });
        fabricCanvas.add(pasted);
        fabricCanvas.setActiveObject(pasted);
        fabricCanvas.renderAll();
      });
    }
  }, [fabricCanvas]);

  // Cut
  const handleCut = useCallback(() => {
    handleCopy();
    if (!fabricCanvas) return;
    const active = fabricCanvas.getActiveObject();
    if (active && !(active as any)._isDocBackground) {
      fabricCanvas.remove(active);
      fabricCanvas.renderAll();
    }
  }, [fabricCanvas, handleCopy]);

  // Merge down
  const handleMergeDown = useCallback(() => {
    // Simplified: just flatten
    if (fabricCanvas) {
      useEditorStore.getState().flattenLayers();
    }
  }, [fabricCanvas]);

  // Fit to screen
  const handleFitToScreen = useCallback(() => {
    setDocument({ zoom: 1 });
  }, [setDocument]);

  // About
  const handleAbout = useCallback(() => {
    alert('Photoslop v1.0\nA browser-based image editor.\nBuilt with React, Fabric.js, and determination.');
  }, []);

  // Event listeners for custom events from MenuBar
  useEffect(() => {
    const handlers: Record<string, (e: Event) => void> = {
      'photoslop:new': () => setShowNewDoc(true),
      'photoslop:new-document': () => setShowNewDoc(true),
      'photoslop:open': () => handleOpen(),
      'photoslop:save': () => handleSave(),
      'photoslop:export': (e) => {
        const detail = (e as CustomEvent).detail;
        setExportFormat(detail?.format || 'png');
      },
      'photoslop:close': () => {
        if (confirm('Close this document? Unsaved changes will be lost.')) {
          window.location.reload();
        }
      },
      'photoslop:cut': () => handleCut(),
      'photoslop:copy': () => handleCopy(),
      'photoslop:paste': () => handlePaste(),
      'photoslop:selectAll': () => handleSelectAll(),
      'photoslop:canvasSize': () => setShowCanvasResize(true),
      'photoslop:imageSize': () => setShowImageResize(true),
      'photoslop:flip': (e) => handleFlip((e as CustomEvent).detail?.direction || 'horizontal'),
      'photoslop:rotate': (e) => handleRotate((e as CustomEvent).detail?.degrees || 90),
      'photoslop:mergeDown': () => handleMergeDown(),
      'photoslop:filter': (e) => setFilterType((e as CustomEvent).detail?.type || null),
      'photoslop:fitToScreen': () => handleFitToScreen(),
      'photoslop:about': () => handleAbout(),
      'photoslop:newAdjustmentLayer': (e) => {
        const type = (e as CustomEvent).detail?.type;
        if (type) {
          addLayer({ name: `${type} Adjustment`, type: 'adjustment', adjustmentType: type });
        }
      },
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      window.addEventListener(event, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        window.removeEventListener(event, handler);
      });
    };
  }, [handleOpen, handleSave, handleCut, handleCopy, handlePaste, handleSelectAll, handleFlip, handleRotate, handleMergeDown, handleFitToScreen, handleAbout, addLayer]);

  return (
    <div className="app-layout">
      <MenuBar />
      <OptionsBar />
      <Toolbar />
      <EditorCanvas />
      <PanelDock />
      <StatusBar />

      {/* Dialogs */}
      <NewDocumentDialog open={showNewDoc} onClose={() => setShowNewDoc(false)} />
      <ImageResizeDialog open={showImageResize} onClose={() => setShowImageResize(false)} mode="image" />
      <ImageResizeDialog open={showCanvasResize} onClose={() => setShowCanvasResize(false)} mode="canvas" />
      {exportFormat && (
        <ExportDialog open={true} onClose={() => setExportFormat(null)} format={exportFormat} />
      )}
      {filterType && (
        <FilterDialog open={true} onClose={() => setFilterType(null)} filterType={filterType} />
      )}
    </div>
  );
}

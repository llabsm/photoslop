import { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import { useEditorStore } from '../../stores/editorStore';
import type { Tool } from '../../types';
import EditorCanvas from './EditorCanvas';

/**
 * Wraps EditorCanvas and attaches tool-specific mouse behavior
 * to the Fabric.js canvas based on the currently active tool.
 */
export default function CanvasToolHandler() {
  const {
    fabricCanvas,
    activeTool,
    foregroundColor,
    backgroundColor,
    brushSettings,
    setSelection,
    clearSelection,
    document: doc,
    setDocument,
    pushHistory,
  } = useEditorStore();

  const isDrawingRef = useRef(false);
  const originRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeShapeRef = useRef<fabric.FabricObject | null>(null);
  const selectionRectRef = useRef<fabric.Rect | null>(null);
  const cropRectRef = useRef<fabric.Rect | null>(null);

  // ── Configure Fabric selection / drawing mode when tool changes ─────
  useEffect(() => {
    if (!fabricCanvas) return;
    // Reset drawing mode and cursors
    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = false;
    fabricCanvas.defaultCursor = 'default';
    fabricCanvas.hoverCursor = 'move';
    fabricCanvas.freeDrawingCursor = 'crosshair';

    // Discard active object selection when switching tools (except move)
    if (activeTool !== 'move') {
      fabricCanvas.discardActiveObject();
    }

    // Remove any existing crop overlay
    removeCropOverlay(fabricCanvas);

    switch (activeTool) {
      case 'move':
        fabricCanvas.selection = true;
        fabricCanvas.defaultCursor = 'default';
        fabricCanvas.forEachObject((o: fabric.FabricObject) => {
          if (!(o as fabric.FabricObject & { _isDocBackground?: boolean })._isDocBackground) {
            o.selectable = true;
            o.evented = true;
          }
        });
        break;

      case 'brush':
        disableObjectInteraction(fabricCanvas);
        fabricCanvas.defaultCursor = 'crosshair';
        configureBrush(fabricCanvas, foregroundColor, brushSettings, 'source-over');
        break;

      case 'eraser':
        disableObjectInteraction(fabricCanvas);
        fabricCanvas.defaultCursor = 'crosshair';
        configureBrush(fabricCanvas, '#ffffff', brushSettings, 'destination-out');
        break;

      case 'hand':
        fabricCanvas.defaultCursor = 'grab';
        fabricCanvas.selection = false;
        disableObjectInteraction(fabricCanvas);
        break;

      case 'eyedropper':
        fabricCanvas.defaultCursor = 'crosshair';
        fabricCanvas.hoverCursor = 'crosshair';
        fabricCanvas.selection = false;
        // Keep objects evented=false so clicks go to our handler
        disableObjectInteraction(fabricCanvas);
        break;

      case 'paint-bucket':
        fabricCanvas.defaultCursor = 'crosshair';
        fabricCanvas.hoverCursor = 'crosshair';
        fabricCanvas.selection = false;
        // For paint bucket, we want objects to be evented so we can detect clicks on them
        fabricCanvas.forEachObject((o: fabric.FabricObject) => {
          if (!(o as fabric.FabricObject & { _isDocBackground?: boolean })._isDocBackground) {
            o.selectable = false;
            o.evented = true;
            o.hoverCursor = 'crosshair';
          }
        });
        break;

      default:
        // Shape tools, selection tools, crop, etc.
        fabricCanvas.defaultCursor = 'crosshair';
        fabricCanvas.hoverCursor = 'crosshair';
        fabricCanvas.selection = false;
        disableObjectInteraction(fabricCanvas);
        break;
    }
    fabricCanvas.requestRenderAll();
  }, [activeTool, fabricCanvas, foregroundColor, brushSettings]);

  // ── Update brush settings live ─────────────────────────────────────
  useEffect(() => {
    if (!fabricCanvas || (activeTool !== 'brush' && activeTool !== 'eraser')) return;
    const brush = fabricCanvas.freeDrawingBrush as fabric.PencilBrush | undefined;
    if (brush) {
      brush.width = brushSettings.size;
      brush.color =
        activeTool === 'eraser'
          ? `rgba(255,255,255,${brushSettings.opacity})`
          : hexToRgba(foregroundColor, brushSettings.opacity);
    }
    // Ensure drawing mode stays on
    fabricCanvas.isDrawingMode = true;
    fabricCanvas.freeDrawingCursor = 'crosshair';
  }, [fabricCanvas, activeTool, brushSettings, foregroundColor]);

  // ── Mouse event handlers ───────────────────────────────────────────

  const getScenePoint = useCallback(
    (e: fabric.TEvent) => {
      if (!fabricCanvas) return { x: 0, y: 0 };
      const point = fabricCanvas.getScenePoint(e.e as MouseEvent);
      return { x: point.x, y: point.y };
    },
    [fabricCanvas],
  );

  // -- mouse:down ---
  const handleMouseDown = useCallback(
    (opt: fabric.TEvent) => {
      if (!fabricCanvas) return;

      // Skip custom handling for tools that use Fabric's built-in drawing mode
      if (activeTool === 'brush' || activeTool === 'eraser') return;
      // Skip for move tool - let Fabric handle object selection
      if (activeTool === 'move') return;
      // Skip for hand tool - handled by EditorCanvas panning
      if (activeTool === 'hand') return;

      const pointer = getScenePoint(opt);

      switch (activeTool) {
        case 'text':
          handleTextClick(fabricCanvas, pointer, foregroundColor);
          saveSnapshot('Place text');
          break;

        case 'shape-rect':
        case 'shape-ellipse':
        case 'shape-line':
          isDrawingRef.current = true;
          originRef.current = pointer;
          activeShapeRef.current = createShapeStub(
            activeTool,
            pointer,
            foregroundColor,
          );
          if (activeShapeRef.current) fabricCanvas.add(activeShapeRef.current);
          break;

        case 'marquee-rect':
        case 'marquee-ellipse':
          isDrawingRef.current = true;
          originRef.current = pointer;
          selectionRectRef.current = createSelectionOverlay(pointer);
          fabricCanvas.add(selectionRectRef.current);
          break;

        case 'crop':
          isDrawingRef.current = true;
          originRef.current = pointer;
          cropRectRef.current = createCropOverlay(pointer);
          fabricCanvas.add(cropRectRef.current);
          break;

        case 'eyedropper':
          sampleColor(fabricCanvas, pointer);
          break;

        case 'paint-bucket':
          handlePaintBucket(fabricCanvas, foregroundColor, pointer);
          saveSnapshot('Paint bucket');
          break;

        case 'gradient':
          isDrawingRef.current = true;
          originRef.current = pointer;
          break;

        case 'zoom': {
          const dir = (opt.e as MouseEvent).altKey ? 1 / 1.25 : 1.25;
          const newZoom = Math.min(32, Math.max(0.05, doc.zoom * dir));
          setDocument({ zoom: newZoom });
          break;
        }

        default:
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fabricCanvas, activeTool, foregroundColor, doc.zoom, getScenePoint],
  );

  // -- mouse:move ---
  const handleMouseMove = useCallback(
    (opt: fabric.TEvent) => {
      if (!fabricCanvas) return;
      // Skip for tools using Fabric's drawing mode
      if (activeTool === 'brush' || activeTool === 'eraser') return;
      if (!isDrawingRef.current) return;
      const pointer = getScenePoint(opt);
      const origin = originRef.current;

      const left = Math.min(origin.x, pointer.x);
      const top = Math.min(origin.y, pointer.y);
      const width = Math.abs(pointer.x - origin.x);
      const height = Math.abs(pointer.y - origin.y);

      switch (activeTool) {
        case 'shape-rect':
          if (activeShapeRef.current) {
            activeShapeRef.current.set({ left, top, width, height });
            fabricCanvas.requestRenderAll();
          }
          break;

        case 'shape-ellipse':
          if (activeShapeRef.current) {
            (activeShapeRef.current as fabric.Ellipse).set({
              left,
              top,
              rx: width / 2,
              ry: height / 2,
            });
            fabricCanvas.requestRenderAll();
          }
          break;

        case 'shape-line':
          if (activeShapeRef.current) {
            (activeShapeRef.current as fabric.Line).set({
              x2: pointer.x,
              y2: pointer.y,
            });
            fabricCanvas.requestRenderAll();
          }
          break;

        case 'marquee-rect':
        case 'marquee-ellipse':
          if (selectionRectRef.current) {
            selectionRectRef.current.set({ left, top, width, height });
            fabricCanvas.requestRenderAll();
          }
          break;

        case 'crop':
          if (cropRectRef.current) {
            cropRectRef.current.set({ left, top, width, height });
            fabricCanvas.requestRenderAll();
          }
          break;

        default:
          break;
      }
    },
    [fabricCanvas, activeTool, getScenePoint],
  );

  // -- mouse:up ---
  const handleMouseUp = useCallback(
    (opt: fabric.TEvent) => {
      if (!fabricCanvas) return;
      // Skip for tools using Fabric's drawing mode
      if (activeTool === 'brush' || activeTool === 'eraser') return;
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      const pointer = getScenePoint(opt);

      switch (activeTool) {
        case 'shape-rect':
        case 'shape-ellipse':
        case 'shape-line':
          activeShapeRef.current?.setCoords();
          activeShapeRef.current = null;
          saveSnapshot('Draw shape');
          break;

        case 'marquee-rect':
        case 'marquee-ellipse': {
          const rect = selectionRectRef.current;
          if (rect) {
            const selType =
              activeTool === 'marquee-rect' ? 'rect' : 'ellipse';
            setSelection({
              type: selType,
              path: [
                [rect.left ?? 0, rect.top ?? 0],
                [
                  (rect.left ?? 0) + (rect.width ?? 0),
                  (rect.top ?? 0) + (rect.height ?? 0),
                ],
              ],
              active: true,
            });
            // Remove the visual overlay after capturing
            fabricCanvas.remove(rect);
            selectionRectRef.current = null;
          }
          break;
        }

        case 'crop':
          if (cropRectRef.current) {
            applyCrop(fabricCanvas, cropRectRef.current, doc, setDocument);
            fabricCanvas.remove(cropRectRef.current);
            cropRectRef.current = null;
            saveSnapshot('Crop');
          }
          break;

        case 'gradient':
          applyGradient(
            fabricCanvas,
            originRef.current,
            pointer,
            foregroundColor,
            backgroundColor,
          );
          saveSnapshot('Apply gradient');
          break;

        default:
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fabricCanvas, activeTool, foregroundColor, backgroundColor, doc, getScenePoint],
  );

  // ── Attach / detach Fabric events ──────────────────────────────────
  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:move', handleMouseMove);
    fabricCanvas.on('mouse:up', handleMouseUp);

    // Path created (brush / eraser)
    const onPathCreated = (e: { path?: fabric.FabricObject }) => {
      if (e.path) {
        // Apply the composite operation stored on the brush
        const brush = fabricCanvas.freeDrawingBrush;
        const compositeOp = (brush as any)?._compositeOp || 'source-over';
        if (compositeOp !== 'source-over') {
          e.path.set('globalCompositeOperation' as any, compositeOp);
        }
        // Make drawn paths non-interactive (like in Photoshop - drawn strokes merge into the layer)
        e.path.set({ selectable: false, evented: false });
        fabricCanvas.requestRenderAll();
      }
      saveSnapshot(activeTool === 'eraser' ? 'Erase' : 'Brush stroke');
    };
    fabricCanvas.on('path:created', onPathCreated);

    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:up', handleMouseUp);
      fabricCanvas.off('path:created', onPathCreated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricCanvas, handleMouseDown, handleMouseMove, handleMouseUp, activeTool]);

  // Keyboard: Escape clears selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection();
        if (fabricCanvas) {
          removeCropOverlay(fabricCanvas);
          fabricCanvas.discardActiveObject();
          fabricCanvas.requestRenderAll();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fabricCanvas, clearSelection]);

  // ── Snapshot helper ────────────────────────────────────────────────
  function saveSnapshot(label: string) {
    if (!fabricCanvas) return;
    pushHistory(label, JSON.stringify(fabricCanvas.toJSON()));
  }

  return <EditorCanvas />;
}

// ═══════════════════════════════════════════════════════════════════════
// Helper functions
// ═══════════════════════════════════════════════════════════════════════

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function configureBrush(
  canvas: fabric.Canvas,
  color: string,
  settings: { size: number; hardness: number; opacity: number; flow: number },
  compositeOp: string,
) {
  canvas.isDrawingMode = true;
  canvas.freeDrawingCursor = 'crosshair';
  const brush = new fabric.PencilBrush(canvas);
  brush.width = settings.size;
  brush.color = hexToRgba(color, settings.opacity);
  brush.strokeLineCap = 'round';
  brush.strokeLineJoin = 'round';
  // Store composite operation for use in path:created handler
  (brush as any)._compositeOp = compositeOp;
  canvas.freeDrawingBrush = brush;
}

function disableObjectInteraction(canvas: fabric.Canvas) {
  canvas.forEachObject((o) => {
    if (!(o as fabric.FabricObject & { _isDocBackground?: boolean })._isDocBackground) {
      o.selectable = false;
      o.evented = false;
    }
  });
}

function handleTextClick(
  canvas: fabric.Canvas,
  pointer: { x: number; y: number },
  color: string,
) {
  const text = new fabric.IText('Type here', {
    left: pointer.x,
    top: pointer.y,
    fontSize: 24,
    fill: color,
    fontFamily: 'Arial',
    editable: true,
  });
  canvas.add(text);
  canvas.setActiveObject(text);
  text.enterEditing();
  canvas.requestRenderAll();
}

function createShapeStub(
  tool: Tool,
  pointer: { x: number; y: number },
  color: string,
): fabric.FabricObject | null {
  switch (tool) {
    case 'shape-rect':
      return new fabric.Rect({
        left: pointer.x,
        top: pointer.y,
        width: 0,
        height: 0,
        fill: color,
        strokeWidth: 0,
      });
    case 'shape-ellipse':
      return new fabric.Ellipse({
        left: pointer.x,
        top: pointer.y,
        rx: 0,
        ry: 0,
        fill: color,
        strokeWidth: 0,
      });
    case 'shape-line':
      return new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
        stroke: color,
        strokeWidth: 2,
      });
    default:
      return null;
  }
}

function createSelectionOverlay(pointer: { x: number; y: number }): fabric.Rect {
  return new fabric.Rect({
    left: pointer.x,
    top: pointer.y,
    width: 0,
    height: 0,
    fill: 'rgba(74, 158, 255, 0.15)',
    stroke: '#4a9eff',
    strokeWidth: 1,
    strokeDashArray: [5, 3],
    selectable: false,
    evented: false,
    excludeFromExport: true,
  });
}

function createCropOverlay(pointer: { x: number; y: number }): fabric.Rect {
  const rect = new fabric.Rect({
    left: pointer.x,
    top: pointer.y,
    width: 0,
    height: 0,
    fill: 'transparent',
    stroke: '#ffffff',
    strokeWidth: 1,
    strokeDashArray: [6, 3],
    selectable: false,
    evented: false,
    excludeFromExport: true,
  });
  (rect as fabric.Rect & { _isCropOverlay?: boolean })._isCropOverlay = true;
  return rect;
}

function removeCropOverlay(canvas: fabric.Canvas) {
  const overlays = canvas
    .getObjects()
    .filter(
      (o) =>
        (o as fabric.Rect & { _isCropOverlay?: boolean })._isCropOverlay ===
        true,
    );
  overlays.forEach((o) => canvas.remove(o));
}

function applyCrop(
  canvas: fabric.Canvas,
  cropRect: fabric.Rect,
  doc: { width: number; height: number },
  setDocument: (d: Partial<{ width: number; height: number; name: string; zoom: number }>) => void,
) {
  const cl = cropRect.left ?? 0;
  const ct = cropRect.top ?? 0;
  const cw = cropRect.width ?? doc.width;
  const ch = cropRect.height ?? doc.height;
  if (cw < 1 || ch < 1) return;

  // Shift all objects so the crop area becomes (0,0)
  canvas.getObjects().forEach((obj) => {
    obj.set({
      left: (obj.left ?? 0) - cl,
      top: (obj.top ?? 0) - ct,
    });
    obj.setCoords();
  });

  // Update the background rectangle
  const bgRect = canvas
    .getObjects()
    .find(
      (o) =>
        (o as fabric.Rect & { _isDocBackground?: boolean })._isDocBackground ===
        true,
    ) as fabric.Rect | undefined;
  if (bgRect) {
    bgRect.set({ left: 0, top: 0, width: cw, height: ch });
  }

  setDocument({ width: Math.round(cw), height: Math.round(ch) });
  canvas.requestRenderAll();
}

function sampleColor(
  canvas: fabric.Canvas,
  pointer: { x: number; y: number },
) {
  // Render the canvas to ensure we sample the latest state
  canvas.renderAll();

  // Get the lower canvas context (contains all rendered objects)
  const ctx = canvas.getContext();
  if (!ctx) return;

  // Convert scene coordinates to screen pixel coordinates using viewport transform
  const vpt = canvas.viewportTransform;
  if (!vpt) return;
  const screenX = pointer.x * vpt[0] + vpt[4];
  const screenY = pointer.y * vpt[3] + vpt[5];

  // Account for retina/HiDPI scaling
  const ratio = canvas.getRetinaScaling?.() || 1;
  const px = Math.round(screenX * ratio);
  const py = Math.round(screenY * ratio);

  // Bounds check
  const canvasEl = canvas.getElement();
  if (px < 0 || py < 0 || px >= canvasEl.width || py >= canvasEl.height) return;

  const pixel = ctx.getImageData(px, py, 1, 1).data;

  // Convert RGB to hex, ignoring fully transparent pixels
  if (pixel[3] === 0) return;
  const hex =
    '#' +
    ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2])
      .toString(16)
      .slice(1);
  useEditorStore.getState().setForegroundColor(hex);
}

function handlePaintBucket(canvas: fabric.Canvas, color: string, pointer?: { x: number; y: number }) {
  // First check if there's an actively selected object
  const active = canvas.getActiveObject();
  if (active && !(active as fabric.FabricObject & { _isDocBackground?: boolean })._isDocBackground) {
    active.set('fill', color);
    canvas.requestRenderAll();
    return;
  }

  // If we have a pointer, try to find the object under it
  if (pointer) {
    const objects = canvas.getObjects();
    // Search from top to bottom (reverse order)
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      if ((obj as fabric.FabricObject & { _isDocBackground?: boolean })._isDocBackground) continue;
      if (obj.containsPoint(new fabric.Point(pointer.x, pointer.y))) {
        obj.set('fill', color);
        canvas.requestRenderAll();
        return;
      }
    }
  }

  // Fill the background
  const bgRect = canvas
    .getObjects()
    .find(
      (o) =>
        (o as fabric.Rect & { _isDocBackground?: boolean })._isDocBackground ===
        true,
    );
  if (bgRect) bgRect.set('fill', color);
  canvas.requestRenderAll();
}

function applyGradient(
  canvas: fabric.Canvas,
  start: { x: number; y: number },
  end: { x: number; y: number },
  fgColor: string,
  bgColor: string,
) {
  const target = canvas.getActiveObject();
  if (!target) return;

  const gradient = new fabric.Gradient({
    type: 'linear',
    coords: {
      x1: start.x - (target.left ?? 0),
      y1: start.y - (target.top ?? 0),
      x2: end.x - (target.left ?? 0),
      y2: end.y - (target.top ?? 0),
    },
    colorStops: [
      { offset: 0, color: fgColor },
      { offset: 1, color: bgColor },
    ],
  });
  target.set('fill', gradient);
  canvas.requestRenderAll();
}

import { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import { useEditorStore } from '../../stores/editorStore';

const RULER_SIZE = 20;
const RULER_BG = '#2d2d2d';
const RULER_TEXT = '#888';
const RULER_TICK = '#666';
const RULER_MAJOR_TICK = '#999';

/**
 * Main editor canvas component.
 * Creates a Fabric.js Canvas on mount, handles zoom/pan, rulers, and
 * responds to document size changes.
 */
export default function EditorCanvas() {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rulerHRef = useRef<HTMLCanvasElement>(null);
  const rulerVRef = useRef<HTMLCanvasElement>(null);
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);
  const spaceDownRef = useRef(false);

  const {
    document: doc,
    setDocument,
    showRulers,
    fabricCanvas,
    setFabricCanvas,
    activeTool,
  } = useEditorStore();

  // ── Create Fabric canvas on mount ──────────────────────────────────
  useEffect(() => {
    const el = canvasElRef.current;
    if (!el || fabricCanvas) return;

    const fc = new fabric.Canvas(el, {
      width: doc.width,
      height: doc.height,
      backgroundColor: 'transparent',
      selection: true,
      preserveObjectStacking: true,
      stopContextMenu: true,
      fireRightClick: true,
    });

    // Add a white rectangle as the document background
    const bg = new fabric.Rect({
      left: 0,
      top: 0,
      width: doc.width,
      height: doc.height,
      fill: '#ffffff',
      selectable: false,
      evented: false,
      excludeFromExport: false,
    });
    (bg as fabric.Rect & { _isDocBackground?: boolean })._isDocBackground = true;
    fc.add(bg);
    fc.sendObjectToBack(bg);
    fc.renderAll();

    setFabricCanvas(fc);

    return () => {
      fc.dispose();
      setFabricCanvas(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Resize the wrapper + Fabric viewport when container or document size changes ──
  const updateCanvasSize = useCallback(() => {
    if (!fabricCanvas || !containerRef.current) return;

    const container = containerRef.current;
    const parent = container.parentElement;
    if (!parent) return;

    const padX = showRulers ? RULER_SIZE : 0;
    const padY = showRulers ? RULER_SIZE : 0;
    const availW = parent.clientWidth - padX;
    const availH = parent.clientHeight - padY;

    const zoom = doc.zoom;
    const displayW = doc.width * zoom;
    const displayH = doc.height * zoom;

    // Set Fabric canvas element dimensions to fill the available area
    fabricCanvas.setDimensions(
      { width: availW, height: availH },
      { cssOnly: false },
    );

    // Center the document in the viewport via viewportTransform
    const offsetX = (availW - displayW) / 2;
    const offsetY = (availH - displayH) / 2;
    fabricCanvas.setViewportTransform([zoom, 0, 0, zoom, offsetX, offsetY]);
    fabricCanvas.requestRenderAll();
  }, [fabricCanvas, doc.width, doc.height, doc.zoom, showRulers]);

  useEffect(() => {
    updateCanvasSize();
  }, [updateCanvasSize]);

  // ── Window resize listener ─────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => updateCanvasSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCanvasSize]);

  // ── Update background rect when document dimensions change ─────────
  useEffect(() => {
    if (!fabricCanvas) return;
    const bgRect = fabricCanvas
      .getObjects()
      .find(
        (o: fabric.FabricObject) =>
          (o as fabric.Rect & { _isDocBackground?: boolean })
            ._isDocBackground === true,
      ) as fabric.Rect | undefined;
    if (bgRect) {
      bgRect.set({ width: doc.width, height: doc.height });
      fabricCanvas.requestRenderAll();
    }
  }, [fabricCanvas, doc.width, doc.height]);

  // ── Zoom with Ctrl + mousewheel ────────────────────────────────────
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleWheel = (opt: fabric.TEvent<WheelEvent>) => {
      const e = opt.e;
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();

      const delta = -e.deltaY;
      const factor = delta > 0 ? 1.1 : 1 / 1.1;
      const newZoom = Math.min(32, Math.max(0.05, doc.zoom * factor));
      setDocument({ zoom: newZoom });
    };

    fabricCanvas.on('mouse:wheel', handleWheel);
    return () => {
      fabricCanvas.off('mouse:wheel', handleWheel);
    };
  }, [fabricCanvas, doc.zoom, setDocument]);

  // ── Pan with hand tool or space+drag ───────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        spaceDownRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDownRef.current = false;
        isPanningRef.current = false;
        lastPanPointRef.current = null;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!fabricCanvas) return;

    const canPan = () => activeTool === 'hand' || spaceDownRef.current;

    const onMouseDown = (opt: fabric.TEvent) => {
      if (!canPan()) return;
      isPanningRef.current = true;
      const e = opt.e as MouseEvent;
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
      fabricCanvas.selection = false;
    };

    const onMouseMove = (opt: fabric.TEvent) => {
      if (!isPanningRef.current || !lastPanPointRef.current) return;
      const vpt = fabricCanvas.viewportTransform;
      if (!vpt) return;

      const e = opt.e as MouseEvent;
      const dx = e.clientX - lastPanPointRef.current.x;
      const dy = e.clientY - lastPanPointRef.current.y;
      vpt[4] += dx;
      vpt[5] += dy;
      fabricCanvas.setViewportTransform(vpt);
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
      fabricCanvas.requestRenderAll();
    };

    const onMouseUp = () => {
      isPanningRef.current = false;
      lastPanPointRef.current = null;
      if (activeTool !== 'hand') {
        fabricCanvas.selection = true;
      }
    };

    fabricCanvas.on('mouse:down', onMouseDown);
    fabricCanvas.on('mouse:move', onMouseMove);
    fabricCanvas.on('mouse:up', onMouseUp);
    return () => {
      fabricCanvas.off('mouse:down', onMouseDown);
      fabricCanvas.off('mouse:move', onMouseMove);
      fabricCanvas.off('mouse:up', onMouseUp);
    };
  }, [fabricCanvas, activeTool]);

  // ── Ruler drawing ──────────────────────────────────────────────────
  const drawRulers = useCallback(() => {
    if (!showRulers || !fabricCanvas) return;

    const hCanvas = rulerHRef.current;
    const vCanvas = rulerVRef.current;
    if (!hCanvas || !vCanvas) return;

    const vpt = fabricCanvas.viewportTransform;
    if (!vpt) return;
    const zoom = vpt[0];
    const offsetX = vpt[4];
    const offsetY = vpt[5];

    // ── Horizontal ruler ──
    const hCtx = hCanvas.getContext('2d');
    if (hCtx) {
      const w = hCanvas.width;
      hCtx.clearRect(0, 0, w, RULER_SIZE);
      hCtx.fillStyle = RULER_BG;
      hCtx.fillRect(0, 0, w, RULER_SIZE);

      const step = getTickStep(zoom);

      hCtx.font = '9px sans-serif';
      hCtx.textBaseline = 'top';

      const startPx = -offsetX / zoom;
      const endPx = (w - offsetX) / zoom;
      const firstTick = Math.floor(startPx / step) * step;

      for (let px = firstTick; px <= endPx; px += step) {
        const screenX = px * zoom + offsetX;
        const isMajor = Math.round(px) % (step * 5) === 0;

        hCtx.strokeStyle = isMajor ? RULER_MAJOR_TICK : RULER_TICK;
        hCtx.beginPath();
        hCtx.moveTo(screenX, isMajor ? 0 : RULER_SIZE * 0.5);
        hCtx.lineTo(screenX, RULER_SIZE);
        hCtx.stroke();

        if (isMajor) {
          hCtx.fillStyle = RULER_TEXT;
          hCtx.fillText(`${Math.round(px)}`, screenX + 2, 1);
        }
      }
    }

    // ── Vertical ruler ──
    const vCtx = vCanvas.getContext('2d');
    if (vCtx) {
      const h = vCanvas.height;
      vCtx.clearRect(0, 0, RULER_SIZE, h);
      vCtx.fillStyle = RULER_BG;
      vCtx.fillRect(0, 0, RULER_SIZE, h);

      const step = getTickStep(zoom);

      vCtx.font = '9px sans-serif';

      const startPx = -offsetY / zoom;
      const endPx = (h - offsetY) / zoom;
      const firstTick = Math.floor(startPx / step) * step;

      for (let px = firstTick; px <= endPx; px += step) {
        const screenY = px * zoom + offsetY;
        const isMajor = Math.round(px) % (step * 5) === 0;

        vCtx.strokeStyle = isMajor ? RULER_MAJOR_TICK : RULER_TICK;
        vCtx.beginPath();
        vCtx.moveTo(isMajor ? 0 : RULER_SIZE * 0.5, screenY);
        vCtx.lineTo(RULER_SIZE, screenY);
        vCtx.stroke();

        if (isMajor) {
          vCtx.save();
          vCtx.translate(1, screenY + 2);
          vCtx.rotate(-Math.PI / 2);
          vCtx.fillStyle = RULER_TEXT;
          vCtx.fillText(`${Math.round(px)}`, 0, 9);
          vCtx.restore();
        }
      }
    }
  }, [showRulers, fabricCanvas]);

  // Redraw rulers whenever relevant state changes
  useEffect(() => {
    drawRulers();
  }, [drawRulers, doc.zoom]);

  // Redraw rulers after Fabric renders (pan, zoom changes)
  useEffect(() => {
    if (!fabricCanvas) return;
    const afterRender = () => drawRulers();
    fabricCanvas.on('after:render', afterRender);
    return () => {
      fabricCanvas.off('after:render', afterRender);
    };
  }, [fabricCanvas, drawRulers]);

  // Keep ruler canvas sizes in sync
  useEffect(() => {
    if (!containerRef.current) return;
    const parent = containerRef.current.parentElement;
    if (!parent) return;
    const padX = showRulers ? RULER_SIZE : 0;
    const padY = showRulers ? RULER_SIZE : 0;
    const w = parent.clientWidth - padX;
    const h = parent.clientHeight - padY;
    if (rulerHRef.current) {
      rulerHRef.current.width = w;
      rulerHRef.current.height = RULER_SIZE;
    }
    if (rulerVRef.current) {
      rulerVRef.current.width = RULER_SIZE;
      rulerVRef.current.height = h;
    }
    drawRulers();
  }, [showRulers, drawRulers, doc.zoom, doc.width, doc.height]);

  // ── Cursor style based on active tool ──────────────────────────────
  const cursorForTool = (): string => {
    if (spaceDownRef.current || activeTool === 'hand') return 'grab';
    switch (activeTool) {
      case 'move':
        return 'default';
      case 'brush':
      case 'eraser':
      case 'clone-stamp':
      case 'healing':
      case 'blur-tool':
      case 'sharpen-tool':
      case 'dodge':
      case 'burn':
        return 'crosshair';
      case 'text':
        return 'text';
      case 'eyedropper':
        return 'crosshair';
      case 'crop':
        return 'crosshair';
      case 'zoom':
        return 'zoom-in';
      default:
        return 'crosshair';
    }
  };

  return (
    <div className="canvas-area" style={{ cursor: cursorForTool() }}>
      {/* Rulers */}
      {showRulers && (
        <>
          <canvas
            ref={rulerHRef}
            className="ruler-h"
            style={{
              position: 'absolute',
              top: 0,
              left: RULER_SIZE,
              height: RULER_SIZE,
              zIndex: 10,
            }}
          />
          <canvas
            ref={rulerVRef}
            className="ruler-v"
            style={{
              position: 'absolute',
              top: RULER_SIZE,
              left: 0,
              width: RULER_SIZE,
              zIndex: 10,
            }}
          />
          {/* Corner square */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: RULER_SIZE,
              height: RULER_SIZE,
              background: RULER_BG,
              zIndex: 11,
            }}
          />
        </>
      )}

      {/* Fabric canvas wrapper */}
      <div
        ref={containerRef}
        className="canvas-container"
        style={{
          marginTop: showRulers ? RULER_SIZE : 0,
          marginLeft: showRulers ? RULER_SIZE : 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <canvas id="editor-canvas" ref={canvasElRef} />
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

/** Determine a good tick step (in document pixels) based on current zoom. */
function getTickStep(zoom: number): number {
  const ideal = 50 / zoom; // target ~50 screen pixels between major ticks
  const mag = Math.pow(10, Math.floor(Math.log10(ideal)));
  const residual = ideal / mag;
  if (residual <= 1) return mag;
  if (residual <= 2) return 2 * mag;
  if (residual <= 5) return 5 * mag;
  return 10 * mag;
}

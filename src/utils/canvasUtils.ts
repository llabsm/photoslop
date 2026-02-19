import * as fabric from 'fabric';
import type { FilterSettings } from '../types';

// ═══════════════════════════════════════════════════════════════════════
// Serialization
// ═══════════════════════════════════════════════════════════════════════

/** Serialize the entire Fabric canvas to a JSON string. */
export function serializeCanvas(canvas: fabric.Canvas): string {
  return JSON.stringify(canvas.toJSON());
}

/** Restore a Fabric canvas from a JSON string produced by `serializeCanvas`. */
export async function deserializeCanvas(
  canvas: fabric.Canvas,
  json: string,
): Promise<void> {
  const data = JSON.parse(json);
  await canvas.loadFromJSON(data);
  canvas.requestRenderAll();
}

// ═══════════════════════════════════════════════════════════════════════
// Pixel sampling
// ═══════════════════════════════════════════════════════════════════════

/**
 * Sample the color of a single pixel on the rendered canvas.
 * Returns a hex color string like "#rrggbb".
 */
export function getCanvasPixelColor(
  canvas: fabric.Canvas,
  x: number,
  y: number,
): string {
  const ctx = canvas.getContext();
  const vpt = canvas.viewportTransform;
  let sx = x;
  let sy = y;
  if (vpt) {
    sx = x * vpt[0] + vpt[4];
    sy = y * vpt[3] + vpt[5];
  }
  const pixel = ctx.getImageData(Math.round(sx), Math.round(sy), 1, 1).data;
  return rgbToHex(pixel[0], pixel[1], pixel[2]);
}

// ═══════════════════════════════════════════════════════════════════════
// Filters
// ═══════════════════════════════════════════════════════════════════════

/**
 * Apply a filter to the currently active Fabric.Image object.
 * If the active object is not a fabric.Image this is a no-op.
 */
export function applyFilter(
  canvas: fabric.Canvas,
  filterType: string,
  values: Record<string, number>,
): void {
  const active = canvas.getActiveObject();
  if (!(active instanceof fabric.FabricImage)) return;

  const filter = buildFilter({ type: filterType, values });
  if (!filter) return;

  // Replace an existing filter of the same type if found
  const existing = active.filters ?? [];
  const idx = existing.findIndex(
    (f: fabric.filters.BaseFilter<string, Record<string, any>>) => f.constructor === filter.constructor,
  );
  if (idx >= 0) {
    existing[idx] = filter;
  } else {
    existing.push(filter);
  }
  active.filters = existing;
  active.applyFilters();
  canvas.requestRenderAll();
}

// ═══════════════════════════════════════════════════════════════════════
// Canvas transforms
// ═══════════════════════════════════════════════════════════════════════

/**
 * Flatten all objects into a single rasterised fabric.Image.
 * The original objects are removed.
 */
export async function flattenCanvas(canvas: fabric.Canvas): Promise<void> {
  const dataURL = canvas.toDataURL({
    format: 'png',
    quality: 1,
    multiplier: 1,
  });

  const img = await fabric.FabricImage.fromURL(dataURL);
  canvas.clear();

  // Reset the viewport so the image sits at (0,0)
  const vpt = canvas.viewportTransform;
  if (vpt) {
    img.set({
      left: -vpt[4] / vpt[0],
      top: -vpt[5] / vpt[3],
      selectable: true,
    });
  }

  canvas.add(img);
  canvas.requestRenderAll();
}

/** Resize the Fabric canvas element dimensions and optionally scale objects. */
export function resizeCanvas(
  canvas: fabric.Canvas,
  width: number,
  height: number,
  scaleContent = false,
): void {
  const oldW = canvas.getWidth();
  const oldH = canvas.getHeight();

  canvas.setDimensions({ width, height });

  if (scaleContent && oldW > 0 && oldH > 0) {
    const sx = width / oldW;
    const sy = height / oldH;
    canvas.getObjects().forEach((obj) => {
      obj.scaleX = (obj.scaleX ?? 1) * sx;
      obj.scaleY = (obj.scaleY ?? 1) * sy;
      obj.left = (obj.left ?? 0) * sx;
      obj.top = (obj.top ?? 0) * sy;
      obj.setCoords();
    });
  }

  canvas.requestRenderAll();
}

/**
 * Flip the entire canvas content horizontally or vertically.
 * Works by inverting every object's position around the canvas center.
 */
export function flipCanvas(
  canvas: fabric.Canvas,
  direction: 'horizontal' | 'vertical',
): void {
  const bgRect = canvas
    .getObjects()
    .find(
      (o) => (o as fabric.Rect & { _isDocBackground?: boolean })._isDocBackground === true,
    ) as fabric.Rect | undefined;

  const centerX = bgRect ? (bgRect.width ?? 0) / 2 : canvas.getWidth() / 2;
  const centerY = bgRect ? (bgRect.height ?? 0) / 2 : canvas.getHeight() / 2;

  canvas.getObjects().forEach((obj) => {
    if ((obj as fabric.Rect & { _isDocBackground?: boolean })._isDocBackground) return;

    if (direction === 'horizontal') {
      obj.set({
        left: 2 * centerX - (obj.left ?? 0) - (obj.width ?? 0) * (obj.scaleX ?? 1),
        flipX: !obj.flipX,
      });
    } else {
      obj.set({
        top: 2 * centerY - (obj.top ?? 0) - (obj.height ?? 0) * (obj.scaleY ?? 1),
        flipY: !obj.flipY,
      });
    }
    obj.setCoords();
  });
  canvas.requestRenderAll();
}

/**
 * Rotate the entire canvas by a given number of degrees.
 * For 90 / 180 / 270 degree rotations the document dimensions are swapped
 * as appropriate and objects are repositioned.
 */
export function rotateCanvas(canvas: fabric.Canvas, degrees: number): void {
  const bgRect = canvas
    .getObjects()
    .find(
      (o) => (o as fabric.Rect & { _isDocBackground?: boolean })._isDocBackground === true,
    ) as fabric.Rect | undefined;

  const docW = bgRect ? (bgRect.width ?? 0) : canvas.getWidth();
  const docH = bgRect ? (bgRect.height ?? 0) : canvas.getHeight();

  const normalized = ((degrees % 360) + 360) % 360;

  canvas.getObjects().forEach((obj) => {
    if ((obj as fabric.Rect & { _isDocBackground?: boolean })._isDocBackground) return;

    const cx = (obj.left ?? 0) + ((obj.width ?? 0) * (obj.scaleX ?? 1)) / 2;
    const cy = (obj.top ?? 0) + ((obj.height ?? 0) * (obj.scaleY ?? 1)) / 2;

    let newCx: number;
    let newCy: number;

    switch (normalized) {
      case 90:
        newCx = docH - cy;
        newCy = cx;
        break;
      case 180:
        newCx = docW - cx;
        newCy = docH - cy;
        break;
      case 270:
        newCx = cy;
        newCy = docW - cx;
        break;
      default:
        // Arbitrary angle: rotate around document center
        {
          const rad = (degrees * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const dcx = docW / 2;
          const dcy = docH / 2;
          newCx = cos * (cx - dcx) - sin * (cy - dcy) + dcx;
          newCy = sin * (cx - dcx) + cos * (cy - dcy) + dcy;
        }
        break;
    }

    obj.set({
      left: newCx - ((obj.width ?? 0) * (obj.scaleX ?? 1)) / 2,
      top: newCy - ((obj.height ?? 0) * (obj.scaleY ?? 1)) / 2,
      angle: (obj.angle ?? 0) + degrees,
    });
    obj.setCoords();
  });

  // Swap document dimensions for 90/270 rotation
  if (normalized === 90 || normalized === 270) {
    if (bgRect) {
      bgRect.set({ left: 0, top: 0, width: docH, height: docW });
    }
  }

  canvas.requestRenderAll();
}

// ═══════════════════════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════════════════════

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
  );
}

function buildFilter(settings: FilterSettings): fabric.filters.BaseFilter<string, Record<string, any>> | null {
  const v = settings.values;

  switch (settings.type) {
    case 'brightness':
      return new fabric.filters.Brightness({ brightness: v.value ?? 0 });
    case 'contrast':
      return new fabric.filters.Contrast({ contrast: v.value ?? 0 });
    case 'saturation':
      return new fabric.filters.Saturation({ saturation: v.value ?? 0 });
    case 'blur':
    case 'gaussian-blur':
      return new fabric.filters.Blur({ blur: v.radius ?? v.value ?? 0 });
    case 'noise':
      return new fabric.filters.Noise({ noise: v.amount ?? v.value ?? 0 });
    case 'pixelate':
      return new fabric.filters.Pixelate({ blocksize: v.blockSize ?? v.value ?? 4 });
    case 'grayscale':
      return new fabric.filters.Grayscale();
    case 'invert':
      return new fabric.filters.Invert();
    case 'sepia':
      return new fabric.filters.Sepia();
    case 'gamma':
      return new fabric.filters.Gamma({
        gamma: [v.r ?? 1, v.g ?? 1, v.b ?? 1],
      });
    case 'hue-rotation':
      return new fabric.filters.HueRotation({ rotation: v.value ?? 0 });
    case 'vibrance':
      return new fabric.filters.Vibrance({ vibrance: v.value ?? 0 });
    case 'convolute': {
      const matrix = v.matrix
        ? Object.values(v)
        : [0, -1, 0, -1, 5, -1, 0, -1, 0]; // default sharpen
      return new fabric.filters.Convolute({ matrix });
    }
    default:
      console.warn(`Unknown filter type: ${settings.type}`);
      return null;
  }
}

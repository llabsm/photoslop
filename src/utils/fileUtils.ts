import * as fabric from 'fabric';

// ═══════════════════════════════════════════════════════════════════════
// Open file
// ═══════════════════════════════════════════════════════════════════════

/**
 * Open a file dialog, read the selected image, and add it to the canvas
 * as a new fabric.Image object.
 */
export function openFile(canvas: fabric.Canvas): Promise<void> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/svg+xml,image/gif,image/bmp';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve();
        return;
      }

      try {
        const dataUrl = await readFileAsDataURL(file);
        const img = await fabric.FabricImage.fromURL(dataUrl);
        img.set({ left: 0, top: 0 });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    input.oncancel = () => resolve();
    input.click();
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Export / Download helpers
// ═══════════════════════════════════════════════════════════════════════

/**
 * Export the canvas as a PNG and trigger a browser download.
 */
export function exportAsPNG(canvas: fabric.Canvas, filename = 'image.png'): void {
  const dataUrl = getExportDataURL(canvas, 'png', 1);
  triggerDownload(dataUrl, filename);
}

/**
 * Export the canvas as a JPEG and trigger a browser download.
 * @param quality 0-1 (default 0.92)
 */
export function exportAsJPEG(
  canvas: fabric.Canvas,
  quality = 0.92,
  filename = 'image.jpg',
): void {
  const dataUrl = getExportDataURL(canvas, 'jpeg', quality);
  triggerDownload(dataUrl, filename);
}

/**
 * Export the canvas as a WebP and trigger a browser download.
 * @param quality 0-1 (default 0.92)
 */
export function exportAsWebP(
  canvas: fabric.Canvas,
  quality = 0.92,
  filename = 'image.webp',
): void {
  const dataUrl = getExportDataURL(canvas, 'webp', quality);
  triggerDownload(dataUrl, filename);
}

/**
 * Export the canvas as an SVG string and trigger a browser download.
 */
export function exportAsSVG(canvas: fabric.Canvas, filename = 'image.svg'): void {
  const svg = canvas.toSVG();
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════
// Browser storage (localStorage)
// ═══════════════════════════════════════════════════════════════════════

const STORAGE_PREFIX = 'photoslop_canvas_';

/**
 * Save the current canvas state to localStorage under the given name.
 */
export function saveToBrowserStorage(canvas: fabric.Canvas, name: string): void {
  const json = JSON.stringify(canvas.toJSON());
  try {
    localStorage.setItem(STORAGE_PREFIX + name, json);
  } catch (err) {
    console.error('Failed to save to browser storage:', err);
  }
}

/**
 * Load a canvas state from localStorage by name.
 * Returns `true` if a saved state was found and loaded.
 */
export async function loadFromBrowserStorage(
  canvas: fabric.Canvas,
  name: string,
): Promise<boolean> {
  const raw = localStorage.getItem(STORAGE_PREFIX + name);
  if (!raw) return false;

  try {
    const data = JSON.parse(raw);
    await canvas.loadFromJSON(data);
    canvas.requestRenderAll();
    return true;
  } catch (err) {
    console.error('Failed to load from browser storage:', err);
    return false;
  }
}

/**
 * List all saved canvas names in browser storage.
 */
export function listBrowserStorageSaves(): string[] {
  const names: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      names.push(key.slice(STORAGE_PREFIX.length));
    }
  }
  return names;
}

/**
 * Delete a saved canvas from browser storage.
 */
export function deleteFromBrowserStorage(name: string): void {
  localStorage.removeItem(STORAGE_PREFIX + name);
}

// ═══════════════════════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════════════════════

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Generate a data URL for export, rendering the full document area
 * by temporarily resetting the viewport transform.
 */
function getExportDataURL(
  canvas: fabric.Canvas,
  format: 'png' | 'jpeg' | 'webp',
  quality: number,
): string {
  // Find the document background rect to know the export dimensions
  const bgRect = canvas
    .getObjects()
    .find(
      (o) => (o as fabric.Rect & { _isDocBackground?: boolean })._isDocBackground === true,
    ) as fabric.Rect | undefined;

  const docW = bgRect ? (bgRect.width ?? canvas.getWidth()) : canvas.getWidth();
  const docH = bgRect ? (bgRect.height ?? canvas.getHeight()) : canvas.getHeight();

  // Save the current viewport, set to identity for export
  const savedVpt = canvas.viewportTransform
    ? [...canvas.viewportTransform] as [number, number, number, number, number, number]
    : null;
  const savedW = canvas.getWidth();
  const savedH = canvas.getHeight();

  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.setDimensions({ width: docW, height: docH }, { cssOnly: false });
  canvas.renderAll();

  const dataUrl = canvas.toDataURL({ format, quality, multiplier: 1 });

  // Restore
  if (savedVpt) {
    canvas.setViewportTransform(savedVpt);
  }
  canvas.setDimensions({ width: savedW, height: savedH }, { cssOnly: false });
  canvas.renderAll();

  return dataUrl;
}

function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Revoke blob URLs (safe to call even for data: URLs)
  if (url.startsWith('blob:')) {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * Filter factory functions that return Fabric.js v6 filter instances.
 *
 * Usage:
 *   import { createBrightnessFilter } from '../utils/filters';
 *   const filter = createBrightnessFilter(0.3);
 *   image.filters.push(filter);
 *   image.applyFilters();
 */

import * as fabric from 'fabric';

// ═══════════════════════════════════════════════════════════════════════
// Adjustment filters (built-in Fabric filters)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Brightness adjustment.
 * @param value -1 to 1 (0 = no change)
 */
export function createBrightnessFilter(value: number): fabric.filters.Brightness {
  return new fabric.filters.Brightness({ brightness: clamp(value, -1, 1) });
}

/**
 * Contrast adjustment.
 * @param value -1 to 1 (0 = no change)
 */
export function createContrastFilter(value: number): fabric.filters.Contrast {
  return new fabric.filters.Contrast({ contrast: clamp(value, -1, 1) });
}

/**
 * Saturation adjustment.
 * @param value -1 to 1 (0 = no change)
 */
export function createSaturationFilter(value: number): fabric.filters.Saturation {
  return new fabric.filters.Saturation({ saturation: clamp(value, -1, 1) });
}

/**
 * Hue rotation.
 * @param degrees rotation in degrees (-180 to 180)
 */
export function createHueRotationFilter(degrees: number): fabric.filters.HueRotation {
  return new fabric.filters.HueRotation({ rotation: degrees });
}

/**
 * Vibrance adjustment.
 * @param value -1 to 1
 */
export function createVibranceFilter(value: number): fabric.filters.Vibrance {
  return new fabric.filters.Vibrance({ vibrance: clamp(value, -1, 1) });
}

/**
 * Gamma correction.
 * @param r Red channel gamma (default 1)
 * @param g Green channel gamma (default 1)
 * @param b Blue channel gamma (default 1)
 */
export function createGammaFilter(
  r = 1,
  g = 1,
  b = 1,
): fabric.filters.Gamma {
  return new fabric.filters.Gamma({ gamma: [r, g, b] });
}

// ═══════════════════════════════════════════════════════════════════════
// Blur / Sharpen / Noise
// ═══════════════════════════════════════════════════════════════════════

/**
 * Gaussian blur.
 * @param radius 0 to 1 (Fabric normalised blur radius)
 */
export function createGaussianBlur(radius: number): fabric.filters.Blur {
  return new fabric.filters.Blur({ blur: Math.max(0, radius) });
}

/**
 * Sharpen using a 3x3 convolution kernel.
 * The kernel is: [ 0, -1, 0, -1, 5, -1, 0, -1, 0 ]
 */
export function createSharpen(): fabric.filters.Convolute {
  return new fabric.filters.Convolute({
    matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  });
}

/**
 * Add random noise.
 * @param amount noise level (0-1000)
 */
export function createNoise(amount: number): fabric.filters.Noise {
  return new fabric.filters.Noise({ noise: Math.max(0, amount) });
}

// ═══════════════════════════════════════════════════════════════════════
// Stylistic filters
// ═══════════════════════════════════════════════════════════════════════

/**
 * Vignette effect via a custom Convolute / Composed approach.
 * Since Fabric.js v6 has no built-in vignette, we apply a
 * 2D Canvas post-process using `fabric.filters.Composed` with
 * a Brightness edge-darken trick. For a real vignette you would
 * typically composite a radial gradient mask. Here we provide a
 * close approximation using brightness + blur.
 */
export function createVignette(
  intensity = 0.3,
): fabric.filters.Composed {
  return new fabric.filters.Composed({
    subFilters: [
      new fabric.filters.Brightness({ brightness: -intensity }),
      new fabric.filters.Blur({ blur: 0.15 }),
    ],
  });
}

/**
 * Pixelate / mosaic effect.
 * @param blockSize pixel block size
 */
export function createPixelate(blockSize: number): fabric.filters.Pixelate {
  return new fabric.filters.Pixelate({ blocksize: Math.max(1, Math.round(blockSize)) });
}

/**
 * Posterize to a limited number of colour levels.
 * Fabric v6 does not have a built-in Posterize filter, so we implement
 * it via a custom BaseFilter subclass using Canvas2D.
 * @param levels number of colour levels per channel (2-256, default 4)
 */
export function createPosterize(levels = 4): fabric.filters.BaseFilter<string, Record<string, any>> {
  const clamped = Math.max(2, Math.min(256, Math.round(levels)));

  return new PosterizeFilter({ levels: clamped });
}

/**
 * Grayscale filter.
 */
export function createGrayscale(): fabric.filters.Grayscale {
  return new fabric.filters.Grayscale();
}

/**
 * Invert colours.
 */
export function createInvert(): fabric.filters.Invert {
  return new fabric.filters.Invert();
}

/**
 * Sepia tone.
 */
export function createSepia(): InstanceType<typeof fabric.filters.Sepia> {
  return new fabric.filters.Sepia();
}

/**
 * Emboss using a convolution kernel.
 */
export function createEmboss(): fabric.filters.Convolute {
  return new fabric.filters.Convolute({
    matrix: [-2, -1, 0, -1, 1, 1, 0, 1, 2],
  });
}

/**
 * Edge-detect using a Laplacian convolution kernel.
 */
export function createEdgeDetect(): fabric.filters.Convolute {
  return new fabric.filters.Convolute({
    matrix: [0, 1, 0, 1, -4, 1, 0, 1, 0],
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Custom PosterizeFilter
// ═══════════════════════════════════════════════════════════════════════

/**
 * Custom Canvas2D posterize filter for Fabric.js v6.
 */
class PosterizeFilter extends fabric.filters.BaseFilter<'Posterize', { levels: number }> {
  declare levels: number;

  static type = 'Posterize';

  static defaults = {
    levels: 4,
  };

  constructor(options?: { levels?: number }) {
    super(options);
    this.levels = options?.levels ?? 4;
  }

  /**
   * Apply posterization to the imageData in-place.
   */
  applyTo2d(options: { imageData: ImageData }) {
    const { data } = options.imageData;
    const step = 255 / (this.levels - 1);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.round(Math.round(data[i] / step) * step);       // R
      data[i + 1] = Math.round(Math.round(data[i + 1] / step) * step); // G
      data[i + 2] = Math.round(Math.round(data[i + 2] / step) * step); // B
      // Alpha (data[i+3]) left untouched
    }
  }
}

// Register the custom filter so Fabric can (de)serialise it
fabric.classRegistry.setClass(PosterizeFilter, 'filters.Posterize');

// ═══════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

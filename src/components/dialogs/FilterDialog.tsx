import { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import * as fabric from 'fabric';

interface Props {
  open: boolean;
  onClose: () => void;
  filterType: string;
}

const filterConfigs: Record<string, { label: string; params: { name: string; min: number; max: number; default: number; step?: number }[] }> = {
  'gaussian-blur': {
    label: 'Gaussian Blur',
    params: [{ name: 'blur', min: 0, max: 100, default: 5, step: 0.5 }],
  },
  'motion-blur': {
    label: 'Motion Blur',
    params: [
      { name: 'angle', min: 0, max: 360, default: 0 },
      { name: 'distance', min: 0, max: 100, default: 10 },
    ],
  },
  sharpen: {
    label: 'Sharpen',
    params: [{ name: 'amount', min: 0, max: 100, default: 50 }],
  },
  'unsharp-mask': {
    label: 'Unsharp Mask',
    params: [
      { name: 'radius', min: 0, max: 100, default: 5 },
      { name: 'amount', min: 0, max: 200, default: 100 },
      { name: 'threshold', min: 0, max: 255, default: 0 },
    ],
  },
  'add-noise': {
    label: 'Add Noise',
    params: [{ name: 'noise', min: 0, max: 1000, default: 50 }],
  },
  'reduce-noise': {
    label: 'Reduce Noise',
    params: [{ name: 'amount', min: 0, max: 100, default: 30 }],
  },
  vignette: {
    label: 'Vignette',
    params: [
      { name: 'radius', min: 0, max: 100, default: 50 },
      { name: 'amount', min: 0, max: 100, default: 50 },
    ],
  },
  pixelate: {
    label: 'Pixelate',
    params: [{ name: 'blockSize', min: 1, max: 100, default: 8 }],
  },
  posterize: {
    label: 'Posterize',
    params: [{ name: 'levels', min: 2, max: 40, default: 4 }],
  },
  emboss: {
    label: 'Emboss',
    params: [{ name: 'strength', min: 0, max: 100, default: 50 }],
  },
  'lens-distortion': {
    label: 'Lens Distortion',
    params: [
      { name: 'distortion', min: -100, max: 100, default: 0 },
    ],
  },
  'radial-blur': {
    label: 'Radial Blur',
    params: [{ name: 'amount', min: 0, max: 100, default: 10 }],
  },
};

export default function FilterDialog({ open, onClose, filterType }: Props) {
  const { fabricCanvas } = useEditorStore();
  const config = filterConfigs[filterType];
  const [values, setValues] = useState<Record<string, number>>(() => {
    const v: Record<string, number> = {};
    config?.params.forEach((p) => { v[p.name] = p.default; });
    return v;
  });

  if (!open || !config) return null;

  const handleApply = () => {
    if (!fabricCanvas) return;

    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && activeObj instanceof fabric.FabricImage) {
      const img = activeObj as fabric.FabricImage;
      const filters = img.filters || [];

      switch (filterType) {
        case 'gaussian-blur':
          filters.push(new fabric.filters.Blur({ blur: values.blur / 100 }));
          break;
        case 'sharpen':
          filters.push(new fabric.filters.Convolute({
            matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0],
          }));
          break;
        case 'emboss':
          filters.push(new fabric.filters.Convolute({
            matrix: [-2, -1, 0, -1, 1, 1, 0, 1, 2],
          }));
          break;
        case 'add-noise':
          filters.push(new fabric.filters.Noise({ noise: values.noise }));
          break;
        case 'pixelate':
          filters.push(new fabric.filters.Pixelate({ blocksize: values.blockSize }));
          break;
        case 'posterize':
          // Posterize not built-in, use gamma trick
          filters.push(new fabric.filters.Gamma({ gamma: [values.levels / 10, values.levels / 10, values.levels / 10] }));
          break;
        default:
          // For filters without direct Fabric.js support, apply blur as fallback
          filters.push(new fabric.filters.Blur({ blur: 0.1 }));
      }

      img.filters = filters;
      img.applyFilters();
      fabricCanvas.renderAll();
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 380 }}>
        <div className="modal-header">
          <span>{config.label}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 16 }}>×</button>
        </div>
        <div className="modal-body">
          {config.params.map((param) => (
            <div key={param.name} className="adjustment-slider" style={{ marginBottom: 8 }}>
              <label style={{ textTransform: 'capitalize' }}>{param.name}</label>
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step || 1}
                value={values[param.name]}
                onChange={(e) => setValues({ ...values, [param.name]: Number(e.target.value) })}
              />
              <span className="value">{values[param.name]}</span>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleApply}>Apply</button>
        </div>
      </div>
    </div>
  );
}

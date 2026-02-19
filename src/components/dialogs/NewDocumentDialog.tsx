import { useState } from 'react';
import * as fabric from 'fabric';
import { useEditorStore } from '../../stores/editorStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

const presets = [
  { name: 'HD (1920×1080)', w: 1920, h: 1080 },
  { name: '4K (3840×2160)', w: 3840, h: 2160 },
  { name: 'Instagram Post (1080×1080)', w: 1080, h: 1080 },
  { name: 'Instagram Story (1080×1920)', w: 1080, h: 1920 },
  { name: 'A4 (2480×3508)', w: 2480, h: 3508 },
  { name: 'US Letter (2550×3300)', w: 2550, h: 3300 },
  { name: 'Web Banner (1200×628)', w: 1200, h: 628 },
  { name: 'YouTube Thumbnail (1280×720)', w: 1280, h: 720 },
];

export default function NewDocumentDialog({ open, onClose }: Props) {
  const { setDocument, addLayer, fabricCanvas } = useEditorStore();
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [name, setName] = useState('Untitled');
  const [bgColor, setBgColor] = useState('#ffffff');

  if (!open) return null;

  const handleCreate = () => {
    setDocument({ width, height, name, zoom: 1 });
    if (fabricCanvas) {
      fabricCanvas.clear();
      fabricCanvas.setDimensions({ width, height });
      // Add background
      const bg = new fabric.Rect({
        left: 0,
        top: 0,
        width,
        height,
        fill: bgColor,
        selectable: false,
        evented: false,
        name: 'background',
      });
      fabricCanvas.add(bg);
      fabricCanvas.renderAll();
    }
    addLayer({ name: 'Background', type: 'raster' });
    onClose();
  };

  const applyPreset = (preset: typeof presets[0]) => {
    setWidth(preset.w);
    setHeight(preset.h);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 400 }}>
        <div className="modal-header">
          <span>New Document</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 16 }}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--text-secondary)' }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4, color: 'var(--text-secondary)' }}>Width (px)</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                min={1}
                max={10000}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4, color: 'var(--text-secondary)' }}>Height (px)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                min={1}
                max={10000}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--text-secondary)' }}>Background Color</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                style={{ width: 40, height: 24, padding: 0, border: '1px solid var(--border)' }}
              />
              <button onClick={() => setBgColor('#ffffff')}>White</button>
              <button onClick={() => setBgColor('#000000')}>Black</button>
              <button onClick={() => setBgColor('transparent')}>Transparent</button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--text-secondary)' }}>Presets</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {presets.map((p) => (
                <button key={p.name} onClick={() => applyPreset(p)} style={{ fontSize: 10 }}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleCreate}>Create</button>
        </div>
      </div>
    </div>
  );
}

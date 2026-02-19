import { useState } from 'react';
import * as fabric from 'fabric';
import { useEditorStore } from '../../stores/editorStore';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'image' | 'canvas';
}

export default function ImageResizeDialog({ open, onClose, mode }: Props) {
  const { document, setDocument, fabricCanvas } = useEditorStore();
  const [width, setWidth] = useState(document.width);
  const [height, setHeight] = useState(document.height);
  const [constrain, setConstrain] = useState(true);
  const [interpolation, setInterpolation] = useState('bilinear');
  const aspect = document.width / document.height;

  if (!open) return null;

  const handleWidthChange = (w: number) => {
    setWidth(w);
    if (constrain) setHeight(Math.round(w / aspect));
  };

  const handleHeightChange = (h: number) => {
    setHeight(h);
    if (constrain) setWidth(Math.round(h * aspect));
  };

  const handleApply = () => {
    if (fabricCanvas) {
      if (mode === 'image') {
        const scaleX = width / document.width;
        const scaleY = height / document.height;
        fabricCanvas.getObjects().forEach((obj: fabric.FabricObject) => {
          obj.scaleX = (obj.scaleX || 1) * scaleX;
          obj.scaleY = (obj.scaleY || 1) * scaleY;
          obj.left = (obj.left || 0) * scaleX;
          obj.top = (obj.top || 0) * scaleY;
          obj.setCoords();
        });
      }
      fabricCanvas.setDimensions({ width, height });
      fabricCanvas.renderAll();
    }
    setDocument({ width, height });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 360 }}>
        <div className="modal-header">
          <span>{mode === 'image' ? 'Image Size' : 'Canvas Size'}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 16 }}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 8, color: 'var(--text-muted)', fontSize: 11 }}>
            Current: {document.width} × {document.height} px
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4, color: 'var(--text-secondary)' }}>Width (px)</label>
              <input
                type="number"
                value={width}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
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
                onChange={(e) => handleHeightChange(Number(e.target.value))}
                min={1}
                max={10000}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={constrain}
                onChange={(e) => setConstrain(e.target.checked)}
              />
              Constrain proportions
            </label>
          </div>
          {mode === 'image' && (
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: 'var(--text-secondary)' }}>Interpolation</label>
              <select value={interpolation} onChange={(e) => setInterpolation(e.target.value)} style={{ width: '100%' }}>
                <option value="nearest">Nearest Neighbor</option>
                <option value="bilinear">Bilinear</option>
                <option value="bicubic">Bicubic</option>
              </select>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleApply}>Apply</button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore';

interface Props {
  open: boolean;
  onClose: () => void;
  format: 'png' | 'jpeg' | 'webp';
}

export default function ExportDialog({ open, onClose, format }: Props) {
  const { fabricCanvas, document } = useEditorStore();
  const [quality, setQuality] = useState(92);

  if (!open) return null;

  const handleExport = () => {
    if (!fabricCanvas) return;

    const multiplier = 1;
    let dataURL: string;

    if (format === 'png') {
      dataURL = fabricCanvas.toDataURL({ format: 'png', multiplier });
    } else if (format === 'jpeg') {
      dataURL = fabricCanvas.toDataURL({ format: 'jpeg', quality: quality / 100, multiplier });
    } else {
      dataURL = fabricCanvas.toDataURL({ format: 'webp', quality: quality / 100, multiplier });
    }

    const link = window.document.createElement('a');
    link.download = `${document.name}.${format}`;
    link.href = dataURL;
    link.click();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 320 }}>
        <div className="modal-header">
          <span>Export as {format.toUpperCase()}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 16 }}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 8, color: 'var(--text-muted)', fontSize: 11 }}>
            {document.width} × {document.height} px
          </div>
          {(format === 'jpeg' || format === 'webp') && (
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: 'var(--text-secondary)' }}>
                Quality: {quality}%
              </label>
              <input
                type="range"
                min={1}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleExport}>Export</button>
        </div>
      </div>
    </div>
  );
}

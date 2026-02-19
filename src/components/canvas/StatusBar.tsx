import { useEditorStore } from '../../stores/editorStore';

export default function StatusBar() {
  const { document, setDocument, activeTool, selection } = useEditorStore();
  const zoomPercent = Math.round(document.zoom * 100);

  const zoomIn = () => setDocument({ zoom: Math.min(32, document.zoom * 1.25) });
  const zoomOut = () => setDocument({ zoom: Math.max(0.05, document.zoom / 1.25) });
  const zoomFit = () => setDocument({ zoom: 1 });

  return (
    <div className="statusbar">
      <div className="statusbar-left">
        <span>{document.name}</span>
        <span>{document.width} × {document.height} px</span>
        <span>{activeTool.replace(/-/g, ' ')}</span>
        {selection.active && <span>Selection: {selection.type}</span>}
      </div>
      <div className="statusbar-right">
        <div className="zoom-control">
          <button onClick={zoomOut} title="Zoom Out">−</button>
          <span style={{ minWidth: 40, textAlign: 'center' }}>{zoomPercent}%</span>
          <button onClick={zoomIn} title="Zoom In">+</button>
          <button onClick={zoomFit} title="Fit" style={{ fontSize: 10, width: 'auto', padding: '0 4px' }}>
            Fit
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEditorStore } from '../../stores/editorStore';

export default function OptionsBar() {
  const { activeTool, brushSettings, setBrushSettings, selection, setSelection } = useEditorStore();

  const renderBrushOptions = () => (
    <>
      <label>
        Size
        <input
          type="number"
          min={1}
          max={500}
          value={brushSettings.size}
          onChange={(e) => setBrushSettings({ size: Number(e.target.value) })}
        />
      </label>
      <label>
        Hardness
        <input
          type="range"
          min={0}
          max={100}
          value={brushSettings.hardness}
          onChange={(e) => setBrushSettings({ hardness: Number(e.target.value) })}
          style={{ width: 80 }}
        />
        <span>{brushSettings.hardness}%</span>
      </label>
      <label>
        Opacity
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(brushSettings.opacity * 100)}
          onChange={(e) => setBrushSettings({ opacity: Number(e.target.value) / 100 })}
          style={{ width: 80 }}
        />
        <span>{Math.round(brushSettings.opacity * 100)}%</span>
      </label>
      <label>
        Flow
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(brushSettings.flow * 100)}
          onChange={(e) => setBrushSettings({ flow: Number(e.target.value) / 100 })}
          style={{ width: 80 }}
        />
        <span>{Math.round(brushSettings.flow * 100)}%</span>
      </label>
    </>
  );

  const renderSelectionOptions = () => (
    <>
      <label>
        Feather
        <input
          type="number"
          min={0}
          max={100}
          value={selection.feather}
          onChange={(e) => setSelection({ feather: Number(e.target.value) })}
        />
        px
      </label>
    </>
  );

  const renderCropOptions = () => (
    <>
      <label>
        Ratio
        <select>
          <option value="free">Free</option>
          <option value="1:1">1:1</option>
          <option value="4:3">4:3</option>
          <option value="16:9">16:9</option>
          <option value="3:2">3:2</option>
          <option value="5:4">5:4</option>
        </select>
      </label>
    </>
  );

  const renderTextOptions = () => (
    <>
      <label>
        Font
        <select defaultValue="Arial">
          <option>Arial</option>
          <option>Helvetica</option>
          <option>Times New Roman</option>
          <option>Georgia</option>
          <option>Courier New</option>
          <option>Verdana</option>
          <option>Impact</option>
        </select>
      </label>
      <label>
        Size
        <input type="number" min={1} max={500} defaultValue={24} />
        px
      </label>
      <label>
        <button style={{ fontWeight: 'bold', width: 24 }}>B</button>
      </label>
      <label>
        <button style={{ fontStyle: 'italic', width: 24 }}>I</button>
      </label>
    </>
  );

  const renderShapeOptions = () => (
    <>
      <label>
        Fill
        <input type="color" defaultValue="#000000" style={{ width: 30, height: 20, padding: 0, border: 'none' }} />
      </label>
      <label>
        Stroke
        <input type="color" defaultValue="#000000" style={{ width: 30, height: 20, padding: 0, border: 'none' }} />
      </label>
      <label>
        Stroke Width
        <input type="number" min={0} max={50} defaultValue={1} />
      </label>
    </>
  );

  return (
    <div className="options-bar">
      <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>
        {activeTool.replace(/-/g, ' ')}
      </span>
      <span style={{ color: 'var(--border)' }}>|</span>
      {(activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'clone-stamp' || activeTool === 'healing') && renderBrushOptions()}
      {(activeTool === 'marquee-rect' || activeTool === 'marquee-ellipse' || activeTool === 'lasso' || activeTool === 'lasso-poly' || activeTool === 'magic-wand') && renderSelectionOptions()}
      {activeTool === 'crop' && renderCropOptions()}
      {activeTool === 'text' && renderTextOptions()}
      {(activeTool === 'shape-rect' || activeTool === 'shape-ellipse' || activeTool === 'shape-polygon' || activeTool === 'shape-line') && renderShapeOptions()}
    </div>
  );
}

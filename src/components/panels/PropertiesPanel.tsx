import React, { useCallback } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import type { Tool } from '../../types';

const BRUSH_TOOLS: Tool[] = [
  'brush',
  'eraser',
  'healing',
  'clone-stamp',
  'blur-tool',
  'sharpen-tool',
  'dodge',
  'burn',
];

const PropertiesPanel: React.FC = () => {
  const activeTool = useEditorStore((s) => s.activeTool);
  const brushSettings = useEditorStore((s) => s.brushSettings);
  const setBrushSettings = useEditorStore((s) => s.setBrushSettings);
  const fabricCanvas = useEditorStore((s) => s.fabricCanvas);

  const isBrushTool = BRUSH_TOOLS.includes(activeTool);

  const activeObject = fabricCanvas?.getActiveObject?.() ?? null;

  const handleBrushSize = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBrushSettings({ size: parseFloat(e.target.value) });
    },
    [setBrushSettings],
  );

  const handleBrushHardness = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBrushSettings({ hardness: parseFloat(e.target.value) });
    },
    [setBrushSettings],
  );

  const handleBrushOpacity = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBrushSettings({ opacity: parseFloat(e.target.value) });
    },
    [setBrushSettings],
  );

  const handleBrushFlow = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBrushSettings({ flow: parseFloat(e.target.value) });
    },
    [setBrushSettings],
  );

  return (
    <div className="panel">
      <div className="panel-header">
        <span>Properties</span>
      </div>
      <div className="panel-content">
        {/* Brush tool properties */}
        {isBrushTool && (
          <div className="properties-group">
            <div className="properties-group-title">Brush</div>

            <div className="properties-row">
              <label>Size</label>
              <input
                type="range"
                min={1}
                max={500}
                step={1}
                value={brushSettings.size}
                onChange={handleBrushSize}
              />
              <input
                type="number"
                min={1}
                max={500}
                value={brushSettings.size}
                onChange={handleBrushSize}
                style={{ width: 48 }}
              />
            </div>

            <div className="properties-row">
              <label>Hardness</label>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={brushSettings.hardness}
                onChange={handleBrushHardness}
              />
              <input
                type="number"
                min={0}
                max={100}
                value={brushSettings.hardness}
                onChange={handleBrushHardness}
                style={{ width: 48 }}
              />
            </div>

            <div className="properties-row">
              <label>Opacity</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={brushSettings.opacity}
                onChange={handleBrushOpacity}
              />
              <span
                style={{
                  width: 40,
                  textAlign: 'right',
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {Math.round(brushSettings.opacity * 100)}%
              </span>
            </div>

            <div className="properties-row">
              <label>Flow</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={brushSettings.flow}
                onChange={handleBrushFlow}
              />
              <span
                style={{
                  width: 40,
                  textAlign: 'right',
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {Math.round(brushSettings.flow * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Layer / object transform properties */}
        <div className="properties-group">
          <div className="properties-group-title">Transform</div>

          {activeObject ? (
            <>
              <div className="properties-row">
                <label>X</label>
                <input
                  type="number"
                  value={Math.round(activeObject.left ?? 0)}
                  onChange={(e) => {
                    activeObject.set('left', parseFloat(e.target.value));
                    fabricCanvas?.renderAll();
                  }}
                  style={{ width: 64 }}
                />
              </div>

              <div className="properties-row">
                <label>Y</label>
                <input
                  type="number"
                  value={Math.round(activeObject.top ?? 0)}
                  onChange={(e) => {
                    activeObject.set('top', parseFloat(e.target.value));
                    fabricCanvas?.renderAll();
                  }}
                  style={{ width: 64 }}
                />
              </div>

              <div className="properties-row">
                <label>Width</label>
                <input
                  type="number"
                  value={Math.round(
                    (activeObject.width ?? 0) * (activeObject.scaleX ?? 1),
                  )}
                  onChange={(e) => {
                    const w = parseFloat(e.target.value);
                    if (activeObject.width && activeObject.width > 0) {
                      activeObject.set('scaleX', w / activeObject.width);
                      fabricCanvas?.renderAll();
                    }
                  }}
                  style={{ width: 64 }}
                />
              </div>

              <div className="properties-row">
                <label>Height</label>
                <input
                  type="number"
                  value={Math.round(
                    (activeObject.height ?? 0) * (activeObject.scaleY ?? 1),
                  )}
                  onChange={(e) => {
                    const h = parseFloat(e.target.value);
                    if (activeObject.height && activeObject.height > 0) {
                      activeObject.set('scaleY', h / activeObject.height);
                      fabricCanvas?.renderAll();
                    }
                  }}
                  style={{ width: 64 }}
                />
              </div>

              <div className="properties-row">
                <label>Rotation</label>
                <input
                  type="number"
                  value={Math.round(activeObject.angle ?? 0)}
                  onChange={(e) => {
                    activeObject.set('angle', parseFloat(e.target.value));
                    fabricCanvas?.renderAll();
                  }}
                  style={{ width: 64 }}
                />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>deg</span>
              </div>
            </>
          ) : (
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                padding: '4px 0',
              }}
            >
              No object selected
            </div>
          )}
        </div>

        {/* Show current tool name when not a brush tool */}
        {!isBrushTool && (
          <div className="properties-group">
            <div className="properties-group-title">Tool</div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                padding: '4px 0',
                textTransform: 'capitalize',
              }}
            >
              {activeTool.replace(/-/g, ' ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertiesPanel;

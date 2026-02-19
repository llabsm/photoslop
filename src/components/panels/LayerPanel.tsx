import React, { useState, useCallback } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import type { BlendMode, Layer } from '../../types';
import { BLEND_MODE_LABELS } from '../../types';

const LayerPanel: React.FC = () => {
  const layers = useEditorStore((s) => s.layers);
  const activeLayerId = useEditorStore((s) => s.activeLayerId);
  const addLayer = useEditorStore((s) => s.addLayer);
  const removeLayer = useEditorStore((s) => s.removeLayer);
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const setActiveLayer = useEditorStore((s) => s.setActiveLayer);
  const reorderLayers = useEditorStore((s) => s.reorderLayers);
  const duplicateLayer = useEditorStore((s) => s.duplicateLayer);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const activeLayer = layers.find((l) => l.id === activeLayerId) ?? null;

  const handleBlendModeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (activeLayerId) {
        updateLayer(activeLayerId, { blendMode: e.target.value as BlendMode });
      }
    },
    [activeLayerId, updateLayer],
  );

  const handleOpacityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (activeLayerId) {
        updateLayer(activeLayerId, { opacity: parseFloat(e.target.value) });
      }
    },
    [activeLayerId, updateLayer],
  );

  const handleVisibilityToggle = useCallback(
    (layer: Layer) => {
      updateLayer(layer.id, { visible: !layer.visible });
    },
    [updateLayer],
  );

  const handleDoubleClick = useCallback((layer: Layer) => {
    setRenamingId(layer.id);
    setRenameValue(layer.name);
  }, []);

  const handleRenameSubmit = useCallback(
    (id: string) => {
      if (renameValue.trim()) {
        updateLayer(id, { name: renameValue.trim() });
      }
      setRenamingId(null);
    },
    [renameValue, updateLayer],
  );

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent, id: string) => {
      if (e.key === 'Enter') {
        handleRenameSubmit(id);
      } else if (e.key === 'Escape') {
        setRenamingId(null);
      }
    },
    [handleRenameSubmit],
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index < layers.length - 1) {
        reorderLayers(index, index + 1);
      }
    },
    [layers.length, reorderLayers],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index > 0) {
        reorderLayers(index, index - 1);
      }
    },
    [reorderLayers],
  );

  const handleAddLayer = useCallback(() => {
    addLayer({ type: 'raster' });
  }, [addLayer]);

  const handleAddGroup = useCallback(() => {
    addLayer({ type: 'group', name: 'Group' });
  }, [addLayer]);

  const handleDuplicate = useCallback(() => {
    if (activeLayerId) {
      duplicateLayer(activeLayerId);
    }
  }, [activeLayerId, duplicateLayer]);

  const handleDelete = useCallback(() => {
    if (activeLayerId) {
      removeLayer(activeLayerId);
    }
  }, [activeLayerId, removeLayer]);

  const handleAddMask = useCallback(() => {
    if (activeLayerId) {
      updateLayer(activeLayerId, { clipMask: true });
    }
  }, [activeLayerId, updateLayer]);

  return (
    <div className="panel">
      <div className="panel-header">
        <span>Layers</span>
      </div>
      <div className="panel-content">
        {/* Blend mode dropdown */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <select
            value={activeLayer?.blendMode ?? 'source-over'}
            onChange={handleBlendModeChange}
            style={{ flex: 1 }}
            disabled={!activeLayerId}
          >
            {(Object.entries(BLEND_MODE_LABELS) as [BlendMode, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </div>

        {/* Opacity slider */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
            Opacity
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={activeLayer?.opacity ?? 1}
            onChange={handleOpacityChange}
            disabled={!activeLayerId}
            style={{ flex: 1 }}
          />
          <span
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              width: 32,
              textAlign: 'right',
            }}
          >
            {Math.round((activeLayer?.opacity ?? 1) * 100)}%
          </span>
        </div>

        {/* Layer list - CSS flex-direction: column-reverse handles visual order */}
        <div className="layer-list">
          {layers.map((layer, index) => (
            <div
              key={layer.id}
              className={`layer-item${layer.id === activeLayerId ? ' active' : ''}`}
              onClick={() => setActiveLayer(layer.id)}
            >
              {/* Visibility toggle */}
              <button
                className={`layer-visibility${layer.visible ? '' : ' hidden'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleVisibilityToggle(layer);
                }}
                title={layer.visible ? 'Hide layer' : 'Show layer'}
              >
                {layer.visible ? '\u{1F441}' : '\u2014'}
              </button>

              {/* Thumbnail */}
              <div className="layer-thumb">
                {layer.thumbnail && <img src={layer.thumbnail} alt="" />}
              </div>

              {/* Name (double-click to rename) */}
              <div className="layer-name" onDoubleClick={() => handleDoubleClick(layer)}>
                {renamingId === layer.id ? (
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => handleRenameSubmit(layer.id)}
                    onKeyDown={(e) => handleRenameKeyDown(e, layer.id)}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span>{layer.name}</span>
                )}
              </div>

              {/* Opacity display */}
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  flexShrink: 0,
                }}
              >
                {Math.round(layer.opacity * 100)}%
              </span>

              {/* Move up/down buttons for reorder */}
              <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <button
                  className="panel-header-btn"
                  style={{ width: 14, height: 14, fontSize: 8 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveUp(index);
                  }}
                  disabled={index >= layers.length - 1}
                  title="Move up"
                >
                  &#9650;
                </button>
                <button
                  className="panel-header-btn"
                  style={{ width: 14, height: 14, fontSize: 8 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveDown(index);
                  }}
                  disabled={index <= 0}
                  title="Move down"
                >
                  &#9660;
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom action toolbar */}
        <div className="layer-actions">
          <button onClick={handleAddLayer} title="New Layer">
            +
          </button>
          <button onClick={handleAddGroup} title="New Group">
            &#128193;
          </button>
          <button onClick={handleDuplicate} title="Duplicate Layer" disabled={!activeLayerId}>
            &#9776;
          </button>
          <button onClick={handleDelete} title="Delete Layer" disabled={!activeLayerId}>
            &#128465;
          </button>
          <button onClick={handleAddMask} title="Add Mask" disabled={!activeLayerId}>
            &#9673;
          </button>
        </div>
      </div>
    </div>
  );
};

export default LayerPanel;

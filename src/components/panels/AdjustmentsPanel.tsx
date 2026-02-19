import React, { useCallback } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import type { ColorAdjustments } from '../../types';

interface SliderConfig {
  key: keyof ColorAdjustments;
  label: string;
  min: number;
  max: number;
  step: number;
}

const SLIDERS: SliderConfig[] = [
  { key: 'brightness', label: 'Brightness', min: -100, max: 100, step: 1 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100, step: 1 },
  { key: 'exposure', label: 'Exposure', min: -5, max: 5, step: 0.1 },
  { key: 'highlights', label: 'Highlights', min: -100, max: 100, step: 1 },
  { key: 'shadows', label: 'Shadows', min: -100, max: 100, step: 1 },
  { key: 'temperature', label: 'Temperature', min: -100, max: 100, step: 1 },
  { key: 'tint', label: 'Tint', min: -100, max: 100, step: 1 },
  { key: 'hue', label: 'Hue', min: -180, max: 180, step: 1 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100, step: 1 },
  { key: 'vibrance', label: 'Vibrance', min: -100, max: 100, step: 1 },
  { key: 'clarity', label: 'Clarity', min: -100, max: 100, step: 1 },
];

const AdjustmentsPanel: React.FC = () => {
  const adjustments = useEditorStore((s) => s.adjustments);
  const setAdjustments = useEditorStore((s) => s.setAdjustments);
  const resetAdjustments = useEditorStore((s) => s.resetAdjustments);

  const handleChange = useCallback(
    (key: keyof ColorAdjustments, value: number) => {
      setAdjustments({ [key]: value });
    },
    [setAdjustments],
  );

  const formatValue = (config: SliderConfig, value: number): string => {
    if (config.step < 1) {
      return value.toFixed(1);
    }
    return String(Math.round(value));
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <span>Adjustments</span>
        <div className="panel-header-actions">
          <button
            className="panel-header-btn"
            onClick={(e) => {
              e.stopPropagation();
              resetAdjustments();
            }}
            title="Reset all adjustments"
          >
            &#8634;
          </button>
        </div>
      </div>
      <div className="panel-content">
        {SLIDERS.map((config) => (
          <div key={config.key} className="adjustment-slider">
            <label>{config.label}</label>
            <input
              type="range"
              min={config.min}
              max={config.max}
              step={config.step}
              value={adjustments[config.key]}
              onChange={(e) => handleChange(config.key, parseFloat(e.target.value))}
            />
            <span className="value">{formatValue(config, adjustments[config.key])}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdjustmentsPanel;

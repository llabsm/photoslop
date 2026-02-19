import React, { useState, useCallback } from 'react';
import LayerPanel from './LayerPanel';
import HistoryPanel from './HistoryPanel';
import AdjustmentsPanel from './AdjustmentsPanel';
import PropertiesPanel from './PropertiesPanel';

interface PanelEntry {
  id: string;
  component: React.FC;
}

const PANELS: PanelEntry[] = [
  { id: 'properties', component: PropertiesPanel },
  { id: 'layers', component: LayerPanel },
  { id: 'adjustments', component: AdjustmentsPanel },
  { id: 'history', component: HistoryPanel },
];

const PanelDock: React.FC = () => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const handleWrapperClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, panelId: string) => {
      // Only toggle collapse when clicking on the panel-header element
      const target = e.target as HTMLElement;
      const header = target.closest('.panel-header');
      if (header) {
        e.stopPropagation();
        setCollapsed((prev) => ({
          ...prev,
          [panelId]: !prev[panelId],
        }));
      }
    },
    [],
  );

  return (
    <div className="panels">
      {PANELS.map(({ id, component: PanelComponent }) => {
        const isCollapsed = collapsed[id] ?? false;

        return (
          <div
            key={id}
            className={isCollapsed ? 'panel-collapsed' : undefined}
            onClick={(e) => handleWrapperClick(e, id)}
          >
            <PanelComponent />
          </div>
        );
      })}
    </div>
  );
};

export default PanelDock;

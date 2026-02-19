import React, { useCallback } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import type { HistoryEntry } from '../../types';

const HistoryPanel: React.FC = () => {
  const history = useEditorStore((s) => s.history);
  const historyIndex = useEditorStore((s) => s.historyIndex);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.canUndo);
  const canRedo = useEditorStore((s) => s.canRedo);

  const handleJumpToState = useCallback((targetIndex: number) => {
    const state = useEditorStore.getState();
    const current = state.historyIndex;
    if (targetIndex < current) {
      for (let i = current; i > targetIndex; i--) {
        useEditorStore.getState().undo();
      }
    } else if (targetIndex > current) {
      for (let i = current; i < targetIndex; i++) {
        useEditorStore.getState().redo();
      }
    }
  }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        <span>History</span>
        <div className="panel-header-actions">
          <button
            className="panel-header-btn"
            onClick={(e) => {
              e.stopPropagation();
              undo();
            }}
            disabled={!canUndo()}
            title="Undo"
          >
            &#8617;
          </button>
          <button
            className="panel-header-btn"
            onClick={(e) => {
              e.stopPropagation();
              redo();
            }}
            disabled={!canRedo()}
            title="Redo"
          >
            &#8618;
          </button>
        </div>
      </div>
      <div className="panel-content">
        <div className="history-list">
          {history.length === 0 && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                padding: '8px 0',
                textAlign: 'center',
              }}
            >
              No history yet
            </div>
          )}
          {history.map((entry: HistoryEntry, index: number) => {
            let className = 'history-item';
            if (index === historyIndex) {
              className += ' active';
            } else if (index > historyIndex) {
              className += ' future';
            }

            return (
              <div
                key={entry.id}
                className={className}
                onClick={() => handleJumpToState(index)}
                title={new Date(entry.timestamp).toLocaleTimeString()}
              >
                {entry.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HistoryPanel;

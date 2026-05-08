import React, { useEffect, useMemo } from 'react';
import './ControlPanel.css';

const toLabel = k =>
  k.replace(/_/g,' ')
   .replace(/\b\w/g,c=>c.toUpperCase());

const ControlPanel = ({ colorBy, setColorBy, nodes = [] }) => {
  const colorOptions = useMemo(() => {
    if (!nodes.length) return [];
    const allKeys = Object.keys(nodes[0]);
    const extraKeys = allKeys.filter(k =>
      k !== 'id' &&
      k !== 'cu_major' &&
      !k.startsWith('zip_') &&
      !['x','y','vx','vy','fx','fy'].includes(k)
    );
    return extraKeys.map(k => ({ value: k, label: toLabel(k) }));
  }, [nodes]);

  useEffect(() => {
    if (!colorOptions.length) {
      if (colorBy !== '') setColorBy('');
      return;
    }
    if (colorBy === '' || !colorOptions.some(o => o.value === colorBy)) {
      setColorBy(colorOptions[0].value);
    }
  }, [colorOptions, colorBy, setColorBy]);

  return (
    <div className="control-panel">
      <div className="filter-section">
        <label htmlFor="color-select"></label>
        <select
          id="color-select"
          value={colorBy}
          onChange={(e) => setColorBy(e.target.value)}
        >
          {!colorOptions.length && (
            <option value="" disabled>
              No graph data
            </option>
          )}
          {colorOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ControlPanel;
import React from 'react';
import './ControlPanel.css';

// build the menu from whatever keys your JSON actually contains
import data from '../data/network_data.json';

const toLabel = k =>
  k.replace(/_/g,' ')
   .replace(/\b\w/g,c=>c.toUpperCase());

// grab every key from your nodes – id/x/y/zip_* will be filtered out automatically
const ALL_KEYS = Object.keys(data.nodes[0]);
const EXTRA_KEYS = ALL_KEYS.filter(k =>
  k !== 'id' &&
  k !== 'cu_major' &&
  !k.startsWith('zip_') &&
  !['x','y','vx','vy','fx','fy'].includes(k)
);

// now every EXTRA_KEY (including year & cu_friends) shows up
const COLOR_OPTIONS = EXTRA_KEYS.map(k => ({
  value: k,
  label: toLabel(k)
}));

const ControlPanel = ({ colorBy, setColorBy }) => (
  <div className="control-panel">
    <div className="filter-section">
      <label htmlFor="color-select"></label>
      <select 
        id="color-select" 
        value={colorBy} 
        onChange={(e) => setColorBy(e.target.value)}
      >
        {COLOR_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  </div>
);

export default ControlPanel;
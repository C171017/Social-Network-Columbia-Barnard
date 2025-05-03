import React from 'react';
import './ControlPanel.css';

const COLOR_OPTIONS = [
  { value: 'email-sequence', label: 'Email Sequence' },
  { value: 'major', label: 'Major' },
  { value: 'school', label: 'School' },
  { value: 'year', label: 'Year' },
  { value: 'language', label: 'Language' },
  { value: 'cu_friends', label: 'Friends Source' }
];

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
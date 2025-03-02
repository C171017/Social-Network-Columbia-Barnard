import React from 'react';
import './ControlPanel.css';

const ControlPanel = ({ colorBy, setColorBy }) => {
  // Handle filter change
  const handleFilterChange = (event) => {
    setColorBy(event.target.value);
  };

  return (
    <div className="control-panel">
      <div className="filter-section">
        <label htmlFor="color-select">Color nodes by:</label>
        <select 
          id="color-select" 
          value={colorBy} 
          onChange={handleFilterChange}
        >
          <option value="email-sequence">Email Sequence</option>
          <option value="major">Major</option>
          <option value="school">School</option>
          <option value="year">Year</option>
          <option value="language">Language (Except English)</option>
        </select>
      </div>
      
      {/* You can add additional controls here */}
      <div className="additional-controls">
        {colorBy === 'major' && (
          <div className="info-text">
            Nodes with multiple majors will show split colors
          </div>
        )}
        
        {colorBy === 'language' && (
          <div className="info-text">
            Showing primary language (first in list)
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
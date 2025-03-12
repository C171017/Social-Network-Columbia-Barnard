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
          <option value="language">Language</option>
        </select>
      </div>

    </div>
  );
};

export default ControlPanel;
import React from 'react';
import './Legend.css';

const Legend = ({ colorBy }) => {
  // Define legend items for each color scheme
  const legendItems = {
    'email-sequence': [
      { color: '#FF0000', label: 'First Forwards' },
      { color: '#FF7F00', label: 'Second Forwards' },
      { color: '#000000', label: 'Direct Connection', isDashed: true }
    ],
    'major': [
      { color: '#4285f4', label: 'Mechanical Engineering' },
      { color: '#ea4335', label: 'Creative Writing' },
      { color: '#fbbc05', label: 'Biomedical Engineering' },
      { color: '#34a853', label: 'Psychology' },
      { color: '#673ab7', label: 'Human Rights' },
      { color: '#9C27B0', label: 'Comparative Literature & Society' },
      { color: '#00ACC1', label: 'Computer Science' },
      { color: '#9e9e9e', label: 'Unknown' }
    ],
    'school': [
      { color: '#4285f4', label: 'SEAS' },
      { color: '#ea4335', label: 'CC' },
      { color: '#34a853', label: 'Barnard' },
      { color: '#9e9e9e', label: 'Unknown' }
    ],
    'year': [
      { color: '#673ab7', label: '2025' },
      { color: '#4285f4', label: '2026' },
      { color: '#ea4335', label: '2027' },
      { color: '#9e9e9e', label: 'Unknown' }
    ],
    'language': [
      { color: '#4285f4', label: 'French' },
      { color: '#ea4335', label: 'Spanish' },
      { color: '#fbbc05', label: 'Mandarin' },
      { color: '#673ab7', label: 'Greek' },
      { color: '#34a853', label: 'English' },
      { color: '#9e9e9e', label: 'Unknown' }
    ]
  };

  // Make sure we have items for the current colorBy
  const currentItems = legendItems[colorBy] || [];

  return (
    <div className="legend">
      <h3>{colorBy === 'email-sequence' ? 'Email Sequence' : `Color by ${colorBy.charAt(0).toUpperCase() + colorBy.slice(1)}`}</h3>
      {currentItems.length === 0 ? (
        <p className="no-legend">No legend items available for this filter</p>
      ) : (
        <ul>
          {currentItems.map((item, index) => (
            <li key={index}>
              {item.isDashed ? (
                <div className="dashed-line" style={{ borderColor: item.color }}></div>
              ) : (
                <div className="color-box" style={{ backgroundColor: item.color }}></div>
              )}
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Legend;
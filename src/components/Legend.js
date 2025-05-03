import React, { useState, useEffect } from 'react';
import './Legend.css';

// Standard color palette (d3-inspired)
const COLOR_PALETTE = [
  '#4285f4', '#ea4335', '#fbbc05', '#34a853', '#673ab7', '#9C27B0', '#00ACC1',
  '#FF5722', '#795548', '#607D8B', '#3F51B5', '#009688', '#FFC107', '#8BC34A',
  '#E91E63', '#9E9E9E'
];

// Static legend items for email sequence and schools
const STATIC_LEGEND_ITEMS = {
  // 'email-sequence': [
  //   { color: '#FF0000', label: 'First Forwards' },
  //   { color: '#FF7F00', label: 'Second Forwards' },
  //   { color: '#FFD700', label: 'Third Forwards' },
  //   { color: '#00FF00', label: 'Fourth Forwards' },
  //   { color: '#0000FF', label: 'Fifth Forwards' },
  //   { color: '#4B0082', label: 'Sixth Forwards' },
  //   { color: '#9400D3', label: 'Seventh Forwards' },
  // ],
  // 'school': [
  //   { color: '#4285f4', label: 'SEAS' },
  //   { color: '#ea4335', label: 'CC' },
  //   { color: '#34a853', label: 'Barnard' },
  //   { color: '#673ab7', label: 'GS' },
  //   { color: '#9C27B0', label: 'TC' },
  //   { color: '#9e9e9e', label: 'Unknown' }
  // ],
  'year': [
    { color: '#673ab7', label: '2025' },
    { color: '#4285f4', label: '2026' },
    { color: '#ea4335', label: '2027' },
    { color: '#9e9e9e', label: 'Unknown' }
  ],
  'cu_friends':      [], 
};

// Initial common values for dynamic types
const INITIAL_DYNAMIC_ITEMS = {
  // 'major': [
  //   { color: '#4285f4', label: 'Mechanical Engineering' },
  //   { color: '#ea4335', label: 'Creative Writing' },
  //   { color: '#fbbc05', label: 'Biomedical Engineering' },
  //   { color: '#34a853', label: 'Psychology' },
  //   { color: '#673ab7', label: 'Human Rights' },
  //   { color: '#9C27B0', label: 'Comparative Literature & Society' },
  //   { color: '#00ACC1', label: 'Computer Science' },
  //   { color: '#9e9e9e', label: 'Unknown' }
  // ],
  // 'language': [
  //   { color: '#4285f4', label: 'French' },
  //   { color: '#ea4335', label: 'Spanish' },
  //   { color: '#fbbc05', label: 'Mandarin' },
  //   { color: '#673ab7', label: 'Greek' },
  //   { color: '#34a853', label: 'English' },
  //   { color: '#9e9e9e', label: 'Unknown' }
  // ]
};

const Legend = ({ colorBy }) => {
  const [legendItems, setLegendItems] = useState({
    ...STATIC_LEGEND_ITEMS,
    ...INITIAL_DYNAMIC_ITEMS
  });

  useEffect(() => {
    // Load dynamic values from data files
    const loadDynamicValues = async () => {
      try {
        // First attempt to load the data files with unique values
        let majorData = [];
        let languageData = [];
        let yearData = [];
        let cuFriends     = [];
        
        try {
          // Try to import dynamic data files
          const majorModule = await import('../data/unique_majors.json').catch(() => ({ default: [] }));
          const languageModule = await import('../data/unique_languages.json').catch(() => ({ default: [] }));
          const yearModule = await import('../data/unique_years.json').catch(() => ({ default: [] }));
          const cuFriendsModule = await import('../data/cu_friends.json').catch(() => ({ default: [] }));
          
          majorData = majorModule.default || [];
          languageData = languageModule.default || [];
          yearData = yearModule.default || [];
          cuFriends = cuFriendsModule .default || [];

        } catch (error) {
          console.warn('Dynamic data files not found, using default values');
        }
        
        // Generate color maps for majors and languages
        if (majorData.length > 0) {
          const majorLegend = majorData.map((major, index) => ({
            color: COLOR_PALETTE[index % COLOR_PALETTE.length],
            label: major
          }));
          
          // Always add Unknown
          if (!majorData.includes('Unknown')) {
            majorLegend.push({ color: '#9e9e9e', label: 'Unknown' });
          }
          
          setLegendItems(prev => ({
            ...prev,
            major: majorLegend
          }));
        }
        
        if (languageData.length > 0) {
          const languageLegend = languageData.map((language, index) => ({
            color: COLOR_PALETTE[index % COLOR_PALETTE.length],
            label: language
          }));
          
          // Always add Unknown
          if (!languageData.includes('Unknown')) {
            languageLegend.push({ color: '#9e9e9e', label: 'Unknown' });
          }
          
          setLegendItems(prev => ({
            ...prev,
            language: languageLegend
          }));
        }

        if (yearData.length > 0) {
          const yearLegend = yearData.map((year, index) => ({
            color: COLOR_PALETTE[index % COLOR_PALETTE.length],
            label: year
          }));
          
          // Always add Unknown
          if (!yearData.includes('Unknown')) {
            yearLegend.push({ color: '#9e9e9e', label: 'Unknown' });
          }
          
          setLegendItems(prev => ({
            ...prev,
            year: yearLegend
          }));
        }

        if (cuFriends.length > 0) {
          const cuFriendsLegend = cuFriends.map((label, i) => ({
            label,
            color: COLOR_PALETTE[i % COLOR_PALETTE.length],
          }));
          setLegendItems(prev => ({
            ...prev,
            cu_friends: cuFriendsLegend
          }));
        }
      } catch (error) {
        console.error('Error loading dynamic legend data:', error);
      }
    };
    
    loadDynamicValues();
  }, []);

  const currentItems = legendItems[colorBy] || [];

  const title = colorBy === 'email-sequence' 
    // ? 'Email Sequence' 
    // : `Color by ${colorBy.charAt(0).toUpperCase() + colorBy.slice(1)}`;

  return (
    <div className="legend">
      <h3>{title}</h3>
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
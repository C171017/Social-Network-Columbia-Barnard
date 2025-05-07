import React, { useState, useEffect } from 'react';
import './Legend.css';
import data from '../data/network_data.json';



// Standard color palette (d3-inspired)
const COLOR_PALETTE = [
  '#4285f4', '#ea4335', '#fbbc05', '#34a853', '#673ab7', '#9C27B0', '#00ACC1',
  '#FF5722', '#795548', '#607D8B', '#3F51B5', '#009688', '#FFC107', '#8BC34A',
  '#E91E63', '#9E9E9E'
];

const STATIC_LEGEND_ITEMS = {};   // start empty—everything will be filled dynamically

// Initial common values for dynamic types
const INITIAL_DYNAMIC_ITEMS = {

};

const Legend = ({ colorBy }) => {
  const [legendItems, setLegendItems] = useState({
    ...STATIC_LEGEND_ITEMS,
    ...INITIAL_DYNAMIC_ITEMS
  });

  useEffect(() => {
    // Helper: flatten & dedupe values for a given key
    const toLegend = key => {
      // 1) collect and split comma‑lists when the raw value is a string
      // 2) convert numbers/booleans to strings
      // 3) ignore null/undefined
      const all = data.nodes.flatMap(n => {
        const raw = n[key];
        if (typeof raw === 'string') {
          return raw
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        } else if (raw != null) {
          return [String(raw)];
        } else {
          return [];
        }
      });
      // dedupe
      const uniq = [...new Set(all)];
      // map to legend items with colors
      return uniq.map((v, i) => ({
        color: COLOR_PALETTE[i % COLOR_PALETTE.length],
        label: v
      }));
    };
  
    // Build legendItems for every field except id/zip_*
    const items = {};
    Object.keys(data.nodes[0])
      .filter(k => k !== 'id' && !k.startsWith('zip_'))
      .forEach(k => {
        items[k] = toLegend(k);
      });
  
    setLegendItems(items);
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
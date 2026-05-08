import React, { useState, useEffect } from 'react';
import './Legend.css';



// Standard color palette (d3-inspired)
const COLOR_PALETTE = [
  '#E6194B', // 1. Vivid Red
  '#3CB44B', // 2. Lime Green
  '#4363D8', // 3. Strong Blue
  '#F58231', // 4. Bright Orange
  '#911EB4', // 5. Bold Purple

  '#46F0F0', // 6. Cyan
  '#F032E6', // 7. Magenta
  '#BCF60C', // 8. Neon Lime
  '#FABEBE', // 9. Soft Pink
  '#008080', // 10. Teal
  '#E6BEFF', // 11. Lavender
  '#9A6324', // 12. Brown
  '#AAFFC3', // 13. Mint
  '#FFD8B1', // 14. Peach
  '#800000', // 15. Maroon
  '#000075', // 16. Navy
  '#808000'  // 17. Olive
];

const STATIC_LEGEND_ITEMS = {};   // start empty—everything will be filled dynamically

// Initial common values for dynamic types
const INITIAL_DYNAMIC_ITEMS = {

};

const Legend = ({ colorBy, data }) => {
  const [legendItems, setLegendItems] = useState({
    ...STATIC_LEGEND_ITEMS,
    ...INITIAL_DYNAMIC_ITEMS
  });

  useEffect(() => {
    const nodes = data?.nodes;
    if (!nodes?.length) {
      setLegendItems({});
      return;
    }

    // Helper: flatten & dedupe values for a given key
    const toLegend = key => {
      // 1) collect and split comma‑lists when the raw value is a string
      // 2) convert numbers/booleans to strings
      // 3) ignore null/undefined
      const all = nodes.flatMap(n => {
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
    Object.keys(nodes[0])
      .filter(k => k !== 'id' && !k.startsWith('zip_'))
      .forEach(k => {
        items[k] = toLegend(k);
      });

    setLegendItems(items);
  }, [data]);

  const currentItems = legendItems[colorBy] || [];

  const fieldLabel = (key) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const title = !colorBy
    ? 'Legend'
    : colorBy === 'email-sequence'
      ? 'Email sequence'
      : `Color by ${fieldLabel(colorBy)}`;

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
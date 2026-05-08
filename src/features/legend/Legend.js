import React, { useState, useEffect } from 'react';
import './Legend.css';
import { COLOR_PALETTE } from '../../shared/constants/colorPalette';
import { extractNodeValues, toLabel } from '../../shared/utils/fieldMetadata';

const Legend = ({ colorBy, data, darkSurface = false }) => {
  const [legendItems, setLegendItems] = useState({});

  useEffect(() => {
    const nodes = data?.nodes;
    if (!nodes?.length) {
      setLegendItems({});
      return;
    }

    const toLegend = (key) => {
      const uniq = [...new Set(nodes.flatMap((n) => extractNodeValues(n, key)))];
      return uniq.map((v, i) => ({
        color: COLOR_PALETTE[i % COLOR_PALETTE.length],
        label: v
      }));
    };

    const items = {};
    Object.keys(nodes[0])
      .filter((k) => k !== 'id' && !k.startsWith('zip_'))
      .forEach((k) => {
        items[k] = toLegend(k);
      });

    setLegendItems(items);
  }, [data]);

  const currentItems = legendItems[colorBy] || [];

  const title = !colorBy ? 'Legend' : colorBy === 'email-sequence' ? 'Email sequence' : `Color by ${toLabel(colorBy)}`;

  return (
    <div className={`legend${darkSurface ? ' dark-surface' : ''}`}>
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

import { COLOR_PALETTE } from '../../../shared/constants/colorPalette';
import { extractNodeValues } from '../../../shared/utils/fieldMetadata';

export const buildColorMaps = (nodes = []) => {
  if (!nodes.length) return {};
  const maps = {};
  Object.keys(nodes[0])
    .filter((k) => k !== 'id' && !k.startsWith('zip_'))
    .forEach((key) => {
      const vals = [...new Set(nodes.flatMap((n) => extractNodeValues(n, key)))];
      if (!vals.length) return;
      maps[key] = {};
      vals.forEach((v, i) => {
        maps[key][v] = COLOR_PALETTE[i % COLOR_PALETTE.length];
      });
    });
  return maps;
};

export const getNodeColor = (node, colorBy, colorMaps) => {
  if (!node || !colorBy || !colorMaps) return '#9e9e9e';
  const field = node[colorBy];
  if (field == null || field === '') return '#9e9e9e';
  const firstVal = String(field).split(',')[0].trim();
  if (colorMaps[colorBy]?.[firstVal]) return colorMaps[colorBy][firstVal];
  if (colorBy === 'email-sequence') return '#5F6368';
  return '#9e9e9e';
};

export const createNodePathInfo = (node, colorBy, colorMaps) => {
  if (!node || !colorBy || !colorMaps) return null;
  const field = node[colorBy];
  if (typeof field !== 'string' || !field.includes(',')) return null;
  const items = field
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length <= 1) return null;
  return { items, colorMap: colorMaps[colorBy] || {} };
};

export const toLabel = (key) =>
  String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const getColorableFieldKeys = (node = {}) =>
  Object.keys(node).filter(
    (k) =>
      k !== 'id' &&
      k !== 'cu_major' &&
      !k.startsWith('zip_') &&
      !['x', 'y', 'vx', 'vy', 'fx', 'fy'].includes(k)
  );

export const extractNodeValues = (node, key) => {
  const raw = node?.[key];
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (raw != null && raw !== '') {
    return [String(raw)];
  }
  return [];
};


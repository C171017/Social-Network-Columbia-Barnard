import { CLUSTER_BASE_R, CLUSTER_PX_PER_SQRT_NODE } from '../constants/graphConstants';

export function seededRand(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function renderClusterContents(clusterSel, gi, colorCounts, totalSize) {
  clusterSel.selectAll('circle').remove();
  const clusterR = CLUSTER_BASE_R + CLUSTER_PX_PER_SQRT_NODE * Math.sqrt(Math.max(1, totalSize));
  const entries = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]);
  const rand = seededRand(gi * 1000003 + 17);

  entries.forEach(([color, count]) => {
    const dotR = Math.max(24, Math.sqrt(count) * 22);
    const dotsPerColor = count >= 8 ? 3 : count >= 3 ? 2 : 1;
    for (let i = 0; i < dotsPerColor; i++) {
      const theta = rand() * 2 * Math.PI;
      const radial = Math.sqrt(rand()) * 0.55 * clusterR;
      const cx = Math.cos(theta) * radial;
      const cy = Math.sin(theta) * radial;
      const subScale = i === 0 ? 1 : 0.65 + rand() * 0.2;
      clusterSel
        .append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', dotR * subScale)
        .attr('fill', color)
        .attr('fill-opacity', 0.85);
    }
  });
}

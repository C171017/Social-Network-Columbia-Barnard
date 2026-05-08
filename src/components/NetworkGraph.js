////////////////////////////////////////////
////////////////////////////////////////////
//Imports (导入模块)

import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import ControlPanel from './ControlPanel';
import Legend from './Legend';
import './NetworkGraph.css';
////////////////////////////////////////////
////////////////////////////////////////////


const NODE_RADIUS = 30;

/////////////////////////////////////////////
/////////////////////////////////////////////
//buildGroups 函数（构建群组）

function buildGroups(nodes, links) {
  const adj = new Map(nodes.map(n => [n.id, []]));
  links.forEach(l => {
    adj.get(l.source.id ?? l.source).push(l.target.id ?? l.target);
    adj.get(l.target.id ?? l.target).push(l.source.id ?? l.source);
  });

  let current = 0;
  const groupMap = new Map();          // node-id ➜ group #
  nodes.forEach(n => {
    if (groupMap.has(n.id)) return;
    const stack = [n.id];
    while (stack.length) {
      const id = stack.pop();
      if (groupMap.has(id)) continue;
      groupMap.set(id, current);
      adj.get(id).forEach(nei => stack.push(nei));
    }
    current += 1;
  });
  return groupMap;                     // use groupMap.get(node.id)
}

function isLargeGroupNode(d, groupMap, groupSizes, largeGroupThreshold) {
  const gi = groupMap.get(d.id);
  if (gi == null) return false;
  return groupSizes[gi] > largeGroupThreshold;
}

// Large-group nodes: gradient ring just outside colored disk.
function appendLargeGroupNodeAccent(nodeGroup, d, groupMap, groupSizes, largeGroupThreshold) {
  if (!isLargeGroupNode(d, groupMap, groupSizes, largeGroupThreshold)) return;
  const EDGE_OUTPAD = 2;
  const NODE_RING_STROKE = 3.5;
  const rStrokeCenter = NODE_RADIUS + EDGE_OUTPAD + NODE_RING_STROKE / 2;
  const rGlow = NODE_RADIUS + 5;

  nodeGroup.append('circle')
    .attr('class', 'large-group-accent-ring-glow')
    .attr('pointer-events', 'none')
    .attr('r', rGlow)
    .attr('fill', 'url(#large-node-ring-fill)');

  nodeGroup.append('circle')
    .attr('class', 'large-group-accent-ring')
    .attr('pointer-events', 'none')
    .attr('r', rStrokeCenter)
    .attr('fill', 'none')
    .attr('stroke', 'url(#large-node-border-grad)')
    .attr('stroke-width', NODE_RING_STROKE)
    .attr('stroke-opacity', 0.88);
}

//////////////////////////////////////////////////////
//////////////////////////////////////////////////////
//常量配置（Configuration Constants)

// Define zoom settings
const ZOOM_MIN = 0.03;
const ZOOM_MAX = 1;

// Canvas: circle clip, soft rim; white↔grey onset and drag clamp share CANVAS_WHITE_INSET / OUTER_RADIUS.
const LEGACY_SQUARE_SIDE = 25000;
const CIRCLE_DIAMETER = LEGACY_SQUARE_SIDE * 1.5;
const CIRCLE_RADIUS = CIRCLE_DIAMETER / 2;
const CIRCLE_CX = CIRCLE_RADIUS;
const CIRCLE_CY = CIRCLE_RADIUS;

const CANVAS_EDGE_FEATHER_HALF = 2800;
const CANVAS_BACKDROP_RADIUS = CIRCLE_RADIUS + CANVAS_EDGE_FEATHER_HALF;
const VISUAL_SCENE_EXTENT = CIRCLE_DIAMETER + 2 * CANVAS_EDGE_FEATHER_HALF;
const CANVAS_WHITE_INSET = 1300;
const CANVAS_WHITE_OUTER_RADIUS = Math.max(0, CIRCLE_RADIUS - CANVAS_EDGE_FEATHER_HALF - CANVAS_WHITE_INSET);
const NODE_MOVABLE_DISK_PAD = NODE_RADIUS + 20;
const NODE_MOVE_MAX_RADIUS_FROM_CENTER = Math.max(
  600,
  CANVAS_WHITE_OUTER_RADIUS - NODE_MOVABLE_DISK_PAD
);

function clampNodeCenterToMovableDisk(x, y) {
  const dx = x - CIRCLE_CX;
  const dy = y - CIRCLE_CY;
  const dist = Math.hypot(dx, dy);
  if (!Number.isFinite(dist) || dist === 0 || dist <= NODE_MOVE_MAX_RADIUS_FROM_CENTER) {
    return { x, y };
  }
  const s = NODE_MOVE_MAX_RADIUS_FROM_CENTER / dist;
  return { x: CIRCLE_CX + dx * s, y: CIRCLE_CY + dy * s };
}

function clampNodesInPlace(nodes) {
  nodes.forEach((n) => {
    const c = clampNodeCenterToMovableDisk(n.x, n.y);
    n.x = c.x;
    n.y = c.y;
  });
}

// Standard color palette for dynamic generation
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

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////

//	4.	组件定义和 State 初始化

const NetworkGraph = ({ colorBy, setColorBy, data, largeGroupThreshold = 20 }) => {
  const svgRef = useRef();
  const zoomRef = useRef(null);
  const zoomCleanupRef = useRef(null);
  const [colorMaps, setColorMaps] = useState({});

///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

//5. 颜色映射生成 useEffect

  // Build one `colorMaps[key] = { value→color }` map for *all* keys in one pass
  useEffect(() => {
    const nodes = data.nodes;
    if (!nodes?.length) {
      setColorMaps({});
      return;
    }
    const uniq = arr => [...new Set(arr)].filter(Boolean);

    const maps = {};
    Object.keys(nodes[0])
      .filter(k => k !== 'id' && !k.startsWith('zip_'))
      .forEach((key) => {
        const vals = uniq(
          nodes.flatMap(n =>
            String(n[key] || '').split(',').map(s => s.trim())
          )
        );
        if (vals.length) {
          maps[key] = {};
          vals.forEach((v, i) => {
            maps[key][v] = COLOR_PALETTE[i % COLOR_PALETTE.length];
          });
        }
      });

    setColorMaps(maps);
  }, [data]);


////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

// 8.	getNodeColor & createNodePath (节点着色 & 多值拆分)

  const getNodeColor = useCallback((d) => {
    if (!colorMaps || !d || !colorBy) return '#9e9e9e';

    const field = d[colorBy];
    if (field == null || field === '') return '#9e9e9e';
    const firstVal = String(field).split(',')[0].trim();

    if (colorMaps[colorBy] && colorMaps[colorBy][firstVal]) {
      return colorMaps[colorBy][firstVal];
    }

    if (colorBy === 'email-sequence') return '#5F6368';

    return '#9e9e9e';
  }, [colorMaps, colorBy]);

  /**
   * Build slice information for ANY comma‑separated multivalue field.
   * Returns { items, colorMap } or null if single‑valued.
   */
  const createNodePath = useCallback((d) => {
    if (!d || !colorMaps || !colorBy) return null;

    const field = d[colorBy];
    if (typeof field !== 'string' || !field.includes(',')) return null;

    const items = field.split(',').map(s => s.trim()).filter(Boolean);
    if (items.length <= 1) return null;

    return {
      items,
      colorMap: colorMaps[colorBy] || {}
    };
  }, [colorMaps, colorBy]);

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

// 9.	setupZoom 缩放行为设置


  // Setup zoom behavior
  // Hybrid pan/zoom (Figma-ish on trackpad, Maps-ish on mouse):
  //   - trackpad pinch  -> zoom (wheel + ctrlKey/metaKey)
  //   - trackpad swipe  -> pan  (wheel, small/fractional/horizontal delta)
  //   - mouse wheel     -> zoom (focal at cursor)
  //   - shift + wheel   -> horizontal pan
  //   - left drag       -> pan  (handled by d3.zoom)
  //   - middle drag     -> pan  (custom pointer handler below)
  //   - dblclick        -> ignored
  const setupZoom = (svg, g, containerWidth, containerHeight) => {
    const node = svg.node();

    const zoom = d3.zoom()
      .scaleExtent([ZOOM_MIN, ZOOM_MAX])
      .translateExtent([
        [CIRCLE_CX - CANVAS_BACKDROP_RADIUS - 100, CIRCLE_CY - CANVAS_BACKDROP_RADIUS - 100],
        [CIRCLE_CX + CANVAS_BACKDROP_RADIUS + 100, CIRCLE_CY + CANVAS_BACKDROP_RADIUS + 100]
      ])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      })
      .filter((event) => {
        if (event.type === 'dblclick') return false;
        // Wheel is routed manually to support hybrid pan/zoom semantics.
        if (event.type === 'wheel') return false;
        // Allow left button (0) for normal pan; middle button (1) is handled separately.
        if (event.type === 'mousedown') return event.button === 0;
        return true;
      });

    // Fit the circular bounding box in the viewport
    const scaleX = containerWidth / VISUAL_SCENE_EXTENT;
    const scaleY = containerHeight / VISUAL_SCENE_EXTENT;
    const initialScale = Math.min(scaleX, scaleY);

    const initialTransform = d3.zoomIdentity
      .translate(containerWidth / 2, containerHeight / 2)
      .scale(initialScale)
      .translate(-CIRCLE_CX, -CIRCLE_CY);

    svg.call(zoom)
      .call(zoom.transform, initialTransform)
      .call(zoom.touchable(true));

    svg.style('cursor', 'grab')
      .on('mousedown.indicator', () => svg.style('cursor', 'grabbing'))
      .on('mouseup.indicator', () => svg.style('cursor', 'grab'));

    // Trackpad vs mouse-wheel classifier.
    // Pinch (real or synthetic ctrl/meta) is always zoom.
    // Otherwise, trackpad wheels arrive as pixel-mode events with small,
    // fractional, or horizontal deltas; mouse wheels arrive as larger,
    // integer, vertical-only deltas.
    const classifyWheel = (e) => {
      if (e.ctrlKey || e.metaKey) return 'zoom';
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      const fractional = !Number.isInteger(e.deltaY) || !Number.isInteger(e.deltaX);
      const isTrackpad = e.deltaMode === 0 && (absX > 0 || absY < 50 || fractional);
      return isTrackpad ? 'pan' : 'zoom';
    };

    const onWheel = (e) => {
      e.preventDefault();
      const sel = d3.select(node);
      const kind = classifyWheel(e);

      if (kind === 'zoom') {
        const [px, py] = d3.pointer(e, node);
        // Pinch (synthetic ctrl) feels right at higher sensitivity than a mouse wheel notch.
        const sensitivity = (e.ctrlKey || e.metaKey) ? 0.01 : 0.002;
        const factor = Math.exp(-e.deltaY * sensitivity);
        sel.call(zoom.scaleBy, factor, [px, py]);
        return;
      }

      // pan: convert screen-pixel delta to world units (divide by current scale k).
      const t = d3.zoomTransform(node);
      const dx = e.shiftKey ? -e.deltaY : -e.deltaX;
      const dy = e.shiftKey ? 0 : -e.deltaY;
      sel.call(zoom.translateBy, dx / t.k, dy / t.k);
    };
    node.addEventListener('wheel', onWheel, { passive: false });

    // Middle-mouse drag pan (kept separate from d3.zoom which only handles button 0).
    const onPointerDown = (e) => {
      if (e.button !== 1) return;
      e.preventDefault();
      try { node.setPointerCapture(e.pointerId); } catch (_) { /* not all targets support capture */ }

      let lastX = e.clientX;
      let lastY = e.clientY;
      svg.style('cursor', 'grabbing');

      const onMove = (m) => {
        const dx = m.clientX - lastX;
        const dy = m.clientY - lastY;
        lastX = m.clientX;
        lastY = m.clientY;
        const t = d3.zoomTransform(node);
        d3.select(node).call(zoom.translateBy, dx / t.k, dy / t.k);
      };
      const onUp = () => {
        node.removeEventListener('pointermove', onMove);
        node.removeEventListener('pointerup', onUp);
        node.removeEventListener('pointercancel', onUp);
        svg.style('cursor', 'grab');
      };
      node.addEventListener('pointermove', onMove);
      node.addEventListener('pointerup', onUp);
      node.addEventListener('pointercancel', onUp);
    };
    node.addEventListener('pointerdown', onPointerDown);

    // Suppress browser auto-scroll cursor / context menu on middle button.
    const onAuxClick = (e) => {
      if (e.button === 1) e.preventDefault();
    };
    node.addEventListener('auxclick', onAuxClick);

    const cleanup = () => {
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('auxclick', onAuxClick);
    };

    return { zoom, cleanup };
  };


  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current?.parentElement) {
        const svg = d3.select(svgRef.current);
        svg.attr('viewBox', `0 0 ${svgRef.current.parentElement.clientWidth} ${window.innerHeight * 0.7}`);

        if (zoomRef.current) {
          svg.select('g').attr('transform', d3.zoomTransform(svg.node()));
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Touch event handler
  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return undefined;

    const handleTouch = (e) => {
      if (e.touches?.length >= 2) e.preventDefault();
    };

    const options = { passive: false };
    svgElement.addEventListener('touchmove', handleTouch, options);
    svgElement.addEventListener('touchstart', handleTouch, options);

    return () => {
      svgElement.removeEventListener('touchmove', handleTouch);
      svgElement.removeEventListener('touchstart', handleTouch);
    };
  }, []);

  const miniSimRef = useRef(null);

  // Main visualization effect
  useEffect(() => {
    if (!svgRef.current || !data || !data.nodes || data.nodes.length === 0) return undefined;

    if (zoomCleanupRef.current) {
      zoomCleanupRef.current();
      zoomCleanupRef.current = null;
    }

    try {
      const containerWidth = svgRef.current.parentElement.clientWidth || 800;
      const containerHeight = window.innerHeight * 0.7 || 600;

      const width = containerWidth;
      const height = containerHeight;

      // Clear previous SVG content
      d3.select(svgRef.current).selectAll('*').remove();

      // Create SVG with responsive sizing
      const svg = d3.select(svgRef.current)
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

      const defs = svg.append('defs');
      defs.append('clipPath')
        .attr('id', 'viewport-circle-clip')
        .append('circle')
        .attr('cx', CIRCLE_CX)
        .attr('cy', CIRCLE_CY)
        .attr('r', CIRCLE_RADIUS);

      const R_grad = CANVAS_BACKDROP_RADIUS;
      const H = CANVAS_EDGE_FEATHER_HALF;
      const innerSpan = Math.max(CIRCLE_RADIUS - CANVAS_WHITE_OUTER_RADIUS, 1);
      const innerAt = t => CANVAS_WHITE_OUTER_RADIUS + innerSpan * t;
      const pctOfDist = dist => `${(Math.min(dist, R_grad) / R_grad) * 100}%`;

      const canvasEdgeGrad = defs.append('radialGradient')
        .attr('id', 'canvas-edge-soft')
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('cx', CIRCLE_CX)
        .attr('cy', CIRCLE_CY)
        .attr('fx', CIRCLE_CX)
        .attr('fy', CIRCLE_CY)
        .attr('r', R_grad);

      canvasEdgeGrad.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#fafbfc');
      canvasEdgeGrad.append('stop')
        .attr('offset', pctOfDist(CANVAS_WHITE_OUTER_RADIUS))
        .attr('stop-color', '#fafbfc');
      canvasEdgeGrad.append('stop')
        .attr('offset', pctOfDist(innerAt(0.18)))
        .attr('stop-color', '#eef0f4');
      canvasEdgeGrad.append('stop')
        .attr('offset', pctOfDist(innerAt(0.38)))
        .attr('stop-color', '#d4d7de');
      canvasEdgeGrad.append('stop')
        .attr('offset', pctOfDist(innerAt(0.58)))
        .attr('stop-color', '#a8adb8');
      canvasEdgeGrad.append('stop')
        .attr('offset', pctOfDist(innerAt(0.78)))
        .attr('stop-color', '#8b909b');
      canvasEdgeGrad.append('stop')
        .attr('offset', pctOfDist(CIRCLE_RADIUS))
        .attr('stop-color', '#6e737d');
      canvasEdgeGrad.append('stop')
        .attr('offset', pctOfDist(CIRCLE_RADIUS + H * 0.22))
        .attr('stop-color', '#4b4e56');
      canvasEdgeGrad.append('stop')
        .attr('offset', pctOfDist(CIRCLE_RADIUS + H * 0.44))
        .attr('stop-color', '#32343a');
      canvasEdgeGrad.append('stop')
        .attr('offset', pctOfDist(CIRCLE_RADIUS + H * 0.64))
        .attr('stop-color', '#1b1c20')
        .attr('stop-opacity', 0.82);
      canvasEdgeGrad.append('stop')
        .attr('offset', pctOfDist(CIRCLE_RADIUS + H * 0.84))
        .attr('stop-color', '#0a0a0b')
        .attr('stop-opacity', 0.42);
      canvasEdgeGrad.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#000000')
        .attr('stop-opacity', 0);
      defs.append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 1)
        .attr('refY', 0)
        .attr('markerWidth', 30)
        .attr('markerHeight', 30)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#808080');

      const borderGrad = defs.append('linearGradient')
        .attr('id', 'large-node-border-grad')
        .attr('gradientUnits', 'objectBoundingBox')
        .attr('x1', '0%')
        .attr('y1', '25%')
        .attr('x2', '100%')
        .attr('y2', '100%');

      borderGrad.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#94a3b8')
        .attr('stop-opacity', 0.38);
      borderGrad.append('stop')
        .attr('offset', '22%')
        .attr('stop-color', '#818cf8')
        .attr('stop-opacity', 0.28);
      borderGrad.append('stop')
        .attr('offset', '48%')
        .attr('stop-color', '#e0e7ff')
        .attr('stop-opacity', 0.58);
      borderGrad.append('stop')
        .attr('offset', '72%')
        .attr('stop-color', '#6366f1')
        .attr('stop-opacity', 0.68);
      borderGrad.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#4338ca')
        .attr('stop-opacity', 0.4);

      const ringFill = defs.append('radialGradient')
        .attr('id', 'large-node-ring-fill')
        .attr('gradientUnits', 'objectBoundingBox')
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');

      ringFill.append('stop')
        .attr('offset', '68%')
        .attr('stop-color', '#6366f1')
        .attr('stop-opacity', 0);
      ringFill.append('stop')
        .attr('offset', '84%')
        .attr('stop-color', '#a5b4fc')
        .attr('stop-opacity', 0.12);
      ringFill.append('stop')
        .attr('offset', '93%')
        .attr('stop-color', '#cbd5e1')
        .attr('stop-opacity', 0.16);
      ringFill.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#6366f1')
        .attr('stop-opacity', 0);

      // Create a group for the visualization (zoom target)
      const g = svg.append('g');

      g.append('g')
        .attr('class', 'canvas-backdrop')
        .attr('pointer-events', 'none')
        .append('circle')
        .attr('cx', CIRCLE_CX)
        .attr('cy', CIRCLE_CY)
        .attr('r', CANVAS_BACKDROP_RADIUS)
        .attr('fill', 'url(#canvas-edge-soft)');

      const world = g.append('g')
        .attr('clip-path', 'url(#viewport-circle-clip)')
        .attr('class', 'network-world');

      /* ──────────  GROUP‑AWARE LAYOUT (inside disk) ────────── */
      const groupMap = buildGroups(data.nodes, data.links);
      const groupCount = Math.max(...groupMap.values()) + 1;

      const groupSizes = Array.from({ length: groupCount }, () => 0);
      data.nodes.forEach(n => { groupSizes[groupMap.get(n.id)] += 1; });

      const BASE_R = 200;
      const PX_PER_NODE = 25;
      const groupR = groupSizes.map(s => BASE_R + PX_PER_NODE * Math.sqrt(s));

      const PAD = 700;
      const tries = 30;
      const centres = [];
      const rng = () => Math.random();

      const uniformPointInDisk = (maxDistFromCentre) => {
        const theta = rng() * 2 * Math.PI;
        const radius = Math.sqrt(rng()) * Math.max(0, maxDistFromCentre);
        return {
          x: CIRCLE_CX + radius * Math.cos(theta),
          y: CIRCLE_CY + radius * Math.sin(theta)
        };
      };

      for (let gi = 0; gi < groupCount; gi++) {
        let ok = false;
        let attempt = 0;
        let extended = groupR[gi] + PAD;

        while (!ok) {
          const maxCentreDist = Math.max(100, CIRCLE_RADIUS - extended);
          const cand = uniformPointInDisk(maxCentreDist);

          ok = centres.every((c, j) => {
            const dx = c.x - cand.x;
            const dy = c.y - cand.y;
            const minGap = groupR[j] + groupR[gi] + PAD;
            return dx * dx + dy * dy >= minGap * minGap;
          });

          if (!ok && ++attempt === tries) {
            attempt = 0;
            extended = Math.max(groupR[gi], extended - 100);
          }

          if (ok) centres[gi] = cand;
        }
      }

      data.nodes.forEach(n => {
        const gi = groupMap.get(n.id);
        const c = centres[gi];
        const θ = rng() * 2 * Math.PI;
        const r = rng() * Math.max(groupR[gi] - 40, 20);
        n.x = c.x + r * Math.cos(θ);
        n.y = c.y + r * Math.sin(θ);
      });

      const { zoom, cleanup: cleanupZoom } = setupZoom(svg, g, width, height);
      zoomRef.current = zoom;
      zoomCleanupRef.current = cleanupZoom;

      const linkForce = d3.forceLink(data.links)
        .id(d => d.id)
        .distance(400)
        .strength(1);

      const simulation = d3.forceSimulation(data.nodes)
        .force('link', linkForce)
        .force('collision', d3.forceCollide().radius(120))
        .alphaDecay(0.1) // controls cooldown speed
        .on('end', () => {
          simulation.stop(); // freeze after global layout settles
        });

      // Create links
      const linkGroup = world.append('g');

      data.links.forEach(ld => {
        // Full‐length link
        linkGroup.append('path')
          .datum(ld)
          .attr('class', 'link-full')
          .attr('fill', 'none')
          .attr('stroke', '#999')
          .attr('stroke-width', 3);
        // Short 1/3 link for arrow
        linkGroup.append('path')
          .datum(ld)
          .attr('class', 'link-arrow')
          .attr('fill', 'none')
          .attr('stroke', 'none')
          .attr('marker-end', 'url(#arrow)');
      });

      // Create nodes
      const node = world.append('g')
        .selectAll('.node')
        .data(data.nodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended));

      let currentHighlight = null;

      node.on('click', (event, d) => {
        const grp = groupMap.get(d.id);
        // toggle on/off
        currentHighlight = (currentHighlight === grp ? null : grp);

        // 1) highlight only that group’s nodes
        d3.selectAll('.node')
          .classed('highlight', n => groupMap.get(n.id) === currentHighlight)
          .classed('dim', n => currentHighlight != null && groupMap.get(n.id) !== currentHighlight);

        // 2) highlight only that group’s links/arrows
        d3.selectAll('.link-full, .link-arrow')
          .classed('highlight', l => {
            const s = groupMap.get(l.source.id ?? l.source);
            const t = groupMap.get(l.target.id ?? l.target);
            return s === currentHighlight && t === currentHighlight;
          })
          .classed('dim', l => {
            if (currentHighlight == null) return false;
            const s = groupMap.get(l.source.id ?? l.source);
            const t = groupMap.get(l.target.id ?? l.target);
            return !(s === currentHighlight && t === currentHighlight);
          });
      });

      // Create tooltip
      d3.select('body').selectAll('.tooltip').remove();
      const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0)
        .style('pointer-events', 'none');

      // Add node shapes and tooltips
      node.each(function (d) {
        const nodeGroup = d3.select(this);
        const nodePathInfo = createNodePath(d);

        // Add tooltip events
        nodeGroup
          .on('mouseover', (event) => {
            let html = `<h4>ID: ${d.id}</h4>`;
            html += `<p><strong>Major:</strong> ${d.cu_major}</p>`;

            tooltip
              .html(html)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 28) + 'px')
              .classed('visible', true)
              .transition()
              .duration(200)
              .style('opacity', 0.9)
              .style('transform', 'translateY(0)');
          })
          .on('mouseout', () => {
            tooltip.transition()
              .duration(300)
              .style('opacity', 0)
              .style('transform', 'translateY(10px)')
              .on('end', function () {
                tooltip.classed('visible', false);
              });
          });

        // Create node shapes (large-group accents first so wedges / face sit above)
        appendLargeGroupNodeAccent(nodeGroup, d, groupMap, groupSizes, largeGroupThreshold);

        if (nodePathInfo) {
          // Multiple segment node
          const items = nodePathInfo.items;
          const colorMap = colorMaps[colorBy];
          const anglePerItem = (2 * Math.PI) / items.length;

          items.forEach((item, i) => {
            const startAngle = i * anglePerItem;
            const endAngle = (i + 1) * anglePerItem;

            nodeGroup.append('path')
              .attr('d', d3.arc()
                .innerRadius(0)
                .outerRadius(NODE_RADIUS)
                .startAngle(startAngle)
                .endAngle(endAngle))
              .attr('fill', () => colorMap[item] || "#9e9e9e");
          });
        } else {
          // Single color node
          nodeGroup.append('circle')
            .attr('r', NODE_RADIUS)
            .attr('fill', getNodeColor(d))
            .attr('stroke', 'none');
        }


      });



      // Path calculation for links
      function linkPath(d) {
        if (!d || !d.source || !d.target) return "M0,0L0,0";
        if (typeof d.source.x === 'undefined' || typeof d.target.x === 'undefined') return "M0,0L0,0";

        const sourceRadius = NODE_RADIUS;
        const targetRadius = NODE_RADIUS;


        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) return "M0,0L0,0";

        const unitX = dx / dist;
        const unitY = dy / dist;

        const startX = d.source.x + (unitX * sourceRadius);
        const startY = d.source.y + (unitY * sourceRadius);
        const endX = d.target.x - (unitX * targetRadius);
        const endY = d.target.y - (unitY * targetRadius);

        return `M${startX},${startY}L${endX},${endY}`;
      }

      // Keep node centers inside the draggable inner disk
      simulation.on('tick', () => {
        clampNodesInPlace(data.nodes);

        svg.selectAll('.link-full').attr('d', d => linkPath(d));
        // Arrow paths at 1/3 from source → target
        svg.selectAll('.link-arrow').attr('d', d => {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const dist = Math.hypot(dx, dy);
          if (dist === 0) return 'M0,0L0,0';
          const ux = dx / dist, uy = dy / dist;
          // start just outside source circle
          const sx = d.source.x + ux * NODE_RADIUS, sy = d.source.y + uy * NODE_RADIUS;
          // end at 1/3 of the link
          const ex = d.source.x + dx * (1 / 3), ey = d.source.y + dy * (1 / 3);
          return `M${sx},${sy}L${ex},${ey}`;
        });

        // Update node positions
        node.attr('transform', d => `translate(${d.x},${d.y})`);
      });

      // Drag handlers
      function dragstarted(event, d) {
        const myGroup = groupMap.get(d.id);

        const groupNodes = data.nodes.filter(n => groupMap.get(n.id) === myGroup);
        const groupLinks = data.links.filter(l => {
          const s = groupMap.get(l.source.id ?? l.source);
          const t = groupMap.get(l.target.id ?? l.target);
          return s === myGroup && t === myGroup;
        });

        const miniSim = d3.forceSimulation(groupNodes)
          .force('link', d3.forceLink(groupLinks).id(n => n.id).distance(300).strength(1))
          .force('collision', d3.forceCollide().radius(80))
          .alphaDecay(0)
          .force('charge', d3.forceManyBody().strength(-1500))
          .on('tick', () => {
            clampNodesInPlace(groupNodes);

            d3.select(svgRef.current)
              .selectAll('.node')
              .filter(n => groupMap.get(n.id) === myGroup)
              .attr('transform', n => `translate(${n.x},${n.y})`);

            d3.select(svgRef.current)
              .selectAll('.link-full')
              .filter(l => {
                const s = groupMap.get(l.source.id ?? l.source);
                const t = groupMap.get(l.target.id ?? l.target);
                return s === myGroup && t === myGroup;
              })
              .attr('d', l => linkPath(l));

            d3.select(svgRef.current)
              .selectAll('.link-arrow')
              .filter(l => {
                const s = groupMap.get(l.source.id ?? l.source);
                const t = groupMap.get(l.target.id ?? l.target);
                return s === myGroup && t === myGroup;
              })
              .attr('d', l => {
                const dx = l.target.x - l.source.x;
                const dy = l.target.y - l.source.y;
                const dist = Math.hypot(dx, dy);
                if (dist === 0) return 'M0,0L0,0';
                const ux = dx / dist, uy = dy / dist;
                const sx = l.source.x + ux * NODE_RADIUS, sy = l.source.y + uy * NODE_RADIUS;
                const ex = l.source.x + dx * (1 / 3), ey = l.source.y + dy * (1 / 3);
                return `M${sx},${sy}L${ex},${ey}`;
              });
          });

        miniSimRef.current = miniSim;

        const p = clampNodeCenterToMovableDisk(d.x, d.y);
        d.fx = p.x;
        d.fy = p.y;
      }

      function dragged(event, d) {
        const c = clampNodeCenterToMovableDisk(event.x, event.y);
        d.fx = c.x;
        d.fy = c.y;
      }

      function dragended(event, d) {
        if (miniSimRef.current) {
          miniSimRef.current.stop();
          miniSimRef.current = null;
        }

        if (!('ontouchstart' in window) && !navigator.maxTouchPoints) {
          d.fx = null;
          d.fy = null;
        }
      }

    } catch (error) {
      console.error("Error rendering network visualization:", error);
    }

    return () => {
      if (zoomCleanupRef.current) {
        zoomCleanupRef.current();
        zoomCleanupRef.current = null;
      }
    };
    // Intentionally only `data`: full D3 scene graph is rebuilt when the dataset changes;
    // `colorBy` / `colorMaps` updates are handled by the recolor effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above
  }, [data]);


  // Lightweight recolor effect

  useEffect(() => {
    if (!svgRef.current || !colorMaps || !data?.nodes?.length) return;

    const groupMap = buildGroups(data.nodes, data.links ?? []);
    const vals = [...groupMap.values()];
    const groupCount = vals.length ? Math.max(...vals) + 1 : 0;
    const groupSizes = Array.from({ length: groupCount }, () => 0);
    data.nodes.forEach(n => { groupSizes[groupMap.get(n.id)] += 1; });

    const g = d3.select(svgRef.current).select('g');

    g.selectAll('.node').each(function (d) {
      const nodeGroup = d3.select(this);
      const nodePathInfo = createNodePath(d);

      nodeGroup.selectAll('path').remove();
      nodeGroup.selectAll('circle').remove();

      appendLargeGroupNodeAccent(nodeGroup, d, groupMap, groupSizes, largeGroupThreshold);

      if (nodePathInfo) {
        const items = nodePathInfo.items;
        const colorMap = colorMaps[colorBy];
        const anglePerItem = (2 * Math.PI) / items.length;

        items.forEach((item, i) => {
          const startAngle = i * anglePerItem;
          const endAngle = (i + 1) * anglePerItem;

          nodeGroup.append('path')
            .attr('d', d3.arc()
              .innerRadius(0)
              .outerRadius(NODE_RADIUS)
              .startAngle(startAngle)
              .endAngle(endAngle))
            .attr('fill', colorMap[item] || '#9e9e9e')
            .attr('data-slice', item);
        });
      } else {
        nodeGroup.append('circle')
          .attr('r', NODE_RADIUS)
          .attr('fill', getNodeColor(d))
          .attr('stroke', 'none')
          .attr('data-single', true);
      }

      nodeGroup.append('circle')
        .attr('class', 'node-hub')
        .attr('r', 6);
    });
  }, [colorBy, colorMaps, getNodeColor, createNodePath, data, largeGroupThreshold]);

  return (
    <div className="network-container">
      <div className="visualization-area">
        <svg ref={svgRef} className="network-graph"
          aria-label="Network graph visualization - draggable view"></svg>

        <div className="controls-legend-container">
          <ControlPanel colorBy={colorBy} setColorBy={setColorBy} nodes={data.nodes} />
          <Legend colorBy={colorBy} data={data} />
        </div>
      </div>
    </div>
  );
};

export default NetworkGraph;
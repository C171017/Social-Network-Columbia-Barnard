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


// Define zoom settings (split mobile vs desktop).
// Values below default to the existing behavior; tweak separately as needed.
const ZOOM_MIN_DESKTOP = 0.03;
const ZOOM_MAX_DESKTOP = 0.8;
const ZOOM_MIN_MOBILE = 0.01;
const ZOOM_MAX_MOBILE = 1;

// Multiplier applied to the computed "fit-to-viewport" initial zoom scale.
// (1 keeps current behavior; increase >1 to zoom in more initially on mobile/desktop.)
const INITIAL_ZOOM_MULTIPLIER_DESKTOP = 1.4;
const INITIAL_ZOOM_MULTIPLIER_MOBILE = 1.0;

const MOBILE_BREAKPOINT_PX = 768;
function isMobileViewport() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches;
}

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
  const controlsRef = useRef(null);
  const zoomRef = useRef(null);
  const zoomCleanupRef = useRef(null);
  const [colorMaps, setColorMaps] = useState({});
  const [darkSurface, setDarkSurface] = useState(false);

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
  const setupZoom = (svg, g, containerWidth, containerHeight, onTransformChange) => {
    const node = svg.node();

    const mobile = isMobileViewport();
    const ZOOM_MIN = mobile ? ZOOM_MIN_MOBILE : ZOOM_MIN_DESKTOP;
    const ZOOM_MAX = mobile ? ZOOM_MAX_MOBILE : ZOOM_MAX_DESKTOP;

    const zoom = d3.zoom()
      .scaleExtent([ZOOM_MIN, ZOOM_MAX])
      .translateExtent([
        [CIRCLE_CX - CANVAS_BACKDROP_RADIUS - 100, CIRCLE_CY - CANVAS_BACKDROP_RADIUS - 100],
        [CIRCLE_CX + CANVAS_BACKDROP_RADIUS + 100, CIRCLE_CY + CANVAS_BACKDROP_RADIUS + 100]
      ])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        onTransformChange?.(event.transform);
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
    const initialScaleBase = Math.min(scaleX, scaleY);
    const initialZoomMultiplier = mobile ? INITIAL_ZOOM_MULTIPLIER_MOBILE : INITIAL_ZOOM_MULTIPLIER_DESKTOP;
    const initialScale = initialScaleBase * initialZoomMultiplier;

    const initialTransform = d3.zoomIdentity
      .translate(containerWidth / 2, containerHeight / 2)
      .scale(initialScale)
      .translate(-CIRCLE_CX, -CIRCLE_CY);

    svg.call(zoom)
      .call(zoom.transform, initialTransform)
      .call(zoom.touchable(true));

    // Pan cursor: only force grabbing while actively panning the view (not on node drag).
    // Idle graph uses cursor: default from CSS; clear inline cursor when done so that applies again.
    const resetSvgPanCursor = () => {
      svg.style('cursor', null);
    };

    const clearGrabIfNoButtonHeld = (e) => {
      if (!e.buttons) resetSvgPanCursor();
    };

    const isViewPanCursorSurface = (event) => {
      const el = event.target;
      return Boolean(el && typeof el.closest === 'function' && !el.closest('.node'));
    };

    svg
      .on('mousedown.indicator', (event) => {
        if (event.button !== 0) return;
        if (!isViewPanCursorSurface(event)) return;
        svg.style('cursor', 'grabbing');
      })
      .on('mouseup.indicator', (event) => {
        if (event.button !== 0) return;
        resetSvgPanCursor();
      });

    window.addEventListener('pointerup', resetSvgPanCursor, true);
    window.addEventListener('pointercancel', resetSvgPanCursor, true);
    window.addEventListener('pointermove', clearGrabIfNoButtonHeld, true);

    const onWheel = (e) => {
      e.preventDefault();
      const sel = d3.select(node);
      const isPinchZoom = e.ctrlKey || e.metaKey;

      if (isPinchZoom) {
        const [px, py] = d3.pointer(e, node);
        const sensitivity = 0.01;
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
        svg.style('cursor', null);
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
      window.removeEventListener('pointerup', resetSvgPanCursor, true);
      window.removeEventListener('pointercancel', resetSvgPanCursor, true);
      window.removeEventListener('pointermove', clearGrabIfNoButtonHeld, true);
      svg.on('mousedown.indicator', null).on('mouseup.indicator', null);
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
      const pctOfDist = dist => `${(Math.min(dist, R_grad) / R_grad) * 100}%`;

      const canvasEdgeGrad = defs.append('radialGradient')
        .attr('id', 'canvas-edge-soft')
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('cx', CIRCLE_CX)
        .attr('cy', CIRCLE_CY)
        .attr('fx', CIRCLE_CX)
        .attr('fy', CIRCLE_CY)
        .attr('r', R_grad);

      // Smoother black→white backdrop ramp (avoid visible “banding” / seam).
      // We generate many stops between a slightly earlier transition start and the
      // outer radius, using easing + a dense color interpolation.
      const WHITE_EDGE = '#fafbfc';
      const transitionStartR = Math.max(0, CANVAS_WHITE_OUTER_RADIUS - H * 0.22);
      const fadeStartU = 0.94; // start fading to transparent only near the very edge
      const fadePow = 0.85; // lower = gentler fade curve
      const stopCount = 40; // denser stops => fewer chances of visible banding

      const colorInterp = d3.interpolateRgbBasis([
        '#fafbfc',
        '#eef0f4',
        '#d4d7de',
        '#a8adb8',
        '#8b909b',
        '#6e737d',
        '#4b4e56',
        '#32343a',
        '#1b1c20',
        '#0a0a0b',
        '#000000',
      ]);

      // Keep the early region flat/white so the inner disk feels crisp.
      canvasEdgeGrad.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', WHITE_EDGE)
        .attr('stop-opacity', 1);

      const smoothstep = (t) => t * t * (3 - 2 * t);

      for (let i = 0; i < stopCount; i++) {
        const u = i / (stopCount - 1); // 0..1 across (transitionStartR..R_grad)
        const r = transitionStartR + (R_grad - transitionStartR) * u;
        const offset = pctOfDist(r);
        const eased = smoothstep(u);

        // Fade only in the last ~6% of the radius; this preserves the “solid”
        // look before blending into the black page background.
        const opacity = u < fadeStartU
          ? 1
          : Math.pow((1 - u) / (1 - fadeStartU), fadePow);

        canvasEdgeGrad.append('stop')
          .attr('offset', offset)
          .attr('stop-color', colorInterp(eased))
          .attr('stop-opacity', opacity);
      }

      // Tiny blur to further hide any residual banding caused by rasterization.
      const backdropSoften = defs.append('filter')
        .attr('id', 'backdrop-soften')
        .attr('x', '-15%')
        .attr('y', '-15%')
        .attr('width', '130%')
        .attr('height', '130%');
      backdropSoften.append('feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('stdDeviation', 2.2);
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
        .attr('fill', 'url(#canvas-edge-soft)')
        .attr('filter', 'url(#backdrop-soften)');

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

      let currentTransform = d3.zoomIdentity;
      let visibleGroups = new Set();
      let lastUiIsDark = null;

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

      data.nodes.forEach((n) => {
        n.__groupIndex = groupMap.get(n.id);
      });
      data.links.forEach((l) => {
        l.__groupIndex = groupMap.get(l.source.id ?? l.source);
      });

      // Create links
      const linkGroup = world.append('g');
      const fullLinks = linkGroup.selectAll('.link-full')
        .data(data.links)
        .enter()
        .append('path')
        .attr('class', 'link-full')
        .attr('fill', 'none')
        .attr('stroke', '#999')
        .attr('stroke-width', 3);
      const arrowLinks = linkGroup.selectAll('.link-arrow')
        .data(data.links)
        .enter()
        .append('path')
        .attr('class', 'link-arrow')
        .attr('fill', 'none')
        .attr('stroke', 'none')
        .attr('marker-end', 'url(#arrow)');

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

      const updateUiSurfaceTheme = () => {
        const controlsEl = controlsRef.current;
        if (!controlsEl) return;

        const graphRect = svgRef.current.getBoundingClientRect();
        const panelRect = controlsEl.getBoundingClientRect();
        if (!graphRect.width || !graphRect.height) return;

        // Panel center in graph-local screen space.
        const sx = panelRect.left + panelRect.width / 2 - graphRect.left;
        const sy = panelRect.top + panelRect.height / 2 - graphRect.top;

        // Convert from screen -> world using the current zoom transform.
        const wx = (sx - currentTransform.x) / currentTransform.k;
        const wy = (sy - currentTransform.y) / currentTransform.k;
        const dist = Math.hypot(wx - CIRCLE_CX, wy - CIRCLE_CY);

        // Outside/near outer ring is visually dark; inner disk is bright.
        const uiIsDark = dist >= CANVAS_WHITE_OUTER_RADIUS * 1.02;
        if (uiIsDark !== lastUiIsDark) {
          lastUiIsDark = uiIsDark;
          setDarkSurface(uiIsDark);
        }
      };

      const applyGroupCulling = () => {
        const t = currentTransform;
        const margin = NODE_RADIUS + 20;
        const minX = (-t.x) / t.k - margin;
        const maxX = (width - t.x) / t.k + margin;
        const minY = (-t.y) / t.k - margin;
        const maxY = (height - t.y) / t.k + margin;

        const seen = Array.from({ length: groupCount }, () => false);
        let seenCount = 0;
        for (const n of data.nodes) {
          const gi = n.__groupIndex;
          if (seen[gi]) continue;
          if (n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY) {
            seen[gi] = true;
            seenCount += 1;
            if (seenCount === groupCount) break;
          }
        }

        const nextVisibleGroups = new Set();
        seen.forEach((v, i) => { if (v) nextVisibleGroups.add(i); });
        if (nextVisibleGroups.size === 0 && groupCount > 0) {
          nextVisibleGroups.add(0);
        }

        const changed =
          nextVisibleGroups.size !== visibleGroups.size
          || [...nextVisibleGroups].some(gi => !visibleGroups.has(gi));
        visibleGroups = nextVisibleGroups;
        if (!changed) return;

        node.classed('culled', d => !visibleGroups.has(d.__groupIndex));
        fullLinks.classed('culled', d => !visibleGroups.has(d.__groupIndex));
        arrowLinks.classed('culled', d => !visibleGroups.has(d.__groupIndex));

        // Freeze physics for offscreen groups and unfreeze when visible again.
        data.nodes.forEach((n) => {
          const isVisible = visibleGroups.has(n.__groupIndex);
          if (!isVisible) {
            if (!n.__culledFixed && n.fx == null && n.fy == null) {
              n.fx = n.x;
              n.fy = n.y;
              n.__culledFixed = true;
            }
          } else if (n.__culledFixed) {
            n.fx = null;
            n.fy = null;
            n.__culledFixed = false;
          }
        });

        simulation.alpha(0.12).restart();
        updateUiSurfaceTheme();
      };

      const { zoom, cleanup: cleanupZoom } = setupZoom(
        svg,
        g,
        width,
        height,
        (transform) => {
          currentTransform = transform;
          applyGroupCulling();
          updateUiSurfaceTheme();
        }
      );
      zoomRef.current = zoom;
      zoomCleanupRef.current = cleanupZoom;

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

        fullLinks
          .filter(d => visibleGroups.has(d.__groupIndex))
          .attr('d', d => linkPath(d));
        // Arrow paths at 1/3 from source → target
        arrowLinks
          .filter(d => visibleGroups.has(d.__groupIndex))
          .attr('d', d => {
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
        node
          .filter(d => visibleGroups.has(d.__groupIndex))
          .attr('transform', d => `translate(${d.x},${d.y})`);

        applyGroupCulling();
        updateUiSurfaceTheme();
      });

      updateUiSurfaceTheme();

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

        <div ref={controlsRef} className="controls-legend-container">
          <ControlPanel
            colorBy={colorBy}
            setColorBy={setColorBy}
            nodes={data.nodes}
            darkSurface={darkSurface}
          />
          <Legend colorBy={colorBy} data={data} darkSurface={darkSurface} />
        </div>
      </div>
    </div>
  );
};

export default NetworkGraph;
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import ControlPanel from './ControlPanel';
import './NetworkGraph.css';
import raw from '../data/network_data.json';

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


// Define zoom settings
const ZOOM_MIN = 0.01;
const ZOOM_MAX = 1;
const ZOOM_DEFAULT = 1;

// Fixed visualization area dimensions (regardless of screen size)
const FIXED_AREA_WIDTH = 25000;
const FIXED_AREA_HEIGHT = 25000;

// Standard color palette for dynamic generation
const COLOR_PALETTE = [
  '#4285f4', '#ea4335', '#fbbc05', '#34a853', '#673ab7', '#9C27B0', '#00ACC1',
  '#FF5722', '#795548', '#607D8B', '#3F51B5', '#009688', '#FFC107', '#8BC34A',
  '#E91E63', '#9E9E9E'
];

const NetworkGraph = ({ colorBy, setColorBy, data }) => {
  const svgRef = useRef();
  const [zoomLevel, setZoomLevel] = useState(ZOOM_DEFAULT);
  const zoomRef = useRef(null);
  const [colorMaps, setColorMaps] = useState({});

  // Load dynamic color mappings


  // Build one `colorMaps[key] = { value→color }` map for *all* keys in one pass
  useEffect(() => {
    const nodes = data.nodes;
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

  // Color schemes for different attributes
  const getNodeColor = (d) => {
    if (!colorMaps || !d || !colorBy) return '#9e9e9e';

    // use first item when the field contains a comma‑separated list
    const raw = d[colorBy];
    if (raw == null || raw === '') return '#9e9e9e';
    const firstVal = String(raw).split(',')[0].trim();

    // generic lookup (covers major, school, cu_party, whatever)
    if (colorMaps[colorBy] && colorMaps[colorBy][firstVal]) {
      return colorMaps[colorBy][firstVal];
    }

    // one special case that isn’t in the colour map
    if (colorBy === 'email-sequence') return '#5F6368';

    // fall‑back grey
    return '#9e9e9e';
  };

  // Create multi-part nodes for multiple items
  /**
   * Build slice information for ANY comma‑separated multivalue field.
   * Returns { items, colorMap } or null if single‑valued.
   */
  const createNodePath = (d) => {
    if (!d || !colorMaps || !colorBy) return null;

    const raw = d[colorBy];
    if (typeof raw !== 'string' || !raw.includes(',')) return null;

    const items = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (items.length <= 1) return null;

    return {
      items,
      colorMap: colorMaps[colorBy] || {}
    };
  };

  // Setup zoom behavior
  const setupZoom = (svg, g, containerWidth, containerHeight) => {
    const zoom = d3.zoom()
      .scaleExtent([ZOOM_MIN, ZOOM_MAX])
      .translateExtent([
        [-100, -100],
        [FIXED_AREA_WIDTH + 100, FIXED_AREA_HEIGHT + 100]
      ])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(Math.round(event.transform.k * 100) / 100);
      })
      .filter(event => event.type !== 'dblclick' && !event.ctrlKey);

    // Calculate initial scale to fit the fixed area in the container
    const scaleX = containerWidth / FIXED_AREA_WIDTH;
    const scaleY = containerHeight / FIXED_AREA_HEIGHT;
    const initialScale = Math.min(scaleX, scaleY) * 0.9; // 90% of the fit scale for some margin

    const initialTransform = d3.zoomIdentity
      .translate(containerWidth / 2, containerHeight / 2)
      .scale(initialScale)
      .translate(-FIXED_AREA_WIDTH / 2, -FIXED_AREA_HEIGHT / 2);

    svg.call(zoom)
      .call(zoom.transform, initialTransform)
      .call(zoom.touchable(true));

    svg.style('cursor', 'grab')
      .on('mousedown.indicator', () => svg.style('cursor', 'grabbing'))
      .on('mouseup.indicator', () => svg.style('cursor', 'grab'));

    return zoom;
  };

  // Handle zoom buttons
  const handleZoom = (newZoom, duration = 300) => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      const currentTransform = d3.zoomTransform(svg.node());

      const transform = newZoom === null
        ? d3.zoomIdentity
        : d3.zoomIdentity
          .translate(currentTransform.x, currentTransform.y)
          .scale(newZoom);

      svg.transition().duration(duration).call(zoomRef.current.transform, transform);
    }
  };

  const handleZoomIn = () => {
    if (zoomLevel < ZOOM_MAX) {
      handleZoom(Math.min(zoomLevel + 0.25, ZOOM_MAX));
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > ZOOM_MIN) {
      handleZoom(Math.max(zoomLevel - 0.25, ZOOM_MIN));
    }
  };

  const handleResetView = () => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      const containerWidth = svgRef.current.parentElement.clientWidth;
      const containerHeight = window.innerHeight * 0.7;

      // Calculate scale to fit the fixed area in the container
      const scaleX = containerWidth / FIXED_AREA_WIDTH;
      const scaleY = containerHeight / FIXED_AREA_HEIGHT;
      const optimalScale = Math.min(scaleX, scaleY) * 0.9; // 90% of the fit scale

      const transform = d3.zoomIdentity
        .translate(containerWidth / 2, containerHeight / 2)
        .scale(optimalScale)
        .translate(-FIXED_AREA_WIDTH / 2, -FIXED_AREA_HEIGHT / 2);

      svg.transition()
        .duration(500)
        .call(zoomRef.current.transform, transform)
        .on('end', () => svg.style('cursor', 'grab'));
    }
  };

  // Window resize handler
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
    const handleTouch = (e) => {
      if (e.touches?.length >= 2) e.preventDefault();
    };

    const options = { passive: false };
    document.addEventListener('touchmove', handleTouch, options);
    document.addEventListener('touchstart', handleTouch, options);

    return () => {
      document.removeEventListener('touchmove', handleTouch);
      document.removeEventListener('touchstart', handleTouch);
    };
  }, []);

  // Main visualization effect
  useEffect(() => {
    if (!svgRef.current || !data || !data.nodes || data.nodes.length === 0) return;

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

      // Create a group for the visualization
      const g = svg.append('g');

      // Add white background layer - now uses fixed dimensions
      g.append('rect')
        .attr('width', FIXED_AREA_WIDTH)
        .attr('height', FIXED_AREA_HEIGHT)
        .attr('x', 0)
        .attr('y', 0)
        .attr('rx', 10)
        .attr('fill', 'white')
        .attr('pointer-events', 'none');

      // Set up zoom
      const zoom = setupZoom(svg, g, width, height);
      zoomRef.current = zoom;

      // Add a single universal arrow marker
      const defs = svg.append("defs");
      defs.append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 1)
        .attr("refY", 0)
        .attr("markerWidth", 40)
        .attr("markerHeight", 40)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#808080");

      // ➊ define linkForce with initial strength = 1
      const linkForce = d3.forceLink(data.links)
        .id(d => d.id)
        .distance(400)
        .strength(1);

      const simulation = d3.forceSimulation(data.nodes)
        .force('link', linkForce)
        .force('collision', d3.forceCollide().radius(100));
      // .force('charge', d3.forceManyBody().strength(-80));
      // .force('center', d3.forceCenter(FIXED_AREA_WIDTH / 2, FIXED_AREA_HEIGHT / 2).strength(0.00))

      // Create links
      const linkGroup = g.append('g');

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
      const node = g.append('g')
        .selectAll('.node')
        .data(data.nodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended));

      // Create tooltip
      d3.select('body').selectAll('.tooltip').remove();
      const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);

      // Add node shapes and tooltips
      node.each(function (d) {
        const nodeGroup = d3.select(this);
        const nodePathInfo = createNodePath(d);

        // Add tooltip events
        nodeGroup
          .on('mouseover', (event) => {
            let html = `<h4>ID: ${d.id}</h4>`;
            html += `<p><strong>Major:</strong> ${d.major}</p>`;
            html += `<p><strong>School:</strong> ${d.school}</p>`;
            html += `<p><strong>Year:</strong> ${d.year}</p>`;
            html += `<p><strong>Language(s):</strong> ${d.language}</p>`;
            html += `<p><strong>CU Friends:</strong> ${d.cu_friends}</p>`;
            html += `<p><strong>Group:</strong> ${d.group}</p>`;

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

        // Create node shapes
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
                .outerRadius(30)
                .startAngle(startAngle)
                .endAngle(endAngle))
              .attr('fill', () => colorMap[item] || "#9e9e9e");
          });
        } else {
          // Single color node
          nodeGroup.append('circle')
            .attr('r', 30)
            .attr('fill', getNodeColor(d))
            .attr('stroke', 'none');
        }

        // // Add labels
        // if (d.id === 'target2' || d.id === 'target1') {
        //   nodeGroup.append('text')
        //     .attr('text-anchor', 'middle')
        //     .attr('dy', '0.35em')
        //     .attr('font-family', 'Arial')
        //     .attr('font-size', d.id === 'target1' ? '16px' : '14px')
        //     .text(d.id);
        // } else {
        //   // Center dot
        //   nodeGroup.append('circle')
        //     .attr('r', 6);

        //   // Group indicator
        //   nodeGroup.append('text')
        //     .attr('text-anchor', 'middle')
        //     .attr('dy', '0.7em')
        //     .attr('font-family', 'Arial')
        //     .attr('font-size', '20px')
        //     .text(`G${d.group}`);
        // }
      });

      // Path calculation for links
      function linkPath(d) {
        if (!d || !d.source || !d.target) return "M0,0L0,0";
        if (typeof d.source.x === 'undefined' || typeof d.target.x === 'undefined') return "M0,0L0,0";

        const sourceRadius = 30;
        const targetRadius = 30;


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

      // Update positions during simulation
      simulation.on('tick', () => {
        // Apply boundary constraints to fixed area
        node.each(d => {
          const nodeRadius = 30;
          const margin = nodeRadius + 5;

          // Constrain nodes to stay within the fixed area dimensions
          d.x = Math.max(margin, Math.min(FIXED_AREA_WIDTH - margin, d.x));
          d.y = Math.max(margin, Math.min(FIXED_AREA_HEIGHT - margin, d.y));
        });

        // Full‐length links
        svg.selectAll('.link-full').attr('d', d => linkPath(d));
        // Arrow paths at 1/3 from source → target
        svg.selectAll('.link-arrow').attr('d', d => {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const dist = Math.hypot(dx, dy);
          if (dist === 0) return 'M0,0L0,0';
          const ux = dx / dist, uy = dy / dist;
          // start just outside source circle
          const sx = d.source.x + ux * 30, sy = d.source.y + uy * 30;
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
        linkForce.strength(link => {
          const s = groupMap.get(link.source.id ?? link.source);
          const t = groupMap.get(link.target.id ?? link.target);
          return (s === myGroup && t === myGroup) ? 1 : 0;
        });
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      }

      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragended(event, d) {
        simulation.alphaTarget(0);
        linkForce.strength(1);
        if (!('ontouchstart' in window) && !navigator.maxTouchPoints) {
          d.fx = null; d.fy = null;
        }
      }

      /* ──────────  GROUP‑AWARE RESPAWN  v2  ────────── */
      const groupMap = buildGroups(data.nodes, data.links);
      const groupCount = Math.max(...groupMap.values()) + 1;

      /* 1️  how many nodes in each group? */
      const groupSizes = Array.from({ length: groupCount }, () => 0);
      data.nodes.forEach(n => { groupSizes[groupMap.get(n.id)] += 1; });

      /* 2️  radius per group */
      const BASE_R = 200;   // px, smallest bubble
      const PX_PER_NODE = 25;    // px extra per √node
      const groupR = groupSizes.map(s => BASE_R + PX_PER_NODE * Math.sqrt(s));

      /* 3️  Poisson‑disk style placement of centres */
      const PAD = 700;
      const tries = 30;
      const centres = [];
      const rng = () => Math.random();

      for (let g = 0; g < groupCount; g++) {
        let ok = false, attempt = 0, rad = groupR[g] + PAD;

        while (!ok) {
          const cand = {
            x: rad + rng() * (FIXED_AREA_WIDTH - 2 * rad),
            y: rad + rng() * (FIXED_AREA_HEIGHT - 2 * rad)
          };

          ok = centres.every((c, j) => {
            const dx = c.x - cand.x;
            const dy = c.y - cand.y;
            const minGap = groupR[j] + groupR[g] + PAD;
            return dx * dx + dy * dy >= minGap * minGap;
          });

          if (!ok && ++attempt === tries) {
            attempt = 0;
            rad = Math.max(groupR[g], rad - 100);
          }
          if (ok) centres[g] = cand;
        }
      }

      /* 4️  scatter individual nodes inside their bubble */
      data.nodes.forEach(n => {
        const g = groupMap.get(n.id);
        const c = centres[g];

        const θ = rng() * 2 * Math.PI;
        const r = rng() * (groupR[g] - 40);
        n.x = c.x + r * Math.cos(θ);
        n.y = c.y + r * Math.sin(θ);
      });

    } catch (error) {
      console.error("Error rendering network visualization:", error);
    }
  }, [data]);


  // Lightweight recolor effect

  useEffect(() => {
    if (!svgRef.current || !colorMaps) return;

    const g = d3.select(svgRef.current).select('g');

    // remove any old slice paths or circles inside each nodeGroup
    g.selectAll('.node').each(function (d) {
      const nodeGroup = d3.select(this);
      nodeGroup.selectAll('path, circle').remove();   // keep the <g> & its transform

      // --- redraw according to current colorBy ---
      const nodePathInfo = createNodePath(d);  // your existing helper

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
              .outerRadius(30)
              .startAngle(startAngle)
              .endAngle(endAngle))
            .attr('fill', colorMap[item] || '#9e9e9e');
        });
      } else {
        // single‑color circle
        nodeGroup.append('circle')
          .attr('r', 30)
          .attr('fill', getNodeColor(d))
          .attr('stroke', 'none');
      }

      // 👉 removed the text/labels earlier, so no need to add them again
      nodeGroup.append('circle').attr('r', 6);  // center dot
    });
  }, [colorBy, colorMaps]);

  const preventAndCall = (handler) => (e) => {
    e.preventDefault();
    handler();
  };

  return (
    <div className="network-container">
      <ControlPanel colorBy={colorBy} setColorBy={setColorBy} />
      <div className="visualization-area">
        <svg ref={svgRef} className="network-graph"
          aria-label="Network graph visualization - draggable view"></svg>
      </div>
    </div>
  );
};

export default NetworkGraph;
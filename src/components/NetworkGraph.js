import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import ControlPanel from './ControlPanel';
import './NetworkGraph.css';

// Define zoom settings
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 1;
const ZOOM_DEFAULT = 1;

// Fixed visualization area dimensions (regardless of screen size)
const FIXED_AREA_WIDTH = 1600;
const FIXED_AREA_HEIGHT = 1200;

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
  useEffect(() => {
    const generateDynamicColorMaps = async () => {
      try {
        let uniqueMajors = [];
        let uniqueLanguages = [];
        let uniqueYears = [];

        try {
          const majorData = await import('../data/unique_majors.json').catch(() => ({ default: [] }));
          const languageData = await import('../data/unique_languages.json').catch(() => ({ default: [] }));
          const yearData = await import('../data/unique_years.json').catch(() => ({ default: [] }));

          uniqueMajors = majorData.default || [];
          uniqueLanguages = languageData.default || [];
          uniqueYears = yearData.default || [];
        } catch (error) {
          console.warn('Dynamic data files not found');
        }

        // Generate color maps
        const newColorMaps = {};

        // Majors color map
        if (uniqueMajors.length > 0) {
          newColorMaps.major = {};
          uniqueMajors.forEach((major, index) => {
            newColorMaps.major[major] = COLOR_PALETTE[index % COLOR_PALETTE.length];
          });
        }

        // Languages color map
        if (uniqueLanguages.length > 0) {
          newColorMaps.language = {};
          uniqueLanguages.forEach((language, index) => {
            newColorMaps.language[language] = COLOR_PALETTE[index % COLOR_PALETTE.length];
          });
        }

        // Years color map
        if (uniqueYears.length > 0) {
          newColorMaps.year = {};
          uniqueYears.forEach((year, index) => {
            newColorMaps.year[year] = COLOR_PALETTE[index % COLOR_PALETTE.length];
          });
        }

        // Schools color map (static)
        newColorMaps.school = {
          "SEAS": "#4285f4",
          "CC": "#ea4335",
          "Barnard": "#34a853",
          "GS": "#673ab7",
          "Unknown": "#9e9e9e"
        };

        setColorMaps(newColorMaps);
      } catch (error) {
        console.error('Error generating color maps:', error);
      }
    };

    generateDynamicColorMaps();
  }, []);

  // Color schemes for different attributes
  const getNodeColor = (d) => {
    if (!colorMaps || !d) return "#9e9e9e";

    switch (colorBy) {
      case 'email-sequence':
        return '#5F6368';

      case 'major':
        if (!d.major || !colorMaps.major) return "#9e9e9e";
        const firstMajor = d.major.split(',')[0].trim();
        return colorMaps.major[firstMajor] || "#9e9e9e";

      case 'school':
        if (!colorMaps.school) return "#9e9e9e";
        return colorMaps.school[d.school] || "#9e9e9e";

      case 'year':
        if (!colorMaps.year) return "#9e9e9e";
        return colorMaps.year[d.year] || "#9e9e9e";

      case 'language':
        if (!d.language || !colorMaps.language) return "#9e9e9e";
        const languages = d.language.split(',').map(lang => lang.trim());

        for (const language of languages) {
          if (colorMaps.language[language]) {
            return colorMaps.language[language];
          }
        }
        return "#9e9e9e";

      default:
        return "#9e9e9e";
    }
  };

  // Create multi-part nodes for multiple items
  const createNodePath = (d) => {
    if (!d || !colorMaps) return null;

    const createSegmentedNode = (items, colorMap) => {
      if (items.length === 0) return null;

      const anglePerItem = (2 * Math.PI) / items.length;
      let pathData = '';

      items.forEach((item, i) => {
        const startAngle = i * anglePerItem;
        const endAngle = (i + 1) * anglePerItem;

        const start = {
          x: 30 * Math.sin(startAngle),
          y: -30 * Math.cos(startAngle)
        };

        const end = {
          x: 30 * Math.sin(endAngle),
          y: -30 * Math.cos(endAngle)
        };

        const largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1;

        if (i === 0) {
          pathData = `M 0 0 L ${start.x} ${start.y}`;
        }

        pathData += ` A 30 30 0 ${largeArcFlag} 1 ${end.x} ${end.y} L 0 0`;
      });

      return { pathData, items, colorMap };
    };

    if (colorBy === 'language' && d.language && d.language.includes(',')) {
      const languages = d.language.split(',').map(lang => lang.trim())
        .filter(lang => lang !== "English");

      return createSegmentedNode(languages, colorMaps.language);
    }
    else if (colorBy === 'major' && d.major && d.major.includes(',')) {
      const majors = d.major.split(',').map(maj => maj.trim());
      return createSegmentedNode(majors, colorMaps.major);
    }

    return null;
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

      // Add arrow markers
      const defs = svg.append("defs");

      // First type (red)
      defs.append("marker")
        .attr("id", "arrow-first")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 60)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#FF0000");

      // Second type (orange)
      defs.append("marker")
        .attr("id", "arrow-second")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 60)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#FF7F00");

      // Third type (yellow)
      defs.append("marker")
        .attr("id", "arrow-third")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 60)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#FFD700");

      // Fourth type (green)
      defs.append("marker")
        .attr("id", "arrow-fourth")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 60)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#00FF00");

      // Fifth type (blue)
      defs.append("marker")
        .attr("id", "arrow-fifth")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 60)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#0000FF");

      // Sixth type (indigo)
      defs.append("marker")
        .attr("id", "arrow-sixth")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 60)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#4B0082");

      // Seventh type (violet)
      defs.append("marker")
        .attr("id", "arrow-seventh")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 60)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#9400D3");

      // Default marker for any other types
      defs.append("marker")
        .attr("id", "arrow-default")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 60)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#808080"); // Gray for any link type beyond seventh


      // Set up the simulation - using fixed center coordinates
      const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.links)
          .id(d => d.id)
          .distance(250))
        .force('charge', d3.forceManyBody().strength(-50))
        .force('center', d3.forceCenter(FIXED_AREA_WIDTH / 2, FIXED_AREA_HEIGHT / 2).strength(0.00))
        .force('collision', d3.forceCollide().radius(40));

      // Create links
      const linkGroup = g.append('g');

      data.links.forEach(linkData => {
        try {
          // Determine link color based on type using rainbow colors
          let linkColor = '#808080';  // Default gray
          if (linkData.type === 'first') linkColor = '#FF0000';    // Red
          if (linkData.type === 'second') linkColor = '#FF7F00';   // Orange
          if (linkData.type === 'third') linkColor = '#FFD700';    // Yellow
          if (linkData.type === 'fourth') linkColor = '#00FF00';   // Green
          if (linkData.type === 'fifth') linkColor = '#0000FF';    // Blue
          if (linkData.type === 'sixth') linkColor = '#4B0082';    // Indigo
          if (linkData.type === 'seventh') linkColor = '#9400D3';  // Violet
      
          // Determine arrow marker
          let arrowMarker = '';
          if (linkData.type === 'first') arrowMarker = 'url(#arrow-first)';
          if (linkData.type === 'second') arrowMarker = 'url(#arrow-second)';
          if (linkData.type === 'third') arrowMarker = 'url(#arrow-third)';
          if (linkData.type === 'fourth') arrowMarker = 'url(#arrow-fourth)';
          if (linkData.type === 'fifth') arrowMarker = 'url(#arrow-fifth)';
          if (linkData.type === 'sixth') arrowMarker = 'url(#arrow-sixth)';
          if (linkData.type === 'seventh') arrowMarker = 'url(#arrow-seventh)';
          if (!arrowMarker && linkData.type && linkData.type !== 'direct') {
            arrowMarker = 'url(#arrow-default)';  // Use default for any other types
          }
      
          // Create line with arrow
          linkGroup.append('path')
            .datum(linkData)
            .attr('fill', 'none')
            .attr('stroke', linkColor)
            .attr('stroke-width', 3)
            .attr('stroke-dasharray', linkData.type === 'direct' ? '8,8' : null)
            .attr('class', 'link-line')
            .attr('marker-end', arrowMarker);
        } catch (error) {
          console.error("Error processing link:", error);
        }
      });

      const link = linkGroup.selectAll('.link-line');

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
        if (nodePathInfo && (colorBy === 'major' || colorBy === 'language')) {
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
            .attr('r', d.id === 'target2' || d.id === 'target1' ? 35 : 30)
            .attr('fill', getNodeColor(d))
            .attr('stroke', d.id === 'target2' ? '#FF3D00' : (d.id === 'target1' ? '#4285F4' : 'none'))
            .attr('stroke-width', d.id === 'target2' || d.id === 'target1' ? 3 : 0);
        }

        // Add labels
        if (d.id === 'target2' || d.id === 'target1') {
          nodeGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('font-family', 'Arial')
            .attr('font-size', d.id === 'target1' ? '16px' : '14px')
            .text(d.id);
        } else {
          // Center dot
          nodeGroup.append('circle')
            .attr('r', 6);

          // Group indicator
          nodeGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.7em')
            .attr('font-family', 'Arial')
            .attr('font-size', '20px')
            .text(`G${d.group}`);
        }
      });

      // Path calculation for links
      function linkPath(d) {
        if (!d || !d.source || !d.target) return "M0,0L0,0";
        if (typeof d.source.x === 'undefined' || typeof d.target.x === 'undefined') return "M0,0L0,0";

        const sourceRadius = d.source.id === 'target2' || d.source.id === 'target1' ? 35 : 30;
        const targetRadius = d.target.id === 'target2' || d.target.id === 'target1' ? 35 : 30;

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
          const nodeRadius = (d.id === 'target2' || d.id === 'target1') ? 35 : 30;
          const margin = nodeRadius + 5;

          // Constrain nodes to stay within the fixed area dimensions
          d.x = Math.max(margin, Math.min(FIXED_AREA_WIDTH - margin, d.x));
          d.y = Math.max(margin, Math.min(FIXED_AREA_HEIGHT - margin, d.y));
        });

        // Update link paths
        link.attr('d', function (d) {
          try {
            return linkPath(d);
          } catch (error) {
            console.error("Error updating link path:", error);
            return "M0,0L0,0";
          }
        });

        // Update node positions
        node.attr('transform', d => `translate(${d.x},${d.y})`);
      });

      // Drag handlers
      function dragstarted(event, d) {
        if (event.sourceEvent) {
          event.sourceEvent.stopPropagation();
          event.sourceEvent.preventDefault();
        }

        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        if (!isTouchDevice()) {
          d.fx = null;
          d.fy = null;
        }
      }

      function isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      }

      // Initial node positioning within the fixed area
      data.nodes.forEach(node => {
        if (node.id === 'target2') {
          node.x = FIXED_AREA_WIDTH * 0.9;  // Top right corner
          node.y = FIXED_AREA_HEIGHT * 0.1;
          node.fx = node.x;
          node.fy = node.y;
        } else if (node.id === 'target1') {
          node.x = FIXED_AREA_WIDTH * 0.1;  // Bottom left corner
          node.y = FIXED_AREA_HEIGHT * 0.9;
          node.fx = node.x;
          node.fy = node.y;
        } else {
          const distance = Math.random();
          const angle = Math.random() * 2 * Math.PI;
          const radius = Math.pow(distance, 0.8) * Math.min(FIXED_AREA_WIDTH, FIXED_AREA_HEIGHT) * 0.4;
          node.x = FIXED_AREA_WIDTH / 2 + radius * Math.cos(angle);
          node.y = FIXED_AREA_HEIGHT / 2 + radius * Math.sin(angle);
        }
      });

      // Release fixed positions after initial layout
      setTimeout(() => {
        data.nodes.forEach(node => {
          if (node.id === 'target1' || node.id === 'target2') {
            node.fx = null;
            node.fy = null;
          }
        });
        simulation.alpha(0.3).restart();
      }, 2000);

    } catch (error) {
      console.error("Error rendering network visualization:", error);
    }
  }, [colorBy, data, colorMaps]);

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

      <div className="zoom-controls">
        <button className="zoom-button" onClick={handleZoomIn} aria-label="Zoom in"
          onTouchStart={preventAndCall(handleZoomIn)}>+</button>
        <div className="zoom-level">{Math.round(zoomLevel * 100)}%</div>
        <button className="zoom-button" onClick={handleZoomOut} aria-label="Zoom out"
          onTouchStart={preventAndCall(handleZoomOut)}>−</button>
        <button className="reset-view-button" onClick={handleResetView} aria-label="Reset view"
          onTouchStart={preventAndCall(handleResetView)}>⟳</button>
      </div>
    </div>
  );
};

export default NetworkGraph;
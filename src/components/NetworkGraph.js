import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import ControlPanel from './ControlPanel';
import './NetworkGraph.css';

// Define zoom settings
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 1;
const ZOOM_DEFAULT = 1;

// Boundary settings - absolute padding in pixels around the visible area
const BOUNDARY_PADDING_X = 300; // Horizontal padding
const BOUNDARY_PADDING_Y = 200; // Vertical padding

// Standard color palette for dynamic generation
const COLOR_PALETTE = [
  '#4285f4', '#ea4335', '#fbbc05', '#34a853', '#673ab7', '#9C27B0', '#00ACC1',
  '#FF5722', '#795548', '#607D8B', '#3F51B5', '#009688', '#FFC107', '#8BC34A',
  '#E91E63', '#9E9E9E'
];

// Default color definitions
const DEFAULT_COLOR_MAPS = {
  major: {
    "Mechanical Engineering": "#4285f4",
    "Creative Writing": "#ea4335",
    "Biomedical Engineering": "#fbbc05",
    "Psychology": "#34a853",
    "Human Rights": "#673ab7",
    "Comparative Literature & Society": "#9C27B0",
    "Computer Science": "#00ACC1",
    "Unknown": "#9e9e9e"
  },
  school: {
    "SEAS": "#4285f4",
    "CC": "#ea4335",
    "Barnard": "#34a853",
    "Unknown": "#9e9e9e"
  },
  year: {
    "2025": "#673ab7",
    "2026": "#4285f4",
    "2027": "#ea4335",
    "Unknown": "#9e9e9e"
  },
  language: {
    "French": "#4285f4",
    "Spanish": "#ea4335",
    "Mandarin": "#fbbc05",
    "Greek": "#673ab7",
    "English": "#34a853",
    "Unknown": "#9e9e9e"
  }
};

const NetworkGraph = ({ colorBy, setColorBy, data }) => {
  const svgRef = useRef();
  const [zoomLevel, setZoomLevel] = useState(ZOOM_DEFAULT);
  const zoomRef = useRef(null);
  const [colorMaps, setColorMaps] = useState(DEFAULT_COLOR_MAPS);

  // Load dynamic color mappings based on data
  useEffect(() => {
    const generateDynamicColorMaps = async () => {
      try {
        // Try to load pre-generated color maps
        let uniqueMajors = [];
        let uniqueLanguages = [];

        try {
          const majorData = await import('../data/unique_majors.json').catch(() => ({ default: [] }));
          const languageData = await import('../data/unique_languages.json').catch(() => ({ default: [] }));

          uniqueMajors = majorData.default || [];
          uniqueLanguages = languageData.default || [];
        } catch (error) {
          console.warn('Dynamic data files not found, generating from network data');
        }

        // If no pre-generated data, extract from network data
        if (uniqueMajors.length === 0 && data?.nodes) {
          const majors = new Set();
          data.nodes.forEach(node => {
            if (node.major && node.major !== 'Unknown') {
              node.major.split(',').forEach(major => {
                majors.add(major.trim());
              });
            }
          });
          uniqueMajors = Array.from(majors);
        }

        if (uniqueLanguages.length === 0 && data?.nodes) {
          const languages = new Set();
          data.nodes.forEach(node => {
            if (node.language && node.language !== 'Unknown') {
              node.language.split(',').forEach(lang => {
                languages.add(lang.trim());
              });
            }
          });
          uniqueLanguages = Array.from(languages);
        }

        // Generate color maps
        if (uniqueMajors.length > 0) {
          const majorMap = { ...DEFAULT_COLOR_MAPS.major };
          uniqueMajors.forEach((major, index) => {
            if (!majorMap[major]) {
              majorMap[major] = COLOR_PALETTE[index % COLOR_PALETTE.length];
            }
          });

          setColorMaps(prev => ({
            ...prev,
            major: majorMap
          }));
        }

        if (uniqueLanguages.length > 0) {
          const languageMap = { ...DEFAULT_COLOR_MAPS.language };
          uniqueLanguages.forEach((language, index) => {
            if (!languageMap[language]) {
              languageMap[language] = COLOR_PALETTE[index % COLOR_PALETTE.length];
            }
          });

          setColorMaps(prev => ({
            ...prev,
            language: languageMap
          }));
        }
      } catch (error) {
        console.error('Error generating dynamic color maps:', error);
      }
    };

    generateDynamicColorMaps();
  }, [data]);

  // Color schemes for different attributes
  const colorSchemes = {
    'email-sequence': () => '#5F6368',
    'major': (d) => {
      if (!d.major) return "#9e9e9e";

      // If multiple majors, use the first one for simple coloring
      const firstMajor = d.major.split(',')[0].trim();
      return colorMaps.major[firstMajor] || "#9e9e9e";
    },
    'school': (d) => colorMaps.school[d.school] || "#9e9e9e",
    'year': (d) => colorMaps.year[d.year] || "#9e9e9e",
    'language': (d) => {
      const languages = d.language ? d.language.split(',').map(lang => lang.trim()) : [];

      // Try to find the first language with a defined color
      for (const language of languages) {
        if (colorMaps.language[language]) {
          return colorMaps.language[language];
        }
      }

      // Fallback to original priority-based logic
      if (languages.some(lang => lang.includes("French"))) return colorMaps.language["French"];
      if (languages.some(lang => lang.includes("Spanish"))) return colorMaps.language["Spanish"];
      if (languages.some(lang => lang.includes("Mandarin") || lang.includes("Chinese")))
        return colorMaps.language["Mandarin"];
      if (languages.some(lang => lang.includes("Greek"))) return colorMaps.language["Greek"];
      if (languages.some(lang => lang === "English")) return colorMaps.language["English"];

      return "#9e9e9e";
    }
  };

  // Create multi-part nodes for multiple items (majors or languages)
  const createNodePath = (d) => {
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
      const languages = d.language.split(',').map(lang => lang.trim());

      // Filter and normalize languages
      const uniqueLanguages = [...new Set(
        languages
          .filter(lang => lang !== "English")
          .map(lang => {
            if (lang.includes("Chinese") || lang.includes("Mandarin")) return "Mandarin";
            return lang;
          })
      )];

      return createSegmentedNode(uniqueLanguages, colorMaps.language);

    } else if (colorBy === 'major' && d.major && d.major.includes(',')) {
      const majors = d.major.split(',').map(maj => maj.trim());
      const uniqueMajors = [...new Set(majors)];

      return createSegmentedNode(uniqueMajors, colorMaps.major);
    }

    return null;
  };

  // Set up zoom and drag behavior
  const setupZoom = (svg, g, width, height) => {
    const zoom = d3.zoom()
      .scaleExtent([ZOOM_MIN, ZOOM_MAX])
      .translateExtent([
        // Allow panning to reach the boundary area with extra space for dragging
        [-BOUNDARY_PADDING_X * 1.5, -BOUNDARY_PADDING_Y * 1.5],
        [width + BOUNDARY_PADDING_X * 1.5, height + BOUNDARY_PADDING_Y * 1.5]
      ])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(Math.round(event.transform.k * 100) / 100);
      })
      // Allow all mouse buttons for dragging (don't filter out main button)
      .filter(event => event.type !== 'dblclick' && !event.ctrlKey);

    // Initialize with centered view at default zoom level
    const initialTransform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(0.7)
      .translate(-width / 2, -height / 2);

    svg.call(zoom)
      .call(zoom.transform, initialTransform)
      .call(zoom.touchable(true));

    // Add visual indicator that view is draggable
    svg.style('cursor', 'grab')
      .on('mousedown.indicator', () => svg.style('cursor', 'grabbing'))
      .on('mouseup.indicator', () => svg.style('cursor', 'grab'));

    return zoom;
  };

  // Handle zoom transformations
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
    // Reset view with default zoom and centered position
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      const width = svgRef.current.parentElement.clientWidth;
      const height = window.innerHeight * 0.7;

      // Create a transform that centers the view with default zoom
      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(0.7)
        .translate(-width / 2, -height / 2);

      // Smooth transition to reset view
      svg.transition()
        .duration(500)
        .call(zoomRef.current.transform, transform)
        .on('end', () => svg.style('cursor', 'grab')); // Reset cursor after animation
    }
  };

  // Add window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current?.parentElement) {
        const svg = d3.select(svgRef.current);
        svg.attr('viewBox', `0 0 ${svgRef.current.parentElement.clientWidth} ${window.innerHeight * 0.7}`);

        // Preserve zoom state
        if (zoomRef.current) {
          svg.select('g').attr('transform', d3.zoomTransform(svg.node()));
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set up touch event handling for proper pinch zoom
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



  // Set up and update the visualization
  useEffect(() => {
    if (!svgRef.current) return;

    // Error boundary for visualization
    try {
      // Get container dimensions for responsive sizing
      const containerWidth = svgRef.current.parentElement.clientWidth || 800;
      const containerHeight = window.innerHeight * 0.7 || 600; // 70% of viewport height

      const width = containerWidth;
      const height = containerHeight;

      // Clear previous SVG content
      d3.select(svgRef.current).selectAll('*').remove();

      // Use provided data or fall back to sample data
      const initialData = data && data.nodes && data.nodes.length > 0 ? data : {
        nodes: [
          { id: "4101", major: "Mechanical Engineering", school: "SEAS", year: "2027", language: "English", group: 1 },
          { id: "3344", major: "Creative Writing", school: "CC", year: "2027", language: "English, Greek, Spanish", group: 1 },
          { id: "6679", major: "Unknown", school: "Unknown", year: "Unknown", language: "Unknown", group: 1 },
          { id: "2103", major: "Biomedical Engineering", school: "SEAS", year: "2027", language: "English", group: 1 },
          { id: "3574", major: "Unknown", school: "Unknown", year: "Unknown", language: "Unknown", group: 1 },
          { id: "2204", major: "Psychology", school: "Barnard", year: "2027", language: "English, French, Mandarin", group: 2 },
          { id: "target2", major: "Human Rights,Comparative Literature & Society", school: "CC", year: "2026", language: "French, English, Spanish, Mandarin", group: 2 },
          { id: "target1", major: "Computer Science", school: "SEAS", year: "2025", language: "English, Mandarin", group: 1 }
        ],
        links: [
          { source: "4101", target: "6679", type: "first" },
          { source: "4101", target: "2103", type: "first" },
          { source: "3344", target: "4101", type: "first" },
          { source: "3344", target: "2103", type: "first" },
          { source: "2103", target: "3574", type: "second" },
          { source: "2204", target: "target2", type: "direct" },
        ]
      };

      // Create SVG with responsive sizing
      const svg = d3.select(svgRef.current)
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

      // Create a group for the entire visualization that will be transformed during zoom
      const g = svg.append('g');
      // Add white middle layer as the second element in the group (middle layer)
      g.append('rect')
      .attr('width', width + BOUNDARY_PADDING_X * 2)
      .attr('height', height + BOUNDARY_PADDING_Y * 2)
      .attr('x', -BOUNDARY_PADDING_X)
      .attr('y', -BOUNDARY_PADDING_Y)
        .attr('rx', 10)
        .attr('fill', 'white')
        .attr('pointer-events', 'none');

      // Set up zoom and pan functionality

      const zoom = setupZoom(svg, g, width, height);
      // Store zoom reference for use in button handlers
      zoomRef.current = zoom;

      // Add arrow markers for different link types
      const defs = svg.append("defs");

      // Add arrow marker for first type links (red)
      defs.append("marker")
        .attr("id", "arrow-first")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 60)  // Adjust to prevent overlap with node
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#FF0000");

      // Add arrow marker for second type links (orange)
      defs.append("marker")
        .attr("id", "arrow-second")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 60)  // Adjust to prevent overlap with node
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#FF7F00");

      // Add arrow marker for direct type links (black)
      defs.append("marker")
        .attr("id", "arrow-direct")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 60)  // Adjust to prevent overlap with node
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#000000");



      // Set up the simulation with standard physics
      const simulation = d3.forceSimulation(initialData.nodes)
        // Link force with standard distance
        .force('link', d3.forceLink(initialData.links)
          .id(d => d.id)
          .distance(250)) // Further increased distance to allow more spread

        // Charge force - increased repulsion between nodes
        .force('charge', d3.forceManyBody().strength(-600))

        // Center force - pulls nodes toward the center, but much weaker
        .force('center', d3.forceCenter(width / 2, height / 2).strength(0.03))

        // Simple collision detection with larger radius
        .force('collision', d3.forceCollide().radius(60));

      // Create container for links
      const linkGroup = g.append('g');

      // Process the links (always create one line per link with arrow)
      initialData.links.forEach(linkData => {
        try {
          // Determine link color based on type
          let linkColor = '#999';  // Default gray
          if (linkData.type === 'first') linkColor = '#FF0000';  // Red
          if (linkData.type === 'second') linkColor = '#FF7F00';  // Orange
          if (linkData.type === 'direct') linkColor = '#000000';  // Black

          // Determine arrow marker based on type
          let arrowMarker = '';
          if (linkData.type === 'first') arrowMarker = 'url(#arrow-first)';
          if (linkData.type === 'second') arrowMarker = 'url(#arrow-second)';
          if (linkData.type === 'direct') arrowMarker = 'url(#arrow-direct)';

          // Create a single line with arrow marker for all connections
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

      // Select all link lines for updates
      const link = linkGroup.selectAll('.link-line');



      // Create nodes
      const node = g.append('g')
        .selectAll('.node')
        .data(initialData.nodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended));



      // Create tooltip div for node information
      // First, remove any existing tooltip to prevent duplicates
      d3.select('body').selectAll('.tooltip').remove();

      const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);

      // Add node circles or complex shapes
      node.each(function (d) {
        const nodeGroup = d3.select(this);
        const nodePathInfo = createNodePath(d);

        // Add mouseover/mouseout events to show tooltips
        nodeGroup
          .on('mouseover', (event) => {
            // Create tooltip content based on node data
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

        if (nodePathInfo && (colorBy === 'major' || colorBy === 'language')) {
          // If multiple items, create pie sections
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
            .attr('fill', colorSchemes[colorBy](d))
            .attr('stroke', d.id === 'target2' ? '#FF3D00' : (d.id === 'target1' ? '#4285F4' : 'none'))
            .attr('stroke-width', d.id === 'target2' || d.id === 'target1' ? 3 : 0);
        }

        // Replace text label with circle dot identifier
        if (d.id === 'target2') {
          // For Target2 node
          nodeGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('font-family', 'Arial')
            .attr('font-size', '14px')
            .text('Target2');

        } else if (d.id === 'target1') {
          // For Target1 node
          nodeGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('font-family', 'Arial')
            .attr('font-size', '16px')
            .text('Target1');

        } else {
          // For regular nodes, add small center dot
          nodeGroup.append('circle')
            .attr('r', 6);  // Size of the dot

          // Add group indicator
          nodeGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.7em')
            .attr('font-family', 'Arial')
            .attr('font-size', '20px')
            .text(`G${d.group}`);
        }
      });

      // Path calculation for links - simplified to always draw a single line
      function linkPath(d) {
        // Safety check for undefined source or target
        if (!d || !d.source || !d.target) return "M0,0L0,0";

        // Make sure coordinates exist
        if (typeof d.source.x === 'undefined' || typeof d.target.x === 'undefined') return "M0,0L0,0";

        // Get appropriate node radii
        const sourceRadius = d.source.id === 'target2' || d.source.id === 'target1' ? 35 : 30;
        const targetRadius = d.target.id === 'target2' || d.target.id === 'target1' ? 35 : 30;

        // Calculate the direction vector
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Guard against zero distance
        if (dist === 0) return "M0,0L0,0";

        // Calculate unit vectors
        const unitX = dx / dist;
        const unitY = dy / dist;

        // Calculate start and end points adjusted by node radius
        const startX = d.source.x + (unitX * sourceRadius);
        const startY = d.source.y + (unitY * sourceRadius);
        const endX = d.target.x - (unitX * targetRadius);
        const endY = d.target.y - (unitY * targetRadius);

        // Return a single line path
        return `M${startX},${startY}L${endX},${endY}`;
      }

      // Update positions during simulation
      simulation.on('tick', () => {
        // Apply boundary constraints with fixed padding regardless of zoom level
        node.each(d => {
          // Get the appropriate node radius
          const nodeRadius = (d.id === 'target2' || d.id === 'target1') ? 35 : 30;

          // Use fixed boundary padding regardless of zoom
          // Add a small extra margin based on node radius to prevent nodes from being cut off
          const margin = nodeRadius + 5;

          // Constrain x position: center area +/- padding
          d.x = Math.max(-BOUNDARY_PADDING_X + margin, Math.min(width + BOUNDARY_PADDING_X - margin, d.x));

          // Constrain y position: center area +/- padding
          d.y = Math.max(-BOUNDARY_PADDING_Y + margin, Math.min(height + BOUNDARY_PADDING_Y - margin, d.y));
        });

        // Update all link lines with appropriate paths - simplified since only one link type exists
        link.attr('d', function (d) {
          try {
            return linkPath(d);
          } catch (error) {
            console.error("Error updating link path:", error);
            return "M0,0L0,0"; // Return empty path on error
          }
        });

        node.attr('transform', d => `translate(${d.x},${d.y})`);
      });

      // Standard drag functions
      function dragstarted(event, d) {
        // Don't trigger zoom when dragging nodes
        if (event.sourceEvent) {
          event.sourceEvent.stopPropagation();
          event.sourceEvent.preventDefault(); // Prevent default touch actions
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
        // Keep the node fixed if dragged on mobile for better UX
        if (!isTouchDevice()) {
          d.fx = null;
          d.fy = null;
        }
      }

      // Utility function to detect touch devices
      function isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      }

      // Place nodes in a way that centers the visualization
      initialData.nodes.forEach(node => {
        if (node.id === 'target2') {
          // Place target2 in the top right 
          node.x = width + BOUNDARY_PADDING_X * 0.3;
          node.y = -BOUNDARY_PADDING_Y * 0.3;
          // Fix position initially
          node.fx = node.x;
          node.fy = node.y;
        } else if (node.id === 'target1') {
          // Place target1 in the bottom left
          node.x = -BOUNDARY_PADDING_X * 0.3;
          node.y = height + BOUNDARY_PADDING_Y * 0.3;
          // Fix position initially
          node.fx = node.x;
          node.fy = node.y;
        } else {
          // Place other nodes within visible area first, then gradually expand outward
          // This helps keep the visualization more centered around the white middle layer
          const distance = Math.random(); // 0 to 1
          const angle = Math.random() * 2 * Math.PI; // 0 to 2π

          // Calculate position using polar coordinates centered on the middle of the screen
          // Nodes are distributed in a circle pattern, with higher density toward the center
          const radius = Math.pow(distance, 0.8) * Math.min(width, height) * 0.9;
          node.x = width / 2 + radius * Math.cos(angle);
          node.y = height / 2 + radius * Math.sin(angle);
        }
      });

      // Release fixed positions after initial layout
      setTimeout(() => {
        initialData.nodes.forEach(node => {
          if (node.id === 'target1' || node.id === 'target2') {
            node.fx = null;
            node.fy = null;
          }
        });
        simulation.alpha(0.3).restart(); // Higher alpha value for more movement
      }, 2000);
    } catch (error) {
      console.error("Error rendering network visualization:", error);
    }
  }, [colorBy, data]); // Re-render when colorBy or data changes


  const preventAndCall = (handler) => (e) => {
    e.preventDefault();
    handler();
  };

  return (
    <div className="network-container">
      <ControlPanel colorBy={colorBy} setColorBy={setColorBy} />

      {/* Network visualization area */}
      <div className="visualization-area">
        <svg ref={svgRef} className="network-graph"
          aria-label="Network graph visualization - draggable view"></svg>
      </div>

      {/* Zoom and drag controls */}
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
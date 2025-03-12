import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import ControlPanel from './ControlPanel';
import './NetworkGraph.css';

// Define zoom settings
const ZOOM_MIN = 0.5; // Maximum zoom out - shows the full working area
const ZOOM_MAX = 5;   // Maximum zoom in
const ZOOM_DEFAULT = 1; // Starting zoom level

const NetworkGraph = ({ colorBy, setColorBy, data }) => {
  const svgRef = useRef();
  const [zoomLevel, setZoomLevel] = useState(ZOOM_DEFAULT);
  // Store zoom reference to access it from buttons
  const zoomRef = useRef(null);
  
  // Color schemes for different attributes
  const colorSchemes = {
    'email-sequence': () => '#5F6368',
    'major': (d) => {
      const majorColors = {
        "Mechanical Engineering": "#4285f4",
        "Creative Writing": "#ea4335",
        "Biomedical Engineering": "#fbbc05",
        "Psychology": "#34a853",
        "Human Rights": "#673ab7",
        "Comparative Literature & Society": "#9C27B0",
        "Computer Science": "#00ACC1",
        "Unknown": "#9e9e9e"
      };
      return majorColors[d.major] || "#9e9e9e";
    },
    'school': (d) => {
      const schoolColors = {
        "SEAS": "#4285f4",
        "CC": "#ea4335",
        "Barnard": "#34a853",
        "Unknown": "#9e9e9e"
      };
      return schoolColors[d.school] || "#9e9e9e";
    },
    'year': (d) => {
      const yearColors = {
        "2025": "#673ab7",
        "2026": "#4285f4",
        "2027": "#ea4335",
        "Unknown": "#9e9e9e"
      };
      return yearColors[d.year] || "#9e9e9e";
    },
    'language': (d) => {
        const languages = d.language ? d.language.split(',').map(lang => lang.trim()) : [];
    
        // Check languages in the specific order from the legend
        if (languages.some(lang => lang.includes("French"))) return "#4285f4";
        if (languages.some(lang => lang.includes("Spanish"))) return "#ea4335";
        if (languages.some(lang => lang.includes("Mandarin") || lang.includes("Chinese"))) return "#fbbc05";
        if (languages.some(lang => lang.includes("Greek"))) return "#673ab7";
        if (languages.some(lang => lang === "English")) return "#34a853";
        return "#9e9e9e";
    }
  };
  
  // Create multi-part nodes for multiple items (majors or languages)
  const createNodePath = (d) => {
    if (colorBy === 'language' && d.language && d.language.includes(',')) {
      // Split and trim languages
      const languages = d.language.split(',').map(lang => lang.trim());
      
      // Prioritize specific languages in order
      const languageColors = {
        "French": "#4285f4",
        "Spanish": "#ea4335", 
        "Mandarin": "#fbbc05",
        "Greek": "#673ab7"
      };
      
      // Filter out English and consolidate Chinese variants
      const filteredLanguages = languages
        .filter(lang => lang !== "English")
        .map(lang => {
          if (lang.includes("Chinese") || lang.includes("Mandarin")) {
            return "Mandarin";
          }
          return lang;
        });
      
      // Remove duplicates while preserving order of first appearance
      const uniqueLanguages = [];
      filteredLanguages.forEach(lang => {
        if (!uniqueLanguages.includes(lang)) {
          uniqueLanguages.push(lang);
        }
      });
      
      // If no non-English languages, return null
      if (uniqueLanguages.length === 0) {
        return null;
      }
      
      const anglePerLanguage = (2 * Math.PI) / uniqueLanguages.length;
      
      let pathData = '';
      uniqueLanguages.forEach((language, i) => {
        const startAngle = i * anglePerLanguage;
        const endAngle = (i + 1) * anglePerLanguage;
        
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
      
      return { 
        pathData, 
        items: uniqueLanguages,
        colorMap: languageColors 
      };
    } else if (colorBy === 'major' && d.major && d.major.includes(',')) {
      // Split and trim majors
      const majors = d.major.split(',').map(maj => maj.trim());
      
      // Major colors from the color scheme
      const majorColors = {
        "Mechanical Engineering": "#4285f4",
        "Creative Writing": "#ea4335",
        "Biomedical Engineering": "#fbbc05",
        "Psychology": "#34a853",
        "Human Rights": "#673ab7",
        "Comparative Literature & Society": "#2979FF",
        "Computer Science": "#00ACC1"
      };
      
      // Remove duplicates while preserving order of first appearance
      const uniqueMajors = [];
      majors.forEach(major => {
        if (!uniqueMajors.includes(major)) {
          uniqueMajors.push(major);
        }
      });
      
      // If no majors, return null
      if (uniqueMajors.length === 0) {
        return null;
      }
      
      const anglePerMajor = (2 * Math.PI) / uniqueMajors.length;
      
      let pathData = '';
      uniqueMajors.forEach((major, i) => {
        const startAngle = i * anglePerMajor;
        const endAngle = (i + 1) * anglePerMajor;
        
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
      
      return { 
        pathData, 
        items: uniqueMajors,
        colorMap: majorColors 
      };
    }
    
    return null;
  };

  // Set up zoom behavior
  const setupZoom = (svg, g) => {
    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([ZOOM_MIN, ZOOM_MAX])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(Math.round(event.transform.k * 100) / 100);
      })
      .filter(event => {
        // Allow wheel events, touches, and clicks (but not dblclicks)
        return event.type !== 'dblclick' && 
               !event.ctrlKey && !event.button;
      });
    
    // Apply zoom to SVG with initial transform - start slightly zoomed out
    svg.call(zoom)
       .call(zoom.transform, d3.zoomIdentity.scale(0.7));
    
    // Make sure touch events work properly
    svg.call(zoom.touchable(true));
    
    
    // Return zoom function for external controls
    return zoom;
  };
  
  // Handle zoom buttons
  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current && zoomLevel < ZOOM_MAX) {
      const svg = d3.select(svgRef.current);
      const newZoom = Math.min(zoomLevel + 0.25, ZOOM_MAX);
      
      // Get current translation
      const currentTransform = d3.zoomTransform(svg.node());
      const newTransform = d3.zoomIdentity
        .translate(currentTransform.x, currentTransform.y)
        .scale(newZoom);
      
      svg.transition().duration(300).call(zoomRef.current.transform, newTransform);
    }
  };
  
  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current && zoomLevel > ZOOM_MIN) {
      const svg = d3.select(svgRef.current);
      const newZoom = Math.max(zoomLevel - 0.25, ZOOM_MIN);
      
      // Get current translation
      const currentTransform = d3.zoomTransform(svg.node());
      const newTransform = d3.zoomIdentity
        .translate(currentTransform.x, currentTransform.y)
        .scale(newZoom);
      
      svg.transition().duration(300).call(zoomRef.current.transform, newTransform);
    }
  };
  
  const handleResetView = () => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      
      // Smoothly animate to identity transform
      svg.transition().duration(500)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };
  
  // Add window resize handler
  useEffect(() => {
    const handleResize = () => {
      // Redraw the network when window is resized
      if (svgRef.current && svgRef.current.parentElement) {
        const newWidth = svgRef.current.parentElement.clientWidth;
        const newHeight = window.innerHeight * 0.7;
        
        const svg = d3.select(svgRef.current);
        svg.attr('viewBox', `0 0 ${newWidth} ${newHeight}`);
          
        // Preserve zoom state through resize
        if (zoomRef.current) {
          const currentTransform = d3.zoomTransform(svg.node());
          svg.select('g').attr('transform', currentTransform);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Set up touch event handling for proper pinch zoom
  useEffect(() => {
    // Add event listener to prevent default touch actions for pinch gestures
    const handleTouch = (e) => {
      // Only prevent default for multi-touch gestures (like pinch zoom)
      if (e.touches && e.touches.length >= 2) {
        e.preventDefault();
      }
    };
    
    // Add the event listener with passive: false to allow preventDefault
    document.addEventListener('touchmove', handleTouch, { passive: false });
    document.addEventListener('touchstart', handleTouch, { passive: false });
    
    // Clean up
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
          {id: "4101", major: "Mechanical Engineering", school: "SEAS", year: "2027", language: "English", group: 1},
          {id: "3344", major: "Creative Writing", school: "CC", year: "2027", language: "English, Greek, Spanish", group: 1},
          {id: "6679", major: "Unknown", school: "Unknown", year: "Unknown", language: "Unknown", group: 1},
          {id: "2103", major: "Biomedical Engineering", school: "SEAS", year: "2027", language: "English", group: 1},
          {id: "3574", major: "Unknown", school: "Unknown", year: "Unknown", language: "Unknown", group: 1},
          {id: "2204", major: "Psychology", school: "Barnard", year: "2027", language: "English, French, Mandarin", group: 2},
          {id: "target2", major: "Human Rights,Comparative Literature & Society", school: "CC", year: "2026", language: "French, English, Spanish, Mandarin", group: 2},
          {id: "target1", major: "Computer Science", school: "SEAS", year: "2025", language: "English, Mandarin", group: 1}
        ],
        links: [
          {source: "4101", target: "6679", type: "first"},
          {source: "4101", target: "2103", type: "first"},
          {source: "3344", target: "4101", type: "first"},
          {source: "3344", target: "2103", type: "first"},
          {source: "2103", target: "3574", type: "second"},
          {source: "2204", target: "target2", type: "direct"},
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
      
      // Set up zoom and pan functionality
      const zoom = setupZoom(svg, g);
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
      
      // Process the links to create double lines for group 2
      initialData.links.forEach(linkData => {
        try {
          // Get source and target nodes safely
          let sourceNode, targetNode;
          
          if (typeof linkData.source === 'object' && linkData.source !== null) {
            sourceNode = initialData.nodes.find(node => node.id === linkData.source.id);
          } else if (typeof linkData.source === 'string') {
            sourceNode = initialData.nodes.find(node => node.id === linkData.source);
          }
          
          if (typeof linkData.target === 'object' && linkData.target !== null) {
            targetNode = initialData.nodes.find(node => node.id === linkData.target.id);
          } else if (typeof linkData.target === 'string') {
            targetNode = initialData.nodes.find(node => node.id === linkData.target);
          }
          
          if (!sourceNode || !targetNode) return;
        
          // Check if either node is in group 2
          const isGroup2Connection = sourceNode.group === 2 || targetNode.group === 2;
          
          // Determine link color
          let linkColor = '#999';  // Default gray
          if (linkData.type === 'first') linkColor = '#FF0000';  // Red
          if (linkData.type === 'second') linkColor = '#FF7F00';  // Orange
          if (linkData.type === 'direct') linkColor = '#000000';  // Black
        
          // Determine arrow marker
          let arrowMarker = '';
          if (linkData.type === 'first') arrowMarker = 'url(#arrow-first)';
          if (linkData.type === 'second') arrowMarker = 'url(#arrow-second)';
          if (linkData.type === 'direct') arrowMarker = 'url(#arrow-direct)';
        
          if (isGroup2Connection && linkData.type !== 'direct') {
            // Create two clearly separated parallel lines for group 2 connections
            
            // Line 1 (top line)
            linkGroup.append('path')
              .datum(linkData)
              .attr('fill', 'none')
              .attr('stroke', linkColor)
              .attr('stroke-width', 3) // Thicker line
              .attr('class', 'link-line line1')
              .attr('marker-end', arrowMarker);
            
            // Line 2 (bottom line)
            linkGroup.append('path')
              .datum(linkData)
              .attr('fill', 'none')
              .attr('stroke', linkColor)
              .attr('stroke-width', 3) // Thicker line
              .attr('class', 'link-line line2');
          } else {
            // Create single line for other connections
            linkGroup.append('path')
              .datum(linkData)
              .attr('fill', 'none')
              .attr('stroke', linkColor)
              .attr('stroke-width', 3)
              .attr('stroke-dasharray', linkData.type === 'direct' ? '8,8' : null)
              .attr('class', 'link-line')
              .attr('marker-end', arrowMarker);
          }
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
      node.each(function(d) {
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
              .on('end', function() {
                tooltip.classed('visible', false);
              });
          });
        
        if (nodePathInfo && (colorBy === 'major' || colorBy === 'language')) {
          // If multiple items, create pie sections
          const items = nodePathInfo.items;
          const colorMap = colorBy === 'major' ? {
            "Mechanical Engineering": "#4285f4",
            "Creative Writing": "#ea4335",
            "Biomedical Engineering": "#fbbc05",
            "Psychology": "#34a853",
            "Human Rights": "#673ab7",
            "Comparative Literature & Society": "#9C27B0",
            "Computer Science": "#00ACC1",
            "Unknown": "#9e9e9e"
          } : {
            "French": "#4285f4",
            "Spanish": "#ea4335",
            "Mandarin": "#fbbc05",
            "Greek": "#673ab7",
            "Unknown": "#9e9e9e"
          };
          
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
          // For the target node, still use the "Target" text
          nodeGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            // .attr('fill', 'white')
            .attr('font-family', 'Arial')
            .attr('font-size', '14px')
            .text('Target2');
        
        } else if (d.id === 'target1') {
          // For Target1 node, add "Target1" text
          nodeGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            // .attr('fill', 'white')
            .attr('font-family', 'Arial')
            .attr('font-size', '16px')
            .text('Target1');
            
          
        } else {
          // For regular nodes, add a small white circle dot
          nodeGroup.append('circle')
            .attr('r', 6)  // Size of the dot
            // .attr('fill', 'white');  // White dot
            
          // Add small group indicator
          nodeGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.7em')
            // .attr('fill', 'white')
            .attr('font-family', 'Arial')
            .attr('font-size', '20px')
            .text(`G${d.group}`);
        }
      });
      
      // Path calculation for links
      function linkPath(d, lineType) {
        // Safety check for undefined source or target
        if (!d || !d.source || !d.target) return "M0,0L0,0";
        
        // Make sure coordinates exist
        if (typeof d.source.x === 'undefined' || typeof d.target.x === 'undefined') return "M0,0L0,0";

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
        
        // Calculate perpendicular vector (normalized)
        const perpX = -unitY;
        const perpY = unitX;
        
        // Offset for parallel lines - much larger offset for visibility
        const offset = 6;
        
        // Calculate start and end points adjusted by node radius
        const startX = d.source.x + (unitX * sourceRadius);
        const startY = d.source.y + (unitY * sourceRadius);
        const endX = d.target.x - (unitX * targetRadius);
        const endY = d.target.y - (unitY * targetRadius);
        
        // For group 2 connections, offset the lines
        let sourceNode, targetNode;
        
        try {
          // Safe extraction of source node
          if (typeof d.source === 'object' && d.source !== null) {
            sourceNode = initialData.nodes.find(node => node.id === d.source.id);
          } else if (typeof d.source === 'string') {
            sourceNode = initialData.nodes.find(node => node.id === d.source);
          }
          
          // Safe extraction of target node
          if (typeof d.target === 'object' && d.target !== null) {
            targetNode = initialData.nodes.find(node => node.id === d.target.id);
          } else if (typeof d.target === 'string') {
            targetNode = initialData.nodes.find(node => node.id === d.target);
          }
        } catch (e) {
          // Log error but don't break the app
          console.error("Error processing source/target nodes:", e);
        }
        
        if (sourceNode && targetNode && (sourceNode.group === 2 || targetNode.group === 2) && 
            lineType !== undefined) {
          
          // Apply offset based on line type
          if (lineType === 'line1') {
            // First line - offset above
            return `M${startX + perpX * offset},${startY + perpY * offset}L${endX + perpX * offset},${endY + perpY * offset}`;
          } else if (lineType === 'line2') {
            // Second line - offset below
            return `M${startX - perpX * offset},${startY - perpY * offset}L${endX - perpX * offset},${endY - perpY * offset}`;
          }
        }
        
        // Default single line
        return `M${startX},${startY}L${endX},${endY}`;
      }
      
      // Update positions during simulation
      simulation.on('tick', () => {
        // Apply boundary constraints to keep nodes within the viewable area
        // but with more space to place and move nodes (using 120% of the available area)
        node.each(d => {
          // Get the appropriate node radius
          const nodeRadius = (d.id === 'target2' || d.id === 'target1') ? 35 : 30;
          
          // At ZOOM_MIN (0.5), the visible area is 2x larger than the default view
          // So we set the boundary to match what's visible at maximum zoom out
          
          // Scale factor is the inverse of ZOOM_MIN (2 = 1/0.5)
          const scaleFactor = 1 / ZOOM_MIN;
          
          // Visible width/height at max zoom out
          const visibleWidth = width * scaleFactor;
          const visibleHeight = height * scaleFactor;
          
          // Calculate how much padding we need on each side
          const paddingX = (visibleWidth - width) / 2;
          const paddingY = (visibleHeight - height) / 2;
          
          // Don't constrain positions - let nodes move freely within the zoomed-out view
          // But keep a small margin to prevent nodes from being cut off at the edges
          const margin = nodeRadius + 5;
          
          // Constrain x position to visible area minus a small margin
          d.x = Math.max(-paddingX + margin, Math.min(width + paddingX - margin, d.x));
          // Constrain y position to visible area minus a small margin
          d.y = Math.max(-paddingY + margin, Math.min(height + paddingY - margin, d.y));
        });
        
        // Update all link lines with appropriate paths
        link.attr('d', function(d) {
          try {
            // Check if this is a parallel line
            const lineClass = d3.select(this).classed('line1') ? 'line1' : 
                              d3.select(this).classed('line2') ? 'line2' : undefined;
            return linkPath(d, lineClass);
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
      
      // Calculate the expanded area for node placement
      const scaleFactor = 1 / ZOOM_MIN;
      const expandedWidth = width * scaleFactor;
      const expandedHeight = height * scaleFactor;
      
      // Place nodes throughout the expanded area that will be visible at max zoom out
      initialData.nodes.forEach(node => {
        if (node.id === 'target2') {
          // Place target2 in the top right of expanded area
          node.x = width + (expandedWidth - width) * 0.4;
          node.y = 0 + (expandedHeight - height) * 0.3;
          // Fix position initially
          node.fx = node.x;
          node.fy = node.y;
        } else if (node.id === 'target1') {
          // Place target1 in the bottom left of expanded area
          node.x = 0 - (expandedWidth - width) * 0.3;
          node.y = height - (expandedHeight - height) * 0.2;
          // Fix position initially
          node.fx = node.x;
          node.fy = node.y;
        } else {
          // Place other nodes throughout the expanded area
          // Use the full expanded dimensions for better spread
          const paddingX = (expandedWidth - width) / 2;
          const paddingY = (expandedHeight - height) / 2;
          
          node.x = -paddingX + Math.random() * expandedWidth;
          node.y = -paddingY + Math.random() * expandedHeight;
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
  
  
  return (
    <div className="network-container">
      <ControlPanel colorBy={colorBy} setColorBy={setColorBy} />
      <svg ref={svgRef} className="network-graph"></svg>
      
      {/* Zoom controls */}
      <div className="zoom-controls">
        <button 
          className="zoom-button" 
          onClick={handleZoomIn} 
          aria-label="Zoom in"
          onTouchStart={(e) => {
            e.preventDefault();
            handleZoomIn();
          }}
        >+</button>
        <div className="zoom-level">{Math.round(zoomLevel * 100)}%</div>
        <button 
          className="zoom-button" 
          onClick={handleZoomOut} 
          aria-label="Zoom out"
          onTouchStart={(e) => {
            e.preventDefault();
            handleZoomOut();
          }}
        >−</button>
        <button 
          className="reset-view-button" 
          onClick={handleResetView} 
          aria-label="Reset view"
          onTouchStart={(e) => {
            e.preventDefault();
            handleResetView();
          }}
        >⟳</button>
      </div>
    </div>
  );
};

export default NetworkGraph;
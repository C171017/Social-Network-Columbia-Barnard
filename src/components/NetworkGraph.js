import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import ControlPanel from './ControlPanel';
import './NetworkGraph.css';

const NetworkGraph = ({ colorBy, setColorBy }) => {
  const svgRef = useRef();
  
  // Color schemes for different attributes
  const colorSchemes = {
    'email-sequence': () => '#5F6368',
    'major': (d) => {
      const majorColors = {
        "Mechanical Engineering": "#4285f4",
        "Creative Writing": "#ea4335",
        "Biomedical Engineering": "#fbbc05",
        "Psychology": "#34a853",
        "Human Rights, Comparative Literature & Society": "#673ab7",
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
        const languages = d.language.split(',').map(lang => lang.trim());
    
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
    if (colorBy === 'language' && d.language.includes(',')) {
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
    }
    
    return null;
  };


  




  // Add additional CSS styles
  useEffect(() => {
    const additionalStyles = `
    .network-container {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-sizing: border-box;
    }
    
    .network-graph {
      width: 100%;
      height: 100%;
      display: block;
    }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.textContent = additionalStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  // Add window resize handler
  useEffect(() => {
    const handleResize = () => {
      // Redraw the network when window is resized
      // This will trigger the main useEffect again
      if (svgRef.current) {
        const newWidth = svgRef.current.parentElement.clientWidth;
        const newHeight = window.innerHeight * 0.7;
        
        d3.select(svgRef.current)
          .attr('viewBox', `0 0 ${newWidth} ${newHeight}`);
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Set up and update the visualization
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Get container dimensions for responsive sizing
    const containerWidth = svgRef.current.parentElement.clientWidth || 800;
    const containerHeight = window.innerHeight * 0.7 || 600; // 70% of viewport height
    
    const width = containerWidth;
    const height = containerHeight;
    
    // Clear previous SVG content
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Sample data - replace with your actual data
    const initialData = {
      nodes: [
        {id: "4101", major: "Mechanical Engineering", school: "SEAS", year: "2027", language: "English", group: 1},
        {id: "3344", major: "Creative Writing", school: "CC", year: "2027", language: "English, Greek, Spanish", group: 1},
        {id: "6679", major: "Unknown", school: "Unknown", year: "Unknown", language: "Unknown", group: 1},
        {id: "2103", major: "Biomedical Engineering", school: "SEAS", year: "2027", language: "English", group: 1},
        {id: "3574", major: "Unknown", school: "Unknown", year: "Unknown", language: "Unknown", group: 1},
        {id: "2204", major: "Psychology", school: "Barnard", year: "2027", language: "English, French, Chinese", group: 2},
        {id: "target2", major: "Human Rights, Comparative Literature & Society", school: "CC", year: "2026", language: "French, English, Spanish, Mandarin", group: 2},
        {id: "target1", major: "Computer Science", school: "SEAS", year: "2025", language: "English, Mandarin", group: 1}
      ],
      links: [
        {source: "4101", target: "6679", type: "first"},
        {source: "4101", target: "2103", type: "first"},
        {source: "3344", target: "4101", type: "first"},
        {source: "3344", target: "2103", type: "first"},
        {source: "2103", target: "3574", type: "second"},
        {source: "2204", target: "target2", type: "direct"}
      ]
    };
    
    // Create SVG with responsive sizing
    const svg = d3.select(svgRef.current)
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append('g');
    
    // Add arrow markers for different link types
    const defs = svg.append("defs");
    
    // Add arrow marker for first type links (red)
    defs.append("marker")
      .attr("id", "arrow-first")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)  // Adjust to prevent overlap with node
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
      .attr("refX", 20)  // Adjust to prevent overlap with node
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
      .attr("refX", 20)  // Adjust to prevent overlap with node
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
        .distance(150))
      
      // Charge force - standard repulsion between nodes
      .force('charge', d3.forceManyBody().strength(-400))
      
      // Center force - pulls nodes toward the center
      .force('center', d3.forceCenter(width / 2, height / 2))
      
      // Simple collision detection
      .force('collision', d3.forceCollide().radius(35));
    
    // Create container for links
    const linkGroup = svg.append('g');
    
    // Process the links to create double lines for group 2
    initialData.links.forEach(linkData => {
      // Get source and target nodes
      const sourceNode = initialData.nodes.find(node => node.id === (typeof linkData.source === 'object' ? linkData.source.id : linkData.source));
      const targetNode = initialData.nodes.find(node => node.id === (typeof linkData.target === 'object' ? linkData.target.id : linkData.target));
      
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
    });
    
    // Select all link lines for updates
    const link = linkGroup.selectAll('.link-line');
    
    // Create nodes
    const node = svg.append('g')
      .selectAll('.node')
      .data(initialData.nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));
    
    // Add node circles or complex shapes
node.each(function(d) {
    const nodeGroup = d3.select(this);
    const nodePathInfo = createNodePath(d);
    
    if (nodePathInfo && (colorBy === 'major' || colorBy === 'language')) {
      // If multiple items, create pie sections
      const items = nodePathInfo.items;
      const colorMap = colorBy === 'major' ? {
        "Mechanical Engineering": "#4285f4",
        "Creative Writing": "#ea4335",
        "Biomedical Engineering": "#fbbc05",
        "Psychology": "#34a853",
        "Human Rights": "#673ab7",
        "Comparative Literature & Society": "#E91E63",
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
          .attr('fill', 'white')
          .attr('font-family', 'Arial')
          .attr('font-size', '16px')
          .text('Target2');
      
      } else if (d.id === 'target1') {
        // For Target1 node, add "Target1" text
        nodeGroup.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('fill', 'white')
          .attr('font-family', 'Arial')
          .attr('font-size', '16px')
          .text('Target1');
          
       
      } else {
        // For regular nodes, add a small white circle dot
        nodeGroup.append('circle')
          .attr('r', 6)  // Size of the dot
          .attr('fill', 'white');  // White dot
          
        // Add small group indicator
        nodeGroup.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.7em')
          .attr('fill', 'white')
          .attr('font-family', 'Arial')
          .attr('font-size', '10px')
          .text(`G${d.group}`);
      }
    });
    
          // Path calculation for links
    function linkPath(d, lineType) {
      if (!d.source.x || !d.target.x) return "M0,0L0,0";

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
      const sourceNode = initialData.nodes.find(node => node.id === (typeof d.source === 'object' ? d.source.id : d.source));
      const targetNode = initialData.nodes.find(node => node.id === (typeof d.target === 'object' ? d.target.id : d.target));
      
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
      node.each(d => {
        // Get the appropriate node radius
        const nodeRadius = (d.id === 'target2' || d.id === 'target1') ? 35 : 30;
        
        // Constrain x position
        d.x = Math.max(nodeRadius, Math.min(width - nodeRadius, d.x));
        // Constrain y position
        d.y = Math.max(nodeRadius, Math.min(height - nodeRadius, d.y));
      });
      
      // Update all link lines with appropriate paths
      link.attr('d', function(d) {
        // Check if this is a parallel line
        const lineClass = d3.select(this).classed('line1') ? 'line1' : 
                          d3.select(this).classed('line2') ? 'line2' : undefined;
        return linkPath(d, lineClass);
      });
      
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    // Standard drag functions
    function dragstarted(event, d) {
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
      d.fx = null;
      d.fy = null;
    }
    
    // Initialize node positions for the first render
    initialData.nodes.forEach(node => {
      if (node.id === 'target2') {
        node.x = width * 0.75;
        node.y = height * 0.5;
      } else if (node.id === 'target1') {
        node.x = width * 0.25;
        node.y = height * 0.5;
      }
    });
    
  }, [colorBy]); // Re-render when colorBy changes
  
  return (
    <div className="network-container" style={{ width: '100%', height: '100%' }}>
      <ControlPanel colorBy={colorBy} setColorBy={setColorBy} />
      <svg ref={svgRef} className="network-graph" style={{ display: 'block', maxWidth: '100%' }}></svg>
    </div>
  );
};

export default NetworkGraph;
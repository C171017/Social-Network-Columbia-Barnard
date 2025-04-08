const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, '..', 'src', 'data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to process the CSV file
async function processCSV(csvFilePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', data => results.push(data))
      .on('end', () => resolve(results))
      .on('error', error => reject(error));
  });
}

// Function to create network graph data from CSV
function createNetworkData(csvData) {
  const nodes = new Map();
  const links = [];
  const uniAppearances = new Map();
  const typeNames = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
  
  // Create nodes from CSV data
  csvData.forEach(row => {
    const sourceUNI = row.UNI?.trim();
    if (!sourceUNI || sourceUNI === 'N/A') return;
    
    if (!nodes.has(sourceUNI)) {
      nodes.set(sourceUNI, {
        id: sourceUNI,
        major: row.Major || 'Unknown',
        school: row.School || 'Unknown',
        year: (row['Year (Class of )'] || 'Unknown') !== 'Unknown' 
          ? row['Year (Class of )'].replace(/^Class of /i, '') 
          : 'Unknown',
        language: row['Languages You Speak (Rank by Frequency)'] || 'Unknown',
        group: parseInt(row.Group) || 1
      });
    }
  });

  // Process links
  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    const sourceUNI = row.UNI?.trim();
    
    if (!sourceUNI || sourceUNI === 'N/A') continue;
    
    const nextPersonsUNI = row['Next Person(s) UNI'];
    if (!nextPersonsUNI || nextPersonsUNI.trim() === '' || nextPersonsUNI === 'N/A') continue;
    
    const targets = nextPersonsUNI.split(',')
      .map(uni => uni.trim())
      .filter(uni => uni && uni !== 'N/A');
    
    targets.forEach(targetUNI => {
      // Create target node if it doesn't exist
      if (!nodes.has(targetUNI)) {
        nodes.set(targetUNI, {
          id: targetUNI,
          major: 'Unknown',
          school: 'Unknown',
          year: 'Unknown',
          language: 'Unknown',
          group: parseInt(row.Group) || 1
        });
      }
      
      // Track appearances
      if (!uniAppearances.has(sourceUNI)) uniAppearances.set(sourceUNI, []);
      if (!uniAppearances.has(targetUNI)) uniAppearances.set(targetUNI, []);
      
      uniAppearances.get(sourceUNI).push({ type: 'source', index: i });
      uniAppearances.get(targetUNI).push({ type: 'target', index: i });
      
      // Calculate link type based on prior appearances
      let linkType = "first";
      const previousAppearances = uniAppearances.get(sourceUNI)
        .filter(appearance => appearance.index < i)
        .length;
      
      if (previousAppearances > 0) {
        linkType = previousAppearances < typeNames.length 
          ? typeNames[previousAppearances] 
          : `${previousAppearances + 1}th`;
      }
      
      links.push({
        source: sourceUNI,
        target: targetUNI,
        type: linkType
      });
    });
  }

  return {
    nodes: Array.from(nodes.values()),
    links
  };
}

// Function to merge nodes with the same 4-digit identifier
function mergeNodesWithSame4DigitID(networkData) {
  const { nodes, links } = networkData;
  
  // Group nodes by their 4-digit identifier
  const nodesBy4DigitID = new Map();
  const nodeIdMapping = new Map(); // Maps old node IDs to new node IDs
  const targetIdsByDigitID = new Map(); // Tracks target IDs for each 4-digit ID
  
  nodes.forEach(node => {
    // Extract 4-digit number from the node ID
    const match = node.id.match(/\d{4}/);
    const fourDigitID = match ? match[0] : node.id;
    
    // Check for target ID format
    const targetMatch = node.id.match(/target\d+/);
    const targetID = targetMatch ? targetMatch[0] : null;
    
    if (!nodesBy4DigitID.has(fourDigitID)) {
      nodesBy4DigitID.set(fourDigitID, []);
      targetIdsByDigitID.set(fourDigitID, new Set());
    }
    
    if (targetID) {
      targetIdsByDigitID.get(fourDigitID).add(targetID);
    }
    
    nodesBy4DigitID.get(fourDigitID).push(node);
    
    // Create the new ID format: 4-digit ID (plus targets if any)
    let newID = fourDigitID;
    nodeIdMapping.set(node.id, newID); // Initial mapping, will be updated after all nodes are processed
  });
  
  // Merge nodes with the same 4-digit ID
  const mergedNodes = [];
  
  nodesBy4DigitID.forEach((nodesWithSameID, fourDigitID) => {
    // Get all target IDs for this 4-digit ID
    const targetIDs = Array.from(targetIdsByDigitID.get(fourDigitID));
    
    // Create the new ID with targets appended
    let newID = fourDigitID;
    if (targetIDs.length > 0) {
      newID = `${fourDigitID}, ${targetIDs.join(', ')}`;
    }
    
    // Update the node ID mappings with the final ID that includes targets
    nodesWithSameID.forEach(node => {
      nodeIdMapping.set(node.id, newID);
    });
    
    if (nodesWithSameID.length === 1 && !targetIDs.length) {
      // If there's only one node with this ID and no target IDs, just add it to the merged nodes with its original ID
      mergedNodes.push({
        ...nodesWithSameID[0],
        id: fourDigitID
      });
    } else {
      // Merge nodes with the same ID
      const mergedNode = {
        id: newID, // Use the new ID format with targets
        major: [...new Set(nodesWithSameID.map(n => n.major).filter(m => m !== 'Unknown' && m))].join(', ') || 'Unknown',
        school: [...new Set(nodesWithSameID.map(n => n.school).filter(s => s !== 'Unknown' && s))].join(', ') || 'Unknown',
        year: [...new Set(nodesWithSameID.map(n => n.year).filter(y => y !== 'Unknown' && y))].join(', ') || 'Unknown',
        language: [...new Set(nodesWithSameID.map(n => n.language).filter(l => l !== 'Unknown' && l))].join(', ') || 'Unknown',
        group: nodesWithSameID[0].group // Use the group of the first node
      };
      
      mergedNodes.push(mergedNode);
    }
  });
  
  // Update links to use the new node IDs
  const updatedLinks = links.map(link => ({
    source: nodeIdMapping.get(link.source) || link.source,
    target: nodeIdMapping.get(link.target) || link.target,
    type: link.type
  }));
  
  // Remove duplicate links
  const uniqueLinks = [];
  const linkSet = new Set();
  
  updatedLinks.forEach(link => {
    const linkKey = `${link.source}-${link.target}-${link.type}`;
    if (!linkSet.has(linkKey)) {
      linkSet.add(linkKey);
      uniqueLinks.push(link);
    }
  });
  
  return {
    nodes: mergedNodes,
    links: uniqueLinks
  };
}

// Extract unique values for legend
function extractUniqueValues(nodes) {
  const uniqueMajors = new Set();
  const uniqueLanguages = new Set();
  const uniqueYears = new Set();
  
  nodes.forEach(node => {
    if (node.major && node.major !== 'Unknown') {
      node.major.split(',').forEach(major => uniqueMajors.add(major.trim()));
    }
    
    if (node.language && node.language !== 'Unknown') {
      node.language.split(',').forEach(lang => uniqueLanguages.add(lang.trim()));
    }
    
    if (node.year && node.year !== 'Unknown') {
      uniqueYears.add(node.year.trim());
    }
  });
  
  return { uniqueMajors, uniqueLanguages, uniqueYears };
}

// Main function
async function main() {
  try {
    const csvFilePath = process.argv[2];
    
    if (!csvFilePath) {
      console.error('Please provide a CSV file path as an argument');
      process.exit(1);
    }
    
    console.log(`Processing CSV file: ${csvFilePath}`);
    const csvData = await processCSV(csvFilePath);
    console.log(`Processed ${csvData.length} rows from CSV`);
    
    // Log sample data for debugging
    if (csvData.length > 0) {
      console.log("CSV column names:", Object.keys(csvData[0]));
      console.log("Sample row:", JSON.stringify(csvData[0], null, 2));
    }
    
    let networkData = createNetworkData(csvData);
    console.log(`Generated network with ${networkData.nodes.length} nodes and ${networkData.links.length} links`);
    
    // Merge nodes with the same 4-digit ID
    networkData = mergeNodesWithSame4DigitID(networkData);
    console.log(`After merging, network has ${networkData.nodes.length} nodes and ${networkData.links.length} links`);
    
    // Write network data
    const outputFilePath = path.join(outputDir, 'network_data.json');
    fs.writeFileSync(outputFilePath, JSON.stringify(networkData, null, 2));
    console.log(`Network data written to: ${outputFilePath}`);
    
    // Write unique values for legend
    const { uniqueMajors, uniqueLanguages, uniqueYears } = extractUniqueValues(networkData.nodes);
    
    fs.writeFileSync(
      path.join(outputDir, 'unique_majors.json'), 
      JSON.stringify(Array.from(uniqueMajors), null, 2)
    );
    
    fs.writeFileSync(
      path.join(outputDir, 'unique_languages.json'), 
      JSON.stringify(Array.from(uniqueLanguages), null, 2)
    );
    
    fs.writeFileSync(
      path.join(outputDir, 'unique_years.json'), 
      JSON.stringify(Array.from(uniqueYears), null, 2)
    );
    
    console.log('Data processing complete');
  } catch (error) {
    console.error('Error processing data:', error);
    process.exit(1);
  }
}

// Run the main function
main();
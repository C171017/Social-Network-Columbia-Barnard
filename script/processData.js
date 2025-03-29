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
    
    const networkData = createNetworkData(csvData);
    console.log(`Generated network with ${networkData.nodes.length} nodes and ${networkData.links.length} links`);
    
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
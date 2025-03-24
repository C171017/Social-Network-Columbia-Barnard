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
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Function to create network graph data from CSV
function createNetworkData(csvData) {
  const nodes = new Map();
  const links = [];
  
  // Sort and group data by Timestamp
  const sortedData = [...csvData].sort((a, b) => {
    const timestampA = new Date(a.Timestamp).getTime();
    const timestampB = new Date(b.Timestamp).getTime();
    return timestampA - timestampB;
  });

  // Organize by groups (assuming different email chains are in different groups)
  const groups = new Map();
  sortedData.forEach(row => {
    const sourceUNI = row.UNI.trim();
    
    // Skip rows with no UNI or blank UNI
    if (!sourceUNI || sourceUNI === 'N/A') return;
    
    // Create a simple hash of the first few chars to determine group
    // This is a simplification - in reality you'd need a better way to determine groups
    const groupKey = sourceUNI.substring(0, 1); 
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    
    groups.get(groupKey).push(row);
  });

  // Process each group and assign sequence numbers
  groups.forEach((groupRows, groupKey) => {
    // Sort rows by timestamp within each group
    groupRows.sort((a, b) => {
      const timestampA = new Date(a.Timestamp).getTime();
      const timestampB = new Date(b.Timestamp).getTime();
      return timestampA - timestampB;
    });
    
    // Assign sequence numbers in order
    groupRows.forEach((row, index) => {
      row.sequenceNumber = index + 1;
      row.group = parseInt(groupKey, 36) % 3 + 1; // Convert group key to a number 1-3
    });
  });

  // Flatten back to single array
  const processedData = Array.from(groups.values()).flat();

  // Create nodes
  processedData.forEach(row => {
    const id = row.UNI.trim();
    
    // Skip if no UNI or N/A
    if (!id || id === 'N/A') return;
    
    if (!nodes.has(id)) {
      // Process languages
      const languages = row['Languages You Speak (Rank by Frequency)'] || 'Unknown';
      
      // Process major (may contain multiple majors)
      const major = row.Major || 'Unknown';
      
      nodes.set(id, {
        id,
        major,
        school: row.School || 'Unknown',
        year: row.Year ? row.Year.replace(/^Class of /i, '') : 'Unknown',
        language: languages,
        group: row.group || 1,
        sequenceNumber: row.sequenceNumber
      });
    }
    
    // Process links (UNI to Next Person(s) UNI)
    const nextPersons = row['Next Person(s) UNI'];
    if (nextPersons && nextPersons.trim() !== '') {
      // Split by comma since there might be multiple recipients
      const recipients = nextPersons.split(',').map(uni => uni.trim()).filter(uni => uni && uni !== 'N/A');
      
      recipients.forEach(targetId => {
        // Create target node if it doesn't exist (may be filled with details later)
        if (!nodes.has(targetId)) {
          nodes.set(targetId, {
            id: targetId,
            major: 'Unknown',
            school: 'Unknown',
            year: 'Unknown',
            language: 'Unknown',
            group: row.group || 1
          });
        }
        
        // Determine link type based on sequence
        let linkType = 'direct';
        
        // If we have sequence numbers, use them to determine link type
        if (row.sequenceNumber) {
          if (row.sequenceNumber === 1) {
            linkType = 'first';
          } else if (row.sequenceNumber === 2) {
            linkType = 'second';
          }
        }
        
        // Add the link
        links.push({
          source: id,
          target: targetId,
          type: linkType
        });
      });
    }
  });

  // Handle special cases from your example
  // Add the two target nodes from the example if they're not in the data
  if (!nodes.has('target1')) {
    nodes.set('target1', {
      id: 'target1',
      major: 'Computer Science',
      school: 'SEAS',
      year: '2025',
      language: 'English, Mandarin',
      group: 1
    });
  }
  
  if (!nodes.has('target2')) {
    nodes.set('target2', {
      id: 'target2',
      major: 'Human Rights, Comparative Literature & Society',
      school: 'CC',
      year: '2026',
      language: 'French, English, Spanish, Mandarin',
      group: 2
    });
  }

  // Convert to the format needed for the visualization
  return {
    nodes: Array.from(nodes.values()),
    links
  };
}

// Main function to process the CSV and generate the network data
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
    
    const networkData = createNetworkData(csvData);
    console.log(`Generated network with ${networkData.nodes.length} nodes and ${networkData.links.length} links`);
    
    // Write the network data to a JSON file
    const outputFilePath = path.join(outputDir, 'network_data.json');
    fs.writeFileSync(outputFilePath, JSON.stringify(networkData, null, 2));
    console.log(`Network data written to: ${outputFilePath}`);
    
    // Extract all unique majors and languages for dynamic legend generation
    const uniqueMajors = new Set();
    const uniqueLanguages = new Set();
    
    networkData.nodes.forEach(node => {
      // Process majors
      if (node.major && node.major !== 'Unknown') {
        node.major.split(',').forEach(major => {
          uniqueMajors.add(major.trim());
        });
      }
      
      // Process languages
      if (node.language && node.language !== 'Unknown') {
        node.language.split(',').forEach(lang => {
          uniqueLanguages.add(lang.trim());
        });
      }
    });
    
    // Write unique values to separate files for the visualization
    fs.writeFileSync(
      path.join(outputDir, 'unique_majors.json'), 
      JSON.stringify(Array.from(uniqueMajors), null, 2)
    );
    
    fs.writeFileSync(
      path.join(outputDir, 'unique_languages.json'), 
      JSON.stringify(Array.from(uniqueLanguages), null, 2)
    );
    
    console.log('Data processing complete');
  } catch (error) {
    console.error('Error processing data:', error);
    process.exit(1);
  }
}

// Run the main function
main();
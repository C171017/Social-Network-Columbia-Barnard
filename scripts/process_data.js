const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Process the CSV file and generate the network data
function processCSV(inputFile, outputFile) {
  console.log(`Processing ${inputFile}...`);
  
  const results = [];
  
  fs.createReadStream(inputFile)
    .pipe(csv())
    .on('data', (data) => {
      // Extract only the fields we need
      const student = {
        uni: data.UNI,
        time: data.Timestamp,
        school: data.School,
        year: data.Year || `Class of ${data['Class of']}`, // Handle both "Year" and "Class of"
        major: data.Major,
        languages: processLanguages(data),
        nextUNIs: processNextUNIs(data)
      };
      
      results.push(student);
    })
    .on('end', () => {
      // Generate the network data format expected by the application
      const networkData = generateNetworkData(results);
      
      // Write the output to the specified file
      fs.writeFileSync(outputFile, JSON.stringify(networkData, null, 2));
      console.log(`Network data saved to ${outputFile}`);
    });
}

// Process the languages field (could be in various formats)
function processLanguages(data) {
  // Check if languages are in a single field or multiple fields
  if (data.languages) {
    return data.languages.split(',').map(lang => lang.trim());
  }
  
  // If languages are in separate fields like language1, language2, etc.
  const languages = [];
  for (let i = 1; i <= 5; i++) {
    const langField = `language${i}`;
    if (data[langField] && data[langField].trim()) {
      languages.push(data[langField].trim());
    }
  }
  
  return languages;
}

// Process the nextUNI fields
function processNextUNIs(data) {
  const nextUNIs = [];
  
  // Check if nextUNIs are in a single field
  if (data.nextUNIs) {
    return data.nextUNIs.split(',').map(uni => uni.trim());
  }
  
  // If nextUNIs are in separate fields
  if (data.nextUNI) {
    nextUNIs.push(data.nextUNI);
  }
  
  // Check for additional nextUNI fields
  for (let i = 1; i <= 10; i++) {
    const uniField = `nextUNI${i}`;
    if (data[uniField] && data[uniField].trim()) {
      nextUNIs.push(data[uniField].trim());
    }
  }
  
  return nextUNIs;
}

// Generate the network data in the format expected by the application
function generateNetworkData(students) {
  // Create nodes
  const nodes = students.map(student => ({
    id: student.uni,
    name: student.uni, // Using UNI as name
    school: student.school,
    year: student.year,
    major: student.major,
    language: student.languages[0] || 'Unknown', // Primary language
    languages: student.languages,
  }));
  
  // Create links (edges)
  const links = [];
  
  students.forEach(student => {
    student.nextUNIs.forEach(nextUNI => {
      if (nextUNI && nextUNI.trim()) {
        links.push({
          source: student.uni,
          target: nextUNI.trim(),
          type: 'First Forward' // Default type, can be customized based on your needs
        });
      }
    });
  });
  
  return {
    nodes,
    links
  };
}

// Main execution
if (require.main === module) {
  // Get command line args
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node process_data.js <input_csv_file> [output_json_file]');
    process.exit(1);
  }
  
  const inputFile = args[0];
  const outputFile = args[1] || path.join(__dirname, '../src/data/network_data.json');
  
  // Create output directory if it doesn't exist
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  processCSV(inputFile, outputFile);
}

module.exports = { processCSV };
import React, { useState, useEffect } from 'react';
import NetworkGraph from './components/NetworkGraph';
import InstructionModal from './components/InstructionModal';
import './App.css';

// Try to import the network data, with a fallback for when it doesn't exist yet
let networkData = { nodes: [], links: [] };
try {
  networkData = require('./data/network_data.json');
} catch (e) {
  console.warn('Network data file not found. Please process your CSV data first.');
}

function App() {
  const [colorBy, setColorBy] = useState('year');
  const [data] = useState(networkData);
  const [showInstructions, setShowInstructions] = useState(false);

  // Show the instruction modal once on first load
  useEffect(() => {
    setShowInstructions(true);
  }, []);

  return (
    <div className="App">
      {showInstructions && (
        <InstructionModal onClose={() => setShowInstructions(false)} />
      )}
      <main>
        <div className="visualization-container">
          <NetworkGraph
            colorBy={colorBy}
            setColorBy={setColorBy}
            data={data}
          />
        </div>
      </main>
    </div>
  );
}

export default App;

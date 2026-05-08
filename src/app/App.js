import React, { useState } from 'react';
import NetworkGraph from '../components/NetworkGraph';
import InstructionModal from '../features/instructions/InstructionModal';
import './App.css';

let networkData = { nodes: [], links: [] };
try {
  networkData = require('../data/network_data.json');
} catch (e) {
  console.warn('Network data file not found. Please process your CSV data first.');
}

function App() {
  const [colorBy, setColorBy] = useState('year');
  const data = networkData;
  const [showInstructions, setShowInstructions] = useState(true);

  return (
    <div className="App">
      {showInstructions && <InstructionModal onClose={() => setShowInstructions(false)} />}
      <main>
        <div className="visualization-container">
          <NetworkGraph colorBy={colorBy} setColorBy={setColorBy} data={data} />
        </div>
      </main>
    </div>
  );
}

export default App;

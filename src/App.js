import React, { useState } from 'react';
import NetworkGraph from './components/NetworkGraph';

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

  return (
    <div className="App">
      <main>
        <div className="visualization-container">
          <NetworkGraph colorBy={colorBy} setColorBy={setColorBy} data={data} />
        </div>
      </main>
    </div>
  );
}

export default App;
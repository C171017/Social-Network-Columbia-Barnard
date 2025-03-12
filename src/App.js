import React, { useState, useEffect } from 'react';
import NetworkGraph from './components/NetworkGraph';
import Legend from './components/Legend';
import './App.css';

// Try to import the network data, with a fallback for when it doesn't exist yet
let networkData = { nodes: [], links: [] };
try {
  networkData = require('./data/network_data.json');
} catch (e) {
  console.warn('Network data file not found. Please process your CSV data first.');
}

function App() {
  // This state is lifted up to App level so it can be shared between components
  const [colorBy, setColorBy] = useState('email-sequence');
  const [data, setData] = useState(networkData);

  // This effect would be useful if you want to dynamically reload the data
  useEffect(() => {
    // You could add code here to fetch the data dynamically if needed
  }, []);

  return (
    <div className="App">
      <main>
        <div className="visualization-container">
          {/* Pass the state, setter, and data to NetworkGraph */}
          <NetworkGraph colorBy={colorBy} setColorBy={setColorBy} data={data} />
        </div>
        
        <div className="sidebar">
          {/* Pass the current colorBy to Legend so it knows what to display */}
          <Legend colorBy={colorBy} />
        </div>
      </main>
    </div>
  );
}

export default App;
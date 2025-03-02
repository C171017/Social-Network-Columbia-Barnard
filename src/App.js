import React, { useState } from 'react';
import NetworkGraph from './components/NetworkGraph';
import Legend from './components/Legend';
import './App.css';

function App() {
  // This state is lifted up to App level so it can be shared between components
  const [colorBy, setColorBy] = useState('email-sequence');

  return (
    <div className="App">
      
      <main>
        <div className="visualization-container">
          {/* Pass the state and setter to NetworkGraph */}
          <NetworkGraph colorBy={colorBy} setColorBy={setColorBy} />
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
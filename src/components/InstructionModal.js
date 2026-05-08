// src/components/InstructionModal.js
import React from 'react';
import './InstructionModal.css';

export default function InstructionModal({ onClose }) {
  return (
    <div className="instr-overlay">
      <div className="instr-box">
        <h2>Welcome to the Network Explorer!</h2>
        <p>Here’s how to navigate the graph:</p>
        <ul>
          <li>🤚 <strong>Press & hold</strong> a node to unfold its entire group.</li>
          <li>🎯 <strong>Click</strong> any node to toggle focus on that group.</li>
          <li>⚙️ Use the control panel at the <strong>bottom-right</strong> to change the viewing property.</li>
        </ul>
        <p style={{ marginTop: '1em', fontStyle: 'italic', fontSize: '0.9em' }}>
          💻 For the best experience, please view this site on a laptop or desktop. Mobile devices are not yet fully optimized.
        </p>
        <hr style={{ margin: '1em 0', border: 'none', borderTop: '1px solid #ccc' }} />
        <p style={{ fontSize: '0.85em' }}>
          🛠️ GitHub: <a href="https://github.com/C171017/Social-Network-Columbia-Barnard" target="_blank" rel="noopener noreferrer">
            C171017/Social-Network-Columbia-Barnard
          </a>
          <br />
          📬 Contact: <a href="mailto:c171017howie@gmail.com">c171017howie@gmail.com</a>
        </p>
        <button className="instr-close" onClick={onClose}>Got it!</button>
      </div>
    </div>
  );
}
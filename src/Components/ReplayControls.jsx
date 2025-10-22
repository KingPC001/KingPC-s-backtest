import React from 'react';

export default function ReplayControls({ running, onPlayPause, onStep, speedPreset, setSpeedPreset, customSpeed, setCustomSpeed }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button className="button" onClick={onPlayPause}>{running ? 'Pause' : 'Play'}</button>
      <button className="button" onClick={onStep}>Step</button>
      <label style={{ marginLeft: 8 }}>Speed:</label>
      <select className="select" value={speedPreset} onChange={e => setSpeedPreset(e.target.value)}>
        <option value="slow">Slow (1/s)</option>
        <option value="medium">Medium (2/s)</option>
        <option value="fast">Fast (5/s)</option>
        <option value="custom">Custom</option>
      </select>
      {speedPreset === 'custom' && (
        <input type="range" min="50" max="2000" value={customSpeed} onChange={e => setCustomSpeed(e.target.value)} />
      )}
    </div>
  );
}

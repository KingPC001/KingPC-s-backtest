import React from 'react';

export default function TradeHistory({ trades, onExit }) {
  return (
    <div className="card">
      <h3>Trade History</h3>
      <div style={{ maxHeight: 420, overflow: 'auto', marginTop: 8 }}>
        <table className="table">
          <thead>
            <tr><th>Pair</th><th>Dir</th><th>Entry</th><th>Exit</th><th>PnL</th><th>Action</th></tr>
          </thead>
          <tbody>
            {trades.map(t => (
              <tr key={t.id}>
                <td>{t.pair}</td>
                <td>{t.direction}</td>
                <td>{t.entryPrice?.toFixed(5)}</td>
                <td>{t.exitPrice ? t.exitPrice.toFixed(5) : '—'}</td>
                <td style={{ color: t.pnl > 0 ? '#0f0' : '#f66' }}>{t.pnl !== null ? t.pnl.toFixed(2) : '—'}</td>
                <td>{t.exitIdx === null ? <button className="button" onClick={() => onExit(t.id)}>Exit</button> : 'Closed'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

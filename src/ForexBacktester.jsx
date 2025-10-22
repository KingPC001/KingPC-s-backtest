import React, { useState, useEffect, useRef } from 'react';
import ChartReplay from './ChartReplay';

/*
  Main app integrates ChartReplay and a simple trade engine.
  - Uses ChartReplay's onTick to receive current candles and pos
  - Provides pair/timeframe selectors, buy/sell, and trade history
*/

export default function ForexBacktester(){
  const [pair, setPair] = useState('EUR/USD');
  const [interval, setIntervalState] = useState('1h');
  const [candles, setCandles] = useState([]);
  const [pos, setPos] = useState(0);
  const [trades, setTrades] = useState([]);
  const sizeRef = useRef(10000);

  function handleTick({ candles: c, pos: p }) {
    setCandles(c);
    setPos(p);
  }

  function enter(direction){
    const current = candles[pos];
    if(!current) return alert('No candle loaded yet');
    const entryPrice = current.close;
    const id = Date.now();
    setTrades(prev => [...prev, { id, pair, direction, entryIdx: pos, entryPrice, size: Number(sizeRef.current), exitIdx: null, exitPrice: null, pnl: null }]);
  }

  function exit(tradeId){
    const current = candles[pos];
    if(!current) return alert('No candle loaded yet');
    const exitPrice = current.close;
    setTrades(prev => prev.map(t => {
      if(t.id !== tradeId || t.exitIdx !== null) return t;
      const pnl = (t.direction === 'buy' ? exitPrice - t.entryPrice : t.entryPrice - exitPrice) * t.size;
      return { ...t, exitIdx: pos, exitPrice, pnl };
    }));
  }

  function closeAll(){
    trades.forEach(t => {
      if(t.exitIdx === null) exit(t.id);
    });
  }

  return (
    <div className="container">
      <h1 style={{fontSize:28, marginBottom:12}}>KingPC's Backtest — TradingView Style</h1>
      <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:16}}>
        <div>
          <div style={{display:'flex', gap:8, marginBottom:8}}>
            <select value={pair} onChange={e=>setPair(e.target.value)} style={{padding:8, borderRadius:6}}>
              <option>EUR/USD</option>
              <option>GBP/USD</option>
              <option>USD/JPY</option>
              <option>AUD/USD</option>
              <option>USD/CAD</option>
            </select>
            <select value={interval} onChange={e=>setIntervalState(e.target.value)} style={{padding:8, borderRadius:6}}>
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </select>
            <div style={{marginLeft:'auto', display:'flex', gap:8}}>
              <button className="button" onClick={()=>{}}>Save Layout</button>
            </div>
          </div>

          <ChartReplay pair={pair} interval={interval} onTick={handleTick} />
          <div style={{marginTop:8, display:'flex', gap:8}}>
            <button className="button" onClick={()=>enter('buy')}>Buy</button>
            <button className="button" onClick={()=>enter('sell')}>Sell</button>
            <input ref={sizeRef} defaultValue={10000} style={{padding:8, borderRadius:6, marginLeft:8}} />
            <button className="button" onClick={closeAll}>Close All</button>
          </div>
        </div>

        <div>
          <div className="card" style={{padding:12}}>
            <h3>Trade History</h3>
            <div style={{maxHeight:420, overflow:'auto', marginTop:8}}>
              <table style={{width:'100%'}}>
                <thead>
                  <tr><th>Pair</th><th>Dir</th><th>Entry</th><th>Exit</th><th>PnL</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {trades.map(t => (
                    <tr key={t.id} style={{borderTop:'1px solid #122040'}}>
                      <td>{t.pair}</td>
                      <td>{t.direction}</td>
                      <td>{t.entryPrice?.toFixed(5)}</td>
                      <td>{t.exitPrice ? t.exitPrice.toFixed(5) : '—'}</td>
                      <td style={{color: t.pnl>0 ? '#0f0' : '#f66'}}>{t.pnl !== null ? t.pnl.toFixed(2) : '—'}</td>
                      <td>
                        {t.exitIdx === null ? <button className="button" onClick={()=>exit(t.id)}>Exit</button> : 'Closed'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{height:12}} />

          <div className="card" style={{padding:12}}>
            <h3>Current</h3>
            <div>Rendered candles: {candles.length}</div>
            <div>Rendered index: {pos}</div>
            <div>Open trades: {trades.filter(t=>t.exitIdx===null).length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

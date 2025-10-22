import React, { useState, useRef, useEffect, useMemo } from 'react';
import Chart from './components/Chart';
import ReplayControls from './components/ReplayControls';
import TradeHistory from './components/TradeHistory';

const PAIRS = ['EUR/USD','GBP/USD','USD/JPY','AUD/USD','USD/CAD','NZD/CHF','NZD/JPY','GBP/JPY'];

export default function ForexBacktester(){
  const [pair, setPair] = useState('EUR/USD');
  const [interval, setIntervalState] = useState('1h');
  const [candles, setCandles] = useState([]);
  const [pos, setPos] = useState(0);
  const [running, setRunning] = useState(false);
  const [speedPreset, setSpeedPreset] = useState('medium'); // slow, medium, fast, custom
  const [customSpeed, setCustomSpeed] = useState(300);
  const [theme, setTheme] = useState('dark');
  const [trades, setTrades] = useState([]);
  const sizeRef = useRef(10000);

  const speedMs = useMemo(() => {
    if (speedPreset === 'slow') return 1000;
    if (speedPreset === 'medium') return 500;
    if (speedPreset === 'fast') return 200;
    return Number(customSpeed) || 300;
  }, [speedPreset, customSpeed]);

  useEffect(() => {
    async function fetchData(){
      const sym = pair.replace('/','');
      const resp = await fetch(`/api/candles?pair=${encodeURIComponent(sym)}&interval=${encodeURIComponent(interval)}&outputsize=1000`);
      const json = await resp.json();
      const values = json.values ? json.values.slice().reverse() : [];
      const data = values.map(v => ({
        time: v.datetime || v.timestamp || v.date,
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close)
      }));
      setCandles(data);
      setPos(0);
    }
    fetchData().catch(console.error);
  }, [pair, interval]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setPos(p => {
        const next = p + 1;
        if (next >= candles.length) { clearInterval(id); setRunning(false); return p; }
        return next;
      });
    }, speedMs);
    return () => clearInterval(id);
  }, [running, speedMs, candles]);

  useEffect(() => {
    // update chart slice when pos changes (handled by Chart component receiving data.slice)
  }, [pos]);

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

  function step(){
    setPos(p => Math.min(candles.length -1, p + 1));
  }

  return (
    <div className={`app ${theme === 'dark' ? 'dark' : 'light'}`}>
      <div className="header">
        <h1 style={{fontSize:24, margin:0}}>KingPC's Backtest</h1>
        <div style={{marginLeft:'auto'}} className="controls">
          <label style={{marginRight:8}}>Theme:</label>
          <select className="select" value={theme} onChange={e=>setTheme(e.target.value)}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
      </div>

      <div className="container">
        <div>
          <div style={{display:'flex', gap:8, marginBottom:8}}>
            <select className="select" value={pair} onChange={e=>setPair(e.target.value)}>
              {PAIRS.map(p=> <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="select" value={interval} onChange={e=>setIntervalState(e.target.value)}>
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </select>
            <div style={{marginLeft:'auto', display:'flex', gap:8}}>
              <ReplayControls running={running} onPlayPause={()=>setRunning(r=>!r)} onStep={step} speedPreset={speedPreset} setSpeedPreset={setSpeedPreset} customSpeed={customSpeed} setCustomSpeed={setCustomSpeed} />
            </div>
          </div>

          <Chart data={candles.slice(0, pos+1)} theme={theme} />

          <div style={{marginTop:8, display:'flex', gap:8}}>
            <button className="button" onClick={()=>enter('buy')}>Buy</button>
            <button className="button" onClick={()=>enter('sell')}>Sell</button>
            <input ref={sizeRef} defaultValue={10000} style={{padding:8, borderRadius:6, marginLeft:8}} />
            <button className="button" onClick={()=>{ trades.forEach(t => { if(t.exitIdx === null) exit(t.id); }); }}>Close All</button>
          </div>
        </div>

        <div>
          <TradeHistory trades={trades} onExit={exit} />
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

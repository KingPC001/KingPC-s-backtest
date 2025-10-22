import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';

export default function ChartReplay({ pair='EUR/USD', interval='1h', onTick }) {
  const containerRef = useRef();
  const chartRef = useRef();
  const seriesRef = useRef();
  const [candles, setCandles] = useState([]);
  const [pos, setPos] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(300);

  useEffect(() => {
    const chart = createChart(containerRef.current, {
      layout: { backgroundColor: '#071133', textColor: '#e6eef8' },
      width: containerRef.current.clientWidth,
      height: 480,
      rightPriceScale: { borderColor: '#18223a' },
      timeScale: { borderColor: '#18223a' }
    });
    const candleSeries = chart.addCandlestickSeries();
    chartRef.current = chart;
    seriesRef.current = candleSeries;

    const onResize = () => chart.applyOptions({ width: containerRef.current.clientWidth });
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.remove(); }
  }, []);

  useEffect(() => {
    async function fetchCandles() {
      const q = pair.replace('/', '');
      try {
        const resp = await fetch(`/api/candles?pair=${encodeURIComponent(q)}&interval=${encodeURIComponent(interval)}&outputsize=2000`);
        const json = await resp.json();
        if (json.status === 'error') { console.error(json); return; }
        const values = json.values ? json.values.slice().reverse() : [];
        const data = values.map(v => ({
          time: v.datetime || v.timestamp || v.date,
          open: parseFloat(v.open),
          high: parseFloat(v.high),
          low: parseFloat(v.low),
          close: parseFloat(v.close)
        }));
        setCandles(data);
        if (seriesRef.current) seriesRef.current.setData(data.slice(0, 1));
        setPos(0);
        if (onTick) onTick({ candles: data, pos: 0 });
      } catch (e) { console.error('fetch error', e); }
    }
    fetchCandles();
  }, [pair, interval]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setPos(p => {
        const next = p + 1;
        if (next >= candles.length) { clearInterval(id); setRunning(false); return p; }
        const slice = candles.slice(0, next + 1);
        seriesRef.current.setData(slice);
        if (onTick) onTick({ candles: slice, pos: next });
        return next;
      });
    }, speed);
    return () => clearInterval(id);
  }, [running, speed, candles]);

  function step() {
    setPos(p => {
      const next = Math.min(candles.length - 1, p + 1);
      const slice = candles.slice(0, next + 1);
      seriesRef.current.setData(slice);
      if (onTick) onTick({ candles: slice, pos: next });
      return next;
    });
  }

  return (
    <div className="card" style={{padding:12}}>
      <div style={{marginBottom:8}}>
        <strong style={{fontSize:18}}>{pair} — {interval}</strong>
      </div>
      <div ref={containerRef} style={{width:'100%', height:480}} />
      <div style={{display:'flex', gap:8, marginTop:8, alignItems:'center'}}>
        <button className="button" onClick={()=>setRunning(r=>!r)}>{running ? 'Pause' : 'Play'}</button>
        <button className="button" onClick={step}>Step</button>
        <label style={{marginLeft:8}}>Speed (ms):</label>
        <input type="range" min="50" max="2000" value={speed} onChange={e=>setSpeed(Number(e.target.value))} />
        <span style={{marginLeft:6}}>{speed} ms</span>
      </div>
    </div>
  );
}

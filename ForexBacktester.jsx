import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'

export default function ForexBacktester(){
  const [pair, setPair] = useState('EURUSD')
  const [csvText, setCsvText] = useState('')
  const [data, setData] = useState([])
  const [fastLen, setFastLen] = useState(9)
  const [slowLen, setSlowLen] = useState(21)
  const [initialCapital, setInitialCapital] = useState(10000)
  const [riskPerTradePct, setRiskPerTradePct] = useState(1)
  const [spreadPips, setSpreadPips] = useState(0.0)
  const [results, setResults] = useState(null)

  function parseCSV(text){
    const lines = text.trim().split(/\r?\n/).filter(Boolean)
    if(lines.length === 0) return []
    const header = lines[0].split(',').map(h => h.trim().toLowerCase())
    const rows = lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim())
      const row = {}
      header.forEach((h,i) => { row[h] = cols[i] })
      const dateStr = row.date || (row.datetime ? row.datetime.split(' ')[0] : null)
      const timeStr = row.time || (row.datetime && row.datetime.split(' ')[1]) || '00:00'
      const date = new Date(dateStr + ' ' + timeStr)
      return {
        date,
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: row.volume ? Number(row.volume) : null
      }
    }).filter(r => !isNaN(r.close) && r.date instanceof Date && !isNaN(r.date))
    rows.sort((a,b) => a.date - b.date)
    return rows
  }

  function handleFileUpload(e){
    const f = e.target.files?.[0]
    if(!f) return
    const reader = new FileReader()
    reader.onload = () => setCsvText(String(reader.result || ''))
    reader.readAsText(f)
  }

  useEffect(() => {
    if(!csvText) { setData([]); return }
    try{ setData(parseCSV(csvText)) } catch(e){ console.error(e); setData([]) }
  }, [csvText])

  function sma(values, length){
    const out = Array(values.length).fill(null)
    let sum = 0
    for(let i=0;i<values.length;i++){
      sum += values[i]
      if(i>=length) sum -= values[i-length]
      if(i>=length-1) out[i] = sum/length
    }
    return out
  }

  function runBacktest(ohlc, params){
    const { fastLen, slowLen, initialCapital, riskPct, spreadPips } = params
    if(!ohlc || ohlc.length===0) return null
    const closes = ohlc.map(d=>d.close)
    const fast = sma(closes, fastLen)
    const slow = sma(closes, slowLen)
    let equity = initialCapital
    let peakEquity = equity
    let maxDrawdown = 0
    let position = null
    const trades = []
    const equityCurve = []
    const isJPY = /JPY$/.test(pair)
    const pip = isJPY ? 0.01 : 0.0001

    for(let i=0;i<ohlc.length;i++){
      const bar = ohlc[i]
      const date = bar.date
      const price = bar.close
      const f = fast[i]
      const s = slow[i]
      if(f==null || s==null){ equityCurve.push({date, equity}); continue }
      const spread = spreadPips * pip
      const prevF = fast[i-1]
      const prevS = slow[i-1]
      const longSignal = prevF!=null && prevS!=null && prevF <= prevS && f > s
      const exitSignal = prevF!=null && prevS!=null && prevF >= prevS && f < s

      if(position && exitSignal){
        const exitPrice = price - spread
        const pnl = (exitPrice - position.entryPrice) * position.size
        equity += pnl
        trades.push({ entryDate: position.entryDate, exitDate: date, entryPrice: position.entryPrice, exitPrice, pnl })
        position = null
      }

      if(!position && longSignal){
        const entryPrice = price + spread
        const lookback = 10
        const recentLow = Math.min(...ohlc.slice(Math.max(0,i-lookback), i+1).map(b=>b.low))
        const stop = recentLow - spread
        const riskPerLot = entryPrice - stop
        const riskAmount = (riskPct/100) * equity
        const size = riskPerLot>0 ? riskAmount / riskPerLot : 0
        position = { entryPrice, size, entryDate: date }
      }

      if(equity > peakEquity) peakEquity = equity
      maxDrawdown = Math.max(maxDrawdown, (peakEquity - equity)/peakEquity)
      equityCurve.push({ date, equity })
    }

    if(position){
      const last = ohlc[ohlc.length-1]
      const exitPrice = last.close - (spreadPips * ( /JPY$/.test(pair) ? 0.01 : 0.0001))
      const pnl = (exitPrice - position.entryPrice) * position.size
      equity += pnl
      trades.push({ entryDate: position.entryDate, exitDate: last.date, entryPrice: position.entryPrice, exitPrice, pnl })
      position = null
      equityCurve.push({ date: last.date, equity })
    }

    const grossProfit = trades.filter(t=>t.pnl>0).reduce((a,b)=>a+b.pnl,0)
    const grossLoss = trades.filter(t=>t.pnl<=0).reduce((a,b)=>a+b.pnl,0)
    const winRate = trades.length ? (trades.filter(t=>t.pnl>0).length / trades.length) * 100 : 0

    return { trades, equityCurve, finalEquity: equity, netPnL: equity-initialCapital, grossProfit, grossLoss, winRate, maxDrawdown }
  }

  function handleRun(){
    if(!data || data.length===0){ alert('Please load CSV data first.'); return }
    try{
      const r = runBacktest(data, { fastLen: Number(fastLen), slowLen: Number(slowLen), initialCapital: Number(initialCapital), riskPct: Number(riskPerTradePct), spreadPips: Number(spreadPips) })
      setResults(r)
    }catch(e){ console.error(e); alert('Backtest failed: '+String(e)) }
  }

  function exportTradesCSV(){
    if(!results) return
    const rows = ['entryDate,exitDate,entryPrice,exitPrice,pnl']
    for(const t of results.trades){ rows.push(`${new Date(t.entryDate).toISOString()},${new Date(t.exitDate).toISOString()},${t.entryPrice},${t.exitPrice},${t.pnl}`) }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${pair}_trades.csv`; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-4">KingPC's Backtest</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label>Pair</label>
          <select value={pair} onChange={e=>setPair(e.target.value)} className="w-full p-2 rounded border">
            {['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD'].map(p=> <option key={p} value={p}>{p}</option>)}
          </select>

          <label className="mt-2">Upload CSV (date,open,high,low,close,volume)</label>
          <input type="file" accept=".csv" onChange={handleFileUpload} className="w-full" />

          <label className="mt-2">Or paste CSV</label>
          <textarea value={csvText} onChange={e=>setCsvText(e.target.value)} rows={6} className="w-full p-2 rounded border" />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={handleRun} className="p-2 rounded bg-blue-600 text-white">Run Backtest</button>
            <button onClick={()=>{ setCsvText(''); setData([]); setResults(null); }} className="p-2 rounded border">Reset</button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Strategy</h3>
          <label>Fast SMA</label>
          <input type="number" value={fastLen} onChange={e=>setFastLen(Number(e.target.value))} className="w-full p-2 rounded border" />
          <label>Slow SMA</label>
          <input type="number" value={slowLen} onChange={e=>setSlowLen(Number(e.target.value))} className="w-full p-2 rounded border" />
          <label className="mt-2">Initial capital</label>
          <input type="number" value={initialCapital} onChange={e=>setInitialCapital(Number(e.target.value))} className="w-full p-2 rounded border" />
          <label>Risk per trade (%)</label>
          <input type="number" value={riskPerTradePct} onChange={e=>setRiskPerTradePct(Number(e.target.value))} className="w-full p-2 rounded border" />
          <label>Spread (pips)</label>
          <input type="number" step="0.1" value={spreadPips} onChange={e=>setSpreadPips(Number(e.target.value))} className="w-full p-2 rounded border" />
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Data preview</h3>
          <div className="h-48 overflow-auto text-xs border p-2">
            {data.length===0 ? <div className="text-gray-500">No data loaded</div> : data.slice(0,100).map((d,i)=>(
              <div key={i} className="pb-1 border-b">{d.date.toISOString()} O:{d.open} H:{d.high} L:{d.low} C:{d.close}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        {!results && <div className="text-gray-500">Run a backtest to see results.</div>}
        {results && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border p-3 rounded">
              <h3 className="font-semibold mb-2">Summary</h3>
              <div>Final equity: <strong>{results.finalEquity.toFixed(2)}</strong></div>
              <div>Net P&L: <strong>{results.netPnL.toFixed(2)}</strong></div>
              <div>Trades: <strong>{results.trades.length}</strong></div>
              <div>Win rate: <strong>{results.winRate.toFixed(1)}%</strong></div>
              <div>Max drawdown: <strong>{(results.maxDrawdown*100).toFixed(2)}%</strong></div>
              <div className="mt-2 flex gap-2">
                <button onClick={exportTradesCSV} className="p-2 rounded border">Export Trades CSV</button>
                <button onClick={()=>{ const blob=new Blob([JSON.stringify(results,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${pair}_results.json`; a.click(); URL.revokeObjectURL(url); }} className="p-2 rounded border">Export JSON</button>
              </div>
            </div>

            <div className="border p-3 rounded">
              <h3 className="font-semibold mb-2">Equity Curve</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={results.equityCurve.map(p=>({ date: new Date(p.date).toISOString().slice(0,19).replace('T',' '), equity: Number(p.equity.toFixed(2)) }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="equity" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="md:col-span-2 border p-3 rounded">
              <h3 className="font-semibold mb-2">Trades</h3>
              <div className="max-h-64 overflow-auto text-xs">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="text-left border-b"><th>Entry</th><th>Exit</th><th>EntryP</th><th>ExitP</th><th>PnL</th></tr>
                  </thead>
                  <tbody>
                    {results.trades.map((t,i)=> (
                      <tr key={i} className={i%2===0? 'bg-white':'bg-gray-50'}>
                        <td>{new Date(t.entryDate).toLocaleString()}</td>
                        <td>{new Date(t.exitDate).toLocaleString()}</td>
                        <td>{t.entryPrice.toFixed(5)}</td>
                        <td>{t.exitPrice.toFixed(5)}</td>
                        <td>{t.pnl.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-6 text-sm text-gray-600">Tip: Use clean OHLC CSV. Try small sample files first.</footer>
    </div>
  )
}

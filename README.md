KingPC's Backtest — TradingView-style (Real data + Full Replay Mode)

Files included:
- api/candles.js  (Vercel serverless proxy to Twelve Data)
- src/ChartReplay.jsx (lightweight-charts replay + controls)
- src/ForexBacktester.jsx (main app integrating chart + trade panel)
- other standard vite/react files

Setup:
1. Add your Twelve Data API key in Vercel as environment variable TWELVE_API_KEY.
2. Deploy on Vercel (it will run serverless functions from /api).
3. Enjoy bar-replay and simulated trades.


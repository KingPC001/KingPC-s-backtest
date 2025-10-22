KingPC's Backtest — TradingView-style (Live data + Full Replay Mode)

Features:
- TradingView-like candlestick chart (lightweight-charts)
- Live forex data via Vercel API proxy (Twelve Data or similar)
- Full replay (bar-by-bar) with selectable replay speed (presets + slider)
- Light / Dark mode toggle
- Trade simulator (Buy/Sell) and trade history
- Deploy on Vercel (set TWELVE_API_KEY env var)

Setup:
1. Add your Twelve Data API key in Vercel as environment variable TWELVE_API_KEY.
2. Deploy on Vercel (it will run serverless functions from /api).
3. Open the site and use the replay controls.

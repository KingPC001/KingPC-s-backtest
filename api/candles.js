export default async function handler(req, res) {
  const { pair, interval = '1h', outputsize = '1000' } = req.query;
  if (!pair) return res.status(400).json({ error: 'missing pair' });
  const symbol = pair.includes('/') ? pair.replace('/', '') : pair;
  const apikey = process.env.TWELVE_API_KEY;
  if (!apikey) return res.status(500).json({ error: 'API key not configured' });
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&outputsize=${outputsize}&format=JSON&apikey=${apikey}`;
  try {
    const r = await fetch(url);
    const json = await r.json();
    return res.status(200).json(json);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'failed fetching data' });
  }
}

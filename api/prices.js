export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=3600'); // cache 1 hour on Vercel edge

  try {
    const response = await fetch(
      'https://online-price-watch.consumer.org.hk/opw/opendata/pricewatch.json',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!response.ok) throw new Error('OPW returned ' + response.status);
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}

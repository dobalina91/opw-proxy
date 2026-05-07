export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    return;
  }

  try {
    const { image, mimeType } = req.body;

    if (!image) {
      res.status(400).json({ error: 'No image provided' });
      return;
    }

    const prompt = 'Analyse this grocery price tag or receipt photo. Extract ALL grocery items with their prices. Return ONLY a valid JSON array, no other text, no markdown fences. Each element must be: {"item":"item name in English","qty":"quantity e.g. 500g or 1kg or 2pcs","price":numeric_price_only,"currency":"HKD or CNY","store":"store name if visible or empty string"}. Use CNY for Costco Shenzhen or Sams Club Shenzhen receipts. Use HKD for Hong Kong supermarkets. If no grocery items are found, return an empty array [].';

    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: image
              }
            },
            { text: prompt }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2000
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(502).json({ error: 'Gemini API error: ' + response.status, detail: errText });
      return;
    }

    const data = await response.json();

    // Extract text from Gemini response
    let text = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      data.candidates[0].content.parts.forEach(function(part) {
        if (part.text) text += part.text;
      });
    }

    // Parse JSON from response
    let items = [];
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      items = JSON.parse(clean);
    } catch (e) {
      // Try to find JSON array in the text
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        try { items = JSON.parse(match[0]); } catch (e2) { /* give up */ }
      }
    }

    res.status(200).json({ items: items, raw: text });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}

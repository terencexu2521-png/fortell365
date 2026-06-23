// Test function for Vercel Serverless
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return res.status(200).json({ status: 'api works!' });
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const input = JSON.parse(body);
        return res.status(200).json({ received: input, status: 'ok' });
      } catch(e) {
        return res.status(400).json({ error: 'Invalid JSON' });
      }
    });
    return;
  }
  return res.status(405).json({ error: 'Method not allowed' });
};

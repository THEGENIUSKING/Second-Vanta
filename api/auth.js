const crypto = require('crypto');

function setCors(req, res) {
  const allowed = new Set([
    process.env.ALLOWED_ORIGIN,
    'http://localhost:3000',
    'http://localhost:5173',
  ].filter(Boolean));
  const origin = req.headers.origin || '';
  if (allowed.has(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pin } = req.body || {};
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return res.status(500).json({ error: 'Auth not configured on server.' });

  const pinBuf   = Buffer.from(String(pin   || ''));
  const adminBuf = Buffer.from(String(adminPin));
  const match = pinBuf.length === adminBuf.length &&
    crypto.timingSafeEqual(pinBuf, adminBuf);

  if (!match) return res.status(401).json({ error: 'Invalid PIN' });

  const timestamp = Date.now().toString();
  const hmac = crypto.createHmac('sha256', adminPin).update(timestamp).digest('hex');
  const token = Buffer.from(`${timestamp}:${hmac}`).toString('base64');

  return res.status(200).json({ token, expiresIn: 86400 });
};

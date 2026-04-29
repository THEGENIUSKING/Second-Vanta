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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Admin-Token');
  res.setHeader('Vary', 'Origin');
}

function verifyAdminToken(req) {
  const token = req.headers['x-admin-token'] || '';
  if (!token) return false;
  try {
    const adminPin = process.env.ADMIN_PIN;
    if (!adminPin) return false;
    const decoded  = Buffer.from(token, 'base64').toString('utf8');
    const colonIdx = decoded.lastIndexOf(':');
    if (colonIdx === -1) return false;
    const ts   = decoded.substring(0, colonIdx);
    const hmac = decoded.substring(colonIdx + 1);
    if (Date.now() - parseInt(ts, 10) > 86400000) return false;
    const expected = crypto.createHmac('sha256', adminPin).update(ts).digest('hex');
    if (hmac.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expected, 'hex'));
  } catch { return false; }
}

async function getFreshToken() {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  });
  const d = await r.json();
  if (!r.ok || !d.access_token) throw new Error(`Token refresh failed: ${d.error_description || d.error}`);
  return d.access_token;
}

async function appendToSheet(token, sheetId, tabName, rows) {
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabName)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: rows }),
    }
  );
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || `Sheets error ${r.status}`);
  return d;
}

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (!process.env.GOOGLE_REFRESH_TOKEN) return res.status(500).json({ error: 'Google credentials not configured.' });

    const TRIUMASSESS_SHEET_ID = process.env.TRIUMASSESS_SHEET_ID;
    const VANTA_SHEET_ID       = process.env.VANTA_SHEET_ID;
    if (!TRIUMASSESS_SHEET_ID || !VANTA_SHEET_ID)
      return res.status(500).json({ error: 'Sheet IDs (TRIUMASSESS_SHEET_ID, VANTA_SHEET_ID) not configured in environment.' });

    const gtoken = await getFreshToken();
    const { idea, target } = req.body;
    if (!idea) return res.status(400).json({ error: 'Missing idea' });

    const TRIASSESS_HEADERS = [
      'Idea name','Submitted by','Idea Node','What is your idea?','Problem',
      'Solution','Similar solutions','Target customers','Go-to-market','Monetization','Additional',
    ];
    const triRow = [
      idea.name        || '',
      idea.submitter   || idea.lead || 'Vanta',
      idea.sector      || '',
      idea.description || '',
      idea.problem     || idea.description || '',
      idea.solution    || '',
      idea.similarSolutions || '',
      idea.targetCustomer   || '',
      idea.goToMarket       || '',
      idea.monetization     || idea.expectedRevenue || '',
      `Source: ${idea.origination || 'External'} | Added from Vanta on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    ];

    const checkRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${TRIUMASSESS_SHEET_ID}/values/Ideas!A1:A2`,
      { headers: { Authorization: `Bearer ${gtoken}` } }
    );
    const checkD = await checkRes.json();
    const hasHeaders = checkD.values?.length > 0 && checkD.values[0][0];
    await appendToSheet(gtoken, TRIUMASSESS_SHEET_ID, 'Ideas', hasHeaders ? [triRow] : [TRIASSESS_HEADERS, triRow]);

    if (target === 'bank') {
      const bankRow = [
        '', idea.name || '', idea.origination || 'External', new Date().getFullYear(),
        idea.lead || '—', idea.stage || 'Idea', idea.phase || 'Awaiting Review', '',
        idea.rating || '', '', '',
        '', '', '', '', '', '', '', '', '',
        '', '', idea.sector || '', idea.description || '', idea.targetCustomer || '',
        idea.valueProposition || idea.solution || '', '', '', idea.expectedRevenue || '',
        '', '', idea.milestones || '', idea.nextStep || '',
      ];
      await appendToSheet(gtoken, VANTA_SHEET_ID, 'Bank', [bankRow]);
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Sheets write error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT       = 8080;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE  = path.join(__dirname, 'trades.json');

const MIME = {
  '.html': 'text/html',
  '.css' : 'text/css',
  '.js'  : 'application/javascript',
  '.json': 'application/json',
};

// Create trades.json if it doesn't exist
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

// ── Charge calculations (verified against Zerodha contract note) ──────────────
function calcCharges(t) {
  const qty          = t.lots * t.lotSize;
  const buyTurn      = qty * t.entryPrice;
  const sellTurn     = qty * t.exitPrice;
  const totalTurn    = buyTurn + sellTurn;
  const dir          = t.tradeType === 'BUY' ? 1 : -1;

  const grossPnL      = parseFloat((dir * (t.exitPrice - t.entryPrice) * qty).toFixed(2));
  const brokerage     = parseFloat((Math.min(0.005 * buyTurn, 50) + Math.min(0.005 * sellTurn, 50)).toFixed(2));
  const exchCharges   = parseFloat((0.0003553 * totalTurn).toFixed(2));
  const stt           = Math.round(0.001 * sellTurn);
  const sebi          = parseFloat(((10 / 10000000) * totalTurn).toFixed(2));
  const stampDuty     = Math.round(0.00003 * buyTurn);
  const gstBase       = brokerage + exchCharges + sebi;
  const cgst          = parseFloat((0.09 * gstBase).toFixed(2));
  const sgst          = parseFloat((0.09 * gstBase).toFixed(2));
  const totalCharges  = parseFloat((brokerage + exchCharges + stt + sebi + stampDuty + cgst + sgst).toFixed(2));
  const netPnL        = parseFloat((grossPnL - totalCharges).toFixed(2));

  return { grossPnL, brokerage, exchCharges, cgst, sgst, stt, sebi, stampDuty, totalCharges, netPnL };
}

// ── Route handlers ─────────────────────────────────────────────────────────────
function addTrade(req, res) {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    try {
      const trade    = JSON.parse(body);
      const charges  = calcCharges(trade);
      const trades   = JSON.parse(fs.readFileSync(DATA_FILE));
      const record   = { id: Date.now(), ...trade, ...charges, createdAt: new Date().toISOString() };
      trades.push(record);
      fs.writeFileSync(DATA_FILE, JSON.stringify(trades, null, 2));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, trade: record }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

// ── Main server ────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'POST' && req.url === '/api/trade') return addTrade(req, res);

  const filePath    = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  const contentType = MIME[path.extname(filePath)] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Zerodha Journal running at http://localhost:${PORT}`);
  exec(`open http://localhost:${PORT}`);
});

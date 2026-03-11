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

if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

// ── Charge calculations ───────────────────────────────────────────────────────
function calcCharges(t) {
  const qty        = t.lots * t.lotSize;
  const buyTurn    = qty * t.entryPrice;
  const sellTurn   = qty * t.exitPrice;
  const totalTurn  = buyTurn + sellTurn;
  const dir        = t.tradeType === 'BUY' ? 1 : -1;

  const grossPnL    = parseFloat((dir * (t.exitPrice - t.entryPrice) * qty).toFixed(2));
  const brokerage   = parseFloat((Math.min(0.005 * buyTurn, 50) + Math.min(0.005 * sellTurn, 50)).toFixed(2));
  const exchCharges = parseFloat((0.0003553 * totalTurn).toFixed(2));
  const stt         = Math.round(0.001 * sellTurn);
  const sebi        = parseFloat(((10 / 10000000) * totalTurn).toFixed(2));
  const stampDuty   = Math.round(0.00003 * buyTurn);
  const gstBase     = brokerage + exchCharges + sebi;
  const cgst        = parseFloat((0.09 * gstBase).toFixed(2));
  const sgst        = parseFloat((0.09 * gstBase).toFixed(2));
  const totalChg    = parseFloat((brokerage + exchCharges + stt + sebi + stampDuty + cgst + sgst).toFixed(2));
  const netPnL      = parseFloat((grossPnL - totalChg).toFixed(2));

  return { grossPnL, brokerage, exchCharges, cgst, sgst, stt, sebi, stampDuty, totalChg, netPnL };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function readTrades()        { return JSON.parse(fs.readFileSync(DATA_FILE)); }
function writeTrades(trades) { fs.writeFileSync(DATA_FILE, JSON.stringify(trades, null, 2)); }

function sendJSON(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
  });
}

// ── Route handlers ────────────────────────────────────────────────────────────
function getTrades(req, res) {
  try {
    const trades = readTrades();
    sendJSON(res, 200, { success: true, trades });
  } catch(e) {
    sendJSON(res, 400, { error: e.message });
  }
}

async function addTrade(req, res) {
  try {
    const trade   = await parseBody(req);
    const charges = calcCharges(trade);
    const trades  = readTrades();
    const tradeNo = trades.length + 1;
    const record  = { id: Date.now(), tradeNo, ...trade, ...charges, createdAt: new Date().toISOString() };
    trades.push(record);
    writeTrades(trades);
    sendJSON(res, 200, { success: true, trade: record });
  } catch(e) {
    sendJSON(res, 400, { error: e.message });
  }
}

async function editTrade(req, res, id) {
  try {
    const updated = await parseBody(req);
    const charges = calcCharges(updated);
    const trades  = readTrades();
    const idx     = trades.findIndex(t => t.id === id);
    if (idx === -1) return sendJSON(res, 404, { error: 'Trade not found' });
    trades[idx]   = { ...trades[idx], ...updated, ...charges };
    writeTrades(trades);
    sendJSON(res, 200, { success: true, trade: trades[idx] });
  } catch(e) {
    sendJSON(res, 400, { error: e.message });
  }
}

function deleteTrade(req, res, id) {
  try {
    const trades  = readTrades();
    const updated = trades.filter(t => t.id !== id);
    if (updated.length === trades.length) return sendJSON(res, 404, { error: 'Trade not found' });
    writeTrades(updated);
    sendJSON(res, 200, { success: true });
  } catch(e) {
    sendJSON(res, 400, { error: e.message });
  }
}

// ── Main server ───────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const tradeMatch = req.url.match(/^\/api\/trade\/(\d+)$/);

  if (req.method === 'GET'    && req.url === '/api/trades')  return getTrades(req, res);
  if (req.method === 'POST'   && req.url === '/api/trade')   return addTrade(req, res);
  if (req.method === 'PUT'    && tradeMatch)                 return editTrade(req, res, parseInt(tradeMatch[1]));
  if (req.method === 'DELETE' && tradeMatch)                 return deleteTrade(req, res, parseInt(tradeMatch[1]));

  const cleanUrl    = req.url.split('?')[0];
  const filePath    = path.join(PUBLIC_DIR, cleanUrl === '/' ? 'index.html' : cleanUrl);
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

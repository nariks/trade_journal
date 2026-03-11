// ── Constants ──────────────────────────────────────────────────────────────────
const LOT_SIZES = { NIFTY: 65, BANKNIFTY: 30, FINNIFTY: 65, MIDCPNIFTY: 120, SENSEX: 20 };
const API = { TRADES: '/api/trades', TRADE: '/api/trade' };

// ── Number formatting ──────────────────────────────────────────────────────────
function fmt(n) {
  const v = parseFloat(n);
  return (v >= 0 ? '+' : '') + v.toFixed(2);
}

function fmtAbs(n) {
  return parseFloat(n).toFixed(2);
}

// ── Charge calculations (verified against Zerodha contract note) ───────────────
function calculate(lots, lotSize, entryPrice, exitPrice, tradeType) {
  const qty       = lots * lotSize;
  const buyTurn   = qty * entryPrice;
  const sellTurn  = qty * exitPrice;
  const totalTurn = buyTurn + sellTurn;
  const dir       = tradeType === 'BUY' ? 1 : -1;

  const grossPnL    = parseFloat((dir * (exitPrice - entryPrice) * qty).toFixed(2));
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

// ── Aggregate charges for a group of trades (day level) ───────────────────────
function calculateDayCharges(trades) {
  let buyTurn = 0, sellTurn = 0, grossPnL = 0;

  trades.forEach(t => {
    const qty  = t.lots * t.lotSize;
    const dir  = t.tradeType === 'BUY' ? 1 : -1;
    buyTurn   += qty * t.entryPrice;
    sellTurn  += qty * t.exitPrice;
    grossPnL  += parseFloat((dir * (t.exitPrice - t.entryPrice) * qty).toFixed(2));
  });

  const totalTurn   = buyTurn + sellTurn;
  const brokerage   = trades.reduce((a, t) => {
    const qty = t.lots * t.lotSize;
    return a + Math.min(0.005 * qty * t.entryPrice, 50) + Math.min(0.005 * qty * t.exitPrice, 50);
  }, 0);
  const brok        = parseFloat(brokerage.toFixed(2));
  const exchCharges = parseFloat((0.0003553 * totalTurn).toFixed(2));
  const stt         = Math.round(0.001 * sellTurn);
  const sebi        = parseFloat(((10 / 10000000) * totalTurn).toFixed(2));
  const stampDuty   = Math.round(0.00003 * buyTurn);
  const gstBase     = brok + exchCharges + sebi;
  const cgst        = parseFloat((0.09 * gstBase).toFixed(2));
  const sgst        = parseFloat((0.09 * gstBase).toFixed(2));
  const totalChg    = parseFloat((brok + exchCharges + stt + sebi + stampDuty + cgst + sgst).toFixed(2));
  const netPnL      = parseFloat((grossPnL - totalChg).toFixed(2));

  return { grossPnL: parseFloat(grossPnL.toFixed(2)), brokerage: brok, exchCharges, stt, sebi, stampDuty, cgst, sgst, totalChg, netPnL };
}

// ── Message display ────────────────────────────────────────────────────────────
function showMsg(elId, text, ok) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = text;
  el.style.color = ok ? '#4ade80' : '#f87171';
  setTimeout(() => el.textContent = '', 4000);
}

// ── Nav active link highlighting ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('nav a');
  links.forEach(link => {
    if (link.href === window.location.href) link.classList.add('active');
  });
});

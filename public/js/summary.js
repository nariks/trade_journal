let allTrades    = [];
let activeYear   = null;
let filterActive = false;

// ── Init ───────────────────────────────────────────────────────────────────────
async function init() {
  try {
    const res  = await fetch(API.TRADES);
    const data = await res.json();
    allTrades  = data.trades;
    renderYearGrid();
  } catch(e) {
    console.error('Could not load trades', e);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(d) {
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${day}-${months[parseInt(m)-1]}-${y}`;
}

function taxYearLabel(ty) {
  const [s, e] = ty.split('-');
  return `FY ${s}-${e.slice(2)}`;
}

function getTaxYear(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  return m >= 4 ? `${y}-${y+1}` : `${y-1}-${y}`;
}

function groupByTaxYear(trades) {
  const map = {};
  trades.forEach(t => {
    const ty = getTaxYear(t.date);
    if (!map[ty]) map[ty] = [];
    map[ty].push(t);
  });
  return map;
}

function groupByMonth(trades) {
  const map = {};
  trades.forEach(t => {
    const key = t.date.slice(0, 7);
    if (!map[key]) map[key] = [];
    map[key].push(t);
  });
  return map;
}

function groupByDay(trades) {
  const map = {};
  trades.forEach(t => {
    if (!map[t.date]) map[t.date] = [];
    map[t.date].push(t);
  });
  return map;
}

function monthLabel(key) {
  const [y, m] = key.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m)-1]} ${y}`;
}

// ── Year grid ──────────────────────────────────────────────────────────────────
function renderYearGrid() {
  const byYear = groupByTaxYear(allTrades);
  const grid   = document.getElementById('yearGrid');

  if (!Object.keys(byYear).length) {
    grid.innerHTML = '<div class="empty"><div class="empty-icon">📊</div><div>No trades yet.</div></div>';
    return;
  }

  grid.innerHTML = Object.keys(byYear).sort().reverse().map(ty => {
    const c   = calculateDayCharges(byYear[ty]);
    const pos = c.netPnL >= 0;
    return `
      <div class="year-card ${activeYear === ty ? 'active' : ''}" onclick="selectYear('${ty}')">
        <div class="year-label">${taxYearLabel(ty)}</div>
        <div class="year-pnl ${pos ? 'positive' : 'negative'}">${fmt(c.netPnL)}</div>
      </div>`;
  }).join('');
}

function selectYear(ty) {
  activeYear = ty;
  renderYearGrid();
  const trades = groupByTaxYear(allTrades)[ty] || [];
  renderMonthDrill(trades, ty);
}

// ── Month drill down ───────────────────────────────────────────────────────────
function renderMonthDrill(trades, ty) {
  const section = document.getElementById('drillSection');
  const byMonth = groupByMonth(trades);
  const months  = Object.keys(byMonth).sort().reverse();
  const totals  = calculateDayCharges(trades);

  section.innerHTML = `
    <div style="font-size:13px; font-weight:700; color:#8b949e; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.5px;">${taxYearLabel(ty)}</div>
    ${months.map(m => renderMonthRow(m, byMonth[m])).join('')}
    <div style="padding:12px 14px; border-top:2px solid #21262d; display:flex; gap:24px; font-weight:700; font-size:13px; margin-top:4px;">
      <span style="min-width:140px;">Total</span>
      <div style="display:flex; gap:24px; margin-left:auto;">
        <span>Gross: <strong class="${totals.grossPnL >= 0 ? 'positive':'negative'}">${fmt(totals.grossPnL)}</strong></span>
        <span>Fees: <strong class="negative">-${totals.totalChg.toFixed(2)}</strong></span>
        <span>Net: <strong class="${totals.netPnL >= 0 ? 'positive':'negative'}">${fmt(totals.netPnL)}</strong></span>
      </div>
    </div>`;
}

function renderMonthRow(monthKey, trades) {
  const id = `month-${monthKey}`;
  const c  = calculateDayCharges(trades);
  return `
    <div class="drill">
      <div class="drill-header month-header" onclick="toggleDrill('${id}')">
        <span class="drill-arrow" id="arr-${id}">▶</span>
        <span class="drill-label">${monthLabel(monthKey)}</span>
        <div class="drill-stats">
          <span>Trades: <strong>${trades.length}</strong></span>
          <span>Gross: <strong class="${c.grossPnL >= 0 ? 'positive':'negative'}">${fmt(c.grossPnL)}</strong></span>
          <span>Fees: <strong class="negative">-${c.totalChg.toFixed(2)}</strong></span>
          <span>Net: <strong class="${c.netPnL >= 0 ? 'positive':'negative'}">${fmt(c.netPnL)}</strong></span>
        </div>
      </div>
      <div class="drill-body" id="${id}">
        ${renderDayRows(trades)}
      </div>
    </div>`;
}

// ── Day drill down ─────────────────────────────────────────────────────────────
function renderDayRows(trades) {
  const byDay = groupByDay(trades);
  return Object.keys(byDay).sort().reverse().map(date => {
    const id = `day-${date}`;
    const c  = calculateDayCharges(byDay[date]);
    return `
      <div class="drill">
        <div class="drill-header day-header" onclick="toggleDrill('${id}')">
          <span class="drill-arrow" id="arr-${id}">▶</span>
          <span class="drill-label">${fmtDate(date)}</span>
          <div class="drill-stats">
            <span>Trades: <strong>${byDay[date].length}</strong></span>
            <span>Gross: <strong class="${c.grossPnL >= 0 ? 'positive':'negative'}">${fmt(c.grossPnL)}</strong></span>
            <span>Net: <strong class="${c.netPnL >= 0 ? 'positive':'negative'}">${fmt(c.netPnL)}</strong></span>
          </div>
        </div>
        <div class="drill-body" id="${id}">
          ${renderDayDetail(byDay[date], date, c)}
        </div>
      </div>`;
  }).join('');
}

function renderDayDetail(trades, date, c) {
  const feeId = `fees-${date}`;
  return `
    <div class="day-detail">
      <div class="day-detail-header">
        <span>Instrument</span>
        <span style="text-align:center">Type</span>
        <span>Lots</span>
        <span>Entry</span>
        <span>Exit</span>
        <span>Gross P&L</span>
      </div>
      ${trades.map(t => {
        const gp = parseFloat(t.grossPnL || 0);
        return `
          <div class="day-detail-row">
            <span><strong>${t.symbol} ${t.strike} ${t.optionType}</strong>${t.notes ? `<br><span class="note-text">${t.notes}</span>` : ''}</span>
            <span>B/S</span>
            <span>${t.lots} × ${t.lotSize}</span>
            <span>${parseFloat(t.entryPrice).toFixed(2)}</span>
            <span>${parseFloat(t.exitPrice).toFixed(2)}</span>
            <span class="${gp >= 0 ? 'positive' : 'negative'}">${fmt(gp)}</span>
          </div>`;
      }).join('')}
      <hr class="detail-divider">
      <div class="detail-pnl-row">
        <span>PROFIT / LOSS</span>
        <span class="${c.grossPnL >= 0 ? 'positive' : 'negative'}" style="font-weight:700">${fmt(c.grossPnL)}</span>
      </div>
      <div class="fees-toggle" onclick="toggleFees('${feeId}')">
        <span class="fees-toggle-label">
          <span class="drill-arrow" id="arr-${feeId}">▶</span>Fees
        </span>
        <span class="fees-toggle-amount">-${c.totalChg.toFixed(2)}</span>
      </div>
      <div class="fees-breakdown" id="${feeId}">
        <div class="fee-row"><span>Brokerage</span><span>-${c.brokerage.toFixed(2)}</span></div>
        <div class="fee-row"><span>Exchange transaction charges</span><span>-${c.exchCharges.toFixed(2)}</span></div>
        <div class="fee-row"><span>CGST (@9% of Brok, SEBI, Trans & Clearing)</span><span>-${c.cgst.toFixed(2)}</span></div>
        <div class="fee-row"><span>SGST (@9% of Brok, SEBI, Trans & Clearing)</span><span>-${c.sgst.toFixed(2)}</span></div>
        <div class="fee-row"><span>Securities transaction tax</span><span>-${c.stt.toFixed(2)}</span></div>
        <div class="fee-row"><span>SEBI turnover fees</span><span>-${c.sebi.toFixed(2)}</span></div>
        <div class="fee-row"><span>Stamp duty</span><span>-${c.stampDuty.toFixed(2)}</span></div>
      </div>
      <hr class="detail-divider">
      <div class="detail-net-row">
        <span>Net P&L</span>
        <span class="${c.netPnL >= 0 ? 'positive' : 'negative'}">${fmt(c.netPnL)}</span>
      </div>
    </div>`;
}

// ── Toggle helpers ─────────────────────────────────────────────────────────────
function toggleDrill(id) {
  const body  = document.getElementById(id);
  const arrow = document.getElementById(`arr-${id}`);
  if (body)  body.classList.toggle('open');
  if (arrow) arrow.classList.toggle('open');
}

function toggleFees(id) {
  const body  = document.getElementById(id);
  const arrow = document.getElementById(`arr-${id}`);
  if (body)  body.classList.toggle('open');
  if (arrow) arrow.classList.toggle('open');
}

// ── Filter ─────────────────────────────────────────────────────────────────────
function applyFilter() {
  const from = document.getElementById('filterFrom').value;
  const to   = document.getElementById('filterTo').value;
  const sym  = document.getElementById('filterSymbol').value;
  const type = document.getElementById('filterType').value;

  if (!from && !to && !sym && !type) return;

  filterActive = true;
  document.getElementById('yearSection').style.display   = 'none';
  document.getElementById('filterSection').style.display = 'block';

  const filtered = allTrades.filter(t => {
    if (from && t.date < from)         return false;
    if (to   && t.date > to)           return false;
    if (sym  && t.symbol !== sym)      return false;
    if (type && t.optionType !== type) return false;
    return true;
  });

  renderFilterResults(filtered);
}

function renderFilterResults(trades) {
  const el = document.getElementById('filterResults');

  if (!trades.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">🔍</div><div>No trades found.</div></div>';
    return;
  }

  const byDay  = groupByDay(trades);
  const totals = calculateDayCharges(trades);

  el.innerHTML = Object.keys(byDay).sort().reverse().map(date => {
    const c   = calculateDayCharges(byDay[date]);
    return `
      <div class="filter-day">
        <div class="filter-day-header" onclick="toggleDrill('fd-${date}')">
          <span class="drill-arrow" id="arr-fd-${date}">▶</span>
          <span class="fdate">${fmtDate(date)}</span>
          <div class="drill-stats">
            <span>Trades: <strong>${byDay[date].length}</strong></span>
            <span>Gross: <strong class="${c.grossPnL >= 0 ? 'positive':'negative'}">${fmt(c.grossPnL)}</strong></span>
            <span>Net: <strong class="${c.netPnL >= 0 ? 'positive':'negative'}">${fmt(c.netPnL)}</strong></span>
          </div>
        </div>
        <div class="drill-body" id="fd-${date}">
          ${renderDayDetail(byDay[date], date, c)}
        </div>
      </div>`;
  }).join('') + `
    <div style="padding:14px 16px; border-top:2px solid #21262d; display:flex; gap:24px; font-weight:700; font-size:13px; margin-top:8px;">
      <span>Total (${trades.length} trades)</span>
      <div style="display:flex; gap:24px; margin-left:auto;">
        <span>Gross: <strong class="${totals.grossPnL >= 0 ? 'positive':'negative'}">${fmt(totals.grossPnL)}</strong></span>
        <span>Fees: <strong class="negative">-${totals.totalChg.toFixed(2)}</strong></span>
        <span>Net: <strong class="${totals.netPnL >= 0 ? 'positive':'negative'}">${fmt(totals.netPnL)}</strong></span>
      </div>
    </div>`;
}

function clearFilter() {
  document.getElementById('filterFrom').value   = '';
  document.getElementById('filterTo').value     = '';
  document.getElementById('filterSymbol').value = '';
  document.getElementById('filterType').value   = '';
  filterActive = false;
  document.getElementById('yearSection').style.display   = 'block';
  document.getElementById('filterSection').style.display = 'none';
  activeYear = null;
  renderYearGrid();
  document.getElementById('drillSection').innerHTML = '';
}

init();

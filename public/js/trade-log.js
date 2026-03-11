const DAYS_PER_PAGE = 10;
let allTrades   = [];
let currentPage = 1;

async function loadTrades() {
  try {
    const res  = await fetch(API.TRADES);
    const data = await res.json();
    allTrades  = data.trades;
    applyFilters();
  } catch(e) {
    showMsg('msg', '❌ Could not load trades.', false);
  }
}

function applyFilters() {
  currentPage   = 1;
  const sym     = document.getElementById('filterSymbol').value;
  const from    = document.getElementById('filterFrom').value;
  const to      = document.getElementById('filterTo').value;

  const filtered = allTrades.filter(t => {
    if (sym  && t.symbol !== sym)  return false;
    if (from && t.date   <  from)  return false;
    if (to   && t.date   >  to)    return false;
    return true;
  });

  renderGroups(filtered);
}

function groupByDay(trades) {
  const map = {};
  trades.forEach(t => {
    if (!map[t.date]) map[t.date] = [];
    map[t.date].push(t);
  });
  return Object.keys(map)
    .sort((a, b) => b.localeCompare(a)) // newest first
    .map(date => ({ date, trades: map[date] }));
}

function renderGroups(trades) {
  const container = document.getElementById('tradeGroups');
  const empty     = document.getElementById('emptyMsg');
  const groups    = groupByDay(trades);

  if (!groups.length) {
    container.innerHTML = '';
    empty.style.display = 'block';
    document.getElementById('pagination').innerHTML = '';
    return;
  }
  empty.style.display = 'none';

  const totalPages  = Math.ceil(groups.length / DAYS_PER_PAGE);
  const start       = (currentPage - 1) * DAYS_PER_PAGE;
  const pageGroups  = groups.slice(start, start + DAYS_PER_PAGE);

  container.innerHTML = pageGroups.map((g, idx) => {
    const isFirst = idx === 0 && currentPage === 1;
    return `
      <div class="group-wrap">
        <div class="group-header" onclick="toggleGroup('grp-${g.date}', this)">
          <span class="group-arrow ${isFirst ? 'open' : ''}">▶</span>
          <span class="group-date">${g.date}</span>
          <span class="group-count">${g.trades.length} trade${g.trades.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="group-body ${isFirst ? 'open' : ''}" id="grp-${g.date}">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Instrument</th>
                <th>Type</th>
                <th>Lots</th>
                <th>Entry ₹</th>
                <th>Exit ₹</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${g.trades.map(t => `
                <tr>
                  <td style="color:#8b949e">${t.tradeNo || '—'}</td>
                  <td><strong>${t.symbol} ${t.strike}</strong></td>
                  <td>
                    <span class="tag ${t.optionType === 'CE' ? 'tag-ce' : 'tag-pe'}">${t.optionType}</span>
                    <span class="tag ${t.tradeType  === 'BUY' ? 'tag-buy' : 'tag-sel'}" style="margin-left:4px">${t.tradeType}</span>
                  </td>
                  <td>${t.lots} × ${t.lotSize}</td>
                  <td>₹${parseFloat(t.entryPrice).toFixed(2)}</td>
                  <td>₹${parseFloat(t.exitPrice).toFixed(2)}</td>
                  <td>
                    <button class="btn-edit"   onclick="editTrade(${t.id})">✏️ Edit</button>
                    <button class="btn-delete" onclick="deleteTrade(${t.id})">🗑️</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }).join('');

  renderPagination(totalPages, groups.length);
}

function toggleGroup(id, header) {
  const body  = document.getElementById(id);
  const arrow = header.querySelector('.group-arrow');
  body.classList.toggle('open');
  arrow.classList.toggle('open');
}

function renderPagination(totalPages, totalDays) {
  const el = document.getElementById('pagination');
  if (totalPages <= 1) { el.innerHTML = ''; return; }

  let html = `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>← Prev</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button onclick="changePage(${i})" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
  }
  html += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>`;
  el.innerHTML = html;
}

function changePage(page) {
  currentPage = page;
  applyFilters();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function editTrade(id) {
  window.location.href = `/add-trade.html?edit=${id}`;
}

async function deleteTrade(id) {
  if (!confirm('Delete this trade?')) return;
  try {
    const res  = await fetch(`${API.TRADE}/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      allTrades = allTrades.filter(t => t.id !== id);
      applyFilters();
      showMsg('msg', '🗑️ Trade deleted.', true);
    } else {
      showMsg('msg', '❌ ' + data.error, false);
    }
  } catch(e) {
    showMsg('msg', '❌ Could not connect to server.', false);
  }
}

loadTrades();

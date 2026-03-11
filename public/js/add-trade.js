let lastSavedTrade = null;
let editingId      = null;

window.onload = async () => {
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
  setLotSize();

  ['entryPrice','exitPrice','lots','lotSize','tradeType'].forEach(id => {
    document.getElementById(id).addEventListener('input', previewCharges);
  });

  // Check if editing an existing trade
  const params  = new URLSearchParams(window.location.search);
  const editId  = params.get('edit');
  if (editId) {
    try {
      const res  = await fetch(API.TRADES);
      const data = await res.json();
      const trade = data.trades.find(t => t.id === parseInt(editId));
      if (trade) {
        editingId = trade.id;
        populateForm(trade);
        const btn = document.getElementById('saveBtn');
        btn.textContent = 'Update Trade';
        btn.onclick     = updateTrade;
      }
    } catch(e) {
      showMsg('msg', '❌ Could not load trade for editing.', false);
    }
  }
};

function setLotSize() {
  const sym = document.getElementById('symbol').value;
  document.getElementById('lotSize').value = LOT_SIZES[sym] || 65;
}

function previewCharges() {
  const entry = parseFloat(document.getElementById('entryPrice').value);
  const exit  = parseFloat(document.getElementById('exitPrice').value);
  const lots  = parseInt(document.getElementById('lots').value);
  const lotSz = parseInt(document.getElementById('lotSize').value);
  const ttype = document.getElementById('tradeType').value;

  if (!entry || !exit || !lots || !lotSz) {
    document.getElementById('chargePreview').classList.remove('show');
    return;
  }
  renderCharges(calculate(lots, lotSz, entry, exit, ttype), 'p');
  document.getElementById('chargePreview').classList.add('show');
}

function renderCharges(c, prefix) {
  const g = document.getElementById(`${prefix}-gross`);
  g.textContent = fmtAbs(c.grossPnL);
  g.className   = c.grossPnL >= 0 ? 'positive' : 'negative';

  document.getElementById(`${prefix}-brok`).textContent  = '-' + fmtAbs(c.brokerage);
  document.getElementById(`${prefix}-exch`).textContent  = '-' + fmtAbs(c.exchCharges);
  document.getElementById(`${prefix}-cgst`).textContent  = '-' + fmtAbs(c.cgst);
  document.getElementById(`${prefix}-sgst`).textContent  = '-' + fmtAbs(c.sgst);
  document.getElementById(`${prefix}-stt`).textContent   = '-' + fmtAbs(c.stt);
  document.getElementById(`${prefix}-sebi`).textContent  = '-' + fmtAbs(c.sebi);
  document.getElementById(`${prefix}-stamp`).textContent = '-' + fmtAbs(c.stampDuty);

  const n = document.getElementById(`${prefix}-net`);
  n.textContent = fmtAbs(c.netPnL);
  n.className   = c.netPnL >= 0 ? 'positive' : 'negative';
}

function getFormData() {
  return {
    date      : document.getElementById('date').value,
    expiry    : document.getElementById('expiry').value,
    symbol    : document.getElementById('symbol').value,
    strike    : parseFloat(document.getElementById('strike').value),
    optionType: document.getElementById('optionType').value,
    tradeType : document.getElementById('tradeType').value,
    lots      : parseInt(document.getElementById('lots').value),
    lotSize   : parseInt(document.getElementById('lotSize').value),
    entryPrice: parseFloat(document.getElementById('entryPrice').value),
    exitPrice : parseFloat(document.getElementById('exitPrice').value),
    notes     : document.getElementById('notes').value,
  };
}

function populateForm(t) {
  document.getElementById('date').value       = t.date;
  document.getElementById('expiry').value     = t.expiry || '';
  document.getElementById('symbol').value     = t.symbol;
  document.getElementById('strike').value     = t.strike;
  document.getElementById('optionType').value = t.optionType;
  document.getElementById('tradeType').value  = t.tradeType;
  document.getElementById('lots').value       = t.lots;
  document.getElementById('lotSize').value    = t.lotSize;
  document.getElementById('entryPrice').value = t.entryPrice;
  document.getElementById('exitPrice').value  = t.exitPrice;
  document.getElementById('notes').value      = t.notes || '';
  previewCharges();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function saveTrade() {
  const strike = document.getElementById('strike').value;
  const entry  = document.getElementById('entryPrice').value;
  const exit   = document.getElementById('exitPrice').value;

  if (!strike || !entry || !exit) {
    showMsg('msg', 'Please fill in Strike, Entry Price and Exit Price.', false);
    return;
  }

  const trade = getFormData();
  try {
    const res  = await fetch(API.TRADE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(trade) });
    const data = await res.json();
    if (data.success) {
      showSavedCard(data.trade);
      clearForm();
    } else {
      showMsg('msg', '❌ ' + data.error, false);
    }
  } catch(e) {
    showMsg('msg', '❌ Could not connect to server.', false);
  }
}

async function updateTrade() {
  const strike = document.getElementById('strike').value;
  const entry  = document.getElementById('entryPrice').value;
  const exit   = document.getElementById('exitPrice').value;

  if (!strike || !entry || !exit) {
    showMsg('msg', 'Please fill in Strike, Entry Price and Exit Price.', false);
    return;
  }

  const trade = getFormData();
  try {
    const res  = await fetch(`${API.TRADE}/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(trade) });
    const data = await res.json();
    if (data.success) {
      showSavedCard(data.trade);
      clearForm();
      resetSaveButton();
    } else {
      showMsg('msg', '❌ ' + data.error, false);
    }
  } catch(e) {
    showMsg('msg', '❌ Could not connect to server.', false);
  }
}

function showSavedCard(trade) {
  lastSavedTrade = trade;
  document.getElementById('savedMeta').innerHTML = `
    <span><strong>${trade.symbol}</strong></span>
    <span>Strike: <strong>${trade.strike} ${trade.optionType}</strong></span>
    <span>Type: <strong>${trade.tradeType}</strong></span>
    <span>Lots: <strong>${trade.lots} × ${trade.lotSize}</strong></span>
    <span>Entry: <strong>₹${trade.entryPrice}</strong></span>
    <span>Exit: <strong>₹${trade.exitPrice}</strong></span>
    ${trade.notes ? `<span>Notes: <strong>${trade.notes}</strong></span>` : ''}
  `;
  renderCharges(trade, 's');
  document.getElementById('savedCard').classList.add('show');
  document.getElementById('savedCard').scrollIntoView({ behavior: 'smooth' });
}

function editSaved() {
  if (!lastSavedTrade) return;
  editingId = lastSavedTrade.id;
  populateForm(lastSavedTrade);
  document.getElementById('savedCard').classList.remove('show');
  const btn = document.getElementById('saveBtn');
  btn.textContent = 'Update Trade';
  btn.onclick     = updateTrade;
}

async function deleteSaved() {
  if (!lastSavedTrade || !confirm('Delete this trade?')) return;
  try {
    const res  = await fetch(`${API.TRADE}/${lastSavedTrade.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      document.getElementById('savedCard').classList.remove('show');
      showMsg('msg', '🗑️ Trade deleted.', true);
      lastSavedTrade = null;
    } else {
      showMsg('msg', '❌ ' + data.error, false);
    }
  } catch(e) {
    showMsg('msg', '❌ Could not connect to server.', false);
  }
}

function resetSaveButton() {
  editingId = null;
  const btn = document.getElementById('saveBtn');
  btn.textContent = 'Save Trade';
  btn.onclick     = saveTrade;
}

function clearForm() {
  document.getElementById('strike').value     = '';
  document.getElementById('entryPrice').value = '';
  document.getElementById('exitPrice').value  = '';
  document.getElementById('notes').value      = '';
  document.getElementById('lots').value       = 1;
  document.getElementById('chargePreview').classList.remove('show');
}

# Changelog

All notable changes to Zerodha Options Trading Journal.

---

## Phase 3.1 — Refactor & Trade Log Rebuild
### Added
- `public/style.css` — shared styles across all pages
- `public/js/app.js` — shared utility functions: `fmt()`, `showMsg()`, `calculate()`, `LOT_SIZES`, nav highlighting
- `public/js/add-trade.js` — add trade page specific logic
- `public/js/trade-log.js` — trade log page specific logic
- `public/equity.html` — placeholder for equity curve (Phase 5)

### Changed
- `index.html` — nav updated, Summary tab added, styles/scripts moved out
- `add-trade.html` — styles and scripts moved to separate files
- `trade-log.html` — rebuilt: grouped by day, paginated (10 days/page), filters updated
- Trade Log filters — date range and symbol only, option type filter removed
- Trade Log columns — instrument, type, lots, entry, exit, actions only (no P&L/fees)
- Trade Log — most recent day expanded by default
- Nav — Daily Summary renamed to Summary

### Deferred
- `summary.html` — deferred to Phase 3.2

---

## Phase 3.0 — Trade Log
### Added
- `public/trade-log.html` — trade log table with filters
- `GET /api/trades` endpoint in `server.js`

### Changed
- `index.html` — nav link to trade log added

---

## Phase 2.3 — Post Save Display, Edit & Delete
### Added
- Post save green card showing full trade details and charge breakdown
- Edit button — repopulates form with saved trade data
- Delete button — removes trade with confirmation
- `PUT /api/trade/:id` endpoint in `server.js`
- `DELETE /api/trade/:id` endpoint in `server.js`

### Changed
- Default lot sizes corrected — NIFTY: 65
- `setLotSize()` called on page load

---

## Phase 2.2 — Default Lot Sizes (combined with 2.3)
### Changed
- Default lot sizes: NIFTY: 65, BANKNIFTY: 30, FINNIFTY: 65, MIDCPNIFTY: 120, SENSEX: 20

---

## Phase 2.1 — Instrument String Decoder
### Status: Parked
- Decoder for strings like `NIFTY2630224850PE` parked due to ambiguity in expiry format for Nov/Dec expiries

---

## Phase 2.0 — Add Trade Form
### Added
- `public/add-trade.html` — add trade form with live charge preview
- `POST /api/trade` endpoint in `server.js`
- Charge calculations verified against Zerodha contract note:
  - Brokerage: min(0.5% × leg turnover, ₹50) per leg
  - Exchange charges: 0.03553% of total turnover
  - STT: 0.1% of sell turnover, rounded to nearest integer
  - SEBI: ₹10 per crore of total turnover
  - Stamp duty: 0.003% of buy turnover, rounded to nearest integer
  - CGST/SGST: 9% each on (brokerage + exchange charges + SEBI)
- `trades.json` auto created on server start

### Known Issues
- Per trade charges slightly off due to rounding — charges should be calculated at day aggregate level. To be addressed in Phase 3.2 Summary page.

---

## Phase 1.0 — Basic Server
### Added
- `server.js` — Node.js HTTP server on port 8080, binds to localhost
- `public/index.html` — basic landing page
- `package.json` — project config
- `.gitignore` — excludes trades.json and node_modules

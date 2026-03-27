/* ============================================================
   SmartSpend – Central JavaScript Engine (app.js)
   ============================================================ */

'use strict';

/* ── Constants ── */
const DAILY_LIMIT = 500;
const STORAGE_KEYS = {
  USER: 'ss_user',
  TRANSACTIONS: 'ss_transactions',
  TIPS: 'ss_tips',
  THEME: 'ss_theme',
  GOAL: 'ss_goal',
};

const CATEGORY_ICONS = {
  'Food': '🍔', 'Transport': '🚌', 'Shopping': '🛍️',
  'Snacks': '🍿', 'Games': '🎮', 'Other': '💡',
};
const CATEGORY_COLORS = {
  'Food': '#3B5BDB', 'Transport': '#F06292', 'Shopping': '#10B981',
  'Snacks': '#F59E0B', 'Games': '#8B5CF6', 'Other': '#6B7280',
};

/* ─────────────────────────────────────────
   STORAGE HELPERS
───────────────────────────────────────── */
const store = {
  get: (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  remove: (key) => localStorage.removeItem(key),
};

/* ─────────────────────────────────────────
   AUTH FUNCTIONS
───────────────────────────────────────── */
function signupUser(name, role) {
  if (!name.trim()) return { ok: false, msg: 'Please enter your name.' };
  const existing = store.get(STORAGE_KEYS.USER);
  const user = { name: name.trim(), role };
  store.set(STORAGE_KEYS.USER, user);
  return { ok: true, msg: `Welcome, ${name}! Account created.` };
}

function loginUser(name, role) {
  if (!name.trim()) return { ok: false, msg: 'Please enter your name.' };
  const user = { name: name.trim(), role };
  store.set(STORAGE_KEYS.USER, user);
  return { ok: true, user };
}

function getCurrentUser() {
  return store.get(STORAGE_KEYS.USER);
}

function logout() {
  store.remove(STORAGE_KEYS.USER);
  window.location.href = 'login.html';
}

/* ─────────────────────────────────────────
   TRANSACTIONS
───────────────────────────────────────── */
function getTransactions() {
  return store.get(STORAGE_KEYS.TRANSACTIONS) || [];
}

function addTransaction(amount, category) {
  amount = parseFloat(amount);
  if (isNaN(amount) || amount <= 0) return { ok: false, msg: 'Enter a valid amount.' };
  if (!category) return { ok: false, msg: 'Select a category.' };

  const txns = getTransactions();
  const txn = {
    id: Date.now(),
    amount,
    category,
    date: new Date().toISOString(),
  };
  txns.unshift(txn);
  store.set(STORAGE_KEYS.TRANSACTIONS, txns);
  return { ok: true, txn };
}

function deleteTransaction(id) {
  const txns = getTransactions().filter(t => t.id !== id);
  store.set(STORAGE_KEYS.TRANSACTIONS, txns);
}

function getTodayTransactions() {
  const today = new Date().toDateString();
  return getTransactions().filter(t => new Date(t.date).toDateString() === today);
}

function calculateTotals(txns) {
  const total = txns.reduce((s, t) => s + t.amount, 0);
  const byCategory = {};
  txns.forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });
  return { total, byCategory };
}

function checkOverspending(todayTotal) {
  return todayTotal > DAILY_LIMIT;
}

/* ─────────────────────────────────────────
   DEMO DATA
───────────────────────────────────────── */
function loadDemoData() {
  const demo = [
    { id: Date.now() + 4, amount: 120, category: 'Food', date: new Date().toISOString() },
    { id: Date.now() + 3, amount: 200, category: 'Snacks', date: new Date().toISOString() },
    { id: Date.now() + 2, amount: 150, category: 'Transport', date: new Date().toISOString() },
    { id: Date.now() + 1, amount: 90, category: 'Games', date: new Date().toISOString() },
    { id: Date.now(),     amount: 75, category: 'Shopping', date: new Date(Date.now() - 86400000).toISOString() },
  ];
  const existing = getTransactions();
  store.set(STORAGE_KEYS.TRANSACTIONS, [...demo, ...existing]);
  return demo;
}

/* ─────────────────────────────────────────
   TIPS
───────────────────────────────────────── */
function getTips() {
  return store.get(STORAGE_KEYS.TIPS) || [];
}

function addParentTip(text) {
  if (!text.trim()) return { ok: false, msg: 'Tip cannot be empty.' };
  const tips = getTips();
  const tip = { id: Date.now(), text: text.trim(), date: new Date().toISOString() };
  tips.unshift(tip);
  store.set(STORAGE_KEYS.TIPS, tips);
  return { ok: true, tip };
}

function deleteTip(id) {
  const tips = getTips().filter(t => t.id !== id);
  store.set(STORAGE_KEYS.TIPS, tips);
}

/* ─────────────────────────────────────────
   GOAL
───────────────────────────────────────── */
function getGoal() {
  return store.get(STORAGE_KEYS.GOAL) || null;
}
function setGoal(name, target, saved) {
  store.set(STORAGE_KEYS.GOAL, { name, target: parseFloat(target), saved: parseFloat(saved) || 0 });
}

/* ─────────────────────────────────────────
   DARK MODE
───────────────────────────────────────── */
function initTheme() {
  const dark = store.get(STORAGE_KEYS.THEME) === 'dark';
  if (dark) document.body.classList.add('dark');
  return dark;
}
function toggleTheme() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  store.set(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
  return isDark;
}

/* ─────────────────────────────────────────
   DATE FORMATTING
───────────────────────────────────────── */
function formatDate(iso) {
  const d = new Date(iso);
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (d.toDateString() === today) return 'Today';
  if (d.toDateString() === yesterday) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatAmount(n) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/* ─────────────────────────────────────────
   PIE CHART (canvas-free SVG)
───────────────────────────────────────── */
function buildPieChart(byCategory, totalAmount, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!totalAmount) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><p>No data yet</p></div>';
    return;
  }

  const entries = Object.entries(byCategory);
  let startAngle = -Math.PI / 2;
  const cx = 90, cy = 90, r = 72;

  let paths = '';
  entries.forEach(([cat, val]) => {
    const pct = val / totalAmount;
    const angle = pct * 2 * Math.PI;
    const end = startAngle + angle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = angle > Math.PI ? 1 : 0;
    const color = CATEGORY_COLORS[cat] || '#aaa';
    paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z" fill="${color}" stroke="white" stroke-width="2"/>`;
    startAngle = end;
  });

  const svg = `<svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">${paths}
  <circle cx="${cx}" cy="${cy}" r="38" fill="var(--card-bg)"/>
  </svg>`;

  container.innerHTML = svg;
}

/* ─────────────────────────────────────────
   DISPLAY TRANSACTIONS
───────────────────────────────────────── */
function displayTransactions(containerId, txns, allowDelete) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!txns.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-icon">💸</div>
      <p>No transactions yet. Add your first one!</p>
    </div>`;
    return;
  }

  el.innerHTML = txns.map(t => `
    <div class="txn-card animate-in" data-id="${t.id}">
      <div class="txn-left">
        <div class="txn-icon">${CATEGORY_ICONS[t.category] || '💡'}</div>
        <div>
          <div class="txn-category">${t.category}</div>
          <div class="txn-date">${formatDate(t.date)}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:0.8rem">
        <div class="txn-amount">${formatAmount(t.amount)}</div>
        ${allowDelete ? `<button class="btn btn-ghost btn-sm" onclick="handleDeleteTxn(${t.id})" title="Delete">✕</button>` : ''}
      </div>
    </div>
  `).join('');
}

/* ─────────────────────────────────────────
   SHOW TIPS
───────────────────────────────────────── */
function showTips(containerId, allowDelete) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const tips = getTips();

  if (!tips.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">💡</div><p>No tips yet from your parent.</p></div>`;
    return;
  }

  el.innerHTML = tips.map(t => `
    <div class="tip-card animate-in">
      <div class="tip-emoji">💡</div>
      <div style="flex:1">
        <div class="tip-text">${t.text}</div>
        <div class="tip-time">${formatDate(t.date)}</div>
      </div>
      ${allowDelete ? `<button class="btn btn-ghost btn-sm" onclick="handleDeleteTip(${t.id})" title="Delete">✕</button>` : ''}
    </div>
  `).join('');
}

/* ─────────────────────────────────────────
   CATEGORY LEGEND
───────────────────────────────────────── */
function buildCategoryLegend(byCategory, total, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const entries = Object.entries(byCategory);
  if (!entries.length) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem">No categories yet.</p>';
    return;
  }

  el.innerHTML = `<div class="cat-legend">` + entries.map(([cat, val]) => {
    const pct = total ? Math.round((val / total) * 100) : 0;
    const color = CATEGORY_COLORS[cat] || '#aaa';
    return `<div class="cat-row">
      <div class="cat-dot" style="background:${color}"></div>
      <div class="cat-name">${CATEGORY_ICONS[cat] || ''} ${cat}</div>
      <div class="cat-amount">${formatAmount(val)}</div>
      <div class="badge badge-blue" style="min-width:42px;text-align:center">${pct}%</div>
    </div>`;
  }).join('') + `</div>`;
}

/* ─────────────────────────────────────────
   WEEKLY SPENDING (last 7 days)
───────────────────────────────────────── */
function getWeeklyData() {
  const txns = getTransactions();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
    const total = txns
      .filter(t => new Date(t.date).toDateString() === d.toDateString())
      .reduce((s, t) => s + t.amount, 0);
    days.push({ label, total });
  }
  return days;
}

function buildWeekChart(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const data = getWeeklyData();
  const max = Math.max(...data.map(d => d.total), DAILY_LIMIT);

  el.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:0.6rem;height:120px;padding:0 0.5rem">
      ${data.map(d => {
        const h = max ? Math.round((d.total / max) * 110) : 0;
        const over = d.total > DAILY_LIMIT;
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
          <div style="font-size:0.7rem;color:var(--text-muted);font-weight:600">${d.total ? formatAmount(d.total) : ''}</div>
          <div style="width:100%;height:${h}px;background:${over ? 'var(--danger)' : 'var(--grad)'};border-radius:6px 6px 0 0;transition:height 0.6s ease;min-height:${d.total ? 4 : 0}px"></div>
          <div style="font-size:0.72rem;color:var(--text-muted)">${d.label}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.75rem;font-size:0.78rem;color:var(--text-muted)">
      <div style="width:10px;height:10px;border-radius:2px;background:var(--danger)"></div> Over limit
      <div style="width:10px;height:10px;border-radius:2px;background:var(--blue);margin-left:0.5rem"></div> Normal
    </div>`;
}

/* ─────────────────────────────────────────
   PROGRESS BAR HELPER
───────────────────────────────────────── */
function setProgress(id, current, max) {
  const el = document.getElementById(id);
  if (!el) return;
  const pct = Math.min((current / max) * 100, 100);
  el.style.width = pct + '%';
  if (pct >= 100) el.classList.add('danger');
  else el.classList.remove('danger');
}

/* ── Export global helpers needed by inline handlers ── */
window.SS = {
  signupUser, loginUser, getCurrentUser, logout,
  addTransaction, deleteTransaction, getTransactions,
  getTodayTransactions, calculateTotals, checkOverspending,
  loadDemoData, getTips, addParentTip, deleteTip,
  initTheme, toggleTheme,
  formatDate, formatAmount,
  buildPieChart, displayTransactions, showTips,
  buildCategoryLegend, buildWeekChart, setProgress,
  getGoal, setGoal,
  DAILY_LIMIT, CATEGORY_ICONS, CATEGORY_COLORS,
};

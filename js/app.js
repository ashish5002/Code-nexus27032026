/* ============================================================
   SmartSpend – Firebase Backend Engine (app.js)
   ============================================================ */
import { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, setDoc, getDoc, serverTimestamp, writeBatch } from './firebase.js';

const DAILY_LIMIT = 500;
const STORAGE_KEYS = { THEME: 'ss_theme', ROLE: 'ss_role' };

const CATEGORY_ICONS = {
  'Food': '🍔', 'Transport': '🚌', 'Shopping': '🛍️',
  'Snacks': '🍿', 'Games': '🎮', 'Other': '💡',
};
const CATEGORY_COLORS = {
  'Food': '#3B5BDB', 'Transport': '#F06292', 'Shopping': '#10B981',
  'Snacks': '#F59E0B', 'Games': '#8B5CF6', 'Other': '#6B7280',
};

/* ── AUTHENTICATION ── */
export const loginWithGoogle = async (role) => {
  try {
    const result = await signInWithPopup(auth, provider);
    localStorage.setItem(STORAGE_KEYS.ROLE, role); // Remember role locally
    
    // Save basic profile to Firestore
    const userRef = doc(db, "users", result.user.uid);
    await setDoc(userRef, { name: result.user.displayName, email: result.user.email }, { merge: true });
    
    return { ok: true, user: result.user, role };
  } catch (error) {
    return { ok: false, msg: error.message };
  }
};

export const logoutUser = async () => {
  await signOut(auth);
  localStorage.removeItem(STORAGE_KEYS.ROLE);
  window.location.href = 'login.html';
};

export const requireAuth = (callback) => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      const role = localStorage.getItem(STORAGE_KEYS.ROLE) || 'child';
      callback({ ...user, role, name: user.displayName });
    } else {
      window.location.href = 'login.html';
    }
  });
};

/* ── TRANSACTIONS ── */
export const getTransactions = async () => {
  if (!auth.currentUser) return [];
  const q = query(collection(db, `users/${auth.currentUser.uid}/transactions`), orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addTransaction = async (amount, category) => {
  amount = parseFloat(amount);
  if (isNaN(amount) || amount <= 0) return { ok: false, msg: 'Enter a valid amount.' };
  if (!category) return { ok: false, msg: 'Select a category.' };

  const newTxn = { amount, category, date: new Date().toISOString(), timestamp: serverTimestamp() };
  const docRef = await addDoc(collection(db, `users/${auth.currentUser.uid}/transactions`), newTxn);
  return { ok: true, txn: { id: docRef.id, ...newTxn } };
};

export const deleteTransaction = async (id) => {
  await deleteDoc(doc(db, `users/${auth.currentUser.uid}/transactions`, id));
};

export const getTodayTransactions = async () => {
  const txns = await getTransactions();
  const today = new Date().toDateString();
  return txns.filter(t => new Date(t.date).toDateString() === today);
};

export const calculateTotals = (txns) => {
  const total = txns.reduce((s, t) => s + t.amount, 0);
  const byCategory = {};
  txns.forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + t.amount; });
  return { total, byCategory };
};

export const checkOverspending = (todayTotal) => todayTotal > DAILY_LIMIT;

/* ── TIPS ── */
export const getTips = async () => {
  if (!auth.currentUser) return [];
  const q = query(collection(db, `users/${auth.currentUser.uid}/tips`), orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addParentTip = async (text) => {
  if (!text.trim()) return { ok: false, msg: 'Tip cannot be empty.' };
  const newTip = { text: text.trim(), date: new Date().toISOString(), timestamp: serverTimestamp() };
  const docRef = await addDoc(collection(db, `users/${auth.currentUser.uid}/tips`), newTip);
  return { ok: true, tip: { id: docRef.id, ...newTip } };
};

export const deleteTip = async (id) => {
  await deleteDoc(doc(db, `users/${auth.currentUser.uid}/tips`, id));
};

/* ── SAVINGS CALCULATION ──
   Logic:
   - For each day that has transactions, savings = max(0, DAILY_LIMIT - spent)
   - If the child overspent that day, the excess is a PENALTY subtracted from total savings
   - Net savings = sum of all daily savings - sum of all overspend penalties, floored at 0
   - Days with no transactions are skipped (no spending = no savings entry)
──────────────────────────────────────────── */
export const calculateSavings = (txns) => {
  // Group transactions by calendar day
  const byDay = {};
  txns.forEach(t => {
    const day = new Date(t.date).toDateString();
    byDay[day] = (byDay[day] || 0) + t.amount;
  });

  let totalSaved = 0;
  let totalPenalty = 0;
  const dailyBreakdown = [];

  Object.entries(byDay).forEach(([day, spent]) => {
    const leftover  = Math.max(0, DAILY_LIMIT - spent);        // money saved that day
    const overspend = Math.max(0, spent - DAILY_LIMIT);        // excess spending = penalty
    totalSaved  += leftover;
    totalPenalty += overspend;
    dailyBreakdown.push({ day, spent, leftover, overspend });
  });

  // Net savings can never go below 0
  const netSavings = Math.max(0, totalSaved - totalPenalty);
  return { netSavings, totalSaved, totalPenalty, dailyBreakdown };
};

/* ── GOALS ── */
export const getGoal = async () => {
  if (!auth.currentUser) return null;
  const docSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  if (!docSnap.exists()) return null;
  return docSnap.data().goal || null;
};

export const setGoal = async (name, target) => {
  const uid = auth.currentUser.uid;
  await setDoc(doc(db, "users", uid), {
    goal: { name, target: parseFloat(target), createdAt: new Date().toISOString() }
  }, { merge: true });
};

export const deleteGoal = async () => {
  if (!auth.currentUser) return;
  await setDoc(doc(db, "users", auth.currentUser.uid), { goal: null }, { merge: true });
};

/* ── DEMO DATA ── */
export const loadDemoData = async () => {
  if (!auth.currentUser) return;
  const batch = writeBatch(db);
  const demo = [
    { amount: 120, category: 'Food', date: new Date().toISOString() },
    { amount: 200, category: 'Snacks', date: new Date().toISOString() },
    { amount: 150, category: 'Transport', date: new Date().toISOString() },
    { amount: 90, category: 'Games', date: new Date().toISOString() },
    { amount: 75, category: 'Shopping', date: new Date(Date.now() - 86400000).toISOString() },
  ];
  demo.forEach(txn => {
    const docRef = doc(collection(db, `users/${auth.currentUser.uid}/transactions`));
    batch.set(docRef, { ...txn, timestamp: serverTimestamp() });
  });
  await batch.commit();
};

/* ── UI HELPERS (Unchanged visually, adapted for modules) ── */
export const initTheme = () => {
  const dark = localStorage.getItem(STORAGE_KEYS.THEME) === 'dark';
  if (dark) document.body.classList.add('dark');
  return dark;
};

export const toggleTheme = () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
  return isDark;
};

export const formatDate = (iso) => {
  const d = new Date(iso);
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (d.toDateString() === today) return 'Today';
  if (d.toDateString() === yesterday) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const formatAmount = (n) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const buildPieChart = (byCategory, totalAmount, containerId) => {
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
  container.innerHTML = `<svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">${paths}<circle cx="${cx}" cy="${cy}" r="38" fill="var(--card-bg)"/></svg>`;
};

export const displayTransactions = (containerId, txns, allowDelete) => {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!txns.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">💸</div><p>No transactions yet.</p></div>`;
    return;
  }
  el.innerHTML = txns.map(t => `
    <div class="txn-card animate-in" data-id="${t.id}">
      <div class="txn-left">
        <div class="txn-icon">${CATEGORY_ICONS[t.category] || '💡'}</div>
        <div><div class="txn-category">${t.category}</div><div class="txn-date">${formatDate(t.date)}</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:0.8rem">
        <div class="txn-amount">${formatAmount(t.amount)}</div>
        ${allowDelete ? `<button class="btn btn-ghost btn-sm delete-txn-btn" data-id="${t.id}" title="Delete">✕</button>` : ''}
      </div>
    </div>
  `).join('');
};

export const showTips = (containerId, tips, allowDelete) => {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!tips.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">💡</div><p>No tips yet.</p></div>`;
    return;
  }
  el.innerHTML = tips.map(t => `
    <div class="tip-card animate-in">
      <div class="tip-emoji">💡</div>
      <div style="flex:1"><div class="tip-text">${t.text}</div><div class="tip-time">${formatDate(t.date)}</div></div>
      ${allowDelete ? `<button class="btn btn-ghost btn-sm delete-tip-btn" data-id="${t.id}" title="Delete">✕</button>` : ''}
    </div>
  `).join('');
};

export const buildCategoryLegend = (byCategory, total, containerId) => {
  const el = document.getElementById(containerId);
  if (!el) return;
  const entries = Object.entries(byCategory);
  if (!entries.length) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem">No categories yet.</p>';
    return;
  }
  el.innerHTML = `<div class="cat-legend">` + entries.map(([cat, val]) => {
    const pct = total ? Math.round((val / total) * 100) : 0;
    return `<div class="cat-row">
      <div class="cat-dot" style="background:${CATEGORY_COLORS[cat] || '#aaa'}"></div>
      <div class="cat-name">${CATEGORY_ICONS[cat] || ''} ${cat}</div>
      <div class="cat-amount">${formatAmount(val)}</div>
      <div class="badge badge-blue" style="min-width:42px;text-align:center">${pct}%</div>
    </div>`;
  }).join('') + `</div>`;
};

export const buildWeekChart = (txns, containerId) => {
  const el = document.getElementById(containerId);
  if (!el) return;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
    const total = txns.filter(t => new Date(t.date).toDateString() === d.toDateString()).reduce((s, t) => s + t.amount, 0);
    days.push({ label, total });
  }
  const max = Math.max(...days.map(d => d.total), DAILY_LIMIT);
  el.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:0.6rem;height:120px;padding:0 0.5rem">
      ${days.map(d => {
        const h = max ? Math.round((d.total / max) * 110) : 0;
        const over = d.total > DAILY_LIMIT;
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
          <div style="font-size:0.7rem;color:var(--text-muted);font-weight:600">${d.total ? formatAmount(d.total) : ''}</div>
          <div style="width:100%;height:${h}px;background:${over ? 'var(--danger)' : 'var(--grad)'};border-radius:6px 6px 0 0;min-height:${d.total ? 4 : 0}px"></div>
          <div style="font-size:0.72rem;color:var(--text-muted)">${d.label}</div>
        </div>`;
      }).join('')}
    </div>`;
};

export const setProgress = (id, current, max) => {
  const el = document.getElementById(id);
  if (!el) return;
  const pct = Math.min((current / max) * 100, 100);
  el.style.width = pct + '%';
  if (pct >= 100) el.classList.add('danger'); else el.classList.remove('danger');
};

export { DAILY_LIMIT, CATEGORY_ICONS, CATEGORY_COLORS };
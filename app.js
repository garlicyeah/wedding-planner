import { CONFIG } from './config.js';
import { demoValueRanges } from './demo.js';

const DEMO = new URLSearchParams(location.search).has('demo');
const SID = CONFIG.spreadsheetId;
const STATUSES = ['Not started', 'In progress', 'Done', 'Skipped'];
const PHASES = ['12+ months', '9–12 months', '6–9 months', '3–6 months', '2–3 months', '1–2 months', 'Final week', 'After'];
const RANGES = [
  'Overview!B4:B7', 'Timeline!A5:J400', 'Budget!A5:G40', 'Guests!A4:N995', 'Vendors!A5:M36',
  'Comments!A2:E3000', 'Decisions!A2:F3000', 'Quotes!A2:P500', 'Payments!A2:I500', 'Settings!A2:B50',
];
const TABS = [
  ['week', 'This week', 'Week'], ['tasks', 'Tasks', 'Tasks'], ['vendors', 'Vendors', 'Vendors'],
  ['money', 'Money', 'Money'], ['guests', 'Guests', 'Guests'], ['notes', 'Notes', 'Notes'],
];
const ICON = {
  week: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  tasks: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="m3.5 6 1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5M3.5 18l1.5 1.5 2.5-2.5"/>',
  vendors: '<path d="M4 10v10h16V10"/><path d="M3 10 5 4h14l2 6"/><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M10 20v-5h4v5"/>',
  money: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M16 14.5h2"/>',
  guests: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.6 14.2A4.5 4.5 0 0 1 21 18.5"/>',
  notes: '<path d="M6 3.5h9l4 4V20.5H6z"/><path d="M15 3.5v4h4M9 12h7M9 16h5"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;

// Pearl, the wedding mascot (hand-drawn SVG, so no personal photo lives in this public repo)
const PEARL = `<path d="M22 14C13 30 17 45 31 49l9-19Z" fill="#c4672b"/><path d="M24.5 21c-4.5 11-2 20 6 23l5.5-13Z" fill="#5b4141"/>
<path d="M78 14c9 16 5 31-9 35l-9-19Z" fill="#c4672b"/><path d="M75.5 21c4.5 11 2 20-6 23L64 31Z" fill="#5b4141"/>
<ellipse cx="50" cy="49" rx="25" ry="23" fill="#c4672b"/>
<path d="M44 28c2-4.5 10-4.5 12 0l4 18c10 6 8 25-10 25s-20-19-10-25Z" fill="#f3e6cf"/>
<circle cx="37" cy="45" r="3.7" fill="#1d1a19"/><circle cx="63" cy="45" r="3.7" fill="#1d1a19"/>
<circle cx="38.3" cy="43.7" r="1.2" fill="#fff"/><circle cx="64.3" cy="43.7" r="1.2" fill="#fff"/>
<ellipse cx="50" cy="60" rx="7" ry="5" fill="#f2b9a8"/>
<ellipse cx="47.2" cy="60" rx="1.4" ry="1.1" fill="#3a2a2a"/><ellipse cx="52.8" cy="60" rx="1.4" ry="1.1" fill="#3a2a2a"/>
<path d="M47.5 65.5q2.5 2 5 0" stroke="#3a2a2a" stroke-width="1.3" fill="none" stroke-linecap="round"/>
<path d="M25 69q25 11 50 0l-6 9q-19 22-38 0Z" fill="#6b9fd6"/><path d="M50 83l-6 12 6-3.5 6 3.5Z" fill="#5a8cc2"/>`;
const pearl = (size = 40, cls = '') => `<svg class="pearl ${cls}" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="Pearl"><title>Pearl</title>${PEARL}</svg>`;
const PEARL_CHEERS = ['Done! Pearl is proud of you 🐾', 'One less thing. Pearl approves.', 'Nice! Pearl does a little happy dance.', 'Checked off. Pearl wiggles her ears.'];
function pearlLine(D) {
  if (D.overdue.length) return `Pearl's nudge: ${plural(D.overdue.length, 'task')} overdue. One at a time.`;
  if (D.soon.length) return `Pearl's nudge: ${plural(D.soon.length, 'task')} coming up this month.`;
  return 'Pearl says: all caught up!';
}

// ---------- helpers ----------
const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* unavailable */ } },
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isNum = (v) => typeof v === 'number' && !isNaN(v);
const n0 = (v) => (isNum(v) ? v : 0);
const money = (v) => (isNum(v) ? v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '—');
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const pct = (a, b) => (b > 0 ? Math.max(0, Math.min(100, (a / b) * 100)) : 0);
const asText = (v) => (typeof v === 'string' && v !== '' && (/^[=+\-@]/.test(v) || /^[\d\s\-/.:()]+$/.test(v)) ? "'" + v : v);
const toNum = (s) => { const t = String(s ?? '').replace(/[$,\s]/g, ''); if (t === '') return ''; const n = Number(t); return isNaN(n) ? null : n; };

// ---------- dates ----------
const EPOCH = Date.UTC(1899, 11, 30);
const DAY = 86400000;
function todaySerial() { const d = new Date(); return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / DAY); }
function nowSerial() { const d = new Date(); return (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()) - EPOCH) / DAY; }
const serialDate = (s) => new Date(EPOCH + Math.floor(s) * DAY);
function fmtDate(s, withYear = true) {
  if (!isNum(s)) return '';
  return serialDate(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' });
}
const shortDate = (s) => (isNum(s) ? fmtDate(s, serialDate(s).getUTCFullYear() !== new Date().getFullYear()) : '');
const toISO = (s) => (isNum(s) ? serialDate(s).toISOString().slice(0, 10) : '');
function fromISO(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / DAY); }
function fmtStamp(s) {
  if (!isNum(s)) return String(s ?? '');
  return new Date(EPOCH + s * DAY).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
}
function fmtTime(v) {
  if (!isNum(v)) return v ?? '';
  const mins = Math.round((v % 1) * 1440); const h = Math.floor(mins / 60); const m = mins % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
function nowStamp() {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function phaseFor(db) {
  if (db >= 365) return PHASES[0]; if (db >= 270) return PHASES[1]; if (db >= 180) return PHASES[2]; if (db >= 90) return PHASES[3];
  if (db >= 56) return PHASES[4]; if (db >= 8) return PHASES[5]; if (db >= 0) return PHASES[6]; return PHASES[7];
}

// ---------- auth ----------
class AuthError extends Error {}
let token = store.get('wp_token');
let tokenClient = null;
const tokenValid = () => !!(token && token.exp > Date.now());
function waitForGoogle() {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const iv = setInterval(() => {
      if (window.google?.accounts?.oauth2) { clearInterval(iv); resolve(); }
      else if (++tries > 100) { clearInterval(iv); reject(new Error('Google sign-in could not load. Check your connection or ad blocker.')); }
    }, 100);
  });
}
async function initAuth() {
  await waitForGoogle();
  tokenClient = google.accounts.oauth2.initTokenClient({ client_id: CONFIG.clientId, scope: CONFIG.scope, callback: () => {} });
}
function requestToken(prompt = '') {
  return new Promise((resolve, reject) => {
    tokenClient.callback = (r) => {
      if (r.error) { reject(new Error(r.error_description || r.error)); return; }
      token = { t: r.access_token, exp: Date.now() + (Number(r.expires_in || 3600) - 120) * 1000 };
      store.set('wp_token', token); resolve(token.t);
    };
    tokenClient.error_callback = (e) => reject(new Error(e?.type === 'popup_closed' ? 'Sign-in window was closed.' : 'Sign-in failed.'));
    tokenClient.requestAccessToken({ prompt });
  });
}

// ---------- Sheets API ----------
async function api(path, { method = 'GET', body } = {}) {
  if (!tokenValid()) throw new AuthError('expired');
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SID}${path}`, {
    method, headers: { Authorization: `Bearer ${token.t}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401) { token = null; store.del('wp_token'); throw new AuthError('expired'); }
  if (r.status === 403) throw new Error("This Google account can't open the planning sheet. Ask Sharon to share it with you as an editor.");
  if (!r.ok) { const t = await r.text(); throw new Error(`Google Sheets error ${r.status}: ${t.slice(0, 160)}`); }
  return r.json();
}
async function writeCells(data, raw = false) {
  if (DEMO || !data.length) return;
  await api('/values:batchUpdate', { method: 'POST', body: { valueInputOption: raw ? 'RAW' : 'USER_ENTERED', data } });
}
const BUDGET_SHEET_ID = 596473812;
async function batchUpdate(requests) { if (DEMO) return; await api(':batchUpdate', { method: 'POST', body: { requests } }); }
async function appendRow(sheet, lastCol, row) {
  if (DEMO) return;
  const range = encodeURIComponent(`${sheet}!A:${lastCol}`);
  await api(`/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, { method: 'POST', body: { values: [row] } });
}

function parse(valueRanges) {
  const [ov, tl, bu, gu, ve, co, de, qu, pa, se] = valueRanges.map((x) => x.values || []);
  const s = (v) => (v ?? '');
  const budget = [];
  for (let i = 0; i < bu.length; i++) { const r = bu[i] || []; if (r[0] === 'TOTAL') break; if (r[0]) budget.push({ row: 5 + i, cat: s(r[0]), pct: r[1], est: r[3], act: r[4], notes: s(r[6]) }); }
  const setting = (k) => { const r = se.find((x) => x[0] === k); return r ? r[1] : undefined; };
  const photo = se.filter((r) => String(r[0] || '').startsWith('photo:'))
    .sort((a, b) => Number(a[0].split(':')[1]) - Number(b[0].split(':')[1])).map((r) => r[1] || '').join('');
  return {
    o: { weddingDate: ov[0]?.[0], budget: ov[1]?.[0], targetGuests: ov[2]?.[0], venue: s(ov[3]?.[0]) },
    timelineLastRow: 4 + tl.length,
    tasks: tl.map((r, i) => ({
      row: 5 + i, phase: s(r[0]), name: s(r[1]), daysBefore: r[2], due: r[3], status: r[5] || 'Not started',
      owner: s(r[6]), notes: s(r[7]), claude: s(r[8]), id: s(r[9]) || `R${5 + i}`,
    })).filter((t) => String(t.name).trim()),
    budget,
    guests: Array.from({ length: Math.max(gu.length, 1) }, (_, i) => gu[i] || []).map((r, i) => ({
      row: 4 + i, group: s(r[1]), name: s(r[2]), side: s(r[3]), rel: s(r[4]), contact: s(r[5]), address: s(r[6]),
      std: s(r[7]), rsvp: s(r[8]), meal: s(r[9]), diet: s(r[10]), table: s(r[11]), thanks: s(r[12]), party: s(r[13]),
    })),
    vendors: Array.from({ length: 32 }, (_, i) => ve[i] || []).map((r, i) => ({
      row: 5 + i, day: s(r[0]), cat: s(r[1]), vendor: s(r[2]), contact: s(r[3]), phone: s(r[4]), signed: s(r[5]),
      total: r[6], deposit: r[7], other: r[8], due: r[10], arrival: r[11], notes: s(r[12]),
    })),
    comments: co.map((r) => ({ ts: r[0], id: s(r[1]), task: s(r[2]), author: s(r[3]), text: s(r[4]) })).filter((c) => c.text),
    decisions: de.map((r) => ({ ts: r[0], author: s(r[1]), type: s(r[2]), id: s(r[3]), note: s(r[4]), text: s(r[5]) })).filter((d) => d.text || d.note),
    quotes: qu.map((r, i) => ({
      row: 2 + i, id: s(r[0]) || `Q${2 + i}`, cat: s(r[1]), vendor: s(r[2]), status: s(r[3]) || 'New', total: r[4], received: r[5], expires: r[6],
      included: s(r[7]), assumes: s(r[8]), schedule: s(r[9]), cancel: s(r[10]), fees: s(r[11]), contact: s(r[12]), summary: s(r[13]), link: s(r[14]),
    })).filter((q) => q.vendor || q.cat),
    payments: pa.map((r, i) => ({
      row: 2 + i, vendor: s(r[0]), cat: s(r[1]), what: s(r[2]), amount: r[3], due: r[4], status: s(r[5]) || 'Planned', paidOn: r[6], notes: s(r[7]), quoteId: s(r[8]),
    })).filter((p) => p.vendor || isNum(p.amount)),
    photo,
    photoX: isNum(setting('photo_x')) ? setting('photo_x') : 50,
    photoY: isNum(setting('photo_y')) ? setting('photo_y') : 40,
  };
}
async function load() {
  if (DEMO) { if (!state.data) state.data = parse(demoValueRanges()); return; }
  const qs = RANGES.map((r) => 'ranges=' + encodeURIComponent(r)).join('&');
  const res = await api(`/values:batchGet?${qs}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`);
  state.data = parse(res.valueRanges);
}

// ---------- state ----------
const state = {
  data: null, signedIn: false, authExpired: false, error: '',
  tab: store.get('wp_tab2', 'week'), me: store.get('wp_me', null),
  filter: 'open', search: '', openBudget: null, vtab: 'booked', compare: new Set(),
  gq: '', gside: '', ggroup: '', grsvp: '', drawer: null, modal: null,
};

// ---------- feedback ----------
let toastTimer;
function toast(msg, err = false) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = 'show' + (err ? ' err' : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.className = ''; }, err ? 6000 : 1600);
}
function handleError(e) {
  if (e instanceof AuthError) { if (!state.data) state.signedIn = false; else state.authExpired = true; render(); toast('Please reconnect to Google', true); }
  else { console.error(e); toast(e.message || 'Something went wrong', true); }
}
async function save(fn, msg = 'Saved') {
  try { toast(DEMO ? 'Saved (demo, nothing written)' : 'Saving…'); await fn(); if (!DEMO) toast(msg); scheduleRefresh(); }
  catch (e) { handleError(e); scheduleRefresh(200); }
}
let refreshTimer;
const isEditing = () => { const a = document.activeElement; return !!(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.closest('#app')); };
function scheduleRefresh(ms = 1500) { clearTimeout(refreshTimer); refreshTimer = setTimeout(refresh, ms); }
async function refresh() {
  if (DEMO || !state.signedIn || state.authExpired || !tokenValid()) return;
  if (isEditing() || state.modal) { scheduleRefresh(4000); return; }
  try { await load(); render(); } catch (e) { handleError(e); }
}
setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 60000);
window.addEventListener('focus', () => refresh());

// ---------- derived ----------
function derived() {
  const d = state.data; const today = todaySerial();
  for (const t of d.tasks) {
    t.left = isNum(t.due) ? Math.round(t.due - today) : null;
    t.closed = t.status === 'Done' || t.status === 'Skipped';
    t.overdue = !t.closed && t.left !== null && t.left < 0;
    t.soon = !t.closed && t.left !== null && t.left >= 0 && t.left <= 30;
  }
  const guests = d.guests.filter((g) => g.name);
  const vendors = d.vendors.filter((v) => v.cat || v.vendor);
  const booked = new Set(d.quotes.filter((q) => q.status === 'Booked').map((q) => q.id));
  const payments = d.payments.filter((p) => !p.quoteId || booked.has(p.quoteId));
  const committed = vendors.reduce((a, v) => a + n0(v.total), 0);
  const paid = vendors.reduce((a, v) => a + n0(v.deposit) + n0(v.other), 0);
  return {
    today, guests, vendors, payments, committed, paid,
    daysToGo: isNum(d.o.weddingDate) ? Math.round(d.o.weddingDate - today) : null,
    open: d.tasks.filter((t) => !t.closed), overdue: d.tasks.filter((t) => t.overdue), soon: d.tasks.filter((t) => t.soon),
    done: d.tasks.filter((t) => t.status === 'Done'),
    splits: d.budget.reduce((a, b) => a + n0(b.pct), 0),
    attending: guests.filter((g) => g.rsvp === 'Yes').length, declined: guests.filter((g) => g.rsvp === 'No').length,
  };
}
const commentsFor = (id) => state.data.comments.filter((c) => c.id === id);
const taskById = (id) => state.data.tasks.find((t) => t.id === id);
function dueText(t) {
  let s = isNum(t.due) ? `Due ${shortDate(t.due)}` : 'No due date';
  if (t.overdue) s += ` · <span class="late-text">${plural(-t.left, 'day')} late</span>`;
  else if (!t.closed && t.left !== null) s += t.left === 0 ? ' · today' : ` · in ${plural(t.left, 'day')}`;
  return s;
}

// ---------- chart pieces (plain HTML; one data hue, red only for late/over) ----------
function meter(value, max, { cls = '' } = {}) {
  const over = max > 0 && value > max;
  return `<div class="meter" role="meter" aria-valuenow="${Math.round(value)}" aria-valuemin="0" aria-valuemax="${Math.round(max)}"><i class="${over ? 'late' : cls}" style="width:${pct(value, max)}%"></i></div>`;
}
function columns(bars) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return `<div class="cols baseline-wrap">${bars.map((b) => `<div class="col" data-tip="${esc(b.tip)}">
      <div class="val">${b.value || ''}</div>
      <div class="bar ${b.value ? b.cls || '' : 'zero'}" style="height:${b.value ? Math.max(4, (b.value / max) * 100) : 1}%"></div>
      <div class="lab">${esc(b.label)}</div></div>`).join('')}</div>`;
}

// ---------- rendering ----------
const app = document.getElementById('app');
function render() {
  if (!DEMO && !state.signedIn) { app.innerHTML = signInView(); return; }
  if (!state.data) { app.innerHTML = `<div class="splash"><div style="text-align:center">${pearl(84, 'bob')}<p>Pearl is fetching your plan…</p></div></div>`; return; }
  const D = derived();
  const view = { week: weekView, tasks: tasksView, vendors: vendorsView, money: moneyView, guests: guestsView, notes: notesView }[state.tab] || weekView;
  const avatar = state.data.photo ? `<img class="avatar" src="data:image/jpeg;base64,${state.data.photo}" alt="Sharon and Claire" style="object-position:${state.data.photoX}% ${state.data.photoY}%">` : '<div class="avatar">S&amp;C</div>';
  const nav = (cls, labelIdx) => TABS.map(([k, l, s]) => `<button data-act="tab" data-tab="${k}" ${state.tab === k ? 'aria-current="page"' : ''}>${icon(k)}<span>${labelIdx ? s : l}</span>${!labelIdx && k === 'tasks' && D.overdue.length ? `<span class="badge">${D.overdue.length}</span>` : ''}</button>`).join('');
  app.innerHTML = `<div class="layout">
    <aside class="sidebar">
      <div class="couple">${avatar}<div><div class="couple-name">Sharon &amp; Claire</div><div class="couple-sub">${D.daysToGo !== null ? `${D.daysToGo} days to go` : ''}</div></div></div>
      <nav class="nav">${nav('nav', 0)}</nav>
      <div class="side-foot"><div class="side-pearl">${pearl(40)}<span>${esc(pearlLine(D))}</span></div><span>Signed in as <b>${esc(state.me || '—')}</b></span><button class="linkbtn" data-act="switch-me">Switch person</button></div>
    </aside>
    <div>
      <div class="mobile-top">${avatar}<div class="couple-name">Sharon &amp; Claire</div><span class="me muted">${esc(state.me || '')} · <button class="linkbtn" data-act="switch-me">switch</button></span></div>
      <main class="main">
        ${DEMO ? '<div class="banner"><span><b>Demo mode</b>: sample data, nothing is saved.</span></div>' : ''}
        ${state.authExpired ? '<div class="banner warn"><span>Your Google session expired. Changes won\'t save until you reconnect.</span><button class="btn primary small" data-act="reconnect">Reconnect</button></div>' : ''}
        ${view(D)}
      </main>
    </div>
    <nav class="tabbar">${nav('tabbar', 1)}</nav>
  </div>
  ${drawerView(D)}${modalView(D)}`;
}

function signInView() {
  return `<div class="signin"><div class="card">
    ${pearl(84)}
    <h1>Wedding Planner</h1><p>Sign in with the Google account that can edit the planning sheet.</p>
    ${state.error ? `<p class="late-text">${esc(state.error)}</p>` : ''}
    <button class="btn primary" data-act="signin">Sign in with Google</button></div></div>`;
}

// ----- This week -----
function weekView(D) {
  const d = state.data; const o = d.o;
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  let focus = [...D.overdue, ...D.open.filter((t) => !t.overdue && t.left !== null && t.left <= 14)];
  if (focus.length < 3) focus = [...focus, ...D.open.filter((t) => !focus.includes(t)).sort((a, b) => n0(a.due) - n0(b.due))].slice(0, 3);
  focus = focus.sort((a, b) => n0(a.due) - n0(b.due)).slice(0, 6);
  const upcoming = D.payments.filter((p) => p.status !== 'Paid').sort((a, b) => n0(a.due) - n0(b.due)).slice(0, 4);
  const target = n0(o.targetGuests);
  return `
    <div class="page-head"><div><h1>This week</h1><p>${today}. Here's what matters now.</p></div></div>
    <section class="hero2">
      <div class="hero-card">
        <div><div class="hero-days">${D.daysToGo ?? '—'}<span> days</span></div>
        <div class="hero-sub">until ${fmtDate(o.weddingDate) || 'the wedding'}${o.venue ? ` · ${esc(o.venue)}` : ''}</div></div>
        ${focus[0] ? `<button class="next-up" data-act="open-task" data-id="${esc(focus[0].id)}"><span class="muted small">Next up</span><span class="next-title">${esc(focus[0].name)}</span><span class="small ${focus[0].overdue ? 'late-text' : 'muted'}">${focus[0].overdue ? `${plural(-focus[0].left, 'day')} late` : `Due ${shortDate(focus[0].due)}`}</span></button>` : ''}
        <div class="hero-pearl">${pearl(46)}<span>${esc(pearlLine(D))}</span></div>
      </div>
      <div class="hero-photo ${d.photo ? '' : 'empty'}">
        ${d.photo ? `<img src="data:image/jpeg;base64,${d.photo}" alt="Sharon and Claire" style="object-position:${d.photoX}% ${d.photoY}%">` : `<button class="hero-empty" data-act="pick-photo">${pearl(72)}<span>Add a photo of you two</span></button>`}
        ${d.photo ? `<button class="hero-photo-btn" data-act="pick-photo">Change photo</button><div class="peek" title="Pearl">${pearl(70)}</div>` : ''}
      </div>
    </section>

    <section class="grid-3" style="margin-top:12px">
      <div class="card tile"><div class="label">Tasks done</div><div class="big">${D.done.length}<small> / ${d.tasks.length}</small></div>${meter(D.done.length, d.tasks.length, { cls: 'done' })}<div class="foot">${D.overdue.length ? `<span class="late-text">${D.overdue.length} overdue</span> · ` : ''}${D.soon.length} due in 30 days</div></div>
      <div class="card tile"><div class="label">Committed to vendors</div><div class="big">${money(D.committed)}<small> / ${money(o.budget)}</small></div>${meter(D.committed, n0(o.budget))}<div class="foot">${money(D.paid)} paid so far</div></div>
      <div class="card tile"><div class="label">Guests</div><div class="big">${D.guests.length}<small> / ${target || '—'} target</small></div>${meter(D.guests.length, target)}<div class="foot">${target && D.guests.length > target ? `<span class="late-text">${D.guests.length - target} over target</span>` : `${D.attending} said yes`}</div></div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Focus</h2><button class="linkbtn" data-act="tab" data-tab="tasks">All tasks</button></div>
      <div class="card list">${focus.length ? focus.map((t) => taskItem(t)).join('') : `<div class="empty">${pearl(64)}<div>Nothing urgent. Pearl says enjoy the week.</div></div>`}</div>
    </section>

    <section class="grid-2 section">
      <div class="card pad"><div class="section-head"><h2>Coming up to pay</h2><button class="linkbtn" data-act="tab" data-tab="money">Money</button></div>
        ${upcoming.length ? `<div class="list">${upcoming.map(paymentItem).join('')}</div>` : '<p class="muted small" style="margin:0">No payments scheduled yet. They appear here once you book a vendor or add one under Money.</p>'}
      </div>
      <div class="card pad"><div class="section-head"><h2>Workload ahead</h2><span class="hint">open tasks by month</span></div>${workloadChart(D)}</div>
    </section>`;
}
function workloadChart(D) {
  const now = new Date(); const months = [];
  const wd = isNum(state.data.o.weddingDate) ? serialDate(state.data.o.weddingDate) : null;
  for (let i = 0; i < 12; i++) {
    const m = new Date(Date.UTC(now.getFullYear(), now.getMonth() + i, 1));
    if (wd && m > wd) break; months.push(m);
  }
  const key = (dt) => `${dt.getUTCFullYear()}-${dt.getUTCMonth()}`;
  const counts = {}; for (const t of D.open) if (!t.overdue && isNum(t.due)) { const k = key(serialDate(t.due)); counts[k] = (counts[k] || 0) + 1; }
  const bars = [];
  if (D.overdue.length) bars.push({ label: 'Late', value: D.overdue.length, cls: 'late', tip: `${plural(D.overdue.length, 'task')} overdue` });
  for (const m of months) {
    const v = counts[key(m)] || 0; const name = m.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' });
    bars.push({ label: name, value: v, tip: `${m.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })}: ${plural(v, 'task')}` });
  }
  return columns(bars) + `<div class="legend"><span><i style="background:var(--data)"></i>Due that month</span>${D.overdue.length ? '<span><i style="background:var(--late)"></i>Overdue</span>' : ''}</div>`;
}
function taskItem(t, { showNote = true } = {}) {
  const n = commentsFor(t.id).length;
  return `<div class="item clickable ${t.closed ? 'done' : ''}" data-act="open-task" data-id="${esc(t.id)}">
    <button class="check ${t.status === 'Done' ? 'on' : ''}" data-act="toggle-done" data-id="${esc(t.id)}" aria-label="Mark done"></button>
    <div class="item-main"><div class="item-title">${esc(t.name)}</div>
      <div class="item-meta">${dueText(t)}${t.status === 'In progress' ? ' · in progress' : ''}${n ? ` · ${plural(n, 'comment')}` : ''}</div>
      ${showNote && t.claude ? `<div class="note"><span>${esc(t.claude)}<button class="gotit" data-act="gotit" data-id="${esc(t.id)}">Got it</button></span></div>` : ''}
    </div>
    <div class="item-side"><span class="who ${esc(t.owner)}">${esc(t.owner || 'No owner')}</span></div>
  </div>`;
}
function paymentItem(p) {
  const late = isNum(p.due) && p.due < todaySerial() && p.status !== 'Paid';
  return `<div class="item"><div class="item-main"><div class="item-title">${esc(p.vendor || p.cat)}${p.what ? ` · <span class="muted">${esc(p.what)}</span>` : ''}</div>
    <div class="item-meta">${isNum(p.due) ? `<span class="${late ? 'late-text' : ''}">Due ${shortDate(p.due)}</span>` : 'No due date'}${p.status === 'Paid' ? ` · paid ${shortDate(p.paidOn)}` : ''}</div></div>
    <div class="item-side"><b style="font-variant-numeric:tabular-nums">${money(p.amount)}</b>
    ${p.status === 'Paid' ? '<span class="pill good">Paid</span>' : `<a class="linkbtn" href="${calLink(p)}" target="_blank" rel="noopener" title="Add a reminder to Google Calendar">Remind</a><button class="btn small" data-act="mark-paid" data-row="${p.row}">Mark paid</button>`}</div></div>`;
}
function calLink(p) {
  if (!isNum(p.due)) return '#';
  const f = (s) => toISO(s).replace(/-/g, '');
  const q = new URLSearchParams({ action: 'TEMPLATE', text: `Pay ${p.vendor || p.cat} ${money(p.amount)}`, dates: `${f(p.due)}/${f(p.due + 1)}`, details: `${p.what || 'Wedding payment'} — from the wedding planner` });
  return `https://calendar.google.com/calendar/render?${q}`;
}

// ----- Tasks -----
const FILTERS = [
  ['open', 'Open', (t) => !t.closed], ['mine', 'Mine', (t) => !t.closed && (t.owner === state.me || t.owner === 'Both')],
  ['overdue', 'Overdue', (t) => t.overdue], ['soon', 'Next 30 days', (t) => t.soon],
  ['unassigned', 'No owner', (t) => !t.closed && !t.owner], ['done', 'Done', (t) => t.closed], ['all', 'All', () => true],
];
function tasksView() {
  const f = FILTERS.find((x) => x[0] === state.filter)[2]; const q = state.search.trim().toLowerCase();
  const list = state.data.tasks.filter(f).filter((t) => !q || `${t.name} ${t.notes} ${t.claude}`.toLowerCase().includes(q)).sort((a, b) => n0(a.due) - n0(b.due));
  const block = (title, items, cls = '') => (items.length ? `<div class="group-label ${cls}">${title} · ${items.length}</div><div class="card list">${items.map((t) => taskItem(t)).join('')}</div>` : '');
  let body;
  if (!list.length) body = '<div class="card"><div class="empty">No tasks match.</div></div>';
  else if (!['open', 'mine', 'unassigned', 'all'].includes(state.filter)) body = block(FILTERS.find((x) => x[0] === state.filter)[1], list);
  else {
    const rest = list.filter((t) => !t.overdue && !t.soon && !t.closed);
    body = block('Overdue', list.filter((t) => t.overdue), 'late-text') + block('Next 30 days', list.filter((t) => t.soon))
      + PHASES.map((p) => block(p, rest.filter((t) => t.phase === p))).join('') + block('Other', rest.filter((t) => !PHASES.includes(t.phase)))
      + block('Done & skipped', list.filter((t) => t.closed));
  }
  return `<div class="page-head"><div><h1>Tasks</h1><p>Tap a task to see details, comments and Claude's note.</p></div><button class="btn primary" data-act="add-task">+ Add task</button></div>
    <div class="filters">${FILTERS.map(([k, l, fn]) => `<button class="chip" data-act="filter" data-f="${k}" aria-pressed="${state.filter === k}">${l}<span class="n">${state.data.tasks.filter(fn).length}</span></button>`).join('')}
      <input class="field search" type="search" placeholder="Search" data-act="search" value="${esc(state.search)}"></div>
    ${body}`;
}

// ----- Vendors & quotes -----
function vendorsView(D) {
  const q = state.data.quotes;
  return `<div class="page-head"><div><h1>Vendors</h1><p>${D.vendors.filter((v) => v.signed === 'Yes').length} booked · ${q.filter((x) => x.status !== 'Passed').length} quotes in play</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><div class="seg-ctrl"><button data-act="vtab" data-v="booked" aria-pressed="${state.vtab === 'booked'}">Vendors</button><button data-act="vtab" data-v="quotes" aria-pressed="${state.vtab === 'quotes'}">Quotes${q.length ? ` (${q.length})` : ''}</button></div>
      ${state.vtab === 'booked' ? '<button class="btn primary" data-act="add-vendor">+ Add vendor</button>' : ''}</div></div>
    ${state.vtab === 'quotes' ? quotesView() : bookedView(D)}`;
}
function bookingState(v) {
  if (v.signed === 'Yes') return ['booked', 'Booked'];
  const quoted = state.data.quotes.some((q) => q.status !== 'Passed' && q.cat && v.cat && (q.cat.toLowerCase().includes(v.cat.toLowerCase().split(/[ /(]/)[0]) || v.cat.toLowerCase().includes(q.cat.toLowerCase())));
  if (v.vendor) return ['quoted', 'In talks'];
  if (quoted) return ['quoted', 'Quoted'];
  return ['', 'Not started'];
}
function bookedView(D) {
  const named = D.vendors.filter((v) => v.vendor);
  return `<section><div class="section-head"><h2>Booking progress</h2><span class="hint">${D.vendors.filter((v) => v.signed === 'Yes').length} of ${D.vendors.length} booked</span></div>
      <div class="bgrid">${D.vendors.map((v) => { const [cls, label] = bookingState(v); return `<button class="bcell ${cls}" style="text-align:left" data-act="open-vendor" data-row="${v.row}"><div>${esc(v.cat || 'Vendor')}${v.day && v.day !== 'Saturday' ? ` <span class="muted small">${esc(v.day)}</span>` : ''}</div><div class="state">${cls === 'booked' ? '✓ ' : ''}${label}${v.vendor ? ` · ${esc(v.vendor)}` : ''}</div></button>`; }).join('')}</div>
      <div class="legend"><span><i style="background:var(--good)"></i>Booked (contract signed)</span><span><i style="background:var(--data)"></i>Quoted or in talks</span><span><i style="background:var(--line)"></i>Not started</span></div></section>
    <section class="section"><div class="section-head"><h2>Your vendors</h2><span class="hint">Tap to edit contact, cost and payments</span></div>
      <div class="card list">${named.length ? named.map((v) => `<div class="item clickable" data-act="open-vendor" data-row="${v.row}"><div class="item-main"><div class="item-title">${esc(v.vendor)}</div><div class="item-meta">${esc(v.cat)}${v.day ? ` · ${esc(v.day)}` : ''}${v.contact ? ` · ${esc(v.contact)}` : ''}</div></div>
        <div class="item-side"><span style="font-variant-numeric:tabular-nums">${isNum(v.total) ? money(v.total) : ''}</span><span class="pill ${v.signed === 'Yes' ? 'good' : ''}">${v.signed === 'Yes' ? 'Signed' : v.signed || 'Not signed'}</span></div></div>`).join('') : '<div class="empty">No vendors yet. Book one from Quotes, or tap “Add vendor”.</div>'}</div></section>`;
}
function quotesView() {
  const qs = state.data.quotes;
  const how = `Drop quote files (PDFs, screenshots) into the <a href="${CONFIG.quotesFolder}" target="_blank" rel="noopener">Wedding Quotes folder</a>, then ask Claude to <code class="inline">process my quotes</code>. They'll show up here with the details pulled out.`;
  if (!qs.length) return `<div class="card pad"><p style="margin:0">${how}</p></div>`;
  const cats = [...new Set(qs.map((q) => q.cat || 'Other'))];
  const selected = qs.filter((q) => state.compare.has(q.id));
  return `<p class="muted small" style="margin-top:0">${how}</p>
    ${cats.map((c) => `<section class="section" style="margin-top:24px"><div class="section-head"><h2>${esc(c)}</h2><span class="hint">${qs.filter((q) => (q.cat || 'Other') === c).length} quotes</span></div>
      <div class="quote-grid">${qs.filter((q) => (q.cat || 'Other') === c).sort((a, b) => n0(a.total) - n0(b.total)).map(quoteCard).join('')}</div></section>`).join('')}
    ${selected.length ? `<div class="compare-bar"><span>${selected.length} selected to compare</span><span style="display:flex;gap:8px"><button class="btn small ghost" data-act="clear-compare">Clear</button><button class="btn small" data-act="open-compare" ${selected.length < 2 ? 'disabled' : ''}>Compare</button></span></div>` : ''}`;
}
function quoteCard(q) {
  const pill = { Booked: 'good', Shortlisted: 'data', Passed: '' }[q.status] ?? '';
  const exp = isNum(q.expires) && q.expires < todaySerial() + 14 && q.status !== 'Booked' ? `<span class="late-text small">Expires ${shortDate(q.expires)}</span>` : (isNum(q.expires) ? `<span class="muted small">Expires ${shortDate(q.expires)}</span>` : '');
  return `<div class="card quote ${q.status === 'Passed' ? 'passed' : ''}">
    <div class="row"><b>${esc(q.vendor)}</b><span class="pill ${pill}">${esc(q.status)}</span></div>
    <div class="row"><span class="price">${money(q.total)}</span>${exp}</div>
    ${q.summary ? `<div class="summary">✦ ${esc(q.summary)}</div>` : ''}
    ${q.included ? `<div class="small muted">${esc(q.included.slice(0, 140))}${q.included.length > 140 ? '…' : ''}</div>` : ''}
    <div class="actions">
      <label class="chip" style="cursor:pointer"><input type="checkbox" data-act="compare" data-id="${esc(q.id)}" ${state.compare.has(q.id) ? 'checked' : ''} style="margin:0 6px 0 0;vertical-align:-1px">Compare</label>
      ${q.status !== 'Booked' ? `<button class="chip" data-act="quote-status" data-id="${esc(q.id)}" data-v="${q.status === 'Shortlisted' ? 'New' : 'Shortlisted'}">${q.status === 'Shortlisted' ? 'Unshortlist' : 'Shortlist'}</button>
      <button class="chip" data-act="quote-status" data-id="${esc(q.id)}" data-v="${q.status === 'Passed' ? 'New' : 'Passed'}">${q.status === 'Passed' ? 'Undo pass' : 'Pass'}</button>
      <button class="chip" data-act="book" data-id="${esc(q.id)}">Book</button>` : ''}
      ${q.link ? `<a class="chip" href="${esc(q.link)}" target="_blank" rel="noopener">File ↗</a>` : ''}
    </div></div>`;
}

// ----- Money -----
function budgetMeter(est, act, planned) {
  const base = Math.max(planned, est, act, 1); const over = planned > 0 && Math.max(est, act) > planned;
  return `<div class="meter bmeter">${est ? `<i class="est ${over ? 'late' : ''}" style="width:${pct(est, base)}%"></i>` : ''}${act ? `<i class="${over && act > planned ? 'late' : ''}" style="width:${pct(act, base)}%"></i>` : ''}${over ? `<b class="plan-mark" style="left:${pct(planned, base)}%"></b>` : ''}</div>`;
}
function budgetSummary(b, total) {
  const p = n0(b.pct) * total; const est = n0(b.est); const act = n0(b.act); const top = Math.max(est, act);
  return `<span class="bname">${esc(b.cat)}<span class="muted small"> · ${isNum(b.pct) ? `${+(b.pct * 100).toFixed(2)}%` : '—'}</span></span>${budgetMeter(est, act, p)}
    <span class="fig">${top ? `<b class="${top > p ? 'late-text' : ''}">${money(top)}</b> of ` : ''}${money(p)}${act ? `<span class="muted small"> · ${money(act)} spent</span>` : ''}</span><span class="chev" aria-hidden="true">›</span>`;
}
function budgetItem(b, total) {
  const open = state.openBudget === b.row;
  const f = (k, label, val, extra = '') => `<label class="f">${label}<input class="field" data-act="budget" data-row="${b.row}" data-k="${k}" value="${val}" ${extra}></label>`;
  return `<div class="bitem ${open ? 'open' : ''}">
    <button class="brow" data-act="toggle-budget" data-row="${b.row}" aria-expanded="${open}" data-brow="${b.row}" data-tip="${esc(`${b.cat}: planned ${money(n0(b.pct) * total)}, estimated ${money(n0(b.est))}, spent ${money(n0(b.act))}`)}">${budgetSummary(b, total)}</button>
    ${open ? `<div class="bedit">
      ${f('cat', 'Category', esc(b.cat))}
      ${f('pct', '% of budget', isNum(b.pct) ? +(b.pct * 100).toFixed(2) : '', 'inputmode="decimal"')}
      <label class="f">Planned<div class="field ro-field" data-planned="${b.row}">${money(n0(b.pct) * total)}</div></label>
      ${f('est', 'Estimated / quoted ($)', isNum(b.est) ? b.est : '', 'inputmode="decimal"')}
      ${f('act', 'Actual spent ($)', isNum(b.act) ? b.act : '', 'inputmode="decimal"')}
      <label class="f wide">Notes<input class="field" data-act="budget" data-row="${b.row}" data-k="notes" value="${esc(b.notes)}"></label>
      <div class="wide bedit-foot"><button class="btn small ghost danger" data-act="delete-budget" data-row="${b.row}">Delete category</button></div>
    </div>` : ''}</div>`;
}
function budgetTotal(splits, total) {
  const d = state.data; const off = Math.abs(splits - 1) > 0.001;
  return `<span class="bname">Total <span class="small ${off ? 'late-text' : 'muted'}">· ${Math.round(splits * 1000) / 10}% of budget</span></span>
    <span class="fig">${money(d.budget.reduce((a, b) => a + n0(b.est), 0))} estimated · ${money(d.budget.reduce((a, b) => a + n0(b.act), 0))} spent · ${money(splits * total)} planned</span>`;
}
function moneyView(D) {
  const d = state.data; const total = n0(d.o.budget);
  const planned = (b) => n0(b.pct) * total;
  const months = []; const now = new Date();
  for (let i = 0; i < 12; i++) months.push(new Date(Date.UTC(now.getFullYear(), now.getMonth() + i, 1)));
  const key = (dt) => `${dt.getUTCFullYear()}-${dt.getUTCMonth()}`;
  const byMonth = {}; let lateAmt = 0;
  for (const p of D.payments) if (p.status !== 'Paid' && isNum(p.due) && isNum(p.amount)) { if (p.due < D.today) lateAmt += p.amount; else { const k = key(serialDate(p.due)); byMonth[k] = (byMonth[k] || 0) + p.amount; } }
  const bars = []; if (lateAmt) bars.push({ label: 'Late', value: Math.round(lateAmt), cls: 'late', tip: `${money(lateAmt)} overdue` });
  for (const m of months) { const v = Math.round(byMonth[key(m)] || 0); bars.push({ label: m.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }), value: v, tip: `${m.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })}: ${money(v)}` }); }
  const cashChart = columns(bars.map((b) => ({ ...b, value: b.value }))).replace(/<div class="val">(\d+)<\/div>/g, (_, v) => `<div class="val">${Number(v) >= 1000 ? `$${Math.round(Number(v) / 100) / 10}k` : `$${v}`}</div>`);
  const pays = [...D.payments].sort((a, b) => (a.status === 'Paid') - (b.status === 'Paid') || n0(a.due) - n0(b.due));
  const splitOff = Math.abs(D.splits - 1) > 0.001;
  return `<div class="page-head"><div><h1>Money</h1><p>Budget ${money(total)} · ${money(D.committed)} committed · ${money(D.paid)} paid</p></div><button class="btn primary" data-act="add-payment">+ Add payment</button></div>
    ${splitOff ? `<div class="banner warn"><span>Your category splits add up to <b>${Math.round(D.splits * 1000) / 10}%</b>. Tap a category below to change its percentage until they total 100%.</span></div>` : ''}
    <section class="grid-3">
      <div class="card tile"><div class="label">Committed</div><div class="big">${money(D.committed)}<small> / ${money(total)}</small></div>${meter(D.committed, total)}<div class="foot">${money(total - D.committed)} not yet committed</div></div>
      <div class="card tile"><div class="label">Paid</div><div class="big">${money(D.paid)}<small> / ${money(D.committed)}</small></div>${meter(D.paid, D.committed, { cls: 'done' })}<div class="foot">${money(D.committed - D.paid)} still owed</div></div>
      <div class="card tile"><div class="label">Quoted (estimates)</div><div class="big">${money(d.budget.reduce((a, b) => a + n0(b.est), 0))}</div>${meter(d.budget.reduce((a, b) => a + n0(b.est), 0), total)}<div class="foot">from the Estimated column</div></div>
    </section>
    <section class="section"><div class="section-head"><h2>Budget by category</h2><span style="display:flex;gap:12px;align-items:baseline"><span class="hint">Tap a category to edit it</span><button class="btn small" data-act="add-budget">+ Add category</button></span></div>
      <div class="card blist">${d.budget.map((b) => budgetItem(b, total)).join('')}
        <div class="btotal" id="budget-total">${budgetTotal(D.splits, total)}</div></div>
      <div class="legend"><span><i style="background:var(--data)"></i>Spent</span><span><i style="background:color-mix(in srgb,var(--data) 40%,transparent)"></i>Estimated / quoted</span><span><i style="background:var(--data-soft)"></i>Planned</span><span><i style="background:var(--late)"></i>Over plan</span></div></section>
    <section class="section"><div class="section-head"><h2>Payments by month</h2><span class="hint">unpaid, scheduled</span></div><div class="card pad">${cashChart}</div></section>
    <section class="section"><div class="section-head"><h2>Payments</h2></div><div class="card list">${pays.length ? pays.map(paymentItem).join('') : '<div class="empty">No payments yet. Booking a quote adds its payment schedule here, or tap “Add payment”.</div>'}</div></section>`;
}

// ----- Guests -----
function guestsView(D) {
  const g = D.guests; const target = n0(state.data.o.targetGuests);
  const q = state.gq.trim().toLowerCase();
  const rows = g.filter((x) => (!q || `${x.name} ${x.rel} ${x.contact}`.toLowerCase().includes(q)) && (!state.gside || x.side === state.gside)
    && (!state.ggroup || x.group === state.ggroup) && (!state.grsvp || (state.grsvp === 'Pending' ? !['Yes', 'No'].includes(x.rsvp) : x.rsvp === state.grsvp)));
  const parties = partiesOf(g);
  const match = new Set(rows.map((x) => x.row));
  const shown = parties.filter((members) => members.some((m) => match.has(m.row)));
  const max = Math.max(1, ...['Sharon', 'Claire', 'Both'].map((s) => g.filter((x) => x.side === s).length));
  const segRow = (side) => {
    const a = g.filter((x) => x.side === side && x.group !== 'B' && x.group !== 'C').length; const b = g.filter((x) => x.side === side && (x.group === 'B' || x.group === 'C')).length;
    if (!a && !b) return '';
    return `<div class="seg-row"><span>${side}</span><div class="seg" style="width:${pct(a + b, max)}%">${a ? `<span style="flex:${a};background:var(--data)" data-tip="${side}: ${a} on the A-list">${a}</span>` : ''}${b ? `<span style="flex:${b};background:var(--data-2)" data-tip="${side}: ${b} on the B-list">${b}</span>` : ''}</div><span class="muted" style="text-align:right">${a + b}</span></div>`;
  };
  const sel = (key, label, opts) => `<select class="field search" style="width:auto" data-act="gfilter" data-key="${key}"><option value="">${label}</option>${opts.map((o) => `<option ${state[key] === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  return `<div class="page-head"><div><h1>Guests</h1><p>${g.length} guests in ${parties.length} parties · ${D.attending} yes · ${D.declined} no · ${g.length - D.attending - D.declined} waiting</p></div><button class="btn primary" data-act="add-guest">+ Add guest</button></div>
    <section class="grid-2">
      <div class="card tile"><div class="label">Headcount vs. target</div><div class="big">${g.length}<small> / ${target || '—'}</small></div>${meter(g.length, target)}<div class="foot">${target && g.length > target ? `<span class="late-text">${g.length - target} over target</span>. Moving people to the B-list brings the A-list down.` : 'Within target.'} A-list only: ${g.filter((x) => x.group !== 'B' && x.group !== 'C').length}.</div></div>
      <div class="card tile"><div class="label">By side</div><div style="margin-top:10px">${segRow('Sharon')}${segRow('Claire')}${segRow('Both')}</div>
        <div class="legend"><span><i style="background:var(--data)"></i>A-list</span><span><i style="background:var(--data-2)"></i>B-list</span></div></div>
    </section>
    <section class="section">
      <div class="filters"><input class="field search" type="search" placeholder="Search guests" data-act="gsearch" value="${esc(state.gq)}">
        ${sel('gside', 'Both sides', ['Sharon', 'Claire', 'Both'])}${sel('ggroup', 'All groups', ['A', 'B', 'C'])}${sel('grsvp', 'Any RSVP', ['Yes', 'No', 'Pending'])}
        <span class="muted small">${rows.length} shown</span></div>
      <datalist id="guest-names">${g.map((x) => `<option value="${esc(x.name)}">`).join('')}</datalist>
      ${suggestionsHTML(g)}
      <div class="card list">${shown.length ? shown.map((members) => partyHTML(members)).join('') : '<div class="empty">No guests match.</div>'}</div>
    </section>`;
}

// Parties: partners and +1s share a label in the Party column (N). No label = a party of one.
const isPlusOne = (g) => /-\s*guest\??$/i.test(g.name);
const partyKey = (g) => g.party || `__${g.row}`;
function partiesOf(guests) {
  const map = new Map();
  for (const g of guests) { const k = partyKey(g); if (!map.has(k)) map.set(k, []); map.get(k).push(g); }
  for (const [k, ms] of map) ms.sort((a, b) => (a.name === k ? -1 : b.name === k ? 1 : 0) || isPlusOne(a) - isPlusOne(b) || a.row - b.row);
  return [...map.values()];
}
function guestRow(x, inParty) {
  return `<div class="item clickable ${inParty ? 'in-party' : ''}" data-act="open-guest" data-row="${x.row}"><div class="item-main"><div class="item-title">${esc(x.name)}${isPlusOne(x) ? ' <span class="pill">+1</span>' : ''}</div><div class="item-meta">${esc(x.rel || '—')}${x.address ? '' : ' · <span>no address</span>'}</div></div>
    <div class="item-side">${x.group && x.group !== 'A' ? `<span class="pill">${esc(x.group)}-list</span>` : ''}<span class="who ${esc(x.side)}">${esc(x.side || '—')}</span>${x.rsvp === 'Yes' ? '<span class="pill good">Yes</span>' : x.rsvp === 'No' ? '<span class="pill late">No</span>' : ''}</div></div>`;
}
function partyHTML(members) {
  if (members.length === 1) return guestRow(members[0], false);
  return `<div class="party"><div class="party-label">Party of ${members.length}</div>${members.map((m) => guestRow(m, true)).join('')}</div>`;
}
// Same last name, same side, neither in a party yet -> suggest linking (never automatic).
const lastName = (n) => n.replace(/\(.*?\)/g, '').replace(/-\s*guest\??$/i, '').trim().split(/\s+/).slice(1).pop() || '';
function suggestions(guests) {
  const dismissed = new Set(store.get('wp_dismissed_pairs', []));
  const groups = new Map();
  for (const g of guests) {
    if (g.party) continue; const ln = lastName(g.name).toLowerCase(); if (!ln) continue;
    const k = `${g.side}|${ln}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(g);
  }
  return [...groups.values()].filter((ms) => ms.length > 1).filter((ms) => !dismissed.has(ms.map((m) => m.row).join(',')));
}
function suggestionsHTML(guests) {
  const sug = suggestions(guests); if (!sug.length) return '';
  return `<div class="card pad suggest"><div class="section-head" style="margin-bottom:6px"><h2>Possible couples or households</h2><span class="hint">Same last name. Link them only if they come together.</span></div>
    ${sug.slice(0, state.gsugAll ? sug.length : 3).map((ms) => `<div class="suggest-row"><span>${ms.map((m) => esc(m.name)).join(' · ')}</span><span style="display:flex;gap:6px"><button class="btn small" data-act="link-suggest" data-rows="${ms.map((m) => m.row).join(',')}">Link as a party</button><button class="btn small ghost" data-act="dismiss-suggest" data-rows="${ms.map((m) => m.row).join(',')}">Not a party</button></span></div>`).join('')}
    ${sug.length > 3 ? `<button class="linkbtn" data-act="toggle-sug" style="margin-top:6px">${state.gsugAll ? 'Show fewer' : `Show ${sug.length - 3} more`}</button>` : ''}</div>`;
}
function partyWrites(rows) { return rows.map((g) => ({ range: `Guests!N${g.row}`, values: [[asText(g.party || '')]] })); }
function linkGuests(a, b) {
  if (!a || !b || a.row === b.row) return;
  if (a.party && a.party === b.party) { toast('Already in the same party'); return; }
  const label = b.party || a.party || a.name;
  const changed = [];
  for (const g of state.data.guests) if (g.name && (g.row === a.row || g.row === b.row || (a.party && g.party === a.party) || (b.party && g.party === b.party))) { g.party = label; changed.push(g); }
  render(); save(() => writeCells(partyWrites(changed)), `${a.name} and ${b.name} are now one party`);
}
function unlinkGuest(g) {
  const label = g.party; if (!label) return;
  g.party = ''; const changed = [g];
  const rest = state.data.guests.filter((x) => x.name && x.party === label);
  if (rest.length === 1) { rest[0].party = ''; changed.push(rest[0]); }
  render(); save(() => writeCells(partyWrites(changed)), `${g.name} unlinked`);
}
function addPlusOne(g) {
  const d = state.data; let slot = d.guests.find((x) => !x.name); if (!slot) { slot = { row: 4 + d.guests.length }; d.guests.push(slot); }
  if (slot.row > 995) { toast('The guest list is full in the sheet (row 995).', true); return; }
  const label = g.party || g.name; const writes = [];
  if (!g.party) { g.party = label; writes.push(...partyWrites([g])); }
  Object.assign(slot, { group: g.group, name: `${g.name} - Guest`, side: g.side, rel: g.rel, contact: '', address: '', std: '', rsvp: '', meal: '', diet: '', table: '', thanks: '', party: label });
  const r = slot.row;
  writes.push({ range: `Guests!A${r}:E${r}`, values: [[`=ROW(B${r})-3`, g.group, asText(slot.name), g.side, asText(g.rel)]] }, { range: `Guests!N${r}`, values: [[asText(label)]] });
  render(); save(() => writeCells(writes), `Added a +1 for ${g.name}. Rename it once you know who's coming.`);
}

// ----- Notes -----
function notesView() {
  const d = state.data; const o = d.o; const recent = [...d.decisions].reverse();
  return `<div class="page-head"><div><h1>Notes</h1><p>Tell Claude what to keep in mind, and set your wedding details.</p></div></div>
    <section class="grid-2">
      <div class="card pad"><h2 style="font-size:17px">Tell Claude</h2>
        <p class="muted small">Standing instructions or context, like “we're fine with ~140 guests.” To refresh Claude's notes, say <code class="inline">refresh my wedding notes</code>. For new quote files, say <code class="inline">process my quotes</code>.</p>
        <form data-form="tell"><textarea class="field" name="text" placeholder="Something Claude should know…" required></textarea><div style="margin-top:10px"><button class="btn primary" type="submit">Save for Claude</button></div></form></div>
      <div class="card pad"><h2 style="font-size:17px">Wedding details</h2>
        <div class="form-grid" style="margin-top:12px">
          <label class="f">Wedding date<input class="field" type="date" data-act="ov" data-cell="B4" data-type="date" value="${toISO(o.weddingDate)}"></label>
          <label class="f">Total budget ($)<input class="field" inputmode="decimal" data-act="ov" data-cell="B5" data-type="num" value="${isNum(o.budget) ? o.budget : ''}"></label>
          <label class="f">Target guests<input class="field" inputmode="numeric" data-act="ov" data-cell="B6" data-type="num" value="${isNum(o.targetGuests) ? o.targetGuests : ''}"></label>
          <label class="f">Venue / city<input class="field" data-act="ov" data-cell="B7" data-type="text" value="${esc(o.venue)}"></label>
        </div>
        ${d.photo ? `<div class="form-grid" style="margin-top:14px"><label class="f">Photo framing: left ↔ right<input type="range" min="0" max="100" value="${d.photoX}" data-act="frame" data-k="photoX"></label><label class="f">Photo framing: up ↕ down<input type="range" min="0" max="100" value="${d.photoY}" data-act="frame" data-k="photoY"></label></div>` : ''}
        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn small" data-act="pick-photo">${d.photo ? 'Change photo' : 'Add photo'}</button><a class="btn small" href="${CONFIG.quotesFolder}" target="_blank" rel="noopener">Quotes folder ↗</a></div></div>
    </section>
    <section class="section"><div class="section-head"><h2>What Claude knows you've decided</h2><span class="hint">${recent.length}</span></div>
      ${recent.length ? `<div style="display:grid;gap:8px">${recent.map((x) => `<div class="decision">${x.note ? `<div class="meta">Re: ${esc(x.note)}</div>` : ''}<div>${esc(x.text || 'Got it')}</div><div class="meta">${esc(x.author)} · ${fmtStamp(x.ts)}</div></div>`).join('')}</div>` : '<div class="card"><div class="empty">Nothing yet. Tap “Got it” on one of Claude\'s notes, or add an instruction.</div></div>'}</section>`;
}

// ----- Drawer (task / vendor / guest detail) -----
const VENDOR_FIELDS = [
  { k: 'vendor', c: 'C', label: 'Vendor', full: true }, { k: 'cat', c: 'B', label: 'Category' },
  { k: 'day', c: 'A', label: 'Day', opts: ['', 'All', 'Friday', 'Saturday', 'Sunday', 'N/A'] },
  { k: 'contact', c: 'D', label: 'Contact name' }, { k: 'phone', c: 'E', label: 'Phone / email' },
  { k: 'signed', c: 'F', label: 'Contract signed', opts: ['', 'Yes', 'No', 'Pending'] }, { k: 'total', c: 'G', label: 'Total cost ($)', type: 'num' },
  { k: 'deposit', c: 'H', label: 'Deposit paid ($)', type: 'num' }, { k: 'other', c: 'I', label: 'Other paid ($)', type: 'num' },
  { k: 'due', c: 'K', label: 'Final payment due', type: 'date' }, { k: 'arrival', c: 'L', label: 'Arrival time (day-of)', type: 'time' },
  { k: 'notes', c: 'M', label: 'Notes', full: true, area: true },
];
const GUEST_FIELDS = [
  { k: 'name', c: 'C', label: 'Name', full: true }, { k: 'side', c: 'D', label: 'Side', opts: ['', 'Sharon', 'Claire', 'Both'] },
  { k: 'group', c: 'B', label: 'Invite group', opts: ['', 'A', 'B', 'C'] }, { k: 'rel', c: 'E', label: 'Relationship', full: true },
  { k: 'contact', c: 'F', label: 'Email / phone', full: true }, { k: 'address', c: 'G', label: 'Mailing address', full: true, area: true },
  { k: 'std', c: 'H', label: 'Save-the-date sent', opts: ['', 'Yes', 'No'] }, { k: 'rsvp', c: 'I', label: 'RSVP', opts: ['', 'Pending', 'Yes', 'No'] },
  { k: 'meal', c: 'J', label: 'Meal' }, { k: 'diet', c: 'K', label: 'Dietary notes' }, { k: 'table', c: 'L', label: 'Table #' },
  { k: 'thanks', c: 'M', label: 'Thank-you sent', opts: ['', 'Yes', 'No'] },
];
function fieldHTML(sheet, r, f) {
  const v = r[f.k]; const a = `data-act="cell" data-sheet="${sheet}" data-row="${r.row}" data-k="${f.k}"`;
  let input;
  if (f.opts) input = `<select class="field" ${a}>${[...new Set([...f.opts, v])].map((o) => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${esc(o || '—')}</option>`).join('')}</select>`;
  else if (f.type === 'date') input = `<input class="field" type="date" ${a} value="${toISO(v)}">`;
  else if (f.type === 'num') input = `<input class="field" inputmode="decimal" ${a} value="${isNum(v) ? v : esc(v ?? '')}">`;
  else if (f.type === 'time') input = `<input class="field" ${a} value="${esc(fmtTime(v))}" placeholder="4:00 PM">`;
  else if (f.area) input = `<textarea class="field" ${a}>${esc(v)}</textarea>`;
  else input = `<input class="field" ${a} value="${esc(v)}">`;
  return `<label class="f ${f.full ? 'full' : ''}">${esc(f.label)}${input}</label>`;
}
function drawerView() {
  const dr = state.drawer; if (!dr) return '';
  const d = state.data; let title = ''; let body = ''; let foot = '';
  if (dr.type === 'task') {
    const t = taskById(dr.id); if (!t) return '';
    const thread = commentsFor(t.id); title = 'Task';
    body = `<div class="form-grid">
        <label class="f full">Task<input class="field" data-act="task-field" data-field="name" data-id="${esc(t.id)}" value="${esc(t.name)}"></label>
        <label class="f">Status<select class="field" data-act="task-field" data-field="status" data-id="${esc(t.id)}">${STATUSES.map((s) => `<option ${s === t.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <label class="f">Owner<select class="field" data-act="task-field" data-field="owner" data-id="${esc(t.id)}">${[['', 'No owner'], ['Sharon', 'Sharon'], ['Claire', 'Claire'], ['Both', 'Both']].map(([v, l]) => `<option value="${v}" ${v === t.owner ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="f">Due date<input class="field" type="date" data-act="task-field" data-field="due" data-id="${esc(t.id)}" value="${toISO(t.due)}"></label>
        <label class="f">Phase<select class="field" data-act="task-field" data-field="phase" data-id="${esc(t.id)}">${[...new Set([...PHASES, t.phase])].filter(Boolean).map((p) => `<option ${p === t.phase ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></label>
        <label class="f full">Notes<textarea class="field" data-act="task-field" data-field="notes" data-id="${esc(t.id)}" placeholder="Links, quotes, details…">${esc(t.notes)}</textarea></label></div>
      ${t.claude ? `<div class="note" style="margin:0"><span>${esc(t.claude)}<button class="gotit" data-act="gotit" data-id="${esc(t.id)}">Got it</button></span></div>` : ''}
      <div><div class="group-label" style="margin-top:6px">Comments</div>
        ${thread.length ? `<div class="thread">${thread.map((c) => `<div class="msg"><div class="by ${esc(c.author)}">${esc(c.author)}<span class="when">${fmtStamp(c.ts)}</span></div><p>${esc(c.text)}</p></div>`).join('')}</div>` : '<p class="muted small" style="margin:0">No comments yet.</p>'}
        <form data-form="comment" data-id="${esc(t.id)}" style="margin-top:10px"><textarea class="field" name="text" placeholder="Add a comment for ${state.me === 'Claire' ? 'Sharon' : 'Claire'}…" required></textarea><div style="margin-top:8px"><button class="btn primary small" type="submit">Post</button></div></form></div>`;
  } else if (dr.type === 'vendor') {
    const v = d.vendors.find((x) => x.row === dr.row); if (!v) return '';
    title = v.vendor || v.cat || 'Vendor';
    const bal = isNum(v.total) ? v.total - n0(v.deposit) - n0(v.other) : null;
    body = `<div class="form-grid">${VENDOR_FIELDS.map((f) => fieldHTML('vendors', v, f)).join('')}</div>${bal !== null ? `<p class="small muted" style="margin:0">Balance due: <b style="color:var(--ink)">${money(bal)}</b></p>` : ''}`;
    foot = `<button class="btn ghost small" data-act="remove-row" data-sheet="vendors" data-row="${v.row}">Clear this vendor</button>`;
  } else if (dr.type === 'guest') {
    const g = d.guests.find((x) => x.row === dr.row); if (!g) return '';
    title = g.name || 'Guest';
    const mates = g.party ? d.guests.filter((x) => x.name && x.party === g.party && x.row !== g.row) : [];
    body = `<div class="party-box"><div class="group-label" style="margin:0 0 8px">Party</div>
        ${mates.length ? mates.map((m) => `<div class="mate"><button class="linkbtn" data-act="open-guest" data-row="${m.row}">${esc(m.name)}</button>${isPlusOne(m) ? ' <span class="pill">+1</span>' : ''}<button class="btn small ghost" data-act="unlink" data-row="${m.row}">Unlink</button></div>`).join('') : '<p class="muted small" style="margin:0 0 8px">Coming solo. Link a partner, or add a +1.</p>'}
        <form data-form="link" data-row="${g.row}" class="link-form"><input class="field" name="other" list="guest-names-drawer" placeholder="Link with a guest…" required><button class="btn small" type="submit">Link</button></form>
        <datalist id="guest-names-drawer">${d.guests.filter((x) => x.name && x.row !== g.row && (!g.party || x.party !== g.party)).map((x) => `<option value="${esc(x.name)}">`).join('')}</datalist>
        ${isPlusOne(g) ? '' : `<button class="btn small" data-act="add-plus1" data-row="${g.row}" style="margin-top:8px">+ Add a +1</button>`}
      </div>
      <div class="form-grid">${GUEST_FIELDS.map((f) => fieldHTML('guests', g, f)).join('')}</div>`;
    foot = `<button class="btn ghost small" data-act="remove-row" data-sheet="guests" data-row="${g.row}">Remove guest</button>`;
  }
  return `<div class="overlay" data-act="close-drawer"></div><aside class="drawer" role="dialog" aria-label="${esc(title)}">
    <div class="drawer-head"><h2>${esc(title)}</h2><button class="close" data-act="close-drawer" aria-label="Close">×</button></div>
    <div class="drawer-body">${body}</div>${foot ? `<div class="drawer-foot">${foot}<span class="muted small">Changes save automatically</span></div>` : ''}</aside>`;
}

// ----- Modals -----
function modalView() {
  if (!state.me) {
    return `<div class="overlay"></div><div class="modal-wrap"><div class="modal" style="text-align:center"><h2>Who's planning?</h2><p class="muted">So comments show the right name. You can switch later.</p>
      <div class="who-pick">${CONFIG.people.map((p) => `<button class="btn primary" data-act="set-me" data-who="${p}">I'm ${p}</button>`).join('')}</div></div></div>`;
  }
  const m = state.modal; if (!m) return '';
  const wrap = (title, body, form, wide = false, submit = 'Save') => `<div class="overlay" data-act="close-modal"></div><div class="modal-wrap" data-act="close-modal">
    <form class="modal" data-form="${form}" style="${wide ? 'width:min(960px,100%);max-height:90vh;overflow:auto' : ''}"><h2>${title}</h2>${body}
    <div class="actions"><button type="button" class="btn ghost" data-act="close-modal">${form === 'none' ? 'Close' : 'Cancel'}</button>${form === 'none' ? '' : `<button class="btn primary" type="submit">${submit}</button>`}</div></form></div>`;
  const d = state.data;
  if (m.type === 'add-task') return wrap('Add a task', `<div class="form-grid"><label class="f full">Task<input class="field" name="name" required autofocus></label>
      <label class="f">Due date<input class="field" type="date" name="due" required></label>
      <label class="f">Owner<select class="field" name="owner"><option value="">No owner</option><option>Sharon</option><option>Claire</option><option>Both</option></select></label>
      <label class="f full">Notes<textarea class="field" name="notes"></textarea></label></div>`, 'add-task');
  if (m.type === 'gotit') {
    const t = taskById(m.id);
    return wrap('Got it', `<div class="note" style="margin:0 0 14px"><span>${esc(t?.claude)}</span></div>
      <label class="f">What did you decide? (optional, but it helps Claude)<textarea class="field" name="text" placeholder="e.g. We're OK with this, the budget accounts for it"></textarea></label>
      <p class="muted small">The note is cleared, and Claude won't raise it again unless something big changes.</p>`, 'gotit');
  }
  if (m.type === 'add-vendor') return wrap('Add a vendor', `<div class="form-grid"><label class="f">Category<input class="field" name="cat" required placeholder="Photographer" autofocus></label>
      <label class="f">Vendor<input class="field" name="vendor" placeholder="Business name"></label>
      <label class="f">Day<select class="field" name="day"><option></option><option>All</option><option>Friday</option><option selected>Saturday</option><option>Sunday</option><option>N/A</option></select></label>
      <label class="f">Total ($)<input class="field" name="total" inputmode="decimal"></label><label class="f full">Notes<textarea class="field" name="notes"></textarea></label></div>`, 'add-vendor');
  if (m.type === 'add-guest') return wrap('Add a guest', `<div class="form-grid"><label class="f full">Name<input class="field" name="name" required autofocus></label>
      <label class="f">Side<select class="field" name="side"><option>Sharon</option><option>Claire</option><option>Both</option></select></label>
      <label class="f">Group<select class="field" name="group"><option>A</option><option>B</option><option>C</option></select></label>
      <label class="f full">Relationship<input class="field" name="rel"></label>
      <label class="f full">Partner of (optional)<input class="field" name="partner" list="guest-names" placeholder="Start typing a guest's name"></label></div>`, 'add-guest');
  if (m.type === 'add-budget') return wrap('Add a budget category', `<div class="form-grid"><label class="f full">Category<input class="field" name="cat" required autofocus placeholder="e.g. Rehearsal dinner"></label>
      <label class="f">% of budget<input class="field" name="pct" inputmode="decimal" placeholder="e.g. 5"></label><label class="f">Estimated / quoted ($)<input class="field" name="est" inputmode="decimal"></label></div>`, 'add-budget');
  if (m.type === 'add-payment') {
    const names = [...new Set(d.vendors.map((v) => v.vendor).filter(Boolean))];
    return wrap('Add a payment', `<div class="form-grid"><label class="f full">Vendor<input class="field" name="vendor" list="vendor-names" required autofocus></label><datalist id="vendor-names">${names.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
      <label class="f">What<input class="field" name="what" placeholder="Deposit, final payment…"></label><label class="f">Amount ($)<input class="field" name="amount" inputmode="decimal" required></label>
      <label class="f">Due date<input class="field" type="date" name="due" required></label><label class="f">Category<input class="field" name="cat"></label></div>`, 'add-payment');
  }
  if (m.type === 'book') {
    const q = d.quotes.find((x) => x.id === m.id);
    return wrap(`Book ${esc(q?.vendor)}`, `<p class="muted small" style="margin-top:0">This marks the quote as booked, adds ${esc(q?.vendor)} to your vendors (contract: Pending until you sign), and shows its payment schedule under Money.</p>
      <div class="form-grid"><label class="f">Day<select class="field" name="day"><option>Saturday</option><option>Friday</option><option>Sunday</option><option>All</option><option>N/A</option></select></label><label class="f">Total ($)<input class="field" name="total" inputmode="decimal" value="${isNum(q?.total) ? q.total : ''}"></label></div>`, 'book', false, 'Book it');
  }
  if (m.type === 'compare') {
    const qs = d.quotes.filter((x) => state.compare.has(x.id));
    const rows = [['Total', (q) => `<b>${money(q.total)}</b>`], ["What's included", (q) => esc(q.included)], ['Assumes', (q) => esc(q.assumes)], ['Deposit & schedule', (q) => esc(q.schedule)],
      ['Cancellation', (q) => esc(q.cancel)], ['Extra fees', (q) => esc(q.fees)], ['Expires', (q) => shortDate(q.expires)], ["Claude's take", (q) => esc(q.summary)], ['Contact', (q) => esc(q.contact)],
      ['File', (q) => (q.link ? `<a href="${esc(q.link)}" target="_blank" rel="noopener">Open ↗</a>` : '')]];
    return wrap('Compare quotes', `<div class="scroll-x"><table class="compare"><thead><tr><th></th>${qs.map((q) => `<td>${esc(q.vendor)}<div class="muted small" style="font-weight:400">${esc(q.cat)}</div></td>`).join('')}</tr></thead>
      <tbody>${rows.map(([l, f]) => `<tr><th>${l}</th>${qs.map((q) => `<td>${f(q) || '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`, 'none', true);
  }
  return '';
}

// ---------- actions ----------
const TASK_COL = { phase: 'A', name: 'B', status: 'F', owner: 'G', notes: 'H' };
function saveTaskField(t, field, value) {
  if (field === 'due') {
    const serial = fromISO(value); if (serial === '' || !isNum(state.data.o.weddingDate)) return;
    const db = state.data.o.weddingDate - serial; t.due = serial; t.daysBefore = db;
    return save(() => writeCells([{ range: `Timeline!C${t.row}`, values: [[db]] }]));
  }
  t[field] = value;
  return save(() => writeCells([{ range: `Timeline!${TASK_COL[field]}${t.row}`, values: [[['name', 'notes'].includes(field) ? asText(value) : value]] }]));
}
function onCellChange(el) {
  const { sheet, row, k } = el.dataset; const fields = sheet === 'vendors' ? VENDOR_FIELDS : GUEST_FIELDS;
  const f = fields.find((x) => x.k === k); const r = state.data[sheet].find((x) => x.row === Number(row)); if (!f || !r) return;
  let local; let write;
  if (f.type === 'num') { const n = toNum(el.value); if (n === null) { toast('Please enter a number', true); return; } local = n; write = n; }
  else if (f.type === 'date') { local = fromISO(el.value); write = el.value || ''; }
  else if (f.opts || f.type === 'time') { local = el.value; write = el.value; }
  else { local = el.value; write = asText(el.value); }
  r[k] = local;
  const writes = [{ range: `${sheet === 'vendors' ? 'Vendors' : 'Guests'}!${f.c}${row}`, values: [[write]] }];
  if (sheet === 'vendors' && ['total', 'deposit', 'other'].includes(k)) writes.push({ range: `Vendors!J${row}`, values: [[`=IF(G${row}="","",G${row}-N(H${row})-N(I${row}))`]] });
  if (sheet === 'guests' && k === 'name' && local) writes.push({ range: `Guests!A${row}`, values: [[`=ROW(B${row})-3`]] });
  save(() => writeCells(writes));
  if (f.opts || ['name', 'vendor'].includes(k)) render();
}
function onBudgetChange(el) {
  const r = state.data.budget.find((x) => x.row === Number(el.dataset.row)); const k = el.dataset.k; if (!r) return;
  const col = { cat: 'A', pct: 'B', est: 'D', act: 'E', notes: 'G' }[k]; let v;
  if (k === 'pct') { const n = toNum(String(el.value).replace('%', '')); if (n === null) { toast('Please enter a number', true); return; } v = n === '' ? '' : n / 100; }
  else if (k === 'est' || k === 'act') { v = toNum(el.value); if (v === null) { toast('Please enter a number', true); return; } }
  else v = el.value;
  r[k] = v;
  save(() => writeCells([{ range: `Budget!${col}${r.row}`, values: [[k === 'cat' || k === 'notes' ? asText(v) : v]] }]));
  // refresh the chart row, planned figure and totals without stealing focus from the next field
  const total = n0(state.data.o.budget); const D = derived();
  const row = app.querySelector(`[data-brow="${r.row}"]`); if (row) row.innerHTML = budgetSummary(r, total);
  const pl = app.querySelector(`[data-planned="${r.row}"]`); if (pl) pl.textContent = money(n0(r.pct) * total);
  const tot = document.getElementById('budget-total'); if (tot) tot.innerHTML = budgetTotal(D.splits, total);
  if (k === 'pct' && Math.abs(D.splits - 1) <= 0.001 && !isEditing()) render();
}

// Budget rows are real sheet rows: deleting/inserting shifts the rows below, so reload afterwards.
function deleteBudgetRow(row) {
  const d = state.data; const b = d.budget.find((x) => x.row === row); if (!b) return;
  const money$ = [isNum(b.est) && b.est ? `${money(b.est)} estimated` : '', isNum(b.act) && b.act ? `${money(b.act)} spent` : ''].filter(Boolean).join(' and ');
  if (!confirm(`Delete "${b.cat}"?${money$ ? `\n\nIt still has ${money$}. Move that to another category first if you want to keep it.` : ''}`)) return;
  d.budget = d.budget.filter((x) => x.row !== row).map((x) => (x.row > row ? { ...x, row: x.row - 1 } : x));
  state.openBudget = null; render();
  save(async () => { await batchUpdate([{ deleteDimension: { range: { sheetId: BUDGET_SHEET_ID, dimension: 'ROWS', startIndex: row - 1, endIndex: row } } }]); await load(); render(); }, `Deleted ${b.cat}`);
}
function addBudgetRow(fd) {
  const d = state.data; const pctN = toNum(String(fd.pct || '').replace('%', '')); const est = toNum(fd.est);
  if (pctN === null || est === null) { toast('Please enter numbers for % and estimate', true); return; }
  const last = Math.max(4, ...d.budget.map((x) => x.row)); const r = last + 1; // new row goes right after the last category, inside the TOTAL sums
  d.budget.push({ row: r, cat: fd.cat.trim(), pct: pctN === '' ? '' : pctN / 100, est, act: '', notes: '' });
  state.modal = null; state.openBudget = r; render();
  save(async () => {
    await batchUpdate([{ insertDimension: { range: { sheetId: BUDGET_SHEET_ID, dimension: 'ROWS', startIndex: last, endIndex: last + 1 }, inheritFromBefore: true } }]);
    await writeCells([{ range: `Budget!A${r}:G${r}`, values: [[asText(fd.cat.trim()), pctN === '' ? '' : pctN / 100, `=B${r}*Overview!$B$5`, est, '', `=IF(E${r}="","",C${r}-E${r})`, '']] }]);
    await load(); render();
  }, `Added ${fd.cat.trim()}`);
}

// Decode any image the browser can show; iPhone/Mac HEIC photos are converted in the browser first.
function loadScript(src) {
  return new Promise((resolve, reject) => { const el = document.createElement('script'); el.src = src; el.onload = resolve; el.onerror = () => reject(new Error('Could not load the HEIC converter. Check your connection.')); document.head.appendChild(el); });
}
const isHeic = (file) => /hei[cf]$/i.test(file.type) || /\.hei[cf]$/i.test(file.name || '');
async function decodeImage(blob) {
  try { return await createImageBitmap(blob); } catch { /* fall back to an <img> element */ }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image(); img.src = url; await img.decode();
    return img;
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
async function readPhoto(file) {
  let blob = file;
  if (isHeic(file)) {
    try { return await decodeImage(file); } catch { /* browser can't read HEIC natively (Chrome) */ }
    toast('Converting your iPhone photo…');
    if (!window.heic2any) await loadScript('https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js');
    const out = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    blob = Array.isArray(out) ? out[0] : out;
  }
  try { return await decodeImage(blob); } catch {
    throw new Error(`This browser can't open that file${file.type ? ` (${file.type})` : ''}. Try a JPEG or PNG.`);
  }
}
async function uploadPhoto(file) {
  let b64;
  try {
    const img = await readPhoto(file);
    const w = img.width || img.naturalWidth; const h = img.height || img.naturalHeight;
    const scale = Math.min(1, 1100 / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w * scale); c.height = Math.round(h * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    b64 = c.toDataURL('image/jpeg', 0.8).split(',')[1];
  } catch (e) { console.error('Photo upload failed:', e); toast(e.message || "Couldn't read that image", true); return; }
  const chunks = b64.match(/.{1,45000}/g) || [];
  if (chunks.length > 40) { toast('That photo is too large. Try a smaller one.', true); return; }
  state.data.photo = b64; render();
  const rows = Array.from({ length: 40 }, (_, i) => (i < chunks.length ? [`photo:${i}`, chunks[i]] : ['', '']));
  save(() => writeCells([{ range: 'Settings!A2:B41', values: rows }], true), 'Photo saved (private to your sheet)');
}

async function signIn(prompt = '') {
  try {
    state.error = ''; if (!tokenClient) throw new Error('Google sign-in is still loading. Try again in a moment.');
    await requestToken(prompt); state.signedIn = true; state.authExpired = false; render(); await load(); render();
  } catch (e) { state.error = e.message; if (!state.data) state.signedIn = false; render(); if (state.data) handleError(e); }
}

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act; const d = state.data;
  if (['close-modal', 'close-drawer'].includes(act)) { if (e.target === el || el.tagName === 'BUTTON') { if (act === 'close-modal') state.modal = null; else state.drawer = null; render(); } return; }
  if (act === 'open-task') { const inner = e.target.closest('button, a, input, select'); if (inner && inner !== el) return; state.drawer = { type: 'task', id: el.dataset.id }; render(); return; }
  if (act === 'open-vendor') { state.drawer = { type: 'vendor', row: Number(el.dataset.row) }; render(); return; }
  if (act === 'open-guest') { state.drawer = { type: 'guest', row: Number(el.dataset.row) }; render(); return; }
  if (act === 'tab') { state.tab = el.dataset.tab; state.drawer = null; store.set('wp_tab2', state.tab); render(); window.scrollTo(0, 0); }
  else if (act === 'filter') { state.filter = el.dataset.f; render(); }
  else if (act === 'vtab') { state.vtab = el.dataset.v; render(); }
  else if (act === 'toggle-sug') { state.gsugAll = !state.gsugAll; render(); }
  else if (act === 'unlink') { const g = d.guests.find((x) => x.row === Number(el.dataset.row)); if (g) unlinkGuest(g); }
  else if (act === 'add-plus1') { const g = d.guests.find((x) => x.row === Number(el.dataset.row)); if (g) addPlusOne(g); }
  else if (act === 'link-suggest') {
    const rows = el.dataset.rows.split(',').map(Number); const ms = d.guests.filter((x) => rows.includes(x.row));
    const label = ms[0].name; ms.forEach((m) => { m.party = label; }); render();
    save(() => writeCells(partyWrites(ms)), `Linked ${ms.map((m) => m.name).join(' & ')}`);
  } else if (act === 'dismiss-suggest') { store.set('wp_dismissed_pairs', [...store.get('wp_dismissed_pairs', []), el.dataset.rows]); render(); }
  else if (act === 'add-budget') { state.modal = { type: 'add-budget' }; render(); }
  else if (act === 'delete-budget') deleteBudgetRow(Number(el.dataset.row));
  else if (act === 'toggle-budget') { const r = Number(el.dataset.row); state.openBudget = state.openBudget === r ? null : r; render(); }
  else if (act === 'signin' || act === 'reconnect') signIn('');
  else if (act === 'switch-me') { state.me = null; store.del('wp_me'); render(); }
  else if (act === 'set-me') { state.me = el.dataset.who; store.set('wp_me', state.me); render(); }
  else if (['add-task', 'add-vendor', 'add-guest', 'add-payment'].includes(act)) { state.modal = { type: act }; render(); }
  else if (act === 'gotit') { e.stopPropagation(); state.modal = { type: 'gotit', id: el.dataset.id }; render(); }
  else if (act === 'book') { state.modal = { type: 'book', id: el.dataset.id }; render(); }
  else if (act === 'open-compare') { state.modal = { type: 'compare' }; render(); }
  else if (act === 'clear-compare') { state.compare.clear(); render(); }
  else if (act === 'pick-photo') document.getElementById('photo-input').click();
  else if (act === 'toggle-done') {
    e.stopPropagation(); const t = taskById(el.dataset.id); if (!t) return;
    const nowDone = t.status !== 'Done';
    saveTaskField(t, 'status', nowDone ? 'Done' : 'Not started'); render();
    if (nowDone) setTimeout(() => toast(PEARL_CHEERS[Math.floor(Math.random() * PEARL_CHEERS.length)]), 900);
  } else if (act === 'quote-status') {
    const q = d.quotes.find((x) => x.id === el.dataset.id); if (!q) return; q.status = el.dataset.v; render();
    save(() => writeCells([{ range: `Quotes!D${q.row}`, values: [[q.status]] }]));
  } else if (act === 'mark-paid') markPaid(Number(el.dataset.row));
  else if (act === 'remove-row') removeRow(el.dataset.sheet, Number(el.dataset.row));
  const f = app.querySelector('.modal [autofocus]'); if (f) f.focus();
});

app.addEventListener('change', (e) => {
  const el = e.target; const act = el.dataset.act; if (!act) return;
  if (act === 'task-field') {
    const t = taskById(el.dataset.id); if (!t) return; const field = el.dataset.field;
    if (field === 'name' && !el.value.trim()) { el.value = t.name; return; }
    saveTaskField(t, field, el.value); if (['status', 'owner', 'due'].includes(field)) render();
  } else if (act === 'cell') onCellChange(el);
  else if (act === 'budget') onBudgetChange(el);
  else if (act === 'compare') { if (el.checked) state.compare.add(el.dataset.id); else state.compare.delete(el.dataset.id); render(); }
  else if (act === 'ov') {
    const o = state.data.o; const key = { B4: 'weddingDate', B5: 'budget', B6: 'targetGuests', B7: 'venue' }[el.dataset.cell]; let local; let write;
    if (el.dataset.type === 'date') { local = fromISO(el.value); write = el.value; }
    else if (el.dataset.type === 'num') { const n = toNum(el.value); if (n === null) { toast('Please enter a number', true); return; } local = n; write = n; }
    else { local = el.value; write = asText(el.value); }
    o[key] = local; if (key === 'weddingDate') for (const t of state.data.tasks) if (isNum(t.daysBefore)) t.due = local - t.daysBefore;
    save(() => writeCells([{ range: `Overview!${el.dataset.cell}`, values: [[write]] }])); render();
  } else if (act === 'gfilter') { state[el.dataset.key] = el.value; render(); }
  else if (act === 'frame') {
    const d = state.data; d[el.dataset.k] = Number(el.value);
    save(() => writeCells([{ range: 'Settings!A45:B46', values: [['photo_x', d.photoX], ['photo_y', d.photoY]] }]), 'Framing saved');
  }
});
document.getElementById('photo-input').addEventListener('change', (e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ''; });

app.addEventListener('input', (e) => {
  const el = e.target; const act = el.dataset.act;
  if (act === 'search' || act === 'gsearch') {
    if (act === 'search') state.search = el.value; else state.gq = el.value;
    const pos = el.selectionStart; render(); const again = app.querySelector(`[data-act="${act}"]`); if (again) { again.focus(); again.setSelectionRange(pos, pos); }
  }
});

app.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target; const kind = form.dataset.form; const fd = Object.fromEntries(new FormData(form)); const me = state.me || ''; const d = state.data;
  if (kind === 'comment') {
    const t = taskById(form.dataset.id); const text = (fd.text || '').trim(); if (!t || !text) return;
    d.comments.push({ ts: nowSerial(), id: t.id, task: t.name, author: me, text }); render();
    save(() => appendRow('Comments', 'E', [nowStamp(), t.id, asText(t.name), me, asText(text)]), 'Comment posted');
  } else if (kind === 'tell') {
    const text = (fd.text || '').trim(); if (!text) return;
    d.decisions.push({ ts: nowSerial(), author: me, type: 'Instruction', id: '', note: '', text }); render();
    save(() => appendRow('Decisions', 'F', [nowStamp(), me, 'Instruction', '', '', asText(text)]), 'Saved for Claude');
  } else if (kind === 'gotit') {
    const t = taskById(state.modal.id); if (!t) return; const note = t.claude; const text = (fd.text || '').trim();
    t.claude = ''; state.modal = null; d.decisions.push({ ts: nowSerial(), author: me, type: 'Got it', id: t.id, note, text: text || 'Got it' }); render();
    save(async () => { await appendRow('Decisions', 'F', [nowStamp(), me, 'Got it', t.id, asText(note), asText(text || 'Got it')]); await writeCells([{ range: `Timeline!I${t.row}`, values: [['']] }]); }, 'Claude will remember that');
  } else if (kind === 'add-task') addTask(fd);
  else if (kind === 'add-vendor') addVendor(fd);
  else if (kind === 'add-guest') addGuest(fd);
  else if (kind === 'add-budget') addBudgetRow(fd);
  else if (kind === 'link') {
    const g = d.guests.find((x) => x.row === Number(form.dataset.row));
    const other = d.guests.find((x) => x.name && x.name.toLowerCase() === String(fd.other || '').trim().toLowerCase());
    if (!other) { toast('Pick a name from the guest list', true); return; }
    linkGuests(g, other);
  }
  else if (kind === 'add-payment') addPayment(fd);
  else if (kind === 'book') bookQuote(fd);
});

function addTask(fd) {
  const d = state.data; const due = fromISO(fd.due);
  if (!isNum(d.o.weddingDate) || !isNum(due)) { toast('Set the wedding date first', true); return; }
  const r = d.timelineLastRow + 1; const db = d.o.weddingDate - due;
  const id = `T${Math.max(0, ...d.tasks.map((t) => Number(String(t.id).replace(/^T/, '')) || 0)) + 1}`; const phase = phaseFor(db);
  d.tasks.push({ row: r, phase, name: fd.name.trim(), daysBefore: db, due, status: 'Not started', owner: fd.owner, notes: fd.notes || '', claude: '', id });
  d.timelineLastRow = r; state.modal = null; render();
  save(() => writeCells([{ range: `Timeline!A${r}:J${r}`, values: [[phase, asText(fd.name.trim()), db, `=Overview!$B$4-C${r}`, `=IF(F${r}="Done","",D${r}-TODAY())`, 'Not started', fd.owner, asText(fd.notes || ''), '', id]] }]), 'Task added');
}
function vendorSlot(cat, day) {
  const vs = state.data.vendors; const c = (cat || '').toLowerCase();
  return vs.find((v) => !v.vendor && v.cat && c && (v.cat.toLowerCase() === c || c.includes(v.cat.toLowerCase()) || v.cat.toLowerCase().includes(c)) && (!day || v.day === day))
    || vs.find((v) => !v.cat && !v.vendor);
}
function writeVendor(slot, f) {
  Object.assign(slot, f); const r = slot.row;
  return [
    { range: `Vendors!A${r}:F${r}`, values: [[slot.day, asText(slot.cat), asText(slot.vendor), asText(slot.contact || ''), asText(slot.phone || ''), slot.signed || '']] },
    { range: `Vendors!G${r}`, values: [[isNum(slot.total) ? slot.total : '']] },
    { range: `Vendors!J${r}`, values: [[`=IF(G${r}="","",G${r}-N(H${r})-N(I${r}))`]] },
    { range: `Vendors!M${r}`, values: [[asText(slot.notes || '')]] },
  ];
}
function addVendor(fd) {
  const slot = vendorSlot(fd.cat, fd.day); if (!slot) { toast('The Vendors sheet is full (rows 5–36). Add rows above TOTAL in the sheet.', true); return; }
  const total = toNum(fd.total); const writes = writeVendor(slot, { day: fd.day, cat: slot.cat || fd.cat.trim(), vendor: fd.vendor.trim(), total: total === null ? '' : total, notes: fd.notes || '' });
  state.modal = null; render(); save(() => writeCells(writes), 'Vendor added');
}
function bookQuote(fd) {
  const q = state.data.quotes.find((x) => x.id === state.modal.id); if (!q) return;
  const slot = vendorSlot(q.cat, fd.day); if (!slot) { toast('The Vendors sheet is full (rows 5–36).', true); return; }
  const total = toNum(fd.total);
  const writes = writeVendor(slot, { day: fd.day, cat: slot.cat || q.cat, vendor: q.vendor, contact: q.contact, signed: 'Pending', total: total === null ? q.total : total, notes: `Booked from quote ${q.id}` });
  q.status = 'Booked'; writes.push({ range: `Quotes!D${q.row}`, values: [['Booked']] });
  state.modal = null; state.compare.delete(q.id); render();
  save(() => writeCells(writes), `${q.vendor} booked`);
}
function addPayment(fd) {
  const amount = toNum(fd.amount); if (amount === null || amount === '') { toast('Please enter an amount', true); return; }
  const d = state.data; const row = 2 + Math.max(-1, ...d.payments.map((p) => p.row - 2)) + 1;
  d.payments.push({ row, vendor: fd.vendor.trim(), cat: fd.cat || '', what: fd.what || '', amount, due: fromISO(fd.due), status: 'Planned', paidOn: '', notes: '', quoteId: '' });
  state.modal = null; render();
  save(() => appendRow('Payments', 'I', [asText(fd.vendor.trim()), asText(fd.cat || ''), asText(fd.what || ''), amount, fd.due, 'Planned', '', '', '']), 'Payment added');
}
function markPaid(row) {
  const d = state.data; const p = d.payments.find((x) => x.row === row); if (!p) return;
  p.status = 'Paid'; p.paidOn = todaySerial();
  const writes = [{ range: `Payments!F${row}:G${row}`, values: [['Paid', new Date().toISOString().slice(0, 10)]] }];
  const v = d.vendors.find((x) => x.vendor && p.vendor && x.vendor.toLowerCase() === p.vendor.toLowerCase());
  if (v && isNum(p.amount)) { v.other = n0(v.other) + p.amount; writes.push({ range: `Vendors!I${v.row}`, values: [[v.other]] }, { range: `Vendors!J${v.row}`, values: [[`=IF(G${v.row}="","",G${v.row}-N(H${v.row})-N(I${v.row}))`]] }); }
  render(); save(() => writeCells(writes), v ? `Marked paid and added to ${v.vendor}'s paid amount` : 'Marked paid');
}
function addGuest(fd) {
  const d = state.data; let slot = d.guests.find((g) => !g.name); if (!slot) { slot = { row: 4 + d.guests.length }; d.guests.push(slot); }
  if (slot.row > 995) { toast('The guest list is full in the sheet (row 995).', true); return; }
  Object.assign(slot, { group: fd.group, name: fd.name.trim(), side: fd.side, rel: (fd.rel || '').trim(), contact: '', address: '', std: '', rsvp: '', meal: '', diet: '', table: '', thanks: '' });
  const r = slot.row; state.modal = null; render();
  const partner = fd.partner ? d.guests.find((x) => x.name && x.row !== r && x.name.toLowerCase() === fd.partner.trim().toLowerCase()) : null;
  const writes = [{ range: `Guests!A${r}:E${r}`, values: [[`=ROW(B${r})-3`, fd.group, asText(slot.name), fd.side, asText(slot.rel)]] }];
  slot.party = '';
  if (partner) { const label = partner.party || partner.name; partner.party = label; slot.party = label; writes.push(...partyWrites([partner, slot])); }
  render(); save(() => writeCells(writes), partner ? `Guest added and linked with ${partner.name}` : 'Guest added');
}
function removeRow(sheet, row) {
  const r = state.data[sheet].find((x) => x.row === row); if (!r) return;
  const label = sheet === 'guests' ? r.name : (r.vendor || r.cat);
  if (!confirm(`Remove ${label || 'this row'}? This clears the row in the sheet.`)) return;
  state.drawer = null;
  if (sheet === 'guests') {
    const label = r.party;
    Object.assign(r, { group: '', name: '', side: '', rel: '', contact: '', address: '', std: '', rsvp: '', meal: '', diet: '', table: '', thanks: '', party: '' });
    const writes = [{ range: `Guests!B${row}:N${row}`, values: [Array(13).fill('')] }];
    const rest = label ? state.data.guests.filter((x) => x.name && x.party === label) : [];
    if (rest.length === 1) { rest[0].party = ''; writes.push(...partyWrites(rest)); }
    render(); save(() => writeCells(writes), 'Guest removed');
  } else {
    Object.assign(r, { vendor: '', contact: '', phone: '', signed: '', total: '', deposit: '', other: '', due: '', arrival: '', notes: '' }); render();
    save(() => writeCells([{ range: `Vendors!C${row}:I${row}`, values: [Array(7).fill('')] }, { range: `Vendors!K${row}:M${row}`, values: [Array(3).fill('')] }]), 'Vendor cleared');
  }
}

// tooltips
const tip = document.getElementById('tip');
document.addEventListener('mousemove', (e) => {
  const el = e.target.closest?.('[data-tip]');
  if (!el || !el.dataset.tip) { tip.classList.remove('show'); return; }
  tip.textContent = el.dataset.tip; tip.classList.add('show');
  const x = Math.min(window.innerWidth - tip.offsetWidth - 8, e.clientX + 12); tip.style.left = `${x}px`; tip.style.top = `${e.clientY - tip.offsetHeight - 10}px`;
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && (state.modal || state.drawer)) { state.modal = null; state.drawer = null; render(); } });

// ---------- boot ----------
async function boot() {
  if (DEMO) { await load(); state.signedIn = true; render(); return; }
  render();
  try { await initAuth(); } catch (e) { state.error = e.message; render(); return; }
  if (tokenValid()) { state.signedIn = true; render(); try { await load(); } catch (e) { handleError(e); } render(); }
}
boot();

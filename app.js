import { CONFIG } from './config.js';
import { demoValueRanges } from './demo.js';

const DEMO = new URLSearchParams(location.search).has('demo');
const SID = CONFIG.spreadsheetId;
const STATUSES = ['Not started', 'In progress', 'Done', 'Skipped'];
const PHASES = ['12+ months', '9–12 months', '6–9 months', '3–6 months', '2–3 months', '1–2 months', 'Final week', 'After'];
const SHEET = { vendors: 'Vendors', budget: 'Budget', guests: 'Guests', overview: 'Overview', timeline: 'Timeline' };
const RANGES = [
  'Overview!B4:B7', 'Timeline!A5:J400', 'Budget!A5:G18', 'Guests!A4:M995',
  'Vendors!A5:M36', 'Comments!A2:E3000', 'Decisions!A2:F3000',
];

// ---------- small helpers ----------
const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isNum = (v) => typeof v === 'number' && !isNaN(v);
const n0 = (v) => (isNum(v) ? v : 0);
const money = (v) => (isNum(v) ? v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '—');
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
// Free text goes in as USER_ENTERED; keep anything that Sheets would reinterpret as plain text.
const asText = (v) => (typeof v === 'string' && v !== '' && (/^[=+\-@]/.test(v) || /^[\d\s\-/.:()]+$/.test(v)) ? "'" + v : v);

// ---------- dates (Sheets serial numbers) ----------
const EPOCH = Date.UTC(1899, 11, 30);
const DAY = 86400000;
function todaySerial() { const d = new Date(); return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / DAY); }
const serialDate = (s) => new Date(EPOCH + Math.floor(s) * DAY);
function fmtDate(s, withYear = true) {
  if (!isNum(s)) return '';
  return serialDate(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' });
}
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
function nowSerial() { const d = new Date(); return (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()) - EPOCH) / DAY; }
function nowStamp() {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function phaseFor(daysBefore) {
  if (daysBefore >= 365) return PHASES[0]; if (daysBefore >= 270) return PHASES[1]; if (daysBefore >= 180) return PHASES[2];
  if (daysBefore >= 90) return PHASES[3]; if (daysBefore >= 56) return PHASES[4]; if (daysBefore >= 8) return PHASES[5];
  if (daysBefore >= 0) return PHASES[6]; return PHASES[7];
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
      store.set('wp_token', token);
      resolve(token.t);
    };
    tokenClient.error_callback = (e) => reject(new Error(e?.type === 'popup_closed' ? 'Sign-in window was closed.' : 'Sign-in failed.'));
    tokenClient.requestAccessToken({ prompt });
  });
}

// ---------- Sheets API ----------
async function api(path, { method = 'GET', body } = {}) {
  if (!tokenValid()) throw new AuthError('expired');
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SID}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token.t}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401) { token = null; store.del('wp_token'); throw new AuthError('expired'); }
  if (r.status === 403) throw new Error("This Google account can't open the planning sheet. Ask Sharon to share it with you as an editor.");
  if (!r.ok) { const t = await r.text(); throw new Error(`Google Sheets error ${r.status}: ${t.slice(0, 160)}`); }
  return r.json();
}
async function writeCells(data) {
  if (DEMO || !data.length) return;
  await api('/values:batchUpdate', { method: 'POST', body: { valueInputOption: 'USER_ENTERED', data } });
}
async function appendRow(sheet, lastCol, row) {
  if (DEMO) return;
  const range = encodeURIComponent(`${sheet}!A:${lastCol}`);
  await api(`/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, { method: 'POST', body: { values: [row] } });
}

function parse(valueRanges) {
  const [ov, tl, bu, gu, ve, co, de] = valueRanges.map((x) => x.values || []);
  const s = (v) => (v ?? '');
  return {
    o: { weddingDate: ov[0]?.[0], budget: ov[1]?.[0], targetGuests: ov[2]?.[0], venue: s(ov[3]?.[0]) },
    timelineLastRow: 4 + tl.length,
    tasks: tl.map((r, i) => ({
      row: 5 + i, phase: s(r[0]), name: s(r[1]), daysBefore: r[2], due: r[3], status: r[5] || 'Not started',
      owner: s(r[6]), notes: s(r[7]), claude: s(r[8]), id: s(r[9]) || `R${5 + i}`,
    })).filter((t) => String(t.name).trim()),
    budget: bu.map((r, i) => ({ row: 5 + i, cat: s(r[0]), pct: r[1], est: r[3], act: r[4], notes: s(r[6]) })).filter((b) => b.cat),
    guests: Array.from({ length: Math.max(gu.length, 1) }, (_, i) => gu[i] || []).map((r, i) => ({
      row: 4 + i, group: s(r[1]), name: s(r[2]), side: s(r[3]), rel: s(r[4]), contact: s(r[5]), address: s(r[6]),
      std: s(r[7]), rsvp: s(r[8]), meal: s(r[9]), diet: s(r[10]), table: s(r[11]), thanks: s(r[12]),
    })),
    vendors: Array.from({ length: 32 }, (_, i) => ve[i] || []).map((r, i) => ({
      row: 5 + i, day: s(r[0]), cat: s(r[1]), vendor: s(r[2]), contact: s(r[3]), phone: s(r[4]), signed: s(r[5]),
      total: r[6], deposit: r[7], other: r[8], due: r[10], arrival: r[11], notes: s(r[12]),
    })),
    comments: co.map((r) => ({ ts: r[0], id: s(r[1]), task: s(r[2]), author: s(r[3]), text: s(r[4]) })).filter((c) => c.text),
    decisions: de.map((r) => ({ ts: r[0], author: s(r[1]), type: s(r[2]), id: s(r[3]), note: s(r[4]), text: s(r[5]) })).filter((d) => d.text || d.note),
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
  tab: store.get('wp_tab', 'home'), me: store.get('wp_me', null),
  filter: 'open', search: '', openTask: null, modal: null,
  gq: '', gside: '', ggroup: '', grsvp: '',
};

// ---------- feedback ----------
let toastTimer;
function toast(msg, err = false) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = 'show' + (err ? ' err' : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.className = ''; }, err ? 6000 : 1600);
}
function handleError(e) {
  if (e instanceof AuthError) {
    if (!state.data) state.signedIn = false; else state.authExpired = true;
    render(); toast('Please reconnect to Google', true);
  } else { console.error(e); toast(e.message || 'Something went wrong', true); }
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
  const balance = (v) => (isNum(v.total) ? v.total - n0(v.deposit) - n0(v.other) : 0);
  return {
    today, guests, vendors, balance,
    daysToGo: isNum(d.o.weddingDate) ? Math.round(d.o.weddingDate - today) : null,
    open: d.tasks.filter((t) => !t.closed), overdue: d.tasks.filter((t) => t.overdue), soon: d.tasks.filter((t) => t.soon),
    done: d.tasks.filter((t) => t.status === 'Done'),
    spent: d.budget.reduce((a, b) => a + n0(b.act), 0) ,
    estimated: d.budget.reduce((a, b) => a + n0(b.est), 0),
    owed: vendors.reduce((a, v) => a + balance(v), 0),
    attending: guests.filter((g) => g.rsvp === 'Yes').length,
    declined: guests.filter((g) => g.rsvp === 'No').length,
  };
}
const commentsFor = (id) => state.data.comments.filter((c) => c.id === id);

// ---------- rendering ----------
const app = document.getElementById('app');
function render() {
  if (!DEMO && !state.signedIn) { app.innerHTML = signInView(); return; }
  if (!state.data) { app.innerHTML = '<div class="splash">Loading your plan…</div>'; return; }
  const D = derived();
  const tabs = [['home', 'Home'], ['vendors', 'Vendors'], ['budget', 'Budget'], ['guests', 'Guests']];
  const view = { home: homeView, vendors: vendorsView, budget: budgetView, guests: guestsView }[state.tab] || homeView;
  app.innerHTML = `
    <header class="topbar"><div class="topbar-inner">
      <div class="brand"><h1>Sharon &amp; Claire</h1>${D.daysToGo !== null ? `<span class="count">${D.daysToGo} days to go</span>` : ''}</div>
      <nav class="tabs">${tabs.map(([k, l]) => `<button data-act="tab" data-tab="${k}" ${state.tab === k ? 'aria-current="page"' : ''}>${l}</button>`).join('')}</nav>
      <div class="me">${state.me ? `You're <b>${esc(state.me)}</b>` : ''}<button data-act="switch-me">Switch</button></div>
    </div></header>
    <main class="shell">
      ${DEMO ? '<div class="banner info"><span><b>Demo mode</b>: sample data, nothing is saved to Google.</span></div>' : ''}
      ${state.authExpired ? '<div class="banner"><span>Your Google session expired. Changes won\'t save until you reconnect.</span><button class="btn primary" data-act="reconnect">Reconnect</button></div>' : ''}
      ${view(D)}
      <p class="footer-note">Everything here lives in your Google Sheet. Edits in either place show up in both.</p>
    </main>
    ${modalView()}`;
}

function signInView() {
  return `<div class="signin"><div class="card">
    <h1>Wedding Planner</h1>
    <p>Sign in with the Google account that can edit the planning sheet.</p>
    ${state.error ? `<p class="neg">${esc(state.error)}</p>` : ''}
    <button class="btn primary" data-act="signin">Sign in with Google</button>
  </div></div>`;
}

// ----- Home -----
function homeView(D) {
  const o = state.data.o;
  const budgetPct = isNum(o.budget) && o.budget ? Math.round((D.spent / o.budget) * 100) : 0;
  return `
    <section class="card hero">
      <div>
        <div class="days">${D.daysToGo ?? '—'} <span style="font-size:.4em;color:var(--ink-2)">days</span></div>
        <div class="when">until ${fmtDate(o.weddingDate) || 'the wedding'}${o.venue ? ` · ${esc(o.venue)}` : ''}</div>
      </div>
      <div class="details">
        <div><label>Wedding date</label><input type="date" data-act="ov" data-cell="B4" data-type="date" value="${toISO(o.weddingDate)}"></div>
        <div><label>Total budget</label><input inputmode="decimal" data-act="ov" data-cell="B5" data-type="money" value="${isNum(o.budget) ? o.budget : ''}"></div>
        <div><label>Target guests</label><input inputmode="numeric" data-act="ov" data-cell="B6" data-type="money" value="${isNum(o.targetGuests) ? o.targetGuests : ''}"></div>
        <div><label>Venue / city</label><input data-act="ov" data-cell="B7" data-type="text" value="${esc(o.venue)}"></div>
      </div>
    </section>

    <section class="stats">
      <div class="card stat ${D.overdue.length ? 'warn' : ''}"><div class="label">Overdue</div><div class="value">${D.overdue.length}</div><div class="sub">${D.overdue.length ? 'tasks past due' : 'nothing late'}</div></div>
      <div class="card stat"><div class="label">Next 30 days</div><div class="value">${D.soon.length}</div><div class="sub">tasks coming up</div></div>
      <div class="card stat"><div class="label">Tasks done</div><div class="value">${D.done.length}<span style="font-size:.55em;color:var(--ink-3)"> / ${state.data.tasks.length}</span></div><div class="sub">${D.open.filter((t) => !t.owner).length} open without an owner</div></div>
      <div class="card stat"><div class="label">Spent</div><div class="value">${money(D.spent)}</div><div class="sub">${budgetPct}% of ${money(o.budget)}</div></div>
      <div class="card stat"><div class="label">Owed to vendors</div><div class="value">${money(D.owed)}</div><div class="sub">${D.vendors.filter((v) => v.signed === 'Yes').length} contracts signed</div></div>
      <div class="card stat ${isNum(o.targetGuests) && D.guests.length > o.targetGuests ? 'warn' : ''}"><div class="label">Guests</div><div class="value">${D.guests.length}</div><div class="sub">invited · target ${isNum(o.targetGuests) ? o.targetGuests : '—'} · ${D.attending} yes</div></div>
    </section>

    ${claudePanel()}

    <section class="section">
      <div class="section-head"><h2>Tasks</h2><button class="btn primary" data-act="add-task">+ Add task</button></div>
      <div class="filters">
        ${taskFilterChips(D)}
        <input class="field search" type="search" placeholder="Search tasks" data-act="search" value="${esc(state.search)}">
      </div>
      ${taskList(D)}
    </section>`;
}

function claudePanel() {
  const recent = [...state.data.decisions].reverse().slice(0, 8);
  return `<section class="card claude-panel section">
    <div>
      <h2>Tell Claude</h2>
      <p class="help">Standing instructions or context for Claude's notes, like “we're fine with ~140 guests” or “Claire owns all family tasks.” To refresh the notes, open Claude and say <code class="inline">refresh my wedding notes</code>.</p>
      <form data-form="tell"><textarea class="field" name="text" placeholder="Something Claude should know…" required></textarea>
      <div class="row-actions"><button class="btn primary" type="submit">Save for Claude</button></div></form>
    </div>
    <div>
      <h3 class="muted" style="font:600 12px Inter;text-transform:uppercase;letter-spacing:.08em;margin:2px 0 10px">What Claude knows you've decided</h3>
      ${recent.length ? `<div class="decisions">${recent.map((d) => `<div class="decision">${d.note ? `<div class="meta">Re: ${esc(d.note)}</div>` : ''}<div>${esc(d.text || 'Got it')}</div><div class="meta">${esc(d.author)} · ${fmtStamp(d.ts)}</div></div>`).join('')}</div>` : '<p class="empty">Nothing yet. Tap “Got it” on one of Claude\'s notes, or add an instruction.</p>'}
    </div>
  </section>`;
}

const FILTERS = [
  ['open', 'Open', (t) => !t.closed],
  ['mine', 'Mine', (t) => !t.closed && (t.owner === state.me || t.owner === 'Both')],
  ['overdue', 'Overdue', (t) => t.overdue],
  ['soon', 'Next 30 days', (t) => t.soon],
  ['unassigned', 'No owner', (t) => !t.closed && !t.owner],
  ['done', 'Done', (t) => t.closed],
  ['all', 'All', () => true],
];
function taskFilterChips() {
  return FILTERS.map(([k, l, f]) => `<button class="chip" data-act="filter" data-f="${k}" aria-pressed="${state.filter === k}">${l}<span class="n">${state.data.tasks.filter(f).length}</span></button>`).join('');
}
function taskList(D) {
  const f = FILTERS.find((x) => x[0] === state.filter)[2];
  const q = state.search.trim().toLowerCase();
  const list = state.data.tasks.filter(f).filter((t) => !q || `${t.name} ${t.notes} ${t.claude}`.toLowerCase().includes(q))
    .sort((a, b) => n0(a.due) - n0(b.due));
  if (!list.length) return '<div class="card" style="padding:24px"><p class="empty">No tasks match.</p></div>';
  const head = '<div class="list-head"><span>Status</span><span>Task</span><span>Owner</span><span>Claude\'s take</span><span></span></div>';
  const block = (title, items, cls = '') => (items.length ? `<div class="group-title ${cls}">${title} <span>${items.length}</span></div><div class="card tasks">${head}${items.map(taskRow).join('')}</div>` : '');
  if (!['open', 'mine', 'unassigned', 'all'].includes(state.filter)) return block(FILTERS.find((x) => x[0] === state.filter)[1], list);
  const overdue = list.filter((t) => t.overdue); const soon = list.filter((t) => t.soon);
  const rest = list.filter((t) => !t.overdue && !t.soon && !t.closed); const closed = list.filter((t) => t.closed);
  const byPhase = PHASES.map((p) => [p, rest.filter((t) => t.phase === p)]);
  const other = rest.filter((t) => !PHASES.includes(t.phase));
  return block('Overdue', overdue, 'warn') + block('Next 30 days', soon)
    + byPhase.map(([p, items]) => block(p, items)).join('') + block('Other', other) + block('Done & skipped', closed);
}
function taskRow(t) {
  const open = state.openTask === t.id; const n = commentsFor(t.id).length;
  const thisYear = isNum(t.due) && serialDate(t.due).getUTCFullYear() === new Date().getFullYear();
  let when = isNum(t.due) ? `Due ${fmtDate(t.due, !thisYear)}` : 'No due date';
  if (t.overdue) when += ` · <span class="late">${plural(-t.left, 'day')} late</span>`;
  else if (!t.closed && t.left !== null) when += t.left === 0 ? ' · today' : ` · in ${plural(t.left, 'day')}`;
  return `<div class="task ${open ? 'open' : ''} ${t.closed ? 'done' : ''}">
    <div class="task-row" data-act="toggle" data-id="${esc(t.id)}">
      <div class="c-status"><select class="status" data-v="${esc(t.status)}" data-act="task-field" data-field="status" data-id="${esc(t.id)}" aria-label="Status">${STATUSES.map((s) => `<option ${s === t.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div class="c-name"><div class="task-name">${esc(t.name)}</div><div class="task-meta">${when}</div></div>
      <div class="c-owner"><select class="owner" data-v="${esc(t.owner)}" data-act="task-field" data-field="owner" data-id="${esc(t.id)}" aria-label="Owner">${[['', 'Unassigned'], ['Sharon', 'Sharon'], ['Claire', 'Claire'], ['Both', 'Both']].map(([v, l]) => `<option value="${v}" ${v === t.owner ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="c-claude">${t.claude ? `<div class="claude"><span class="txt">${esc(t.claude)}</span><button class="gotit" data-act="gotit" data-id="${esc(t.id)}">Got it</button></div>` : '<span class="claude-empty">—</span>'}</div>
      <div class="c-cc ccount ${n ? 'has' : ''}" title="Comments">💬 ${n}</div>
    </div>
    ${open ? taskDetail(t) : ''}
  </div>`;
}
function taskDetail(t) {
  const thread = commentsFor(t.id);
  return `<div class="task-detail">
    <div>
      <h3>Details</h3>
      <div class="form-grid">
        <label class="full">Task<input class="field" data-act="task-field" data-field="name" data-id="${esc(t.id)}" value="${esc(t.name)}"></label>
        <label>Due date<input class="field" type="date" data-act="task-field" data-field="due" data-id="${esc(t.id)}" value="${toISO(t.due)}"></label>
        <label>Phase<select class="field" data-act="task-field" data-field="phase" data-id="${esc(t.id)}">${[...new Set([...PHASES, t.phase])].filter(Boolean).map((p) => `<option ${p === t.phase ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></label>
        <label class="full">Notes<textarea class="field" data-act="task-field" data-field="notes" data-id="${esc(t.id)}" placeholder="Links, quotes, details…">${esc(t.notes)}</textarea></label>
      </div>
    </div>
    <div>
      <h3>Comments</h3>
      ${thread.length ? `<div class="thread">${thread.map((c) => `<div class="msg"><div class="who ${esc(c.author)}">${esc(c.author)}<span class="when">${fmtStamp(c.ts)}</span></div><p>${esc(c.text)}</p></div>`).join('')}</div>` : '<p class="empty">No comments yet.</p>'}
      <form data-form="comment" data-id="${esc(t.id)}"><textarea class="field" name="text" placeholder="Add a comment for ${state.me === 'Claire' ? 'Sharon' : 'Claire'}…" required></textarea>
      <div class="row-actions"><button class="btn primary" type="submit">Post comment</button></div></form>
    </div>
  </div>`;
}

// ----- Editable tables (Vendors, Budget, Guests) -----
const VENDOR_COLS = [
  { k: 'cat', c: 'B', label: 'Category', type: 'text', w: 'w-m', sticky: true },
  { k: 'vendor', c: 'C', label: 'Vendor', type: 'text', w: 'w-l' },
  { k: 'day', c: 'A', label: 'Day', type: 'select', opts: ['', 'All', 'Friday', 'Saturday', 'Sunday', 'N/A'], w: 'w-m' },
  { k: 'signed', c: 'F', label: 'Contract', type: 'select', opts: ['', 'Yes', 'No', 'Pending'] },
  { k: 'total', c: 'G', label: 'Total', type: 'money' },
  { k: 'deposit', c: 'H', label: 'Deposit paid', type: 'money' },
  { k: 'other', c: 'I', label: 'Other paid', type: 'money' },
  { k: 'balance', label: 'Balance', type: 'computed', fn: (v) => (isNum(v.total) ? money(v.total - n0(v.deposit) - n0(v.other)) : '') },
  { k: 'due', c: 'K', label: 'Final payment', type: 'date' },
  { k: 'contact', c: 'D', label: 'Contact', type: 'text', w: 'w-m' },
  { k: 'phone', c: 'E', label: 'Phone / email', type: 'text', w: 'w-l' },
  { k: 'arrival', c: 'L', label: 'Arrival', type: 'time', w: 'w-s' },
  { k: 'notes', c: 'M', label: 'Notes', type: 'text', w: 'w-xl' },
];
const BUDGET_COLS = [
  { k: 'cat', c: 'A', label: 'Category', type: 'text', w: 'w-l', sticky: true },
  { k: 'pct', c: 'B', label: '% of budget', type: 'percent' },
  { k: 'planned', label: 'Planned', type: 'computed', fn: (b) => money(n0(b.pct) * n0(state.data.o.budget)) },
  { k: 'est', c: 'D', label: 'Estimated', type: 'money' },
  { k: 'act', c: 'E', label: 'Actual', type: 'money' },
  { k: 'diff', label: 'Left (planned − actual)', type: 'computed', fn: (b) => { if (!isNum(b.act)) return ''; const v = n0(b.pct) * n0(state.data.o.budget) - b.act; return `<span class="${v < 0 ? 'neg' : ''}">${money(v)}</span>`; } },
  { k: 'notes', c: 'G', label: 'Notes', type: 'text', w: 'w-xl' },
];
const GUEST_COLS = [
  { k: 'name', c: 'C', label: 'Name', type: 'text', w: 'w-l', sticky: true },
  { k: 'group', c: 'B', label: 'Group', type: 'select', opts: ['', 'A', 'B', 'C'] },
  { k: 'side', c: 'D', label: 'Side', type: 'select', opts: ['', 'Sharon', 'Claire', 'Both'] },
  { k: 'rel', c: 'E', label: 'Relationship', type: 'text', w: 'w-m', list: 'rel-list' },
  { k: 'rsvp', c: 'I', label: 'RSVP', type: 'select', opts: ['', 'Pending', 'Yes', 'No'] },
  { k: 'meal', c: 'J', label: 'Meal', type: 'text', w: 'w-m' },
  { k: 'diet', c: 'K', label: 'Dietary', type: 'text', w: 'w-m' },
  { k: 'table', c: 'L', label: 'Table', type: 'text', w: 'w-s' },
  { k: 'contact', c: 'F', label: 'Email / phone', type: 'text', w: 'w-l' },
  { k: 'address', c: 'G', label: 'Mailing address', type: 'text', w: 'w-xl' },
  { k: 'std', c: 'H', label: 'Save-the-date', type: 'select', opts: ['', 'Yes', 'No'] },
  { k: 'thanks', c: 'M', label: 'Thank-you sent', type: 'select', opts: ['', 'Yes', 'No'] },
];
const COLS = { vendors: VENDOR_COLS, budget: BUDGET_COLS, guests: GUEST_COLS };

function cellHTML(sheet, r, col) {
  const v = r[col.k];
  const a = `data-act="cell" data-sheet="${sheet}" data-row="${r.row}" data-k="${col.k}" aria-label="${esc(col.label)}"`;
  const td = (inner, cls = '') => `<td class="${cls} ${col.sticky ? 'sticky' : ''}">${inner}</td>`;
  switch (col.type) {
    case 'computed': return `<td class="ro num" data-computed="${sheet}-${r.row}-${col.k}">${col.fn(r)}</td>`;
    case 'select': return td(`<select class="cell ${col.w || 'w-s'}" ${a}>${[...new Set([...col.opts, v])].map((o) => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${esc(o || '—')}</option>`).join('')}</select>`);
    case 'money': return td(`<input class="cell num w-s" inputmode="decimal" ${a} value="${isNum(v) ? v : esc(v ?? '')}">`, 'num');
    case 'percent': return td(`<input class="cell num w-s" inputmode="decimal" ${a} value="${isNum(v) ? +(v * 100).toFixed(2) : ''}" placeholder="%">`, 'num');
    case 'date': return td(`<input class="cell w-m" type="date" ${a} value="${toISO(v)}">`);
    case 'time': return td(`<input class="cell ${col.w || 'w-s'}" ${a} value="${esc(fmtTime(v))}" placeholder="4:00 PM">`);
    default: return td(`<input class="cell ${col.w || 'w-m'}" ${a} value="${esc(v)}" ${col.list ? `list="${col.list}"` : ''}>`);
  }
}
function tableHTML(sheet, rows, { del = false, foot = '' } = {}) {
  const cols = COLS[sheet];
  return `<div class="card table-wrap"><table class="data">
    <thead><tr>${cols.map((c) => `<th class="${['money', 'percent', 'computed'].includes(c.type) ? 'num' : ''} ${c.sticky ? 'sticky' : ''}">${esc(c.label)}</th>`).join('')}${del ? '<th></th>' : ''}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${cols.map((c) => cellHTML(sheet, r, c)).join('')}${del ? `<td><button class="del" title="Remove" data-act="remove-row" data-sheet="${sheet}" data-row="${r.row}">×</button></td>` : ''}</tr>`).join('')}</tbody>
    ${foot}
  </table></div>`;
}

// ----- Vendors -----
function vendorsView(D) {
  return `<section class="section">
    <div class="section-head"><h2>Vendors &amp; payments</h2><button class="btn primary" data-act="add-vendor">+ Add vendor</button></div>
    <div id="summary">${vendorSummary(D)}</div>
  </section>
  <section class="section">${tableHTML('vendors', D.vendors, { del: true })}</section>`;
}
function vendorSummary(D) {
  const signed = D.vendors.filter((v) => v.signed === 'Yes');
  const total = D.vendors.reduce((a, v) => a + n0(v.total), 0);
  const paid = D.vendors.reduce((a, v) => a + n0(v.deposit) + n0(v.other), 0);
  const next = D.vendors.filter((v) => isNum(v.due) && D.balance(v) > 0).sort((a, b) => a.due - b.due)[0];
  return `<div class="card" style="padding:14px 16px"><div class="summary-line">
    <span><b>${signed.length}</b> of ${D.vendors.length} booked</span>
    <span>Contracted <b>${money(total)}</b></span><span>Paid <b>${money(paid)}</b></span>
    <span>Still owed <b>${money(total - paid)}</b></span>
    ${next ? `<span>Next payment <b>${money(D.balance(next))}</b> to ${esc(next.vendor || next.cat)} by <b>${fmtDate(next.due)}</b></span>` : ''}
  </div></div>`;
}

// ----- Budget -----
function budgetView() {
  return `<section class="section"><div class="section-head"><h2>Budget</h2></div><div id="summary">${budgetSummary()}</div></section>
  <section class="section">${tableHTML('budget', state.data.budget, { foot: `<tfoot id="budget-foot">${budgetFoot()}</tfoot>` })}</section>`;
}
function budgetTotals() {
  const b = state.data.budget; const total = n0(state.data.o.budget);
  return { total, pct: b.reduce((a, x) => a + n0(x.pct), 0), est: b.reduce((a, x) => a + n0(x.est), 0), act: b.reduce((a, x) => a + n0(x.act), 0) };
}
function budgetFoot() {
  const T = budgetTotals();
  return `<tr><td class="sticky">Total</td><td class="num ${Math.abs(T.pct - 1) > 0.001 ? 'neg' : ''}">${Math.round(T.pct * 1000) / 10}%</td><td class="num">${money(T.pct * T.total)}</td><td class="num">${money(T.est)}</td><td class="num">${money(T.act)}</td><td class="num">${money(T.total - T.act)}</td><td></td></tr>`;
}
function budgetSummary() {
  const T = budgetTotals(); const rows = state.data.budget;
  const bars = rows.map((b) => {
    const planned = n0(b.pct) * T.total; const est = n0(b.est); const act = n0(b.act);
    const base = Math.max(planned, est, act, 1);
    const over = est > planned && planned > 0;
    return `<div class="bar-row"><span>${esc(b.cat)}</span>
      <div class="bar-track" title="Planned ${money(planned)}"><div class="bar-est" style="width:${(est / base) * 100}%"></div><div class="bar-act" style="width:${(act / base) * 100}%"></div>${planned < base ? `<div style="position:absolute;top:-2px;bottom:-2px;left:${(planned / base) * 100}%;width:2px;background:var(--ink)"></div>` : ''}</div>
      <span class="amt ${over ? 'over' : ''}">${est ? money(est) : '—'} / ${money(planned)}</span></div>`;
  }).join('');
  return `<div class="card">
    <div style="padding:14px 16px 0" class="summary-line"><span>Budget <b>${money(T.total)}</b></span><span>Estimated <b>${money(T.est)}</b></span><span>Spent <b>${money(T.act)}</b></span><span>Remaining <b>${money(T.total - T.act)}</b></span>${Math.abs(T.pct - 1) > 0.001 ? `<span class="neg">Splits add to ${Math.round(T.pct * 1000) / 10}%, not 100%</span>` : ''}</div>
    <div class="bars">${bars}</div>
    <div class="legend"><span><i style="background:color-mix(in srgb,var(--gold) 45%,transparent)"></i>Estimated</span><span><i style="background:var(--accent)"></i>Spent</span><span><i style="background:var(--ink);width:2px"></i>Planned, when a quote goes over it</span><span>Right column: estimated / planned</span></div>
  </div>`;
}

// ----- Guests -----
function guestsView(D) {
  const q = state.gq.trim().toLowerCase();
  const rows = D.guests.filter((g) => (!q || `${g.name} ${g.rel} ${g.contact}`.toLowerCase().includes(q))
    && (!state.gside || g.side === state.gside) && (!state.ggroup || g.group === state.ggroup)
    && (!state.grsvp || (state.grsvp === 'Pending' ? !['Yes', 'No'].includes(g.rsvp) : g.rsvp === state.grsvp)));
  const rels = [...new Set(D.guests.map((g) => g.rel).filter(Boolean))].sort();
  const sel = (key, label, opts) => `<select class="field" style="width:auto" data-act="gfilter" data-key="${key}"><option value="">${label}</option>${opts.map((o) => `<option ${state[key] === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  return `<section class="section">
    <div class="section-head"><h2>Guests</h2><button class="btn primary" data-act="add-guest">+ Add guest</button></div>
    <div id="summary">${guestSummary(D)}</div>
  </section>
  <section class="section">
    <div class="filters" style="margin-bottom:12px">
      <input class="field search" type="search" placeholder="Search guests" data-act="gsearch" value="${esc(state.gq)}">
      ${sel('gside', 'Both sides', ['Sharon', 'Claire', 'Both'])}${sel('ggroup', 'All groups', ['A', 'B', 'C'])}${sel('grsvp', 'Any RSVP', ['Yes', 'No', 'Pending'])}
      <span class="muted" style="font-size:13px">${rows.length} shown</span>
    </div>
    <datalist id="rel-list">${rels.map((r) => `<option value="${esc(r)}">`).join('')}</datalist>
    ${rows.length ? tableHTML('guests', rows, { del: true }) : '<div class="card" style="padding:24px"><p class="empty">No guests match.</p></div>'}
  </section>`;
}
function guestSummary(D) {
  const g = D.guests; const target = state.data.o.targetGuests;
  const c = (f) => g.filter(f).length;
  return `<div class="card" style="padding:14px 16px"><div class="summary-line">
    <span><b>${g.length}</b> invited${isNum(target) ? ` · target <b>${target}</b>${g.length > target ? ` <span class="neg">(${g.length - target} over)</span>` : ''}` : ''}</span>
    <span>A-list <b>${c((x) => x.group === 'A')}</b> · B-list <b>${c((x) => x.group === 'B')}</b></span>
    <span>Sharon <b>${c((x) => x.side === 'Sharon')}</b> · Claire <b>${c((x) => x.side === 'Claire')}</b></span>
    <span>RSVP yes <b>${D.attending}</b> · no <b>${D.declined}</b> · waiting <b>${g.length - D.attending - D.declined}</b></span>
  </div></div>`;
}

// ----- Modals -----
function modalView() {
  if (!state.me) {
    return `<div class="modal-bg"><div class="modal" style="text-align:center"><h2>Who's planning?</h2><p class="muted">So comments show the right name. You can switch later.</p>
      <div class="who-pick">${CONFIG.people.map((p) => `<button class="btn primary" data-act="set-me" data-who="${p}">I'm ${p}</button>`).join('')}</div></div></div>`;
  }
  const m = state.modal; if (!m) return '';
  const wrap = (title, body, form) => `<div class="modal-bg" data-act="close-modal"><form class="modal" data-form="${form}"><h2>${title}</h2>${body}
    <div class="actions"><button type="button" class="btn ghost" data-act="close-modal">Cancel</button><button class="btn primary" type="submit">Save</button></div></form></div>`;
  if (m.type === 'add-task') {
    return wrap('Add a task', `<div class="form-grid">
      <label class="full">Task<input class="field" name="name" required autofocus></label>
      <label>Due date<input class="field" type="date" name="due" required></label>
      <label>Owner<select class="field" name="owner"><option value="">Unassigned</option><option>Sharon</option><option>Claire</option><option>Both</option></select></label>
      <label class="full">Notes<textarea class="field" name="notes"></textarea></label></div>`, 'add-task');
  }
  if (m.type === 'gotit') {
    const t = state.data.tasks.find((x) => x.id === m.id);
    return wrap('Got it', `<div class="claude" style="margin-bottom:12px"><span class="txt">${esc(t?.claude)}</span></div>
      <label style="font-size:13px;color:var(--ink-2);display:grid;gap:4px">What did you decide? (optional, but it helps Claude)
      <textarea class="field" name="text" placeholder="e.g. We're OK with this, budget accounts for it"></textarea></label>
      <p class="muted" style="font-size:13px">The note is cleared, and Claude won't raise it again unless something big changes.</p>`, 'gotit');
  }
  if (m.type === 'add-vendor') {
    return wrap('Add a vendor', `<div class="form-grid">
      <label>Category<input class="field" name="cat" required placeholder="Photographer" autofocus></label>
      <label>Vendor<input class="field" name="vendor" placeholder="Business name"></label>
      <label>Day<select class="field" name="day"><option></option><option>All</option><option>Friday</option><option>Saturday</option><option>Sunday</option><option>N/A</option></select></label>
      <label>Quote / total ($)<input class="field" name="total" inputmode="decimal"></label>
      <label class="full">Notes<textarea class="field" name="notes"></textarea></label></div>`, 'add-vendor');
  }
  if (m.type === 'add-guest') {
    return wrap('Add a guest', `<div class="form-grid">
      <label class="full">Name<input class="field" name="name" required autofocus></label>
      <label>Side<select class="field" name="side"><option>Sharon</option><option>Claire</option><option>Both</option></select></label>
      <label>Group<select class="field" name="group"><option>A</option><option>B</option><option>C</option></select></label>
      <label class="full">Relationship<input class="field" name="rel" list="rel-list"></label></div>`, 'add-guest');
  }
  return '';
}

// ---------- actions ----------
const taskById = (id) => state.data.tasks.find((t) => t.id === id);
const TASK_COL = { phase: 'A', name: 'B', status: 'F', owner: 'G', notes: 'H' };

function saveTaskField(t, field, value) {
  if (field === 'due') {
    const serial = fromISO(value);
    if (serial === '' || !isNum(state.data.o.weddingDate)) return;
    const daysBefore = state.data.o.weddingDate - serial;
    t.due = serial; t.daysBefore = daysBefore;
    return save(() => writeCells([{ range: `Timeline!C${t.row}`, values: [[daysBefore]] }]));
  }
  t[field] = value;
  const v = ['name', 'notes'].includes(field) ? asText(value) : value;
  return save(() => writeCells([{ range: `Timeline!${TASK_COL[field]}${t.row}`, values: [[v]] }]));
}

function cellValue(col, raw) {
  switch (col.type) {
    case 'money': { const s = raw.replace(/[$,\s]/g, ''); if (s === '') return { local: '', write: '' }; const n = Number(s); return isNaN(n) ? null : { local: n, write: n }; }
    case 'percent': { if (raw.trim() === '') return { local: '', write: '' }; const n = Number(raw.replace('%', '')); return isNaN(n) ? null : { local: n / 100, write: n / 100 }; }
    case 'date': return { local: fromISO(raw), write: raw || '' };
    case 'time': return { local: raw, write: raw };
    case 'select': return { local: raw, write: raw };
    default: return { local: raw, write: asText(raw) };
  }
}
function onCellChange(el) {
  const { sheet, row, k } = el.dataset; const col = COLS[sheet].find((c) => c.k === k);
  const list = sheet === 'budget' ? state.data.budget : state.data[sheet];
  const r = list.find((x) => x.row === Number(row)); if (!r) return;
  const v = cellValue(col, el.value);
  if (!v) { toast('Please enter a number', true); el.value = isNum(r[k]) ? r[k] : ''; return; }
  r[k] = v.local;
  const writes = [{ range: `${SHEET[sheet]}!${col.c}${row}`, values: [[v.write]] }];
  if (sheet === 'vendors' && ['total', 'deposit', 'other'].includes(k)) writes.push({ range: `Vendors!J${row}`, values: [[`=IF(G${row}="","",G${row}-N(H${row})-N(I${row}))`]] });
  if (sheet === 'guests' && k === 'name' && v.local) writes.push({ range: `Guests!A${row}`, values: [[`=ROW(B${row})-3`]] });
  updateDerivedUI(sheet, r);
  save(() => writeCells(writes));
}
function updateDerivedUI(sheet, r) {
  for (const col of COLS[sheet].filter((c) => c.type === 'computed')) {
    const el = app.querySelector(`[data-computed="${sheet}-${r.row}-${col.k}"]`); if (el) el.innerHTML = col.fn(r);
  }
  const D = derived(); const sum = document.getElementById('summary');
  if (sum) sum.innerHTML = sheet === 'vendors' ? vendorSummary(D) : sheet === 'budget' ? budgetSummary() : guestSummary(D);
  const foot = document.getElementById('budget-foot'); if (foot) foot.innerHTML = budgetFoot();
}

async function signIn(prompt = '') {
  try {
    state.error = '';
    if (!tokenClient) throw new Error('Google sign-in is still loading. Try again in a moment.');
    await requestToken(prompt);
    state.signedIn = true; state.authExpired = false;
    render(); await load(); render();
  } catch (e) { state.error = e.message; if (!state.data) state.signedIn = false; render(); if (state.data) handleError(e); }
}

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act;
  if (act === 'toggle') {
    if (e.target.closest('select, button, input, textarea, a')) return;
    state.openTask = state.openTask === el.dataset.id ? null : el.dataset.id; render(); return;
  }
  if (act === 'close-modal') { if (e.target === el) { state.modal = null; render(); } return; }
  if (act === 'tab') { state.tab = el.dataset.tab; store.set('wp_tab', state.tab); render(); window.scrollTo(0, 0); }
  else if (act === 'filter') { state.filter = el.dataset.f; render(); }
  else if (act === 'signin') signIn('');
  else if (act === 'reconnect') signIn('');
  else if (act === 'switch-me') { state.me = null; store.del('wp_me'); render(); }
  else if (act === 'set-me') { state.me = el.dataset.who; store.set('wp_me', state.me); render(); }
  else if (act === 'add-task') { state.modal = { type: 'add-task' }; render(); }
  else if (act === 'add-vendor') { state.modal = { type: 'add-vendor' }; render(); }
  else if (act === 'add-guest') { state.modal = { type: 'add-guest' }; render(); }
  else if (act === 'gotit') { state.modal = { type: 'gotit', id: el.dataset.id }; render(); }
  else if (act === 'remove-row') removeRow(el.dataset.sheet, Number(el.dataset.row));
  focusModal();
});

app.addEventListener('change', (e) => {
  const el = e.target; const act = el.dataset.act; if (!act) return;
  if (act === 'task-field') {
    const t = taskById(el.dataset.id); if (!t) return;
    const field = el.dataset.field;
    if (field === 'name' && !el.value.trim()) { el.value = t.name; return; }
    saveTaskField(t, field, el.value);
    if (['status', 'owner', 'due'].includes(field)) render();
  } else if (act === 'cell') onCellChange(el);
  else if (act === 'ov') {
    const o = state.data.o; const type = el.dataset.type; const key = { B4: 'weddingDate', B5: 'budget', B6: 'targetGuests', B7: 'venue' }[el.dataset.cell];
    let local; let write;
    if (type === 'date') { local = fromISO(el.value); write = el.value; }
    else if (type === 'money') { const n = Number(el.value.replace(/[$,\s]/g, '')); if (isNaN(n)) { toast('Please enter a number', true); return; } local = n; write = n; }
    else { local = el.value; write = asText(el.value); }
    o[key] = local;
    if (key === 'weddingDate') for (const t of state.data.tasks) if (isNum(t.daysBefore)) t.due = local - t.daysBefore;
    save(() => writeCells([{ range: `Overview!${el.dataset.cell}`, values: [[write]] }]));
    render();
  } else if (act === 'gfilter') { state[el.dataset.key] = el.value; render(); }
});

app.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.act === 'search') { state.search = el.value; rerenderKeepingFocus(el); }
  else if (el.dataset.act === 'gsearch') { state.gq = el.value; rerenderKeepingFocus(el); }
});
function rerenderKeepingFocus(el) {
  const act = el.dataset.act; const pos = el.selectionStart; render();
  const again = app.querySelector(`[data-act="${act}"]`); if (again) { again.focus(); again.setSelectionRange(pos, pos); }
}
function focusModal() { const f = app.querySelector('.modal [autofocus]'); if (f) f.focus(); }

app.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target; const kind = form.dataset.form; const fd = Object.fromEntries(new FormData(form));
  const me = state.me || '';
  if (kind === 'comment') {
    const t = taskById(form.dataset.id); const text = (fd.text || '').trim(); if (!t || !text) return;
    state.data.comments.push({ ts: nowSerial(), id: t.id, task: t.name, author: me, text });
    render();
    save(() => appendRow('Comments', 'E', [nowStamp(), t.id, asText(t.name), me, asText(text)]), 'Comment posted');
  } else if (kind === 'tell') {
    const text = (fd.text || '').trim(); if (!text) return;
    state.data.decisions.push({ ts: nowSerial(), author: me, type: 'Instruction', id: '', note: '', text });
    render();
    save(() => appendRow('Decisions', 'F', [nowStamp(), me, 'Instruction', '', '', asText(text)]), 'Saved for Claude');
  } else if (kind === 'gotit') {
    const t = taskById(state.modal.id); if (!t) return;
    const note = t.claude; const text = (fd.text || '').trim();
    t.claude = ''; state.modal = null;
    state.data.decisions.push({ ts: nowSerial(), author: me, type: 'Got it', id: t.id, note, text: text || 'Got it' });
    render();
    save(async () => {
      await appendRow('Decisions', 'F', [nowStamp(), me, 'Got it', t.id, asText(note), asText(text || 'Got it')]);
      await writeCells([{ range: `Timeline!I${t.row}`, values: [['']] }]);
    }, 'Claude will remember that');
  } else if (kind === 'add-task') addTask(fd);
  else if (kind === 'add-vendor') addVendor(fd);
  else if (kind === 'add-guest') addGuest(fd);
});

function addTask(fd) {
  const d = state.data; const due = fromISO(fd.due);
  if (!isNum(d.o.weddingDate) || !isNum(due)) { toast('Set the wedding date first', true); return; }
  const r = d.timelineLastRow + 1; const daysBefore = d.o.weddingDate - due;
  const maxId = Math.max(0, ...d.tasks.map((t) => Number(String(t.id).replace(/^T/, '')) || 0));
  const id = `T${maxId + 1}`; const phase = phaseFor(daysBefore);
  d.tasks.push({ row: r, phase, name: fd.name.trim(), daysBefore, due, status: 'Not started', owner: fd.owner, notes: fd.notes || '', claude: '', id });
  d.timelineLastRow = r; state.modal = null; state.filter = 'open'; state.openTask = null; render();
  save(() => writeCells([{ range: `Timeline!A${r}:J${r}`, values: [[phase, asText(fd.name.trim()), daysBefore, `=Overview!$B$4-C${r}`, `=IF(F${r}="Done","",D${r}-TODAY())`, 'Not started', fd.owner, asText(fd.notes || ''), '', id]] }]), 'Task added');
}
function addVendor(fd) {
  const slot = state.data.vendors.find((v) => !v.cat && !v.vendor);
  if (!slot) { toast('The Vendors sheet is full (rows 5–36). Add rows above the TOTAL line in the sheet.', true); return; }
  const total = fd.total ? Number(String(fd.total).replace(/[$,\s]/g, '')) : '';
  Object.assign(slot, { cat: fd.cat.trim(), vendor: fd.vendor.trim(), day: fd.day, total: isNaN(total) ? '' : total, notes: fd.notes || '' });
  const r = slot.row; state.modal = null; render();
  save(() => writeCells([
    { range: `Vendors!A${r}:C${r}`, values: [[fd.day, asText(slot.cat), asText(slot.vendor)]] },
    { range: `Vendors!G${r}`, values: [[slot.total]] },
    { range: `Vendors!J${r}`, values: [[`=IF(G${r}="","",G${r}-N(H${r})-N(I${r}))`]] },
    { range: `Vendors!M${r}`, values: [[asText(slot.notes)]] },
  ]), 'Vendor added');
}
function addGuest(fd) {
  const d = state.data; let slot = d.guests.find((g) => !g.name);
  if (!slot) { slot = { row: 4 + d.guests.length }; d.guests.push(slot); }
  if (slot.row > 995) { toast('The guest list is full in the sheet (row 995).', true); return; }
  Object.assign(slot, { group: fd.group, name: fd.name.trim(), side: fd.side, rel: (fd.rel || '').trim(), contact: '', address: '', std: '', rsvp: '', meal: '', diet: '', table: '', thanks: '' });
  const r = slot.row; state.modal = null; render();
  save(() => writeCells([{ range: `Guests!A${r}:E${r}`, values: [[`=ROW(B${r})-3`, fd.group, asText(slot.name), fd.side, asText(slot.rel)]] }]), 'Guest added');
}
function removeRow(sheet, row) {
  const list = state.data[sheet]; const r = list.find((x) => x.row === row); if (!r) return;
  const label = sheet === 'guests' ? r.name : (r.vendor || r.cat);
  if (!confirm(`Remove ${label || 'this row'}? This clears the row in the sheet.`)) return;
  if (sheet === 'guests') {
    Object.assign(r, { group: '', name: '', side: '', rel: '', contact: '', address: '', std: '', rsvp: '', meal: '', diet: '', table: '', thanks: '' });
    render();
    save(() => writeCells([{ range: `Guests!B${row}:M${row}`, values: [Array(12).fill('')] }]), 'Guest removed');
  } else {
    Object.assign(r, { day: '', cat: '', vendor: '', contact: '', phone: '', signed: '', total: '', deposit: '', other: '', due: '', arrival: '', notes: '' });
    render();
    save(() => writeCells([
      { range: `Vendors!A${row}:I${row}`, values: [Array(9).fill('')] },
      { range: `Vendors!K${row}:M${row}`, values: [Array(3).fill('')] },
    ]), 'Vendor removed');
  }
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.modal) { state.modal = null; render(); } });

// ---------- boot ----------
async function boot() {
  if (DEMO) { await load(); state.signedIn = true; render(); return; }
  render();
  try { await initAuth(); } catch (e) { state.error = e.message; render(); return; }
  if (tokenValid()) {
    state.signedIn = true; render();
    try { await load(); } catch (e) { handleError(e); }
    render();
  }
}
boot();

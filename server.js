'use strict';
/* Aura & Co. store server: accounts, trade approval, orders, enquiries, admin, PayFast.
   Run: npm install && npm start   (see README.md) */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/* Minimal .env loader (no extra dependency) */
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach(function (l) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch (e) { /* no .env file: use real environment variables */ }

const express = require('express');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const CORE = require('./core.js');
const env = process.env;

const PORT = parseInt(env.PORT, 10) || 3000;
const BASE = (env.BASE_URL || 'http://localhost:' + PORT).replace(/\/$/, '');
const PROD = env.NODE_ENV === 'production';
const SESSION_DAYS = parseInt(env.SESSION_DAYS, 10) || 14;
const DB_PATH = env.DB_PATH || path.join(__dirname, 'data', 'aura.db');
const num = (v, d) => (v !== undefined && v !== '' && !isNaN(+v) ? +v : d);

/* ---------- configuration (public part is sent to the browser) ---------- */
const D = CORE.DEFAULTS;
const CFG = Object.assign({}, D, {
  storeName: env.STORE_NAME || D.storeName,
  vatRegistered: env.VAT_REGISTERED ? env.VAT_REGISTERED !== 'false' : D.vatRegistered,
  freeDeliveryOver: num(env.FREE_DELIVERY_OVER, D.freeDeliveryOver),
  giftWrap: num(env.GIFT_WRAP_PRICE, D.giftWrap),
  tradeDiscount: num(env.TRADE_DISCOUNT_PERCENT, D.tradeDiscount * 100) / 100,
  accountTerms: env.ACCOUNT_TERMS || D.accountTerms,
  contact: { email: env.CONTACT_EMAIL || D.contact.email, phone: env.CONTACT_PHONE || D.contact.phone, hours: env.CONTACT_HOURS || D.contact.hours },
  bank: { bank: env.BANK_NAME || D.bank.bank, holder: env.BANK_ACCOUNT_HOLDER || D.bank.holder, account: env.BANK_ACCOUNT_NUMBER || D.bank.account, branch: env.BANK_BRANCH_CODE || D.bank.branch }
});
const PF = { id: env.PAYFAST_MERCHANT_ID || '', key: env.PAYFAST_MERCHANT_KEY || '', pass: env.PAYFAST_PASSPHRASE || '', sandbox: env.PAYFAST_SANDBOX !== 'false' };
CFG.payfastEnabled = !!(PF.id && PF.key);

/* ---------- database ---------- */
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, phone TEXT, company TEXT, biz_type TEXT, vat TEXT,
  role TEXT NOT NULL DEFAULT 'customer', account_type TEXT NOT NULL DEFAULT 'retail', trade_status TEXT NOT NULL DEFAULT 'none',
  pass_hash TEXT NOT NULL, address_json TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS sessions(
  token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS orders(
  id INTEGER PRIMARY KEY AUTOINCREMENT, ref TEXT UNIQUE NOT NULL, user_id INTEGER REFERENCES users(id), email TEXT NOT NULL,
  status TEXT NOT NULL, payment_id TEXT NOT NULL, payment_status TEXT NOT NULL, total REAL NOT NULL, data_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS enquiries(
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT, company TEXT, topic TEXT, message TEXT NOT NULL,
  items_json TEXT, status TEXT NOT NULL DEFAULT 'New', created_at TEXT NOT NULL DEFAULT (datetime('now')));
`);

/* ---------- helpers ---------- */
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 120;
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);
const ORDER_STATUSES = ['Awaiting payment', 'Awaiting invoice', 'Paid', 'Processing', 'Dispatched', 'Delivered', 'Cancelled'];
const TRADE_STATUSES = ['none', 'pending', 'approved', 'rejected'];
const ENQ_STATUSES = ['New', 'In progress', 'Done'];
const BIZ_TYPES = ['Hospitality', 'Corporate', 'Retailer', 'Interior designer or decorator', 'Corporate gifting', 'Other'];

const hits = new Map();
function limit(name, max, windowMs) {
  return function (req, res, next) {
    const k = name + '|' + req.ip, now = Date.now();
    let h = hits.get(k);
    if (!h || h.reset < now) { h = { n: 0, reset: now + windowMs }; hits.set(k, h); }
    if (++h.n > max) return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });
    next();
  };
}
setInterval(function () {
  const now = Date.now();
  hits.forEach(function (h, k) { if (h.reset < now) hits.delete(k); });
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
}, 600000).unref();

function cookies(req) {
  const o = {};
  (req.headers.cookie || '').split(';').forEach(function (p) {
    const i = p.indexOf('=');
    if (i > 0) { try { o[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } catch (e) { /* ignore bad cookie */ } }
  });
  return o;
}
const cookieFlags = () => '; HttpOnly; Path=/; SameSite=Lax' + (PROD ? '; Secure' : '');
function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(sha(token), userId, Date.now() + SESSION_DAYS * 864e5);
  res.setHeader('Set-Cookie', 'aura_sid=' + token + cookieFlags() + '; Max-Age=' + SESSION_DAYS * 86400);
}
function endSession(req, res) {
  const t = cookies(req).aura_sid;
  if (t) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(t));
  res.setHeader('Set-Cookie', 'aura_sid=' + cookieFlags() + '; Max-Age=0');
}
function currentUser(req) {
  const t = cookies(req).aura_sid;
  if (!t) return null;
  return db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(sha(t), Date.now()) || null;
}
function publicUser(u) {
  let address = null;
  try { address = u.address_json ? JSON.parse(u.address_json) : null; } catch (e) { address = null; }
  return { id: u.id, name: u.name, email: u.email, phone: u.phone || '', company: u.company || '', bizType: u.biz_type || '', vat: u.vat || '', role: u.role, accountType: u.account_type, tradeStatus: u.trade_status, address: address, createdAt: u.created_at };
}
const isTrade = (u) => !!u && u.account_type === 'trade' && u.trade_status === 'approved';
function publicOrder(row) {
  const d = JSON.parse(row.data_json);
  return Object.assign(d, { id: row.id, ref: row.ref, status: row.status, paymentStatus: row.payment_status, date: row.created_at });
}
const needUser = (req, res, next) => { const u = currentUser(req); if (!u) return res.status(401).json({ error: 'Please sign in.' }); req.user = u; next(); };
const needAdmin = (req, res, next) => { const u = currentUser(req); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Not allowed.' }); req.user = u; next(); };

/* ---------- PayFast ---------- */
const pfEnc = (v) => encodeURIComponent(String(v).trim()).replace(/%20/g, '+').replace(/[!'()*~]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
function pfSig(pairs, pass) {
  let s = pairs.filter(([k, v]) => k !== 'signature' && v !== '' && v != null).map(([k, v]) => k + '=' + pfEnc(v)).join('&');
  if (pass) s += '&passphrase=' + pfEnc(pass);
  return crypto.createHash('md5').update(s).digest('hex');
}
const pfHost = () => (PF.sandbox ? 'https://sandbox.payfast.co.za' : 'https://www.payfast.co.za');
function pfForm(order) {
  const pairs = [
    ['merchant_id', PF.id], ['merchant_key', PF.key],
    ['return_url', BASE + '/order-return'], ['cancel_url', BASE + '/checkout-cancel'], ['notify_url', BASE + '/api/payfast/notify'],
    ['name_first', order.address.first], ['name_last', order.address.last], ['email_address', order.email],
    ['m_payment_id', order.ref], ['amount', order.total.toFixed(2)], ['item_name', 'Order ' + order.ref]
  ];
  pairs.push(['signature', pfSig(pairs, PF.pass)]);
  return { url: pfHost() + '/eng/process', fields: pairs.map(([name, value]) => ({ name, value })) };
}

/* ---------- app ---------- */
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(function (req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});
/* State-changing API calls must be JSON (blocks plain cross-site form posts); PayFast's notification is the one exception. */
app.use('/api', function (req, res, next) {
  if (req.method !== 'GET' && req.path !== '/payfast/notify' && !req.is('application/json')) return res.status(415).json({ error: 'Unsupported request type.' });
  next();
});
app.use('/api/payfast/notify', express.urlencoded({ extended: false, limit: '20kb' }));
app.use('/api', express.json({ limit: '100kb' }));

app.get('/api/ping', (req, res) => res.json({ app: 'aura', ok: true }));
app.get('/api/config', (req, res) => res.json(CFG));
app.get('/api/images', function (req, res) {
  const out = {}, dir = path.join(__dirname, 'public', 'images');
  try {
    fs.readdirSync(dir).forEach(function (f) {
      const m = f.match(/^([a-z0-9-]+)\.(jpe?g|png|webp|avif)$/i);
      if (m) out[m[1].toLowerCase()] = '/images/' + f + '?v=' + Math.floor(fs.statSync(path.join(dir, f)).mtimeMs / 1000);
    });
  } catch (e) { /* no images folder */ }
  res.json(out);
});

/* ----- accounts ----- */
app.get('/api/me', (req, res) => { const u = currentUser(req); res.json({ user: u ? publicUser(u) : null }); });

app.post('/api/register', limit('register', 10, 3600e3), function (req, res) {
  const b = req.body || {};
  const email = str(b.email, 120).toLowerCase(), name = str(b.name, 80), pw = String(b.password || '');
  const type = b.accountType === 'trade' ? 'trade' : 'retail';
  const company = str(b.company, 100);
  if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!name) return res.status(400).json({ error: 'Enter your name.' });
  if (pw.length < 8 || pw.length > 100) return res.status(400).json({ error: 'Choose a password of at least 8 characters.' });
  if (type === 'trade' && !company) return res.status(400).json({ error: 'Enter your business name to apply for a trade account.' });
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) return res.status(409).json({ error: 'An account with this email already exists. Try signing in.' });
  const biz = BIZ_TYPES.indexOf(b.bizType) > -1 ? b.bizType : '';
  const info = db.prepare('INSERT INTO users(email,name,phone,company,biz_type,vat,account_type,trade_status,pass_hash) VALUES(?,?,?,?,?,?,?,?,?)')
    .run(email, name, str(b.phone, 30), company, biz, str(b.vat, 30), type, type === 'trade' ? 'pending' : 'none', bcrypt.hashSync(pw, 10));
  startSession(res, info.lastInsertRowid);
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid)) });
});

app.post('/api/login', limit('login', 20, 15 * 60e3), function (req, res) {
  const b = req.body || {}, email = str(b.email, 120).toLowerCase();
  const u = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  const ok = bcrypt.compareSync(String(b.password || ''), u ? u.pass_hash : DUMMY_HASH);
  if (!u || !ok) return res.status(401).json({ error: 'Email or password is incorrect.' });
  startSession(res, u.id);
  res.json({ user: publicUser(u) });
});

app.post('/api/logout', (req, res) => { endSession(req, res); res.json({ ok: true }); });

/* ----- orders ----- */
app.post('/api/orders', limit('orders', 30, 3600e3), function (req, res) {
  const b = req.body || {}, user = currentUser(req), trade = isTrade(user);
  const items = Array.isArray(b.items) ? b.items.slice(0, 60) : [];
  const lines = [];
  for (const it of items) {
    const p = CORE.BY[it && it.id], ci = Number(it && it.ci), qty = Number(it && it.qty);
    if (!p || !Number.isInteger(ci) || !p.colors[ci] || !Number.isInteger(qty) || qty < 1 || qty > 99) return res.status(400).json({ error: 'Your cart contains an item that is no longer available. Please review your cart.' });
    lines.push({ id: p.id, ci: ci, qty: qty });
  }
  if (!lines.length) return res.status(400).json({ error: 'Your cart is empty.' });
  const a = b.address || {};
  const address = { first: str(a.first, 60), last: str(a.last, 60), company: str(a.company, 100), street: str(a.street, 120), suburb: str(a.suburb, 80), city: str(a.city, 80), province: str(a.province, 40), postal: str(a.postal, 4), phone: str(b.phone, 30) };
  const email = str(b.email, 120).toLowerCase();
  if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (address.phone.replace(/\D/g, '').length < 9) return res.status(400).json({ error: 'Enter a mobile number the courier can call.' });
  if (!address.first || !address.last || !address.street || !address.suburb || !address.city) return res.status(400).json({ error: 'Please complete your delivery address.' });
  if (!CORE.ZONE[address.province]) return res.status(400).json({ error: 'Choose your province.' });
  if (!/^\d{4}$/.test(address.postal)) return res.status(400).json({ error: 'Enter the 4-digit postal code.' });
  const payment = b.payment;
  if (['payfast', 'bank', 'account'].indexOf(payment) < 0) return res.status(400).json({ error: 'Choose a payment method.' });
  if (payment === 'payfast' && !CFG.payfastEnabled) return res.status(400).json({ error: 'Online payment is not available yet. Please choose bank transfer.' });
  if (payment === 'account' && !trade) return res.status(400).json({ error: 'Pay on account is only available to approved trade accounts.' });

  const t = CORE.compute({ lines: lines, province: address.province, delivery: b.delivery, giftWrap: !!b.giftWrap, trade: trade, cfg: CFG });
  if (!t.opt) return res.status(400).json({ error: 'Choose a delivery method.' });

  const payName = { payfast: 'Card or Instant EFT (PayFast)', bank: 'Bank transfer (EFT)', account: 'Pay on account' }[payment];
  const status = payment === 'account' ? 'Awaiting invoice' : 'Awaiting payment';
  const d = new Date(), pad = (n) => String(n).padStart(2, '0');
  const prefix = 'AC-' + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + '-';
  let ref, tries = 0;
  do { ref = prefix + crypto.randomInt(1000, 10000); tries++; } while (db.prepare('SELECT 1 FROM orders WHERE ref=?').get(ref) && tries < 20);
  const data = {
    demo: false, email: email, items: t.lines.map((l) => ({ id: l.id, ci: l.ci, name: l.name, color: l.color, qty: l.qty, unit: l.unit, retail: l.retail, line: l.line })),
    sub: t.sub, ship: t.ship, wrap: t.wrap, total: t.total, vat: t.vat, saved: t.saved, tradePricing: trade,
    deliveryName: t.opt.name, deliveryId: t.opt.id, days: t.opt.days, paymentId: payment, payName: payName,
    giftMsg: str(b.giftMsg, 250), po: str(b.po, 60), notes: str(b.notes, 300), address: address, accountEmail: user ? user.email : ''
  };
  db.prepare('INSERT INTO orders(ref,user_id,email,status,payment_id,payment_status,total,data_json) VALUES(?,?,?,?,?,?,?,?)')
    .run(ref, user ? user.id : null, email, status, payment, 'pending', t.total, JSON.stringify(data));
  if (user) db.prepare('UPDATE users SET address_json=?, phone=CASE WHEN phone IS NULL OR phone=\'\' THEN ? ELSE phone END WHERE id=?').run(JSON.stringify(address), address.phone, user.id);
  const order = publicOrder(db.prepare('SELECT * FROM orders WHERE ref=?').get(ref));
  res.json({ order: order, payfast: payment === 'payfast' ? pfForm(Object.assign({ ref: ref }, data)) : null });
});

app.get('/api/orders', needUser, function (req, res) {
  res.json({ orders: db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 200').all(req.user.id).map(publicOrder) });
});

app.post('/api/payfast/notify', function (req, res) {
  res.status(200).end();
  (async function () {
    try {
      if (!CFG.payfastEnabled) return;
      const body = req.body || {}, pairs = Object.entries(body);
      if (pfSig(pairs, PF.pass) !== body.signature || body.merchant_id !== PF.id) return;
      const o = db.prepare('SELECT * FROM orders WHERE ref=?').get(body.m_payment_id);
      if (!o || Math.abs(parseFloat(body.amount_gross) - o.total) > 0.01) return;
      /* confirm with PayFast that this notification is genuine */
      const qs = pairs.filter(([k]) => k !== 'signature').map(([k, v]) => k + '=' + pfEnc(v)).join('&');
      const r = await fetch(pfHost() + '/eng/query/validate', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: qs });
      if ((await r.text()).trim() !== 'VALID') return;
      if (body.payment_status === 'COMPLETE') db.prepare("UPDATE orders SET payment_status='paid', status=CASE WHEN status='Awaiting payment' THEN 'Paid' ELSE status END WHERE ref=?").run(o.ref);
      else if (body.payment_status === 'FAILED' || body.payment_status === 'CANCELLED') db.prepare("UPDATE orders SET payment_status='failed' WHERE ref=?").run(o.ref);
    } catch (e) { console.error('PayFast notify error:', e.message); }
  })();
});

/* ----- enquiries ----- */
app.post('/api/enquiries', limit('enquiry', 15, 3600e3), function (req, res) {
  const b = req.body || {}, u = currentUser(req);
  const name = str(b.name, 80), email = str(b.email, 120).toLowerCase(), message = str(b.message, 3000);
  if (!name) return res.status(400).json({ error: 'Enter your name.' });
  if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (message.length < 5) return res.status(400).json({ error: 'Tell us a little about what you need.' });
  let items = null;
  if (Array.isArray(b.items)) items = b.items.slice(0, 60).filter((i) => CORE.BY[i && i.id]).map((i) => ({ id: i.id, name: CORE.BY[i.id].name, qty: Math.max(1, Math.min(9999, parseInt(i.qty, 10) || 1)) }));
  db.prepare('INSERT INTO enquiries(name,email,phone,company,topic,message,items_json) VALUES(?,?,?,?,?,?,?)')
    .run(name, email, str(b.phone, 30), str(b.company, 100), str(b.topic, 40), message, items && items.length ? JSON.stringify(items) : null);
  res.json({ ok: true, signedIn: !!u });
});

/* ----- admin ----- */
app.get('/api/admin/orders', needAdmin, (req, res) => res.json({ orders: db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 500').all().map(publicOrder) }));
app.patch('/api/admin/orders/:id', needAdmin, function (req, res) {
  const b = req.body || {}, row = db.prepare('SELECT * FROM orders WHERE id=?').get(parseInt(req.params.id, 10));
  if (!row) return res.status(404).json({ error: 'Order not found.' });
  if (ORDER_STATUSES.indexOf(b.status) < 0) return res.status(400).json({ error: 'Unknown status.' });
  db.prepare('UPDATE orders SET status=?, payment_status=CASE WHEN ?=\'Paid\' THEN \'paid\' ELSE payment_status END WHERE id=?').run(b.status, b.status, row.id);
  res.json({ order: publicOrder(db.prepare('SELECT * FROM orders WHERE id=?').get(row.id)) });
});
app.get('/api/admin/customers', needAdmin, (req, res) => res.json({ customers: db.prepare('SELECT * FROM users ORDER BY id DESC LIMIT 1000').all().map(publicUser) }));
app.patch('/api/admin/customers/:id', needAdmin, function (req, res) {
  const b = req.body || {}, row = db.prepare('SELECT * FROM users WHERE id=?').get(parseInt(req.params.id, 10));
  if (!row) return res.status(404).json({ error: 'Customer not found.' });
  if (TRADE_STATUSES.indexOf(b.tradeStatus) < 0) return res.status(400).json({ error: 'Unknown status.' });
  db.prepare('UPDATE users SET trade_status=?, account_type=CASE WHEN ? IN (\'approved\',\'pending\',\'rejected\') THEN \'trade\' ELSE account_type END WHERE id=?').run(b.tradeStatus, b.tradeStatus, row.id);
  res.json({ customer: publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(row.id)) });
});
app.get('/api/admin/enquiries', needAdmin, function (req, res) {
  res.json({ enquiries: db.prepare('SELECT * FROM enquiries ORDER BY id DESC LIMIT 500').all().map((e) => ({ id: e.id, name: e.name, email: e.email, phone: e.phone, company: e.company, topic: e.topic, message: e.message, items: e.items_json ? JSON.parse(e.items_json) : [], status: e.status, createdAt: e.created_at })) });
});
app.patch('/api/admin/enquiries/:id', needAdmin, function (req, res) {
  const b = req.body || {}, id = parseInt(req.params.id, 10);
  if (ENQ_STATUSES.indexOf(b.status) < 0) return res.status(400).json({ error: 'Unknown status.' });
  db.prepare('UPDATE enquiries SET status=? WHERE id=?').run(b.status, id);
  res.json({ ok: true });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

/* ----- site ----- */
app.get('/order-return', (req, res) => res.redirect('/#order'));
app.get('/checkout-cancel', (req, res) => res.redirect('/#checkout'));
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: function (res, p) { if (/\.html$/.test(p)) res.setHeader('Cache-Control', 'no-cache'); }
}));

app.use(function (err, req, res, next) {
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

/* ----- admin account from environment ----- */
if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
  const email = env.ADMIN_EMAIL.toLowerCase(), hash = bcrypt.hashSync(env.ADMIN_PASSWORD, 10);
  const ex = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (ex) db.prepare("UPDATE users SET role='admin', pass_hash=? WHERE id=?").run(hash, ex.id);
  else db.prepare("INSERT INTO users(email,name,role,pass_hash) VALUES(?,?,'admin',?)").run(email, 'Store admin', hash);
} else {
  console.warn('No ADMIN_EMAIL / ADMIN_PASSWORD set: you will not be able to open the admin area. See README.md.');
}

if (require.main === module) {
  app.listen(PORT, () => console.log('Aura & Co. store running at ' + BASE + (CFG.payfastEnabled ? ' (PayFast ' + (PF.sandbox ? 'sandbox' : 'LIVE') + ')' : ' (PayFast off)')));
}
module.exports = app;

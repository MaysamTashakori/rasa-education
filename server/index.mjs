// Rasa Amozesh API + static server. Zero dependencies (Node >= 22.5, node:sqlite).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {initBots} from './bots.mjs';
import {initStore} from './store.mjs';
import {initAdmin} from './admin.mjs';
import {initPay} from './pay.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +(process.env.PORT || 8080);
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
const WEB = process.env.WEB_DIR || path.join(ROOT, 'dist', 'site');
const KIDS = path.join(ROOT, 'dist', 'kids');
const PLANNER = path.join(ROOT, 'dist', 'web');
const CONTENT = process.env.CONTENT_DIR || path.join(ROOT, 'content', 'grade2');
const MAX_BODY = 512 * 1024, MAX_STATE = 300 * 1024, SESSION_DAYS = 60;

fs.mkdirSync(DATA, {recursive: true});
const db = new DatabaseSync(path.join(DATA, 'rasa.db'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, login TEXT UNIQUE NOT NULL, name TEXT NOT NULL, pass TEXT NOT NULL, pin TEXT, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, exp INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS children(id INTEGER PRIMARY KEY, uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, grade INTEGER NOT NULL DEFAULT 2, avatar TEXT, state TEXT, ver INTEGER NOT NULL DEFAULT 0, updated INTEGER);
CREATE TABLE IF NOT EXISTS library(uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, pid TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY(uid, pid));
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY, uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, pid TEXT NOT NULL, contact TEXT, note TEXT, status TEXT NOT NULL DEFAULT 'new', at INTEGER NOT NULL);`);

const readJson = f => JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8'));
const content = () => ({lessons: readJson('lessons.json'), market: readJson('market.json')});

const PD = '۰۱۲۳۴۵۶۷۸۹';
const toEn = s => String(s ?? '').replace(/[۰-۹]/g, d => PD.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim();
function normLogin(raw) {
  const s = toEn(raw).toLowerCase().replace(/\s+/g, '');
  if (/^(\+98|0098|98)?0?9\d{9}$/.test(s)) return '0' + s.slice(-10);
  if (/^[^@\s]{1,64}@[^@\s]+\.[a-z]{2,}$/.test(s)) return s;
  return null;
}
const hashPw = pw => {const salt = crypto.randomBytes(16); return 'scrypt$' + salt.toString('hex') + '$' + crypto.scryptSync(pw, salt, 64).toString('hex')};
const checkPw = (pw, stored) => {
  const [alg, salt, hash] = String(stored || '').split('$');
  if (alg !== 'scrypt') return false;
  const h = crypto.scryptSync(pw, Buffer.from(salt, 'hex'), 64);
  return crypto.timingSafeEqual(h, Buffer.from(hash, 'hex'));
};

const hits = new Map();
function limited(key, max = 10, winMs = 10 * 60 * 1000) {
  const now = Date.now(), a = (hits.get(key) || []).filter(t => now - t < winMs);
  a.push(now); hits.set(key, a); return a.length > max;
}

class HttpError extends Error {constructor(status, msg) {super(msg); this.status = status}}
const fail = (s, m) => {throw new HttpError(s, m)};

function send(res, status, body, headers = {}) {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers});
  res.end(data);
}
function readBody(req) {
  return new Promise((ok, no) => {
    let n = 0; const chunks = [];
    req.on('data', c => {n += c.length; if (n > MAX_BODY) {no(new HttpError(413, 'درخواست بیش از حد بزرگ است')); req.destroy()} else chunks.push(c)});
    req.on('end', () => {try {ok(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {})} catch {no(new HttpError(400, 'JSON نامعتبر'))}});
    req.on('error', no);
  });
}
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(p => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
const secure = req => req.headers['x-forwarded-proto'] === 'https';
function sessionCookie(req, token, maxAge) {
  return `rs=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure(req) ? '; Secure' : ''}`;
}
function startSession(req, uid) {
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions(token, uid, exp) VALUES(?,?,?)').run(token, uid, Date.now() + SESSION_DAYS * 864e5);
  return sessionCookie(req, token, SESSION_DAYS * 86400);
}
function auth(req) {
  const t = cookies(req).rs; if (!t) fail(401, 'وارد نشده‌اید');
  const s = db.prepare('SELECT uid, exp FROM sessions WHERE token=?').get(t);
  if (!s || s.exp < Date.now()) fail(401, 'نشست منقضی شده است');
  const u = db.prepare('SELECT id, login, name, pin FROM users WHERE id=?').get(s.uid);
  if (!u) fail(401, 'کاربر پیدا نشد');
  return u;
}
const childOf = (u, id) => db.prepare('SELECT * FROM children WHERE id=? AND uid=?').get(+id, u.id) || fail(404, 'فرزند پیدا نشد');
const kidOut = c => ({id: c.id, name: c.name, grade: c.grade, avatar: c.avatar, ver: c.ver});
const me = u => ({user: {id: u.id, name: u.name, login: u.login, hasPin: !!u.pin}, children: db.prepare('SELECT * FROM children WHERE uid=? ORDER BY id').all(u.id).map(kidOut)});
const cleanName = (s, max = 40) => String(s || '').replace(/[<>]/g, '').trim().slice(0, max);

const routes = {
  'GET /api/health': () => ({ok: true}),
  'POST /api/register': async (req, res, b) => {
    const ip = req.headers['x-real-ip'] || req.socket.remoteAddress;
    if (limited('reg:' + ip, 8)) fail(429, 'تعداد تلاش زیاد است؛ کمی بعد دوباره امتحان کنید');
    const login = normLogin(b.login), name = cleanName(b.name), kid = cleanName(b.child?.name);
    if (!login) fail(400, 'شمارهٔ موبایل یا ایمیل معتبر وارد کنید');
    if (!name) fail(400, 'نام لازم است');
    if (String(b.password || '').length < 6) fail(400, 'رمز عبور دست‌کم ۶ نویسه باشد');
    if (db.prepare('SELECT 1 FROM users WHERE login=?').get(login)) fail(409, 'این شماره یا ایمیل قبلاً ثبت شده است');
    const uid = db.prepare('INSERT INTO users(login, name, pass, created) VALUES(?,?,?,?)').run(login, name, hashPw(String(b.password)), Date.now()).lastInsertRowid;
    if (kid) db.prepare('INSERT INTO children(uid, name, grade, avatar, updated) VALUES(?,?,?,?,?)').run(uid, kid, 2, cleanName(b.child?.avatar, 8) || '🦁', Date.now());
    const src = String(b.ref || '').replace(/[^\w:-]/g, '').slice(0, 40);
    store.track('signup', uid, null, src || null); store.ensureFounder();
    return [me(db.prepare('SELECT * FROM users WHERE id=?').get(uid)), {'set-cookie': startSession(req, uid)}];
  },
  'POST /api/login': async (req, res, b) => {
    const ip = req.headers['x-real-ip'] || req.socket.remoteAddress, login = normLogin(b.login);
    if (limited('login:' + ip, 15) || (login && limited('login:' + login, 8))) fail(429, 'تعداد تلاش زیاد است؛ ۱۰ دقیقهٔ دیگر امتحان کنید');
    const u = login && db.prepare('SELECT * FROM users WHERE login=?').get(login);
    if (!u || !checkPw(String(b.password || ''), u.pass)) fail(401, 'شماره/ایمیل یا رمز عبور نادرست است');
    return [me(u), {'set-cookie': startSession(req, u.id)}];
  },
  'POST /api/logout': (req) => {
    const t = cookies(req).rs; if (t) db.prepare('DELETE FROM sessions WHERE token=?').run(t);
    return [{ok: true}, {'set-cookie': sessionCookie(req, '', 0)}];
  },
  'GET /api/me': req => me(auth(req)),
  'POST /api/pin': (req, res, b) => {
    const u = auth(req), pin = toEn(b.pin);
    if (!/^\d{4}$/.test(pin)) fail(400, 'رمز والد باید ۴ رقم باشد');
    if (u.pin && !checkPw(toEn(b.old), u.pin)) fail(403, 'رمز فعلی والد نادرست است');
    db.prepare('UPDATE users SET pin=? WHERE id=?').run(hashPw(pin), u.id); return {ok: true};
  },
  'POST /api/pin/verify': (req, res, b) => {
    const u = auth(req);
    if (limited('pin:' + u.id, 10)) fail(429, 'تعداد تلاش زیاد است');
    if (!u.pin || !checkPw(toEn(b.pin), u.pin)) fail(403, 'رمز والد نادرست است'); return {ok: true};
  },
  'POST /api/children': (req, res, b) => {
    const u = auth(req), name = cleanName(b.name);
    if (!name) fail(400, 'نام فرزند لازم است');
    if (db.prepare('SELECT COUNT(*) n FROM children WHERE uid=?').get(u.id).n >= 6) fail(400, 'حداکثر ۶ فرزند');
    db.prepare('INSERT INTO children(uid, name, grade, avatar, updated) VALUES(?,?,?,?,?)').run(u.id, name, 2, cleanName(b.avatar, 8) || '🐼', Date.now());
    return me(u);
  },
  'PATCH /api/children/:id': (req, res, b, p) => {
    const u = auth(req), c = childOf(u, p.id);
    db.prepare('UPDATE children SET name=?, avatar=? WHERE id=?').run(cleanName(b.name) || c.name, cleanName(b.avatar, 8) || c.avatar, c.id);
    return me(u);
  },
  'GET /api/children/:id/state': (req, res, b, p) => {
    const c = childOf(auth(req), p.id); return {state: c.state ? JSON.parse(c.state) : null, ver: c.ver};
  },
  'PUT /api/children/:id/state': (req, res, b, p) => {
    const c = childOf(auth(req), p.id), s = JSON.stringify(b.state ?? null);
    if (s.length > MAX_STATE) fail(413, 'حجم داده بیش از حد است');
    if (+b.ver !== c.ver) return [{conflict: true, state: c.state ? JSON.parse(c.state) : null, ver: c.ver}, {}, 409];
    db.prepare('UPDATE children SET state=?, ver=ver+1, updated=? WHERE id=?').run(s, Date.now(), c.id);
    return {ver: c.ver + 1};
  },
  'GET /api/content': () => content(),
  'GET /api/quiz': () => {
    const LEVELS = {ebt: 'دبستان', m1: 'متوسطهٔ اول', m2: 'متوسطهٔ دوم', konkur: 'کنکور'};
    const bank = [];
    for (const l of content().lessons.lessons || []) {
      const subj = (content().lessons.subjects || []).find(s => s.id === l.subj);
      for (const a of l.acts || []) if (a.o && a.o.length) bank.push({lv: 'ebt', lvn: 'دبستان', s: subj?.name || 'کلاس دوم', g: 'کلاس دوم', q: a.q, m: a.m, o: a.o, a: a.a});
    }
    try {
      const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'catalog.json'), 'utf8'));
      for (const it of cat.items || []) for (const q of it.quiz || []) if (q.o && q.o.length) bank.push({lv: it.level, lvn: LEVELS[it.level] || it.level, s: it.subject, q: q.q, o: q.o, a: q.a, ex: q.ex});
    } catch {}
    const levels = [...new Set(bank.map(x => x.lvn))].map(n => ({name: n, n: bank.filter(x => x.lvn === n).length}));
    return {items: bank, levels};
  },
  'GET /api/library': req => ({items: db.prepare('SELECT pid FROM library WHERE uid=?').all(auth(req).id).map(r => r.pid)}),
  'POST /api/market/claim': (req, res, b) => {
    const u = auth(req), p = content().market.products.find(x => x.id === b.pid);
    if (!p) fail(404, 'محصول پیدا نشد');
    if (p.price !== 0) fail(402, 'این محصول رایگان نیست');
    db.prepare('INSERT OR IGNORE INTO library(uid, pid, at) VALUES(?,?,?)').run(u.id, p.id, Date.now());
    return {ok: true};
  },
  'POST /api/market/order': (req, res, b) => {
    const u = auth(req), p = content().market.products.find(x => x.id === b.pid);
    if (!p) fail(404, 'محصول پیدا نشد');
    if (limited('order:' + u.id, 20, 864e5)) fail(429, 'تعداد درخواست زیاد است');
    db.prepare('INSERT INTO orders(uid, pid, contact, note, at) VALUES(?,?,?,?,?)').run(u.id, p.id, cleanName(b.contact, 80) || u.login, cleanName(b.note, 300), Date.now());
    return {ok: true};
  },
};
const botsMod = initBots(db, {auth, fail, PD});
Object.assign(routes, botsMod.routes);
const store = initStore(db, {auth, fail, DATA, ROOT, notify: botsMod.enqueue}), admin = initAdmin(db, {auth, fail, ROOT, store});
Object.assign(routes, store.routes, admin.routes, initPay(db, {auth, fail}).routes);
const compiled = Object.entries(routes).map(([k, fn]) => {
  const [method, pattern] = k.split(' '), keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, n) => {keys.push(n); return '([^/]+)'}) + '$');
  return {method, re, keys, fn};
});

const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2'};
function serveStatic(req, res, url) {
  let base = WEB, rel = url.pathname;
  if (rel === '/planner') {res.writeHead(301, {location: 'planner/'}); return res.end()}
  if (rel.startsWith('/planner/')) {base = PLANNER; rel = rel.slice(8)}
  if (rel === '/kids') {res.writeHead(301, {location: 'kids/'}); return res.end()}
  if (rel.startsWith('/kids/')) {base = KIDS; rel = rel.slice(5)}
  if (rel === '/rasa-planner.html') base = path.join(ROOT, 'dist');
  let file = path.normalize(path.join(base, decodeURIComponent(rel)));
  if (!file.startsWith(base)) {res.writeHead(403); return res.end()}
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(base, 'index.html');
  const ext = path.extname(file);
  res.writeHead(200, {'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': ext === '.html' || file.endsWith('sw.js') ? 'no-cache' : 'public, max-age=86400', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-frame-options': 'SAMEORIGIN'});
  fs.createReadStream(file).pipe(res);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {if (await store.raw(req, res, url)) return} catch (e) {console.error(e); if (!res.headersSent) send(res, 500, {error: 'خطای سرور'}); return}
  if (!url.pathname.startsWith('/api/')) return serveStatic(req, res, url);
  try {
    const r = compiled.find(r => r.method === req.method && r.re.test(url.pathname));
    if (!r) fail(404, 'مسیر پیدا نشد');
    if (req.method !== 'GET' && req.headers['content-type'] && !req.headers['content-type'].includes('application/json')) fail(415, 'نوع محتوا نامعتبر');
    const m = url.pathname.match(r.re), params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
    const body = req.method === 'GET' ? {} : await readBody(req);
    const out = await r.fn(req, res, body, params, url);
    if (Array.isArray(out)) send(res, out[2] || 200, out[0], out[1]); else send(res, 200, out);
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    send(res, e.status || 500, {error: e instanceof HttpError ? e.message : 'خطای سرور'});
  }
}).listen(PORT, () => console.log(`rasa-education listening on :${PORT}`));

setInterval(() => db.prepare('DELETE FROM sessions WHERE exp < ?').run(Date.now()), 36e5).unref();

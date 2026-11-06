// Store: catalog, live preview, free checkout, library, attempts/report cards, reviews, favorites, roles.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const ROLES = ['founder', 'admin', 'editor', 'support', 'marketer', 'creator', 'customer'];
const STAFF = new Set(['founder', 'admin', 'editor', 'support', 'marketer']);

export function initStore(db, {auth, fail, DATA, ROOT}) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS roles(uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL, PRIMARY KEY(uid, role));
  CREATE TABLE IF NOT EXISTS categories(id TEXT PRIMARY KEY, parent TEXT, title TEXT NOT NULL, icon TEXT, color TEXT, sort INTEGER DEFAULT 0, info TEXT);
  CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY, kind TEXT NOT NULL, cat TEXT, grade TEXT, subject TEXT, title TEXT NOT NULL,
    summary TEXT, body TEXT, price INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft', color TEXT, icon TEXT, tags TEXT,
    features TEXT, meta TEXT, author INTEGER, file TEXT, fsize INTEGER, ver INTEGER NOT NULL DEFAULT 0, views INTEGER NOT NULL DEFAULT 0,
    downloads INTEGER NOT NULL DEFAULT 0, sort INTEGER DEFAULT 0, created INTEGER NOT NULL, updated INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS store_orders(id INTEGER PRIMARY KEY, uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, total INTEGER NOT NULL,
    status TEXT NOT NULL, ref TEXT, at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS store_order_items(oid INTEGER NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE, pid TEXT NOT NULL, price INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS owned(uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, pid TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY(uid, pid));
  CREATE TABLE IF NOT EXISTS favorites(uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, pid TEXT NOT NULL, PRIMARY KEY(uid, pid));
  CREATE TABLE IF NOT EXISTS reviews(uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, pid TEXT NOT NULL, stars INTEGER NOT NULL,
    text TEXT, status TEXT NOT NULL DEFAULT 'pending', at INTEGER NOT NULL, PRIMARY KEY(uid, pid));
  CREATE TABLE IF NOT EXISTS attempts(id INTEGER PRIMARY KEY, uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, pid TEXT NOT NULL,
    learner TEXT, score REAL, total REAL, topics TEXT, secs INTEGER, at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, name TEXT NOT NULL, uid INTEGER, pid TEXT, src TEXT, at INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS ev_at ON events(at);`);

  const FILES = path.join(DATA, 'files'); fs.mkdirSync(FILES, {recursive: true});
  const now = () => Date.now();
  const J = (s, d) => {try {return s ? JSON.parse(s) : d} catch {return d}};
  const rolesOf = uid => db.prepare('SELECT role FROM roles WHERE uid=?').all(uid).map(r => r.role);
  const optUser = req => {try {return auth(req)} catch {return null}};
  const can = (u, ...want) => u && rolesOf(u.id).some(r => r === 'founder' || want.includes(r));
  const staff = (req, ...want) => {const u = auth(req); if (!can(u, ...want)) fail(403, 'دسترسی ندارید'); return u};
  const owns = (u, pid) => !!(u && db.prepare('SELECT 1 FROM owned WHERE uid=? AND pid=?').get(u.id, pid));
  const track = (name, uid, pid, src) => db.prepare('INSERT INTO events(name, uid, pid, src, at) VALUES(?,?,?,?,?)').run(name, uid || null, pid || null, src || null, now());

  // first registered user, or anyone listed in FOUNDER_LOGINS, becomes founder
  const ensureFounder = () => {
    const list = (process.env.FOUNDER_LOGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    for (const l of list) {const u = db.prepare('SELECT id FROM users WHERE login=?').get(l); if (u) db.prepare('INSERT OR IGNORE INTO roles VALUES(?,?)').run(u.id, 'founder')}
    if (!db.prepare("SELECT 1 FROM roles WHERE role='founder'").get()) {
      const u = db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get(); if (u) db.prepare('INSERT OR IGNORE INTO roles VALUES(?,?)').run(u.id, 'founder');
    }
  };

  const seedFile = path.join(ROOT, 'content/store/catalog.json');
  function seed() {
    if (!fs.existsSync(seedFile)) return;
    const s = J(fs.readFileSync(seedFile, 'utf8'), {});
    const c = db.prepare('INSERT OR IGNORE INTO categories(id, parent, title, icon, color, sort, info) VALUES(?,?,?,?,?,?,?)');
    (s.categories || []).forEach((x, i) => c.run(x.id, x.parent || null, x.title, x.icon || '', x.color || '', i, x.info || ''));
    const p = db.prepare(`INSERT OR IGNORE INTO products(id, kind, cat, grade, subject, title, summary, body, price, status, color, icon, tags, features, meta, sort, created, updated)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    (s.products || []).forEach((x, i) => p.run(x.id, x.kind, x.cat, x.grade || '', x.subject || '', x.title, x.summary || '', x.body || '', x.price || 0,
      x.status || 'live', x.color || '', x.icon || '', JSON.stringify(x.tags || []), JSON.stringify(x.features || []), JSON.stringify(x.meta || {}), i, now(), now()));
  }
  seed();

  const pub = (p, u) => p && ({id: p.id, kind: p.kind, cat: p.cat, grade: p.grade, subject: p.subject, title: p.title, summary: p.summary, body: p.body,
    price: p.price, status: p.status, color: p.color, icon: p.icon, tags: J(p.tags, []), features: J(p.features, []), meta: J(p.meta, {}),
    hasFile: !!p.file, fsize: p.fsize, ver: p.ver, views: p.views, downloads: p.downloads, updated: p.updated,
    rating: db.prepare("SELECT ROUND(AVG(stars),1) a, COUNT(*) n FROM reviews WHERE pid=? AND status='ok'").get(p.id),
    owned: owns(u, p.id), fav: !!(u && db.prepare('SELECT 1 FROM favorites WHERE uid=? AND pid=?').get(u.id, p.id))});

  const CSP = "sandbox allow-scripts allow-forms allow-modals allow-popups allow-downloads; default-src 'self' 'unsafe-inline' data: blob: https:;";
  // Raw file routes (not JSON): /p/:id/preview, /p/:id/open, /p/:id/download, PUT /api/admin/products/:id/file
  async function raw(req, res, url) {
    let m = url.pathname.match(/^\/p\/([\w-]{1,64})\/(preview|open|download)$/);
    if (m && req.method === 'GET') {
      const p = db.prepare("SELECT * FROM products WHERE id=? AND status IN ('live','soon')").get(m[1]);
      if (!p || !p.file) {res.writeHead(404, {'content-type': 'text/plain; charset=utf-8'}); res.end('یافت نشد'); return true}
      const u = optUser(req), mode = m[2];
      if (mode !== 'preview' && !owns(u, p.id) && !can(u, 'editor')) {res.writeHead(403, {'content-type': 'text/plain; charset=utf-8'}); res.end('ابتدا محصول را دریافت کنید'); return true}
      track(mode, u?.id, p.id);
      if (mode === 'download') db.prepare('UPDATE products SET downloads=downloads+1 WHERE id=?').run(p.id);
      const f = path.join(FILES, p.file), ext = path.extname(p.file).toLowerCase();
      const type = {'.html': 'text/html; charset=utf-8', '.pdf': 'application/pdf', '.zip': 'application/zip'}[ext] || 'application/octet-stream';
      const h = {'content-type': type, 'cache-control': 'private, max-age=300', 'x-content-type-options': 'nosniff', 'content-security-policy': CSP};
      if (mode === 'download') h['content-disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(p.title + ext)}`;
      res.writeHead(200, h); fs.createReadStream(f).pipe(res); return true;
    }
    m = url.pathname.match(/^\/api\/admin\/products\/([\w-]{1,64})\/file$/);
    if (m && req.method === 'PUT') {
      try {staff(req, 'editor')} catch (e) {res.writeHead(e.status || 403, {'content-type': 'application/json'}); res.end(JSON.stringify({error: e.message})); return true}
      const p = db.prepare('SELECT * FROM products WHERE id=?').get(m[1]);
      const ext = ({'text/html': '.html', 'application/pdf': '.pdf', 'application/zip': '.zip'})[String(req.headers['content-type']).split(';')[0]];
      if (!p || !ext) {res.writeHead(400, {'content-type': 'application/json'}); res.end('{"error":"محصول یا نوع فایل نامعتبر"}'); return true}
      const name = `${p.id}-v${p.ver + 1}-${crypto.randomBytes(4).toString('hex')}${ext}`, out = fs.createWriteStream(path.join(FILES, name));
      let size = 0, big = false;
      req.on('data', c => {size += c.length; if (size > 40e6 && !big) {big = true; req.destroy()}});
      req.pipe(out);
      out.on('finish', () => {
        if (big) return fs.rmSync(path.join(FILES, name), {force: true});
        db.prepare('UPDATE products SET file=?, fsize=?, ver=ver+1, updated=? WHERE id=?').run(name, size, now(), p.id);
        res.writeHead(200, {'content-type': 'application/json'}); res.end(JSON.stringify({ok: true, size, ver: p.ver + 1}));
      });
      return true;
    }
    return false;
  }

  const list = (u, q = {}) => {
    let rows = db.prepare("SELECT * FROM products WHERE status IN ('live','soon') ORDER BY sort, updated DESC").all();
    if (q.cat) {const kids = db.prepare('SELECT id FROM categories WHERE parent=?').all(q.cat).map(r => r.id); rows = rows.filter(p => p.cat === q.cat || kids.includes(p.cat))}
    if (q.kind) rows = rows.filter(p => p.kind === q.kind);
    if (q.q) {const t = String(q.q).trim().toLowerCase(); rows = rows.filter(p => (p.title + ' ' + p.summary + ' ' + p.tags + ' ' + p.subject).toLowerCase().includes(t))}
    return rows.map(p => pub(p, u));
  };

  const routes = {
    'GET /api/store': (req, res, b, p, url) => {
      ensureFounder(); const u = optUser(req);
      return {categories: db.prepare('SELECT * FROM categories ORDER BY sort').all(), products: list(u, Object.fromEntries(url.searchParams)),
        roles: u ? rolesOf(u.id) : []};
    },
    'GET /api/store/p/:id': (req, res, b, p) => {
      const u = optUser(req), x = db.prepare("SELECT * FROM products WHERE id=? AND status IN ('live','soon')").get(p.id);
      if (!x) fail(404, 'محصول یافت نشد');
      db.prepare('UPDATE products SET views=views+1 WHERE id=?').run(x.id); track('view', u?.id, x.id, url_src(req));
      const reviews = db.prepare("SELECT r.stars, r.text, r.at, u.name FROM reviews r JOIN users u ON u.id=r.uid WHERE pid=? AND status='ok' ORDER BY at DESC LIMIT 20").all(x.id);
      const related = list(u, {cat: x.cat}).filter(y => y.id !== x.id).slice(0, 4);
      return {product: pub(x, u), reviews, related};
    },
    'POST /api/store/checkout': (req, res, b) => {
      const u = auth(req), ids = [...new Set((b.items || []).map(String))].slice(0, 50);
      const ps = ids.map(id => db.prepare("SELECT * FROM products WHERE id=? AND status='live'").get(id)).filter(Boolean);
      if (!ps.length) fail(400, 'سبد خالی است');
      const total = ps.reduce((s, p) => s + p.price, 0);
      // Everything is free for now: orders are completed immediately with total 0.
      const oid = db.prepare('INSERT INTO store_orders(uid, total, status, ref, at) VALUES(?,?,?,?,?)').run(u.id, 0, 'paid-free', String(b.ref || '').slice(0, 40), now()).lastInsertRowid;
      for (const p of ps) {
        db.prepare('INSERT INTO store_order_items VALUES(?,?,?)').run(oid, p.id, 0);
        db.prepare('INSERT OR IGNORE INTO owned VALUES(?,?,?)').run(u.id, p.id, now()); track('claim', u.id, p.id, b.ref);
      }
      return {order: oid, listTotal: total, total: 0, items: ps.map(p => p.id)};
    },
    'GET /api/store/library': req => {
      const u = auth(req);
      const ps = db.prepare('SELECT p.*, o.at owned_at FROM owned o JOIN products p ON p.id=o.pid WHERE o.uid=? ORDER BY o.at DESC').all(u.id);
      return {items: ps.map(p => ({...pub(p, u), ownedAt: p.owned_at})),
        favorites: db.prepare('SELECT pid FROM favorites WHERE uid=?').all(u.id).map(r => r.pid),
        orders: db.prepare('SELECT id, total, status, at, (SELECT COUNT(*) FROM store_order_items WHERE oid=store_orders.id) n FROM store_orders WHERE uid=? ORDER BY at DESC LIMIT 50').all(u.id),
        attempts: db.prepare('SELECT a.*, p.title FROM attempts a JOIN products p ON p.id=a.pid WHERE uid=? ORDER BY at DESC LIMIT 200').all(u.id).map(a => ({...a, topics: J(a.topics, [])}))};
    },
    'POST /api/store/fav': (req, res, b) => {
      const u = auth(req), pid = String(b.pid || '');
      if (b.on) db.prepare('INSERT OR IGNORE INTO favorites VALUES(?,?)').run(u.id, pid); else db.prepare('DELETE FROM favorites WHERE uid=? AND pid=?').run(u.id, pid);
      return {ok: true};
    },
    'POST /api/store/review': (req, res, b) => {
      const u = auth(req), pid = String(b.pid || ''), stars = Math.max(1, Math.min(5, Math.round(+b.stars || 0)));
      if (!owns(u, pid)) fail(403, 'فقط پس از دریافت محصول می‌توانید نظر بدهید');
      db.prepare('INSERT OR REPLACE INTO reviews VALUES(?,?,?,?,?,?)').run(u.id, pid, stars, String(b.text || '').replace(/[<>]/g, '').slice(0, 600), 'pending', now());
      return {ok: true, pending: true};
    },
    'POST /api/store/attempts': (req, res, b) => {
      const u = auth(req), pid = String(b.pid || '');
      if (!owns(u, pid)) fail(403, 'محصول در کتابخانهٔ شما نیست');
      const topics = (Array.isArray(b.topics) ? b.topics : []).slice(0, 30).map(t => ({name: String(t.name || '').slice(0, 60), score: +t.score || 0, total: +t.total || 0}));
      const id = db.prepare('INSERT INTO attempts(uid, pid, learner, score, total, topics, secs, at) VALUES(?,?,?,?,?,?,?,?)')
        .run(u.id, pid, String(b.learner || '').slice(0, 40), +b.score || 0, +b.total || 0, JSON.stringify(topics), Math.min(+b.secs || 0, 864e2), now()).lastInsertRowid;
      track('attempt', u.id, pid); return {id};
    },
    'POST /api/ev': (req, res, b) => {
      const ok = ['home', 'catalog', 'share', 'preview_open', 'cart_add', 'search', 'ref_visit'];
      if (ok.includes(b.name)) track(b.name, optUser(req)?.id, String(b.pid || '').slice(0, 64) || null, String(b.src || '').slice(0, 40) || null);
      return {ok: true};
    }
  };
  const url_src = req => (String(req.headers.referer || '').match(/[?&]utm_source=([\w-]{1,30})/) || [])[1] || null;
  return {routes, raw, rolesOf, can, staff, track, pub, ensureFounder, STAFF, FILES};
}

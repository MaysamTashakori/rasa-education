// Command center: CRM, tickets, notices, campaigns/referrals, audit, KPIs, AI gateway, agents and approval queue.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function initAdmin(db, {auth, fail, ROOT, store}) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS tickets(id INTEGER PRIMARY KEY, uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, subject TEXT NOT NULL,
    topic TEXT, status TEXT NOT NULL DEFAULT 'open', prio TEXT NOT NULL DEFAULT 'normal', at INTEGER NOT NULL, updated INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS ticket_msgs(id INTEGER PRIMARY KEY, tid INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE, uid INTEGER, staff INTEGER NOT NULL DEFAULT 0, body TEXT NOT NULL, at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS crm_notes(id INTEGER PRIMARY KEY, uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, author INTEGER, body TEXT NOT NULL, at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS user_tags(uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, tag TEXT NOT NULL, PRIMARY KEY(uid, tag));
  CREATE TABLE IF NOT EXISTS notices(id INTEGER PRIMARY KEY, title TEXT NOT NULL, body TEXT, link TEXT, audience TEXT NOT NULL DEFAULT 'all', at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS campaigns(id TEXT PRIMARY KEY, name TEXT NOT NULL, channel TEXT, target TEXT, status TEXT NOT NULL DEFAULT 'draft', budget INTEGER DEFAULT 0, notes TEXT, at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS refcodes(code TEXT PRIMARY KEY, uid INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT, data TEXT, at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS agents(id TEXT PRIMARY KEY, name TEXT NOT NULL, dept TEXT, level TEXT, mission TEXT, approval TEXT, enabled INTEGER NOT NULL DEFAULT 1,
    daily_tokens INTEGER NOT NULL DEFAULT 200000, sort INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS jobs(id INTEGER PRIMARY KEY, agent TEXT NOT NULL, kind TEXT NOT NULL, target TEXT, input TEXT, output TEXT, status TEXT NOT NULL,
    tokens INTEGER NOT NULL DEFAULT 0, offline INTEGER NOT NULL DEFAULT 0, by INTEGER, decided_by INTEGER, at INTEGER NOT NULL, decided INTEGER);`);
  const now = () => Date.now(), {staff, rolesOf, track} = store;
  const J = (s, d) => {try {return s ? JSON.parse(s) : d} catch {return d}};
  const clean = (s, n = 2000) => String(s ?? '').replace(/<\/?script/gi, '').trim().slice(0, n);
  const audit = (actor, action, target, data) => db.prepare('INSERT INTO audit_log(actor, action, target, data, at) VALUES(?,?,?,?,?)')
    .run(String(actor), action, target == null ? null : String(target), data ? JSON.stringify(data).slice(0, 4000) : null, now());

  const af = path.join(ROOT, 'content/agents/agents.json');
  if (fs.existsSync(af)) {
    const ins = db.prepare('INSERT OR IGNORE INTO agents(id, name, dept, level, mission, approval, daily_tokens, sort) VALUES(?,?,?,?,?,?,?,?)');
    J(fs.readFileSync(af, 'utf8'), []).forEach((a, i) => ins.run(a.id, a.name, a.dept, a.level, a.mission, a.approval || 'founder', a.daily_tokens || 200000, i));
  }

  // AI gateway: any OpenAI-compatible API. Keys only from env; offline template when no key.
  const aiOn = () => !!process.env.AI_API_KEY;
  async function ai(agentId, system, user) {
    const a = db.prepare('SELECT * FROM agents WHERE id=?').get(agentId);
    if (!a) fail(404, 'ایجنت یافت نشد'); if (!a.enabled) fail(409, 'این ایجنت متوقف است');
    const used = db.prepare('SELECT COALESCE(SUM(tokens),0) t FROM jobs WHERE agent=? AND at>?').get(agentId, now() - 864e5).t;
    if (used >= a.daily_tokens) fail(429, 'بودجهٔ روزانهٔ این ایجنت تمام شده است');
    if (!aiOn()) return {text: null, tokens: 0, offline: true};
    const base = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const r = await fetch(base + '/chat/completions', {method: 'POST', signal: AbortSignal.timeout(60000),
      headers: {'content-type': 'application/json', authorization: 'Bearer ' + process.env.AI_API_KEY},
      body: JSON.stringify({model: process.env.AI_MODEL || 'gpt-4o-mini', temperature: 0.6,
        messages: [{role: 'system', content: `${system}\nتو «${a.name}» در شرکت رسا آموزش هستی. مأموریت: ${a.mission}. فارسی رسمی، روشن و مهربان بنویس. خروجی پیش‌نویس است و بنیان‌گذار تأیید می‌کند.`},
          {role: 'user', content: user}]})});
    const j = await r.json().catch(() => ({}));
    if (!r.ok) fail(502, 'خطای سرویس هوش مصنوعی: ' + (j.error?.message || r.status));
    return {text: j.choices?.[0]?.message?.content || '', tokens: j.usage?.total_tokens || 0, offline: false};
  }

  const product = id => db.prepare('SELECT * FROM products WHERE id=?').get(id);
  const TASKS = {
    'marketer:social': async (t) => {
      const p = product(t) || fail(404, 'محصول یافت نشد'), link = `/p/${p.id}?utm_source=social`;
      const r = await ai('marketer', 'برای معرفی محصول آموزشی، سه پست کوتاه بنویس: کانال تلگرام، کانال بله، و کپشن اینستاگرام با هشتگ فارسی. هر پست با عنوان بخش.', `عنوان: ${p.title}\nخلاصه: ${p.summary}\nویژگی‌ها: ${J(p.features, []).join('، ')}\nقیمت: رایگان\nلینک: ${link}`);
      return {...r, text: r.text || `📣 ${p.title}\n\n${p.summary}\n\n✦ ${J(p.features, []).slice(0, 4).join('\n✦ ')}\n\nرایگان دریافت کنید ← ${link}\n#رسا_آموزش #${(p.subject || 'آموزش').replace(/\s+/g, '_')}`};
    },
    'support:reply': async (t) => {
      const tk = db.prepare('SELECT * FROM tickets WHERE id=?').get(+t) || fail(404, 'تیکت یافت نشد');
      const msgs = db.prepare('SELECT staff, body FROM ticket_msgs WHERE tid=? ORDER BY id').all(tk.id).map(m => (m.staff ? 'پشتیبان: ' : 'کاربر: ') + m.body).join('\n');
      const r = await ai('support', 'یک پاسخ کوتاه، دقیق و همدلانه برای این تیکت پشتیبانی بنویس. اگر مطمئن نیستی، بگو که بررسی می‌کنیم.', `موضوع: ${tk.subject}\n${msgs}`);
      return {...r, text: r.text || `سلام، از پیامتان سپاسگزاریم. موضوع «${tk.subject}» را بررسی می‌کنیم و تا پایان امروز نتیجه را همین‌جا اعلام می‌کنیم.\nرسا آموزش`};
    },
    'report-writer:weekly': async (t) => {
      const u = db.prepare('SELECT id, name FROM users WHERE id=?').get(+t) || fail(404, 'کاربر یافت نشد');
      const at = db.prepare('SELECT a.score, a.total, a.topics, p.title FROM attempts a JOIN products p ON p.id=a.pid WHERE uid=? AND at>? ORDER BY at').all(u.id, now() - 7 * 864e5);
      const facts = at.map(a => `${a.title}: ${a.score}/${a.total}`).join('\n') || 'این هفته آزمونی ثبت نشده است.';
      const r = await ai('report-writer', 'گزارش هفتگی روایی برای والد بنویس با سه بخش: «بلد است»، «در حال تمرین»، «گام بعدی». حداکثر ۱۲۰ کلمه.', `نام: ${u.name}\n${facts}`);
      return {...r, text: r.text || `گزارش هفتهٔ ${u.name}\n\n${facts}\n\nگام بعدی: هر روز ۱۵ دقیقه تمرین مبحثی که کمترین امتیاز را داشته است.`};
    },
    'qa:catalog': async () => {
      const issues = db.prepare("SELECT id, title, file, summary FROM products WHERE status='live'").all()
        .flatMap(p => [!p.file && `«${p.title}» فایل ندارد`, (!p.summary || p.summary.length < 30) && `«${p.title}» خلاصهٔ کافی ندارد`].filter(Boolean));
      return {text: issues.length ? issues.map(s => '• ' + s).join('\n') : 'همهٔ محصولات منتشرشده فایل و خلاصه دارند. ✓', tokens: 0, offline: false};
    },
    'growth:digest': async () => {
      const k = kpis(7);
      return {text: `خلاصهٔ ۷ روز\nکاربر جدید: ${k.newUsers}\nبازدید محصول: ${k.views}\nدریافت: ${k.claims}\nنرخ تبدیل: ${k.conv}%\nتیکت باز: ${k.openTickets}`, tokens: 0, offline: false};
    }
  };

  function kpis(days = 30) {
    const since = now() - days * 864e5, c = (sql, ...a) => db.prepare(sql).get(...a).n;
    const views = c("SELECT COUNT(*) n FROM events WHERE name='view' AND at>?", since), claims = c("SELECT COUNT(*) n FROM events WHERE name='claim' AND at>?", since);
    return {users: c('SELECT COUNT(*) n FROM users'), newUsers: c('SELECT COUNT(*) n FROM users WHERE created>?', since), views, claims,
      conv: views ? Math.round(claims / views * 1000) / 10 : 0, products: c("SELECT COUNT(*) n FROM products WHERE status='live'"),
      downloads: c("SELECT COUNT(*) n FROM events WHERE name='download' AND at>?", since), attempts: c('SELECT COUNT(*) n FROM attempts WHERE at>?', since),
      openTickets: c("SELECT COUNT(*) n FROM tickets WHERE status!='closed'"), pending: c("SELECT COUNT(*) n FROM jobs WHERE status='review'"),
      reviewsPending: c("SELECT COUNT(*) n FROM reviews WHERE status='pending'")};
  }
  const series = (days = 30) => {
    const since = now() - days * 864e5, day = t => new Date(t + 3.5 * 36e5).toISOString().slice(0, 10), out = {};
    for (let i = days - 1; i >= 0; i--) out[day(now() - i * 864e5)] = {view: 0, claim: 0, signup: 0, download: 0};
    for (const e of db.prepare("SELECT name, at FROM events WHERE at>? AND name IN ('view','claim','download')").all(since)) if (out[day(e.at)]) out[day(e.at)][e.name]++;
    for (const u of db.prepare('SELECT created at FROM users WHERE created>?').all(since)) if (out[day(u.at)]) out[day(u.at)].signup++;
    return Object.entries(out).map(([d, v]) => ({d, ...v}));
  };
  const crud = (table, keys) => (b) => {
    const row = Object.fromEntries(keys.map(k => [k, b[k] == null ? null : typeof b[k] === 'object' ? JSON.stringify(b[k]) : clean(b[k], k === 'body' ? 20000 : 600)]));
    db.prepare(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')}) ON CONFLICT(id) DO UPDATE SET ${keys.filter(k => k !== 'id').map(k => `${k}=excluded.${k}`).join(',')}`).run(...keys.map(k => row[k]));
    return row;
  };
  const PKEYS = ['id', 'kind', 'cat', 'grade', 'subject', 'title', 'summary', 'body', 'price', 'status', 'color', 'icon', 'tags', 'features', 'meta', 'sort'];
  const refOf = uid => {
    let r = db.prepare('SELECT code FROM refcodes WHERE uid=?').get(uid);
    if (!r) {r = {code: crypto.randomBytes(4).toString('hex')}; db.prepare('INSERT INTO refcodes VALUES(?,?)').run(r.code, uid)}
    return r.code;
  };

  const routes = {
    // customer side
    'GET /api/notices': req => db.prepare('SELECT id, title, body, link, at FROM notices ORDER BY at DESC LIMIT 20').all(),
    'GET /api/ref': req => {const u = auth(req), code = refOf(u.id); return {code, signups: db.prepare("SELECT COUNT(*) n FROM events WHERE name='signup' AND src=?").get('ref:' + code).n}},
    'GET /api/tickets': req => db.prepare('SELECT * FROM tickets WHERE uid=? ORDER BY updated DESC').all(auth(req).id),
    'POST /api/tickets': (req, res, b) => {
      const u = auth(req), subject = clean(b.subject, 120), body = clean(b.body, 4000);
      if (!subject || !body) fail(400, 'موضوع و متن پیام لازم است');
      const id = db.prepare('INSERT INTO tickets(uid, subject, topic, at, updated) VALUES(?,?,?,?,?)').run(u.id, subject, clean(b.topic, 40), now(), now()).lastInsertRowid;
      db.prepare('INSERT INTO ticket_msgs(tid, uid, body, at) VALUES(?,?,?,?)').run(id, u.id, body, now()); return {id};
    },
    'GET /api/tickets/:id': (req, res, b, p) => {
      const u = auth(req), t = db.prepare('SELECT * FROM tickets WHERE id=?').get(+p.id);
      if (!t || (t.uid !== u.id && !store.can(u, 'support'))) fail(404, 'تیکت یافت نشد');
      return {ticket: t, msgs: db.prepare('SELECT m.*, u.name FROM ticket_msgs m LEFT JOIN users u ON u.id=m.uid WHERE tid=? ORDER BY m.id').all(t.id)};
    },
    'POST /api/tickets/:id/msg': (req, res, b, p) => {
      const u = auth(req), t = db.prepare('SELECT * FROM tickets WHERE id=?').get(+p.id), isStaff = store.can(u, 'support');
      if (!t || (t.uid !== u.id && !isStaff)) fail(404, 'تیکت یافت نشد');
      const body = clean(b.body, 4000); if (!body) fail(400, 'متن پیام خالی است');
      db.prepare('INSERT INTO ticket_msgs(tid, uid, staff, body, at) VALUES(?,?,?,?,?)').run(t.id, u.id, isStaff && t.uid !== u.id ? 1 : 0, body, now());
      db.prepare('UPDATE tickets SET status=?, updated=? WHERE id=?').run(isStaff && t.uid !== u.id ? 'answered' : 'open', now(), t.id);
      if (isStaff && t.uid !== u.id) audit(u.id, 'ticket.reply', t.id); return {ok: true};
    },

    // command center
    'GET /api/admin/overview': req => {
      staff(req, 'admin', 'editor', 'support', 'marketer');
      return {kpis: kpis(30), series: series(30), ai: aiOn(), bots: ['TELEGRAM_BOT_TOKEN', 'BALE_BOT_TOKEN'].filter(k => process.env[k]),
        top: db.prepare("SELECT id, title, views, downloads, (SELECT COUNT(*) FROM owned WHERE pid=products.id) claims FROM products ORDER BY claims DESC, views DESC LIMIT 8").all(),
        sources: db.prepare("SELECT COALESCE(src,'مستقیم') src, COUNT(*) n FROM events WHERE name IN ('view','claim','signup') AND at>? GROUP BY src ORDER BY n DESC LIMIT 8").all(now() - 30 * 864e5),
        recent: db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 12').all()};
    },
    'GET /api/admin/customers': (req, res, b, p, url) => {
      staff(req, 'admin', 'support', 'marketer'); const q = '%' + (url.searchParams.get('q') || '') + '%';
      return db.prepare(`SELECT u.id, u.name, u.login, u.created, (SELECT COUNT(*) FROM owned WHERE uid=u.id) owned, (SELECT COUNT(*) FROM children WHERE uid=u.id) kids,
        (SELECT MAX(at) FROM events WHERE uid=u.id) seen, (SELECT GROUP_CONCAT(tag) FROM user_tags WHERE uid=u.id) tags, (SELECT GROUP_CONCAT(role) FROM roles WHERE uid=u.id) roles
        FROM users u WHERE u.name LIKE ? OR u.login LIKE ? ORDER BY u.id DESC LIMIT 300`).all(q, q);
    },
    'GET /api/admin/customers/:id': (req, res, b, p) => {
      staff(req, 'admin', 'support', 'marketer'); const id = +p.id, u = db.prepare('SELECT id, name, login, created FROM users WHERE id=?').get(id) || fail(404, 'کاربر یافت نشد');
      return {user: u, roles: rolesOf(id), tags: db.prepare('SELECT tag FROM user_tags WHERE uid=?').all(id).map(r => r.tag),
        notes: db.prepare('SELECT n.*, u.name author_name FROM crm_notes n LEFT JOIN users u ON u.id=n.author WHERE n.uid=? ORDER BY n.id DESC').all(id),
        owned: db.prepare('SELECT o.pid, o.at, p.title FROM owned o LEFT JOIN products p ON p.id=o.pid WHERE uid=? ORDER BY o.at DESC').all(id),
        attempts: db.prepare('SELECT a.pid, a.score, a.total, a.at, p.title FROM attempts a LEFT JOIN products p ON p.id=a.pid WHERE uid=? ORDER BY a.at DESC LIMIT 50').all(id),
        tickets: db.prepare('SELECT id, subject, status, updated FROM tickets WHERE uid=? ORDER BY updated DESC').all(id),
        timeline: db.prepare('SELECT name, pid, src, at FROM events WHERE uid=? ORDER BY id DESC LIMIT 60').all(id)};
    },
    'POST /api/admin/customers/:id/note': (req, res, b, p) => {
      const s = staff(req, 'admin', 'support', 'marketer'), body = clean(b.body, 2000); if (!body) fail(400, 'یادداشت خالی است');
      db.prepare('INSERT INTO crm_notes(uid, author, body, at) VALUES(?,?,?,?)').run(+p.id, s.id, body, now()); audit(s.id, 'crm.note', p.id); return {ok: true};
    },
    'POST /api/admin/customers/:id/tags': (req, res, b, p) => {
      const s = staff(req, 'admin', 'support', 'marketer'), tags = [...new Set((b.tags || []).map(t => clean(t, 24)).filter(Boolean))].slice(0, 12);
      db.prepare('DELETE FROM user_tags WHERE uid=?').run(+p.id); for (const t of tags) db.prepare('INSERT INTO user_tags VALUES(?,?)').run(+p.id, t);
      audit(s.id, 'crm.tags', p.id, tags); return {ok: true};
    },
    'POST /api/admin/customers/:id/roles': (req, res, b, p) => {
      const s = staff(req), roles = (b.roles || []).filter(r => store.ROLES.includes(r) && r !== 'founder');
      db.prepare("DELETE FROM roles WHERE uid=? AND role!='founder'").run(+p.id); for (const r of roles) db.prepare('INSERT OR IGNORE INTO roles VALUES(?,?)').run(+p.id, r);
      audit(s.id, 'roles.set', p.id, roles); return {roles: rolesOf(+p.id)};
    },
    'GET /api/admin/products': req => {staff(req, 'admin', 'editor', 'marketer'); return {products: db.prepare('SELECT * FROM products ORDER BY sort, updated DESC').all().map(x => store.pub(x)), categories: db.prepare('SELECT * FROM categories ORDER BY sort').all()}},
    'POST /api/admin/products': (req, res, b) => {
      const s = staff(req, 'admin', 'editor'), id = String(b.id || '').toLowerCase().replace(/[^\w-]/g, '').slice(0, 64);
      if (!id || !clean(b.title)) fail(400, 'شناسه و عنوان لازم است');
      const old = db.prepare('SELECT created FROM products WHERE id=?').get(id);
      crud('products', PKEYS)({...b, id, price: 0, sort: +b.sort || 0});
      db.prepare('UPDATE products SET created=COALESCE(created, ?), updated=?, price=0 WHERE id=?').run(now(), now(), id);
      if (!old) db.prepare('UPDATE products SET created=? WHERE id=?').run(now(), id);
      audit(s.id, old ? 'product.update' : 'product.create', id, {status: b.status}); return {ok: true, id};
    },
    'DELETE /api/admin/products/:id': (req, res, b, p) => {const s = staff(req, 'admin'); db.prepare("UPDATE products SET status='archived' WHERE id=?").run(p.id); audit(s.id, 'product.archive', p.id); return {ok: true}},
    'POST /api/admin/categories': (req, res, b) => {
      const s = staff(req, 'admin', 'editor'), id = String(b.id || '').replace(/[^\w-]/g, '').slice(0, 40); if (!id || !clean(b.title)) fail(400, 'شناسه و عنوان لازم است');
      crud('categories', ['id', 'parent', 'title', 'icon', 'color', 'sort', 'info'])({...b, id, sort: +b.sort || 0}); audit(s.id, 'category.save', id); return {ok: true};
    },
    'GET /api/admin/reviews': req => {staff(req, 'admin', 'editor', 'support'); return db.prepare('SELECT r.*, u.name, p.title FROM reviews r JOIN users u ON u.id=r.uid LEFT JOIN products p ON p.id=r.pid ORDER BY r.status, r.at DESC LIMIT 200').all()},
    'POST /api/admin/reviews': (req, res, b) => {
      const s = staff(req, 'admin', 'editor', 'support'); db.prepare('UPDATE reviews SET status=? WHERE uid=? AND pid=?').run(b.ok ? 'ok' : 'hidden', +b.uid, String(b.pid));
      audit(s.id, 'review.' + (b.ok ? 'approve' : 'hide'), b.pid, {uid: b.uid}); return {ok: true};
    },
    'GET /api/admin/tickets': req => {staff(req, 'admin', 'support'); return db.prepare("SELECT t.*, u.name, (SELECT COUNT(*) FROM ticket_msgs WHERE tid=t.id) n FROM tickets t JOIN users u ON u.id=t.uid ORDER BY CASE t.status WHEN 'open' THEN 0 WHEN 'answered' THEN 1 ELSE 2 END, t.updated DESC LIMIT 300").all()},
    'POST /api/admin/tickets/:id': (req, res, b, p) => {
      const s = staff(req, 'admin', 'support');
      if (b.status) db.prepare('UPDATE tickets SET status=?, updated=? WHERE id=?').run(['open', 'answered', 'closed'].includes(b.status) ? b.status : 'open', now(), +p.id);
      if (b.prio) db.prepare('UPDATE tickets SET prio=? WHERE id=?').run(['low', 'normal', 'high'].includes(b.prio) ? b.prio : 'normal', +p.id);
      audit(s.id, 'ticket.update', p.id, b); return {ok: true};
    },
    'POST /api/admin/notices': (req, res, b) => {
      const s = staff(req, 'admin', 'marketer'), title = clean(b.title, 120); if (!title) fail(400, 'عنوان لازم است');
      const id = db.prepare('INSERT INTO notices(title, body, link, audience, at) VALUES(?,?,?,?,?)').run(title, clean(b.body, 1000), clean(b.link, 300), clean(b.audience, 20) || 'all', now()).lastInsertRowid;
      audit(s.id, 'notice.create', id); return {id};
    },
    'DELETE /api/admin/notices/:id': (req, res, b, p) => {const s = staff(req, 'admin', 'marketer'); db.prepare('DELETE FROM notices WHERE id=?').run(+p.id); audit(s.id, 'notice.delete', p.id); return {ok: true}},
    'GET /api/admin/campaigns': req => {
      staff(req, 'admin', 'marketer');
      return db.prepare('SELECT * FROM campaigns ORDER BY at DESC').all().map(c => ({...c,
        views: db.prepare("SELECT COUNT(*) n FROM events WHERE name='view' AND src=?").get(c.id).n,
        claims: db.prepare("SELECT COUNT(*) n FROM events WHERE name='claim' AND src=?").get(c.id).n,
        signups: db.prepare("SELECT COUNT(*) n FROM events WHERE name='signup' AND src=?").get(c.id).n}));
    },
    'POST /api/admin/campaigns': (req, res, b) => {
      const s = staff(req, 'admin', 'marketer'), id = String(b.id || '').toLowerCase().replace(/[^\w-]/g, '').slice(0, 30); if (!id || !clean(b.name)) fail(400, 'شناسه و نام کمپین لازم است');
      db.prepare(`INSERT INTO campaigns(id, name, channel, target, status, budget, notes, at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, channel=excluded.channel,
        target=excluded.target, status=excluded.status, budget=excluded.budget, notes=excluded.notes`).run(id, clean(b.name, 80), clean(b.channel, 30), clean(b.target, 200), clean(b.status, 12) || 'draft', +b.budget || 0, clean(b.notes, 1000), now());
      audit(s.id, 'campaign.save', id); return {ok: true, id};
    },
    'GET /api/admin/audit': req => {staff(req, 'admin'); return db.prepare('SELECT a.*, u.name FROM audit_log a LEFT JOIN users u ON CAST(u.id AS TEXT)=a.actor ORDER BY a.id DESC LIMIT 300').all()},
    'GET /api/admin/agents': req => {
      staff(req, 'admin', 'editor', 'support', 'marketer');
      return {ai: aiOn(), model: process.env.AI_MODEL || 'gpt-4o-mini', tasks: Object.keys(TASKS),
        agents: db.prepare(`SELECT a.*, (SELECT COALESCE(SUM(tokens),0) FROM jobs WHERE agent=a.id AND at>?) used, (SELECT COUNT(*) FROM jobs WHERE agent=a.id) runs,
          (SELECT COUNT(*) FROM jobs WHERE agent=a.id AND status='review') pending FROM agents a ORDER BY sort`).all(now() - 864e5),
        jobs: db.prepare('SELECT j.*, a.name agent_name FROM jobs j LEFT JOIN agents a ON a.id=j.agent ORDER BY j.id DESC LIMIT 100').all()};
    },
    'PATCH /api/admin/agents/:id': (req, res, b, p) => {
      const s = staff(req, 'admin');
      if (b.enabled != null) db.prepare('UPDATE agents SET enabled=? WHERE id=?').run(b.enabled ? 1 : 0, p.id);
      if (b.daily_tokens != null) db.prepare('UPDATE agents SET daily_tokens=? WHERE id=?').run(Math.max(0, +b.daily_tokens | 0), p.id);
      audit(s.id, b.enabled === false ? 'agent.stop' : 'agent.update', p.id, b); return {ok: true};
    },
    'POST /api/admin/agents/run': async (req, res, b) => {
      const key = String(b.task || ''), fn = TASKS[key]; if (!fn) fail(400, 'وظیفهٔ ناشناخته');
      const agent = key.split(':')[0], s = staff(req, 'admin', 'editor', 'support', 'marketer');
      const a = db.prepare('SELECT enabled FROM agents WHERE id=?').get(agent); if (!a) fail(404, 'ایجنت یافت نشد'); if (!a.enabled) fail(409, 'این ایجنت متوقف است');
      const r = await fn(b.target);
      const id = db.prepare('INSERT INTO jobs(agent, kind, target, input, output, status, tokens, offline, by, at) VALUES(?,?,?,?,?,?,?,?,?,?)')
        .run(agent, key, b.target == null ? null : String(b.target), null, r.text, 'review', r.tokens || 0, r.offline ? 1 : 0, s.id, now()).lastInsertRowid;
      audit('agent:' + agent, 'job.draft', id, {task: key, by: s.id}); return {id, output: r.text, offline: !!r.offline};
    },
    'POST /api/admin/jobs/:id/decide': (req, res, b, p) => {
      const s = staff(req, 'admin'), j = db.prepare('SELECT * FROM jobs WHERE id=?').get(+p.id) || fail(404, 'کار یافت نشد');
      if (j.status !== 'review') fail(409, 'این کار قبلاً تعیین تکلیف شده است');
      const out = b.output != null ? clean(b.output, 20000) : j.output;
      db.prepare('UPDATE jobs SET status=?, output=?, decided_by=?, decided=? WHERE id=?').run(b.ok ? 'approved' : 'rejected', out, s.id, now(), j.id);
      if (b.ok && j.kind === 'support:reply') {
        db.prepare('INSERT INTO ticket_msgs(tid, uid, staff, body, at) VALUES(?,?,?,?,?)').run(+j.target, s.id, 1, out, now());
        db.prepare("UPDATE tickets SET status='answered', updated=? WHERE id=?").run(now(), +j.target);
      }
      audit(s.id, 'job.' + (b.ok ? 'approve' : 'reject'), j.id, {kind: j.kind}); return {ok: true};
    }
  };
  // list results must not be mistaken for [body, headers, status] tuples by the dispatcher
  for (const [k, fn] of Object.entries(routes)) routes[k] = async (...a) => {const r = await fn(...a); return Array.isArray(r) ? [r, {}, 200] : r};
  return {routes, audit, refOf};
}

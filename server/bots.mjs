// Bale + Telegram notifications. Tokens from env: TELEGRAM_BOT_TOKEN, BALE_BOT_TOKEN (optional WEBHOOK_SECRET).
import crypto from 'node:crypto';
const API = {telegram: 'https://api.telegram.org/bot', bale: 'https://tapi.bale.ai/bot'};
const token = k => process.env[k === 'telegram' ? 'TELEGRAM_BOT_TOKEN' : 'BALE_BOT_TOKEN'] || '';
export const enabledBots = () => Object.keys(API).filter(k => token(k));

export function initBots(db, {auth, fail, PD}) {
  db.exec(`CREATE TABLE IF NOT EXISTS links(uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, chat TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY(uid, kind));
  CREATE TABLE IF NOT EXISTS link_codes(code TEXT PRIMARY KEY, uid INTEGER NOT NULL, exp INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS outbox(id INTEGER PRIMARY KEY, kind TEXT NOT NULL, chat TEXT NOT NULL, text TEXT NOT NULL, tries INTEGER NOT NULL DEFAULT 0, sent INTEGER, err TEXT, at INTEGER NOT NULL, dedup TEXT UNIQUE);`);
  const fa = s => String(s).replace(/\d/g, d => PD[d]);
  async function call(kind, method, body) {
    const r = await fetch(API[kind] + token(kind) + '/' + method, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});
    const j = await r.json().catch(() => ({})); if (!j.ok) throw new Error(j.description || 'HTTP ' + r.status); return j.result;
  }
  function enqueue(uid, text, dedup) {
    for (const l of db.prepare('SELECT kind, chat FROM links WHERE uid=?').all(uid))
      db.prepare('INSERT OR IGNORE INTO outbox(kind, chat, text, at, dedup) VALUES(?,?,?,?,?)').run(l.kind, l.chat, text, Date.now(), dedup ? `${dedup}|${l.kind}` : null);
  }
  const tehranHour = () => +new Intl.DateTimeFormat('en-US', {hour: 'numeric', hour12: false, timeZone: 'Asia/Tehran'}).format(new Date()) % 24;
  async function flush() {
    const h = tehranHour(); if (h >= 21 || h < 7) return;
    for (const m of db.prepare('SELECT * FROM outbox WHERE sent IS NULL AND tries < 5 ORDER BY id LIMIT 30').all()) {
      if (!token(m.kind)) continue;
      try {await call(m.kind, 'sendMessage', {chat_id: m.chat, text: m.text}); db.prepare('UPDATE outbox SET sent=? WHERE id=?').run(Date.now(), m.id)}
      catch (e) {db.prepare('UPDATE outbox SET tries=tries+1, err=? WHERE id=?').run(String(e.message).slice(0, 200), m.id)}
    }
  }
  const isoTehran = (d = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Tehran'}).format(d);
  const addDays = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const wdi = iso => (new Date(iso + 'T12:00:00Z').getUTCDay() + 1) % 7;
  function reminders() {
    const h = tehranHour(), t = isoTehran(), tm = addDays(t, 1);
    const kids = db.prepare('SELECT c.*, u.id uid FROM children c JOIN users u ON u.id=c.uid WHERE c.uid IN (SELECT uid FROM links)').all();
    if (h === 8) try {
      for (const r of db.prepare('SELECT uid FROM planner').all())
        enqueue(r.uid, '🗓️ صبح بخیر! برنامهٔ امروزت را در «برنامه‌ریز رسا» باز کن و گام‌های امروز را بگذار.', `pl|${r.uid}|${t}`);
    } catch {}
    for (const c of kids) {
      const s = c.state ? JSON.parse(c.state) : null; if (!s) continue;
      if (h === 7) {const n = (s.routine || []).filter(r => r.days?.[wdi(t)]).length; enqueue(c.uid, `☀️ صبح بخیر! امروز ${fa(n)} کار در روال ${c.name} است. با هر کار ستاره بگیرد ⭐`, `am|${c.id}|${t}`)}
      if (h === 18) {
        const hw = (s.homework || []).filter(x => !x.done && x.due <= tm);
        if (hw.length) enqueue(c.uid, `✏️ ${c.name} برای امروز و فردا ${fa(hw.length)} مشق دارد:\n` + hw.slice(0, 6).map(x => '• ' + x.t).join('\n'), `hw|${c.id}|${t}`);
      }
      if (h === 20) {const tt = s.timetable?.[wdi(tm)] || []; if (tt.length && !(s.bag?.[tm] || []).length) enqueue(c.uid, `🎒 وقت آماده کردن کیف فردای ${c.name} است (${fa(tt.length)} درس).`, `bag|${c.id}|${t}`)}
      if (h === 19 && wdi(t) === 6) {
        const days = Array.from({length: 7}, (_, i) => addDays(t, i - 6)), done = days.reduce((a, d) => a + (s.done?.[d] || []).length, 0);
        const read = (s.reading || []).filter(x => days.includes(x.date)).reduce((a, x) => a + x.min, 0), hwd = (s.homework || []).filter(x => x.done && days.includes(x.doneAt)).length;
        enqueue(c.uid, `📊 گزارش هفتهٔ ${c.name}:\n✅ ${fa(done)} کار روزانه\n📖 ${fa(read)} دقیقه کتاب‌خوانی\n✏️ ${fa(hwd)} مشق انجام‌شده\nرسا آموزش`, `wk|${c.id}|${t}`);
      }
    }
  }
  setInterval(() => {try {reminders()} catch (e) {console.error('reminders', e)} flush().catch(e => console.error('flush', e))}, 5 * 60 * 1000).unref();

  return {
    enqueue,
    routes: {
      'GET /api/notify': req => {const u = auth(req); return {bots: enabledBots(), links: db.prepare('SELECT kind, at FROM links WHERE uid=?').all(u.id)}},
      'POST /api/notify/link': req => {
        const u = auth(req), code = crypto.randomInt(100000, 999999).toString();
        db.prepare('DELETE FROM link_codes WHERE uid=? OR exp<?').run(u.id, Date.now());
        db.prepare('INSERT INTO link_codes(code, uid, exp) VALUES(?,?,?)').run(code, u.id, Date.now() + 15 * 60 * 1000);
        return {code, bots: enabledBots(), names: {telegram: process.env.TELEGRAM_BOT_NAME || '', bale: process.env.BALE_BOT_NAME || ''}};
      },
      'POST /api/notify/unlink': (req, res, b) => {const u = auth(req); db.prepare('DELETE FROM links WHERE uid=? AND kind=?').run(u.id, String(b.kind)); return {ok: true}},
      'POST /api/notify/test': req => {const u = auth(req); enqueue(u.id, '🔔 پیام آزمایشی رسا آموزش؛ اتصال برقرار است.'); flush().catch(() => {}); return {ok: true}},
      'POST /api/bots/:kind': async (req, res, b, p) => {
        const kind = p.kind; if (!API[kind] || !token(kind)) fail(404, 'ربات فعال نیست');
        if (process.env.WEBHOOK_SECRET && req.headers['x-telegram-bot-api-secret-token'] !== process.env.WEBHOOK_SECRET && new URL(req.url, 'http://x').searchParams.get('s') !== process.env.WEBHOOK_SECRET) fail(403, 'forbidden');
        const msg = b.message; if (!msg?.chat?.id) return {ok: true};
        const text = String(msg.text || '').replace(/[۰-۹]/g, d => PD.indexOf(d)).trim(), m = text.match(/^\/start\s+(\d{6})$/) || text.match(/^(\d{6})$/);
        let reply = 'سلام! برای اتصال، در سامانهٔ رسا آموزش بخش «والد ← اعلان‌ها» کد ۶ رقمی بگیر و اینجا بفرست.';
        if (m) {
          const c = db.prepare('SELECT * FROM link_codes WHERE code=? AND exp>?').get(m[1], Date.now());
          if (c) {db.prepare('INSERT OR REPLACE INTO links(uid, kind, chat, at) VALUES(?,?,?,?)').run(c.uid, kind, String(msg.chat.id), Date.now()); db.prepare('DELETE FROM link_codes WHERE code=?').run(m[1]); reply = '✅ اتصال انجام شد. یادآورهای روال، مشق، کیف فردا و گزارش هفتگی اینجا می‌آید.'}
          else reply = 'کد نامعتبر یا منقضی است؛ یک کد تازه بگیر.';
        }
        await call(kind, 'sendMessage', {chat_id: msg.chat.id, text: reply}).catch(e => console.error(kind, e.message));
        return {ok: true};
      },
    },
  };
}

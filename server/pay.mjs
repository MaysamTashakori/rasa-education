// Zarinpal v4 payments (sandbox or production). Money: integer toman in DB, rial only at the gateway boundary.
import crypto from 'node:crypto';

export function initPay(db, {auth, fail}) {
  const MERCHANT = process.env.ZARINPAL_MERCHANT || '';
  const SANDBOX = process.env.ZARINPAL_SANDBOX === '1' || !MERCHANT;
  const API = SANDBOX ? 'https://sandbox.zarinpal.com/pg/v4/payment' : 'https://payment.zarinpal.com/pg/v4/payment';
  const APP = (process.env.APP_URL || 'http://localhost:8080').replace(/\/$/, '');
  const toRial = t => t * 10;

  const orderOf = (u, oid) => {
    const o = db.prepare('SELECT * FROM store_orders WHERE id=? AND uid=?').get(+oid, u.id);
    if (!o) fail(404, 'سفارش یافت نشد');
    return o;
  };
  const back = ok => ['', 302, {location: `${APP}/me?pay=${ok ? 'ok' : 'fail'}`}];

  const routes = {
    'POST /api/pay/request': async (req, res, b) => {
      if (!MERCHANT) fail(503, 'درگاه پرداخت هنوز تنظیم نشده است؛ سفارش شما ثبت شد و بعداً قابل پرداخت است.');
      const u = auth(req), o = orderOf(u, b.order);
      if (o.status === 'paid') return {url: `${APP}/me?pay=ok`, paid: true};
      if (o.status !== 'pending') fail(409, 'این سفارش قابل پرداخت نیست');
      const items = db.prepare('SELECT i.*, p.title FROM store_order_items i JOIN products p ON p.id=i.pid WHERE i.oid=?').all(o.id);
      if (!items.length) fail(400, 'سفارش خالی است');
      const amount = items.reduce((s, i) => s + i.price, 0);
      if (amount !== o.total) fail(409, 'مبلغ سفارش تغییر کرده است');
      const r = await fetch(`${API}/request.json`, {method: 'POST', headers: {'content-type': 'application/json'},
        body: JSON.stringify({merchant_id: MERCHANT || 'zarinpal', amount: toRial(amount), description: `سفارش رسا آموزش #${o.id} (${items.length} محصول)`, callback_url: `${APP}/api/pay/callback`, metadata: {order_id: String(o.id)}})});
      const j = await r.json().catch(() => ({}));
      if (j?.data?.code !== 100 || !j?.data?.authority) fail(502, j?.errors?.message || 'درگاه پاسخ نداد');
      db.prepare('UPDATE store_orders SET ref=? WHERE id=?').run(j.data.authority, o.id);
      return {url: j.data.start_pay_link};
    },
    'GET /api/pay/callback': async (req, res, b, p, url) => {
      const auth_ = url.searchParams.get('Authority'), status = url.searchParams.get('Status');
      const o = db.prepare('SELECT * FROM store_orders WHERE ref=?').get(auth_ || '');
      if (!o) return back(false);
      if (status !== 'OK') {db.prepare("UPDATE store_orders SET status='failed' WHERE id=?").run(o.id); return back(false)}
      const items = db.prepare('SELECT pid, price FROM store_order_items WHERE oid=?').all(o.id);
      const amount = items.reduce((s, i) => s + i.price, 0);
      const r = await fetch(`${API}/verify.json`, {method: 'POST', headers: {'content-type': 'application/json'},
        body: JSON.stringify({merchant_id: MERCHANT || 'zarinpal', amount: toRial(amount), authority: auth_})});
      const j = await r.json().catch(() => ({}));
      if (![100, 101].includes(j?.data?.code)) {db.prepare("UPDATE store_orders SET status='failed' WHERE id=?").run(o.id); return back(false)}
      const now = Date.now();
      db.prepare("UPDATE store_orders SET status='paid' WHERE id=?").run(o.id);
      for (const i of items) {
        db.prepare('INSERT OR IGNORE INTO owned VALUES(?,?,?)').run(o.uid, i.pid, now);
        db.prepare('INSERT INTO events(name, uid, pid, src, at) VALUES(?,?,?,?,?)').run('claim', o.uid, i.pid, 'zarinpal', now);
      }
      return back(true);
    },
  };
  return {routes, sandbox: SANDBOX};
}

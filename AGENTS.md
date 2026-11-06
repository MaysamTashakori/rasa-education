# AGENTS.md — رسا آموزش (Rasa Amozesh)

پلتفرم یادگیری گام‌به‌گام فارسی؛ Next.js نیست — Node خالص + SQLite. قبل از هر تغییر `docs/` و `docs/CHANGELOG.md` را بخوان و در همان کامیت به‌روز کن.

## اجرا
```bash
node apps/site/build.mjs && node apps/kids/build.mjs && node apps/planner/build.mjs   # dist/
PORT=8080 FIRST_USER_FOUNDER=1 node server/index.mjs                                  # API + static روی :8080
SITE_URL=https://rasa-prompt.ir node apps/site/build.mjs                              # sitemap با دامنه
```
Node ≥ 22.5 (`node:sqlite`). بدون وابستگی npm.

## قواعد ثابت
1. پول عدد صحیح **تومان** در دیتابیس؛ ریال فقط در `server/pay.mjs` هنگام ارسال به زرین‌پال (`toRial`).
2. محصول فقط از `content/store/catalog.json` seed می‌شود (`INSERT OR IGNORE` + backfill قیمت صفر)؛ ویرایش زنده در مرکز فرمان `/admin`.
3. `APP_URL` برای callback و لینک‌ها؛ هرگز `req` origin.
4. نقش founder فقط از `FOUNDER_LOGINS` در `/etc/rasa-education.env`؛ در توسعه `FIRST_USER_FOUNDER=1`.
5. همهٔ خروجی‌های ایجنت (`jobs`) پیش از انتشار در «صف تأیید» می‌مانند.
6. بدون تأیید مالک منتشر نمی‌شود؛ نام «رسا آموزش» تأیید شد (۱۶ آبان ۱۴۰۵) — `docs/17-name-candidates.md` فقط پیش‌نویس است.
7. دادهٔ کودک: حریم خصوصی در `/privacy`؛ هرگز فروش داده یا آموزش مدل.
8. اسرار فقط در `/etc/rasa-education.env`؛ هرگز در کد/کامیت.

## سرور (S1 = 5.9.89.137)
- کانتینر docker `rasa-education` → `127.0.0.1:8740`؛ داده در `/opt/rasa-education-data`؛ کد در `/opt/rasa-education` (git checkout).
- دیپلوی: `cd /opt/rasa-education && RASA_PORT=8740 ./deploy/deploy.sh` (git pull + ساخت مجدد کانتینر).
- **دامنه:** `rasa-prompt.ir` و `www` و `prompt.5-9-89-137.sslip.io` در nginx به 8740 می‌رسند (از ۶ نوامبر ۲۰۲۶ به‌جای رسا پرامت — دستور مالک). رسا پرامت هنوز روی 8040 زنده است؛ بازگشت = برگرداندن `proxy_pass` به 8040 (بکاپ: `sites-available/rasa-prompt.pre-edu-*`).
- `edu.5-9-89-137.sslip.io` همان اپ را سرو می‌کند.
- env: `APP_URL=https://rasa-prompt.ir`, `ZARINPAL_SANDBOX=1`, `FOUNDER_LOGINS=...`. برای پرداخت واقعی `ZARINPAL_MERCHANT` لازم است.

## ساختار
| مسیر | کار |
|---|---|
| `server/index.mjs` | HTTP سرور، auth، session، SQLite اصلی |
| `server/store.mjs` | کاتالوگ، خرید، کتابخانه، تلاش‌ها، نظرها، raw file routes |
| `server/admin.mjs` | مرکز فرمان: CRM، تیکت، کمپین، ۱۹ ایجنت، ممیزی |
| `server/pay.mjs` | زرین‌پال v4 (request/callback/verify) |
| `server/bots.mjs` | ربات بله/تلگرام |
| `apps/site/` | ویترین + پروفایل + مرکز فرمان (SPA، `src/site.js`) |
| `apps/kids/` | سامانهٔ کلاس دوم | `apps/planner/` | برنامه‌ریز |
| `content/store/` | `catalog.json` محصولات، `paths.json` مسیرها، `pricing.json` پلن‌ها |
| `docs/` | اسناد زنده؛ `docs/CHANGELOG.md` اجباری |

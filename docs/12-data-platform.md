# سکوی داده
> وضعیت: پیشنهاد پذیرفته (ADR 0006) · آخرین بازبینی: ۱۵ آبان ۱۴۰۵

## انتخاب
| لایه | فناوری | چرا |
|---|---|---|
| دیتابیس اصلی | **PostgreSQL 16** | تراکنش کامل، JSONB برای محتوای منعطف، RLS برای جداسازی مشتری‌ها، بالغ و رایگان |
| جست‌وجوی معنایی | **pgvector** (افزونهٔ Postgres) | جست‌وجوی جزوه‌ها و حافظهٔ ایجنت‌ها بدون سرویس جدا |
| جست‌وجوی متنی | Postgres FTS + `pg_trgm` | جست‌وجوی فارسی و غلط‌تایپی |
| فایل‌ها | **MinIO** (S3-سازگار) | بسته‌های جزوه، PDF، تصاویر؛ قابل انتقال به هر S3 ایرانی |
| صف و زمان‌بندی | جدول `jobs` در Postgres (`SKIP LOCKED`) | یک سرویس کمتر؛ در صورت نیاز بعداً Redis |
| تحلیل | View و Materialized View در Postgres | بعداً در صورت حجم بالا: ClickHouse |
| آفلاین کاربر | IndexedDB + همگام‌سازی نسخه‌دار | کار بدون اینترنت |
| حالت توسعه/تک‌سرور | SQLite (فعلی) | مسیر مهاجرت با همان schema |

## چندمستأجری (SaaS)
- هر ردیف داده `tenant_id` دارد: «خانواده‌ها» یک مستأجر عمومی و هر مدرسه/آموزشگاه یک مستأجر جدا.
- **Row-Level Security:** `CREATE POLICY tenant_isolation USING (tenant_id = current_setting('app.tenant')::uuid)`.
- سرور در شروع هر درخواست `SET LOCAL app.tenant` و `app.user` را تنظیم می‌کند.

## مدل دادهٔ هسته
```
tenants(id, kind[public|school|creator_org], name, plan, settings jsonb)
users(id, tenant_id, login, name, pass_hash, status)
roles(user_id, tenant_id, role)                 -- child, parent, student, teacher, creator, moderator, support, admin, founder
profiles(id, user_id, kind[child|student], grade, avatar, prefs jsonb)
families(parent_id, profile_id)
products(id, creator_id, kind[booklet|interactive|exam|report|planner|bundle], grade, subject,
         title, summary, price, status[draft|review|published|archived], manifest jsonb, search tsvector, embedding vector(1536))
product_versions(product_id, ver, file_key, preview_key, checksum, created)
orders(id, user_id, total, status) · order_items(order_id, product_id, price)
library(user_id, product_id, source[free|purchase|gift|school])
attempts(id, profile_id, product_id, started, finished, score, data jsonb)   -- کارنامه از اینجا ساخته می‌شود
events(id, tenant_id, user_id, name, props jsonb, at)                       -- قیف و تحلیل
plans(profile_id, week, data jsonb, ver)                                     -- برنامه‌ریز
notifications(id, user_id, channel[bale|telegram|web], body, status, at)
agents(id, name, level, enabled, charter jsonb) · jobs(id, agent_id, kind, payload, status, run_at)
approvals(id, job_id, preview jsonb, status, decided_by, note)
audit_log(id, actor, action, target, data jsonb, at)                         -- append-only
```

## بکاپ و بازگردانی
- `pg_dump` روزانه و WAL archiving (بازگردانی به هر لحظه)، رمزگذاری با `age`، نگهداری خارج از سرور (حداقل دو مقصد).
- MinIO: نسخه‌برداری از bucket.
- آزمون بازگردانی خودکار هفتگی روی سرور جدا (وظیفهٔ «مسئول داده و بکاپ»).

## مسیر مهاجرت از SQLite
1. schema مشترک + لایهٔ دسترسی داده (`server/db/*.mjs`) با دو پیاده‌سازی SQLite/Postgres.
2. کانتینر Postgres + MinIO کنار سرویس فعلی (docker compose).
3. اسکریپت انتقال داده و اجرای موازی برای اعتبارسنجی.
4. تغییر پیش‌فرض به Postgres؛ SQLite فقط برای توسعهٔ محلی.

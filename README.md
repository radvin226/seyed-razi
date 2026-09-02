# بک‌اند کامل مدرسه سید رضی

این پوشه برای Render + PostgreSQL آماده است.

1. آن را در یک GitHub Repository جداگانه قرار دهید.
2. در Render گزینه New -> Blueprint را بزنید.
3. Repository را انتخاب کنید.
4. `render.yaml` سرویس و دیتابیس را می‌سازد.
5. `ADMIN_PASSWORD` را تعیین کنید.
6. بعد از Deploy آدرس `https://...onrender.com` را بردارید.
7. آن آدرس را در `github-pages/api-config.js` قرار دهید.

API:
- GET /api/health
- GET /api/site
- POST /api/admin/login
- GET /api/admin/me
- PUT /api/admin/site
- PUT /api/admin/password

نام کاربری اولیه: admin
رمز اولیه: مقدار ADMIN_PASSWORD

دقت: فایل `.env` و رمزهای واقعی را داخل GitHub قرار ندهید.

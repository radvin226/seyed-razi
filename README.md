# اجرای سایت مدرسه سید رضی در Laragon

این نسخه برای Laragon + MySQL آماده شده است.

## 1) پیش‌نیاز
- Laragon را اجرا کنید و MySQL را Start کنید.
- Node.js روی ویندوز نصب باشد.

## 2) نصب
پوشه پروژه را مثلاً در `C:\laragon\www\seyed-razi` قرار دهید.

در CMD/PowerShell:

    cd C:\laragon\www\seyed-razi
    npm install
    npm start

سپس مرورگر:

    http://localhost:3000

## 3) تست بک‌اند

    http://localhost:3000/api/health

باید JSON با `ok: true` ببینید.

## 4) پنل مدیریت
روی «مدیریت» کلیک کنید.
نام کاربری: `admin`
رمز اولیه: `123456`

بعد از ورود، رمز را از پنل عوض کنید.

## نکته
این پروژه خودش دیتابیس `seyed_razi` را در MySQL می‌سازد و جدول‌ها را نیز خودکار ایجاد می‌کند؛ نیازی به phpMyAdmin برای ساخت جدول نیست.

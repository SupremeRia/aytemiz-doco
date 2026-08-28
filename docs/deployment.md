# Deployment ve alan adı kontrol listesi

## Repository disiplini

- Development: `SupremeRia/aytemiz-doco`
- Netlify production: `SupremeRia/aytemiz-doco-473da`
- Production repository yalnızca faz tamamlandığında ve typecheck, ESLint, test, build ve Supabase lint başarılı olduğunda güncellenir.
- Netlify ayarları ve DNS kayıtları kullanıcı onayı olmadan değiştirilmez.

## Mevcut alan adı durumu

28 Ağustos 2026 kontrolünde `regue.xyz`, duraklatılmış Vercel deployment'ına yönlenmektedir. Çalışan Netlify site adresi `https://poetic-capybara-3b3c3c.netlify.app` şeklindedir. Bu kayıt yalnızca mevcut durumu belgeler; Faz 5 DNS değişikliği yapmaz.

## İleride Netlify'a geçiş

1. Netlify Domain management içinde `regue.xyz` production domain olarak eklenir.
2. Netlify'ın o anda gösterdiği doğrulama ve DNS hedefleri kaydedilir.
3. Domain kayıt kuruluşunda eski Vercel A/CNAME kayıtları, yalnızca kullanıcı onayından sonra Netlify'ın verdiği güncel kayıtlarla değiştirilir.
4. DNS yayılımından sonra hem kök domain hem `www` HTTPS üzerinden doğrulanır.
5. Supabase Authentication → URL Configuration içindeki Site URL ve Redirect URLs güncellenir.

Netlify'ın gösterdiği hedefler zamanla değişebileceği için DNS değerleri bu dokümana sabitlenmemiştir.

## Supabase manuel güvenlik kontrolü

- Supabase Dashboard → Authentication → Password Security
- **Leaked Password Protection** açık olmalı.
- Bu ayar uygulama kodundan veya migration'dan bypass edilmez.

## Web Push environment

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: yalnızca public VAPID anahtarı
- `VAPID_PRIVATE_KEY`: server-only
- `VAPID_SUBJECT`: `mailto:` veya HTTPS iletişim adresi
- `SUPABASE_SERVICE_ROLE_KEY`: yalnızca server-only push dağıtımı

Private VAPID ve service-role değerleri hiçbir `NEXT_PUBLIC_` değişkenine yazılmaz.

## Faz 6 production checkpoint

- Devir teslim, checklist, arıza/bakım ve günlük rapor route’ları Faz 5 ile aynı production checkpoint içinde yayınlanmalıdır.
- Service role yalnız server-side yüksek değerli push dağıtımında kullanılır. Normal işlemler authenticated oturum, permission engine ve RLS üzerinden çalışır.
- Production push öncesinde typecheck, lint, tüm testler, build, DB lint, advisor ve migration alignment yeniden doğrulanmalıdır.

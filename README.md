# Aytemiz Doco

Aytemiz DOCO istasyonları için mobil öncelikli, installable PWA ekip ve istasyon yönetimi foundation'ı. Next.js frontend ile Supabase backend birbirinden ayrıdır; production domain kodda sabit değildir.

## Gereksinimler

- Node.js 22+
- npm
- Supabase Free Plan projesi

## Local Development

```bash
npm install
copy .env.example .env.local
npm run dev
```

Supabase değişkenleri yoksa arayüz demo istasyonlarıyla açılır; auth işlemleri bilgi mesajı gösterir.

## Supabase Kurulumu

Supabase Dashboard'da yeni bir Free Plan projesi açın. Authentication > URL Configuration bölümünde Site URL ve redirect URL'leri local/production adreslerinize göre tanımlayın. Public registration açık, e-posta doğrulaması ihtiyacınıza göre açık olmalıdır.

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
```

Yalnızca public URL ve anon/publishable key tarayıcıya verilir. `service_role` veya secret key hiçbir `NEXT_PUBLIC_` değişkenine yazılmamalıdır.

## Database Migration

Supabase CLI ile projeye bağlanıp migration'ı uygulayın:

```bash
npx supabase login
npx supabase link --project-ref PROJECT_REF
npx supabase db push
```

Alternatif olarak `supabase/migrations/*_foundation.sql` içeriğini SQL Editor'da bir kez çalıştırabilirsiniz. Yeni Supabase projelerinde public tablolar Data API'ye otomatik açılmayabilir; migration gerekli `GRANT` komutlarını açıkça içerir.

## Seed Data

```bash
npx supabase db reset
```

Uzak projede `supabase/seed.sql` içeriğini SQL Editor'da çalıştırın. Seed; 9 sistem rolü, 8 başlangıç istasyonu ve 31 sistem permission'ı ekler. Tekrar çalıştırılabilir.

## İlk OP Hesabının Oluşturulması

1. Uygulamadan normal kayıt olun; hesap `pending` kalır.
2. Supabase SQL Editor'da e-posta adresini değiştirerek çalıştırın:

SQL Editor'da veritabanı sahibi olarak yalnızca OP bulunmayan yeni kurulumda çalıştırın:

```sql
select private.bootstrap_first_operator(
  (select id from public.profiles where lower(email) = lower('ilk.op@ornek.com'))
);
```

Fonksiyon istemci rollerine kapalıdır, yalnızca ilk OP için çalışır ve açık bir `bootstrap` audit kaydı üretir. E-posta adresine bağlı otomatik ayrıcalık ataması yoktur.

İlk kayıt otomatik OP olmaz. İlk bootstrap'tan sonra OP ekleme/kaldırma yalnızca mevcut OP üzerinden yapılabilir. Database trigger'ı son aktif OP'nin kaldırılmasını engeller ve tüm değişiklikleri audit log'a yazar.

## Rol ve Permission Sistemi

Roller database kaydıdır; UI Türkçe ad, authorization katmanı unique slug kullanır. `role_permissions` varsayılan izinleri, `user_permissions` kullanıcı istisnalarını taşır. `station_id = null` global; dolu olduğunda istasyon scope'udur. Kullanıcı seviyesindeki `granted=false`, rol allow değerinden önceliklidir. OP bütün kontrolleri geçer ve normal permission değildir.

Merkezi SQL sırası: OP > kullanıcı explicit deny > kullanıcı allow > rol allow > red. TypeScript tarafındaki `can()` helper'ı UI kararlarını aynı sırayla verir; asıl güvenlik RLS'dedir.

## İstasyon Yönetimi

İstasyonlar dinamik `stations` kayıtlarıdır. Kullanıcı-istasyon ilişkisi many-to-many `user_station_assignments` üzerinden kurulur. `regions` ve nullable `region_id` ilerideki bölge kapsamı için hazırdır.

## Vercel Deployment

Repository'yi Vercel'e bağlayın, iki environment variable'ı Preview ve Production ortamlarına ekleyin, deploy edin. Sonra özel domain'i Vercel üzerinden bağlayın ve Supabase Auth redirect URL listesine ekleyin. Kodda production URL bulunmaz.

Güncel production repository disiplini, `regue.xyz` durumu, ilerideki Netlify DNS adımları, Web Push environment değişkenleri ve manuel Supabase güvenlik kontrolü için [deployment kontrol listesine](docs/deployment.md) bakın.

## PWA Kurulumu

Manifest, standalone modu, tema rengi, placeholder SVG ikon ve service worker hazırdır. Service worker yalnızca aynı origin'deki statik asset'leri cache'ler; oturumlu sayfalar, gezinme cevapları ve API verileri cache'e alınmaz. Production'da HTTPS altında kurulum yapılabilir.

`public/icon.svg` geçici uygulama simgesidir; resmi Aytemiz logosu değildir. Lisanslı kurumsal asset sağlanmadan resmi logo gibi kullanılmamalıdır.

## Android Ana Ekrana Ekleme

Chrome'da siteyi açın, menüden **Uygulamayı yükle** veya **Ana ekrana ekle** seçin.

## iPhone Ana Ekrana Ekleme

Safari'de siteyi açın, **Paylaş** > **Ana Ekrana Ekle** yolunu izleyin. iOS PWA kurulumu Safari üzerinden yapılır.

## Security Notes

- Her public tabloda RLS açıktır ve rol grant'leri migration içinde daraltılmıştır.
- Station tabloları `private.can_access_station()` ile izole edilir.
- `private.is_op()` ve `private.has_permission()` security-definer fonksiyonları exposed olmayan şemadadır, boş search path kullanır ve yalnızca authenticated role çalıştırma izni verir.
- Kullanıcıların kendi rol, istasyon, permission veya OP kaydını değiştiren bir policy yoktur.
- Audit log'a client write grant/policy verilmez; güvenilir trigger'lar ekler.
- Soft delete alanları profile kaydını audit için korur. Auth hard delete ayrı ve secret server-side işlem gerektirir; foundation buna bilerek public endpoint eklemez.
- Proxy oturumu yeniler ve kaba route koruması sağlar; yetkilendirme her zaman RLS'de tekrar uygulanır.

## Güncel modüller

Çalışan ekranlar login/register, dashboard, istasyon alanları, görevler, operasyon fotoğrafları, duyurular, bildirim merkezi, genel ekip sohbeti, private dosyalar, kurumsal haberler, yönetim ve kullanıcıya bağlı çevrimdışı taslak altyapısını kapsar.

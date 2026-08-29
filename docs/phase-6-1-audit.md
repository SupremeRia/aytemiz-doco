# Faz 6.1 — Sistem Sağlığı, Performans ve Kod Temizliği

Tarih: 2026-08-29  
Başlangıç HEAD: `17a33bf`  
Kapsam: development repository; production repository, Netlify yapılandırması ve deploy akışı değiştirilmedi.

## Yönetici özeti

Canlı sitenin zaman zaman hiç açılmamasının doğrulanmış ana nedeni uygulama service worker'ı değil, Netlify production deploy zinciridir. Son production deploy `6a92da403171b900081e0fc5` build aşamasında başarısız olmuş, deploy ve sonraki aşamalar atlanmıştır. Canlı alan adı daha önce `Deployment Paused` sonucu vermiştir. Bu nedenle production üzerinde uygulama TTFB/LCP ölçmek anlamlı değildir.

Uygulama tarafındaki en önemli performans problemi aynı server render içinde tekrar eden auth/profile/station sorguları ve haber kapakları için N+1 signed URL çağrılarıydı. Bunlar request-scope React `cache()` ve bucket başına `createSignedUrls()` ile giderildi. Global veya kullanıcılar arası cache eklenmedi; RLS korunuyor.

## Bulgular ve önem dereceleri

### KRİTİK

- Netlify production deploy başarısız; canlı sürüm güncellenemiyor. Build adımı başarısız, deploying/cleanup/post-processing atlanmış. Bu fazda retry veya ayar değişikliği yapılmadı.
- Production erişimi platform seviyesinde duraklatılmış görünüyor. Bu, “bazen bağlanmıyor” şikâyetini uygulama kodundan daha doğrudan açıklıyor.

### YÜKSEK

- `src/lib/data.ts` Supabase environment eksikken demo kullanıcı ve istasyon gösterebiliyordu. Production yanlış yapılandırmasını gizleyen bu davranış kaldırıldı; sistem artık fail-safe davranıyor.
- Veri erişim hatalarının boş veri gibi gösterildiği kritik dashboard akışları vardı. Güvenli hata sınıflandırması ve kullanıcıya raw Supabase mesajı göstermeyen retry ekranı eklendi.
- Dashboard haber kapaklarında kayıt başına bir signed URL network çağrısı vardı. Tekil N+1 çağrılar bucket başına toplu çağrıya indirildi.

### ORTA

- Supabase Performance Advisor dört adet “Multiple Permissive Policies” uyarısı veriyor: `public.regions`, `public.role_permissions`, `public.system_admins`, `public.user_permissions`. Mevcut sorgu süreleri düşük olduğu ve policy davranışı güvenlik açısından hassas olduğu için bu fazda ölçümsüz migration eklenmedi.
- `announcements.ts`, `files.ts` ve `operations.ts` içinde benzer signed URL N+1 kalıpları bulunuyor. Dashboard açılış yolunda değiller; sonraki ölçümlü refactor turuna bırakıldı.
- `tasks.ts`, `phase6.ts` ve bazı yardımcı modüller bazı Supabase hatalarını boş sonuç olarak döndürüyor. Error/empty ayrımı dashboard temelinde düzeltildi; domain geneline kontrollü yayılım teknik borç olarak kaldı.
- Her korumalı request'te proxy `getClaims()` çalıştırıyor. Bu, auth refresh ve route koruması için gerekli; kaldırılmadı. Aynı RSC request'indeki `getUser()` tekrarları ise memoize edildi.

### DÜŞÜK

- Test çalıştırıcısı package module tipi belirtilmediği için `MODULE_TYPELESS_PACKAGE_JSON` uyarısı üretiyor. Runtime davranışını değiştirmemek için bu fazda package tipine dokunulmadı.
- Beş kullanılmayan Next/Vercel starter SVG dosyası silindi.
- Beş küçük `remote_history_reconciliation` migration'ı geçmiş uzlaştırma kalıntısıdır. Uygulanmış migration geçmişi olduğu için değiştirilmedi veya silinmedi.

## 30 maddelik teslim özeti

1. **Supabase gerçek hataları:** Security ve Performance Advisor'da 0 error. Unified Logs varsayılan son 60 dakikada kayıt göstermedi. 24 saat/7 gün hizmet bazlı hata dağılımı dashboard UI kısıtı nedeniyle güvenilir şekilde dışarı alınamadı; kişisel/log payload verisi rapora alınmadı.
2. **Supabase warningleri:** Security: Leaked Password Protection Disabled (talimat gereği değiştirilmedi). Performance: dört multiple permissive policy uyarısı.
3. **Slow query listesi:** 18.92 s toplam maliyetin %50.9'u dashboard/metadata kaynaklı `pg_timezone_names` sorgusu (65 çağrı, ortalama 291 ms). Uygulama cron fonksiyonları: `publish_scheduled_news` ortalama 6 ms; `enqueue_task_due_notifications` ortalama 11 ms. Stations sorgusu ortalama 1 ms; `has_admin_access` ortalama 1 ms. En pahalı satırların çoğu Supabase dashboard schema introspection sorgularıydı.
4. **Eksik indexler:** Advisor error vermedi. Üretim verisinde güvenli EXPLAIN gerektiren, kanıtlanmış bir eksik index bulunmadı; tahmine dayalı index migration'ı eklenmedi.
5. **RLS performansı:** Dört permissive-policy uyarısı var. Mevcut kullanıcı sorguları 1–11 ms bandında olduğundan acil bir performans darboğazı kanıtlanmadı.
6. **Auth problemleri:** Redirect loop kanıtı yok. Proxy her korumalı request'te `getClaims`, server data katmanı da `getUser` kullanıyor. Aynı render içindeki `getUser` çağrıları request-scope memoize edildi; cookie refresh davranışı korunuyor.
7. **Netlify log bulguları:** Deploy `6a92da403171b900081e0fc5`, commit `17a33bf`, production/main, build failed. Deploying ve sonraki aşamalar skipped. Önceki incelemede hata sınıfı “Exposed secrets detected / exit code 2” olarak saptanmıştı; bu turda log görüntüleyici satır içeriğini DOM'a taşımadı.
8. **Netlify runtime:** Bir `Next.js Server Handler` function mevcut. Log saklama 24 saat; function log ekranı sürekli Loading durumunda kaldığından 500/502/504 veya timeout kanıtı elde edilemedi. Başarılı yeni production olmadığı için yeni runtime değerlendirmesi yapılamıyor.
9. **Site yavaşlığının ana nedenleri:** platform/deploy duraklaması; dashboard'daki tekrarlı auth/profile çağrıları; haber signed URL N+1; tüm korumalı App Router sayfalarının dynamic SSR olması; Netlify function cold-start ihtimali.
10. **“Bazen bağlanmıyor” nedeni:** Kesin platform bulgusu başarısız/paused production zinciridir. Service worker navigation veya auth HTML'i cache'lemiyor; bu nedenle SW ana neden olarak dışlandı.
11. **Dashboard round-trip önce/sonra:** Statik çağrı grafiğinde önce yaklaşık `11 + haber sayısı` (8 haberle yaklaşık 19); sonra auth/profile memoization ve bucket batch ile yaklaşık `8 + bucket sayısı` (tipik tek bucket ile yaklaşık 9). Kazanç yaklaşık 10 network round-trip.
12. **Station round-trip önce/sonra:** Aynı render ağacındaki tekrar eden stations çağrısı request cache ile tek çağrıya indi; tipik alt modül akışında yaklaşık 1 çağrı tasarrufu. Root station zinciri zaten paralel çalışıyordu.
13. **TTFB önce/sonra:** Canlı site paused olduğu için karşılaştırılabilir production TTFB yok. Yerel production server ölçümü: `/` cold 252.5 ms, warm ortalama 14.0 ms; `/login` cold 12.1 ms, warm 3.8 ms; authsuz `/dashboard` 307 redirect cold 84.8 ms, warm 3.8 ms.
14. **LCP önce/sonra:** Canlı uygulama erişilebilir olmadığı ve authenticated production testi yapılamadığı için güvenilir LCP üretilmedi. Tahmin raporlanmadı.
15. **Initial JS önce/sonra:** Current build `.next/static/chunks`: 25 dosya, toplam 1087.5 KiB (sıkıştırılmamış disk boyutu), en büyük chunk 246.6 KiB. Karşılaştırılabilir temiz production baseline olmadığı için uydurma “önce” değeri verilmedi. CSS chunk 41.1 KiB.
16. **Düzeltilen N+1:** Dashboard `listNews` cover URL üretimi kayıt başına çağrıdan bucket başına `createSignedUrls` çağrısına dönüştürüldü; path'ler dedupe ediliyor.
17. **Spagetti kod:** Signed URL mantığı dört domain dosyasında tekrar ediyor; bazı phase dosyaları sıkıştırılmış tek satırlı kod; error handling standardı tutarsız; Supabase query boilerplate yaygın. En riskli dashboard yolu bu fazda sadeleştirildi.
18. **Refactor edilen dosyalar:** `src/lib/data.ts`, `src/lib/news.ts`, `src/lib/supabase/server.ts`, `src/components/app-nav.tsx`; yeni `src/lib/observability.ts`, `src/lib/storage/batch-paths.ts`, `src/app/error.tsx`.
19. **Silinen dead code:** Demo profile/stations fallback; kullanılmayan `next.svg`, `vercel.svg`, `globe.svg`, `window.svg`, `file.svg`.
20. **Büyük dosyalar:** TS/TSX >400 yok; SQL >1000 yok; component/server action >300 yok. En büyük TS `src/lib/admin-data.ts` 213 satır; en büyük SQL migration 164 satır. Satır eşiğine göre zorunlu bölme yapılmadı.
21. **Yeni migrationlar:** Yok. Uygulanmış migrationlar append-only kuralıyla korundu.
22. **Yeni testler:** News path batch/dedupe, Supabase env fail-safe, service worker navigation/auth bypass.
23. **Test toplamı:** 90/90 pass (başlangıçtaki 87 test korundu, 3 yeni test).
24. **DB lint:** Supabase Advisor 0 error. CLI denemesi yerel access token bulunmadığı için çalışmadı; bu eksiklik gizlenmedi.
25. **Build:** Next.js 16.3.3 production build pass; 17 static generation adımı tamamlandı.
26. **Migration alignment:** Dashboard salt-okunur sorgusuyla remote 24 migration doğrulandı; local 24 dosyanın ilk/son sürümü ve tam sıralı sürüm listesi remote ile eşleşiyor (`20260827184245`–`20260828222156`).
27. **Development HEAD:** `perf: complete phase 6.1 health audit` teslim commit'i; kesin hash teslim mesajında verilir.
28. **Working tree:** Commit sonrasında clean olarak doğrulandı.
29. **Production repository:** `SupremeRia/aytemiz-doco-473da` için hiçbir push yapılmadı.
30. **Netlify deploy:** Retry/redeploy/configuration değişikliği yapılmadı; yeni deploy tetiklenmedi.

## Mimari ve PWA notları

- Build çıktısında `/login`, `/register`, manifest ve not-found static; kullanıcıya özel sayfalar dynamic SSR. Dashboard/station verisinin static cache'e alınmaması doğru.
- Proxy static asset matcher dışlamalarıyla çalışıyor. Landing `/` proxy üzerinden dynamic işaretleniyor; auth kontrolü public rotada da token cookie doğrulamasına uğrayabilir. Bu maliyet ölçülmeden güvenlik davranışı değiştirilmedi.
- Service worker yalnız aynı origin CSS/JS/font/image varlıklarını cache'liyor. Navigation ve authorization header taşıyan istekler bypass ediliyor; eski cache activate aşamasında temizleniyor. Stale HTML/auth sayfası riski görülmedi.
- `web-push` yalnız server route/modül zincirinde; private VAPID ve service-role değişkenlerine `NEXT_PUBLIC_` prefix verilmemiştir. Client static çıktı üzerinde ayrıca isim bazlı secret taraması yapılmalıdır.

## Karar

**Production öncesi şu maddeler çözülmeli:**

1. Netlify başarısız build'in secret-scanning nedenini, değerleri ifşa etmeden giderip tek kontrollü production deploy gerçekleştirmek.
2. Canlı siteyi paused durumundan çıkarıp production TTFB/LCP/CLS/INP ve authenticated dashboard/station ölçümlerini gerçek ortamda tamamlamak.
3. Netlify function loglarının erişilebilir olduğu bir pencerede 500/502/504, timeout ve cold-start verisini doğrulamak.
4. Supabase CLI access token bağlantısını yenileyip `db lint --linked --level warning` çıktısını son checkpoint öncesi tekrar almak.
5. Dört permissive RLS policy uyarısını gerçek yük/EXPLAIN verisiyle ölçmek; ancak davranış eşdeğerliği test edilirse append-only migration ile birleştirmek.

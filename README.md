# Tenno Arşivi

Warframe için wiki tarzı, herkesin düzenleyebildiği bir hayran sitesi.

## Özellikler

- **Kategoriler:** Warframe'ler, Silahlar, Modlar, Yoldaşlar, Gezegenler, Fraksiyonlar, Rehberler
- **Bilgi kutusu (infobox):** her kategori kendi alanlarını gösterir (ör. silahta kritik şansı, modda polarite)
- **Markdown içerik** ve `[[Sayfa]]` / `[[Sayfa|metin]]` iç bağlantıları; olmayan sayfalara giden bağlantılar kırmızı görünür
- **Sürüm geçmişi:** her düzenleme yeni bir sürüm oluşturur; eski sürümler görüntülenebilir ve geri alınabilir
- **Tam metin arama** (SQLite FTS5); başlık birebir eşleşirse doğrudan sayfaya gider
- Otomatik içindekiler tablosu, son değişiklikler, tüm sayfalar, rastgele sayfa
- Basit JSON API: `/api/sayfalar`, `/api/sayfa/:slug`
- Koyu/açık tema ve mobil uyumlu arayüz

## Kurulum

Node.js **22.13+** gerekir (yerleşik `node:sqlite` kullanılıyor; ayrı veritabanı kurulumu yok).

```bash
npm install
npm start          # http://localhost:3000
npm run dev        # dosya değişince yeniden başlatır
npm test
```

İlk çalıştırmada `data/wiki.db` oluşturulur ve örnek sayfalar eklenir.
Ortam değişkenleri: `PORT` (varsayılan 3000), `WIKI_DB` (veritabanı dosya yolu).

## Proje yapısı

```
server.js            giriş noktası
src/app.js           Express rotaları
src/db.js            SQLite şeması ve veri erişimi (sayfalar, sürümler, arama)
src/categories.js    kategoriler ve infobox alanları — yeni kategori buraya eklenir
src/markdown.js      Markdown → güvenli HTML, wiki bağlantıları, içindekiler
src/views.js         HTML şablonları
src/seed.js          örnek içerik
public/style.css     stil
test/                testler (node:test)
```

## Yol haritası (öneriler)

- Kullanıcı hesapları ve düzenleme yetkileri / spam koruması
- Görsel yükleme
- İki sürüm arasında fark (diff) görüntüleme
- Silah/mod verilerini topluluk kaynaklarından içe aktarma
- Build (mod yapısı) planlayıcı

> Örnek içerikteki oyun değerleri güncellemelerle değişebilir; wiki üzerinden düzeltilmelidir.
> Warframe, Digital Extremes'in ticari markasıdır. Bu proje resmi değildir.

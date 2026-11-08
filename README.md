# Warframe Mastery Rehberi

Warframe'de mastery XP veren her şeyi (eşyalar, gezegen haritası, Steel Path, Intrinsic'ler) tarayan bir **mastery hesaplayıcısı** ve **"Legendary'ye en verimli yol" rehberi**.

> Arayüz Türkçe; eşya adları oyundaki gibi İngilizce.

## Durum

| Aşama | İçerik | Durum |
|---|---|---|
| 1 | Veri hattı ve mastery kuralları | ✅ |
| 2 | Hesaplayıcı (eşya listesi, işaretleme, MR/Legendary ilerlemesi) | ✅ |
| 3 | Efor modeli (edinme yöntemi, süre, drop olasılığı, engeller) | ✅ |
| 4 | Rehber / yol haritası | ✅ |
| 5 | Cilalama ve yayın | ✅ |

Güncel özet için **[data/rapor.md](data/rapor.md)** dosyasına bak.

## Hesaplayıcıyı çalıştırma

```bash
npm start            # http://localhost:8080 (PORT ile değiştirilebilir)
```

`web/` klasörü derleme gerektirmeyen statik bir sitedir; herhangi bir statik sunucuda (ör. GitHub Pages) yayınlanabilir.

- **Yol Haritası:** Mevcut ilerlemen ve seçtiğin hedef (MR veya Legendary) için en az aktif sürede hedefe ulaştıran sıralı rota. İçerik:
  - hedefe kalan XP, tahmini süre, adım sayısı ve ulaşılabilirlik
  - her ranka kaç saatte ulaşılacağı
  - "sıradaki 10 adım"
  - rank aşamalarına bölünmüş, aynı faaliyetten çıkan eşyaları birlikte gösteren gruplar (Market, Dojo laboratuvarı, satıcı, farm yeri, Kuva Lich…)

  Ayarlar: *platin harcamadan*, *sınırlı erişimlileri dahil et*, *kaynağı tahmini eşyaları dahil et*, *önce gezegen haritasını bitir* (yeni oyuncular için), ayrıca kişisel **seviye atlatma** ve **farm hızı** (×0,5 – ×2). Hız ayarları tüm süre tahminlerini değiştirir; geçerli varsayımlar "Bu rota nasıl hesaplanıyor?" bölümünde listelenir. Her adım tek tıkla tamamlandı olarak işaretlenebilir; rota anında güncellenir.
- **Eşyalar:** 820 eşya. Ara, kategoriye/duruma/erişime göre filtrele, sırala. Rank 40 eşyalarda kısmi ilerleme (R30–R40) seçilebilir. Görünen listeyi topluca işaretleme yapılabilir.
- **Gezegen Haritası:** XP veren görevler ve Junction'lar gezegen gezegen listelenir; normal ve Steel Path ayrı işaretlenir.
- **Intrinsic'ler:** Railjack ve Drifter ağaçlarında rank girilir.
- **Nasıl elde edilir?** Her eşyada edinme yöntemi, farm edilecek parçalar ve en verimli kaynakları (drop şansıyla), önkoşullar (MR, quest, syndicate rütbesi, klan, tüketilen eşyalar), tahmini aktif süre ve XP/saat. Verimliliğe veya süreye göre sıralanabilir, yönteme göre filtrelenebilir.
- **Özet:** Kaynak, kategori ve edinme yöntemi bazında kazanılan/kalan XP ve kalan eşyalar için tahmini süre.
- **Üst panel:** Mevcut MR/Legendary rank, sonraki ranka kalan XP, seçilen hedefe kalan XP ve hedefin erişilebilir olup olmadığı.
- **Kayıt:** İlerleme tarayıcıda (localStorage) saklanır. Dışa ve içe aktarma JSON dosyasıyla yapılır.

## Yayın (GitHub Pages)

`.github/workflows/pages.yml` her push'ta veriyi yeniden derler, derlenmiş verinin depodakiyle aynı olduğunu doğrular ve testleri çalıştırır. Varsayılan dala yapılan push'larda `web/` klasörünü GitHub Pages'e yayınlar. Yayını açmak için:

1. **Settings → Pages → Build and deployment → Source:** *GitHub Actions* seç.
   - Özel (private) depolarda Pages yalnızca GitHub Pro/Team/Enterprise planlarında kullanılabilir. Ücretsiz planda depoyu herkese açık yapmak gerekir.
2. **Settings → Secrets and variables → Actions → Variables:** `PAGES_ENABLED` adında, değeri `true` olan bir depo değişkeni ekle.
3. **Actions → "Test ve yayın" → Run workflow** ile çalıştır (veya varsayılan dala bir push yap).

Bu değişken ayarlanana kadar iş akışı yalnızca testleri çalıştırır.

## Veri hattı

```bash
npm install
npm run build:data   # data/raw → data/mastery-data.json + data/rapor.md
npm test

# Kaynakları wiki'den yeniden indirmek için (oyun güncellemesinden sonra):
NODE_USE_ENV_PROXY=1 npm run fetch   # proxy yoksa NODE_USE_ENV_PROXY gerekmez
npm run build:data
```

- **Hangi eşya ne kadar mastery verir:** [wiki.warframe.com](https://wiki.warframe.com) veri modülleri (`Module:Weapons/data/*`, `Module:Warframes/data`, `Module:Companions/data`, `Module:Missions/data`). Bunlar, wiki'nin "Total Mastery" tablosunda kullandığı filtrelerle okunur. Lua dosyaları [fengari](https://github.com/fengari-lua/fengari) ile çalıştırılır.
- **Nasıl elde edilir:** [@wfcd/items](https://github.com/WFCD/warframe-items) (resmi oyun verisinden üretilen topluluk paketi). İçerdikleri: üretim maliyeti ve süresi, bileşenler, drop olasılıkları, vault durumu.
- **Sınırlı erişimli eşyalar:** wiki'nin *Exclusive Mastery* ve *Hidden Mastery* sayfaları.
- **Klan araştırmaları:** wiki `Module:Research/data`.
- **Doğrulama:** Derleme sonunda her kategorinin adet ve XP değeri wiki'deki *Total Mastery* tablosuyla karşılaştırılır; uyuşmazlık derlemeyi durdurur.

### Efor modeli

`scripts/lib/acquisition.js` her eşyanın **nasıl elde edildiğini** sınıflandırır (öncelik sırasıyla): elle düzeltmeler (`data/acquisition-overrides.json`) → Exclusive Mastery grupları → Kuva Lich / Tenet / Technocyte Coda → klan Dojo araştırması (`Module:Research/data`) → WFCD drop konumları (relic, syndicate satıcısı, quest, bounty, görev, düşman) → Market fiyatı. Her sonucun bir güven düzeyi vardır (yüksek / orta / düşük).

`web/js/effort.js` bundan süre tahmini üretir:

- **Parça farmı:** Her parça için beklenen süresi en kısa kaynak seçilir. Aynı ödül tablosundan düşen parçalar kupon toplama formülüyle hesaplanır.
- **Kaynaklar:** Nadir kaynaklar birim başına sabit süreyle hesaplanır.
- **Seviye atlatma:** Forma ve gilding ek turları dahil edilir.

`web/js/planner.js` rotayı kurar. Eksik olan her şey (eşyalar, gezegen haritası ve Steel Path gezegen başına, Intrinsic rankları) bir adım olur. Her adımda o an yapılabilecekler arasından saat başına en çok XP veren seçilir. "Yapılabilir" şu demektir: MR şartı, o ana kadar toplanan XP ile karşılanır; Intrinsic rankları sırayla açılır; Steel Path normal harita bitince açılır. Sıfırdan başlayan bir oyuncu için senaryo karşılaştırması `data/rapor.md` dosyasındadır.

Tüm varsayımlar `DEFAULTS` nesnesinde toplanır ve `data/rapor.md`'de listelenir. Sonuçlar **tahmindir**; ölçülmüş değerler değildir.

Ham kaynaklar `data/raw/` altında saklanır. Böylece derleme çevrimdışı çalışır ve kaynak verideki her değişiklik git diff'inde görünür.

## Proje yapısı

```
web/index.html            hesaplayıcı arayüzü
web/js/mastery.js         mastery kuralları (rank eşikleri, eşya XP'si, Forma) — veri hattı ve arayüz ortak kullanır
web/js/progress.js        oyuncu ilerlemesi ve toplamlar (saf fonksiyonlar, Node'da test edilir)
web/js/effort.js          efor modeli ve varsayımlar (saf fonksiyonlar)
web/js/planner.js         rota planlayıcı (saf fonksiyonlar)
web/js/storage.js         localStorage, dışa/içe aktarma
web/js/app.js             arayüz
web/data/mastery.json     arayüz için sadeleştirilmiş veri (build:data üretir)
scripts/serve.js          bağımlılıksız statik sunucu
scripts/fetch-sources.js  wiki kaynaklarını data/raw/ altına indirir
scripts/build-data.js     kaynakları birleştirir, doğrular, çıktıları yazar
scripts/lib/lua.js        wiki Lua veri modüllerini JS nesnesine çevirir
scripts/lib/acquisition.js edinme yöntemi sınıflandırıcısı
data/acquisition-overrides.json  sınıflandırmaya elle düzeltmeler
scripts/lib/report.js     data/rapor.md üretir
data/mastery-data.json    derlenmiş veri (eşyalar, görevler, Intrinsic'ler)
test/                     node:test testleri
```

### `mastery-data.json` şeması (özet)

```jsonc
{
  "meta": { "generatedFrom": {...}, "totals": { "items", "starChart", "steelPath", "intrinsics", "all" } },
  "categories": { "primary": { "label": "Birincil silah", "perRank": 100, "gild": false }, ... },
  "items": [{
    "id": "kuva-bramma", "name": "Kuva Bramma", "category": "primary",
    "maxRank": 40, "mastery": 4000, "forma": 5, "gild": false, "masteryReq": 15,
    "exclusive": null,          // ya da { group, label, acquisition, impossible }
    "acquisition": { "tradable", "vaulted", "marketCost", "bpCost", "buildPrice", "buildTimeSec", "drops", "components" }
  }],
  "starChart": { "nodes": [{ "name", "planet", "type", "xp" }], "junctions": [...], "steelPathRepeats": true },
  "intrinsics": { "railjack": { "trees", "maxRank", "xpPerRank" }, "drifter": {...} }
}
```

## Oyun güncellemesinden sonra

```bash
NODE_USE_ENV_PROXY=1 npm run fetch   # wiki kaynaklarını yenile
npm install -D @wfcd/items@latest    # edinme verisini güncelle
npm run build:data                   # doğrulama hata verirse data/rapor.md'ye bak
npm test
```

Yeni eşyaların kaynağı bulunamazsa `data/rapor.md` içindeki "Düşük güvenli sınıflandırmalar" listesinde görünür. Bunlar `data/acquisition-overrides.json` dosyasına eklenerek düzeltilir.

## Lisans ve atıf

Wiki verileri [CC BY-SA](https://wiki.warframe.com) lisanslıdır. Warframe, Digital Extremes'in ticari markasıdır; bu proje resmi değildir.

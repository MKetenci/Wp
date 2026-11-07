# Warframe Mastery Rehberi

Warframe'de mastery XP veren her şeyi (eşyalar, gezegen haritası, Steel Path, Intrinsic'ler) tarayan bir **mastery hesaplayıcısı** ve **"Legendary'ye en verimli yol" rehberi**.

> Arayüz Türkçe; eşya adları oyundaki gibi İngilizce.

## Durum

| Aşama | İçerik | Durum |
|---|---|---|
| 1 | Veri hattı ve mastery kuralları | ✅ |
| 2 | Hesaplayıcı (eşya listesi, işaretleme, MR/Legendary ilerlemesi) | ✅ |
| 3 | Efor modeli (edinme yöntemi, süre, drop olasılığı, engeller) | ⏳ |
| 4 | Rehber / yol haritası | ⏳ |
| 5 | Cilalama ve yayın | ⏳ |

Güncel özet için **[data/rapor.md](data/rapor.md)** dosyasına bak.

## Hesaplayıcıyı çalıştırma

```bash
npm start            # http://localhost:8080 (PORT ile değiştirilebilir)
```

`web/` klasörü derleme gerektirmeyen statik bir sitedir; herhangi bir statik sunucuda (ör. GitHub Pages) yayınlanabilir.

- **Eşyalar:** 820 eşya. Ara, kategoriye/duruma/erişime göre filtrele, sırala. Rank 40 eşyalarda kısmi ilerleme (R30–R40) seçilebilir. Görünen listeyi topluca işaretleme yapılabilir.
- **Gezegen Haritası:** XP veren görevler ve Junction'lar gezegen gezegen listelenir; normal ve Steel Path ayrı işaretlenir.
- **Intrinsic'ler:** Railjack ve Drifter ağaçlarında rank girilir.
- **Özet:** Kaynak ve kategori bazında kazanılan ve kalan XP.
- **Üst panel:** Mevcut MR/Legendary rank, sonraki ranka kalan XP, seçilen hedefe kalan XP ve hedefin erişilebilir olup olmadığı.
- **Kayıt:** İlerleme tarayıcıda (localStorage) saklanır. Dışa ve içe aktarma JSON dosyasıyla yapılır.

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
- **Doğrulama:** Derleme sonunda her kategorinin adet ve XP değeri wiki'deki *Total Mastery* tablosuyla karşılaştırılır; uyuşmazlık derlemeyi durdurur.

Ham kaynaklar `data/raw/` altında saklanır. Böylece derleme çevrimdışı çalışır ve kaynak verideki her değişiklik git diff'inde görünür.

## Proje yapısı

```
web/index.html            hesaplayıcı arayüzü
web/js/mastery.js         mastery kuralları (rank eşikleri, eşya XP'si, Forma) — veri hattı ve arayüz ortak kullanır
web/js/progress.js        oyuncu ilerlemesi ve toplamlar (saf fonksiyonlar, Node'da test edilir)
web/js/storage.js         localStorage, dışa/içe aktarma
web/js/app.js             arayüz
web/data/mastery.json     arayüz için sadeleştirilmiş veri (build:data üretir)
scripts/serve.js          bağımlılıksız statik sunucu
scripts/fetch-sources.js  wiki kaynaklarını data/raw/ altına indirir
scripts/build-data.js     kaynakları birleştirir, doğrular, çıktıları yazar
scripts/lib/lua.js        wiki Lua veri modüllerini JS nesnesine çevirir
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

## Lisans ve atıf

Wiki verileri [CC BY-SA](https://wiki.warframe.com) lisanslıdır. Warframe, Digital Extremes'in ticari markasıdır; bu proje resmi değildir.

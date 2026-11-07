# Mastery veri raporu

> Bu dosya `npm run build:data` tarafından otomatik üretilir; elle düzenleme.
> Kaynak: wiki.warframe.com (Update 42.0 (2026-03-25), indirildi: 2026-11-07) ve @wfcd/items 1.1276.50.

## Özet

| Senaryo | Toplam XP | Ulaşılabilecek en yüksek rank | Açıklama |
|---|---:|---|---|
| Oyundaki her şey | 3.225.138 | **L6** | Founders dahil, kuramsal üst sınır |
| Founders hariç | 3.213.138 | **L6** | Bugün elde edilebilecek her şey (bir kısmı takas veya etkinlik gerektirir) |
| Hiçbir exclusive olmadan | 2.715.138 | **L3** | Yalnızca her zaman açık kaynaklar (drop, Market, araştırma, itibar vb.) |

- Exclusive eşyalar olmadan **L3** mümkün. L4 için 124.862 XP daha gerekir; bu fark Prime Vault, Baro veya etkinlik eşyalarıyla kapanır.
- Founders eşyaları (12.000 XP) artık elde edilemez.

## Rank eşikleri

| Rank | Gereken toplam XP |
|---|---:|
| MR 10 | 250.000 |
| MR 20 | 1.000.000 |
| MR 25 | 1.562.500 |
| MR 28 | 1.960.000 |
| MR 29 | 2.102.500 |
| MR 30 | 2.250.000 |
| L1 | 2.397.500 |
| L2 | 2.545.000 |
| L3 | 2.692.500 |
| L4 | 2.840.000 |
| L5 | 2.987.500 |
| L6 | 3.135.000 |

Formül: MR *n* için 2.500 × n²; MR30 sonrası her Legendary rank +147.500.

## Kaynağa göre dağılım

| Kaynak | XP | Pay |
|---|---:|---:|
| Eşyalar (silah, Warframe, yoldaş, araç) | 3.035.000 | %94.1 |
| Gezegen haritası (169 görev + 13 Junction) | 27.569 | %0.9 |
| Steel Path (aynı görevler tekrar) | 27.569 | %0.9 |
| Railjack + Drifter Intrinsic'leri | 135.000 | %4.2 |

## Kategoriler

| Kategori | Adet | XP | Rank 40 / Gilding |
|---|---:|---:|---|
| Warframe | 119 | 714.000 |  |
| Birincil silah | 196 | 612.000 | 24 adet rank 40 |
| İkincil silah | 148 | 458.000 | 14 adet rank 40 |
| Yakın dövüş silahı | 225 | 687.000 | 12 adet rank 40 |
| Zaw | 11 | 33.000 | gilding gerekli |
| Kitgun | 6 | 18.000 | gilding gerekli |
| Amp | 9 | 27.000 | gilding gerekli |
| Archwing | 5 | 30.000 |  |
| Arch-gun | 20 | 62.000 | 2 adet rank 40 |
| Arch-melee | 8 | 24.000 |  |
| Necramech | 2 | 16.000 | 2 adet rank 40 |
| K-Drive | 5 | 30.000 |  |
| Plexus | 1 | 6.000 |  |
| Sentinel | 17 | 102.000 |  |
| Sentinel silahı | 21 | 63.000 |  |
| Hound silahı | 3 | 9.000 |  |
| Kubrow | 6 | 36.000 |  |
| Kavat | 5 | 30.000 |  |
| Predasite | 3 | 18.000 | gilding gerekli |
| Vulpaphyla | 3 | 18.000 | gilding gerekli |
| MOA | 4 | 24.000 | gilding gerekli |
| Hound | 3 | 18.000 |  |
| **Toplam** | **820** | **3.035.000** | |

## Exclusive (sınırlı erişimli) eşyalar

| Grup | Adet | XP |
|---|---:|---:|
| Prime Vault — takas veya Prime Resurgence | 83 | 345.000 |
| Baro Ki'Teer (Void Trader) | 32 | 99.000 |
| Etkinlik ödülü | 11 | 33.000 |
| Günlük giriş ödülü (Daily Tribute) | 4 | 12.000 |
| Founders paketi — artık elde edilemez | 3 | 12.000 |
| Nightwave / özel yöntem | 2 | 6.000 |
| Market'ten kaldırıldı (nadir etkinlik) | 1 | 3.000 |

## Veri kapsamı

- Edinme verisi (WFCD) eşleşen eşya: **818 / 820**
- Drop verisi olan eşya: 642
- Market'te platin veya kredi fiyatı olan eşya: 361
- Eşleşmeyenler: Dark Split-Sword (Heavy Blade), Plexus

### Bilinen sınırlamalar (sonraki aşamalarda ele alınacak)

- Edinme **yöntemi** henüz sınıflandırılmadı. Örneğin Kuva Lich, Sister, syndicate itibarı, klan Dojo araştırması veya görev (quest) ödülü olan eşyalarda drop listesi boş görünür. Bu, 3. aşamada (efor modeli) eklenecek.
- Bileşen drop listeleri ham kaynakları da (ör. Alloy Plate) içeriyor; efor modeli bunları ayrıca ele alacak.
- Platin fiyatları (warframe.market) henüz yok.
- "Exclusive" sınıflandırması wiki'nin Exclusive Mastery sayfasına dayanır. Prime Vault eşyaları takasla ya da Prime Resurgence ile her zaman alınabilir; bu yüzden "Hiçbir exclusive olmadan" senaryosu en katı senaryodur.

## Doğrulama (wiki "Total Mastery" tablosu)

| Satır | Bizim adet | Bizim XP | Wiki XP | Durum |
|---|---:|---:|---:|---|
| Warframes | 119 | 714.000 | 714.000 | ✓ |
| Primaries | 196 | 612.000 | 612.000 | ✓ |
| Secondaries | 148 | 458.000 | 458.000 | ✓ |
| Melee (including Zaws) | 236 | 720.000 | 720.000 | ✓ |
| Kitguns | 6 | 18.000 | 18.000 | ✓ |
| Sentinels | 17 | 102.000 | 102.000 | ✓ |
| Sentinel Weapons | 24 | 72.000 | 72.000 | ✓ |
| Robotic Weapons | 21 | 63.000 | 63.000 | ✓ |
| Hound Weapons | 3 | 9.000 | 9.000 | ✓ |
| Companions | 25 | 150.000 | 150.000 | ✓ |
| Kubrows | 6 | 36.000 | 36.000 | ✓ |
| Kavats | 5 | 30.000 | 30.000 | ✓ |
| Predasites | 3 | 18.000 | 18.000 | ✓ |
| Vulpaphylas | 3 | 18.000 | 18.000 | ✓ |
| MOAs | 4 | 24.000 | 24.000 | ✓ |
| Hounds | 3 | 18.000 | 18.000 | ✓ |
| Plexus | 1 | 6.000 | 6.000 | ✓ |
| Archwings | 5 | 30.000 | 30.000 | ✓ |
| Archguns | 20 | 62.000 | 62.000 | ✓ |
| Archmelees | 8 | 24.000 | 24.000 | ✓ |
| Amps | 9 | 27.000 | 27.000 | ✓ |
| K-Drives | 5 | 30.000 | 30.000 | ✓ |
| Necramechs | 2 | 16.000 | 16.000 | ✓ |
| Normal Missions (nodes + Junctions) | — | 27.569 | 27.569 | ✓ |
| The Steel Path (nodes + Junctions) | — | 27.569 | 27.569 | ✓ |
| Railjack Intrinsics | 50 | 75.000 | 75.000 | ✓ |
| Drifter Intrinsics | 40 | 60.000 | 60.000 | ✓ |
| Total | — | 3.225.138 | 3.225.138 | ✓ |

### Uyarılar

- Exclusive Mastery sayfası, "Prime Vault" grubu: elle yazılmış toplam 80 eşya diyor, listede 83 satır var (satırlar esas alındı).
- Wiki'nin "Minus Exclusives" satırı 2.799.138 XP diyor; Exclusive Mastery sayfasındaki güncel listeye göre 2.715.138 XP (fark: elle girilmiş eski değerler).

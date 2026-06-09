# 📈 Dokumentasi Rumus Swing Score

> Dokumen ini menjelaskan secara lengkap rumus matematika, bobot, dan logika penilaian **Swing Score** yang digunakan oleh sistem Bot Saham.
> Implementasi dapat ditemukan di: [`server/src/services/technical-analysis.ts`](./server/src/services/technical-analysis.ts)

---

## 🎯 Apa itu Swing Score?

**Swing Score** adalah nilai komposit antara **0–100** yang mengukur seberapa ideal kondisi teknikal sebuah saham untuk melakukan *swing trading* (posisi beberapa hari hingga beberapa minggu).

| Rentang Skor | Interpretasi             |
|:------------:|--------------------------|
| **≥ 70**     | ✅ Kondisi ideal swing    |
| **50–69**    | 🟡 Cukup, perlu selektif |
| **< 50**     | 🔴 Tidak disarankan       |

---

## 🧮 Formula Utama

```
Swing Score = (EMA Score   × 25%) +
              (MACD Score  × 15%) +
              (RSI Score   × 15%) +
              (OBV Score   × 25%) +
              (Volume Score × 10%) +
              (BB Score    × 10%)

  ↓ kemudian difilter oleh:

  [1] Jika ADX < 20  → cap skor maksimal di 60
  [2] Jika Market Bearish → totalScore × 0.8

Nilai akhir di-clamp antara 0 dan 100.
```

---

## 📊 Komponen & Bobot

```
┌─────────────────────────────────────┬────────┬──────────────────────┐
│ Komponen                            │ Bobot  │ Perubahan            │
├─────────────────────────────────────┼────────┼──────────────────────┤
│ 1. EMA Stack & Tren                 │ 25%    │ Tidak berubah        │
│ 2. MACD Momentum & Crossover        │ 15%    │ ↓ dari 20%           │
│ 3. RSI Momentum                     │ 15%    │ Tidak berubah        │
│ 4. OBV Akumulasi Institusional      │ 25%    │ Tidak berubah        │
│ 5. Volume Konfirmasi                │ 10%    │ Tidak berubah        │
│ 6. Bollinger Bands + Squeeze        │ 10%    │ ↑ dari 5%            │
└─────────────────────────────────────┴────────┴──────────────────────┘
Total                                  100%
```

> **Alasan perubahan bobot:** MACD dan EMA sama-sama mengukur tren, sehingga mengurangi bobot MACD memitigasi *multikolinearitas* antar komponen. Bobot yang dihemat dialihkan ke BB agar dimensi volatilitas lebih terwakili.

---

## 🔍 Detail Setiap Komponen

### 1. 📐 EMA Stack & Tren — Bobot 25%

**Indikator:** EMA 9, EMA 21, EMA 50

**Kondisi Bullish Stack:** `EMA9 > EMA21 > EMA50`

| Kondisi Harga                              | EMA Score |
|--------------------------------------------|:---------:|
| Di atas EMA9, EMA21, EMA50 + bullish stack | **100**   |
| Di atas EMA9, EMA21, EMA50 (tanpa stack)   | **85**    |
| Di atas EMA21 & EMA50 (pullback sehat)     | **75**    |
| Di atas EMA50 saja (uji support)           | **60**    |
| Di bawah EMA50 (fase bearish)              | **25**    |

---

### 2. ⚡ MACD Momentum & Crossover — Bobot 15% *(sebelumnya 20%)*

**Indikator:** MACD Line, Signal Line, Histogram

| Kondisi                                         | MACD Score |
|-------------------------------------------------|:----------:|
| MACD > Signal, MACD ≥ 0, Histogram > 0         | **95**     |
| MACD > Signal, MACD ≥ 0, Histogram ≤ 0         | **80**     |
| MACD > Signal, MACD < 0 (crossover oversold)   | **85**     |
| MACD ≤ Signal, MACD < 0                        | **15**     |
| MACD ≤ Signal, MACD ≥ 0                        | **40**     |

---

### 3. 📉 RSI Momentum — Bobot 15%

**Indikator:** RSI (14 periode)

| Kondisi RSI          | Di atas EMA50? | RSI Score |
|----------------------|:--------------:|:---------:|
| 45–65 (zona ideal)   | Ya             | **90**    |
| 45–65 (zona ideal)   | Tidak          | **60**    |
| < 35 (oversold)      | Ya             | **85**    |
| < 35 (oversold)      | Tidak          | **40**    |
| > 70 (overbought)    | —              | **30**    |
| Kondisi lain         | —              | **50**    |

---

### 4. 📦 OBV Akumulasi Institusional — Bobot 25%

**Indikator:** OBV + EMA 5 & EMA 20 dari OBV

> ⚠️ **Anti-Manipulasi:** Volume input yang masuk ke OBV sudah melalui sanitasi — nilai volume di-*cap* maksimal **5× rata-rata volume 5 hari terakhir** untuk mencegah distorsi dari *block trade* atau anomali likuiditas.

**Rumus OBV:**
```
Jika harga[i] > harga[i-1] → OBV[i] = OBV[i-1] + volumeSanitized[i]
Jika harga[i] < harga[i-1] → OBV[i] = OBV[i-1] - volumeSanitized[i]
Jika harga[i] = harga[i-1] → OBV[i] = OBV[i-1]
```

| Kondisi OBV                           | OBV Score |
|---------------------------------------|:---------:|
| EMA5(OBV) > EMA20(OBV) (akumulasi)   | **100**   |
| EMA5(OBV) ≤ EMA20(OBV) (distribusi)  | **40**    |

---

### 5. 📊 Volume Konfirmasi — Bobot 10%

**Indikator:** Volume terkini vs rata-rata volume 5 hari terakhir

> ⚠️ **Anti-Manipulasi:** Volume yang digunakan adalah volume yang telah di-sanitasi (di-cap 5× rata-rata). Lonjakan volume tidak wajar tidak akan mempengaruhi skor secara berlebihan.

**Threshold volume tinggi:** `volumeSanitized > Rata-rata × 1.3`

| Volume          | Candle   | Volume Score |
|-----------------|:--------:|:------------:|
| Tinggi (>130%)  | Hijau    | **95**       |
| Tinggi (>130%)  | Merah    | **30**       |
| Normal          | Hijau    | **70**       |
| Normal          | Merah    | **45**       |

---

### 6. 🎯 Bollinger Bands + Squeeze — Bobot 10% *(sebelumnya 5%)*

**Indikator:** Bollinger Bands (periode 20, StdDev 2)

**Rumus Posisi:**
```
positionPercent = (Harga - Lower Band) / (Upper Band - Lower Band)
```

**Deteksi Squeeze:**
```
isSqueeze = (Upper - Lower) / Middle Band < 0.03  (bandwidth < 3% dari mid)
```
> Squeeze menandakan periode konsolidasi ketat — pasar "mengumpulkan energi" sebelum breakout besar.

| Posisi (%)          | Squeeze? | Di atas EMA50? | BB Score |
|---------------------|:--------:|:--------------:|:--------:|
| ≤ 20% (lower band)  | ✅ Ya    | Ya             | **95**   |
| ≤ 20% (lower band)  | ❌ Tidak | Ya             | **90**   |
| ≤ 20% (lower band)  | —        | Tidak          | **40**   |
| 45%–55% (mid-band)  | ✅ Ya    | Ya             | **90**   |
| 45%–55% (mid-band)  | ❌ Tidak | Ya             | **75**   |
| 45%–55% (mid-band)  | —        | Tidak          | **50**   |
| ≥ 80% (upper band)  | —        | Candle hijau   | **80**   |
| ≥ 80% (upper band)  | —        | Candle merah   | **40**   |
| Kondisi lain        | —        | —              | **60**   |

---

## 🔒 Filter Post-Scoring

Filter ini diaplikasikan **setelah** skor tertimbang dihitung, sebelum nilai final dikembalikan.

### Filter 1 — ADX Whipsaw Guard (`adxVal`)

```
Jika adxVal < 20 → totalScore = min(totalScore, 60)
```

**Logika:** ADX (*Average Directional Index*) mengukur **kekuatan tren**, bukan arahnya.
- ADX < 20 = pasar *sideways*/choppy, tidak ada tren yang jelas
- Meskipun semua indikator lain terlihat bagus, sinyal swing di pasar *sideways* sangat berisiko terkena *whipsaw* (sinyal palsu)
- Cap skor di 60 mencegah sistem merekomendasikan saham di kondisi pasar yang tidak kondusif untuk swing

| ADX             | Efek                        |
|-----------------|-----------------------------|
| ≥ 20 (trending) | Tidak ada perubahan         |
| < 20 (sideways) | Skor maksimal dibatasi: **60** |

---

### Filter 2 — Market Regime Penalty (`isMarketBullish`)

```
Jika isMarketBullish === false → totalScore = totalScore × 0.8
```

**Logika:** Swing trading di pasar *bearish* secara makro (misalnya IHSG di bawah MA200) memiliki risiko lebih tinggi — hampir semua saham cenderung ikut turun. Penalti 20% merefleksikan risiko tambahan ini.

| Kondisi Pasar     | Multiplier | Efek                  |
|-------------------|:----------:|-----------------------|
| Bullish (≥ MA200) | ×1.0       | Tidak ada perubahan   |
| Bearish (< MA200) | ×0.8       | Skor dikurangi **20%** |

---

## 🏗️ Arsitektur Fungsi (Updated)

```typescript
calculateSwingScore(
  prices: number[],          // Array harga penutupan
  rsiVal: number,            // Nilai RSI terakhir
  macdVal: {                 // Objek MACD
    macd?: number,
    signal?: number,
    histogram?: number
  },
  ema9Val: number,           // EMA 9 terakhir
  ema21Val: number,          // EMA 21 terakhir
  ema50Val: number,          // EMA 50 terakhir
  volume: number[],          // Array volume (akan di-sanitasi internal)
  bollingerBands: {          // BB terakhir
    upper?: number,
    lower?: number,
    middle?: number
  },
  adxVal: number = 25,       // [NEW] Nilai ADX — filter whipsaw (default: 25)
  isMarketBullish: boolean = true  // [NEW] Konteks regime pasar (default: true)
): {
  score: number,             // Total swing score (0-100)
  details: {                 // Breakdown per komponen
    ema: number,
    macd: number,
    rsi: number,
    obv: number,
    volume: number,
    bb: number
  }
}
```

```typescript
performFullAnalysis(
  prices: number[],
  volume: number[],
  adxVal: number = 25,           // [NEW] Diteruskan ke calculateSwingScore
  isMarketBullish: boolean = true // [NEW] Diteruskan ke calculateSwingScore
)
```

---

## 🔢 Contoh Perhitungan

### Skenario A — Pasar Bullish, Tren Kuat

| Komponen  | Score | Bobot |
|-----------|:-----:|:-----:|
| EMA Stack | 100   | 25%   |
| MACD      | 95    | 15%   |
| RSI       | 90    | 15%   |
| OBV       | 100   | 25%   |
| Volume    | 95    | 10%   |
| BB        | 90    | 10%   |

```
Raw = (100×0.25) + (95×0.15) + (90×0.15) + (100×0.25) + (95×0.10) + (90×0.10)
    = 25.0 + 14.25 + 13.5 + 25.0 + 9.5 + 9.0 = 96.25

ADX = 35 (trending) → tidak ada cap
isMarketBullish = true → tidak ada penalti

✅ Swing Score = 96
```

### Skenario B — Pasar Sideways (ADX = 14)

```
Raw = 85 (indikator terlihat bagus)
ADX = 14 < 20 → cap di 60

⚠️ Swing Score = 60
```

### Skenario C — Pasar Bearish (IHSG < MA200)

```
Raw = 78
isMarketBullish = false → 78 × 0.8 = 62.4

🔴 Swing Score = 62
```

---

## 📌 Ringkasan Semua Perbaikan (v2)

| # | Perbaikan                      | Detail                                               |
|---|--------------------------------|------------------------------------------------------|
| 1 | **Revisi Bobot**               | MACD 20%→15%, BB 5%→10% (mitigasi multikolinearitas) |
| 2 | **BB Squeeze Detection**       | Deteksi bandwidth < 3% mid-band, skor bonus 90–95   |
| 3 | **ADX Whipsaw Filter**         | ADX < 20 → cap skor maksimal 60                      |
| 4 | **Anti-Manipulasi Volume**     | Volume di-cap 5× rata-rata sebelum OBV & Volume score |
| 5 | **Market Regime Multiplier**   | Pasar bearish → ×0.8 penalti 20%                    |

---

*Dokumentasi diperbarui dari kode sumber: [`server/src/services/technical-analysis.ts`](./server/src/services/technical-analysis.ts)*

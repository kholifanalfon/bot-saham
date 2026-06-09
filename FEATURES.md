# 📘 Dokumentasi Fitur — Bot Saham (BTST Swing Trader)

> Dokumen ini menjelaskan seluruh fitur yang tersedia pada aplikasi **Bot Saham**, sebuah sistem analisis dan manajemen swing trading saham berbasis AI untuk pasar IDX (Indonesia) dan US.
>
> Dibuat: 9 Juni 2026  
> Stack: React + TypeScript (Frontend) · Node.js + Express + PostgreSQL (Backend) · Gemini AI

---

## 📋 Daftar Isi

1. [Dashboard](#1--dashboard)
2. [Screener Saham](#2--screener-saham)
3. [Detail Saham (Stock Detail Page)](#3--detail-saham)
4. [AI Analyst (Gemini Evaluation)](#4--ai-analyst-gemini-evaluation)
5. [Portfolio Tracker](#5--portfolio-tracker)
6. [Swing Trading Recap](#6--swing-trading-recap)
7. [Priority Stocks](#7--priority-stocks)
8. [Notifikasi & Price Alert](#8--notifikasi--price-alert)
9. [Stock Registry](#9--stock-registry)
10. [Data Fetch Report](#10--data-fetch-report)
11. [Penjelasan Algoritma](#11--penjelasan-algoritma)
12. [Pengaturan (Settings)](#12--pengaturan-settings)
13. [Manajemen Pengguna (Admin)](#13--manajemen-pengguna-admin)
14. [API Guide](#14--api-guide)
15. [Autentikasi](#15--autentikasi)

---

## 1. 🏠 Dashboard

**Path:** `/`  
**File:** [`client/src/pages/Dashboard.tsx`](./client/src/pages/Dashboard.tsx)

Dashboard adalah halaman utama yang memberikan gambaran menyeluruh kondisi pasar dan sinyal swing trading hari ini.

### Konten Utama
| Widget | Keterangan |
|--------|-----------|
| **Market Sentiment** | Analisis sentimen pasar IDX/US yang didapat dari berita terkini via Gemini AI |
| **Top Swing Candidates** | Daftar saham dengan Swing Score tertinggi hari ini |
| **Watchlist Overview** | Ringkasan saham yang ada di watchlist pengguna beserta harga live |
| **Market Statistics** | Statistik agregat: rata-rata swing score, jumlah saham aktif, distribusi sinyal |

### Data Source
- Harga real-time: Yahoo Finance API
- Sentimen pasar: Gemini AI + Finnhub News
- Indikator teknikal: Dihitung dari histori OHLCV 3 bulan

---

## 2. 🔍 Screener Saham

**Path:** `/screener`  
**File:** [`client/src/pages/Screener.tsx`](./client/src/pages/Screener.tsx)

Screener membantu trader menyaring saham berdasarkan indikator teknikal dan skor swing.

### Fitur Filter
| Filter | Rentang |
|--------|---------|
| **Swing Score** | Slider 0–100 |
| **RSI** | Rentang min–max |
| **Pasar** | IDX / US / Keduanya |
| **Sektor** | Multi-select sektor IDX |
| **Volume** | Minimum volume harian |

### Tampilan Hasil
- Tabel dengan kolom: Simbol, Nama, Harga, % Perubahan, Swing Score, RSI, MACD, EMA9/21/50, Volume
- Badge warna untuk swing score (🟢 ≥70 / 🟡 50–69 / 🔴 <50)
- Klik baris → navigasi ke Detail Saham
- Sort semua kolom secara ascending/descending
- Export hasil ke CSV

### Sorting Default
Diurutkan berdasarkan **Swing Score tertinggi** secara default.

---

## 3. 📊 Detail Saham

**Path:** `/stock/:symbol`  
**File:** [`client/src/pages/StockDetailPage.tsx`](./client/src/pages/StockDetailPage.tsx)

Halaman komprehensif yang menampilkan semua informasi teknikal dan fundamental sebuah saham.

### Komponen Utama

#### 📈 Grafik Candlestick Interaktif
- Grafik OHLCV interaktif menggunakan data histori Yahoo Finance
- Overlay: EMA 9, EMA 21, EMA 50
- Volume bar chart di bawah

#### 📐 Panel Indikator Teknikal
| Indikator | Keterangan |
|-----------|-----------|
| **Swing Score** | Nilai 0–100, disertai interpretasi |
| **RSI (14)** | Relative Strength Index |
| **MACD** | MACD Line, Signal Line, Histogram |
| **EMA 9 / 21 / 50** | Exponential Moving Average |
| **Bollinger Bands** | Upper/Middle/Lower Band + Squeeze |
| **ADX** | Average Directional Index (kekuatan tren) |
| **OBV** | On-Balance Volume (akumulasi institusional) |

#### 🎯 Panel TP/SL Otomatis
Sistem menghitung otomatis level Take Profit dan Stop Loss berdasarkan parameter yang dikonfigurasi di Settings:
- **Take Profit:** `harga × (1 + TP%)` 
- **Stop Loss:** `harga × (1 − SL%)`
- **Trailing Stop Loss:** Aktif setelah harga naik melebihi TSL Trigger %

#### 📰 Berita Perusahaan
Berita terkini dari Finnhub API, difilter per perusahaan.

#### 📐 Position Sizing Calculator

Panel kalkulasi posisi otomatis berbasis **risk management** — tersedia langsung di halaman detail saham.

**Input:**

| Field | Default | Keterangan |
|-------|---------|-----------|
| **Modal Tersedia** | — | Total modal yang akan dialokasikan (IDR/USD) |
| **Risiko per Trade (%)** | 2% | Persentase modal yang boleh hilang jika SL tersentuh |
| **Stop Loss (%)** | 4% | Jarak stop loss dari harga entry |
| **Take Profit (%)** | 8% | Target profit dari harga entry |

**Output yang Dihitung Otomatis:**

| Metrik | Formula |
|--------|---------|
| **Rekomendasi Lot** | `⌊(Modal × Risk%) ÷ (Harga × SL%) ÷ LOT_SIZE⌋` |
| **Total Lembar** | Lot × 100 (IDX) atau Lot × 1 (US) |
| **Risiko Maks (IDR)** | Lembar × Harga × SL% |
| **Potensi Profit (IDR)** | Lembar × Harga × TP% |
| **Total Modal Dipakai** | Lembar × Harga Entry |
| **Risk:Reward Ratio** | TP% ÷ SL% |
| **SL Price** | Harga × (1 − SL%) |
| **TP Price** | Harga × (1 + TP%) |

**Konvensi Lot:**
- **IDX:** 1 lot = 100 lembar saham
- **US:** 1 lot = 1 share

**Indikator R:R:**
- ✅ Ideal: R:R ≥ 2.0 (hijau)
- 🟡 Acceptable: R:R ≥ 1.0 (kuning)
- 🔴 Kurang ideal: R:R < 1.0 (merah)

> Harga entry diambil langsung dari harga real-time yang dimuat di halaman Detail Saham.  
> Kalkulasi berjalan **live** setiap kali input berubah — tidak perlu klik tombol apapun.

- Tombol tambah/hapus dari watchlist
- Shortcut rekam transaksi BUY/SELL langsung dari halaman ini

---

## 4. 🤖 AI Analyst (Gemini Evaluation)

**Path:** `/ai`  
**File:** [`client/src/pages/AIAnalysis.tsx`](./client/src/pages/AIAnalysis.tsx)  
**Route Backend:** `POST /api/ai/analyze`, `GET /api/ai/market-sentiment`, `POST /api/ai/chat`

Integrasi penuh dengan **Google Gemini AI** untuk analisis mendalam setiap saham.

### Sub-fitur

#### 🔬 Analisis Saham Individual
1. Pilih simbol saham
2. Gemini menerima: data OHLCV 3 bulan + semua indikator teknikal + berita terkini
3. Menghasilkan laporan meliputi:
   - **Ringkasan kondisi** saat ini
   - **Rekomendasi aksi** (BUY / HOLD / AVOID)
   - **Target price** dan **level risiko**
   - **Alasan teknikal** yang detail
   - **Poin risiko** yang perlu diwaspadai

> **Caching:** Hasil analisis disimpan di database (`stock_data.gemini_analysis`). Klik "Force Refresh" untuk memaksa analisis ulang.

#### 🌐 Sentimen Pasar
- Gemini menganalisis berita pasar IDX/US terkini
- Menghasilkan: Sentimen keseluruhan (Bullish/Bearish/Netral) + penjelasan + faktor-faktor kunci

#### 💬 Chat Asisten AI
- Chatbot berbasis Gemini yang bisa menjawab pertanyaan seputar saham, analisis teknikal, strategi trading
- Mendukung riwayat percakapan multi-turn
- Rate limit: 30 request per 15 menit per IP

---

## 5. 💼 Portfolio Tracker

**Path:** `/portfolio`  
**File:** [`client/src/pages/Portfolio.tsx`](./client/src/pages/Portfolio.tsx)  
**Route Backend:** `/api/portfolio/*`

Sistem pelacak portofolio real-time berbasis transaksi.

### Cara Kerja
Pengguna merekam transaksi BUY dan SELL. Sistem secara otomatis menghitung:
- **Average Price** (harga rata-rata pembelian)
- **Unrealized P&L** = (Harga Saat Ini − Avg Price) × Jumlah Lot
- **P&L %** = (Current − Avg) / Avg × 100
- **Total Portfolio Value** berdasarkan harga Yahoo Finance real-time

### Fitur

| Fitur | Keterangan |
|-------|-----------|
| **Record Transaction** | Input BUY/SELL dengan simbol, jumlah lot, harga, tanggal |
| **Active Holdings** | Tabel kepemilikan aktif + harga live + unrealized P&L |
| **Quick Sell** | Jual semua lot satu klik dengan harga market |
| **Transaction History** | Riwayat semua transaksi, bisa dihapus satu-satu |
| **Summary Cards** | Total Value, Unrealized P&L, Win Rate |
| **Delete Transaction** | Hapus transaksi → portofolio dikalkulasi ulang otomatis |

> **Harga Real-time:** Diambil dari Yahoo Finance saat halaman dimuat.

---

## 6. 📊 Swing Trading Recap

**Path:** `/swing-recap`  
**File:** [`client/src/pages/SwingRecap.tsx`](./client/src/pages/SwingRecap.tsx)  
**Route Backend:** `GET /api/portfolio/swing-recap`

Halaman rekap **realized P&L** dari semua swing trade yang telah diselesaikan (pasangan BUY → SELL).

### Algoritma Matching
Menggunakan metode **FIFO (First In, First Out)**: setiap transaksi SELL dicocokkan dengan transaksi BUY tertua yang tersisa untuk simbol yang sama.

### Statistik yang Ditampilkan

| Metrik | Keterangan |
|--------|-----------|
| **Net P&L** | Total realized profit dikurangi total realized loss |
| **Total Profit** | Jumlah semua trade yang menguntungkan |
| **Total Loss** | Jumlah semua trade yang merugikan |
| **Win Rate** | % trade yang profit dari total trade |
| **Total Trades** | Jumlah pasangan BUY→SELL yang sudah ditutup |
| **Avg Holding Days** | Rata-rata durasi memegang saham per trade |

### Panel Visual
- **Win Rate Progress Bar** — warna dinamis: 🟢 ≥55% / 🟡 ≥40% / 🔴 <40%
- **🏆 Trade Terbaik** — highlight trade dengan realized P&L tertinggi
- **💔 Trade Terburuk** — highlight trade dengan realized P&L terendah

### Tab Riwayat
- **Tab: Riwayat Trade** — tabel semua closed trades, bisa difilter per simbol
- **Tab: Per Saham** — agregasi per simbol: total trade, wins, win rate bar, total P&L

---

## 7. 📌 Priority Stocks

**Path:** `/priority-stocks`  
**File:** [`client/src/pages/PriorityStocks.tsx`](./client/src/pages/PriorityStocks.tsx)

Daftar saham prioritas yang dikurasi secara khusus, diurutkan berdasarkan Swing Score dengan filter ketat.

### Kriteria Prioritas
Saham masuk daftar ini jika memenuhi semua kondisi:
- Swing Score **≥ 65**
- RSI di rentang **40–65** (tidak overbought, tidak terlalu oversold)
- Volume di atas rata-rata
- MACD histogram positif atau mendekati crossover bullish

### Tampilan
- Grid card dengan badge kondisi: STRONG BUY / BUY / WATCH
- Tombol shortcut ke Detail Saham dan AI Analysis
- Auto-refresh setiap beberapa menit

---

## 8. 🔔 Notifikasi & Price Alert

**Path:** `/notifications`  
**File:** [`client/src/pages/Notifications.tsx`](./client/src/pages/Notifications.tsx)  
**Route Backend:** `/api/notifications/*`

Sistem alert harga otomatis yang memantau kondisi pasar dan memberikan notifikasi.

### Jenis Alert
| Tipe | Deskripsi |
|------|-----------|
| **Price Above** | Notifikasi ketika harga melampaui nilai tertentu |
| **Price Below** | Notifikasi ketika harga turun di bawah nilai tertentu |
| **Swing Score** | Alert ketika Swing Score melewati threshold |

### Manajemen Alert
- Buat alert baru dengan pilih simbol + jenis + nilai target
- Lihat semua alert aktif
- Tandai notifikasi sebagai sudah dibaca
- Alert yang sudah terpicu masuk ke riwayat notifikasi

---

## 9. 🗂️ Stock Registry

**Path:** `/registry`  
**File:** [`client/src/pages/StockRegistry.tsx`](./client/src/pages/StockRegistry.tsx)  
**Route Backend:** `/api/stocks/*`

Manajemen daftar saham yang dipantau oleh sistem ingestion pipeline.

### Fitur Utama

#### 📋 Daftar Saham Registry
Tabel semua saham aktif dengan kolom: Simbol, Nama Perusahaan, Pasar (IDX/US), Status, Swing Score, Kategori.

**Badge Kategori:**
- `CORE` — saham blue-chip utama (IDX LQ45 / US S&P500)
- `🎯 SWING` — kandidat swing trading hari ini yang dipilih oleh Gemini AI

#### ➕ Tambah Saham Baru
1. Input kode saham (contoh: `ISAT` atau `TSMC`)
2. Sistem memanggil **Gemini AI** untuk mencari nama perusahaan dan pasar asal
3. Preview hasil lookup ditampilkan
4. Konfirmasi → saham ditambahkan ke database
5. **Auto-ingestion:** Data histori 3 bulan langsung diambil di background setelah add
6. Banner progress muncul → tabel auto-refresh setelah ~10 detik

#### 🔄 Sinkronisasi Registry via AI
Tombol **"Sync Registry"** menjalankan `sync-stocks.ts` yang memanggil Gemini AI untuk menghasilkan daftar saham terbaru dalam 3 kategori:
- **Kategori 1:** 45 saham IDX liquid (LQ45/IDX30/SMC Liquid)
- **Kategori 2:** 20 saham US high-liquidity (S&P 500/Nasdaq 100)  
- **Kategori 3:** 20 saham swing candidate hari ini (berbeda dari cat. 1 & 2, dipilih berdasarkan sinyal teknikal)

Log sinkronisasi ditampilkan live via **Server-Sent Events (SSE)** di konsol bawaan halaman.

#### 🔍 Filter & Pencarian
- Filter berdasarkan pasar (IDX/US)
- Search nama atau simbol
- Filter kategori (Core / Swing Candidate)

---

## 10. 📊 Data Fetch Report

**Path:** `/data-report`  
**File:** [`client/src/pages/DataFetchReport.tsx`](./client/src/pages/DataFetchReport.tsx)  
**Route Backend:** `/api/analysis/*`

Pusat kontrol pengambilan dan pembaruan data histori harga saham.

### Sub-fitur

#### ⚡ Trigger Ingestion Manual
- Pilih simbol atau semua saham aktif
- Tentukan rentang tanggal (maks 7 hari per request)
- Jalankan pipeline ingestion → hitung ulang semua indikator teknikal
- Lihat progress dan hasil di log

#### 📋 Riwayat Ingestion
Tabel log semua aktivitas ingestion dengan kolom:
- Status (✅ Success / ❌ Error / ⏳ Running)
- Trigger type (manual / scheduled / registry_add)
- Simbol, rentang tanggal
- Jumlah record yang diproses
- Detail pesan

#### 🔄 Refresh Data Hari Ini
Satu klik untuk menjalankan pipeline ingestion untuk tanggal hari ini pada semua saham aktif.

---

## 11. 🧪 Penjelasan Algoritma

**Path:** `/algorithm`  
**File:** [`client/src/pages/AlgorithmExplanation.tsx`](./client/src/pages/AlgorithmExplanation.tsx)

Halaman edukasi interaktif yang menjelaskan cara kerja seluruh algoritma analisis teknikal dalam sistem.

### Konten
- Formula **Swing Score** lengkap dengan bobot dan logika setiap komponen
- Penjelasan visual untuk: EMA Stack, MACD, RSI, OBV, Bollinger Bands, ADX, Volume
- Tabel interpretasi nilai untuk setiap indikator
- Panduan membaca sinyal swing trading

> Lihat juga: [`SWING_SCORE_FORMULA.md`](./SWING_SCORE_FORMULA.md) untuk dokumentasi formula teknikal lengkap.

### Komponen Formula Swing Score (Ringkasan)

```
Swing Score = (EMA Score × 25%) + (MACD Score × 15%) + (RSI Score × 15%)
            + (OBV Score × 25%) + (Volume Score × 10%) + (BB Score × 10%)

Filter:
  - ADX < 20  → cap max score = 60 (tren lemah)
  - Market Bearish → score × 0.8
```

| Skor | Interpretasi |
|:----:|-------------|
| ≥ 70 | ✅ Ideal untuk swing trading |
| 50–69 | 🟡 Cukup, selektif |
| < 50 | 🔴 Hindari |

---

## 12. ⚙️ Pengaturan (Settings)

**Path:** `/settings`  
**File:** [`client/src/pages/Settings.tsx`](./client/src/pages/Settings.tsx)  
**Route Backend:** `GET/POST /api/settings`

Konfigurasi global sistem. Semua pengaturan disimpan di tabel `settings` PostgreSQL.

### Parameter yang Dapat Dikonfigurasi

#### 🔑 API Keys
| Key | Keterangan |
|-----|-----------|
| `gemini_api_key` | Google Gemini AI API Key untuk analisis AI |
| `finnhub_api_key` | Finnhub API Key untuk berita perusahaan |
| `sectors_api_key` | Sectors.app API Key untuk data sektor IDX |

> API keys ditampilkan termasking (`●●●●●`) di UI, dan hanya diperbarui jika nilai baru diinput.

#### 🤖 Model AI
| Key | Default | Keterangan |
|-----|---------|-----------|
| `gemini_model` | `gemini-1.5-flash` | Model Gemini yang digunakan untuk analisis |
| `gemini_idx_indices` | `LQ45, IDX30, SMC Liquid` | Indeks IDX referensi untuk sync registry |

#### 📈 Parameter Swing Trading
| Key | Default | Keterangan |
|-----|---------|-----------|
| `swing_tp_percent` | `8` | Target Profit (%) |
| `swing_sl_percent` | `4` | Stop Loss (%) |
| `swing_tsl_enabled` | `false` | Aktifkan Trailing Stop Loss |
| `swing_tsl_trigger_percent` | `5` | % kenaikan untuk mengaktifkan TSL |
| `swing_tsl_trail_percent` | `3` | % trailing dari harga tertinggi |

#### 🌐 Pasar
| Key | Default | Keterangan |
|-----|---------|-----------|
| `us_market_enabled` | `false` | Aktifkan saham US (NYSE/Nasdaq) |

> Saat US market diaktifkan, ingestion pipeline langsung berjalan di background untuk populate data US stocks.

---

## 13. 👥 Manajemen Pengguna (Admin)

**Path:** `/users`  
**File:** [`client/src/pages/UserManagement.tsx`](./client/src/pages/UserManagement.tsx)  
**Akses:** Role `admin` saja

Halaman admin untuk mengelola akun pengguna yang terdaftar.

### Fitur
- Lihat semua pengguna terdaftar
- Aktifkan / Nonaktifkan akun pengguna
- Ubah role pengguna (user / admin)
- Hapus akun

---

## 14. 📖 API Guide

**Path:** `/guide`  
**File:** [`client/src/pages/ApiGuide.tsx`](./client/src/pages/ApiGuide.tsx)

Dokumentasi interaktif semua endpoint REST API yang tersedia di backend, lengkap dengan contoh request/response.

### Endpoint yang Didokumentasikan
- `/api/stocks/*` — Data & registry saham
- `/api/analysis/*` — Analisis teknikal & ingestion
- `/api/ai/*` — Gemini AI endpoints
- `/api/portfolio/*` — Portofolio & transaksi
- `/api/notifications/*` — Alert & notifikasi

---

## 15. 🔐 Autentikasi

**File:** [`client/src/pages/Login.tsx`](./client/src/pages/Login.tsx), [`Register.tsx`](./client/src/pages/Register.tsx)  
**Route Backend:** `/api/auth/*`

Sistem autentikasi berbasis JWT session.

### Alur
1. **Register** → buat akun dengan nama, email, password
2. **Login** → verifikasi kredensial → session JWT disimpan di cookie HttpOnly
3. **AuthGuard** → semua route protected memverifikasi session sebelum render
4. **AdminGuard** → route admin memverifikasi role `admin`

### Keamanan
- Password di-hash menggunakan bcrypt
- JWT disimpan di cookie dengan flag `HttpOnly` dan `SameSite`
- Session kadaluarsa otomatis

---

## 🗄️ Arsitektur Database

Database: **PostgreSQL**

| Tabel | Keterangan |
|-------|-----------|
| `users` | Akun pengguna (id, email, name, password_hash, role) |
| `settings` | Key-value store konfigurasi global |
| `stocks` | Registry saham aktif (symbol, name, market, category) |
| `stock_data` | Data OHLCV + indikator teknikal per hari per saham |
| `portfolio` | Kepemilikan aktif per user |
| `transactions` | Riwayat semua transaksi BUY/SELL |
| `alerts` | Konfigurasi price alert per user |
| `triggered_alerts` | Riwayat notifikasi yang sudah terpicu |
| `watchlist` | Daftar pantau saham per user |
| `ingestion_logs` | Log aktivitas pipeline pengambilan data |

---

## 🔄 Alur Data Pipeline

```
Yahoo Finance API
       │
       ▼
 getHistoricalData()
 (OHLCV 3 bulan)
       │
       ▼
 performFullAnalysis()
 ├── EMA 9/21/50
 ├── MACD (12,26,9)
 ├── RSI (14)
 ├── OBV
 ├── Bollinger Bands (20,2)
 ├── ADX (14)
 └── Swing Score (composite)
       │
       ▼
 INSERT INTO stock_data
 (is_active = true untuk record terbaru)
       │
       ▼
 Frontend Screener / Dashboard
 mengambil dari stock_data
```

---

## 🚀 Cara Menjalankan

```bash
# Install dependencies
npm install

# Jalankan database migration
cd server && npx ts-node src/db/migrate.ts

# Sync stock registry (opsional, perlu Gemini API Key)
npx ts-node src/db/sync-stocks.ts

# Jalankan backend
npm run dev

# Jalankan frontend (di terminal terpisah)
cd client && npm run dev
```

---

## 📁 Struktur File Utama

```
bot-saham/
├── client/src/
│   ├── pages/              ← Semua halaman React
│   ├── components/layout/  ← Sidebar, Header, AppLayout
│   ├── store/              ← Zustand state management
│   └── styles/             ← Global CSS
├── server/src/
│   ├── routes/             ← Express API routes
│   ├── services/           ← Business logic & external APIs
│   │   ├── technical-analysis.ts  ← Swing Score & indikator
│   │   ├── ingestion.ts           ← Data pipeline
│   │   ├── gemini-ai.ts           ← Gemini AI integration
│   │   ├── yahoo-finance.ts       ← Data harga
│   │   └── portfolio.ts           ← Kalkulasi portofolio
│   ├── db/
│   │   ├── migrate.ts      ← Schema database
│   │   ├── sync-stocks.ts  ← AI-powered registry sync
│   │   └── seed.ts         ← Data awal
│   └── middleware/
│       └── authMiddleware.ts
├── SWING_SCORE_FORMULA.md  ← Dokumentasi formula teknikal
└── FEATURES.md             ← Dokumen ini
```

---

*Dokumen ini diperbarui setiap ada penambahan fitur baru. Untuk detail formula teknikal, lihat [`SWING_SCORE_FORMULA.md`](./SWING_SCORE_FORMULA.md).*

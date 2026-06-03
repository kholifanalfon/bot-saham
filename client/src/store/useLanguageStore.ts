import { create } from "zustand";

export type Language = "id" | "en";

export const translations = {
  id: {
    dashboard: "Dasbor",
    screener: "Penyaring Swing",
    portfolio: "Portofolio",
    priority: "Saham Prioritas",
    notifications: "Notifikasi",
    guide: "Panduan API",
    users: "Kelola Pengguna",
    stock_registry: "Registri Saham",
    logout: "Keluar",
    active_analyzing: "SEDANG DIANALISIS",
    last_price: "Harga Terakhir",
    daily_change: "Perubahan Harian",
    btst_score: "Skor Swing",
    technical_chart: "Grafik Candlestick Teknis",
    metrics_signals: "Metrik & Sinyal",
    gemini_evaluation: "Evaluasi Teknis Gemini",
    confidence_score: "Skor Keyakinan",
    recommend: "REKOMENDASI",
    strong_buy: "BELI KUAT",
    // Dashboard translations
    dashboard_overview: "Ikhtisar Dasbor",
    dashboard_sub: "Metrik waktu nyata, skor swing, dan pilihan teknis.",
    active_watchlist: "Daftar Pantau Aktif",
    items_added: "item baru minggu ini",
    top_recommendation: "Rekomendasi Utama",
    btst_score_label: "Skor Swing Trading",
    market_status: "Status Pasar",
    idx_closes: "IHSG tutup dalam 4 jam",
    top_btst_recs: "Rekomendasi Swing Teratas",
    breakout_verified: "Momentum swing terverifikasi",
    view: "Lihat",
    daily_ai_insight: "Wawasan AI Harian",
    powered_by_gemini: "Didukung oleh Gemini Flash API",
    // Screener translations
    screener_overview: "Swing Trading Screener",
    screener_sub:
      "Pindai dan urutkan aset berdasarkan 5 poin skor momentum swing.",
    all_market: "Semua Pasar",
    idx_market: "Pasar Indonesia (IDX)",
    us_market: "Pasar AS (US)",
    search_placeholder: "Cari berdasarkan kode saham...",
    table_stock: "SAHAM",
    table_last: "HARGA TERAKHIR",
    table_change: "PERUBAHAN HARIAN",
    table_score: "SKOR SWING",
    table_rsi: "RSI (14)",
    table_macd: "SINYAL MACD",
    table_volume: "RASIO VOLUME",
    table_action: "AKSI",
    analyze: "Analisis",
    // 4-Tab translations
    all_tab: "Semua",
    priority_tab: "Prioritas",
    idx_tab: "Pasar Indo (IDX)",
    us_tab: "Pasar AS (US)",
    // BTST Algorithm translations
    algorithm: "Algoritma Swing",
    // Settings translations
    settings: "Pengaturan",
    settings_overview: "Pengaturan Sistem",
    settings_sub: "Kelola konfigurasi bot dan preferensi analisis pasar.",
    us_market_toggle: "Aktifkan Analisis Pasar AS (US)",
    us_market_toggle_desc:
      "Ketika diaktifkan, sistem akan mengunduh dan menganalisa saham pasar AS seperti AAPL, TSLA, NVDA. Ketika dinonaktifkan, sistem hanya menganalisis saham pasar lokal Indonesia (IDX) untuk mencegah penggunaan rate limit API yang sia-sia.",
    settings_save_success: "Pengaturan berhasil disimpan!",
    data_fetch_report: "Laporan Pengambilan Data",
    refresh_data: "Perbarui Data",
    refreshing_data: "Memperbarui...",
    filter_date: "Filter Tanggal",
    filter_date_range: "Rentang Tanggal",
    from: "Dari",
    to: "Ke",
    swing_pullback: "Koreksi Sehat (Pullback)",
  },
  en: {
    dashboard: "Dashboard",
    screener: "Swing Screener",
    portfolio: "Portfolio",
    priority: "Priority Stocks",
    notifications: "Notifications",
    guide: "API Guide",
    users: "Manage Users",
    stock_registry: "Stock Registry",
    logout: "Logout",
    active_analyzing: "ACTIVE ANALYZING",
    last_price: "Last Price",
    daily_change: "Daily Change",
    btst_score: "Swing Score",
    technical_chart: "Technical Candlestick Chart",
    metrics_signals: "Metrics & Signals",
    gemini_evaluation: "Gemini Technical Evaluation",
    confidence_score: "Confidence Score",
    recommend: "RECOMMEND",
    strong_buy: "STRONG BUY",
    // Dashboard translations
    dashboard_overview: "Dashboard Overview",
    dashboard_sub: "Real-time metrics, swing scores, and technical picks.",
    active_watchlist: "Active Watchlist",
    items_added: "new items this week",
    top_recommendation: "Top Recommendation",
    btst_score_label: "Swing Trading Score",
    market_status: "Market Status",
    idx_closes: "IDX closes in 4 hours",
    top_btst_recs: "Top Swing Recs",
    breakout_verified: "Swing momentum verified",
    view: "View",
    daily_ai_insight: "Daily AI Insight",
    powered_by_gemini: "Powered by Gemini Flash API",
    // Screener translations
    screener_overview: "Swing Trading Screener",
    screener_sub:
      "Scan and rank assets based on the 5-point technical swing score.",
    all_market: "ALL Market",
    idx_market: "IDX Market",
    us_market: "US Market",
    search_placeholder: "Search by stock ticker...",
    table_stock: "STOCK",
    table_last: "LAST PRICE",
    table_change: "DAILY CHANGE",
    table_score: "SWING SCORE",
    table_rsi: "RSI (14)",
    table_macd: "MACD SIGNAL",
    table_volume: "VOLUME RATIO",
    table_action: "ACTION",
    analyze: "Analyze",
    // 4-Tab translations
    all_tab: "All",
    priority_tab: "Priority",
    idx_tab: "IDX Market",
    us_tab: "US Market",
    // BTST Algorithm translations
    algorithm: "Swing Algorithm",
    // Settings translations
    settings: "Settings",
    settings_overview: "System Settings",
    settings_sub: "Manage bot configurations and market analysis preferences.",
    us_market_toggle: "Enable US Market Analysis",
    us_market_toggle_desc:
      "When enabled, the system will ingest and analyze US stocks such as AAPL, TSLA, NVDA. When disabled, the system only analyzes local Indonesian IDX stocks to prevent unnecessary API rate limiting.",
    settings_save_success: "Settings saved successfully!",
    data_fetch_report: "Data Fetch Report",
    refresh_data: "Refresh Data",
    refreshing_data: "Refreshing...",
    filter_date: "Filter Date",
    filter_date_range: "Date Range",
    from: "From",
    to: "To",
    swing_pullback: "Healthy Pullback",
  },
};

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof (typeof translations)["en"]) => string;
}

export const useLanguageStore = create<LanguageState>()((set, get) => ({
  language: (localStorage.getItem("lang") as Language) || "id",
  setLanguage: (lang: Language) => {
    localStorage.setItem("lang", lang);
    set({ language: lang });
  },
  t: (key: keyof (typeof translations)["en"]) => {
    const lang = get().language;
    return translations[lang][key] || translations["en"][key] || String(key);
  },
}));

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStockStore } from "../store/useStockStore";
import { useLanguageStore } from "../store/useLanguageStore";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface StockAnalysis {
  symbol: string;
  price: number;
  change: number;
  score: number;
  rsi: number;
  macd: string;
  volume: string;
  date?: string;
  ema9: number;
  ema21: number;
  ema50: number;
}

export const Screener: React.FC = () => {
  const { watchlist, setSelectedSymbol, addToWatchlist, removeFromWatchlist } =
    useStockStore();
  const { t, language } = useLanguageStore();

  const handleToggleWatchlist = async (symbol: string) => {
    try {
      if (watchlist.includes(symbol)) {
        await removeFromWatchlist(symbol);
      } else {
        await addToWatchlist(symbol);
      }
    } catch (err) {
      console.error("Failed to toggle watchlist:", err);
    }
  };

  const [market, setMarket] = useState<"all" | "priority" | "idx" | "us">(
    "all",
  );
  const [showPullbackOnly, setShowPullbackOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get("date") || "";

  const setDate = (val: string) => {
    setSearchParams((prev) => {
      if (val) prev.set("date", val);
      else prev.delete("date");
      return prev;
    });
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [screenerStocks, setScreenerStocks] = useState<StockAnalysis[]>([]);
  const navigate = useNavigate();

  const [defaultStrategy, setDefaultStrategy] = useState("Day Trade");
  const [selectedStrategy, setSelectedStrategy] = useState("Day Trade");

  // Fetch settings to resolve default strategy
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("http://localhost:3001/api/settings", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          if (data.default_strategy) {
            setDefaultStrategy(data.default_strategy);
            setSelectedStrategy(data.default_strategy);
          }
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    };
    fetchSettings();
  }, []);

  // Responsive mobile view check
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [buyModalSymbol, setBuyModalSymbol] = useState<{
    symbol: string;
    price: number;
  } | null>(null);
  const [buyShares, setBuyShares] = useState("100");
  const [buying, setBuying] = useState(false);

  const handleQuickBuySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyModalSymbol) return;
    setBuying(true);
    try {
      const response = await fetch(
        "http://localhost:3001/api/portfolio/transaction",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            symbol: buyModalSymbol.symbol,
            type: "buy",
            shares: parseInt(buyShares) || 100,
            price: buyModalSymbol.price,
            date: new Date().toISOString().split("T")[0],
          }),
        },
      );
      if (!response.ok) throw new Error("Gagal mengeksekusi pembelian");
      alert(
        `Berhasil membeli ${buyShares} lembar saham ${buyModalSymbol.symbol}!`,
      );
      setBuyModalSymbol(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBuying(false);
    }
  };

  const tooltips = {
    stock:
      language === "id"
        ? "Simbol ticker saham bursa. Saham watchlist ditandai bintang kuning (★)."
        : "Stock ticker symbol. Watchlist stocks are marked with a yellow star (★).",
    last:
      language === "id"
        ? "Harga penutupan transaksi bursa terakhir (diperoleh secara real-time dari Yahoo Finance)."
        : "The last recorded closing price (retrieved in real-time from Yahoo Finance).",
    change:
      language === "id"
        ? "Persentase perubahan harga hari ini dibandingkan dengan harga penutupan kemarin."
        : "Percentage price change today compared to yesterday's close.",
    score:
      language === "id"
        ? "Skor breakout algoritmik Swing (0-100) gabungan dari RSI, MACD, EMA, Volume, dan Bollinger Bands."
        : "Algorithmic Swing breakout momentum score (0-100) combining RSI, MACD, EMA, Volume, and Bollinger Bands.",
    rsi:
      language === "id"
        ? "Relative Strength Index (14 hari). Nilai >70 jenuh beli (overbought), <30 jenuh jual (oversold)."
        : "Relative Strength Index (14 days). Value >70 is overbought, <30 is oversold.",
    macd:
      language === "id"
        ? "Moving Average Convergence Divergence. Menunjukkan sinyal Bullish Crossover atau konsolidasi tren."
        : "Moving Average Convergence Divergence. Shows Bullish Crossover or trend consolidation.",
    volume:
      language === "id"
        ? "Rasio volume perdagangan hari ini dibandingkan rata-rata volume 20 hari sebelumnya."
        : "Today's trading volume ratio compared to the 20-day average volume.",
    action:
      language === "id"
        ? "Aksi untuk membuka analisis mendalam, grafik interaktif, dan evaluasi AI Gemini."
        : "Action to open deep-dive analysis, interactive charts, and Gemini AI evaluation.",
  };
  const [refreshing, setRefreshing] = useState(false);

  const loadRealScreenerData = async (strat: string = selectedStrategy) => {
    setLoading(true);
    setError(null);
    try {
      let url = `http://localhost:3001/api/analysis?strategy=${encodeURIComponent(strat)}`;
      if (date) {
        url = `http://localhost:3001/api/analysis?date=${date}&strategy=${encodeURIComponent(strat)}`;
      }
      // Fetch the pre-calculated daily bursa snapshot from PostgreSQL in a single request
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(
          `Server returned status ${response.status}: Failed to load analysis data.`,
        );
      }
      const data = await response.json();

      const validResults = data.map((item: any) => ({
        symbol: item.symbol,
        price: item.price,
        change: item.change,
        score: item.score,
        rsi: item.rsi,
        macd: item.macdHistogram > 0 ? "Bullish Crossover" : "Consolidating",
        volume: "1.2x Avg",
        date: item.date,
        ema9: item.ema9 || 0,
        ema21: item.ema21 || 0,
        ema50: item.ema50 || 0,
      }));

      setScreenerStocks(validResults);
    } catch (err: any) {
      console.error("Error fetching dynamic bursa metrics:", err);
      setError(err.message || "Gagal tersambung ke server backend.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch real-time bursa data & scores from backend (Yahoo Finance / Finnhub)
  useEffect(() => {
    loadRealScreenerData(selectedStrategy);
  }, [date, selectedStrategy]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(
        "http://localhost:3001/api/analysis/refresh",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ date }),
        },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Gagal memperbarui data dari API.");
      }
      alert(
        language === "id"
          ? "Berhasil memperbarui data terbaru!"
          : "Successfully refreshed latest data!",
      );
      await loadRealScreenerData(selectedStrategy);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = screenerStocks
    .filter((stock) => {
      const matchesSearch = stock.symbol
        .toLowerCase()
        .includes(search.toLowerCase());

      let matchesMarket = true;
      if (market === "priority") {
        matchesMarket = watchlist.includes(stock.symbol);
      } else if (market === "idx") {
        matchesMarket = stock.symbol.endsWith(".JK");
      } else if (market === "us") {
        matchesMarket = !stock.symbol.endsWith(".JK");
      }

      let matchesStrategy = true;
      if (showPullbackOnly) {
        const isUptrend = stock.price > stock.ema50;
        const isRsiPullback = stock.rsi >= 30 && stock.rsi <= 48;
        const isNearEma21 =
          stock.price >= stock.ema21 * 0.97 &&
          stock.price <= stock.ema21 * 1.03;
        const isNearEma50 =
          stock.price >= stock.ema50 * 0.97 &&
          stock.price <= stock.ema50 * 1.03;
        matchesStrategy =
          isUptrend && (isRsiPullback || isNearEma21 || isNearEma50);
      }

      return matchesSearch && matchesMarket && matchesStrategy;
    })
    .sort((a, b) => b.score - a.score);

  const handleAnalyzeClick = (symbol: string) => {
    setSelectedSymbol(symbol);
    navigate(`/stock/${symbol}`);
  };

  return (
    <div
      className="screener-container"
      style={{ display: "flex", flexDirection: "column", gap: "24px" }}
    >
      <div>
        <h1
          style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "6px" }}
        >
          {t("screener_overview")}
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
          {t("screener_sub")}
        </p>
      </div>

      {/* Filter and search panel */}
      <div
        className="glass-panel"
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        {/* Market selector tabs & Strategy filters */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "8px",
              backgroundColor: "rgba(0,0,0,0.2)",
              padding: "4px",
              borderRadius: "8px",
            }}
          >
            {(["all", "priority", "idx", "us"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                style={{
                  padding: "6px 14px",
                  fontSize: "0.82rem",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: market === m ? "#3b82f6" : "transparent",
                  color: market === m ? "white" : "#94a3b8",
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                }}
              >
                {m === "all"
                  ? t("all_tab")
                  : m === "priority"
                    ? t("priority_tab")
                    : m === "idx"
                      ? t("idx_tab")
                      : t("us_tab")}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: "4px",
              backgroundColor: "rgba(0,0,0,0.2)",
              padding: "4px",
              borderRadius: "8px",
            }}
          >
            {(["Scalp Trade", "Day Trade", "Swing Trade", "Position Trade"] as const).map((strat) => (
              <button
                key={strat}
                onClick={() => setSelectedStrategy(strat)}
                style={{
                  padding: "6px 14px",
                  fontSize: "0.82rem",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: selectedStrategy === strat ? "#3b82f6" : "transparent",
                  color: selectedStrategy === strat ? "white" : "#94a3b8",
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                }}
              >
                {strat.split(" ")[0]}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowPullbackOnly(!showPullbackOnly)}
            style={{
              padding: "7px 14px",
              fontSize: "0.82rem",
              borderRadius: "8px",
              border:
                "1px solid " +
                (showPullbackOnly
                  ? "rgba(59, 130, 246, 0.4)"
                  : "rgba(255, 255, 255, 0.1)"),
              cursor: "pointer",
              backgroundColor: showPullbackOnly
                ? "rgba(59, 130, 246, 0.18)"
                : "rgba(0,0,0,0.25)",
              color: showPullbackOnly ? "#60a5fa" : "#94a3b8",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
          >
            <span>🎯</span>
            {t("swing_pullback")}
          </button>
        </div>

        {/* Date Filter & Search (1 Line, No Labels) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            width: isMobile ? "100%" : "auto",
            flexWrap: "nowrap",
          }}
        >
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }

            /* Glassmorphic custom styled datepicker input */
            .custom-datepicker-input {
              background: rgba(0, 0, 0, 0.3) !important;
              border: 1px solid rgba(255, 255, 255, 0.1) !important;
              color: #fff !important;
              font-size: 0.85rem !important;
              padding: 8px 10px !important;
              border-radius: 8px !important;
              outline: none !important;
              cursor: pointer !important;
              width: 100% !important;
              text-align: center !important;
              transition: all 0.2s ease !important;
              font-weight: 500 !important;
            }
            .custom-datepicker-input:hover {
              border-color: rgba(59, 130, 246, 0.5) !important;
              background: rgba(0, 0, 0, 0.4) !important;
            }
            .custom-datepicker-input:focus {
              border-color: #3b82f6 !important;
              box-shadow: 0 0 8px rgba(59, 130, 246, 0.4) !important;
            }

            .react-datepicker-popper {
              z-index: 9999 !important;
              left: 50px !important;
            }

            /* Calendar Dropdown Premium Dark theme */
            .react-datepicker {
              background: rgba(15, 23, 42, 0.95) !important;
              border: 1px solid rgba(255, 255, 255, 0.1) !important;
              border-radius: 12px !important;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) !important;
              backdrop-filter: blur(16px) !important;
              font-family: inherit !important;
              color: #f8fafc !important;
              z-index: 9999 !important;
            }
            .react-datepicker__header {
              background: rgba(30, 41, 59, 0.7) !important;
              border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
              border-top-left-radius: 12px !important;
              border-top-right-radius: 12px !important;
              padding-top: 10px !important;
            }
            .react-datepicker__current-month, 
            .react-datepicker-time__header, 
            .react-datepicker-year-header {
              color: #f8fafc !important;
              font-weight: 600 !important;
              font-size: 0.95rem !important;
              margin-bottom: 8px !important;
            }
            .react-datepicker__day-name {
              color: #94a3b8 !important;
              font-weight: 500 !important;
              width: 1.8rem !important;
              line-height: 1.8rem !important;
              margin: 0.166rem !important;
            }
            .react-datepicker__day {
              color: #cbd5e1 !important;
              border-radius: 6px !important;
              width: 1.8rem !important;
              line-height: 1.8rem !important;
              margin: 0.166rem !important;
              transition: all 0.15s ease !important;
            }
            .react-datepicker__day:hover {
              background: rgba(59, 130, 246, 0.2) !important;
              color: #fff !important;
            }
            .react-datepicker__day--selected, 
            .react-datepicker__day--keyboard-selected {
              background: #3b82f6 !important;
              color: white !important;
              border-radius: 6px !important;
            }
            .react-datepicker__day--in-range {
              background: rgba(59, 130, 246, 0.25) !important;
              color: #93c5fd !important;
              border-radius: 0 !important;
            }
            .react-datepicker__day--range-start {
              background: #3b82f6 !important;
              color: white !important;
              border-top-left-radius: 6px !important;
              border-bottom-left-radius: 6px !important;
            }
            .react-datepicker__day--range-end {
              background: #3b82f6 !important;
              color: white !important;
              border-top-right-radius: 6px !important;
              border-bottom-right-radius: 6px !important;
            }
            .react-datepicker__day--in-selecting-range {
              background: rgba(59, 130, 246, 0.15) !important;
              color: #93c5fd !important;
            }
            .react-datepicker__day--outside-month {
              color: #475569 !important;
            }
            .react-datepicker__triangle {
              display: none !important;
            }
            .react-datepicker__navigation-icon::before {
              border-color: #94a3b8 !important;
              border-width: 2px 2px 0 0 !important;
            }
            .react-datepicker__navigation:hover *::before {
              border-color: #fff !important;
            }
            .react-datepicker__close-icon::after {
              background-color: transparent !important;
              color: #94a3b8 !important;
              font-size: 1.1rem !important;
            }
            .react-datepicker__close-icon:hover::after {
              color: #ef4444 !important;
            }
          `}</style>

          {/* Date Picker wrapper */}
          <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
            <DatePicker
              selected={date ? new Date(date) : null}
              onChange={(d: Date | null) => {
                const formatDateStr = (val: Date | null) => {
                  if (!val) return "";
                  const year = val.getFullYear();
                  const month = String(val.getMonth() + 1).padStart(2, "0");
                  const day = String(val.getDate()).padStart(2, "0");
                  return `${year}-${month}-${day}`;
                };
                setDate(formatDateStr(d));
              }}
              isClearable={true}
              dateFormat="dd/MM/yyyy"
              className="custom-datepicker-input"
              placeholderText={t("filter_date")}
              portalId="screener-datepicker-portal"
              popperProps={{ strategy: "fixed" }}
            />
          </div>

          {date && (
            <button
              onClick={() => {
                setDate("");
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#ef4444",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 600,
                padding: "4px 4px",
                flexShrink: 0,
              }}
            >
              Reset
            </button>
          )}

          {/* Search input */}
          <input
            type="text"
            placeholder={t("search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#fff",
              fontSize: "0.85rem",
              padding: "8px 12px",
              borderRadius: "8px",
              outline: "none",
              width: isMobile ? "100%" : "180px",
              flex: 1,
              minWidth: 0,
              transition: "all 0.2s ease",
            }}
          />

          {/* Perbarui button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            style={{
              background: "rgba(59, 130, 246, 0.15)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              color: "#60a5fa",
              fontSize: "0.85rem",
              padding: "8px 14px",
              borderRadius: "8px",
              cursor: refreshing || loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: 600,
              transition: "all 0.2s ease",
              flexShrink: 0,
            }}
            onMouseOver={(e) => {
              if (!refreshing && !loading) {
                e.currentTarget.style.background = "rgba(59, 130, 246, 0.25)";
                e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.5)";
                e.currentTarget.style.color = "#fff";
              }
            }}
            onMouseOut={(e) => {
              if (!refreshing && !loading) {
                e.currentTarget.style.background = "rgba(59, 130, 246, 0.15)";
                e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.3)";
                e.currentTarget.style.color = "#60a5fa";
              }
            }}
            title={
              language === "id"
                ? "Perbarui Data dari API"
                : "Refresh Data from API"
            }
          >
            <i
              className={`bx bx-refresh ${refreshing ? "bx-spin" : ""}`}
              style={{ fontSize: "1.2rem", display: "inline-block" }}
            />
            {!isMobile && (language === "id" ? "Perbarui" : "Refresh")}
          </button>
        </div>
      </div>

      {/* Main Screener Content */}
      <div className="glass-panel main-screen" style={{ padding: "24px" }}>
        {loading ? (
          <div
            style={{
              padding: "60px 40px",
              textAlign: "center",
              color: "#94a3b8",
            }}
          >
            <span
              className="live-pulse"
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: "#3b82f6",
                display: "inline-block",
                marginRight: "8px",
              }}
            ></span>
            Menghubungkan ke PostgreSQL & Yahoo Finance API...
          </div>
        ) : error ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              backgroundColor: "rgba(239, 68, 68, 0.05)",
              border: "1px dashed rgba(239, 68, 68, 0.3)",
              borderRadius: "12px",
              color: "#fca5a5",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>⚠️</div>
            <h3
              style={{
                fontSize: "1.2rem",
                fontWeight: 600,
                marginBottom: "8px",
                color: "#f87171",
              }}
            >
              Gagal Memuat Data Analisis
            </h3>
            <p
              style={{
                fontSize: "0.88rem",
                color: "#cbd5e1",
                maxWidth: "500px",
                margin: "0 auto 16px",
              }}
            >
              Terjadi kegagalan koneksi backend: <strong>{error}</strong>.
              Pastikan server backend Anda menyala dan PostgreSQL dapat diakses.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "8px 16px",
                fontSize: "0.85rem",
                backgroundColor: "rgba(239, 68, 68, 0.2)",
                color: "#f87171",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Coba Muat Ulang
            </button>
          </div>
        ) : screenerStocks.length === 0 ? (
          <div
            style={{
              padding: "50px 20px",
              textAlign: "center",
              backgroundColor: "rgba(59, 130, 246, 0.02)",
              border: "1px dashed rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              color: "#94a3b8",
            }}
          >
            <div style={{ fontSize: "2.8rem", marginBottom: "12px" }}>📊</div>
            <h3
              style={{
                fontSize: "1.2rem",
                fontWeight: 600,
                marginBottom: "8px",
                color: "#cbd5e1",
              }}
            >
              Data Hasil Analisis Kosong
            </h3>
            <p
              style={{
                fontSize: "0.88rem",
                color: "#94a3b8",
                maxWidth: "540px",
                margin: "0 auto 16px",
                lineHeight: 1.6,
              }}
            >
              Belum ada data analisis pasar hasil komputasi di database untuk
              hari ini. Buka salah satu halaman Detail Saham atau jalankan
              sinkronisasi registri untuk memicu kalkulasi algoritmik Swing
              secara otomatis.
            </p>
            <div
              style={{ display: "flex", justifyContent: "center", gap: "12px" }}
            >
              <button
                onClick={() => navigate("/settings")}
                style={{
                  padding: "8px 16px",
                  fontSize: "0.85rem",
                  backgroundColor: "rgba(59, 130, 246, 0.15)",
                  color: "#60a5fa",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Konfigurasi Pasar (Settings)
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}
          >
            Tidak ada saham yang cocok dengan kriteria pencarian atau filter
            pasar saat ini.
          </div>
        ) : isMobile ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            {filtered.map((stock) => {
              const isProfit = stock.change >= 0;
              const isPriority = watchlist.includes(stock.symbol);
              return (
                <div
                  key={stock.symbol}
                  className="glass-panel"
                  style={{
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "12px",
                    backgroundColor: "rgba(19, 23, 48, 0.8)",
                  }}
                >
                  {/* Card Header: Symbol, Star, Score */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 700,
                          color: "#60a5fa",
                        }}
                      >
                        {stock.symbol}
                      </span>
                      <span
                        onClick={() => handleToggleWatchlist(stock.symbol)}
                        style={{
                          color: isPriority ? "#f59e0b" : "#475569",
                          fontSize: "1.15rem",
                          cursor: "pointer",
                          transition: "color 0.15s ease",
                          userSelect: "none",
                        }}
                        title={
                          isPriority
                            ? "Remove from Watchlist"
                            : "Add to Watchlist"
                        }
                      >
                        {isPriority ? "★" : "☆"}
                      </span>
                    </div>
                    <div
                      style={{
                        padding: "3px 8px",
                        borderRadius: "100px",
                        backgroundColor:
                          stock.score >= 70
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(245, 158, 11, 0.15)",
                        color: stock.score >= 70 ? "#4ade80" : "#f59e0b",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                      }}
                    >
                      {stock.score} / 100
                    </div>
                  </div>

                  {/* Card Prices: Last, Change */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "#64748b",
                          display: "block",
                          marginBottom: "1px",
                        }}
                      >
                        {t("table_last")}
                      </span>
                      <strong style={{ fontSize: "1.15rem", color: "#f8fafc" }}>
                        Rp{" "}
                        {stock.price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </strong>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "#64748b",
                          display: "block",
                          marginBottom: "1px",
                        }}
                      >
                        {t("table_change")}
                      </span>
                      <strong
                        style={{
                          fontSize: "1.05rem",
                          color: isProfit ? "#10b981" : "#ef4444",
                        }}
                      >
                        {isProfit ? "↑" : "↓"}{" "}
                        {Math.abs(stock.change).toFixed(2)}%
                      </strong>
                    </div>
                  </div>

                  {/* Indicators Grid (1 Line Label & Value) */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "4px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(0, 0, 0, 0.25)",
                      fontSize: "0.72rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span style={{ color: "#64748b" }}>RSI:</span>
                      <span style={{ color: "#cbd5e1", fontWeight: 600 }}>
                        {stock.rsi.toFixed(1)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span style={{ color: "#64748b" }}>MACD:</span>
                      <span
                        style={{
                          color: "#cbd5e1",
                          fontWeight: 600,
                          fontSize: "0.7rem",
                        }}
                      >
                        {stock.macd}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span style={{ color: "#64748b" }}>Vol:</span>
                      <span style={{ color: "#06b6d4", fontWeight: 600 }}>
                        {stock.volume}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer: Date & Primary Actions */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "4px",
                    }}
                  >
                    <span style={{ color: "#94a3b8", fontSize: "0.72rem" }}>
                      {stock.date
                        ? new Date(stock.date).toLocaleDateString(
                            language === "id" ? "id-ID" : "en-US",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "-"}
                    </span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => handleAnalyzeClick(stock.symbol)}
                        style={{
                          padding: "4px 8px",
                          fontSize: "0.72rem",
                          backgroundColor: "rgba(59, 130, 246, 0.15)",
                          color: "#60a5fa",
                          border: "1px solid rgba(59, 130, 246, 0.25)",
                          cursor: "pointer",
                          borderRadius: "6px",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {t("analyze")}
                      </button>
                      <button
                        onClick={() =>
                          setBuyModalSymbol({
                            symbol: stock.symbol,
                            price: stock.price,
                          })
                        }
                        style={{
                          padding: "4px 8px",
                          fontSize: "0.72rem",
                          backgroundColor: "rgba(16, 185, 129, 0.15)",
                          color: "#4ade80",
                          border: "1px solid rgba(16, 185, 129, 0.25)",
                          cursor: "pointer",
                          borderRadius: "6px",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        Buy
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  color: "#64748b",
                  fontSize: "0.85rem",
                }}
              >
                <th style={{ padding: "12px 16px" }}>
                  <div className="tooltip-container">
                    {t("table_stock")}
                    <span
                      style={{
                        cursor: "help",
                        color: "#64748b",
                        fontSize: "0.8rem",
                      }}
                    >
                      ⓘ
                    </span>
                    <span className="tooltip-text">{tooltips.stock}</span>
                  </div>
                </th>
                <th style={{ padding: "12px 16px" }}>
                  <div className="tooltip-container">
                    {t("table_last")}
                    <span
                      style={{
                        cursor: "help",
                        color: "#64748b",
                        fontSize: "0.8rem",
                      }}
                    >
                      ⓘ
                    </span>
                    <span className="tooltip-text">{tooltips.last}</span>
                  </div>
                </th>
                <th style={{ padding: "12px 16px" }}>
                  <div className="tooltip-container">
                    {t("table_change")}
                    <span
                      style={{
                        cursor: "help",
                        color: "#64748b",
                        fontSize: "0.8rem",
                      }}
                    >
                      ⓘ
                    </span>
                    <span className="tooltip-text">{tooltips.change}</span>
                  </div>
                </th>
                <th style={{ padding: "12px 16px" }}>
                  <div className="tooltip-container">
                    {t("table_score")}
                    <span
                      style={{
                        cursor: "help",
                        color: "#64748b",
                        fontSize: "0.8rem",
                      }}
                    >
                      ⓘ
                    </span>
                    <span className="tooltip-text">{tooltips.score}</span>
                  </div>
                </th>
                <th style={{ padding: "12px 16px" }}>
                  <div className="tooltip-container">
                    {t("table_rsi")}
                    <span
                      style={{
                        cursor: "help",
                        color: "#64748b",
                        fontSize: "0.8rem",
                      }}
                    >
                      ⓘ
                    </span>
                    <span className="tooltip-text">{tooltips.rsi}</span>
                  </div>
                </th>
                <th style={{ padding: "12px 16px" }}>
                  <div className="tooltip-container">
                    {t("table_macd")}
                    <span
                      style={{
                        cursor: "help",
                        color: "#64748b",
                        fontSize: "0.8rem",
                      }}
                    >
                      ⓘ
                    </span>
                    <span className="tooltip-text">{tooltips.macd}</span>
                  </div>
                </th>
                <th style={{ padding: "12px 16px" }}>
                  <div className="tooltip-container tooltip-left">
                    {t("table_volume")}
                    <span
                      style={{
                        cursor: "help",
                        color: "#64748b",
                        fontSize: "0.8rem",
                      }}
                    >
                      ⓘ
                    </span>
                    <span className="tooltip-text">{tooltips.volume}</span>
                  </div>
                </th>
                <th style={{ padding: "12px 16px" }}>
                  <div className="tooltip-container tooltip-left">
                    {language === "id" ? "PENUTUPAN" : "CLOSING"}
                    <span
                      style={{
                        cursor: "help",
                        color: "#64748b",
                        fontSize: "0.8rem",
                      }}
                    >
                      ⓘ
                    </span>
                    <span className="tooltip-text">
                      {language === "id"
                        ? "Tanggal dan jam resmi penutupan perdagangan saham. IDX tutup pukul 16:00 WIB, US tutup pukul 16:00 EST."
                        : "Official market closing date and time. IDX closes at 16:00 WIB, US closes at 16:00 EST."}
                    </span>
                  </div>
                </th>
                <th style={{ padding: "12px 16px", width: "180px" }}>
                  <div className="tooltip-container tooltip-left">
                    {t("table_action")}
                    <span
                      style={{
                        cursor: "help",
                        color: "#64748b",
                        fontSize: "0.8rem",
                      }}
                    >
                      ⓘ
                    </span>
                    <span className="tooltip-text">{tooltips.action}</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((stock) => {
                const isProfit = stock.change >= 0;
                const isPriority = watchlist.includes(stock.symbol);
                return (
                  <tr
                    key={stock.symbol}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      fontSize: "0.9rem",
                      transition: "all 0.2s ease",
                    }}
                    className="hover-row"
                  >
                    <td
                      style={{
                        padding: "16px",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {stock.symbol}
                      <span
                        onClick={() => handleToggleWatchlist(stock.symbol)}
                        style={{
                          color: isPriority ? "#f59e0b" : "#475569",
                          fontSize: "1.15rem",
                          cursor: "pointer",
                          transition: "color 0.15s ease",
                          userSelect: "none",
                        }}
                        title={
                          isPriority
                            ? "Remove from Watchlist"
                            : "Add to Watchlist"
                        }
                      >
                        {isPriority ? "★" : "☆"}
                      </span>
                    </td>
                    <td style={{ padding: "16px" }}>
                      {stock.price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        color: isProfit ? "#10b981" : "#ef4444",
                        fontWeight: 600,
                      }}
                    >
                      {isProfit ? "↑" : "↓"} {Math.abs(stock.change).toFixed(2)}
                      %
                    </td>
                    <td style={{ padding: "16px" }}>
                      <div
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "100px",
                          backgroundColor:
                            stock.score >= 70
                              ? "rgba(16, 185, 129, 0.1)"
                              : "rgba(245, 158, 11, 0.1)",
                          color: stock.score >= 70 ? "#10b981" : "#f59e0b",
                          fontWeight: 700,
                        }}
                      >
                        {stock.score} / 100
                      </div>
                    </td>
                    <td style={{ padding: "16px" }}>{stock.rsi.toFixed(1)}</td>
                    <td style={{ padding: "16px" }}>
                      <span
                        className="tooltip-container"
                        style={{ cursor: "help" }}
                      >
                        <span style={{ textDecoration: "underline dotted" }}>
                          {stock.macd}
                        </span>
                        <span className="tooltip-text">
                          {stock.macd === "Bullish Crossover"
                            ? language === "id"
                              ? "Sinyal beli ketika garis MACD memotong ke atas garis sinyal, menunjukkan momentum naik (bullish) sedang menguat."
                              : "A buy signal when the MACD line crosses above the signal line, indicating strengthening bullish momentum."
                            : language === "id"
                              ? "Tren sedang bergerak mendatar atau melemah, garis MACD berada di bawah atau berdekatan dengan garis sinyal tanpa sinyal momentum yang jelas."
                              : "The trend is moving sideways or weakening, with the MACD line below or close to the signal line without a clear momentum signal."}
                        </span>
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        color: "#06b6d4",
                        fontWeight: 500,
                      }}
                    >
                      {stock.volume}
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        color: "#94a3b8",
                        fontSize: "0.82rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          color: "#cbd5e1",
                          fontWeight: 500,
                        }}
                      >
                        {stock.date
                          ? new Date(stock.date).toLocaleDateString(
                              language === "id" ? "id-ID" : "en-US",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : "-"}
                      </span>
                      <span
                        style={{
                          display: "block",
                          color: "#64748b",
                          fontSize: "0.78rem",
                          marginTop: "2px",
                        }}
                      >
                        {stock.date
                          ? (() => {
                              const dObj = new Date(stock.date);
                              const hrs = String(dObj.getHours()).padStart(
                                2,
                                "0",
                              );
                              const mins = String(dObj.getMinutes()).padStart(
                                2,
                                "0",
                              );
                              const secs = String(dObj.getSeconds()).padStart(
                                2,
                                "0",
                              );
                              return `${hrs}:${mins}:${secs} ${stock.symbol.endsWith(".JK") ? "WIB" : "EST"}`;
                            })()
                          : ""}
                      </span>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <button
                        onClick={() => handleAnalyzeClick(stock.symbol)}
                        style={{
                          padding: "6px 12px",
                          fontSize: "0.8rem",
                          backgroundColor: "rgba(59, 130, 246, 0.1)",
                          color: "#3b82f6",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                          cursor: "pointer",
                          borderRadius: "4px",
                        }}
                      >
                        {t("analyze")}
                      </button>
                      <button
                        onClick={() =>
                          setBuyModalSymbol({
                            symbol: stock.symbol,
                            price: stock.price,
                          })
                        }
                        style={{
                          padding: "6px 12px",
                          fontSize: "0.8rem",
                          backgroundColor: "rgba(16, 185, 129, 0.1)",
                          color: "#10b981",
                          border: "1px solid rgba(16, 185, 129, 0.2)",
                          cursor: "pointer",
                          marginLeft: "8px",
                          borderRadius: "4px",
                        }}
                      >
                        Buy
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {buyModalSymbol && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "360px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>
              Quick Buy {buyModalSymbol.symbol}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
              Harga Saat Ini:{" "}
              <strong style={{ color: "#f8fafc" }}>
                {buyModalSymbol.price}
              </strong>
            </p>
            <form
              onSubmit={handleQuickBuySubmit}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Jumlah Lembar (Shares)
                </label>
                <input
                  type="number"
                  value={buyShares}
                  onChange={(e) => setBuyShares(e.target.value)}
                  required
                  style={{
                    padding: "8px",
                    borderRadius: "4px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                  }}
                />
              </div>
              <div
                style={{
                  padding: "12px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  marginTop: "2px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                    {language === "id" ? "Total Pembayaran:" : "Total Payment:"}
                  </span>
                  <strong style={{ color: "#10b981", fontSize: "1.05rem" }}>
                    Rp{" "}
                    {(
                      (parseInt(buyShares) || 0) * buyModalSymbol.price
                    ).toLocaleString(language === "id" ? "id-ID" : "en-US")}
                  </strong>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setBuyModalSymbol(null)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "rgba(255,255,255,0.05)",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={buying}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "#10b981",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  {buying ? "..." : "Confirm Buy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Screener;

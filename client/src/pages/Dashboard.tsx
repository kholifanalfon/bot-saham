import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStockStore } from "../store/useStockStore";
import { useLanguageStore } from "../store/useLanguageStore";

interface RecommendedStock {
  symbol: string;
  price: number;
  change: number;
  score: number;
}

interface PortfolioHolding {
  symbol: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

export const Dashboard: React.FC = () => {
  const { watchlist, setSelectedSymbol } = useStockStore();
  const { t, language } = useLanguageStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedStock[]>(
    [],
  );
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [tpPercent, setTpPercent] = useState(2.0);
  const [slPercent, setSlPercent] = useState(-2.0);
  const [tslEnabled, setTslEnabled] = useState(false);
  const [tslTrigger, setTslTrigger] = useState(2.0);
  const [tslTrail, setTslTrail] = useState(1.0);

  // Responsive mobile view check
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch real-time bursa data & scores from backend (Yahoo Finance / Finnhub)
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [analysisRes, portfolioRes, settingsRes] = await Promise.all([
          fetch("http://localhost:3001/api/analysis", {
            credentials: "include",
          }),
          fetch("http://localhost:3001/api/portfolio", {
            credentials: "include",
          }),
          fetch("http://localhost:3001/api/settings", {
            credentials: "include",
          }),
        ]);

        if (analysisRes.ok) {
          const data = await analysisRes.json();
          const validResults = data
            .map((item: any) => ({
              symbol: item.symbol,
              price: item.price,
              change: item.change,
              score: item.score,
            }))
            .sort((a: any, b: any) => b.score - a.score);
          setRecommendations(validResults);
        }

        if (portfolioRes.ok) {
          const pData = await portfolioRes.json();
          setHoldings(pData.holdings || []);
        }

        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          if (sData.btst_tp_percent)
            setTpPercent(parseFloat(sData.btst_tp_percent));
          if (sData.btst_sl_percent)
            setSlPercent(parseFloat(sData.btst_sl_percent));
          if (sData.btst_tsl_enabled !== undefined)
            setTslEnabled(
              sData.btst_tsl_enabled === true ||
                sData.btst_tsl_enabled === "true",
            );
          if (sData.btst_tsl_trigger_percent)
            setTslTrigger(parseFloat(sData.btst_tsl_trigger_percent));
          if (sData.btst_tsl_trail_percent)
            setTslTrail(parseFloat(sData.btst_tsl_trail_percent));
        }
      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        setError(err.message || "Gagal terhubung.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const handleViewClick = (sym: string) => {
    setSelectedSymbol(sym);
    navigate(`/stock/${sym}`);
  };

  // Determine top absolute recommendation
  const topRec = recommendations.length > 0 ? recommendations[0] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h1
          style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "6px" }}
        >
          {t("dashboard_overview")}
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
          {t("dashboard_sub")}
        </p>
      </div>

      {/* Stats Cards Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
        }}
      >
        <div
          className="glass-panel"
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <span
            style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 600 }}
          >
            {t("active_watchlist")}
          </span>
          <span style={{ fontSize: "1.8rem", fontWeight: 700 }}>
            {watchlist.length} Stocks
          </span>
          <span style={{ fontSize: "0.78rem", color: "#10b981" }}>
            ↑ {watchlist.length} {t("items_added")}
          </span>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <span
            style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 600 }}
          >
            {t("top_recommendation")}
          </span>
          <span
            style={{
              fontSize: "1.8rem",
              fontWeight: 700,
              color: topRec ? "#10b981" : "#ef4444",
            }}
          >
            {loading ? "..." : topRec ? topRec.symbol : "N/A"}
          </span>
          <span
            style={{
              fontSize: "0.78rem",
              color: topRec ? "#10b981" : "#94a3b8",
            }}
          >
            {t("btst_score_label")}:{" "}
            {loading ? "..." : topRec ? `${topRec.score}/100` : "-"}
          </span>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <span
            style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 600 }}
          >
            {t("market_status")}
          </span>
          <span
            style={{ fontSize: "1.8rem", fontWeight: 700, color: "#10b981" }}
          >
            OPEN
          </span>
          <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
            {t("idx_closes")}
          </span>
        </div>
      </div>

      {/* Main Grid: Watchlist Details & Breakouts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "24px",
        }}
      >
        {/* Actionable Trading (TP/SL Monitor) */}
        <div
          className="glass-panel"
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            gridColumn: "1 / -1",
          }}
        >
          <h3
            style={{
              fontSize: "1.1rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            ⚡ Actionable Trading (TP/SL Monitor)
          </h3>
          <p
            style={{
              fontSize: "0.85rem",
              color: "#94a3b8",
              marginTop: "-10px",
            }}
          >
            {tslEnabled
              ? `Trailing Stop Loss (TSL) AKTIF (Trigger: ${tslTrigger}%, Trail: ${tslTrail}%)`
              : `Berdasarkan aturan TP ${tpPercent}% dan SL ${slPercent}% yang Anda tentukan di pengaturan.`}
          </p>

          {loading ? (
            <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
              Memuat status portofolio...
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: "12px",
              }}
            >
              {/* === SIMULATION EXAMPLES SECTION === */}
              {/* Mock Card 1: TLKM.JK (Demonstrates TP Reached or TSL Active) */}
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  justifyContent: "space-between",
                  alignItems: isMobile ? "stretch" : "center",
                  padding: "16px",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  position: "relative",
                  overflow: "hidden",
                  gap: isMobile ? "12px" : "16px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    backgroundColor: "#b45309",
                    color: "#fff",
                    fontSize: "0.62rem",
                    padding: "2px 10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {language === "id" ? "Simulasi Contoh" : "Simulated Example"}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    marginTop: isMobile ? "10px" : "0",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "1rem",
                      color: "#10b981",
                    }}
                  >
                    TLKM.JK
                  </span>
                  <span style={{ color: "#cbd5e1" }}>
                    Avg: 3,850 | Curr: 3,950 | P&L: <strong>+2.60%</strong>{" "}
                    (Peak: +3.0%)
                  </span>
                </div>

                <div
                  style={{
                    width: isMobile ? "100%" : "auto",
                    textAlign: isMobile ? "center" : "left",
                  }}
                >
                  {tslEnabled ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: isMobile ? "column" : "row",
                        gap: "8px",
                        width: isMobile ? "100%" : "auto",
                      }}
                    >
                      <span
                        style={{
                          display: isMobile ? "block" : "inline-block",
                          textAlign: "center",
                          padding: "6px 12px",
                          borderRadius: "100px",
                          fontWeight: "bold",
                          background: "rgba(59, 130, 246, 0.2)",
                          color: "#60a5fa",
                          border: "1px solid rgba(59, 130, 246, 0.4)",
                          fontSize: "0.78rem",
                          width: isMobile ? "100%" : "auto",
                        }}
                      >
                        🚀 HOLD (RIDING - TSL ACTIVE)
                      </span>
                      <button
                        style={{
                          display: isMobile ? "block" : "inline-block",
                          textAlign: "center",
                          padding: "6px 12px",
                          borderRadius: "100px",
                          fontWeight: "bold",
                          background: "rgba(239, 68, 68, 0.2)",
                          color: "#f87171",
                          border: "1px solid rgba(239, 68, 68, 0.4)",
                          fontSize: "0.78rem",
                          width: isMobile ? "100%" : "auto",
                          cursor: "pointer",
                        }}
                        onClick={() =>
                          alert("Simulasi: Eksekusi Jual Manual Berhasil!")
                        }
                      >
                        SELL NOW (MANUAL)
                      </button>
                    </div>
                  ) : (
                    <span
                      style={{
                        display: isMobile ? "block" : "inline-block",
                        textAlign: "center",
                        padding: "6px 12px",
                        borderRadius: "100px",
                        fontWeight: "bold",
                        background: "#10b981",
                        color: "#fff",
                        fontSize: "0.78rem",
                        width: isMobile ? "100%" : "auto",
                      }}
                    >
                      SELL NOW (TP REACHED)
                    </span>
                  )}
                </div>
              </div>

              {/* Mock Card 2: GOTO.JK (Demonstrates SL Reached or TSL Trailed Exit) */}
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  justifyContent: "space-between",
                  alignItems: isMobile ? "stretch" : "center",
                  padding: "16px",
                  background: tslEnabled
                    ? "rgba(245, 158, 11, 0.1)"
                    : "rgba(239, 68, 68, 0.1)",
                  border: `1px solid ${tslEnabled ? "rgba(245, 158, 11, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  position: "relative",
                  overflow: "hidden",
                  gap: isMobile ? "12px" : "16px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    backgroundColor: "#b45309",
                    color: "#fff",
                    fontSize: "0.62rem",
                    padding: "2px 10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {language === "id" ? "Simulasi Contoh" : "Simulated Example"}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    marginTop: isMobile ? "10px" : "0",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "1rem",
                      color: tslEnabled ? "#f59e0b" : "#ef4444",
                    }}
                  >
                    GOTO.JK
                  </span>
                  {tslEnabled ? (
                    <span style={{ color: "#cbd5e1" }}>
                      Avg: 60 | Curr: 61 | P&L: <strong>+1.66%</strong> (Turun
                      dari Peak: +3.5%)
                    </span>
                  ) : (
                    <span style={{ color: "#cbd5e1" }}>
                      Avg: 60 | Curr: 58 | P&L: <strong>-3.33%</strong>
                    </span>
                  )}
                </div>
                <div
                  style={{
                    width: isMobile ? "100%" : "auto",
                    textAlign: isMobile ? "center" : "left",
                  }}
                >
                  {tslEnabled ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: isMobile ? "column" : "row",
                        gap: "8px",
                        width: isMobile ? "100%" : "auto",
                      }}
                    >
                      <span
                        style={{
                          display: isMobile ? "block" : "inline-block",
                          textAlign: "center",
                          padding: "6px 12px",
                          borderRadius: "100px",
                          fontWeight: "bold",
                          background: "#f59e0b",
                          color: "#fff",
                          fontSize: "0.78rem",
                          width: isMobile ? "100%" : "auto",
                        }}
                      >
                        ⚠️ SELL NOW (TRAILED EXIT)
                      </span>
                      <button
                        style={{
                          display: isMobile ? "block" : "inline-block",
                          textAlign: "center",
                          padding: "6px 12px",
                          borderRadius: "100px",
                          fontWeight: "bold",
                          background: "rgba(239, 68, 68, 0.2)",
                          color: "#f87171",
                          border: "1px solid rgba(239, 68, 68, 0.4)",
                          fontSize: "0.78rem",
                          width: isMobile ? "100%" : "auto",
                          cursor: "pointer",
                        }}
                        onClick={() =>
                          alert("Simulasi: Eksekusi Jual Manual Berhasil!")
                        }
                      >
                        SELL NOW (MANUAL)
                      </button>
                    </div>
                  ) : (
                    <span
                      style={{
                        display: isMobile ? "block" : "inline-block",
                        textAlign: "center",
                        padding: "6px 12px",
                        borderRadius: "100px",
                        fontWeight: "bold",
                        background: "#ef4444",
                        color: "#fff",
                        fontSize: "0.78rem",
                        width: isMobile ? "100%" : "auto",
                      }}
                    >
                      CUT LOSS (SL REACHED)
                    </span>
                  )}
                </div>
              </div>
              {/* === END OF SIMULATION SECTION === */}

              {holdings.length > 0 && (
                <div
                  style={{
                    borderTop: "1px dashed rgba(255,255,255,0.08)",
                    margin: "8px 0",
                    gridColumn: "1 / -1",
                  }}
                ></div>
              )}

              {holdings.map((h) => {
                const isTpReached = h.pnlPercent >= tpPercent;
                const isSlReached = h.pnlPercent <= slPercent;
                const isActionable = isTpReached || isSlReached;

                if (!isActionable) {
                  return (
                    <div
                      key={h.symbol}
                      style={{
                        display: "flex",
                        flexDirection: isMobile ? "column" : "row",
                        justifyContent: "space-between",
                        alignItems: isMobile ? "stretch" : "center",
                        padding: "12px",
                        background: "rgba(255,255,255,0.02)",
                        borderRadius: "8px",
                        fontSize: "0.85rem",
                        gap: isMobile ? "8px" : "12px",
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{h.symbol}</span>
                      <span style={{ color: "#94a3b8" }}>
                        HOLD (P&L: {h.pnlPercent.toFixed(2)}%)
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={h.symbol}
                    style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      justifyContent: "space-between",
                      alignItems: isMobile ? "stretch" : "center",
                      padding: "16px",
                      background: isTpReached
                        ? "rgba(16, 185, 129, 0.1)"
                        : "rgba(239, 68, 68, 0.1)",
                      border: `1px solid ${isTpReached ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      gap: isMobile ? "12px" : "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "1rem",
                          color: isTpReached ? "#10b981" : "#ef4444",
                        }}
                      >
                        {h.symbol}
                      </span>
                      <span style={{ color: "#cbd5e1" }}>
                        Avg: {h.avgPrice} | Curr: {h.currentPrice} | P&L:{" "}
                        <strong>{h.pnlPercent.toFixed(2)}%</strong>
                      </span>
                    </div>
                    <div
                      style={{
                        width: isMobile ? "100%" : "auto",
                        textAlign: isMobile ? "center" : "left",
                      }}
                    >
                      <span
                        style={{
                          display: isMobile ? "block" : "inline-block",
                          textAlign: "center",
                          padding: "6px 12px",
                          borderRadius: "100px",
                          fontWeight: "bold",
                          background: isTpReached ? "#10b981" : "#ef4444",
                          color: "#fff",
                          fontSize: "0.78rem",
                          width: isMobile ? "100%" : "auto",
                        }}
                      >
                        {isTpReached
                          ? "SELL NOW (TP REACHED)"
                          : "CUT LOSS (SL REACHED)"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recommended Stocks */}
        <div
          className="glass-panel"
          style={{ padding: "24px", gridColumn: isMobile ? "auto" : "span 2" }}
        >
          <h3
            style={{
              fontSize: "1.1rem",
              fontWeight: 600,
              marginBottom: "16px",
            }}
          >
            {t("top_btst_recs")}
          </h3>

          {loading ? (
            <div
              style={{
                padding: "30px 10px",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: "0.88rem",
              }}
            >
              <span
                className="live-pulse"
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#3b82f6",
                  display: "inline-block",
                  marginRight: "8px",
                }}
              ></span>
              Memuat data rekomendasi...
            </div>
          ) : error ? (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "#ef4444",
                fontSize: "0.85rem",
              }}
            >
              ⚠️ Gagal memuat rekomendasi: {error}
            </div>
          ) : recommendations.length === 0 ? (
            <div
              style={{
                padding: "30px 10px",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: "0.85rem",
                border: "1px dashed rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.01)",
              }}
            >
              📭 Belum ada rekomendasi BTST terhitung di database hari ini.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: "12px",
              }}
            >
              {recommendations.slice(0, 6).map((stock) => {
                return (
                  <div
                    key={stock.symbol}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.04)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 600 }}>{stock.symbol}</span>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#94a3b8",
                          display: "flex",
                          gap: "8px",
                          marginTop: "4px",
                        }}
                      >
                        <span style={{ color: "#10b981" }}>
                          TP: {(stock.price * (1 + tpPercent / 100)).toFixed(0)}
                        </span>
                        <span style={{ color: "#ef4444" }}>
                          SL: {(stock.price * (1 + slPercent / 100)).toFixed(0)}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                      }}
                    >
                      <div
                        style={{
                          padding: "4px 10px",
                          borderRadius: "100px",
                          backgroundColor:
                            stock.score >= 70
                              ? "rgba(16, 185, 129, 0.1)"
                              : "rgba(245, 158, 11, 0.1)",
                          color: stock.score >= 70 ? "#10b981" : "#f59e0b",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                        }}
                      >
                        Score: {stock.score}
                      </div>
                      <button
                        onClick={() => handleViewClick(stock.symbol)}
                        style={{
                          padding: "6px 12px",
                          fontSize: "0.8rem",
                          backgroundColor: "rgba(59, 130, 246, 0.1)",
                          color: "#3b82f6",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                          cursor: "pointer",
                        }}
                      >
                        {t("view")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Insight panel */}
        <div
          className="glass-panel"
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>
            {t("daily_ai_insight")}
          </h3>
          <div
            style={{
              padding: "16px",
              borderRadius: "8px",
              backgroundColor: "rgba(6, 182, 212, 0.05)",
              border: "1px solid rgba(6, 182, 212, 0.15)",
              fontSize: "0.85rem",
              lineHeight: 1.6,
              color: "#cbd5e1",
            }}
          >
            {language === "id"
              ? "Sentimen pasar tetap didominasi oleh perbankan (BBCA, BBRI) karena data pertumbuhan kredit yang kuat. Perhatikan tanda-tanda pantulan support GOTO di EMA 50-periode. Fokus pada strategi BTST untuk saham breakout konstituen LQ45."
              : "Market sentiment remains predominantly bullish on financials (BBCA, BBRI) due to strong credit growth data. Watch out for GOTO support rebound markers at 50-period EMA. Focus on BTST strategies for LQ45 constituent breakouts."}
          </div>
          <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
            {t("powered_by_gemini")}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

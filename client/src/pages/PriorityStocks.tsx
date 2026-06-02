import React, { useState, useEffect } from "react";
import { useStockStore } from "../store/useStockStore";
import { useLanguageStore } from "../store/useLanguageStore";
import { useNavigate } from "react-router-dom";

interface WatchlistStockDetails {
  symbol: string;
  price: number;
  change: number;
  score: number;
}

export const PriorityStocks: React.FC = () => {
  const { watchlist, addToWatchlist, removeFromWatchlist, fetchWatchlist, setSelectedSymbol } = useStockStore();
  const { t, language } = useLanguageStore();
  const navigate = useNavigate();

  const [newSymbol, setNewSymbol] = useState("");
  const [analysisData, setAnalysisData] = useState<WatchlistStockDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Responsive check
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch real-time bursa snapshot data so we can map details for watchlisted items
  const loadWatchlistMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:3001/api/analysis", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        const mapped = data.map((item: any) => ({
          symbol: item.symbol,
          price: item.price,
          change: item.change,
          score: item.score,
        }));
        setAnalysisData(mapped);
      }
    } catch (err) {
      console.error("Failed to load metrics for priority watchlist:", err);
    } finally {
      setLoading(false);
    }
  };

  // On mount: Fetch database watchlist and bursa analysis metrics
  useEffect(() => {
    fetchWatchlist();
    loadWatchlistMetrics();
  }, [fetchWatchlist]);

  const handleAddSymbol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol) return;
    
    setAdding(true);
    const formattedSymbol = newSymbol.toUpperCase().trim();
    try {
      await addToWatchlist(formattedSymbol);
      setNewSymbol("");
      // Reload metrics to fetch details if newly added
      await loadWatchlistMetrics();
    } catch (err) {
      console.error("Failed to add stock to priority database:", err);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveSymbol = async (symbol: string) => {
    try {
      await removeFromWatchlist(symbol);
    } catch (err) {
      console.error("Failed to remove stock from priority database:", err);
    }
  };

  const handleAnalyzeClick = (symbol: string) => {
    setSelectedSymbol(symbol);
    navigate(`/stock/${symbol}`);
  };

  // Filter bursa metrics to only display watchlisted items
  const watchlistedStocks = watchlist.map((symbol) => {
    const details = analysisData.find((stock) => stock.symbol.toUpperCase() === symbol.toUpperCase());
    return {
      symbol,
      price: details?.price || 0,
      change: details?.change || 0,
      score: details?.score || 0,
      hasDetails: !!details,
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "6px" }}>
          📌 {language === "id" ? "Saham Prioritas" : "Priority Stocks"}
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
          {language === "id"
            ? "Kelola saham pilihan prioritas utama Anda yang tersinkronisasi langsung dengan database."
            : "Manage your premium priority stock watchlists, fully synchronized in real-time with the database."}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 2fr", gap: "24px" }}>
        
        {/* Left Column: Form to Add Stock */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>
              {language === "id" ? "Tambah Saham Prioritas" : "Add Priority Stock"}
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", lineHeight: 1.4 }}>
              {language === "id"
                ? "Masukkan simbol ticker saham (misal BBRI.JK atau AAPL) untuk ditambahkan langsung ke database."
                : "Enter a stock ticker symbol (e.g., BBRI.JK or AAPL) to register it directly into the database."}
            </p>

            <form onSubmit={handleAddSymbol} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input
                type="text"
                placeholder="e.g. BBCA.JK, TSLA"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                style={{
                  background: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#fff",
                  fontSize: "0.85rem",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  outline: "none",
                }}
                required
                disabled={adding}
              />
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ padding: "10px", width: "100%", fontWeight: 600 }}
                disabled={adding}
              >
                {adding ? "..." : language === "id" ? "Tambahkan ke Database" : "Add to Database"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Watchlist Grid */}
        <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>
              📋 {language === "id" ? "Daftar Pantau Aktif" : "Active Watchlist"}
            </h3>
            <span style={{ fontSize: "0.8rem", color: "#3b82f6", fontWeight: 600, backgroundColor: "rgba(59, 130, 246, 0.1)", padding: "4px 10px", borderRadius: "100px" }}>
              {watchlist.length} {language === "id" ? "Saham" : "Stocks"}
            </span>
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
              <span className="live-pulse" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#3b82f6", display: "inline-block", marginRight: "8px" }} />
              Syncing database...
            </div>
          ) : watchlistedStocks.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {watchlistedStocks.map((stock) => {
                const isProfit = stock.change >= 0;
                return (
                  <div
                    key={stock.symbol}
                    style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      justifyContent: "space-between",
                      alignItems: isMobile ? "stretch" : "center",
                      padding: "16px",
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.04)",
                      gap: "12px",
                    }}
                  >
                    {/* Left info */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#60a5fa" }}>{stock.symbol}</span>
                      <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                        {stock.hasDetails ? (
                          <>
                            Rp {stock.price.toLocaleString(undefined, { minimumFractionDigits: 2 })} (
                            <span style={{ color: isProfit ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                              {isProfit ? "↑" : "↓"} {Math.abs(stock.change).toFixed(2)}%
                            </span>
                            )
                          </>
                        ) : (
                          language === "id" ? "Detail harga belum tersedia" : "No pricing details yet"
                        )}
                      </span>
                    </div>

                    {/* Right actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: isMobile ? "space-between" : "flex-end" }}>
                      {stock.hasDetails && (
                        <div style={{
                          padding: "4px 10px",
                          borderRadius: "100px",
                          backgroundColor: stock.score >= 70 ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                          color: stock.score >= 70 ? "#10b981" : "#f59e0b",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                        }}>
                          Score: {stock.score}
                        </div>
                      )}
                      
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleAnalyzeClick(stock.symbol)}
                          style={{
                            padding: "6px 12px",
                            fontSize: "0.78rem",
                            backgroundColor: "rgba(59, 130, 246, 0.12)",
                            color: "#3b82f6",
                            border: "1px solid rgba(59, 130, 246, 0.25)",
                            cursor: "pointer",
                            borderRadius: "6px",
                            fontWeight: 600,
                          }}
                        >
                          {language === "id" ? "Analisis" : "Analyze"}
                        </button>
                        <button
                          onClick={() => handleRemoveSymbol(stock.symbol)}
                          style={{
                            padding: "6px 12px",
                            fontSize: "0.78rem",
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                            color: "#ef4444",
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                            cursor: "pointer",
                            borderRadius: "6px",
                            fontWeight: 600,
                          }}
                        >
                          {language === "id" ? "Hapus" : "Remove"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b", fontSize: "0.9rem", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "12px" }}>
              📭 {language === "id"
                ? "Daftar saham prioritas Anda kosong. Tambahkan saham baru dari panel sebelah kiri atau klik bintang di halaman Screener!"
                : "Your priority watchlist is empty. Add a new stock from the left panel or click a star on the Screener!"}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PriorityStocks;

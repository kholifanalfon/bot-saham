import React, { useState, useEffect, useRef } from "react";
import { useLanguageStore } from "../store/useLanguageStore";
import { useNavigate } from "react-router-dom";
import { useStockStore } from "../store/useStockStore";

interface RegisteredStock {
  symbol: string;
  name: string;
  market: string;
  isActive: boolean;
}

export const StockRegistry: React.FC = () => {
  const { t, language } = useLanguageStore();
  const { setSelectedSymbol } = useStockStore();
  const navigate = useNavigate();

  const [stocks, setStocks] = useState<RegisteredStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync state variables
  const [syncingRegistry, setSyncingRegistry] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [marketFilter, setMarketFilter] = useState<"all" | "idx" | "us">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Responsive check
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Scroll to bottom when logs update
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  // Clean up SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const fetchRegistry = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("http://localhost:3001/api/stocks/registry", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch stock registry data");
      }
      const data = await response.json();
      setStocks(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || (language === "id" ? "Gagal memuat registri saham." : "Failed to load stock registry."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistry();
  }, []);

  const handleAnalyzeClick = (symbol: string) => {
    setSelectedSymbol(symbol);
    navigate(`/stock/${symbol}`);
  };

  const handleSyncStocks = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConsoleLogs([]);
    setShowConsole(true);
    setSyncStatus("running");
    setSyncingRegistry(true);

    const apiBaseUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;
    const es = new EventSource(`${apiBaseUrl}/api/settings/sync-stocks/stream`, {
      withCredentials: true
    });

    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'stdout' || payload.type === 'stderr') {
          const lines = payload.message.split('\n').filter((l: string) => l.trim() !== '');
          if (lines.length > 0) {
            setConsoleLogs(prev => [...prev, ...lines]);
          }
        } else if (payload.type === 'exit') {
          if (payload.code === 0) {
            setSyncStatus("success");
            setConsoleLogs(prev => [...prev, language === 'id' ? "[Sistem] Sinkronisasi registri saham berhasil diselesaikan!" : "[System] Stock registry synchronization completed successfully!"]);
            // Refresh table automatically
            fetchRegistry();
          } else {
            setSyncStatus("error");
            setConsoleLogs(prev => [...prev, language === 'id' ? `[Sistem] Proses keluar dengan kode status: ${payload.code}` : `[System] Process exited with status code: ${payload.code}`]);
          }
          setSyncingRegistry(false);
          es.close();
        } else if (payload.type === 'error') {
          setSyncStatus("error");
          setConsoleLogs(prev => [...prev, `[System Error] ${payload.message}`]);
          setSyncingRegistry(false);
          es.close();
        }
      } catch (err) {
        console.error("Failed to parse log stream event:", err);
      }
    };

    es.onerror = (err) => {
      console.error("EventSource encountered an error:", err);
      setSyncStatus("error");
      setConsoleLogs(prev => [...prev, language === 'id' ? "[Sistem Error] Koneksi ke server terputus." : "[System Error] Connection to server lost."]);
      setSyncingRegistry(false);
      es.close();
    };
  };

  const handleCancelSync = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setSyncStatus("idle");
    setSyncingRegistry(false);
    setConsoleLogs(prev => [...prev, language === 'id' ? "[Sistem] Sinkronisasi dibatalkan oleh pengguna." : "[System] Sync cancelled by user."]);
  };

  // Filter logic
  const filteredStocks = stocks.filter((stock) => {
    const matchesSearch =
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (stock.name && stock.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMarket =
      marketFilter === "all" ||
      (marketFilter === "idx" && stock.market.toLowerCase() === "idx") ||
      (marketFilter === "us" && stock.market.toLowerCase() === "us");

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && stock.isActive) ||
      (statusFilter === "inactive" && !stock.isActive);

    return matchesSearch && matchesMarket && matchesStatus;
  }).sort((a, b) => (a.name || a.symbol).localeCompare(b.name || b.symbol));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "6px" }}>
            🗂️ {language === "id" ? "Registri Saham" : "Stock Registry"}
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
            {language === "id"
              ? "Daftar seluruh saham aktif dan tidak aktif yang tersinkronisasi di dalam database sistem."
              : "List of all active and inactive stocks synchronized in the system database."}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSyncStocks}
          disabled={syncingRegistry}
          style={{
            padding: "8px 16px",
            fontSize: "0.8rem",
            borderRadius: "6px",
            border: "1px solid rgba(59, 130, 246, 0.4)",
            cursor: syncingRegistry ? "not-allowed" : "pointer",
            backgroundColor: syncingRegistry ? "rgba(59, 130, 246, 0.1)" : "transparent",
            color: "#60a5fa",
            fontWeight: 600,
            transition: "all 0.2s ease",
            outline: "none",
            display: "flex",
            alignItems: "center",
          }}
        >
          <i 
            className={`bx bx-refresh ${syncingRegistry ? "bx-spin" : ""}`} 
            style={{ fontSize: "1.15rem", display: "inline-block" }}
          />
          <span>
            {syncingRegistry
              ? language === "id"
                ? "Menyingkronkan..."
                : "Syncing..."
              : language === "id"
              ? "Sinkronisasi Registri Saham"
              : "Sync Stock Registry"}
          </span>
        </button>
      </div>

      {showConsole && (
        <div
          style={{
            borderRadius: "8px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backgroundColor: "rgba(10, 15, 30, 0.8)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            overflow: "hidden",
            fontFamily: "Courier New, Consolas, monospace",
            fontSize: "0.82rem",
            color: "#e2e8f0",
          }}
        >
          {/* Header bar */}
          <div
            style={{
              backgroundColor: "rgba(30, 41, 59, 0.5)",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                className={syncStatus === "running" ? "live-pulse" : ""}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor:
                    syncStatus === "running"
                      ? "#3b82f6"
                      : syncStatus === "success"
                      ? "#10b981"
                      : syncStatus === "error"
                      ? "#ef4444"
                      : "#94a3b8",
                  display: "inline-block",
                }}
              />
              <span style={{ fontWeight: 600, color: "#94a3b8" }}>
                {language === "id" ? "Proses Sinkronisasi" : "Sync Process Logs"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {syncStatus === "running" && (
                <button
                  type="button"
                  onClick={handleCancelSync}
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.2)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#ef4444",
                    borderRadius: "4px",
                    padding: "2px 8px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  {language === "id" ? "Batal" : "Cancel"}
                </button>
              )}
              {(syncStatus === "success" || syncStatus === "error" || syncStatus === "idle") && (
                <button
                  type="button"
                  onClick={() => setShowConsole(false)}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#cbd5e1",
                    borderRadius: "4px",
                    padding: "2px 8px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  {language === "id" ? "Tutup" : "Close"}
                </button>
              )}
            </div>
          </div>

          {/* Log display */}
          <div
            ref={logContainerRef}
            style={{
              maxHeight: "250px",
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {consoleLogs.length === 0 ? (
              <div style={{ color: "#64748b", fontStyle: "italic" }}>
                {language === "id" ? "Menunggu keluaran proses..." : "Waiting for process output..."}
              </div>
            ) : (
              consoleLogs.map((log, idx) => {
                let color = "#cbd5e1"; // default
                if (log.includes("Error") || log.includes("error") || log.includes("FAILED") || log.includes("[System Error]")) {
                  color = "#f87171"; // redish
                } else if (log.includes("success") || log.includes("Sukses") || log.includes("successfully") || log.includes("Selesai") || log.includes("completed")) {
                  color = "#34d399"; // greenish
                } else if (log.includes("npm run") || log.startsWith(">")) {
                  color = "#60a5fa"; // blueish command info
                }
                
                return (
                  <div key={idx} style={{ color, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {log}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* Controls Panel (Search & Filters) */}
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "center",
          gap: "16px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "20px"
        }}>
          {/* Search Input */}
          <div style={{ flex: 1, position: "relative" }}>
            <input
              type="text"
              placeholder={language === "id" ? "Cari kode saham atau nama perusahaan..." : "Search by stock code or company name..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#fff",
                fontSize: "0.88rem",
                padding: "10px 14px",
                borderRadius: "8px",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "0.85rem"
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {/* Market Filter */}
            <div style={{ display: "flex", backgroundColor: "rgba(0, 0, 0, 0.25)", padding: "3px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
              {(["all", "idx", "us"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMarketFilter(m)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "none",
                    backgroundColor: marketFilter === m ? "#3b82f6" : "transparent",
                    color: marketFilter === m ? "#fff" : "#94a3b8",
                    transition: "all 0.15s ease"
                  }}
                >
                  {m === "all" ? (language === "id" ? "Semua Pasar" : "All Markets") : m.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div style={{ display: "flex", backgroundColor: "rgba(0, 0, 0, 0.25)", padding: "3px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
              {(["all", "active", "inactive"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "none",
                    backgroundColor: statusFilter === s ? "#3b82f6" : "transparent",
                    color: statusFilter === s ? "#fff" : "#94a3b8",
                    transition: "all 0.15s ease"
                  }}
                >
                  {s === "all" 
                    ? (language === "id" ? "Semua Status" : "All Status")
                    : s === "active"
                    ? (language === "id" ? "Aktif" : "Active")
                    : (language === "id" ? "Tidak Aktif" : "Inactive")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List Table */}
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
            <span className="live-pulse" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#3b82f6", display: "inline-block", marginRight: "8px" }} />
            {language === "id" ? "Memuat registri..." : "Loading registry..."}
          </div>
        ) : error ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#f87171", border: "1px dashed rgba(239, 68, 68, 0.3)", borderRadius: "8px" }}>
            {error}
          </div>
        ) : filteredStocks.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b", fontSize: "0.9rem", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "12px" }}>
            🔍 {language === "id" ? "Tidak ada saham yang sesuai kriteria pencarian." : "No stocks match your search criteria."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", color: "#94a3b8", fontWeight: 600 }}>
                  <th style={{ padding: "12px 16px" }}>{language === "id" ? "KODE SAHAM" : "SYMBOL"}</th>
                  <th style={{ padding: "12px 16px" }}>{language === "id" ? "NAMA PERUSAHAAN" : "COMPANY NAME"}</th>
                  <th style={{ padding: "12px 16px" }}>{language === "id" ? "BURSA/PASAR" : "MARKET"}</th>
                  <th style={{ padding: "12px 16px" }}>STATUS</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>{language === "id" ? "AKSI" : "ACTION"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((stock) => (
                  <tr
                    key={stock.symbol}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      backgroundColor: "transparent",
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.02)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    {/* Symbol */}
                    <td style={{ padding: "14px 16px", fontWeight: 700, color: "#60a5fa" }}>
                      {stock.symbol}
                    </td>
                    {/* Company Name */}
                    <td style={{ padding: "14px 16px", color: "#e2e8f0" }}>
                      {stock.name || "-"}
                    </td>
                    {/* Market */}
                    <td style={{ padding: "14px 16px", color: "#94a3b8" }}>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        backgroundColor: stock.market.toLowerCase() === "idx" ? "rgba(16, 185, 129, 0.15)" : "rgba(139, 92, 246, 0.15)",
                        color: stock.market.toLowerCase() === "idx" ? "#10b981" : "#c084fc"
                      }}>
                        {stock.market.toUpperCase()}
                      </span>
                    </td>
                    {/* Status Badge */}
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 10px",
                          borderRadius: "20px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          backgroundColor: stock.isActive
                            ? "rgba(34, 197, 94, 0.15)"
                            : "rgba(239, 68, 68, 0.15)",
                          color: stock.isActive ? "#4ade80" : "#f87171",
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: stock.isActive ? "#22c55e" : "#ef4444",
                          }}
                        />
                        {stock.isActive 
                          ? (language === "id" ? "Aktif" : "Active") 
                          : (language === "id" ? "Tidak Aktif" : "Inactive")}
                      </span>
                    </td>
                    {/* Actions */}
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
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
                          transition: "all 0.2s ease"
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
                          e.currentTarget.style.borderColor = "#3b82f6";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.12)";
                          e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.25)";
                        }}
                      >
                        {language === "id" ? "Analisis" : "Analyze"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockRegistry;

import React, { useState, useEffect, useRef } from "react";
import { useLanguageStore } from "../store/useLanguageStore";
import { useNavigate } from "react-router-dom";
import { useStockStore } from "../store/useStockStore";

interface RegisteredStock {
  symbol: string;
  name: string;
  market: string;
  isActive: boolean;
  category?: string;
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

  // Add Stock Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSymbolInput, setAddSymbolInput] = useState("");
  const [addLookupResult, setAddLookupResult] = useState<{ name: string; market: string; fullSymbol: string; found: boolean } | null>(null);
  const [addLookupLoading, setAddLookupLoading] = useState(false);
  const [addSubmitLoading, setAddSubmitLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [addIngesting, setAddIngesting] = useState<string | null>(null); // symbol being ingested

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

  const apiBaseUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;

  const handleOpenAddModal = () => {
    setShowAddModal(true);
    setAddSymbolInput("");
    setAddLookupResult(null);
    setAddError(null);
    setAddSuccess(null);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setAddSymbolInput("");
    setAddLookupResult(null);
    setAddError(null);
    setAddSuccess(null);
  };

  const handleLookup = async () => {
    if (!addSymbolInput.trim()) return;
    setAddLookupLoading(true);
    setAddLookupResult(null);
    setAddError(null);
    setAddSuccess(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/stocks/lookup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: addSymbolInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      setAddLookupResult(data);
    } catch (err: any) {
      setAddError(err.message || (language === "id" ? "Gagal mencari informasi saham." : "Failed to look up stock info."));
    } finally {
      setAddLookupLoading(false);
    }
  };

  const handleAddStock = async () => {
    if (!addLookupResult) return;
    setAddSubmitLoading(true);
    setAddError(null);
    setAddSuccess(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/stocks/add`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: addLookupResult.fullSymbol,
          name: addLookupResult.name,
          market: addLookupResult.market,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add stock");

      const successMsg = language === "id"
        ? `✅ ${data.symbol} berhasil ditambahkan! Mengambil data pasar...`
        : `✅ ${data.symbol} added! Fetching market data...`;
      setAddSuccess(successMsg);
      await fetchRegistry();

      // If server started background ingestion, show progress and re-fetch after delay
      if (data.ingesting) {
        setAddIngesting(data.symbol);
        setTimeout(() => handleCloseAddModal(), 1000);
        // Re-fetch after ~10s to pick up ingested data
        setTimeout(() => {
          fetchRegistry();
          setAddIngesting(null);
        }, 10000);
      } else {
        setTimeout(() => handleCloseAddModal(), 1800);
      }
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAddSubmitLoading(false);
    }
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

      {/* ===== INGESTION PROGRESS BANNER ===== */}
      {addIngesting && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 20px",
          background: "linear-gradient(90deg, rgba(99,102,241,0.15) 0%, rgba(16,185,129,0.1) 100%)",
          border: "1px solid rgba(99,102,241,0.35)",
          borderRadius: "10px",
          fontSize: "0.88rem",
          color: "#a5b4fc",
          fontWeight: 500,
        }}>
          <i className="bx bx-loader-alt bx-spin" style={{ fontSize: "1.2rem", color: "#818cf8", flexShrink: 0 }} />
          <span>
            {language === "id"
              ? <>Mengambil & menghitung data teknikal untuk <strong style={{ color: "#c7d2fe" }}>{addIngesting}</strong> di background. Tabel akan diperbarui otomatis dalam beberapa detik...</>
              : <>Fetching & computing technical data for <strong style={{ color: "#c7d2fe" }}>{addIngesting}</strong> in background. Table will auto-refresh shortly...</>}
          </span>
          <button
            onClick={() => setAddIngesting(null)}
            style={{ marginLeft: "auto", background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.85rem", flexShrink: 0 }}
          >✕</button>
        </div>
      )}

      {/* ===== ADD STOCK MODAL ===== */}
      {showAddModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          backgroundColor: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(20,30,55,0.98) 100%)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            borderRadius: "16px",
            padding: "32px",
            width: "100%",
            maxWidth: "480px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
                  ✨ {language === "id" ? "Tambah Saham ke Registri" : "Add Stock to Registry"}
                </h2>
                <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>
                  {language === "id"
                    ? "Nama perusahaan akan dicari otomatis via Gemini AI"
                    : "Company name will be auto-fetched via Gemini AI"}
                </p>
              </div>
              <button onClick={handleCloseAddModal} style={{ background: "none", border: "none", color: "#64748b", fontSize: "1.3rem", cursor: "pointer", padding: "4px" }}>✕</button>
            </div>

            {/* Symbol Input + Lookup */}
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                id="add-stock-symbol-input"
                type="text"
                placeholder={language === "id" ? "Kode saham (mis. BBCA, AAPL)" : "Stock code (e.g. BBCA, AAPL)"}
                value={addSymbolInput}
                onChange={(e) => { setAddSymbolInput(e.target.value.toUpperCase()); setAddLookupResult(null); setAddError(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                style={{
                  flex: 1,
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontSize: "0.9rem",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  outline: "none",
                  fontWeight: 700,
                  letterSpacing: "0.04em"
                }}
              />
              <button
                id="add-stock-lookup-btn"
                onClick={handleLookup}
                disabled={!addSymbolInput.trim() || addLookupLoading}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "1px solid rgba(99, 102, 241, 0.5)",
                  background: addLookupLoading ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.2)",
                  color: "#818cf8",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: (addLookupLoading || !addSymbolInput.trim()) ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: "6px",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s"
                }}
              >
                {addLookupLoading ? (
                  <i className="bx bx-loader-alt bx-spin" style={{ fontSize: "1rem" }} />
                ) : (
                  <i className="bx bx-search-alt" style={{ fontSize: "1rem" }} />
                )}
                {language === "id" ? "Cari" : "Lookup"}
              </button>
            </div>

            {/* Lookup Result Card */}
            {addLookupResult && (
              <div style={{
                background: "rgba(16, 185, 129, 0.05)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: "10px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "1.1rem" }}>🤖</span>
                  <span style={{ fontSize: "0.78rem", color: "#10b981", fontWeight: 600 }}>
                    {language === "id" ? "Hasil dari Gemini AI" : "Result from Gemini AI"}
                    {!addLookupResult.found && (
                      <span style={{ color: "#f59e0b", marginLeft: "8px" }}>
                        ({language === "id" ? "perkiraan" : "estimated"})
                      </span>
                    )}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "2px" }}>{language === "id" ? "NAMA PERUSAHAAN" : "COMPANY NAME"}</div>
                    <input
                      id="add-stock-name-input"
                      value={addLookupResult.name}
                      onChange={(e) => setAddLookupResult(prev => prev ? { ...prev, name: e.target.value } : null)}
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#e2e8f0", fontSize: "0.85rem", padding: "6px 10px", width: "100%", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "2px" }}>{language === "id" ? "SIMBOL YAHOO" : "YAHOO SYMBOL"}</div>
                    <input
                      id="add-stock-fullsymbol-input"
                      value={addLookupResult.fullSymbol}
                      onChange={(e) => setAddLookupResult(prev => prev ? { ...prev, fullSymbol: e.target.value } : null)}
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#60a5fa", fontSize: "0.85rem", fontWeight: 700, padding: "6px 10px", width: "100%", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "2px" }}>PASAR / MARKET</div>
                    <select
                      id="add-stock-market-select"
                      value={addLookupResult.market}
                      onChange={(e) => setAddLookupResult(prev => prev ? { ...prev, market: e.target.value } : null)}
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#e2e8f0", fontSize: "0.85rem", padding: "6px 10px", width: "100%" }}
                    >
                      <option value="IDX">IDX (Indonesia)</option>
                      <option value="US">US (NYSE/NASDAQ)</option>
                    </select>
                  </div>
                </div>
                <p style={{ fontSize: "0.75rem", color: "#64748b", margin: 0 }}>
                  {language === "id"
                    ? "Anda dapat mengedit field di atas sebelum menyimpan."
                    : "You can edit the fields above before saving."}
                </p>
              </div>
            )}

            {/* Error / Success */}
            {addError && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "10px 14px", color: "#f87171", fontSize: "0.85rem" }}>
                ⚠️ {addError}
              </div>
            )}
            {addSuccess && (
              <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "8px", padding: "10px 14px", color: "#34d399", fontSize: "0.85rem" }}>
                ✅ {addSuccess}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={handleCloseAddModal}
                style={{ padding: "9px 20px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#94a3b8", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}
              >
                {language === "id" ? "Batal" : "Cancel"}
              </button>
              <button
                id="add-stock-submit-btn"
                onClick={handleAddStock}
                disabled={!addLookupResult || addSubmitLoading}
                style={{
                  padding: "9px 22px",
                  borderRadius: "8px",
                  border: "1px solid rgba(99,102,241,0.5)",
                  background: (!addLookupResult || addSubmitLoading) ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.3)",
                  color: "#818cf8",
                  fontWeight: 600,
                  cursor: (!addLookupResult || addSubmitLoading) ? "not-allowed" : "pointer",
                  fontSize: "0.85rem",
                  display: "flex", alignItems: "center", gap: "6px",
                  transition: "all 0.2s"
                }}
              >
                {addSubmitLoading && <i className="bx bx-loader-alt bx-spin" style={{ fontSize: "1rem" }} />}
                {language === "id" ? "Simpan ke Registri" : "Save to Registry"}
              </button>
            </div>
          </div>
        </div>
      )}

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
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {/* Add Stock Button */}
          <button
            id="open-add-stock-modal-btn"
            type="button"
            onClick={handleOpenAddModal}
            style={{
              padding: "8px 16px",
              fontSize: "0.8rem",
              borderRadius: "6px",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              cursor: "pointer",
              backgroundColor: "rgba(99, 102, 241, 0.12)",
              color: "#818cf8",
              fontWeight: 600,
              transition: "all 0.2s ease",
              outline: "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <i className="bx bx-plus" style={{ fontSize: "1.1rem" }} />
            {language === "id" ? "Tambah Saham" : "Add Stock"}
          </button>
          {/* Sync Button */}
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
              gap: "6px",
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
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {stock.symbol}
                        {stock.category === "swing_candidate" && (
                          <span title={language === "id" ? "Kandidat Swing Trading Hari Ini" : "Today's Swing Trading Candidate"} style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            padding: "2px 7px",
                            borderRadius: "20px",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            background: "linear-gradient(90deg, rgba(234,179,8,0.2), rgba(251,146,60,0.2))",
                            border: "1px solid rgba(234,179,8,0.4)",
                            color: "#fbbf24",
                            letterSpacing: "0.02em",
                          }}>
                            🎯 SWING
                          </span>
                        )}
                      </div>
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

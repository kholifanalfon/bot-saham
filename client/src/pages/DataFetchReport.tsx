import React, { useState, useEffect } from "react";
import { useLanguageStore } from "../store/useLanguageStore";

interface IngestionLog {
  id: string;
  status: "success" | "error" | "running";
  triggerType: "manual" | "auto";
  symbol: string | null;
  startDate: string | null;
  endDate: string | null;
  recordsCount: number;
  details: string | null;
  createdAt: string;
}

export const DataFetchReport: React.FC = () => {
  const { t, language } = useLanguageStore();
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [errorLogs, setErrorLogs] = useState<string | null>(null);

  // Ingestion Form State
  const [availableStocks, setAvailableStocks] = useState<{ symbol: string; name: string }[]>([]);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Combobox States
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const comboboxRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Expanded log row details state
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      setErrorLogs(null);
      const response = await fetch("http://localhost:3001/api/analysis/ingestion-logs", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to load ingestion logs");
      }
      const data = await response.json();
      setLogs(data);
    } catch (err: any) {
      console.error(err);
      setErrorLogs(err.message || "Gagal memuat log pengambilan data.");
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchActiveStocks = async () => {
    try {
      setLoadingStocks(true);
      const response = await fetch("http://localhost:3001/api/analysis/active-stocks", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableStocks(data);
      }
    } catch (err) {
      console.error("Failed to load active stocks:", err);
    } finally {
      setLoadingStocks(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchActiveStocks();
  }, []);

  const handleIngestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setSubmitMessage({
        type: "error",
        text: language === "id" ? "Lengkapi tanggal mulai dan akhir!" : "Please complete both start and end dates!",
      });
      return;
    }

    try {
      setSubmitting(true);
      setSubmitMessage(null);

      const isAllSelected = selectedSymbols.length === 0 || selectedSymbols.length === availableStocks.length;
      const payload = isAllSelected
        ? { all: true, startDate, endDate }
        : { symbols: selectedSymbols, startDate, endDate };

      const response = await fetch("http://localhost:3001/api/analysis/ingest-historical", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal mengambil data historis");
      }

      const hasFailures = data.failures && data.failures.length > 0;
      setSubmitMessage({
        type: "success",
        text: language === "id"
          ? `${data.message} Total ${data.count} baris data berhasil diunduh.${hasFailures ? ` Gagal pada: ${data.failures.join(', ')}` : ''}`
          : `${data.message} Total ${data.count} data rows successfully ingested.${hasFailures ? ` Failed on: ${data.failures.join(', ')}` : ''}`,
      });
      fetchLogs(); // Reload logs list
    } catch (err: any) {
      setSubmitMessage({
        type: "error",
        text: err.message || "Terjadi kesalahan sistem",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString(language === "id" ? "id-ID" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "6px" }}>
          {language === "id" ? "Laporan Pengambilan Data" : "Data Fetch Report"}
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
          {language === "id"
            ? "Pantau log pengambilan data bursa dan trigger pengambilan data historis spesifik ke database."
            : "Monitor stock data ingestion logs and trigger historical data retrieval directly into the database."}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
        {/* Trigger Form Card */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "16px", color: "#f8fafc" }}>
            {language === "id" ? "Trigger Pengambilan Data Historis" : "Trigger Historical Ingestion"}
          </h2>

          <form onSubmit={handleIngestionSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Stock symbols multi-select container */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#94a3b8" }}>
                  {language === "id" ? "Simbol Saham (Pilih Banyak)" : "Stock Symbols (Multiple Select)"}
                </label>
                
                {/* Control buttons */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setSelectedSymbols(availableStocks.map(s => s.symbol))}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.75rem",
                      borderRadius: "4px",
                      backgroundColor: "rgba(59, 130, 246, 0.15)",
                      color: "#60a5fa",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      cursor: "pointer",
                      fontWeight: 600
                    }}
                  >
                    {language === "id" ? "Pilih Semua (ALL)" : "Select All (ALL)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSymbols([])}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.75rem",
                      borderRadius: "4px",
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      color: "#f87171",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      cursor: "pointer",
                      fontWeight: 600
                    }}
                  >
                    {language === "id" ? "Bersihkan" : "Clear All"}
                  </button>
                </div>
              </div>

              {/* Custom Multiselect Combobox */}
              <div ref={comboboxRef} style={{ position: "relative", width: "100%" }}>
                {/* Trigger container */}
                <div
                  onClick={() => setIsOpen(true)}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    padding: "8px 12px",
                    minHeight: "42px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    backgroundColor: "rgba(15, 23, 42, 0.6)",
                    cursor: "text",
                    alignItems: "center",
                    position: "relative",
                  }}
                >
                  {selectedSymbols.length === 0 && !searchQuery ? (
                    <span style={{ color: "#64748b", fontSize: "0.85rem", pointerEvents: "none", position: "absolute", left: "12px" }}>
                      {language === "id" 
                        ? "Semua Saham (Kosongkan untuk ambil semua data history)" 
                        : "All Stocks (Leave empty to fetch all historical data)"}
                    </span>
                  ) : null}

                  {selectedSymbols.map((sym) => (
                    <span
                      key={sym}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        backgroundColor: "rgba(59, 130, 246, 0.2)",
                        color: "#60a5fa",
                        border: "1px solid rgba(59, 130, 246, 0.4)",
                        borderRadius: "4px",
                        padding: "2px 8px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                      }}
                    >
                      {sym}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSymbols(prev => prev.filter(s => s !== sym));
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#94a3b8",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          padding: "0 2px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsOpen(true);
                    }}
                    style={{
                      border: "none",
                      background: "none",
                      outline: "none",
                      color: "#f8fafc",
                      fontSize: "0.85rem",
                      flex: 1,
                      minWidth: "60px",
                      padding: "4px 0",
                    }}
                    placeholder={selectedSymbols.length > 0 ? "" : " "}
                  />

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto", pointerEvents: "none" }}>
                    <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {/* Dropdown Options */}
                {isOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      marginTop: "6px",
                      maxHeight: "200px",
                      overflowY: "auto",
                      backgroundColor: "#0f172a",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "6px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.7)",
                      padding: "6px 0",
                    }}
                  >
                    {loadingStocks ? (
                      <div style={{ padding: "10px 16px", color: "#64748b", fontSize: "0.85rem" }}>
                        Loading stocks...
                      </div>
                    ) : availableStocks.filter(stock => 
                      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      stock.name.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 ? (
                      <div style={{ padding: "10px 16px", color: "#64748b", fontSize: "0.85rem" }}>
                        {language === "id" ? "Saham tidak ditemukan" : "No stocks found"}
                      </div>
                    ) : (
                      availableStocks.filter(stock => 
                        stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        stock.name.toLowerCase().includes(searchQuery.toLowerCase())
                      ).map((stock) => {
                        const isSelected = selectedSymbols.includes(stock.symbol);
                        return (
                          <div
                            key={stock.symbol}
                            onClick={() => {
                              setSelectedSymbols(prev =>
                                isSelected ? prev.filter(s => s !== stock.symbol) : [...prev, stock.symbol]
                              );
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "8px 16px",
                              cursor: "pointer",
                              backgroundColor: isSelected ? "rgba(59, 130, 246, 0.1)" : "transparent",
                              transition: "background-color 0.15s ease",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isSelected ? "rgba(59, 130, 246, 0.15)" : "rgba(255, 255, 255, 0.05)"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? "rgba(59, 130, 246, 0.1)" : "transparent"}
                          >
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: isSelected ? "#60a5fa" : "#f8fafc" }}>
                                {stock.symbol}
                              </span>
                              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                {stock.name}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                style={{
                                  width: "14px",
                                  height: "14px",
                                  accentColor: "#3b82f6",
                                  cursor: "pointer",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                {selectedSymbols.length === 0
                  ? (language === "id" ? "Mengambil data untuk semua saham." : "Ingesting data for all stocks.")
                  : (language === "id" 
                      ? `Terpilih ${selectedSymbols.length} dari ${availableStocks.length} saham.` 
                      : `Selected ${selectedSymbols.length} of ${availableStocks.length} stocks.`)}
              </span>
            </div>

            {/* Date Range Inputs & Submit */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "150px", flex: 1 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8" }}>
                  {language === "id" ? "Tanggal Mulai" : "Start Date"}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    backgroundColor: "rgba(15, 23, 42, 0.6)",
                    color: "#f8fafc",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "150px", flex: 1 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8" }}>
                  {language === "id" ? "Tanggal Akhir" : "End Date"}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    backgroundColor: "rgba(15, 23, 42, 0.6)",
                    color: "#f8fafc",
                    outline: "none",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "11px 24px",
                  borderRadius: "6px",
                  backgroundColor: submitting ? "rgba(59, 130, 246, 0.4)" : "#3b82f6",
                  color: "white",
                  fontWeight: 600,
                  border: "none",
                  cursor: submitting ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  minWidth: "140px",
                  boxShadow: submitting ? "none" : "0 0 15px rgba(59, 130, 246, 0.3)",
                }}
              >
                {submitting ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                    <span className="live-pulse" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ffffff" }}></span>
                    Fetching...
                  </span>
                ) : selectedSymbols.length === 0 ? (
                  language === "id" ? "Ambil Semua Saham" : "Fetch All Stocks"
                ) : language === "id" ? (
                  "Ambil Data"
                ) : (
                  "Fetch Data"
                )}
              </button>
            </div>
          </form>

          {submitMessage && (
            <div
              style={{
                marginTop: "16px",
                padding: "12px 16px",
                borderRadius: "6px",
                backgroundColor: submitMessage.type === "success" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${submitMessage.type === "success" ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                color: submitMessage.type === "success" ? "#4ade80" : "#f87171",
                fontSize: "0.9rem",
                fontWeight: 500,
              }}
            >
              {submitMessage.text}
            </div>
          )}
        </div>

        {/* History Log Card */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#f8fafc" }}>
              {language === "id" ? "Riwayat Pengambilan Data" : "Data Fetch Logs History"}
            </h2>
            <button
              onClick={fetchLogs}
              disabled={loadingLogs}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                color: "#94a3b8",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 500,
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                e.currentTarget.style.color = "#f8fafc";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.color = "#94a3b8";
              }}
            >
              {loadingLogs ? "Reloading..." : language === "id" ? "Muat Ulang" : "Reload"}
            </button>
          </div>

          {loadingLogs ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
              <span className="live-pulse" style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#3b82f6", display: "inline-block", marginRight: "8px" }}></span>
              {language === "id" ? "Memuat log..." : "Loading logs..."}
            </div>
          ) : errorLogs ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#f87171", border: "1px dashed rgba(239, 68, 68, 0.3)", borderRadius: "8px" }}>
              {errorLogs}
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "0.9rem" }}>
              {language === "id" ? "Belum ada riwayat pengambilan data." : "No data fetch history logs available."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", color: "#94a3b8", fontWeight: 600 }}>
                    <th style={{ padding: "12px 8px" }}>{language === "id" ? "Waktu" : "Time"}</th>
                    <th style={{ padding: "12px 8px" }}>{language === "id" ? "Pemicu" : "Trigger"}</th>
                    <th style={{ padding: "12px 8px" }}>{language === "id" ? "Aset" : "Asset"}</th>
                    <th style={{ padding: "12px 8px" }}>{language === "id" ? "Rentang Tanggal" : "Date Range"}</th>
                    <th style={{ padding: "12px 8px" }}>{language === "id" ? "Jumlah" : "Count"}</th>
                    <th style={{ padding: "12px 8px" }}>Status</th>
                    <th style={{ padding: "12px 8px", textAlign: "right" }}>{language === "id" ? "Detail" : "Details"}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          style={{
                            borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                            backgroundColor: isExpanded ? "rgba(255, 255, 255, 0.02)" : "transparent",
                            cursor: "pointer",
                          }}
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        >
                          <td style={{ padding: "14px 8px", color: "#f8fafc" }}>{formatDate(log.createdAt)}</td>
                          <td style={{ padding: "14px 8px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                backgroundColor: log.triggerType === "manual" ? "rgba(139, 92, 246, 0.15)" : "rgba(59, 130, 246, 0.15)",
                                color: log.triggerType === "manual" ? "#c084fc" : "#60a5fa",
                                textTransform: "capitalize",
                              }}
                            >
                              {log.triggerType}
                            </span>
                          </td>
                          <td style={{ padding: "14px 8px", color: "#60a5fa", fontWeight: 600 }}>{log.symbol || "-"}</td>
                          <td style={{ padding: "14px 8px", color: "#94a3b8" }}>
                            {log.startDate && log.endDate ? `${log.startDate} s/d ${log.endDate}` : "-"}
                          </td>
                          <td style={{ padding: "14px 8px", color: "#e2e8f0" }}>{log.recordsCount}</td>
                          <td style={{ padding: "14px 8px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "4px 10px",
                                borderRadius: "20px",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                backgroundColor:
                                  log.status === "success"
                                    ? "rgba(34, 197, 94, 0.15)"
                                    : log.status === "error"
                                    ? "rgba(239, 68, 68, 0.15)"
                                    : "rgba(234, 179, 8, 0.15)",
                                color:
                                  log.status === "success"
                                    ? "#4ade80"
                                    : log.status === "error"
                                    ? "#f87171"
                                    : "#facc15",
                              }}
                            >
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  backgroundColor:
                                    log.status === "success"
                                      ? "#22c55e"
                                      : log.status === "error"
                                      ? "#ef4444"
                                      : "#eab308",
                                }}
                              />
                              {log.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: "14px 8px", textAlign: "right", color: "#94a3b8", fontSize: "0.75rem" }}>
                            {isExpanded ? (language === "id" ? "Tutup ▲" : "Close ▲") : (language === "id" ? "Buka ▼" : "Open ▼")}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} style={{ padding: "12px 16px", backgroundColor: "rgba(0,0,0,0.25)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8" }}>
                                  {language === "id" ? "Pesan Log Detail:" : "Detailed Log Message:"}
                                </span>
                                <pre
                                  style={{
                                    margin: 0,
                                    padding: "10px",
                                    borderRadius: "4px",
                                    backgroundColor: "rgba(15, 23, 42, 0.8)",
                                    color: log.status === "error" ? "#f87171" : "#e2e8f0",
                                    fontSize: "0.8rem",
                                    whiteSpace: "pre-wrap",
                                    fontFamily: "monospace",
                                    borderLeft: `3px solid ${log.status === "error" ? "#ef4444" : "#22c55e"}`,
                                  }}
                                >
                                  {log.details || (language === "id" ? "Tidak ada detail log tambahan." : "No additional log details.")}
                                </pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from "react";
import { useLanguageStore } from "../store/useLanguageStore";
import TomSelect from "tom-select";
import "tom-select/dist/css/tom-select.css";

export const Settings: React.FC = () => {
  const { t, language } = useLanguageStore();
  const [usMarketEnabled, setUsMarketEnabled] = useState(false);
  const [geminiModel, setGeminiModel] = useState("gemini-1.5-flash");
  const [btstTpPercent, setBtstTpPercent] = useState("8.0");
  const [btstSlPercent, setBtstSlPercent] = useState("-4.0");
  const [btstTslEnabled, setBtstTslEnabled] = useState(true);
  const [btstTslTriggerPercent, setBtstTslTriggerPercent] = useState("5.0");
  const [btstTslTrailPercent, setBtstTslTrailPercent] = useState("2.5");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<string[]>([
    "LQ45",
    "IDX30",
    "SMC Liquid",
  ]);
  const [syncingRegistry, setSyncingRegistry] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Responsive mobile view check
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const selectRef = useRef<HTMLSelectElement | null>(null);
  const tomSelectRef = useRef<any>(null);

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

  // Fetch current settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:3001/api/settings", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setUsMarketEnabled(!!data.us_market_enabled);
          if (data.gemini_model) {
            setGeminiModel(data.gemini_model);
          }
          if (data.swing_tp_percent) {
            setBtstTpPercent(data.swing_tp_percent);
          }
          if (data.swing_sl_percent) {
            setBtstSlPercent(data.swing_sl_percent);
          }
          if (data.swing_tsl_enabled !== undefined) {
            setBtstTslEnabled(!!data.swing_tsl_enabled);
          }
          if (data.swing_tsl_trigger_percent) {
            setBtstTslTriggerPercent(data.swing_tsl_trigger_percent);
          }
          if (data.swing_tsl_trail_percent) {
            setBtstTslTrailPercent(data.swing_tsl_trail_percent);
          }
          if (data.gemini_idx_indices) {
            const list = data.gemini_idx_indices
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean);
            setSelectedIndices(list);
          }
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleToggle = async () => {
    try {
      setSaving(true);
      setSuccess(false);
      const response = await fetch("http://localhost:3001/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ us_market_enabled: !usMarketEnabled }),
        credentials: "include",
      });

      if (response.ok) {
        setUsMarketEnabled(!usMarketEnabled);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  // Initialize Tom Select once settings are loaded and DOM element is available
  useEffect(() => {
    if (loading || !selectRef.current) return;

    // Initialize Tom Select
    tomSelectRef.current = new TomSelect(selectRef.current, {
      plugins: ["remove_button"],
      create: true, // Allows user to add custom keys!
      persist: false,
      maxItems: null,
      placeholder: "Pilih atau ketik indeks kustom...",
      onChange: (values: any) => {
        const valArr = Array.isArray(values) ? values : [values];
        const nextIndices = valArr.filter(Boolean);
        if (nextIndices.length === 0) return;

        setSelectedIndices(nextIndices);
        saveIndicesToDb(nextIndices);
      },
    });

    // Populate initial value in Tom Select
    if (tomSelectRef.current && selectedIndices.length > 0) {
      selectedIndices.forEach((idx) => {
        // Ensure options exist
        if (!tomSelectRef.current.options[idx]) {
          tomSelectRef.current.addOption({ value: idx, text: idx });
        }
      });
      tomSelectRef.current.setValue(selectedIndices, true); // silent setValue
    }

    return () => {
      if (tomSelectRef.current) {
        tomSelectRef.current.destroy();
        tomSelectRef.current = null;
      }
    };
  }, [loading]);

  // Synchronize state changes back into Tom Select
  useEffect(() => {
    if (tomSelectRef.current) {
      const currentVal = tomSelectRef.current.getValue();
      const currentArr = Array.isArray(currentVal)
        ? currentVal
        : currentVal
          ? currentVal.split(",")
          : [];

      // Compare arrays
      const isSame =
        currentArr.length === selectedIndices.length &&
        currentArr.every((v: string) => selectedIndices.includes(v));
      if (!isSame) {
        selectedIndices.forEach((idx) => {
          if (!tomSelectRef.current.options[idx]) {
            tomSelectRef.current.addOption({ value: idx, text: idx });
          }
        });
        tomSelectRef.current.setValue(selectedIndices, true); // silent setValue to avoid trigger onChange loop
      }
    }
  }, [selectedIndices]);

  const saveIndicesToDb = async (nextIndices: string[]) => {
    try {
      setSaving(true);
      setSuccess(false);
      const response = await fetch("http://localhost:3001/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gemini_idx_indices: nextIndices.join(",") }),
        credentials: "include",
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save index settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncStocks = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConsoleLogs([]);
    setShowConsole(true);
    setSyncStatus("running");
    setSyncingRegistry(true);

    const es = new EventSource("http://localhost:3001/api/settings/sync-stocks/stream", {
      withCredentials: true
    });

    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'stdout' || payload.type === 'stderr') {
          // Keep logs clean by filtering empty lines and appending
          const lines = payload.message.split('\n').filter((l: string) => l.trim() !== '');
          if (lines.length > 0) {
            setConsoleLogs(prev => [...prev, ...lines]);
          }
        } else if (payload.type === 'exit') {
          if (payload.code === 0) {
            setSyncStatus("success");
            setConsoleLogs(prev => [...prev, language === 'id' ? "[Sistem] Sinkronisasi registri saham berhasil diselesaikan!" : "[System] Stock registry synchronization completed successfully!"]);
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

  const handleModelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    setGeminiModel(newModel);
    try {
      setSaving(true);
      setSuccess(false);
      const response = await fetch("http://localhost:3001/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gemini_model: newModel }),
        credentials: "include",
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save model settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleTpSlChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccess(false);
      const response = await fetch("http://localhost:3001/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          swing_tp_percent: btstTpPercent,
          swing_sl_percent: btstSlPercent,
          swing_tsl_enabled: btstTslEnabled,
          swing_tsl_trigger_percent: btstTslTriggerPercent,
          swing_tsl_trail_percent: btstTslTrailPercent,
        }),
        credentials: "include",
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save TP/SL settings:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span
            className="live-pulse"
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: "#3b82f6",
            }}
          ></span>
          <span style={{ fontSize: "0.9rem", color: "#94a3b8" }}>
            Loading settings...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <div>
        <h1
          style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "6px" }}
        >
          {t("settings_overview")}
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
          {t("settings_sub")}
        </p>
      </div>

      {success && (
        <div
          className="glass-panel"
          style={{
            padding: "14px 20px",
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            borderRadius: "8px",
            color: "#10b981",
            fontSize: "0.88rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          ✓ {t("settings_save_success")}
        </div>
      )}

      <div
        className="glass-panel"
        style={{
          padding: "30px",
          display: "flex",
          flexDirection: "column",
          gap: "28px",
        }}
      >
        {/* Market Setting Section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
            paddingBottom: "20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              maxWidth: "75%",
            }}
          >
            <h3
              style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc" }}
            >
              {t("us_market_toggle")}
            </h3>
            <p
              style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.5 }}
            >
              {t("us_market_toggle_desc")}
            </p>
          </div>

          <div>
            <button
              onClick={handleToggle}
              disabled={saving}
              style={{
                position: "relative",
                width: "64px",
                height: "32px",
                borderRadius: "100px",
                backgroundColor: usMarketEnabled
                  ? "#06b6d4"
                  : "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                cursor: saving ? "not-allowed" : "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: usMarketEnabled
                  ? "0 0 15px rgba(6, 182, 212, 0.4)"
                  : "none",
                display: "flex",
                alignItems: "center",
                padding: "0 4px",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  transform: usMarketEnabled
                    ? "translateX(30px)"
                    : "translateX(0)",
                  transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                }}
              />
            </button>
          </div>
        </div>
        {/* Gemini AI Model Selection Section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
            paddingBottom: "20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              maxWidth: "65%",
            }}
          >
            <h3
              style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc" }}
            >
              Gemini AI Model Configuration
            </h3>
            <p
              style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.5 }}
            >
              Pilih versi model Gemini AI yang ingin digunakan untuk
              menganalisis sentimen bursa dan memprediksi skor BTST secara
              cerdas.
            </p>
          </div>

          <div>
            <select
              value={geminiModel}
              onChange={handleModelChange}
              disabled={saving}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                color: "#cbd5e1",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                fontSize: "0.85rem",
                cursor: "pointer",
                fontWeight: 600,
                outline: "none",
                minWidth: "200px",
              }}
            >
              <option value="gemini-3.5-flash">
                Gemini 3.5 Flash (Sangat Cepat)
              </option>
              <option value="gemini-3.1-flash-lite">
                Gemini 3.1 Flash Lite (Terbaru & Ringan)
              </option>
              <option value="gemini-3.1-pro-preview">
                Gemini 3.1 Pro (Sangat Analitis)
              </option>
            </select>
          </div>
        </div>{" "}
        {/* Gemini Target Stock Indices (Multi-select via Tom Select with custom key creation) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
            paddingBottom: "20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              maxWidth: isMobile ? "100%" : "60%",
            }}
          >
            <h3
              style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc" }}
            >
              Gemini Target Index Configuration
            </h3>
            <p
              style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.5 }}
            >
              Pilih satu atau beberapa indeks saham di Bursa Efek Indonesia
              (IDX) yang ingin dipindai dan dicari konstituen terbaiknya oleh
              Gemini AI. Anda juga dapat mengetik dan menambahkan indeks kustom
              Anda sendiri (tekan Enter).
            </p>
          </div>

          <div
            style={{
              width: "100%",
            }}
          >
            {/* Custom dark glassmorphic CSS overrides for Tom Select */}
            <style>{`
              .ts-control {
                background: rgba(0, 0, 0, 0.3) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                color: #cbd5e1 !important;
                border-radius: 8px !important;
                padding: 10px 16px !important;
                box-shadow: none !important;
                transition: all 0.2s ease;
              }
              .ts-control:focus-within {
                border-color: #3b82f6 !important;
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
              }
              .ts-control input {
                color: #cbd5e1 !important;
                font-family: inherit !important;
              }
              .ts-dropdown {
                background: rgba(15, 23, 42, 0.95) !important;
                backdrop-filter: blur(8px) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                border-radius: 8px !important;
                color: #cbd5e1 !important;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5) !important;
                margin-top: 4px !important;
              }
              .ts-dropdown .option {
                padding: 8px 16px !important;
                color: #cbd5e1 !important;
                cursor: pointer !important;
              }
              .ts-dropdown .active {
                background: rgba(59, 130, 246, 0.2) !important;
                color: #60a5fa !important;
              }
              .ts-dropdown .create {
                color: #10b981 !important;
                font-weight: 600 !important;
                border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
              }
              .ts-control .item {
                background: rgba(59, 130, 246, 0.15) !important;
                border: 1px solid rgba(59, 130, 246, 0.3) !important;
                color: #60a5fa !important;
                border-radius: 6px !important;
                padding: 2px 8px !important;
                font-weight: 600 !important;
                display: inline-flex !important;
                align-items: center !important;
              }
              .ts-control .item .remove {
                border-left: 1px solid rgba(59, 130, 246, 0.3) !important;
                color: #60a5fa !important;
                margin-left: 6px !important;
                text-decoration: none !important;
                opacity: 0.8 !important;
              }
              .ts-control .item .remove:hover {
                background: rgba(239, 68, 68, 0.2) !important;
                color: #f87171 !important;
                opacity: 1 !important;
              }
            `}</style>
            <select
              ref={selectRef}
              multiple
              disabled={saving}
              style={{ width: "100%" }}
            >
              <option value="LQ45">LQ45</option>
              <option value="IDX30">IDX30</option>
              <option value="SMC Liquid">SMC Liquid</option>
              <option value="Kompas100">Kompas100</option>
              <option value="JII">JII</option>
            </select>

            {/* Sync Stock Registry Trigger Button */}
            <div
              style={{
                marginTop: "12px",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={handleSyncStocks}
                disabled={saving || syncingRegistry}
                style={{
                  padding: "8px 16px",
                  fontSize: "0.8rem",
                  borderRadius: "6px",
                  border: "1px solid rgba(59, 130, 246, 0.4)",
                  cursor: saving || syncingRegistry ? "not-allowed" : "pointer",
                  backgroundColor: syncingRegistry
                    ? "rgba(59, 130, 246, 0.1)"
                    : "transparent",
                  color: "#60a5fa",
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                  outline: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>🔄</span>
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
                  marginTop: "16px",
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
          </div>
        </div>
        {/* BTST Strategy & Dynamic Trailing Stop Loss (TSL) Settings */}
        <form
          onSubmit={handleTpSlChange}
          style={{ display: "flex", flexDirection: "column", gap: "24px" }}
        >
          {/* Static TP & SL Card */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "20px",
              paddingBottom: "20px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                maxWidth: "60%",
              }}
            >
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  color: "#f8fafc",
                }}
              >
                Swing Strategy (TP & SL)
              </h3>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "#94a3b8",
                  lineHeight: 1.5,
                }}
              >
                Atur persentase Target Profit (TP) dan Stop Loss (SL) default
                untuk panduan dasar di Dashboard.
              </p>
            </div>

            <div
              style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Target Profit (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={btstTpPercent}
                  onChange={(e) => setBtstTpPercent(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#10b981",
                    width: "100px",
                  }}
                />
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Stop Loss (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={btstSlPercent}
                  onChange={(e) => setBtstSlPercent(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#ef4444",
                    width: "100px",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Trailing Stop Loss Switch and Info */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "20px",
              paddingBottom: "20px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                maxWidth: "75%",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <h3
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "#f8fafc",
                  }}
                >
                  Trailing Stop Loss (TSL) Dinamis
                </h3>
                <div
                  className="tooltip-container"
                  style={{ cursor: "help", color: "#3b82f6" }}
                >
                  ⓘ
                  <span className="tooltip-text">
                    Trailing Stop Loss (TSL) akan menunda sinyal jual langsung
                    saat target profit tercapai jika volume beli sangat tinggi.
                    Sinyal jual baru akan dipicu setelah harga puncak berbalik
                    arah melebihi toleransi persentase trail.
                  </span>
                </div>
              </div>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "#94a3b8",
                  lineHeight: 1.5,
                }}
              >
                Kunci keuntungan secara dinamis dengan menggeser batas stop-loss
                ke atas saat saham Anda mengalami reli momentum yang kuat.
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setBtstTslEnabled(!btstTslEnabled)}
                disabled={saving}
                style={{
                  position: "relative",
                  width: "64px",
                  height: "32px",
                  borderRadius: "100px",
                  backgroundColor: btstTslEnabled
                    ? "#10b981"
                    : "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  cursor: saving ? "not-allowed" : "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: btstTslEnabled
                    ? "0 0 15px rgba(16, 185, 129, 0.4)"
                    : "none",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 4px",
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: "#ffffff",
                    transform: btstTslEnabled
                      ? "translateX(30px)"
                      : "translateX(0)",
                    transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                  }}
                />
              </button>
            </div>
          </div>

          {/* TSL Parameters (Trigger & Trail) */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "20px",
              paddingBottom: "20px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
              opacity: btstTslEnabled ? 1 : 0.4,
              pointerEvents: btstTslEnabled ? "auto" : "none",
              transition: "opacity 0.2s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                maxWidth: "60%",
              }}
            >
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  color: "#f8fafc",
                }}
              >
                Parameter Batas TSL
              </h3>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "#94a3b8",
                  lineHeight: 1.5,
                }}
              >
                Sesuaikan kapan TSL diaktifkan (Trigger) dan persentase koreksi
                penurunan dari puncak harga tertinggi (Trail).
              </p>
            </div>

            <div
              style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    TSL Trigger (%)
                  </label>
                  <div
                    className="tooltip-container"
                    style={{
                      cursor: "help",
                      color: "#3b82f6",
                      fontSize: "0.78rem",
                    }}
                  >
                    ⓘ
                    <span className="tooltip-text">
                      Ambang batas persentase keuntungan minimal (misal +2.0%)
                      yang harus dilewati terlebih dahulu sebelum sistem
                      stop-loss dinamis (TSL) diaktifkan untuk mengawal harga
                      saham.
                    </span>
                  </div>
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={btstTslTriggerPercent}
                  onChange={(e) => setBtstTslTriggerPercent(e.target.value)}
                  disabled={!btstTslEnabled}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#60a5fa",
                    width: "110px",
                  }}
                />
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    TSL Trail (%)
                  </label>
                  <div
                    className="tooltip-container"
                    style={{
                      cursor: "help",
                      color: "#3b82f6",
                      fontSize: "0.78rem",
                    }}
                  >
                    ⓘ
                    <span className="tooltip-text">
                      Batas toleransi penurunan harga (misal -1.0%) dari titik
                      puncak tertinggi sejak TSL aktif. Jika harga saham turun
                      melebihi batas ini, bot akan menyarankan sinyal jual
                      instan.
                    </span>
                  </div>
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={btstTslTrailPercent}
                  onChange={(e) => setBtstTslTrailPercent(e.target.value)}
                  disabled={!btstTslEnabled}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#e2e8f0",
                    width: "110px",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action button */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "10px 24px",
                borderRadius: "6px",
                backgroundColor: "#3b82f6",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                boxShadow: "0 0 15px rgba(59, 130, 246, 0.3)",
              }}
            >
              {saving ? "Saving..." : "Simpan Strategi Swing & TSL"}
            </button>
          </div>
        </form>
        {/* TP/SL Monitor Preview (Simulation) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <h3
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                color: "#f8fafc",
                marginBottom: "6px",
              }}
            >
              ⚡ Preview TP/SL Monitor
            </h3>
            <p
              style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.5 }}
            >
              Contoh tampilan monitor TP/SL di Dashboard berdasarkan pengaturan
              yang Anda tentukan di atas.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            {/* Simulasi TP Reached */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                padding: "16px",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: "8px",
                fontSize: "0.85rem",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  backgroundColor: "#b45309",
                  color: "#fff",
                  fontSize: "0.6rem",
                  padding: "2px 8px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Simulasi
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                  marginTop: "8px",
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
                <span style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>
                  Avg: 3,850 | Curr: 3,950
                </span>
                <span style={{ color: "#10b981", fontWeight: 600 }}>
                  P&L: +2.60% ✓ TP Tercapai ({btstTpPercent}%)
                </span>
              </div>
              <span
                style={{
                  textAlign: "center",
                  padding: "6px 12px",
                  borderRadius: "100px",
                  fontWeight: "bold",
                  background: "#10b981",
                  color: "#fff",
                  fontSize: "0.78rem",
                }}
              >
                SELL NOW (TP REACHED)
              </span>
            </div>

            {/* Simulasi SL Reached */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                padding: "16px",
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: "8px",
                fontSize: "0.85rem",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  backgroundColor: "#b45309",
                  color: "#fff",
                  fontSize: "0.6rem",
                  padding: "2px 8px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Simulasi
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                  marginTop: "8px",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: "#ef4444",
                  }}
                >
                  GOTO.JK
                </span>
                <span style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>
                  Avg: 60 | Curr: 58
                </span>
                <span style={{ color: "#ef4444", fontWeight: 600 }}>
                  P&L: -3.33% ✗ SL Tercapai ({btstSlPercent}%)
                </span>
              </div>
              <span
                style={{
                  textAlign: "center",
                  padding: "6px 12px",
                  borderRadius: "100px",
                  fontWeight: "bold",
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: "0.78rem",
                }}
              >
                CUT LOSS (SL REACHED)
              </span>
            </div>
          </div>

          <div
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              backgroundColor: "rgba(59, 130, 246, 0.05)",
              border: "1px solid rgba(59, 130, 246, 0.12)",
              fontSize: "0.78rem",
              color: "#64748b",
            }}
          >
            ℹ️ Preview di atas bersifat simulasi. Data TP/SL Monitor
            sesungguhnya akan muncul di Dashboard berdasarkan posisi portofolio
            Anda yang aktif.
          </div>
        </div>
        {/* Informative Note Cards */}
        <div
          style={{
            padding: "16px",
            borderRadius: "8px",
            backgroundColor: "rgba(59, 130, 246, 0.03)",
            border: "1px solid rgba(59, 130, 246, 0.1)",
            fontSize: "0.8rem",
            color: "#94a3b8",
            lineHeight: 1.5,
          }}
        >
          💡 <strong>Tip:</strong> Pengaturan model AI ini disimpan secara
          langsung di dalam PostgreSQL. Backend akan langsung menyesuaikan model
          pemanggil secara real-time tanpa perlu me-restart server aplikasi!
        </div>
      </div>
    </div>
  );
};

export default Settings;

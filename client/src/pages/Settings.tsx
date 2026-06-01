import React, { useState, useEffect } from "react";
import { useLanguageStore } from "../store/useLanguageStore";

export const Settings: React.FC = () => {
  const { t } = useLanguageStore();
  const [usMarketEnabled, setUsMarketEnabled] = useState(false);
  const [geminiModel, setGeminiModel] = useState("gemini-1.5-flash");
  const [btstTpPercent, setBtstTpPercent] = useState("2.0");
  const [btstSlPercent, setBtstSlPercent] = useState("-2.0");
  const [btstTslEnabled, setBtstTslEnabled] = useState(false);
  const [btstTslTriggerPercent, setBtstTslTriggerPercent] = useState("2.0");
  const [btstTslTrailPercent, setBtstTslTrailPercent] = useState("1.0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

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
          if (data.btst_tp_percent) {
            setBtstTpPercent(data.btst_tp_percent);
          }
          if (data.btst_sl_percent) {
            setBtstSlPercent(data.btst_sl_percent);
          }
          if (data.btst_tsl_enabled !== undefined) {
            setBtstTslEnabled(!!data.btst_tsl_enabled);
          }
          if (data.btst_tsl_trigger_percent) {
            setBtstTslTriggerPercent(data.btst_tsl_trigger_percent);
          }
          if (data.btst_tsl_trail_percent) {
            setBtstTslTrailPercent(data.btst_tsl_trail_percent);
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
          btst_tp_percent: btstTpPercent, 
          btst_sl_percent: btstSlPercent,
          btst_tsl_enabled: btstTslEnabled,
          btst_tsl_trigger_percent: btstTslTriggerPercent,
          btst_tsl_trail_percent: btstTslTrailPercent
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
        </div>

        {/* BTST Strategy & Dynamic Trailing Stop Loss (TSL) Settings */}
        <form onSubmit={handleTpSlChange} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
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
                style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc" }}
              >
                BTST Strategy (TP & SL)
              </h3>
              <p
                style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.5 }}
              >
                Atur persentase Target Profit (TP) dan Stop Loss (SL) default untuk panduan dasar di Dashboard.
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Target Profit (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={btstTpPercent}
                  onChange={(e) => setBtstTpPercent(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "6px", backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#10b981", width: "100px" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Stop Loss (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={btstSlPercent}
                  onChange={(e) => setBtstSlPercent(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "6px", backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#ef4444", width: "100px" }}
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
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3
                  style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc" }}
                >
                  Trailing Stop Loss (TSL) Dinamis
                </h3>
                <div className="tooltip-container" style={{ cursor: "help", color: "#3b82f6" }}>
                  ⓘ
                  <span className="tooltip-text">
                    Trailing Stop Loss (TSL) akan menunda sinyal jual langsung saat target profit tercapai jika volume beli sangat tinggi. Sinyal jual baru akan dipicu setelah harga puncak berbalik arah melebihi toleransi persentase trail.
                  </span>
                </div>
              </div>
              <p
                style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.5 }}
              >
                Kunci keuntungan secara dinamis dengan menggeser batas stop-loss ke atas saat saham Anda mengalami reli momentum yang kuat.
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
                style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc" }}
              >
                Parameter Batas TSL
              </h3>
              <p
                style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.5 }}
              >
                Sesuaikan kapan TSL diaktifkan (Trigger) dan persentase koreksi penurunan dari puncak harga tertinggi (Trail).
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>TSL Trigger (%)</label>
                  <div className="tooltip-container" style={{ cursor: "help", color: "#3b82f6", fontSize: "0.78rem" }}>
                    ⓘ
                    <span className="tooltip-text">
                      Ambang batas persentase keuntungan minimal (misal +2.0%) yang harus dilewati terlebih dahulu sebelum sistem stop-loss dinamis (TSL) diaktifkan untuk mengawal harga saham.
                    </span>
                  </div>
                </div>
                <input 
                  type="number" 
                  step="0.1"
                  value={btstTslTriggerPercent}
                  onChange={(e) => setBtstTslTriggerPercent(e.target.value)}
                  disabled={!btstTslEnabled}
                  style={{ padding: "8px 12px", borderRadius: "6px", backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#60a5fa", width: "110px" }}
                />
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>TSL Trail (%)</label>
                  <div className="tooltip-container" style={{ cursor: "help", color: "#3b82f6", fontSize: "0.78rem" }}>
                    ⓘ
                    <span className="tooltip-text">
                      Batas toleransi penurunan harga (misal -1.0%) dari titik puncak tertinggi sejak TSL aktif. Jika harga saham turun melebihi batas ini, bot akan menyarankan sinyal jual instan.
                    </span>
                  </div>
                </div>
                <input 
                  type="number" 
                  step="0.1"
                  value={btstTslTrailPercent}
                  onChange={(e) => setBtstTslTrailPercent(e.target.value)}
                  disabled={!btstTslEnabled}
                  style={{ padding: "8px 12px", borderRadius: "6px", backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", width: "110px" }}
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
                boxShadow: "0 0 15px rgba(59, 130, 246, 0.3)"
              }}
            >
              {saving ? "Saving..." : "Simpan Strategi BTST & TSL"}
            </button>
          </div>
        </form>

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

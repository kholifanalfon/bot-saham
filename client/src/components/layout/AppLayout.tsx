import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useStockStore } from "../../store/useStockStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useLanguageStore } from "../../store/useLanguageStore";

export const AppLayout: React.FC = () => {
  const { fetchWatchlist } = useStockStore();
  const { user, logout } = useAuthStore();
  const { t, language } = useLanguageStore();
  const navigate = useNavigate();
  const location = useLocation();

  // PWA Offline Detection State
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Responsive Viewport Detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // PWA Install Promo State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  // PWA beforeinstallprompt handler
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // If application is launched in standalone mode, hide banner
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowInstallBanner(false);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Handle responsive viewport resizing
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Automatically close "More Menu" on route transition
  useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Dynamic Styles
  const bottomTabStyle = (path: string) => {
    const isActive = location.pathname === path;
    return {
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      gap: "4px",
      flex: 1,
      height: "100%",
      color: isActive ? "#60a5fa" : "#94a3b8",
      background: "none",
      border: "none",
      cursor: "pointer",
      textDecoration: "none",
      fontSize: "0.72rem",
      fontWeight: isActive ? 600 : 500,
      transition: "all 0.15s ease",
    };
  };

  const moreMenuItemStyle = ({ isActive }: { isActive: boolean }) => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "8px",
    color: isActive ? "#ffffff" : "#94a3b8",
    backgroundColor: isActive
      ? "rgba(59, 130, 246, 0.2)"
      : "rgba(255, 255, 255, 0.03)",
    textDecoration: "none",
    fontSize: "0.9rem",
    fontWeight: isActive ? 600 : 500,
    border: "1px solid rgba(255,255,255,0.05)",
    transition: "all 0.15s ease",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#0a0e21",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* PWA Offline Warning Banner */}
      {!isOnline && (
        <div
          style={{
            backgroundColor: "#ef4444",
            color: "#ffffff",
            textAlign: "center",
            padding: "8px 16px",
            fontSize: "0.85rem",
            fontWeight: 600,
            letterSpacing: "0.5px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.2)",
            position: "sticky",
            top: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span
            className="live-pulse"
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#ffffff",
              display: "inline-block",
            }}
          ></span>
          {language === "id"
            ? "Koneksi terputus. Menampilkan data lokal (Mode Offline)."
            : "Connection lost. Displaying cached local data (Offline Mode)."}
        </div>
      )}

      {/* PWA Sticky Top Install Banner */}
      {showInstallBanner && (
        <div
          style={{
            backgroundColor: "rgba(59, 130, 246, 0.15)",
            borderBottom: "1px solid rgba(59, 130, 246, 0.3)",
            color: "#ffffff",
            textAlign: "center",
            padding: "10px 16px",
            fontSize: "0.85rem",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            position: "sticky",
            top: 0,
            zIndex: 199,
            backdropFilter: "blur(12px)",
            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
            animation: "slideUp 0.2s ease-out",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flex: 1,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <span>🚀</span>
            <span>
              {language === "id"
                ? "Dapatkan performa optimal dengan menginstal Aplikasi Bot Saham BTST langsung di Home Screen Anda!"
                : "Get optimal performance by installing BTST Stock Bot App directly on your Home Screen!"}
            </span>
            <button
              onClick={handleInstallPWA}
              style={{
                background: "linear-gradient(90deg, #3b82f6, #b45309)",
                border: "none",
                borderRadius: "6px",
                color: "#fff",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                padding: "4px 12px",
                marginLeft: "12px",
                boxShadow: "0 2px 8px rgba(59, 130, 246, 0.4)",
              }}
            >
              {language === "id" ? "Install Sekarang" : "Install Now"}
            </button>
          </div>
          <button
            onClick={() => setShowInstallBanner(false)}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: "1.1rem",
              fontWeight: 600,
              cursor: "pointer",
              padding: "4px 8px",
              display: "flex",
              alignItems: "center",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Container Layout */}
      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* Render desktop sidebar only on non-mobile viewports */}
        {!isMobile && <Sidebar />}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "hidden",
            position: "relative",
            marginLeft: isMobile ? "0" : "260px",
          }}
        >
          <Header />
          <main
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              padding: isMobile ? "16px 12px 90px" : "24px",
              background:
                "radial-gradient(circle at top right, rgba(59, 130, 246, 0.05), transparent)",
            }}
          >
            <Outlet />
          </main>
        </div>
      </div>

      {/* PWA Mobile Bottom Tab Navigation */}
      {isMobile && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: "64px",
            backgroundColor: "rgba(15, 19, 46, 0.95)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            zIndex: 150,
            boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.4)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          <NavLink to="/" style={() => bottomTabStyle("/")}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="9"></rect>
              <rect x="14" y="3" width="7" height="5"></rect>
              <rect x="14" y="12" width="7" height="9"></rect>
              <rect x="3" y="16" width="7" height="5"></rect>
            </svg>
            <span>{t("dashboard")}</span>
          </NavLink>

          <NavLink to="/screener" style={() => bottomTabStyle("/screener")}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
              <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
            </svg>
            <span>Screener</span>
          </NavLink>

          <NavLink to="/portfolio" style={() => bottomTabStyle("/portfolio")}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <span>{t("portfolio")}</span>
          </NavLink>

          <NavLink to="/ai" style={() => bottomTabStyle("/ai")}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 2 22 22 22"></polygon>
            </svg>
            <span>AI Bot</span>
          </NavLink>

          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            style={{
              ...bottomTabStyle("more"),
              color: isMoreOpen ? "#60a5fa" : "#94a3b8",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            <span>{language === "id" ? "Lainnya" : "More"}</span>
          </button>
        </div>
      )}

      {/* Sliding Mobile Drawer Overlay for "More" secondary menus */}
      {isMobile && isMoreOpen && (
        <div
          onClick={() => setIsMoreOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(6px)",
            zIndex: 180,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          {/* Drawer container */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              backgroundColor: "#0f132e",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              borderTop: "1px solid rgba(255, 255, 255, 0.12)",
              maxHeight: "80vh",
              overflowY: "auto",
              padding: "24px 20px 40px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              boxShadow: "0 -8px 30px rgba(0, 0, 0, 0.6)",
              animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            {/* Header info inside drawer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                paddingBottom: "12px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "#1e293b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    color: "#3b82f6",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                  }}
                >
                  {user?.name?.slice(0, 2).toUpperCase() || "US"}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: "0.95rem",
                      color: "#f8fafc",
                    }}
                  >
                    {user?.name || "Demo Trader"}
                  </span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "#94a3b8",
                      textTransform: "capitalize",
                    }}
                  >
                    {user?.role || "User"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "none",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  color: "#94a3b8",
                  cursor: "pointer",
                  marginLeft: "auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                }}
              >
                ✕
              </button>
            </div>

            {/* List of other links */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <NavLink
                to="/priority-stocks"
                style={moreMenuItemStyle}
                onClick={() => setIsMoreOpen(false)}
              >
                📌 {t("priority")}
              </NavLink>
              <NavLink
                to="/swing-recap"
                style={moreMenuItemStyle}
                onClick={() => setIsMoreOpen(false)}
              >
                📊 Swing Recap
              </NavLink>
              <NavLink
                to="/notifications"
                style={moreMenuItemStyle}
                onClick={() => setIsMoreOpen(false)}
              >
                🔔 {t("notifications")}
              </NavLink>
              <NavLink
                to="/guide"
                style={moreMenuItemStyle}
                onClick={() => setIsMoreOpen(false)}
              >
                📖 {t("guide")}
              </NavLink>
              <NavLink
                to="/algorithm"
                style={moreMenuItemStyle}
                onClick={() => setIsMoreOpen(false)}
              >
                📈 {t("algorithm")}
              </NavLink>
              <NavLink
                to="/registry"
                style={moreMenuItemStyle}
                onClick={() => setIsMoreOpen(false)}
              >
                🗂️ {t("stock_registry")}
              </NavLink>
              <NavLink
                to="/settings"
                style={moreMenuItemStyle}
                onClick={() => setIsMoreOpen(false)}
              >
                ⚙️ {t("settings")}
              </NavLink>
              <NavLink
                to="/data-report"
                style={moreMenuItemStyle}
                onClick={() => setIsMoreOpen(false)}
              >
                📊 {t("data_fetch_report")}
              </NavLink>
              {user?.role === "admin" && (
                <NavLink
                  to="/users"
                  style={moreMenuItemStyle}
                  onClick={() => setIsMoreOpen(false)}
                >
                  👥 {t("users")}
                </NavLink>
              )}
            </div>

            {/* Logout button in drawer */}
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                color: "#f87171",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                padding: "12px",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.9rem",
                marginTop: "10px",
                cursor: "pointer",
              }}
            >
              {t("logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

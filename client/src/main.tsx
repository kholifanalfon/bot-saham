import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { useAuthStore } from "./store/useAuthStore";

// Register PWA service worker
registerSW({ immediate: true });

// Global Fetch Interceptor to intercept 401 Unauthorized responses and force logout
const { fetch: originalFetch } = window;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 401) {
    console.warn(
      "[Auth Interceptor] 401 Unauthorized response detected. Logging out...",
    );
    useAuthStore.getState().logout();
  }
  return response;
};

createRoot(document.getElementById("root")!).render(<App />);

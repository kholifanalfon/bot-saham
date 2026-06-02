import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { useAuthStore } from "./store/useAuthStore";

// Register PWA service worker
registerSW({ immediate: true });

// Global Fetch Interceptor to intercept 401 Unauthorized responses and rewrite local API hosts dynamically
const { fetch: originalFetch } = window;
window.fetch = async (input, init) => {
  let finalInput = input;
  
  if (typeof input === "string" && input.includes("http://localhost:3001")) {
    finalInput = input.replace("http://localhost:3001", `http://${window.location.hostname}:3001`);
  } else if (input instanceof Request && input.url.includes("http://localhost:3001")) {
    const newUrl = input.url.replace("http://localhost:3001", `http://${window.location.hostname}:3001`);
    finalInput = new Request(newUrl, input);
  }

  const response = await originalFetch(finalInput, init);
  if (response.status === 401) {
    console.warn(
      "[Auth Interceptor] 401 Unauthorized response detected. Logging out...",
    );
    useAuthStore.getState().logout();
  }
  return response;
};

createRoot(document.getElementById("root")!).render(<App />);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found in index.html");

try {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (e) {
  root.innerHTML = `<div style="padding:2rem;font-family:sans-serif">
    <h2>Configuration error</h2>
    <p>${e instanceof Error ? e.message : String(e)}</p>
  </div>`;
}

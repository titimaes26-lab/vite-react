/* ═══════════════════════════════════════════════════════
   src/main.jsx — Point d'entrée Vite/React
   restaurant-manager.jsx est à la racine du repo.
═══════════════════════════════════════════════════════ */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../restaurant-manager.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

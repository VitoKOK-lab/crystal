import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { loadLiveCatalog } from "../app/catalog-live";
import Home from "../app/page";
import "../app/globals.css";

// Try to swap the baked-in catalog for the live database one BEFORE React
// mounts (bounded to ~2.5s; falls back to cached-then-baked data), so every
// component keeps reading plain module data with no async render states.
loadLiveCatalog().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Home />
    </StrictMode>,
  );
});

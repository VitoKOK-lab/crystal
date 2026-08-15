import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../app-admin/App";
import "../app-admin/admin.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

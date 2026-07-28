import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app-men/page";
import "../app-men/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
);

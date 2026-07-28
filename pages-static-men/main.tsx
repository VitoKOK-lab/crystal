import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app-men/page";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
);

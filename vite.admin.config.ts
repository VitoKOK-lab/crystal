// Admin SPA build → served by the Worker at /admin/ (static assets).
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "pages-admin",
  base: "/admin/",
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: "../dist-pages/admin",
    emptyOutDir: true,
  },
});

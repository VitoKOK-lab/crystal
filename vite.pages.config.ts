// Standalone static build for GitHub Pages (https://vitokok-lab.github.io/crystal/).
// The main vite.config.ts targets Cloudflare Workers via vinext; this config
// bundles the client-only builder page into plain static files instead.
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "pages-static",
  base: "/crystal/",
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "../dist-pages",
    emptyOutDir: true,
  },
});

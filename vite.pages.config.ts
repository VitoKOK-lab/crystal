// Static build of the storefront, served by the Cloudflare Worker's assets
// binding. `npm run build:cf` invokes this with --base=/ (the Worker serves
// at the domain root); the /crystal/ default here is a leftover from the
// retired GitHub Pages deploy and is always overridden in practice.
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

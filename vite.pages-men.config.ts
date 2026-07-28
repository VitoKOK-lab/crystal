// Second static build entry for the men's line (https://vitokok-lab.github.io/crystal/men/).
// Mirrors vite.pages.config.ts but builds app-men/ into dist-pages/men/. publicDir
// is disabled: public/ is already copied once by the root config's build, and this
// entry's JS only ever references public assets by absolute path ("/materials/...",
// rewritten to "/crystal/..." by fix-pages-base.sh), so a second copy would be dead
// weight under dist-pages/men/.
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "pages-static-men",
  base: "/crystal/men/",
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: "../dist-pages/men",
    emptyOutDir: true,
  },
});

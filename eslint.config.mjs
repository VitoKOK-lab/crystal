// Replaced eslint-config-next (the Next.js stack is gone): plain
// typescript-eslint recommended rules plus the React hooks rules, which are
// the ones that catch real bugs in this codebase.
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist/**", "dist-pages/**", "node_modules/**", ".wrangler/**", ".sites-runtime/**"]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Browser code, worker code and node test/build scripts share one repo;
  // the union of globals is simpler than three carve-outs and no-undef is
  // mostly superseded by TypeScript anyway.
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ["**/*.tsx", "**/*.ts"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      // Just the classic hook-correctness rules — the plugin's newer React
      // Compiler diagnostics don't apply to this non-compiled app.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // The catalog modules deliberately mutate exported bindings (live
      // hydration) and use empty catches for best-effort storage access.
      "no-empty": ["error", { "allowEmptyCatch": true }],
    },
  },
]);

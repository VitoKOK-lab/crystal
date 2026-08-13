// catalog.tsx and series.ts are "use client" TS/TSX modules meant to be
// bundled by Vite; plain Node can't parse the JSX in catalog.tsx's render
// helpers directly. Transpile with esbuild (already a project dependency
// via Vite) and import the compiled output instead of hand-maintaining a
// parallel plain-JS copy of the same logic for tests to run against.
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export async function importCompiled(entryPoint) {
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: "node",
    format: "esm",
    jsx: "automatic",
    write: false,
    external: ["react", "react/jsx-runtime", "react-dom"],
  });
  const dir = mkdtempSync(path.join(tmpdir(), "app-test-"));
  const outFile = path.join(dir, "compiled.mjs");
  writeFileSync(outFile, result.outputFiles[0].text);
  return import(pathToFileURL(outFile).href);
}

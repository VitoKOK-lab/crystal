// Test-only entry: bundles catalog-live together with the catalog and
// series modules it mutates, so tests can call hydrate() and observe the
// effect on the same module instances.
export * as live from "../../app/catalog-live";
export * as catalog from "../../app/catalog";
export * as series from "../../app/series";

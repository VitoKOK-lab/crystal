// Test-only entry: bundles the worker modules together so tests exercise
// the same module instances (lib's session-key cache included).
export * as lib from "../../worker/lib";
export * as admin from "../../worker/admin";
export * as orders from "../../worker/orders";
export * as quizReading from "../../worker/quiz-reading";
export * as ai from "../../worker/ai";
export * as ecpay from "../../worker/ecpay";
export * as linepay from "../../worker/linepay";
export * as auth from "../../worker/auth";
export { default as worker } from "../../worker/index";

// 訂單列的付款視角——綠界與 LINE Pay 共用的讀取與狀態轉移。
// 「pending → paid」是唯一合法的付款轉移，而且由 SQL 的
// AND status='pending' 守衛（重播回呼、重整導回頁都不可能二次入帳）。
import { Env } from "./lib";

export type PayableOrder = { id: string; total: number; status: string };

export const getOrder = (env: Env, orderId: string) =>
  env.DB.prepare("SELECT id, total, status FROM orders WHERE id=?").bind(orderId).first<PayableOrder>();

// column 是金流模組自己的對帳欄位（ecpay_trade_no / linepay_txn），
// 付款成功時蓋上金流方的交易編號。
export const markPaid = (env: Env, orderId: string, column: "ecpay_trade_no" | "linepay_txn", tradeRef: string) =>
  env.DB.prepare(`UPDATE orders SET status='paid', ${column}=? WHERE id=? AND status='pending'`)
    .bind(tradeRef, orderId).run();

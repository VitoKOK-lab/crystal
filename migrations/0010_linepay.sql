-- LINE Pay 交易編號：request 時先記嘗試號，Confirm 請款成功後蓋成
-- LINE 的 transactionId（字串存放——它是 19 位整數，不能走 JSON number）。
ALTER TABLE orders ADD COLUMN linepay_txn TEXT NOT NULL DEFAULT '';

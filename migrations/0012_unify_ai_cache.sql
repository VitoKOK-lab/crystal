-- 生日解讀的快取（0007 的獨立表）併進共用的 ai_texts：五個 AI 功能
-- 從此走同一條快取＋每日上限管線，不再各養一套 SQL。既有快取列原封
-- 搬過去（kind='quiz'），客人重測同樣資料照舊免費即時。
INSERT OR IGNORE INTO ai_texts (key, kind, payload, created_at)
  SELECT 'quiz:' || key, 'quiz', reading, created_at FROM quiz_readings;
DROP TABLE IF EXISTS quiz_readings;

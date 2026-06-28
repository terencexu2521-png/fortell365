-- v2 迁移：付费 + 解锁状态
-- npx wrangler d1 execute fortell365-db --remote --file=schema-migrate-v2.sql

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  user_id INTEGER,
  amount INTEGER NOT NULL DEFAULT 1990,
  status TEXT NOT NULL DEFAULT 'pending',
  pay_channel TEXT DEFAULT 'alipay_static',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);

ALTER TABLE reports ADD COLUMN is_unlocked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reports ADD COLUMN unlock_type TEXT;
ALTER TABLE reports ADD COLUMN order_id TEXT;

-- D1 数据库 Schema
-- 创建: npx wrangler d1 execute fortell365-db --file=schema.sql

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  gender TEXT NOT NULL,
  bazi_string TEXT NOT NULL,
  content TEXT NOT NULL,
  is_unlocked INTEGER NOT NULL DEFAULT 0,
  unlock_type TEXT,
  order_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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

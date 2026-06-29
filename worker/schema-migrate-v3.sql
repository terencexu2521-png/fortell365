-- v3 迁移：微信小程序 openid
-- npx wrangler d1 execute fortell365-db --remote --file=schema-migrate-v3.sql

ALTER TABLE users ADD COLUMN wechat_openid TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wechat_openid ON users(wechat_openid) WHERE wechat_openid IS NOT NULL;

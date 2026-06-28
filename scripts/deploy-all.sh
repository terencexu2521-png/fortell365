#!/usr/bin/env bash
# 一键部署：前端 Vercel + Worker Cloudflare
# 用法（只需提供两个 token，其余全自动）：
#   VERCEL_TOKEN=xxx CLOUDFLARE_API_TOKEN=yyy ./scripts/deploy-all.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "❌ 缺少 VERCEL_TOKEN（Vercel → Settings → Tokens）"
  exit 1
fi
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "❌ 缺少 CLOUDFLARE_API_TOKEN（Cloudflare → My Profile → API Tokens）"
  exit 1
fi

echo "📦 安装依赖并构建前端..."
npm install
npm run build

echo "☁️  部署 Cloudflare Worker (OCR + API)..."
cd worker
npx --yes wrangler@4 deploy --minify
cd "$ROOT"

echo "🚀 部署 Vercel 前端..."
npx --yes vercel@latest deploy --prod --yes --token "$VERCEL_TOKEN"

echo "✅ 部署完成"
echo "   前端: https://fortell365.com"
echo "   API:  https://fortell365.com/api  （Vercel 反代 Worker）"

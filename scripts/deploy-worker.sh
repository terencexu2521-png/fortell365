#!/usr/bin/env bash
# 仅部署 Cloudflare Worker（小程序/网站 API）
# 用法：CLOUDFLARE_API_TOKEN=你的token ./scripts/deploy-worker.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/worker"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "❌ 需要 CLOUDFLARE_API_TOKEN"
  echo "   Cloudflare 控制台 → My Profile → API Tokens → Create Token"
  echo "   权限：Account / Workers Scripts Edit + Zone 如需"
  exit 1
fi

npm install
npx wrangler deploy --minify
echo "✅ Worker 已部署：https://fortell365-api.terencexu2521.workers.dev"

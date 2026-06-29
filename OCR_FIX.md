# OCR 修复说明（fortell365）

## 问题根因

1. **`public/tesseract/` 目录缺失** — 打包时未包含 Tesseract 离线资源，浏览器 OCR 会直接失败。
2. **Tesseract 配置不完整** — 缺少 `corePath`、`workerBlobURL: false`，本地 worker 无法加载。
3. **识别顺序不合理** — 原先先跑 Tesseract（易错），AI 兜底只在「完全识别不到」时才触发；错字也会被当成成功。
4. **Worker OCR prompt 过于简单** — 返回格式不稳定，姓名/性别/四柱常解析失败。

## 已做修复

| 文件 | 改动 |
|------|------|
| `scripts/setup-tesseract.mjs` | 自动复制/下载 worker、core、chi_sim 到 `public/tesseract/` |
| `package.json` | 增加 `setup:tesseract` 与 `postinstall` |
| `src/lib/ocr.ts` | 统一八字校验、多策略提取、裁剪与 Tesseract 配置 |
| `src/pages/GeneratePage.tsx` | 规范 OCR 链路 + AI 复核覆盖误识别 |
| `worker/index.js` | 强化 OCR prompt；校验天干地支合法性 |

## 识别流程

```
上传排盘截图
    ↓
① cropTableArea() 裁剪表格区
    ↓
② Tesseract.js 浏览器端 OCR（public/tesseract/）
    ↓
③ extractBaziFromCroppedText() 按行提取
    ↓ 失败
④ extractBaziFromTable() 正则提取
    ↓ 仍失败或不准
⑤ Worker POST /ocr（DeepSeek Vision）— 结果优先
    ↓
填入表单（请核对黄色提示框）
```

## 语言包

`npm install` 后自动 `postinstall` → `public/tesseract/`。

手动（与 OpenClaw 说明一致）：

```bash
npm run setup:tesseract
# 或
mkdir -p public/tesseract
cp node_modules/tesseract.js/dist/worker.min.js public/tesseract/
```

`chi_sim.traineddata.gz` 及 wasm 核心文件由 `setup:tesseract` 自动下载。

```bash
cd fortell365
npm install          # 会自动 setup:tesseract
npm run dev          # 打开 http://localhost:5173
```

若 OCR 仍提示资源缺失：

```bash
npm run setup:tesseract
```

## 部署注意

### 前端（Vercel 等）

- 构建前会执行 `postinstall`，下载约 25MB 的 Tesseract 资源。
- 若 Vercel 构建超时，可先在本地 `npm run setup:tesseract` 后把 `public/tesseract/` 提交进仓库。

### Worker（Cloudflare）

修改了 `worker/index.js` 后需重新部署：

```bash
cd worker
npx wrangler deploy
```

确保 Worker 环境变量 **`DEEPSEEK_API_KEY`** 已配置，否则 AI OCR 会失败（仍会尝试本地 Tesseract）。

## 使用建议

- 上传**清晰、完整**的排盘截图（小巫排盘、问真八字等）。
- 识别后务必看黄色提示框，**核对八字再提交**。
- AI 识别失败时，可手动填写四柱，不影响生成报告。

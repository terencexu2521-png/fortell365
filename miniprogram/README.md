# 国学智慧·职业探索 — 微信小程序（探针版）

基于 Cloudflare Worker API 的微信小程序探针，用于验证排盘、微信登录、报告生成全流程。

## 前置条件

1. [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 已注册微信小程序，获取 **AppID**
3. Worker API 已部署（v3.6+），并完成 D1 迁移

## 快速开始

### 1. 配置 AppID

编辑 `project.config.json` 和 `project.private.config.json`，将 `wxYOUR_APPID_HERE` 替换为你的 AppID。

开发阶段可在 `project.private.config.json` 中设置 `"urlCheck": false` 跳过域名校验。

### 2. 配置 API 地址

编辑 `config.js`（默认已指向国内可访问的代理地址）：

```javascript
module.exports = {
  API_BASE: 'https://fortell365.com/api',  // Vercel 反代 Worker，勿直接用 workers.dev
};
```

> **注意**：`*.workers.dev` 在国内/微信开发者工具中经常超时导致 `request:fail`。需先在 Vercel 部署 `vercel.json` 中的 `/api/*` 反代规则（见仓库根目录 `vercel.json`）。

### 3. 导入项目

1. 打开微信开发者工具 → **导入项目**
2. 目录选择本仓库的 `miniprogram/` 文件夹
3. AppID 填入你的小程序 AppID（或使用测试号）
4. 编译运行

### 4. 配置服务器域名

在微信公众平台 → 开发 → 开发管理 → 开发设置 → **服务器域名** 中添加：

| 类型 | 域名 |
|------|------|
| request 合法域名 | `https://fortell365.com`（正式版；开发期可勾选「不校验合法域名」） |

## 页面流程

```
首页（隐私同意）→ 填写信息 → 确认四柱 → 生成报告 → 查看报告
                                    ↘ 我的报告（微信登录 + 历史列表）
```

## Worker 环境变量

在 Cloudflare Dashboard 或 `wrangler secret put` 中配置：

| 变量 | 说明 |
|------|------|
| `DEEPSEEK_API_KEY` | AI 报告生成 |
| `WECHAT_APPID` | 小程序 AppID |
| `WECHAT_SECRET` | 小程序 AppSecret |

## D1 数据库迁移

```bash
cd worker
npx wrangler d1 execute fortell365-db --remote --file=schema-migrate-v3.sql
```

## Worker 依赖安装

```bash
cd worker
npm install
npx wrangler deploy
```

## 合规说明

- 产品名称：**国学智慧·职业探索**
- 用户可见文案使用「文化档案」「四柱信息」「职业探索报告」
- 避免在用户界面出现「算命」「运势」「八字」等敏感词

## 目录结构

```
miniprogram/
├── app.js / app.json / app.wxss
├── config.js              # API 基址
├── project.config.json    # 项目配置（含 AppID 占位）
├── project.private.config.json
├── data/regions.js        # 省市经度数据
├── utils/api.js           # HTTP 封装
├── utils/md.js            # 简易 Markdown 渲染
└── pages/
    ├── index/             # 首页 + 隐私同意
    ├── input/             # 出生信息表单
    ├── confirm/           # 四柱确认
    ├── report/            # 报告展示
    └── profile/           # 微信登录 + 我的报告
```

## 探针验证清单

- [ ] `GET /config/features` 返回功能开关
- [ ] `POST /paipan` 正确计算四柱（含真太阳时校正）
- [ ] `POST /auth/wechat` 微信登录并返回 JWT
- [ ] `POST /generate` 带 Authorization 生成报告
- [ ] 免费期内报告自动解锁
- [ ] `GET /reports` 列出用户历史报告

/** 小程序 API 配置 */
module.exports = {
  /** 探针开发：优先直连 Worker（fortell365.com/api 的 POST 目前会 405） */
  API_BASE: 'https://fortell365-api.terencexu2521.workers.dev',
  API_BASE_FALLBACK: 'https://fortell365.com/api',
  PRODUCT_NAME: '国学智慧·专业/职业探索',
  /** 小程序认证完成前设为 true，走探路开发登录；正式 AppID 就绪后改 false */
  USE_DEV_LOGIN: true,
  /** API 不可达时用本地预览报告，保证探针流程可跑通 */
  USE_OFFLINE_PROBE: true,
};

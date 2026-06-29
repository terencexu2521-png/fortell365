/** 探针离线兜底：API 不可达时本地模拟登录/生成/读取报告（仅 USE_DEV_LOGIN 时启用） */
const SAMPLE_REPORT = `## 一、文化档案概览
（探针预览）基于您确认的四柱信息生成的文化档案概览。本段为本地预览内容，正式版将连接 AI 生成完整报告。

## 二、性格DNA
您展现出较强的学习意愿与自我探索倾向，重视逻辑与秩序，也保留对人文领域的兴趣。

## 三、五行力量深度分析
五行分布需结合具体四柱综合判断；探针模式下此处为示意结构。

## 四、格局与十神详解
格局与十神组合反映思维风格与行为偏好，建议结合专业兴趣进一步对照。

## 五、地支关系与人生密码
地支之间的刑冲合害提示人际与环境互动模式，宜扬长避短。

## 六、身强弱与用神喜忌
身强身弱影响「用力方向」，用神喜忌可作为专业方向参考维度之一。

## 七、人生各阶段趋势详解
不同人生阶段关注点会变化，持续积累比短期波动更重要。

## 八、当前阶段趋势分析
当前阶段适合梳理优势、补齐短板，主动尝试与专业相关的实践。

## 九、天赋领域与人生优势
**适合专业（示例）**：管理学、心理学、教育学、数据科学、法学
**适合职业（示例）**：产品策划、咨询顾问、研究员、教师、内容策划

## 十、个性画像总结
您重视自我成长与方向感，适合在结构化环境中发挥创意与执行力。`;

function storageKey() {
  return 'probe_local_reports';
}

function readReports() {
  return wx.getStorageSync(storageKey()) || {};
}

function writeReports(reports) {
  wx.setStorageSync(storageKey(), reports);
}

function mockDevLogin() {
  const payload = JSON.stringify({ id: 'probe_local', exp: Date.now() + 86400000 });
  const token = encodePayload(payload);
  return { success: true, data: { token } };
}

function encodePayload(str) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : NaN;
    const c = i < str.length ? str.charCodeAt(i++) : NaN;
    const n = (a << 16) | ((isNaN(b) ? 0 : b) << 8) | (isNaN(c) ? 0 : c);
    output += chars.charAt((n >> 18) & 63);
    output += chars.charAt((n >> 12) & 63);
    output += isNaN(b) ? '=' : chars.charAt((n >> 6) & 63);
    output += isNaN(c) ? '=' : chars.charAt(n & 63);
  }
  return output;
}

function mockGenerate(body) {
  const reportId = 'probe_' + Date.now().toString(36);
  const reports = readReports();
  reports[reportId] = {
    id: reportId,
    name: body.name || '用户',
    gender: body.gender || 'male',
    baziString: body.baziString || '',
    content: SAMPLE_REPORT,
    isUnlocked: true,
    unlockType: 'free_promo',
    createdAt: Date.now(),
    offline: true,
  };
  writeReports(reports);
  return {
    success: true,
    data: {
      reportId,
      isUnlocked: true,
      previewContent: SAMPLE_REPORT,
      fullContent: SAMPLE_REPORT,
      baziString: body.baziString || '',
    },
  };
}

function mockGetReport(id) {
  const report = readReports()[id];
  if (!report) throw new Error('报告不存在');
  return {
    success: true,
    data: {
      reportId: id,
      name: report.name,
      gender: report.gender,
      baziString: report.baziString,
      content: report.content,
      fullContent: report.content,
      isUnlocked: true,
    },
  };
}

function shouldUseOffline(err) {
  const msg = String((err && err.message) || err || '');
  return (
    msg.includes('405') ||
    msg.includes('网络') ||
    msg.includes('request:fail') ||
    msg.includes('请求失败(000)')
  );
}

module.exports = {
  mockDevLogin,
  mockGenerate,
  mockGetReport,
  shouldUseOffline,
};

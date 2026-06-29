/** 报告展示：旧标题 → 新格式（一、二、三…）+ 合规词 */
const TITLE_REPLACEMENTS = [
  ['## 模块一：命盘概览', '## 一、文化档案概览'],
  ['## 模块一：文化档案概览', '## 一、文化档案概览'],
  ['## 模块二：性格DNA', '## 二、性格DNA'],
  ['## 模块三：五行力量深度分析', '## 三、五行力量深度分析'],
  ['## 模块四：格局与十神详解', '## 四、格局与十神详解'],
  ['## 模块五：地支关系与人生密码', '## 五、地支关系与人生密码'],
  ['## 模块六：身强弱与用神喜忌', '## 六、身强弱与用神喜忌'],
  ['## 模块七：人生各阶段命理详解', '## 七、人生各阶段趋势详解'],
  ['## 模块七：人生各阶段趋势详解', '## 七、人生各阶段趋势详解'],
  ['## 模块八：当前运势详判', '## 八、当前阶段趋势分析'],
  ['## 模块八：当前阶段趋势分析', '## 八、当前阶段趋势分析'],
  ['## 模块九：天赋领域与人生优势', '## 九、天赋领域与人生优势'],
  ['## 模块十：命格总结', '## 十、个性画像总结'],
  ['## 模块十：个性画像总结', '## 十、个性画像总结'],
];

const REPORT_FOOTER_MARKER = '【温馨提示】';
const REPORT_FOOTER = `\n\n---\n\n> **温馨提示**：本报告基于国学文化档案与 AI 分析生成，仅供娱乐与自我探索参考，不构成升学、就业、投资或医疗决策依据。了解特质只是起点，人生掌握在自己手中——持续学习、主动争取，才能走出属于自己的精彩。`;

function appendReportFooter(content) {
  const text = String(content || '').trim();
  if (!text) return REPORT_FOOTER.trim();
  if (text.includes(REPORT_FOOTER_MARKER) || text.includes('人生掌握在自己手中')) return text;
  return text + REPORT_FOOTER;
}

function formatReportContent(content) {
  let out = String(content || '');
  for (const [from, to] of TITLE_REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  out = out
    .replace(/🔒\s*【死约束[^】]*】[\s\S]*?(?=## 一、)/g, '')
    .replace(/【.*?死约束.*?】[\s\S]*$/g, '')
    .replace(/---\s*\n\s*> ⚠️.*$/g, '')
    .replace(/\n\n---\n\n> \*\*温馨提示\*\*[\s\S]*$/,'')
    .trim();
  return appendReportFooter(out);
}

module.exports = { formatReportContent, appendReportFooter };

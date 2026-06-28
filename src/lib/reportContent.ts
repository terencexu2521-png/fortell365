import { applyComplianceFilter } from './complianceFilter'

const MODULE_HEADER = /^## (?:模块[一二三四五六七八九十\d]+[：:]|(?:[一二三四五六七八九十]+、))/

const REPORT_FOOTER_MARKER = '【温馨提示】'
const REPORT_FOOTER = `\n\n---\n\n> **温馨提示**：本报告基于国学文化档案与 AI 分析生成，仅供娱乐与自我探索参考，不构成升学、就业、投资或医疗决策依据。了解特质只是起点，人生掌握在自己手中——持续学习、主动争取，才能走出属于自己的精彩。`

function stripReportInternal(content: string): string {
  return content
    .replace(/🔒\s*【死约束[^】]*】[\s\S]*?(?=## 一、)/g, '')
    .replace(/---\s*\n\s*🔒.*$/gm, '')
    .replace(/【.*?死约束.*?】[\s\S]*$/g, '')
    .replace(/---\s*\n\s*> ⚠️.*$/g, '')
    .replace(/\n\n---\n\n> \*\*温馨提示\*\*[\s\S]*$/,'')
    .trim()
}

export function appendReportFooter(content: string): string {
  const text = (content || '').trim()
  if (!text) return REPORT_FOOTER.trim()
  if (text.includes(REPORT_FOOTER_MARKER) || text.includes('人生掌握在自己手中')) return text
  return text + REPORT_FOOTER
}

export function cleanReportContent(content: string): string {
  return appendReportFooter(applyComplianceFilter(stripReportInternal(content)))
}

export function splitReportModules(content: string): string[] {
  const cleaned = applyComplianceFilter(stripReportInternal(content))
  const modules: string[] = []
  let current = ''
  for (const line of cleaned.split('\n')) {
    if (MODULE_HEADER.test(line) && current.trim()) {
      modules.push(current.trim())
      current = line + '\n'
    } else {
      current += line + '\n'
    }
  }
  if (current.trim()) modules.push(current.trim())
  return modules
}

export const FREE_MODULE_COUNT = 5

export function getPreviewContent(content: string, freeCount = FREE_MODULE_COUNT): string {
  const modules = splitReportModules(content)
  if (modules.length === 0) return cleanReportContent(content)
  if (modules.length <= freeCount) return appendReportFooter(modules.join('\n\n'))
  return appendReportFooter(
    modules.slice(0, freeCount).join('\n\n') +
      '\n\n> *…以上为免费预览（前5章）。解锁后可查看完整10章报告*',
  )
}

export function getDisplayContent(content: string, isUnlocked: boolean): string {
  return isUnlocked ? cleanReportContent(content) : getPreviewContent(content)
}

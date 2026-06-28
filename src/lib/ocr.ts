/** 八字 OCR 解析与校验（GeneratePage 与 Worker 共用逻辑） */

export const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
export const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

export type Pillar = { gan: string; zhi: string }
export type Pillars = { year: Pillar; month: Pillar; day: Pillar; hour: Pillar }

const G = TIAN_GAN.join('')
const Z = DI_ZHI.join('')

/** Tesseract 常在汉字间插空格，合并之 */
export function collapseCjkSpaces(text: string): string {
  let prev = ''
  let cur = text
  while (cur !== prev) {
    prev = cur
    cur = cur.replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2')
  }
  return cur
}

const GAN_OCR_FIX: Record<string, string> = {
  心: '乙', 用: '辛', 千: '甲', 画: '庚', 华: '辛', 王: '壬', 于: '丁', 平: '辛', 扬: '辛', 士: '辛', E: '壬', Z: '乙',
}
const ZHI_OCR_FIX: Record<string, string> = {
  习: '丑', 乍: '丑', 丘: '丑', 财: '寅', 术: '未',
}

function fixGanChar(ch: string): string | null {
  if (G.includes(ch)) return ch
  return GAN_OCR_FIX[ch] ?? null
}

function fixZhiChar(ch: string): string | null {
  if (Z.includes(ch)) return ch
  return ZHI_OCR_FIX[ch] ?? null
}

function extractCharsFromSegment(segment: string, fix: (c: string) => string | null, valid: string): string[] {
  const out: string[] = []
  for (const ch of segment.replace(/[^\u4e00-\u9fff]/g, '')) {
    const fixed = fix(ch)
    if (fixed && valid.includes(fixed)) {
      out.push(fixed)
      if (out.length >= 4) break
    }
  }
  return out.slice(0, 4)
}

const GAN_WUXING: Record<string, string> = { 甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水' }
const GAN_YINYANG: Record<string, string> = { 甲:'阳',乙:'阴',丙:'阳',丁:'阴',戊:'阳',己:'阴',庚:'阳',辛:'阴',壬:'阳',癸:'阴' }
const GAN_SEQ: Record<string, number> = { 甲:1,乙:2,丙:3,丁:4,戊:5,己:6,庚:7,辛:8,壬:9,癸:10 }

/** 各地支藏干（本气优先），用于十神反推歧义消解 */
const ZHI_CANG: Record<string, string[]> = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
  辰: ['戊', '乙', '癸'], 巳: ['丙', '庚', '戊'], 午: ['丁', '己'], 未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
}

function sW(w: string) { return ({ 木:'水',火:'木',土:'火',金:'土',水:'金' } as Record<string,string>)[w] }
function wS(w: string) { return ({ 木:'火',火:'土',土:'金',金:'水',水:'木' } as Record<string,string>)[w] }
function kW(w: string) { return ({ 木:'金',火:'水',土:'木',金:'火',水:'土' } as Record<string,string>)[w] }
function wK(w: string) { return ({ 木:'土',火:'金',土:'水',金:'木',水:'火' } as Record<string,string>)[w] }

function getShiShen(dayGan: string, otherGan: string): string {
  if (dayGan === otherGan) return '日主'
  const dw = GAN_WUXING[dayGan], ow = GAN_WUXING[otherGan]
  const ds = (GAN_SEQ[dayGan] % 2) === (GAN_SEQ[otherGan] % 2)
  if (dw === ow) return ds ? '比肩' : '劫财'
  if (ow === sW(dw)) return ds ? '偏印' : '正印'
  if (ow === wS(dw)) return ds ? '食神' : '伤官'
  if (ow === kW(dw)) return ds ? '七杀' : '正官'
  if (ow === wK(dw)) return ds ? '偏财' : '正财'
  return '未知'
}

/** OCR 十神反推专用：比肩位=日主本身 */
function ganFromShiShen(dayGan: string, label: string): string | null {
  const norm = normalizeShiShenLabel(label)
  if (norm === '日元' || norm === '日主') return dayGan
  if (norm === '比肩') return dayGan
  for (const g of G) {
    if (g === dayGan) continue
    if (getShiShen(dayGan, g) === norm) return g
  }
  return null
}

/** OCR 十神标签归一化（问真/小巫常见误识） */
export function normalizeShiShenLabel(raw: string): string {
  const s = raw.replace(/\s/g, '')
  if (s === '日元' || s === '日主') return '日元'
  const exact: Record<string, string> = {
    正印: '正印', 偏印: '偏印', 偶印: '偏印', 正财: '正财', 偏财: '偏财',
    正官: '正官', 偏官: '七杀', 七杀: '七杀', 比肩: '比肩', 劫财: '劫财',
    食神: '食神', 伤官: '伤官', 仿官: '伤官', 比局: '比肩', 比肽: '比肩',
    比股: '比肩', 正F: '正印', 正f: '正印', 正宠: '正官', 正宫: '正官', 劫才: '劫财',
  }
  if (exact[s]) return exact[s]
  if (/食神|食饲|食伯|食伸/.test(s)) return '食神'
  if (/伤官|仿官|份定|仿百/.test(s)) return '伤官'
  if (/偏印|偶印|俳印|偏E/.test(s)) return '偏印'
  if (/正印/.test(s)) return '正印'
  if (/正财/.test(s)) return '正财'
  if (/偏财/.test(s)) return '偏财'
  if (/正官|正宠/.test(s)) return '正官'
  if (/七杀|偏官/.test(s)) return '七杀'
  if (/比肩|比局|比肽|比所|比股/.test(s)) return '比肩'
  if (/劫财|劫才|劲哉|励财/.test(s)) return '劫财'
  return s
}

function mergeShiShenTokens(tokens: string[]): string[] {
  const out: string[] = []
  const pairs: [string, string][] = [
    ['日', '元'], ['日', '主'], ['正', '印'], ['偏', '印'], ['正', '财'], ['偏', '财'],
    ['正', '官'], ['正', 'F'], ['七', '杀'], ['比', '肩'], ['劫', '财'], ['食', '神'], ['伤', '官'],
  ]
  for (let i = 0; i < tokens.length; i++) {
    let matched = false
    for (const [a, b] of pairs) {
      if (tokens[i] === a && tokens[i + 1] === b) { out.push(a + b); i++; matched = true; break }
    }
    if (!matched && tokens[i].length > 1 && /印|财|官|杀|神|肩|元|主/.test(tokens[i])) out.push(tokens[i])
  }
  return out
}

const SHISHEN_KNOWN = ['正印','偏印','正财','偏财','正官','七杀','比肩','劫财','食神','伤官','日元']

/** 从「主星」或「副星」行提取十神（多条主星行时取归一化成功最多的那条） */
export function extractShiShenRow(text: string): string[] | null {
  const labelRes = ['主\\s*星', '副\\s*星']
  let best: string[] | null = null
  let bestValid = 0
  for (const label of labelRes) {
    for (const line of text.split('\n')) {
      if (!new RegExp(label).test(line)) continue
      const seg = line.replace(new RegExp(`^[\\s\\S]*?${label}[：:\\s]*`, 'u'), '')
      const merged = mergeShiShenTokens(seg.split(/\s+/).filter(Boolean)).map(normalizeShiShenLabel)
      if (merged.length < 4) continue
      const top = merged.slice(0, 4)
      const valid = top.filter((s) => SHISHEN_KNOWN.includes(s)).length
      if (valid > bestValid) { bestValid = valid; best = top }
    }
    if (label === '主\\s*星' && bestValid >= 4) break
  }
  return bestValid >= 4 ? best : null
}

const ZHI_ROW_RE = /(?:地|坚|&)\s*支|&\s*爻/
const ZHI_ROW_STRIP = /^[\s\S]*?(?:地|坚|&)\s*支[：:\s"'「『]*/u

/** 从「地支提示」行收集地支字 */
function extractZhiTipChars(text: string): string[] {
  const m = text.match(/地\s*支\s*提\s*示[：:\s]*([^\n]+)/)
  if (!m) return []
  const out: string[] = []
  for (const ch of m[1].replace(/[^\u4e00-\u9fff]/g, '')) {
    const z = fixZhiChar(ch)
    if (z && Z.includes(z) && !out.includes(z)) out.push(z)
  }
  return out
}

/** 地支行只识别到 3 个时，用地支提示补缺失的月支等（常见漏识酉） */
function repairZhisFromTips(partial: string[], text: string): string[] | null {
  if (partial.length !== 3) return null
  const tips = extractZhiTipChars(text)
  const missing = tips.filter((z) => !partial.includes(z))
  if (missing.length !== 1) return null
  return [partial[0], missing[0], partial[1], partial[2]]
}

/** 乾造行 ( 乙 酉 ) 括号内首字常为年干 hint */
function extractHeaderGanHint(text: string): string | null {
  const m = text.match(/\(\s*([甲乙丙丁戊己庚辛壬癸])\s*[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]\s*\)/)
  return m ? m[1] : null
}

/** 统计 OCR 全文出现的天干（作候选消歧）；跳过「己 土 / 庚 金」等五行标注行 */
function extractGanFreqFromText(text: string): Map<string, number> {
  const freq = new Map<string, number>()
  for (const line of text.split('\n')) {
    if (/提\s*示|笔\s*记|节\s*气|农\s*历|属\s|藏\s*干|副\s*星/.test(line)) continue
    const compact = line.replace(/\s+/g, '')
    if (/[甲乙丙丁戊己庚辛壬癸][金木水火土]/.test(compact)) continue
    for (const ch of line.replace(/[^\u4e00-\u9fffA-Za-z]/g, '')) {
      const f = fixGanChar(ch)
      if (f && G.includes(f)) freq.set(f, (freq.get(f) || 0) + 1)
    }
  }
  return freq
}

/** 无「天干提示」行时，从藏干区提取 壬/丁 等 loose hint（许为杰类：王水 + 丁火） */
function extractLooseStemHints(text: string): string[] | null {
  const fromCombine = extractGanCombineHint(text)
  if (fromCombine) return fromCombine
  const hints: string[] = []
  if (/王\s*水|\b王\b/.test(text) && /藏\s*干/.test(text)) hints.push('壬')
  if (/丁\s*火/.test(text)) hints.push('丁')
  if (/辛\s*金|平\s*金|年\s*金/.test(text)) hints.push('辛')
  return hints.length >= 2 ? hints : null
}

export function extractGansFromLineAboveZhi(text: string): string[] | null {
  const lines = text.split('\n')
  // 1. 优先按「地支」标签行
  for (let i = 1; i < lines.length; i++) {
    const ln = lines[i].trim()
    if (!ZHI_ROW_RE.test(ln)) continue
    if (/提\s*示|相\s*冲|半\s*合|暗\s*合|自\s*刑/.test(ln)) continue
    const seg = ln.replace(ZHI_ROW_STRIP, '')
    const zhis = extractCharsFromSegment(seg, fixZhiChar, Z)
    if (zhis.length < 3) continue
    const above = (lines[i - 1] || '').replace(/^[^\u4e00-\u9fff]+/, '')
    const gans = extractCharsFromSegment(above, fixGanChar, G)
    if (gans.length >= 3) return gans.slice(0, 4)
  }
  // 2. 兜底：含最多地支的行，取其上一行作天干行
  let bestZhiIdx = -1, bestZhiCount = 0
  for (let i = 0; i < lines.length; i++) {
    if (/提\s*示|笔\s*记|节\s*气|惊\s*蛰|春\s*分|藏\s*干|主\s*星|副\s*星/.test(lines[i])) continue
    const zhis = extractCharsFromSegment(lines[i].replace(/\s+/g, ''), fixZhiChar, Z)
    if (zhis.length > bestZhiCount) { bestZhiCount = zhis.length; bestZhiIdx = i }
  }
  if (bestZhiIdx > 0 && bestZhiCount >= 3) {
    const above = (lines[bestZhiIdx - 1] || '').replace(/^[^\u4e00-\u9fff]+/, '')
    const gans = extractCharsFromSegment(above, fixGanChar, G)
    if (gans.length >= 3) return gans.slice(0, 4)
  }
  return null
}

/** 时间局「天干提示：丁壬可合木 / 甲己可合土」→ 日主/时干 hint */
export function extractGanCombineHint(text: string): string[] | null {
  const m = text.match(/天\s*干\s*提\s*示[：:\s]*([^\n]+)/)
  if (!m) return null
  const gans: string[] = []
  for (const ch of m[1].replace(/[^\u4e00-\u9fff]/g, '')) {
    const f = fixGanChar(ch)
    if (f && G.includes(f) && !gans.includes(f)) gans.push(f)
  }
  return gans.length >= 2 ? gans : null
}

/** 主星行与地支行之间的彩色天干行（时间局：主星 → 天干 → 地支） */
export function extractGansFromStemRow(text: string): string[] | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  let starIdx = -1
  let zhiIdx = -1
  let bestZhiCount = 0
  for (let i = 0; i < lines.length; i++) {
    if (starIdx < 0 && /主\s*星/.test(lines[i])) starIdx = i
    if (!ZHI_ROW_RE.test(lines[i]) || /提\s*示|相\s*冲|半\s*合/.test(lines[i])) continue
    const zhis = extractCharsFromSegment(lines[i].replace(ZHI_ROW_STRIP, ''), fixZhiChar, Z)
    if (zhis.length >= 3 && zhis.length >= bestZhiCount) {
      bestZhiCount = zhis.length
      zhiIdx = i
    }
  }
  if (starIdx < 0 || zhiIdx <= starIdx) return null
  for (let i = starIdx + 1; i < zhiIdx; i++) {
    const line = lines[i]
    if (/藏\s*干|提\s*示|副\s*星|五\s*行|主\s*星|日\s*期|年\s*柱/.test(line)) continue
    if (/天\s*干|大\s*干/.test(line)) {
      const seg = line.replace(/^[\s\S]*?(?:天|大)\s*干[：:\s]*/u, '')
      const gans = extractCharsFromSegment(seg, fixGanChar, G)
      if (gans.length === 4) return gans
    }
    if (/[甲乙丙丁戊己庚辛壬癸][金木水火土]/.test(line.replace(/\s/g, ''))) continue
    const gans = extractCharsFromSegment(line, fixGanChar, G)
    if (gans.length === 4) return gans
  }
  return null
}

/** 从 OCR 文本中提取恰好 4 个天干（彩色天干行专用） */
export function parseGansFromOcrText(text: string): string[] | null {
  let best: string[] = []
  for (const line of text.split('\n')) {
    const gans = extractCharsFromSegment(line, fixGanChar, G)
    if (gans.length === 4) return gans
    if (gans.length > best.length) best = gans
  }
  const all = extractCharsFromSegment(text, fixGanChar, G)
  if (all.length === 4) return all
  return best.length === 4 ? best : null
}

function isColoredStemPixel(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max < 45) return false
  const sat = max === 0 ? 0 : (max - min) / max
  if (sat < 0.1 && max > 175) return false
  return sat > 0.1 && max - min > 16
}

/** 裁剪表格区中「第一行彩色字」= 天干行，白底黑字便于 OCR */
export async function cropColoredGanRowBand(
  file: Blob | File,
  yStart = 0.18,
  yEnd = 0.52,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(img.src)
      const W = img.width
      const H = img.height
      const cropY = Math.round(H * yStart)
      const cropH = Math.round(H * (yEnd - yStart))
      const scale = W < 1400 ? 2 : 1
      const cw = W * scale
      const ch = cropH * scale
      const canvas = document.createElement('canvas')
      canvas.width = cw
      canvas.height = ch
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, cropY, W, cropH, 0, 0, cw, ch)
      const imgData = ctx.getImageData(0, 0, cw, ch)
      const d = imgData.data
      const stripH = Math.max(6, Math.floor(ch / 24))
      const strips: { y: number; count: number }[] = []
      for (let y = 0; y < ch; y += stripH) {
        let count = 0
        for (let yy = y; yy < Math.min(y + stripH, ch); yy++) {
          for (let x = 0; x < cw; x++) {
            const i = (yy * cw + x) * 4
            if (isColoredStemPixel(d[i], d[i + 1], d[i + 2])) count++
          }
        }
        strips.push({ y, count })
      }
      const maxCount = Math.max(...strips.map((s) => s.count), 0)
      if (maxCount < 15) {
        resolve(null)
        return
      }
      const threshold = maxCount * 0.3
      let peakY = -1
      for (let i = 0; i < strips.length; i++) {
        if (strips[i].count < threshold) continue
        const isPeak = (i === 0 || strips[i].count >= strips[i - 1].count)
          && (i === strips.length - 1 || strips[i].count >= strips[i + 1].count)
        if (isPeak) {
          peakY = strips[i].y
          break
        }
      }
      if (peakY < 0) {
        const upper = strips.filter((s) => s.y < ch * 0.62).sort((a, b) => b.count - a.count)[0]
        peakY = upper?.y ?? -1
      }
      if (peakY < 0) {
        resolve(null)
        return
      }
      const bandTop = Math.max(0, peakY - stripH)
      const bandBottom = Math.min(ch, peakY + stripH * 2)
      const bandH = bandBottom - bandTop
      const out = document.createElement('canvas')
      out.width = cw
      out.height = bandH
      const octx = out.getContext('2d')!
      octx.fillStyle = '#ffffff'
      octx.fillRect(0, 0, cw, bandH)
      for (let yy = 0; yy < bandH; yy++) {
        for (let x = 0; x < cw; x++) {
          const si = ((bandTop + yy) * cw + x) * 4
          if (isColoredStemPixel(d[si], d[si + 1], d[si + 2])) {
            octx.fillStyle = '#000000'
            octx.fillRect(x, yy, 1, 1)
          }
        }
      }
      out.toBlob((b) => resolve(b), 'image/png')
    }
    img.onerror = () => resolve(null)
    img.src = URL.createObjectURL(file)
  })
}

/** 从「天干/大干」行提取（噪声大，作 hint；3 个也保留） */
export function extractGansFromLabels(text: string): string[] | null {
  for (const line of text.split('\n')) {
    if (!/天\s*干|大\s*干/.test(line) || /提\s*示/.test(line)) continue
    const seg = line.replace(/^[\s\S]*?(?:天|大)\s*干[：:\s]*/u, '')
    const gans = extractCharsFromSegment(seg, fixGanChar, G)
    if (gans.length >= 3) return gans.slice(0, 4)
  }
  return null
}

/** 从「藏干」行提取每柱首个天干 hint */
export function extractGansFromCangGan(text: string): string[] | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const idx = lines.findIndex((l) => /藏\s*干/.test(l))
  if (idx < 0) return null
  const WUXING = '金木水火土'
  const pick = (s: string) => {
    const out: string[] = []
    for (const ch of s.replace(/[^\u4e00-\u9fff]/g, '')) {
      if (WUXING.includes(ch)) continue
      const f = fixGanChar(ch)
      if (f) out.push(f)
    }
    return out
  }
  const block = pick(lines[idx].replace(/^[\s\S]*?藏\s*干[：:\s]*/u, '')).concat(pick(lines[idx + 1] || ''))
  if (block.length >= 4) return [block[0], block[1], block[2], block[block.length - 1]].slice(0, 4)
  return block.length >= 3 ? block : null
}

/** 十神反推四柱天干：枚举日主，匹配主星行（比 AI 更稳） */
export function inferGansFromShiShenRow(text: string, knownZhi?: string[] | null): string[] | null {
  const row = extractShiShenRow(text)
  if (!row || row.length < 4) return null
  const labels = row.slice(0, 4).map(normalizeShiShenLabel)
  // 时间局/问真：日柱主星恒为「日元」，OCR 常误识为偏印/正财等
  labels[2] = '日元'
  const candidates: string[][] = []

  for (const dayGan of G) {
    const gans = labels.map((ss) => (ss === '日元' ? dayGan : ganFromShiShen(dayGan, ss)))
    if (!gans.every((g) => g && G.includes(g))) continue
    const ok = labels.every((ss, i) => {
      if (ss === '日元') return true
      if (ss === '比肩') return gans[i] === dayGan
      return getShiShen(dayGan, gans[i]!) === ss
    })
    if (ok) candidates.push(gans as string[])
  }
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]

  const labelGans = extractGansFromLabels(text) || extractGansFromLineAboveZhi(text)
  const ganTip = extractLooseStemHints(text)
  const cangGan = extractGansFromCangGan(text)
  const ganFreq = extractGanFreqFromText(text)
  const headerGan = extractHeaderGanHint(text)

  const scoreCandidate = (gans: string[]) => {
    let score = 0
    if (headerGan && gans[0] === headerGan) score += 15
    if (labelGans?.[0] && gans[0] === labelGans[0]) score += 10
    if (labelGans) {
      for (let i = 1; i < 4; i++) {
        if (labelGans[i] && gans[i] === labelGans[i]) score += 4
      }
    }
    if (cangGan) {
      for (let i = 0; i < Math.min(4, cangGan.length); i++) {
        if (cangGan[i] && gans[i] === cangGan[i]) score += 8
      }
    }
    if (ganTip) {
      if (ganTip.includes(gans[2])) score += 20
      if (ganTip.includes(gans[3])) score += 16
      if (ganTip.includes(gans[1])) score += 8
      if (ganTip.includes(gans[0])) score += 8
    }
    if (labels[0] === labels[1] && labels[0] !== '日元' && gans[0] === gans[1]) score += 10
    if (/王/.test(text) && gans[2] === '壬') score += 22
    if (/丁\s*火/.test(text) && gans[3] === '丁') score += 22
    if (/辛\s*金|平\s*金/.test(text) && gans[0] === '辛') score += 12
    for (const g of gans) score += (ganFreq.get(g) || 0) * 2
    return score
  }

  const scored = candidates.map((gans) => ({ gans, score: scoreCandidate(gans) }))
  scored.sort((a, b) => b.score - a.score)
  return scored[0].gans
}

/** 解析四柱天干：优先彩色天干行 / 主星下地支行，十神反推仅兜底 */
export function resolveGans(
  text: string,
  knownZhi?: string[] | null,
  coloredGansHint?: string[] | null,
): string[] | null {
  if (coloredGansHint?.length === 4 && coloredGansHint.every((g) => G.includes(g))) {
    return coloredGansHint.slice()
  }
  const stemRow = extractGansFromStemRow(text)
  if (stemRow?.length === 4) {
    const inferred = inferGansFromShiShenRow(text, knownZhi)
    const row = extractShiShenRow(text)
    if (inferred?.length === 4 && row?.length >= 4) {
      const labels = row.slice(0, 4).map(normalizeShiShenLabel)
      labels[2] = '日元'
      const dayGan = inferred[2]
      const fixed = stemRow.slice()
      fixed[2] = dayGan
      const stemMatches = labels.every((ss, i) => {
        if (i === 2) return true
        if (ss === '比肩') return fixed[i] === dayGan
        return getShiShen(dayGan, fixed[i]!) === ss
      })
      return stemMatches ? fixed : inferred
    }
    return stemRow
  }
  const labeled = extractGansFromLabels(text)
  if (labeled?.length === 4) return labeled
  const aboveZhi = extractGansFromLineAboveZhi(text)
  if (aboveZhi?.length === 4) return aboveZhi
  return inferGansFromShiShenRow(text, knownZhi)
}

export function pillarsFromGansZhi(gans: string[], zhis: string[]): Pillars | null {
  if (gans.length !== 4 || zhis.length !== 4) return null
  return pillarsFromParts(gans.map((g, i) => g + zhis[i]))
}

/** 仅从「地支行」提取四柱地支（通常比天干准） */
export function extractZhisFromLabels(text: string): string[] | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  for (const line of lines) {
    if (!ZHI_ROW_RE.test(line)) continue
    if (/地\s*支\s*提\s*示|相\s*冲|半\s*合|暗\s*合/.test(line)) continue
    const seg = line.replace(ZHI_ROW_STRIP, '')
    const zhis = extractCharsFromSegment(seg, fixZhiChar, Z)
    if (zhis.length === 4) return zhis
    if (zhis.length === 3) {
      const repaired = repairZhisFromTips(zhis, text)
      if (repaired) return repaired
    }
  }
  // 兜底：找含最多地支的单行（跳过提示区）
  let best: string[] = []
  for (const line of lines) {
    if (/提\s*示|笔\s*记|节\s*气|惊\s*蛰|春\s*分/.test(line)) continue
    const zhis: string[] = []
    for (const ch of line.replace(/\s+/g, '')) {
      const z = fixZhiChar(ch)
      if (z && Z.includes(z)) { zhis.push(z); if (zhis.length >= 4) break }
    }
    if (zhis.length > best.length) best = zhis.slice(0, 4)
  }
  if (best.length === 3) {
    const repaired = repairZhisFromTips(best, text)
    if (repaired) return repaired
  }
  return best.length === 4 ? best : null
}

/** 问真/小巫等：优先读「天干」「地支」标签行（地支行通常更准） */
export function extractBaziFromGanZhiLabels(text: string): string | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  let gans: string[] = []
  let zhis: string[] = []

  for (const line of lines) {
    if (/天\s*干/.test(line)) {
      const seg = line.replace(/^[\s\S]*?天\s*干[：:\s]*/u, '')
      gans = extractCharsFromSegment(seg, fixGanChar, G)
    }
    if (/地\s*支/.test(line)) {
      const seg = line.replace(/^[\s\S]*?地\s*支[：:\s]*/u, '')
      zhis = extractCharsFromSegment(seg, fixZhiChar, Z)
    }
  }

  if (gans.length === 4 && zhis.length === 4) {
    return `${gans[0]}${zhis[0]} ${gans[1]}${zhis[1]} ${gans[2]}${zhis[2]} ${gans[3]}${zhis[3]}`
  }
  return null
}

/** 发给 AI 前：合并空格 + 截取命盘区 + 十神/藏干 hint */
export function prepareOcrTextForAi(raw: string, knownZhi?: string[] | null, knownGans?: string[] | null): string {
  const zhis = knownZhi?.length === 4 ? knownZhi : extractZhisFromLabels(raw)
  const gans = knownGans?.length === 4 ? knownGans : resolveGans(raw, zhis) || extractGansFromCangGan(raw) || extractGansFromLabels(raw)
  const collapsed = collapseCjkSpaces(raw)
  const nameLine = collapsed.match(/(?:乾造|坤造)[^\n]{0,50}/)?.[0] ?? ''
  const tableMatch = collapsed.match(/(?:命盘|细盘)[\s\S]{0,1200}/)?.[0] ?? collapsed.slice(0, 2000)
  const shiShen = extractShiShenRow(raw)?.join('、') ?? ''
  const zhiHint = zhis?.length === 4
    ? `【系统提示】地支已锁定：${zhis.join('、')}。勿改地支。\n`
    : ''
  const ganHint = gans?.length === 4
    ? `【系统提示】天干推断：${gans.join('、')}（来自主星十神/藏干）。辛↔己、壬↔丁/王 是常见误识。\n`
    : ''
  const shiHint = shiShen ? `【主星十神】${shiShen}\n` : ''
  return `${zhiHint}${ganHint}${shiHint}${nameLine}\n${tableMatch}`.slice(0, 5000)
}

export function isValidBaziParts(parts: string[]): boolean {
  if (parts.length !== 4) return false
  return parts.every((p) => p.length === 2 && G.includes(p[0]) && Z.includes(p[1]))
}

export function pillarsFromParts(parts: string[]): Pillars | null {
  if (!isValidBaziParts(parts)) return null
  return {
    year: { gan: parts[0][0], zhi: parts[0][1] },
    month: { gan: parts[1][0], zhi: parts[1][1] },
    day: { gan: parts[2][0], zhi: parts[2][1] },
    hour: { gan: parts[3][0], zhi: parts[3][1] },
  }
}

export function extractNameFromText(rawText: string): string {
  const compact = collapseCjkSpaces(rawText)
  const m1 = compact.match(/(?:坤造|乾造)([\u4e00-\u9fff]{2,4})/)
  if (m1) return m1[1]
  const m2 = rawText.match(/(?:坤|乾)\s*造\s*([\u4e00-\u9fff](?:\s*[\u4e00-\u9fff]){1,3})/)
  if (m2) return m2[1].replace(/\s+/g, '')
  for (const p of [/姓名[：:]\s*(\S{2,4})/, /命主[：:]\s*(\S{2,4})/]) {
    const mm = rawText.match(p)
    if (mm) return mm[1].replace(/\s+/g, '')
  }
  return ''
}

export function extractGenderFromText(rawText: string): 'male' | 'female' | null {
  if (/坤造/.test(rawText)) return 'female'
  if (/乾造/.test(rawText)) return 'male'
  if (/女|female|♀/.test(rawText)) return 'female'
  if (/男|male|♂/.test(rawText)) return 'male'
  return null
}

/** 裁剪区 OCR：找天干行 + 地支行，按列配对 */
export function extractBaziFromCroppedText(text: string): string | null {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)

  let bestGan = '', bestZhi = '', maxG = 0, maxZ = 0
  for (const line of lines) {
    let gc = 0, zc = 0
    const compact = line.replace(/\s+/g, '')
    for (const ch of compact) {
      if (G.includes(ch)) gc++
      if (Z.includes(ch)) zc++
    }
    if (gc > maxG) { maxG = gc; bestGan = line }
    if (zc > maxZ) { maxZ = zc; bestZhi = line }
  }

  if (maxG < 2 || maxZ < 2) return null

  const gans: string[] = [], zhis: string[] = []
  const gc = bestGan.replace(/\s+/g, ''), zc = bestZhi.replace(/\s+/g, '')
  for (const ch of gc) { if (G.includes(ch) && gans.length < 4) gans.push(ch) }
  for (const ch of zc) { if (Z.includes(ch) && zhis.length < 4) zhis.push(ch) }

  if (gans.length === 4 && zhis.length === 4) {
    return `${gans[0]}${zhis[0]} ${gans[1]}${zhis[1]} ${gans[2]}${zhis[2]} ${gans[3]}${zhis[3]}`
  }
  return null
}

/** 正则兜底：从整段 OCR 文本匹配四柱 */
export function extractBaziFromTable(text: string): string | null {
  const m1 = text.match(new RegExp(`([${G}][${Z}])\\s+([${G}][${Z}])\\s+([${G}][${Z}])\\s+([${G}][${Z}])`))
  if (m1) {
    const parts = [m1[1], m1[2], m1[3], m1[4]]
    if (isValidBaziParts(parts)) return parts.join(' ')
  }

  const m2 = text.match(new RegExp(`([${G}][${Z}])([${G}][${Z}])([${G}][${Z}])([${G}][${Z}])`))
  if (m2) {
    const parts = [m2[1], m2[2], m2[3], m2[4]]
    if (isValidBaziParts(parts)) return parts.join(' ')
  }

  const pairs: string[] = []
  const re = new RegExp(`([${G}])([${Z}])`, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) pairs.push(m[1] + m[2])

  if (pairs.length >= 4) {
    const parts = pairs.slice(-4)
    if (isValidBaziParts(parts)) return parts.join(' ')
  }

  return null
}

/** 按行提取 → 正则提取 */
export function extractBaziFromText(text: string): string | null {
  const normalized = collapseCjkSpaces(text)
  const fromLabels = extractBaziFromGanZhiLabels(text)
  if (fromLabels && isValidBaziParts(fromLabels.split(' '))) return fromLabels
  const fromLines = extractBaziFromCroppedText(normalized)
  if (fromLines && isValidBaziParts(fromLines.split(' '))) return fromLines
  return extractBaziFromTable(normalized)
}

export const TESSERACT_OPTS = {
  workerPath: '/tesseract/worker.min.js',
  langPath: '/tesseract',
  corePath: '/tesseract',
  workerBlobURL: false,
} as const

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

/** 压缩图片，避免 API 请求过大 */
export async function compressImageForOcr(file: File, maxWidth = 1400): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = img.width > maxWidth ? maxWidth / img.width : 1
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('图片压缩失败')); return }
          const r = new FileReader()
          r.onload = () => resolve({ blob, dataUrl: r.result as string })
          r.onerror = reject
          r.readAsDataURL(blob)
        },
        'image/jpeg',
        0.88,
      )
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

function enhanceCanvas(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h)
  const d = imgData.data
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    const v = gray < 128 ? Math.max(0, gray * 0.85) : Math.min(255, gray * 1.15)
    d[i] = d[i + 1] = d[i + 2] = v
  }
  ctx.putImageData(imgData, 0, 0)
}

/** 裁剪排盘图表格区（多段尝试，适配不同 App 布局） */
export async function cropTableArea(file: File | Blob, yStart = 0.22, yEnd = 0.52): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const W = img.width, H = img.height
      const cropY = Math.round(H * yStart)
      const cropH = Math.round(H * (yEnd - yStart))
      const scale = W < 1400 ? 2 : 1
      const canvas = document.createElement('canvas')
      canvas.width = W * scale
      canvas.height = cropH * scale
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(img, 0, cropY, W, cropH, 0, 0, canvas.width, canvas.height)
      enhanceCanvas(ctx, canvas.width, canvas.height)
      canvas.toBlob((b) => { if (b) resolve(b); else reject(new Error('裁剪失败')) }, 'image/png')
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

export type OcrApiResult = {
  name?: string
  gender?: 'male' | 'female' | string
  baziString?: string
  pillars?: Pillar[]
}

export function normalizeApiPillars(data: OcrApiResult): Pillars | null {
  if (data.pillars?.length === 4) {
    const parts = data.pillars.map((p) => `${p.gan}${p.zhi}`)
    return pillarsFromParts(parts)
  }
  if (data.baziString) {
    const parts = data.baziString.trim().split(/\s+/)
    return pillarsFromParts(parts)
  }
  return null
}

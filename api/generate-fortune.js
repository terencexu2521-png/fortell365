// Vercel Serverless Function: 八字专业职业解读 API
// 自动部署到 https://fortell365.com/api/generate-fortune

// ===================== 八字计算引擎 =====================
const GAN_WUXING = { '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水' }
const ZHI_WUXING = { '子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水' }
const GAN_SEQ = { '甲':1,'乙':2,'丙':3,'丁':4,'戊':5,'己':6,'庚':7,'辛':8,'壬':9,'癸':10 }
const ZHI_CANGGAN = {
  '子':['癸'],'丑':['己','癸','辛'],'寅':['甲','丙','戊'],'卯':['乙'],
  '辰':['戊','乙','癸'],'巳':['丙','戊','庚'],'午':['丁','己'],'未':['己','丁','乙'],
  '申':['庚','壬','戊'],'酉':['辛'],'戌':['戊','辛','丁'],'亥':['壬','甲'],
}
const NAYIN = {
  '甲子':'海中金','乙丑':'海中金','丙寅':'炉中火','丁卯':'炉中火',
  '戊辰':'大林木','己巳':'大林木','庚午':'路旁土','辛未':'路旁土',
  '壬申':'剑锋金','癸酉':'剑锋金','甲戌':'山头火','乙亥':'山头火',
  '丙子':'涧下水','丁丑':'涧下水','戊寅':'城头土','己卯':'城头土',
  '庚辰':'白蜡金','辛巳':'白蜡金','壬午':'杨柳木','癸未':'杨柳木',
  '甲申':'泉中水','乙酉':'泉中水','丙戌':'屋上土','丁亥':'屋上土',
  '戊子':'霹雳火','己丑':'霹雳火','庚寅':'松柏木','辛卯':'松柏木',
  '壬辰':'长流水','癸巳':'长流水','甲午':'沙中金','乙未':'沙中金',
  '丙申':'山下火','丁酉':'山下火','戊戌':'平地木','己亥':'平地木',
  '庚子':'壁上土','辛丑':'壁上土','壬寅':'金箔金','癸卯':'金箔金',
  '甲辰':'覆灯火','乙巳':'覆灯火','丙午':'天河水','丁未':'天河水',
  '戊申':'大驿土','己酉':'大驿土','庚戌':'钗钏金','辛亥':'钗钏金',
  '壬子':'桑柘木','癸丑':'桑柘木','甲寅':'大溪水','乙卯':'大溪水',
  '丙辰':'沙中土','丁巳':'沙中土','戊午':'天上火','己未':'天上火',
  '庚申':'石榴木','辛酉':'石榴木','壬戌':'大海水','癸亥':'大海水',
}

function shengWo(w) { const m={'木':'水','火':'木','土':'火','金':'土','水':'金'}; return m[w] }
function woSheng(w) { const m={'木':'火','火':'土','土':'金','金':'水','水':'木'}; return m[w] }
function keWo(w) { const m={'木':'金','火':'水','土':'木','金':'火','水':'土'}; return m[w] }
function woKe(w) { const m={'木':'土','火':'金','土':'水','金':'木','水':'火'}; return m[w] }

function getShiShen(dayGan, otherGan) {
  if (dayGan === otherGan) return '日主'
  const dw = GAN_WUXING[dayGan], ow = GAN_WUXING[otherGan]
  const ds = GAN_SEQ[dayGan], os = GAN_SEQ[otherGan]
  const same = (ds%2)===(os%2)
  if (dw===ow) return same?'比肩':'劫财'
  if (ow===shengWo(dw)) return same?'偏印':'正印'
  if (ow===woSheng(dw)) return same?'食神':'伤官'
  if (ow===keWo(dw)) return same?'七杀':'正官'
  if (ow===woKe(dw)) return same?'偏财':'正财'
  return '未知'
}

function countWuxing(pillars) {
  const c = {'金':0,'木':0,'水':0,'火':0,'土':0}
  for (const p of pillars) {
    c[GAN_WUXING[p.gan]] = (c[GAN_WUXING[p.gan]]||0) + 1
    c[ZHI_WUXING[p.zhi]] = (c[ZHI_WUXING[p.zhi]]||0) + 1
    for (const g of (ZHI_CANGGAN[p.zhi]||[])) c[GAN_WUXING[g]] = (c[GAN_WUXING[g]]||0) + 0.5
  }
  return c
}

function getDizhiRelations(zhi) {
  const r = []
  const lh={'子':'丑','丑':'子','寅':'亥','亥':'寅','卯':'戌','戌':'卯','辰':'酉','酉':'辰','巳':'申','申':'巳','午':'未','未':'午'}
  const lc={'子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳'}
  const ps=[{a:0,b:1,l:'年月'},{a:0,b:2,l:'年日'},{a:0,b:3,l:'年时'},{a:1,b:2,l:'月日'},{a:1,b:3,l:'月时'},{a:2,b:3,l:'日时'}]
  for(const p of ps){
    if(lh[zhi[p.a]]===zhi[p.b]) r.push(`✅${p.l}六合`)
    if(lc[zhi[p.a]]===zhi[p.b]) r.push(`⚡${p.l}相冲`)
  }
  return r.join('  ') || '无明显冲合'
}

function parsePillars(input) {
  if (input.pillars) {
    return ['year','month','day','hour'].map(k => input.pillars[k])
  }
  if (input.baziString) {
    return input.baziString.trim().split(/\s+/).map(p => ({ gan: p[0], zhi: p.slice(1) }))
  }
  return []
}

function generateId() {
  return 'rpt_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8)
}

// ===================== AI Prompt =====================
function buildSystemPrompt() {
  return `你是一位资深八字命理分析师，精通《渊海子平》《三命通会》《子平真诠》等经典，擅长将传统命理符号翻译成现代人能理解的职业和学业建议。

## 核心任务
根据八字四柱信息，生成聚焦「专业选择 + 职业规划」的结构化解读报告。

## 输出结构

### 🔓 免费层（命理画像）

#### ## 一、命盘速览
- 表格呈现四柱八字（年柱/月柱/日柱/时柱，含天干、地支、十神、纳音）
- 日主一句话定性（用比喻，如「癸水如清晨露珠——细腻敏感」「甲木如参天大树——正直有原则」）

#### ## 二、性格DNA
- 日主五行→性格底色（2-3句，具体不模糊）
- 最强十神→行为模式+天赋倾向
- 用「你可能…」推测性语气，不说「你一定…」

#### ## 三、人生过往回顾
- 从出生年起，用大运阶段反推已走过的人生阶段
- 纯按大运五行推导，不需要用户任何实际经历
- 用「大概在…」「你回忆一下…是不是…」引导性语气
- 标注明显的忌神大运（压力期）、用神大运（顺遂期）

#### ## 四、先天优势 & 潜在短板
- 最强五行=天赋领域，最弱五行=需补足方面
- 十神组合说清优势具体表现
- 每个模块结束自然引出「这在职业选择上意味着什么？」

### 🔒 付费层（职业路线图）

分隔线：
---
⚠️ 以上为免费命理画像。以下完整职业分析需解锁查看。
---

#### ## 五、五行→大学专业推荐
- 根据用神五行，推荐3-5个专业方向+五行匹配理由
- 木→教育/文学/中医/生态/心理 | 火→计算机/AI/传媒/能源/设计 | 土→土木/建筑/管理/行政 | 金→金融/会计/法律/精密制造 | 水→物流/贸易/外交/旅游/营销

#### ## 六、五行→职业行业推荐
- 结合十神组合，3-5个具体职业+十神适配度+五行匹配度

#### ## 七、大运职业规划
- 各阶段标注：深耕期/转型期/收获期/调整期
- 最佳发力窗口+人生职业发展节奏

#### ## 八、避坑指南
- 不适合的行业/方向+五行/十神理由

## 输出风格
1. 术语+白话混合
2. 具体不模糊
3. 有温度但不讨好
4. 留钩子（免费层每个模块结束自然引出职业意味）
5. 全部中文，Markdown格式
6. 免费预览只输出模块一至四，不输出五至八`
}

function buildUserPrompt(pillars, name, gender, wuxingCount, shishen, dizhiRels) {
  const labels = ['年柱','月柱','日柱','时柱']
  const dayGan = pillars[2]?.gan || ''
  const dayWx = GAN_WUXING[dayGan] || ''
  const gl = gender === 'male' ? '男' : '女'
  let t = ''
  for (let i=0;i<4;i++) {
    const p=pillars[i]; const n=NAYIN[p.gan+p.zhi]||'未知'
    t += `| ${labels[i]} | ${p.gan} | ${p.zhi} | ${shishen[i]||'日主'} | ${n} |\n`
  }
  return `请为以下用户生成八字专业职业解读报告：

## 用户信息
- 称呼：${name}
- 性别：${gl}

## 八字四柱
| 柱位 | 天干 | 地支 | 天干十神 | 纳音 |
|------|------|------|---------|------|
${t}
**日主：${dayGan}${dayWx}（${'阳阴'[(GAN_SEQ[dayGan]||0)%2===0?1:0].charAt(0)}${dayWx}）**

## 五行分布
金:${(wuxingCount['金']||0).toFixed(1)} | 木:${(wuxingCount['木']||0).toFixed(1)} | 水:${(wuxingCount['水']||0).toFixed(1)} | 火:${(wuxingCount['火']||0).toFixed(1)} | 土:${(wuxingCount['土']||0).toFixed(1)}

## 地支关系
${dizhiRels}

## 输出要求
1. 性别${gl}，注意阴阳顺逆
2. 重点在「专业选择」和「职业规划」
3. 免费层（模块一至四）必须具体，让用户觉得准
4. 模块三「人生过往回顾」要用大运反推
5. ⚠️ 只输出模块一至四，不输出付费层内容`
}

// Parse JSON body (Vercel Node.js runtime doesn't auto-parse)
function parseBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(body)) }
      catch { resolve({}) }
    })
  })
}

// ===================== Request Handler =====================
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method === 'GET') return res.status(200).json({ status: 'ok', method: req.method })
  if (req.method !== 'POST') return res.status(405).json({ status: 'debug', method: req.method })

  try {
    const input = await parseBody(req)
    const pillars = parsePillars(input)
    if (pillars.length !== 4) {
      return res.status(400).json({ error: '请提供完整的八字四柱（年柱、月柱、日柱、时柱）' })
    }

    const dayGan = pillars[2].gan
    const wuxingCount = countWuxing(pillars)
    const zhiArr = pillars.map(p => p.zhi)
    const ganShishen = pillars.map(p => p.gan === dayGan ? '日主' : getShiShen(dayGan, p.gan))
    const dizhiRels = getDizhiRelations(zhiArr)
    const baziStr = pillars.map(p => `${p.gan}${p.zhi}`).join(' ')

    // ZHI藏干十神
    const zhiCangGanShishen = {}
    for (let i=0;i<4;i++) {
      const cg = ZHI_CANGGAN[zhiArr[i]]||[]
      zhiCangGanShishen[zhiArr[i]] = cg.map(g => `${g}(${getShiShen(dayGan,g)})`)
    }

    // 调用 DeepSeek
    const sysPrompt = buildSystemPrompt()
    const usrPrompt = buildUserPrompt(pillars, input.name, input.gender, wuxingCount, ganShishen, dizhiRels)

    const aiRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: usrPrompt },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    })

    if (!aiRes.ok) {
      const err = await aiRes.text()
      return res.status(500).json({ error: `AI 生成失败 (${aiRes.status}): ${err.slice(0,200)}` })
    }

    const aiData = await aiRes.json()
    const fullContent = aiData.choices?.[0]?.message?.content || ''
    const parts = fullContent.split(/---\s*\n\s*⚠️.*解锁.*\n\s*---/)
    const freeContent = parts[0]?.trim() || fullContent
    const paidContent = parts.length > 1 ? parts.slice(1).join('\n').trim() : ''

    const reportId = generateId()

    return res.status(200).json({
      success: true,
      data: {
        reportId,
        freeContent,
        paidContent: paidContent || null,
        reportData: {
          pillars, baziString: baziStr, dayGan,
          dayWuxing: GAN_WUXING[dayGan],
          wuxingCount, ganShishen, zhiCangGanShishen, dizhiRels,
        },
      },
    })
  } catch (err) {
    return res.status(500).json({ error: `服务器错误: ${err.message}` })
  }
}

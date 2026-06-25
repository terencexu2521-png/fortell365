// Supabase Edge Function: generate-fortune
// 八字专业职业解读 v2.0
// 部署到: supabase functions deploy generate-fortune

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- 配置 ---
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// 天干地支序号映射（用于十神计算）
const GAN_SEQ: Record<string, number> = { '甲':1,'乙':2,'丙':3,'丁':4,'戊':5,'己':6,'庚':7,'辛':8,'壬':9,'癸':10 }
const ZHI_SEQ: Record<string, number> = { '子':1,'丑':2,'寅':3,'卯':4,'辰':5,'巳':6,'午':7,'未':8,'申':9,'酉':10,'戌':11,'亥':12 }

// 五行映射
const GAN_WUXING: Record<string, string> = { '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水' }
const ZHI_WUXING: Record<string, string> = { '子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水' }

// 地支藏干
const ZHI_CANGGAN: Record<string, string[]> = {
  '子': ['癸'],
  '丑': ['己','癸','辛'],
  '寅': ['甲','丙','戊'],
  '卯': ['乙'],
  '辰': ['戊','乙','癸'],
  '巳': ['丙','戊','庚'],
  '午': ['丁','己'],
  '未': ['己','丁','乙'],
  '申': ['庚','壬','戊'],
  '酉': ['辛'],
  '戌': ['戊','辛','丁'],
  '亥': ['壬','甲'],
}

// 六十甲子纳音
const NAYIN: Record<string, string> = {
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

// 节气表（简化，用于大运排算）
const JIEQI_MONTH: Record<number, {name: string, day: number}> = {
  1: {name:'立春', day:4},
  2: {name:'惊蛰', day:6},
  3: {name:'清明', day:5},
  4: {name:'立夏', day:5},
  5: {name:'芒种', day:6},
  6: {name:'小暑', day:7},
  7: {name:'立秋', day:7},
  8: {name:'白露', day:8},
  9: {name:'寒露', day:8},
  10:{name:'立冬', day:7},
  11:{name:'大雪', day:7},
  12:{name:'小寒', day:6},
}

// 月柱地支映射（按节气）
const YUE_ZHI: Record<number, string> = {
  1:'寅',2:'卯',3:'辰',4:'巳',5:'午',6:'未',
  7:'申',8:'酉',9:'戌',10:'亥',11:'子',12:'丑',
}

// 五虎遁月干起点
const WU_HU_DUN: Record<string, string> = {
  '甲':'丙','乙':'戊','丙':'庚','丁':'壬','戊':'甲',
  '己':'丙','庚':'戊','辛':'庚','壬':'壬','癸':'甲',
}

// 五鼠遁时干起点
const WU_SHU_DUN: Record<string, string> = {
  '甲':'甲','乙':'丙','丙':'戊','丁':'庚','戊':'壬',
  '己':'甲','庚':'丙','辛':'戊','壬':'庚','癸':'壬',
}

// ===================== 八字计算引擎 =====================

interface BaziInput {
  name: string
  gender: 'male' | 'female'
  birthDate?: string  // 兼容旧输入：YYYY-MM-DD
  birthTime?: string   // 兼容旧输入：时辰
  baziString?: string  // 新输入："甲子 丙寅 戊辰 壬戌"
  pillars?: Record<string, {gan:string, zhi:string}>
}

// 从八字字符串或pillars解析四柱
function parsePillars(input: BaziInput): {gan:string, zhi:string}[] {
  if (input.pillars) {
    const keys = ['year','month','day','hour']
    return keys.map(k => input.pillars![k])
  }
  if (input.baziString) {
    const parts = input.baziString.trim().split(/\s+/)
    return parts.map(p => ({
      gan: p[0],
      zhi: p.slice(1),
    }))
  }
  return []
}

// 十神计算：以日干为"我"，与其他天干比较
function getShiShen(dayGan: string, otherGan: string): string {
  const dayWx = GAN_WUXING[dayGan]
  const otherWx = GAN_WUXING[otherGan]
  const daySeq = GAN_SEQ[dayGan]
  const otherSeq = GAN_SEQ[otherGan]
  const sameYinYang = (daySeq % 2) === (otherSeq % 2)

  if (dayWx === otherWx) return sameYinYang ? '比肩' : '劫财'
  if (otherWx === shengWo(dayWx)) return sameYinYang ? '偏印' : '正印'
  if (otherWx === woSheng(dayWx)) return sameYinYang ? '食神' : '伤官'
  if (otherWx === keWo(dayWx)) return sameYinYang ? '七杀' : '正官'
  if (otherWx === woKe(dayWx)) return sameYinYang ? '偏财' : '正财'
  return '未知'
}

// 五行生克
function shengWo(wo: string): string {
  const m: Record<string,string> = {'木':'水','火':'木','土':'火','金':'土','水':'金'}
  return m[wo]
}
function woSheng(wo: string): string {
  const m: Record<string,string> = {'木':'火','火':'土','土':'金','金':'水','水':'木'}
  return m[wo]
}
function keWo(wo: string): string {
  const m: Record<string,string> = {'木':'金','火':'水','土':'木','金':'火','水':'土'}
  return m[wo]
}
function woKe(wo: string): string {
  const m: Record<string,string> = {'木':'土','火':'金','土':'水','金':'木','水':'火'}
  return m[wo]
}

// 五行力量统计
function countWuxing(pillars: {gan:string, zhi:string}[]): Record<string, number> {
  const count: Record<string, number> = { '金':0,'木':0,'水':0,'火':0,'土':0 }
  for (const p of pillars) {
    count[GAN_WUXING[p.gan]] = (count[GAN_WUXING[p.gan]] || 0) + 1
    count[ZHI_WUXING[p.zhi]] = (count[ZHI_WUXING[p.zhi]] || 0) + 1
    const cg = ZHI_CANGGAN[p.zhi] || []
    for (const g of cg) {
      count[GAN_WUXING[g]] = (count[GAN_WUXING[g]] || 0) + 0.5 // 藏干计0.5分
    }
  }
  return count
}

// 地支关系检测
function getDizhiRelations(zhi: string[]): string {
  const relations: string[] = []
  const pairs = [
    {a:0,b:1,label:'年月'},{a:0,b:2,label:'年日'},{a:0,b:3,label:'年时'},
    {a:1,b:2,label:'月日'},{a:1,b:3,label:'月时'},{a:2,b:3,label:'日时'},
  ]

  // 六合
  const liuhe: Record<string,string> = {'子':'丑','丑':'子','寅':'亥','亥':'寅','卯':'戌','戌':'卯','辰':'酉','酉':'辰','巳':'申','申':'巳','午':'未','未':'午'}

  // 六冲
  const liuchong: Record<string,string> = {'子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳'}

  for (const p of pairs) {
    if (liuhe[zhi[p.a]] === zhi[p.b]) relations.push(`✅${p.label}六合(${zhi[p.a]}${zhi[p.b]})`)
    if (liuchong[zhi[p.a]] === zhi[p.b]) relations.push(`⚡${p.label}相冲(${zhi[p.a]}${zhi[p.b]})`)
  }
  return relations.join('  ') || '无明显冲合'
}

// ===================== 日柱计算（仅用于兼容旧输入） =====================

// 日柱计算：从1900-01-01（甲戌日，index=11）累加天数
function calcDayPillar(dateStr: string): string {
  const gan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
  const zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
  const base = new Date('1900-01-01')
  const target = new Date(dateStr)
  const days = Math.floor((target.getTime() - base.getTime()) / (1000*60*60*24))
  const idx = (11 + days) % 60
  return gan[idx % 10] + zhi[idx % 12]
}

// ===================== DeepSeek Prompt =====================

function buildSystemPrompt(): string {
  return `你是一位资深八字命理分析师，精通《渊海子平》《三命通会》《子平真诠》等经典，同时擅长将传统命理符号翻译成现代人能理解的职业和学业建议。

## 你的核心任务
根据用户的八字四柱信息，生成一份聚焦「专业选择 + 职业规划」的结构化解读报告。

## 报告结构

你会先输出「免费层」（命理画像，建立信任），然后输出「付费层」（职业路线图）。

### 🔓 免费层：命理画像

#### 模块1：命盘速览
- 以表格呈现四柱八字（年柱/月柱/日柱/时柱，含天干、地支、十神、纳音）
- 日主一句话定性（用比喻，如「癸水是清晨的露珠——细腻、敏感」「甲木是参天大树——正直、有原则」）

#### 模块2：性格DNA
- 日主五行 → 性格底色（2-3句，具体不模糊，不要用「你性格不错」这种废话）
- 最强十神 → 行为模式 + 天赋倾向
- ⚠️ 重要：描述必须具体。不说「你有才华」，要说「你八字食神透出，属于靠作品说话的人，擅长把想法变成实际产出」
- 用「你可能…」「你大概率…」等推测性语气，不要说「你一定…」

#### 模块3：人生过往回顾
- 从出生年起，用大运阶段反推用户已走过的阶段
- ⚠️ 不需要知道用户任何实际经历，纯按大运五行推导
- 示例：「你在11-20岁（XX大运）正处学业阶段，五行XX当运，这一阶段你应该……」——用户会自行对号入座
- 特别标注是否有明显的忌神大运（压力期）、用神大运（顺遂期）
- 用「大概在…」「你回忆一下…是不是…」等引导性语气

#### 模块4：先天优势 & 潜在短板
- 最强五行 = 天赋领域，最弱五行 = 需要补足的方面
- 用十神组合说清优势的具体表现
- 示例：「你的优势是食神制杀——能把压力转化为行动力，越压越能出成果。但五行缺火（财弱），说明你不太擅长主动变现，需要有人在商业层面帮你」

### 🔒 付费层：职业路线图

#### 模块5：五行→大学专业推荐
- 根据用神五行，推荐3-5个适配的专业方向
- 每个方向给五行匹配理由（1-2句）
- 参考映射：木→教育/文学/中医/生态/心理 | 火→计算机/AI/传媒/能源/设计 | 土→土木/建筑/管理/行政 | 金→金融/会计/法律/精密制造 | 水→物流/贸易/外交/旅游/营销

#### 模块6：五行→职业行业推荐
- 结合十神组合，给出3-5个具体职业建议
- 每个职业标注十神适配度和五行匹配度
- 示例：「正官+正印旺 → 公务员/事业单位/教师（官印相生格，天生适合体制内）」

#### 模块7：大运职业规划
- 标注各阶段大运主题：深耕期 / 转型期 / 收获期 / 调整期
- 指出最佳发力窗口（哪些年份适合冲、哪些年份适合稳）
- 给出人生的职业发展节奏建议

#### 模块8：避坑指南
- 列出不太适合的行业/专业方向
- 每个给五行/十神层面的理由
- 提醒需注意的职业陷阱

## 输出风格要求
1. **术语+白话混合**：先写一句术语（如「月柱乙木正官透出」），紧跟一句白话（如「说明你在工作环境中容易遇到贵人」）
2. **具体不模糊**：永远给出具体信号，不给废话式结论
3. **有温度但不讨好**：好听的客观说，不好的也客观说，不讨好用户
4. **留钩子**：免费层每个模块结束自然引出「这在职业选择上意味着什么？」，但不展开
5. **全部用中文**

## 输出格式
用Markdown格式输出，免费层和付费层之间用分隔线分开：
---
⚠️ 以上为免费命理画像。以下完整职业分析需解锁查看。
---

如果用户未付费，只生成免费层内容（模块1-4），付费层用占位符；已付费则生成全部8个模块。`
}

function buildUserPrompt(
  pillars: {gan:string, zhi:string}[],
  name: string,
  gender: string,
  wuxingCount: Record<string, number>,
  shishen: string[],
  dizhiRels: string,
): string {
  const pillarLabels = ['年柱','月柱','日柱','时柱']
  const dayGan = pillars[2]?.gan || ''
  const dayWx = GAN_WUXING[dayGan] || ''
  const genderLabel = gender === 'male' ? '男' : '女'

  let baziTable = ''
  for (let i = 0; i < 4; i++) {
    const p = pillars[i]
    const n = NAYIN[p.gan + p.zhi] || '未知'
    baziTable += `| ${pillarLabels[i]} | ${p.gan} | ${p.zhi} | ${shishen[i] || '日主'} | ${n} |\n`
  }

  return `请为以下用户生成八字专业职业解读报告：

## 用户信息
- 称呼：${name}
- 性别：${genderLabel}
- 年龄：待定

## 八字四柱
| 柱位 | 天干 | 地支 | 天干十神 | 纳音 |
|------|------|------|---------|------|
${baziTable}
**日主：${dayGan}${dayWx}（${dayGan === '甲' || dayGan === '丙' || dayGan === '戊' || dayGan === '庚' || dayGan === '壬' ? '阳' : '阴'}${dayWx}）**

## 五行力量分布
金: ${wuxingCount['金']?.toFixed(1)}  |  木: ${wuxingCount['木']?.toFixed(1)}  |  水: ${wuxingCount['水']?.toFixed(1)}  |  火: ${wuxingCount['火']?.toFixed(1)}  |  土: ${wuxingCount['土']?.toFixed(1)}

## 地支关系
${dizhiRels}

## 输出要求
1. 性别为${genderLabel}，注意阴阳顺逆影响十神解读和大运方向
2. 重点放在「专业选择」和「职业规划」方向
3. 免费层（模块1-4）必须具体不模糊，让用户觉得「准」
4. 特别是模块3「人生过往回顾」，要用大运反推，给用户「你怎么知道」的惊喜感
5. 注意：这是免费预览，不要输出付费层内容（模块5-8），只输出模块1-4`
}

// ===================== 主处理函数 =====================

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const input: BaziInput = await req.json()
    const pillars = parsePillars(input)

    if (pillars.length !== 4) {
      return new Response(JSON.stringify({
        error: '请提供完整的八字四柱（年柱、月柱、日柱、时柱），每柱含天干和地支',
      }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    }

    // ========== 计算八字信息 ==========
    const dayGan = pillars[2].gan
    const wuxingCount = countWuxing(pillars)
    const zhiArr = pillars.map(p => p.zhi)

    // 十神计算（天干层面）
    const ganShishen = pillars.map(p =>
      p.gan === dayGan ? '日主' : getShiShen(dayGan, p.gan)
    )

    // 地支藏干十神
    const zhiCangGanShishen: Record<string, string[]> = {}
    for (let i = 0; i < 4; i++) {
      const zhi = zhiArr[i]
      const cg = ZHI_CANGGAN[zhi] || []
      zhiCangGanShishen[zhi] = cg.map(g => `${g}(${getShiShen(dayGan, g)})`)
    }

    // 地支关系
    const dizhiRels = getDizhiRelations(zhiArr)

    // ========== 调用 DeepSeek ==========
    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildUserPrompt(
      pillars,
      input.name,
      input.gender,
      wuxingCount,
      ganShishen,
      dizhiRels,
    )

    const aiResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    })

    if (!aiResponse.ok) {
      const err = await aiResponse.text()
      console.error('DeepSeek API error:', aiResponse.status, err)
      return new Response(JSON.stringify({
        error: `AI 生成失败 (${aiResponse.status})`,
      }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    }

    const aiData = await aiResponse.json()
    const fullContent = aiData.choices?.[0]?.message?.content || ''

    // 分割免费内容和付费内容
    const parts = fullContent.split(/---\s*\n\s*⚠️.*解锁.*\n\s*---/)
    const freeContent = parts[0]?.trim() || fullContent
    const paidContent = parts.length > 1 ? parts.slice(1).join('\n').trim() : ''

    // 构建八字字符串用于存储
    const baziStr = pillars.map(p => `${p.gan}${p.zhi}`).join(' ')

    // ========== 存入 Supabase ==========
    const { data: dbData, error: dbError } = await supabase
      .from('fortune_reports')
      .insert({
        fortune_type: 'bazi',
        free_content: freeContent,
        paid_content: paidContent || null,
        is_paid: false,
        price: 3990,
        bazi_string: baziStr,
        day_gan: dayGan,
        day_wuxing: GAN_WUXING[dayGan] || '',
        gender: input.gender,
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('DB insert error:', dbError)
      return new Response(JSON.stringify({
        error: '报告存储失败',
      }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        reportId: dbData.id,
        freeContent,
        paidContent: paidContent || null,
        reportData: {
          pillars,
          baziString: baziStr,
          dayGan,
          dayWuxing: GAN_WUXING[dayGan],
          wuxingCount,
          ganShishen,
          zhiCangGanShishen,
          dizhiRels,
        },
      },
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (err: any) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({
      error: `服务器错误: ${err.message}`,
    }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  }
})

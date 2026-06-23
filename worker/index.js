// Cloudflare Worker: 八字职业解读 API v2.1
// 参照《渊海子平》《三命通会》《子平真诠》体系

const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const GAN_WUXING={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
const GAN_YINYANG={甲:'阳',乙:'阴',丙:'阳',丁:'阴',戊:'阳',己:'阴',庚:'阳',辛:'阴',壬:'阳',癸:'阴'};
const GAN_SEQ={甲:1,乙:2,丙:3,丁:4,戊:5,己:6,庚:7,辛:8,壬:9,癸:10};
const ZHI_SEQ={子:1,丑:2,寅:3,卯:4,辰:5,巳:6,午:7,未:8,申:9,酉:10,戌:11,亥:12};

const ZHI_CANGGAN={
  子:['癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],
  辰:['戊','乙','癸'],巳:['丙','戊','庚'],午:['丁','己'],未:['己','丁','乙'],
  申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']
};

const NAYIN={};
(function(){
  const t='甲子 乙丑 海中金,丙寅 丁卯 炉中火,戊辰 己巳 大林木,庚午 辛未 路旁土,壬申 癸酉 剑锋金,'
         +'甲戌 乙亥 山头火,丙子 丁丑 涧下水,戊寅 己卯 城头土,庚辰 辛巳 白蜡金,壬午 癸未 杨柳木,'
         +'甲申 乙酉 泉中水,丙戌 丁亥 屋上土,戊子 己丑 霹雳火,庚寅 辛卯 松柏木,壬辰 癸巳 长流水,'
         +'甲午 乙未 沙中金,丙申 丁酉 山下火,戊戌 己亥 平地木,庚子 辛丑 壁上土,壬寅 癸卯 金箔金,'
         +'甲辰 乙巳 覆灯火,丙午 丁未 天河水,戊申 己酉 大驿土,庚戌 辛亥 钗钏金,壬子 癸丑 桑柘木,'
         +'甲寅 乙卯 大溪水,丙辰 丁巳 沙中土,戊午 己未 天上火,庚申 辛酉 石榴木,壬戌 癸亥 大海水';
  t.split(',').forEach(x=>{const p=x.trim().split(' ');NAYIN[p[0]]=p[2];NAYIN[p[1]]=p[2];});
})();

function sW(w){const m={木:'水',火:'木',土:'火',金:'土',水:'金'};return m[w];}
function wS(w){const m={木:'火',火:'土',土:'金',金:'水',水:'木'};return m[w];}
function kW(w){const m={木:'金',火:'水',土:'木',金:'火',水:'土'};return m[w];}
function wK(w){const m={木:'土',火:'金',土:'水',金:'木',水:'火'};return m[w];}

function getShiShen(dg,og){
  if(dg===og)return'日主';
  const dw=GAN_WUXING[dg],ow=GAN_WUXING[og],ds=GAN_SEQ[dg],os=GAN_SEQ[og],s=(ds%2)===(os%2);
  if(dw===ow)return s?'比肩':'劫财';
  if(ow===sW(dw))return s?'偏印':'正印';
  if(ow===wS(dw))return s?'食神':'伤官';
  if(ow===kW(dw))return s?'七杀':'正官';
  if(ow===wK(dw))return s?'偏财':'正财';
  return'?';
}

function countWuxing(ps){
  const c={金:0,木:0,水:0,火:0,土:0};
  const ZW={子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
  for(const p of ps){
    if(p.gan)c[GAN_WUXING[p.gan]]+=1;
    if(p.zhi)c[ZW[p.zhi]]+=1;
    const cg=ZHI_CANGGAN[p.zhi]||[];
    for(const g of cg)c[GAN_WUXING[g]]+=0.5;
  }
  return c;
}

// 地支关系检测
function getDiZhiRels(zhiArr){
  const liuhe={子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
  const liuchong={子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
  const sanhe={'申子辰':'水','亥卯未':'木','寅午戌':'火','巳酉丑':'金'};
  const rels=[];
  for(let i=0;i<4;i++){
    for(let j=i+1;j<4;j++){
      const a=zhiArr[i],b=zhiArr[j];
      if(liuhe[a]===b)rels.push(`六合(${a}${b})`);
      if(liuchong[a]===b)rels.push(`六冲(${a}${b})`);
    }
  }
  // 三合检测
  for(const[k,v]of Object.entries(sanhe)){
    const [x,y,z]=k;
    if(zhiArr.includes(x)&&zhiArr.includes(y)&&zhiArr.includes(z))
      rels.push(`三合${v}局(${k})`);
  }
  return rels.length?rels.join(' '):'无明显冲合';
}

function genId(){return'rpt_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);}

function parseBazi(str){return str.trim().split(/\s+/).map(p=>({gan:p.charAt(0),zhi:p.substring(1)}));}

// 大运排算：返回8步大运
function computeDayun(yearGan, monthGan, monthZhi, gender){
  const yinyang=GAN_YINYANG[yearGan];
  // 阳男阴女顺排，阴男阳女逆排
  const shun=((yinyang==='阳'&&gender==='male')||(yinyang==='阴'&&gender==='female'));
  const ganIdx=GAN.indexOf(monthGan);
  const zhiIdx=ZHI.indexOf(monthZhi);
  const dir=shun?1:-1;
  const dayun=[];
  let gi=ganIdx,zi=zhiIdx;
  for(let step=0;step<8;step++){
    gi=(gi+dir+10)%10;
    zi=(zi+dir+12)%12;
    const dyGan=GAN[gi],dyZhi=ZHI[zi];
    const age=5+step*10;
    dayun.push({
      gan:dyGan,zhi:dyZhi,
      startAge:age,
      endAge:age+9,
      quanpin:dyGan+dyZhi,
      wuxing:GAN_WUXING[dyGan],
    });
  }
  return dayun;
}

function buildBaziCalcSection(pillars,gender){
  const dg=pillars[2].gan,dw=GAN_WUXING[dg];
  const wx=countWuxing(pillars);
  const gs=pillars.map(p=>p.gan===dg?'日主':getShiShen(dg,p.gan));
  const zhiArr=pillars.map(p=>p.zhi);
  const dizhiRels=getDiZhiRels(zhiArr);
  const dayun=computeDayun(pillars[0].gan,pillars[1].gan,pillars[1].zhi,gender);

  // 藏干十神
  let cgText='';
  for(let i=0;i<4;i++){
    const z=zhiArr[i];
    const labels=['年','月','日','时'];
    const cg=ZHI_CANGGAN[z]||[];
    cgText+=`${labels[i]}支${z}藏: `+cg.map(g=>`${g}(${getShiShen(dg,g)})`).join(' ')+'\n';
  }

  // 大运表
  let dyText='';
  for(const d of dayun){
    dyText+=`${d.startAge}-${d.endAge}岁: ${d.quanpin} (${d.wuxing}, 天干${getShiShen(dg,d.gan)})\n`;
  }

  // 日主强弱判断
  const yueZhi=pillars[1].zhi;
  const yueWx={子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
  const deling=(G_WUXING_ZHI[yueZhi]===dw||
    {木:['寅','卯','辰'],火:['巳','午','未'],土:['辰','未','戌','丑'],金:['申','酉','戌'],水:['亥','子','丑']}[dw].includes(yueZhi));
  const wangXiu={木:'春(寅卯辰)旺 冬相 夏休 四季末囚 秋死',
    火:'夏(巳午未)旺 春相 四季末休 秋囚 冬死',
    土:'四季末旺 夏相 秋休 冬囚 春死',
    金:'秋(申酉戌)旺 四季末相 冬休 春囚 夏死',
    水:'冬(亥子丑)旺 秋相 春休 夏囚 四季末死'};

  const ysText = (()=>{const ys=dw==='火'?'水和金':dw==='水'?'金和木':dw==='木'?'水和火':dw==='金'?'土和水':'火和金';return '根据用神五行('+ys+')，推荐专业方向：';})();
  return `## 八字计算数据（AI请据此分析，每步先列专业分析再给白话解读）

### 命盘排盘
| 四柱 | 天干 | 地支 | 天干十神 | 纳音 |
|------|------|------|---------|------|
| 年柱 | ${pillars[0].gan} | ${pillars[0].zhi} | ${gs[0]} | ${NAYIN[pillars[0].gan+pillars[0].zhi]||'未知'} |
| 月柱 | ${pillars[1].gan} | ${pillars[1].zhi} | ${gs[1]} | ${NAYIN[pillars[1].gan+pillars[1].zhi]||'未知'} |
| 日柱 | ${pillars[2].gan} | ${pillars[2].zhi} | ${gs[2]} | ${NAYIN[pillars[2].gan+pillars[2].zhi]||'未知'} |
| 时柱 | ${pillars[3].gan} | ${pillars[3].zhi} | ${gs[3]} | ${NAYIN[pillars[3].gan+pillars[3].zhi]||'未知'} |

日主：${dg}（${GAN_YINYANG[dg]}，${dw}）
日主五行旺衰规律：${wangXiu[dw]||''}
月令：${yueZhi}（${G_WUXING_ZHI[yueZhi]||''}），${deling?'得令':'失令'}

### 五行力量统计
| 五行 | 金 | 木 | 水 | 火 | 土 |
|------|----|----|----|----|-----|
| 数量 | ${(wx['金']||0).toFixed(1)} | ${(wx['木']||0).toFixed(1)} | ${(wx['水']||0).toFixed(1)} | ${(wx['火']||0).toFixed(1)} | ${(wx['土']||0).toFixed(1)} |

各天干十神：年干${pillars[0].gan}→${gs[0]} 月干${pillars[1].gan}→${gs[1]} 日干${dg}→日主 时干${pillars[3].gan}→${gs[3]}

### 地支藏干与十神
${cgText}

### 地支特殊关系
${dizhiRels}

### 大运排算（年干${pillars[0].gan}${GAN_YINYANG[pillars[0].gan]}，${gender==='male'?'男':'女'}→${computeDayun(pillars[0].gan,pillars[1].gan,pillars[1].zhi,gender)[0]?'顺':'逆'}排）
${dyText}`;
}

const G_WUXING_ZHI={子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};

function buildPrompt(pillars,name,gender){
  const dg=pillars[2].gan,dw=GAN_WUXING[dg];
  const wx=countWuxing(pillars);
  const gs=pillars.map(p=>p.gan===dg?'日主':getShiShen(dg,p.gan));
  const zhiArr=pillars.map(p=>p.zhi);
  const dizhiRels=getDiZhiRels(zhiArr);
  const dayun=computeDayun(pillars[0].gan,pillars[1].gan,pillars[1].zhi,gender);
  const genderLabel=gender==='male'?'男':'女';

  // 藏干十神
  let cgText='';
  const zhiLabels=['年','月','日','时'];
  for(let i=0;i<4;i++){
    const cg=ZHI_CANGGAN[zhiArr[i]]||[];
    cgText+=`${zhiLabels[i]}支${zhiArr[i]}: `+cg.map(g=>`${g}(${getShiShen(dg,g)})`).join(' ')+'\n';
  }

  // 大运表
  let dyText='';
  for(const d of dayun){
    dyText+=`| ${d.startAge}-${d.endAge} | ${d.quanpin} | ${d.wuxing} | ${getShiShen(dg,d.gan)} |\n`;
  }

  // 日主月令判断
  const yueZhi=pillars[1].zhi;
  const G_WUXING_ZHI={子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
  const delingWx={木:['寅','卯','辰'],火:['巳','午','未'],土:['辰','未','戌','丑'],金:['申','酉','戌'],水:['亥','子','丑']}[dw]||[];
  const deling=delingWx.includes(yueZhi);

  // 各柱十神+通俗解释材料
  let shishenTable='';
  for(let i=0;i<4;i++){
    const p=pillars[i];
    const label=['年柱','月柱','日柱','时柱'][i];
    shishenTable+=`| ${label} | ${p.gan+p.zhi} | ${gs[i]} | |\n`;
  }

  const ysText = (()=>{const ys=dw==='火'?'水和金':dw==='水'?'金和木':dw==='木'?'水和火':dw==='金'?'土和水':'火和金';return '根据用神五行('+ys+')，推荐专业方向：';})();
  return `你是资深八字命理师，精通《渊海子平》《三命通会》《子平真诠》。请为以下用户生成八字专业职业解读报告。

⚠️ **严格按照下方格式输出，不要改变结构、不要添加多余标题、不要重复分析。每个段落简短有力，不要啰嗦。**

用户：${name}，${genderLabel}

## 数据

### 四柱八字
| 柱位 | 干支 | 十神 | 纳音 |
|------|------|------|------|
| 年柱 | ${pillars[0].gan+pillars[0].zhi} | ${gs[0]} | ${NAYIN[pillars[0].gan+pillars[0].zhi]||'未知'} |
| 月柱 | ${pillars[1].gan+pillars[1].zhi} | ${gs[1]} | ${NAYIN[pillars[1].gan+pillars[1].zhi]||'未知'} |
| 日柱 | ${pillars[2].gan+pillars[2].zhi} | ${gs[2]} | ${NAYIN[pillars[2].gan+pillars[2].zhi]||'未知'} |
| 时柱 | ${pillars[3].gan+pillars[3].zhi} | ${gs[3]} | ${NAYIN[pillars[3].gan+pillars[3].zhi]||'未知'} |

日主：${dg}（${GAN_YINYANG[dg]}${dw}） | 月令：${yueZhi}（${G_WUXING_ZHI[yueZhi]||''}）${deling?'→ 得令':'→ 不得令'}

### 五行统计
金${(wx['金']||0).toFixed(1)} 木${(wx['木']||0).toFixed(1)} 水${(wx['水']||0).toFixed(1)} 火${(wx['火']||0).toFixed(1)} 土${(wx['土']||0).toFixed(1)}

### 地支藏干
${cgText}

### 地支关系
${dizhiRels}

### 大运（${computeDayun(pillars[0].gan,pillars[1].gan,pillars[1].zhi,gender)[0]?'顺':'逆'}排，约5岁起运）
| 年龄 | 大运 | 五行 | 十神 | 解读 |
|------|------|------|------|------|
${dyText}

---

## ⚠️ 输出格式（严格按此结构，不要自由发挥）

**格式铁律：**
1. 每个板块 = 数据表格/列表 + 一句通俗版。不要写成流水账散文！
2. 通俗版用"**通俗版：**"开头，1-3句话说清即可
3. 表格用 \`\`\`PLAIN_TEXT 包裹
4. 每段短而有力，不要重复同一个观点
5. 用✅⚠️⚡等emoji标注关键关系
6. 当前运势要包含大运+流年两步分析

## 输出模板（直接套用，填空即可）

### 🎯 命盘概览

\`\`\`PLAIN_TEXT
| 四柱 | 天干 | 地支 | 十神 | 纳音 |
|------|------|------|------|------|
| 年柱 | ${pillars[0].gan} | ${pillars[0].zhi} | ${gs[0]} | ${NAYIN[pillars[0].gan+pillars[0].zhi]||'未知'} |
| 月柱 | ${pillars[1].gan} | ${pillars[1].zhi} | ${gs[1]} | ${NAYIN[pillars[1].gan+pillars[1].zhi]||'未知'} |
| 日柱 | ${pillars[2].gan} | ${pillars[2].zhi} | 日主 | ${NAYIN[pillars[2].gan+pillars[2].zhi]||'未知'} |
| 时柱 | ${pillars[3].gan} | ${pillars[3].zhi} | ${gs[3]} | ${NAYIN[pillars[3].gan+pillars[3].zhi]||'未知'} |
\`\`\`

日主${dg}${dw}（太阳之火→热情大方、自带光芒；江河之水→大气包容、有格局；参天大树→正直向上、有原则；雨露之水→细腻敏感、适应性强；城墙之土→稳重踏实、可靠有担当；珠玉之金→细致精准、追求完美）。

**通俗版：** 用比喻说清命格特征。天干排列总结一句（如"先输出才华、再靠同伴支撑、晚年靠智慧收尾"）。

### 🔢 五行力量分析

\`\`\`PLAIN_TEXT
金${(wx['金']||0).toFixed(1)} 木${(wx['木']||0).toFixed(1)} 水${(wx['水']||0).toFixed(1)} 火${(wx['火']||0).toFixed(1)} 土${(wx['土']||0).toFixed(1)}
\`\`\`

**通俗版：** 最旺的五行意味着什么天赋/问题，最弱的五行意味着什么缺失。如有"全局无金"等特殊信号，重点说明。

### 🧬 格局与十神

\`\`\`PLAIN_TEXT
| 位置 | 干支 | 十神 | 解读 |
|------|------|------|------|
| 年柱 | ${pillars[0].gan+pillars[0].zhi} | ${gs[0]} | 结合十神含义写一句天赋/影响 |
| 月柱 | ${pillars[1].gan+pillars[1].zhi} | ${gs[1]} | |
| 日柱 | ${pillars[2].gan+pillars[2].zhi} | 日主 | 日支是什么星→妻子/丈夫如何 |
| 时柱 | ${pillars[3].gan+pillars[3].zhi} | ${gs[3]} | 晚年/子女/智慧 |
\`\`\`

核心格局定性（一句话，如"食神泄秀+寅午合火"）。如有全局无财星/无官星等显著特征，点明。

**通俗版：** 这些十神组合整体意味着你的天赋在哪，核心矛盾是什么。

### ⚡ 核心关系

\`\`\`PLAIN_TEXT
| 关系 | 具体 | 解读 |
|------|------|------|
（列出最重要的3-5个地支关系、天干关系、五合、六冲、三合等，用✅⚠️⚡标注）
\`\`\`

### 📊 身强弱与用神

\`\`\`PLAIN_TEXT
| 类别 | 五行 | 作用 |
|------|------|------|
| 用神 | （根据强弱判断） | 最关键需要的五行 |
| 喜神 | | 次要需要的 |
| 忌神 | | 要避开的 |
\`\`\`

日主${dg}生于${yueZhi}月，${deling?'得令':'不得令'}。${delingWx.length>0?'寅午合火帮身'+(dw==='火'?'→身强':'')+(dw!=='火'?',食伤泄秀重→身偏弱':'')+(dw==='土'?',比劫帮身→身中和':''):''}。用神取${dw==='火'?'水（官杀调候）和木（印星生身）':dw==='水'?'金（印星生身）':dw==='木'?'水（印星）':dw==='金'?'土（印星）':dw==='土'?'火（印星）':'水和金'}。

**通俗版：** 一句话说清你的身强/弱，以及由此导致的行为模式。

### 🗺️ 大运走势

\`\`\`PLAIN_TEXT
| 年龄 | 大运 | 十神 | 解读 |
|------|------|------|------|
${dyText}
\`\`\`

**通俗版：** 人生节奏总结——"X岁前是XXX，X岁后是XXX"。已走过的用验证语气（"你回忆一下…"），未走过的用趋势判断。

### 🔮 当前运势

**大运（当前段）**：写当前所处大运的详细分析（2-3句，含五行生克+十神影响+事业/财运判断）。

**2026丙午流年**：
\`\`\`PLAIN_TEXT
| 关键点 | 解读 |
|--------|------|
（列出3-5个关键流年与原局互动：如天干合、地支冲合、三合/自刑等）
\`\`\`

**通俗版：** 今年整体一句话判断+核心建议。

### 💼 职业与天赋

\`\`\`PLAIN_TEXT
| 方向 | 理由 |
|------|------|
（根据十神+五行，列出5-6个适合的职业方向）
\`\`\`

不适合的方向简述。

**通俗版：** 你的核心职业优势是什么，做哪类工作最能发挥天赋。

### 🎓 五行→大学专业推荐

${ysText}

\`\`\`PLAIN_TEXT
| 五行 | 专业方向 | 匹配理由 |
|------|---------|---------|
（按用神优先级列出3-5个，每个给1-2句理由。参考：火→计算机/AI/传媒/能源/设计 | 水→物流/贸易/金融/外语/旅游 | 金→金融/会计/法律/精密制造 | 木→教育/文学/医学/生态/心理 | 土→土木/建筑/管理/行政）
\`\`\`

### 📈 大运职业规划

\`\`\`PLAIN_TEXT
| 年龄段 | 大运 | 职业主题 | 建议 |
|--------|------|---------|------|
（每步大运一行，标注深耕期/转型期/收获期/调整期，给一句行动建议）
\`\`\`

### 🗣️ 总结

用一句话概括这个命格（如"一个永远在输出、永远在燃烧的太阳"），点出最大优势和最需注意的风险。

---

> ⚠️ 命理分析仅供娱乐参考。`;
}

export default {
  async fetch(request, env) {
    const cors={
      'Access-Control-Allow-Origin':'*',
      'Access-Control-Allow-Methods':'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type'
    };
    if(request.method==='OPTIONS')return new Response(null,{headers:cors});
    if(request.method==='GET')return new Response(JSON.stringify({status:'ok'}),{headers:{...cors,'Content-Type':'application/json'}});

    try {
      const input=await request.json();
      if(!input.baziString)return new Response(JSON.stringify({error:'请提供baziString（八字字符串）'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});

      const pillars=parseBazi(input.baziString);
      if(pillars.length!==4)return new Response(JSON.stringify({error:'八字需为4柱，当前:'+pillars.length}),{status:400,headers:{...cors,'Content-Type':'application/json'}});

      const prompt=buildPrompt(pillars,input.name||'用户',input.gender||'male');
      const aiRes=await fetch('https://api.deepseek.com/v1/chat/completions',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+env.DEEPSEEK_API_KEY},
        body:JSON.stringify({model:'deepseek-chat',messages:[{role:'user',content:prompt}],temperature:0.7,max_tokens:8000})
      });

      if(!aiRes.ok){const e=await aiRes.text();return new Response(JSON.stringify({error:'AI生成失败:'+aiRes.status}),{status:500,headers:{...cors,'Content-Type':'application/json'}});}

      const aiData=await aiRes.json();
      const content=aiData.choices?.[0]?.message?.content||'';
      const rid=genId();
      await env.BAZI_KV.put('report:'+rid,JSON.stringify({id:rid,content,name:input.name,createdAt:Date.now(),gender:input.gender,baziString:input.baziString}));

      return new Response(JSON.stringify({
        success:true,
        data:{
          reportId:rid,
          fullContent:content,
          baziString:pillars.map(p=>p.gan+p.zhi).join(' '),
          dayGan:pillars[2].gan,
          dayWuxing:GAN_WUXING[pillars[2].gan],
        }
      }),{headers:{...cors,'Content-Type':'application/json'}});
    }catch(err){
      return new Response(JSON.stringify({error:err.message}),{status:500,headers:{...cors,'Content-Type':'application/json'}});
    }
  }
};

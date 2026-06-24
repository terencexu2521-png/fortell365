// Cloudflare Worker: 八字专业职业解读 API v3.0
// 参照《渊海子平》《三命通会》《子平真诠》体系
// v3 改动: temperature 0.3, 死标题约束, 免费层扩展大运解读, OCR 端点

const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const GAN_WUXING={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
const GAN_YINYANG={甲:'阳',乙:'阴',丙:'阳',丁:'阴',戊:'阳',己:'阴',庚:'阳',辛:'阴',壬:'阳',癸:'阴'};
const GAN_SEQ={甲:1,乙:2,丙:3,丁:4,戊:5,己:6,庚:7,辛:8,壬:9,癸:10};

const ZHI_CANGGAN={
  子:['癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],
  辰:['戊','乙','癸'],巳:['丙','戊','庚'],午:['丁','己'],未:['己','丁','乙'],
  申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']
};

const G_WUXING_ZHI={子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};

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
  return'未知';
}

function countWuxing(ps){
  const c={金:0,木:0,水:0,火:0,土:0};
  for(const p of ps){
    if(p.gan)c[GAN_WUXING[p.gan]]+=1;
    if(p.zhi)c[G_WUXING_ZHI[p.zhi]]+=1;
    const cg=ZHI_CANGGAN[p.zhi]||[];
    for(const g of cg)c[GAN_WUXING[g]]+=0.5;
  }
  return c;
}

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
      startAge:age,endAge:age+9,
      quanpin:dyGan+dyZhi,
      wuxing:GAN_WUXING[dyGan],
    });
  }
  return dayun;
}

// ============ 核心 Prompt 生成（v3改造：死标题 + 免费层扩展大运解读）============

function buildPrompt(pillars,name,gender){
  const dg=pillars[2].gan,dw=GAN_WUXING[dg];
  const wx=countWuxing(pillars);
  const gs=pillars.map(p=>p.gan===dg?'日主':getShiShen(dg,p.gan));
  const zhiArr=pillars.map(p=>p.zhi);
  const dizhiRels=getDiZhiRels(zhiArr);
  const dayun=computeDayun(pillars[0].gan,pillars[1].gan,pillars[1].zhi,gender);
  const genderLabel=gender==='male'?'男':'女';
  const yueZhi=pillars[1].zhi;
  const delingWx={木:['寅','卯','辰'],火:['巳','午','未'],土:['辰','未','戌','丑'],金:['申','酉','戌'],水:['亥','子','丑']}[dw]||[];
  const deling=delingWx.includes(yueZhi);
  const shun=((GAN_YINYANG[pillars[0].gan]==='阳'&&gender==='male')||(GAN_YINYANG[pillars[0].gan]==='阴'&&gender==='female'));

  // 藏干
  let cgText='';
  const zhiLabels=['年','月','日','时'];
  for(let i=0;i<4;i++){
    const cg=ZHI_CANGGAN[zhiArr[i]]||[];
    cgText+=`${zhiLabels[i]}支${zhiArr[i]}: `+cg.map(g=>`${g}(${getShiShen(dg,g)})`).join(' ')+'\n';
  }

  // 大运表（用于prompt内嵌+自由层内容扩展）
  let dyTable='';
  for(const d of dayun){
    dyTable+=`| ${d.startAge}-${d.endAge}岁 | ${d.quanpin} | ${d.wuxing} | ${getShiShen(dg,d.gan)} |\n`;
  }

  // 日主比喻库
  const rizhuMeta={
    甲:'参天大树→正直向上、有原则、善于领导',
    乙:'藤萝花草→灵活柔韧、善于协作、适应力强',
    丙:'太阳之火→热情大方、自带光芒、感染力强',
    丁:'灯烛之火→温暖细腻、善于洞察、专注力强',
    戊:'城墙之土→稳重踏实、可靠有担当、抗压力强',
    己:'田园之土→包容滋养、善于经营、亲和力强',
    庚:'刀剑之金→果断刚毅、执行力强、不惧挑战',
    辛:'珠玉之金→细致精准、追求完美、审美敏锐',
    壬:'江河之水→大气包容、有格局、善于资源整合',
    癸:'雨露之水→细腻敏感、适应性强、直觉精准',
  };

  // 用神推导
  let yongShenHint='';
  if(dw==='火')yongShenHint='水（官杀调候，降温平衡）为主，辅以金（财星生官）';
  else if(dw==='水')yongShenHint='金（印星生身，补充源头）为主，辅以木（食伤泄秀）';
  else if(dw==='木')yongShenHint='水（印星滋养）为主，辅以火（食伤泄秀）';
  else if(dw==='金')yongShenHint='土（印星生身）为主，辅以水（食伤泄秀）';
  else if(dw==='土')yongShenHint='火（印星生身）为主，辅以金（食伤泄秀）';

  return `你是一位拥有30年从业经验的资深八字命理师，精通《渊海子平》《三命通会》《子平真诠》。请为以下用户生成八字解读报告。

用户：${name}，${genderLabel}

## 基础数据

### 四柱八字
| 柱位 | 天干 | 地支 | 十神 | 纳音 |
|------|------|------|------|------|
| 年柱 | ${pillars[0].gan} | ${pillars[0].zhi} | ${gs[0]} | ${NAYIN[pillars[0].gan+pillars[0].zhi]||'未知'} |
| 月柱 | ${pillars[1].gan} | ${pillars[1].zhi} | ${gs[1]} | ${NAYIN[pillars[1].gan+pillars[1].zhi]||'未知'} |
| 日柱 | ${pillars[2].gan} | ${pillars[2].zhi} | 日主 | ${NAYIN[pillars[2].gan+pillars[2].zhi]||'未知'} |
| 时柱 | ${pillars[3].gan} | ${pillars[3].zhi} | ${gs[3]} | ${NAYIN[pillars[3].gan+pillars[3].zhi]||'未知'} |

日主：${dg}（${GAN_YINYANG[dg]}${dw}）→ ${rizhuMeta[dg]||''}
月令：${yueZhi}（${G_WUXING_ZHI[yueZhi]||''}）${deling?'→ 得令':'→ 不得令'}

### 五行力量统计
金${(wx['金']||0).toFixed(1)} 木${(wx['木']||0).toFixed(1)} 水${(wx['水']||0).toFixed(1)} 火${(wx['火']||0).toFixed(1)} 土${(wx['土']||0).toFixed(1)}

天干十神：年${pillars[0].gan}→${gs[0]} 月${pillars[1].gan}→${gs[1]} 日${dg}→日主 时${pillars[3].gan}→${gs[3]}

### 地支藏干
${cgText}
### 地支关系
${dizhiRels}

### 大运排算（${shun?'顺':'逆'}排，约5岁起运）
| 年龄段 | 大运 | 五行 | 十神 |
|--------|------|------|------|
${dyTable}

---

## ⚠️ 铁律：输出格式要求（违反任何一条则报告无效）

**【格式铁律 — 必须100%遵守】**
1. 你必须**一字不改**地使用下面指定的10个模块标题。不要自己发明标题，不要加emoji前缀
2. 每个模块先用 "### 专业分析" 写命理推理，再用 "### 通俗版" 写白话解读
3. 表格必须用 PLANTEXT 代码块包裹（\`\`\`PLANTEXT）
4. 每个段落2-4句话，不啰嗦
5. 不要在任何地方输出"输出模板"、"填空即可"等元指令——直接输出最终内容
6. 整体字数不少于3500字，其中模块7至少1500字

---

## 你必须严格按照以下10个标题输出（一字不改！）：

## 模块一：命盘概览

### 专业分析
（用命理术语分析：四柱排列特点、日主得令/失令原因、天干透出格局、纳音五行流转。含八字排盘表格）

### 通俗版
（用${rizhuMeta[dg]||''}的比喻说清命格特征。四柱天干排列总结一句人生阶段特色，如"你的天干排列是XXX，意味着人生前半段XXX后半段XXX"）

## 模块二：性格DNA

### 专业分析
（日主五行+十神组合推导性格。结合最强十神的含义：食神→创造力/表达能力，正官→纪律性/责任感，七杀→魄力/竞争意识，正印→学习力/贵人运，偏财→商业嗅觉/社交能力。给出具体的行为模式描述，不要笼统）

### 通俗版
（用"你大概率…""你可能是…"语气。说清楚这个性格在现实生活中的具体表现，让用户能对号入座）

## 模块三：五行力量深度分析

### 专业分析
（五行统计表格。最旺五行→天赋在哪，最弱五行→需要注意什么。如有五行缺失<0.5，重点说清影响。五行流转：生克链条分析）

### 通俗版
（一句话总结五行格局优势+一句话指出需要补充的方向）

## 模块四：格局与十神详解

### 专业分析
（表格：四柱各柱天干十神+地支藏干十神，每柱给出对应的天赋/影响。核心格局定性——如"食神泄秀格""官印相生格""财官双美格""七杀攻身格"等，结合十神组合推导）

### 通俗版
（这个格局意味着你的天赋引擎在哪，核心驱动力是什么。如有"全局无官星""全局无财星"等显著特征，用生活化语言说清影响）

## 模块五：地支关系与人生密码

### 专业分析
（列出3-5个最关键的地支关系：六合/六冲/三合，每个给出命理含义。如果关系少，补充天地合等细节）

### 通俗版
（这些关系投射到现实生活中会呈现什么模式。如"年日相冲→早期家庭关系和自我认同有张力""月时三合→工作和晚年有顺遂的转机"）

## 模块六：身强弱与用神喜忌

### 专业分析
（日主${dg}生于${yueZhi}月→${deling?'得令':'不得令'}判断。分析得地/得势情况，综合定身强弱。推算用神：${yongShenHint}。给出用神/喜神/忌神表格）

### 通俗版
（你是身强还是身弱——这意味着什么。身强的人做什么有优势、需注意什么。身弱的人靠什么补强、怎么趋吉避凶）

## 模块七：人生各阶段命理详解（重点模块，需详细展开）

### 专业分析
（对以下8步大运逐一详细分析。每步大运必须包含：
1. 年龄段+大运干支+五行十神
2. 该阶段五行生克变化（与原局互动）
3. 该阶段学业/事业/财运/感情的命理信号
4. 是否为用神运/忌神运，程度如何

对每一步逐年细化几个关键流年节点）

${dayun.map((d,i)=>{
  const labels=['童年根基','青少年成长','青年发展','而立之年','中年转折','事业高峰','知命之年','晚年收获'];
  const shiShen=getShiShen(dg,d.gan);
  const isYongShen=(d.wuxing===yongShenHint.charAt(0)||yongShenHint.includes(d.wuxing));
  return `**第${i+1}步：${d.startAge}-${d.endAge}岁 [${d.quanpin}]（${d.wuxing}·${shiShen}）**
[请分析: 该十年五行生克变化 | 是否为用神运(${isYongShen?'是用神运':'非用神运'}) | 此阶段学业/事业/财运算命解读 | 给出1-2个关键年份节点的运势提醒]
`;
}).join('\n')}

### 通俗版
（用"你回忆一下…"开头，对已走过的阶段逐个验证式描述。对正在经历的阶段给出具体建议。对未来阶段给出趋势性预判。分段用段落分隔，不要太长。关键句示例："15-24岁的XX大运，你大概率经历过一次重要转折——可能是升学、搬家或家庭变化"）

## 模块八：当前运势详判

### 专业分析
（判断当前所处的上一步大运，分析该大运与原局的互动。再分析2026丙午流年：天干丙火与原局各干的合冲关系、地支午火与原局各支的合冲刑害关系、流年与大运的互动。给出3-5条关键判断）

### 通俗版
（今年整体运势一句话判断+核心行动建议。机遇在哪？陷阱在哪？）

## 模块九：天赋领域与人生优势

### 专业分析
（根据日主五行+最强十神+用神方向，归纳3-4个核心天赋领域。每个天赋给出命理依据。同时指出1-2个需要警惕的短板或盲区，给出命理层面的原因）

### 通俗版
（你天生擅长做什么类型的事，在哪个领域最容易出彩。你的"弱点"其实是什么，怎么跟它共处而不是硬改）

## 模块十：命格总结

### 专业分析
（用一句命理格言或经典论断收尾。如"食神泄秀格，一生以技艺立身""财官双美，中年大器晚成"。点出这个命格最大的优势和最大的风险）

### 通俗版
（一句话道破这个命格的本质，让用户记住。要有温度、有力量。如"你是一个永远在输出的太阳——光芒之外、也别忘了给自己留一片阴凉"）

---

**【最后检查清单 — 输出前确认】**
- [ ] 10个模块标题一字不差
- [ ] 每个模块都有"### 专业分析"和"### 通俗版"两个子标题
- [ ] 表格使用PLANTEXT代码块
- [ ] 模块七至少1500字，8步大运每步不少于150字
- [ ] 总字数不低于3500字
- [ ] 没有出现emoji在标题中
- [ ] 没有元指令、模板说明等泄露

> 命理分析仅供娱乐参考。`;
}

// ============ OCR Prompt ============

function buildOcrPrompt(imageBase64){
  return {
    model: 'deepseek-chat',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `这是一张小巫排盘等八字APP的排盘结果截图。

请从截图中提取以下信息，只返回纯JSON：

1. 姓名：截图顶部"坤造/乾造"后面的2-3个汉字，如"唐琦"
2. 性别：坤造=女(female)，乾造=男(male)
3. 八字：找到中间的八字表格，表格有4列（年柱月柱日柱时柱），2行数据（天干行、地支行），按列读取天干+地支配对。如"乙亥 乙酉 丁卯 丁未"

返回格式：
{"name":"姓名","gender":"male或female","baziString":"年柱 月柱 日柱 时柱"}

只输出JSON，不要任何其他文字。`
        },
        {
          type: 'image_url',
          image_url: { url: imageBase64 }
        }
      ]
    }],
    temperature: 0.1,
    max_tokens: 300
  };
}

// 辅助函数：从原始文本中尝试提取八字（多种格式兜底）
function tryExtractBazi(rawText){
  const G='甲乙丙丁戊己庚辛壬癸', Z='子丑寅卯辰巳午未申酉戌亥';
  // 方法1: 标准格式 "甲子 丙寅 戊辰 壬戌"
  const m1=rawText.match(new RegExp(`([${G}][${Z}])\\s+([${G}][${Z}])\\s+([${G}][${Z}])\\s+([${G}][${Z}])`));
  if(m1)return [m1[1],m1[2],m1[3],m1[4]].join(' ');
  // 方法2: 无分隔 "甲子丙寅戊辰壬戌"
  const m2=rawText.match(new RegExp(`([${G}][${Z}])([${G}][${Z}])([${G}][${Z}])([${G}][${Z}])`));
  if(m2)return [m2[1],m2[2],m2[3],m2[4]].join(' ');
  // 方法3: 逐个提取天干+地支对
  const pairs=[], re=new RegExp(`([${G}])([${Z}])`,'g');
  let m;
  while((m=re.exec(rawText))!==null)pairs.push(m[1]+m[2]);
  if(pairs.length>=4)return pairs.slice(-4).join(' ');
  if(pairs.length===4)return pairs.join(' ');
  return null;
}

// ============ 主 Worker 入口 ============

export default {
  async fetch(request, env) {
    const cors={
      'Access-Control-Allow-Origin':'*',
      'Access-Control-Allow-Methods':'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type'
    };

    if(request.method==='OPTIONS')return new Response(null,{headers:cors});

    const url=new URL(request.url);

    // ====== OCR 端点: 图片识别姓名+八字 ======
    if(request.method==='POST' && url.pathname==='/ocr'){
      try {
        const input=await request.json();
        if(!input.imageBase64){
          return new Response(JSON.stringify({error:'请提供imageBase64（图片的base64编码）'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});
        }

        const ocrBody=buildOcrPrompt(input.imageBase64);
        const aiRes=await fetch('https://api.deepseek.com/v1/chat/completions',{
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':'Bearer '+env.DEEPSEEK_API_KEY},
          body:JSON.stringify(ocrBody)
        });

        if(!aiRes.ok){
          const e=await aiRes.text();
          return new Response(JSON.stringify({error:'OCR识别失败:'+aiRes.status}),{status:500,headers:{...cors,'Content-Type':'application/json'}});
        }

        const aiData=await aiRes.json();
        const rawContent=aiData.choices?.[0]?.message?.content||'';

        // 尝试从响应中提取JSON
        let parsed;
        try{
          // 先尝试直接解析
          parsed=JSON.parse(rawContent);
        }catch(e){
          // 尝试从markdown代码块中提取JSON
          const jsonMatch=rawContent.match(/\{[\s\S]*\}/);
          if(jsonMatch){
            try{parsed=JSON.parse(jsonMatch[0]);}catch(e2){parsed=null;}
          }
        }

        // 尝试用 tryExtractBazi 从 rawContent 提取八字（兜底）
        const extractedBazi=tryExtractBazi(rawContent);

        if(parsed && parsed.baziString){
          // 方法A: 解析JSON中的baziString
          const baziParts=parsed.baziString.trim().split(/\s+/);
          if(baziParts.length===4 && baziParts.every(p=>p.length===2)){
            const pillars=baziParts.map(p=>({gan:p.charAt(0),zhi:p.substring(1)}));
            return new Response(JSON.stringify({
              success:true,
              data:{
                name:parsed.name||'',
                gender:parsed.gender||'',
                baziString:parsed.baziString,
                pillars,
                source:parsed.source||'unknown',
              }
            }),{headers:{...cors,'Content-Type':'application/json'}});
          }
        }

        // 方法B: JSON解析失败或格式不对，用正则兜底提取
        if(extractedBazi){
          const parts=extractedBazi.split(' ');
          if(parts.length===4){
            const pillars=parts.map(p=>({gan:p.charAt(0),zhi:p.substring(1)}));
            return new Response(JSON.stringify({
              success:true,
              data:{
                name:parsed?.name||'',
                gender:parsed?.gender||'',
                baziString:extractedBazi,
                pillars,
                source:parsed?.source||'unknown',
              }
            }),{headers:{...cors,'Content-Type':'application/json'}});
          }
        }

        // 方法C: 完全无法提取，返回原始数据让用户手动填写
        return new Response(JSON.stringify({
          success:true,
          data:{
            name:parsed?.name||'',
            gender:parsed?.gender||'',
            baziString:parsed?.baziString||extractedBazi||'',
            pillars:null,
            source:parsed?.source||'unknown',
            needsManualCheck:true
          }
        }),{headers:{...cors,'Content-Type':'application/json'}});

      }catch(err){
        return new Response(JSON.stringify({error:'OCR处理异常:'+err.message}),{status:500,headers:{...cors,'Content-Type':'application/json'}});
      }
    }

    // ====== 生成报告端点 ======
    if(request.method==='POST'){
      try {
        const input=await request.json();
        if(!input.baziString)return new Response(JSON.stringify({error:'请提供baziString（八字字符串）'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});

        const pillars=parseBazi(input.baziString);
        if(pillars.length!==4)return new Response(JSON.stringify({error:'八字需为4柱，当前:'+pillars.length}),{status:400,headers:{...cors,'Content-Type':'application/json'}});

        const prompt=buildPrompt(pillars,input.name||'用户',input.gender||'male');
        // v3: temperature 0.3 提高一致性，max_tokens 12000 容纳扩展内容
        const aiRes=await fetch('https://api.deepseek.com/v1/chat/completions',{
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':'Bearer '+env.DEEPSEEK_API_KEY},
          body:JSON.stringify({model:'deepseek-chat',messages:[{role:'user',content:prompt}],temperature:0.3,max_tokens:12000})
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

    // GET: health check
    return new Response(JSON.stringify({status:'ok',version:'3.0'}),{headers:{...cors,'Content-Type':'application/json'}});
  }
};

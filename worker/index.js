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
  const calcSection=buildBaziCalcSection(pillars,gender);
  const dg=pillars[2].gan,dw=GAN_WUXING[dg];
  const genderLabel=gender==='male'?'男':'女';

  return `${calcSection}

---
## 输出要求

你是资深八字命理师，精通《渊海子平》《三命通会》《子平真诠》。请按以下8个模块生成完整解读，**每个模块必须先列专业分析再给白话翻译**。字数3000+，不要省略。

### 模块一：命盘速览
- 先列四柱八字排盘表（天干/地支/十神/纳音）
- 再用一句话给日主定性（如：癸水—雨露之水，细腻敏感）
- ✅ 白话版：用比喻说清命格特征

### 模块二：五行格局分析  
- 先统计五行力量分布（含天干+地支+藏干）
- 再判断日主强弱（得令/得地/得助三问过程）
- 然后确定用神和忌神
- 标注八字格局（如杀印相生、食神制杀、建禄格等）
- ✅ 白话版：这些五行格局对你意味着什么

### 模块三：十神与职业天赋
- 逐一标注天干十神和地支藏干十神
- 分析最有力量的十神组合
- 每种十神对应的职业天赋倾向（正官→管理 正印→学术 食伤→创意 正财→商业 比劫→执行）
- ✅ 白话版：你的天赋在哪些方面

### 模块四：性格DNA
- 日主五行→性格底色推导
- 十神组合→行为模式推导
- 地支特殊关系→人际模式推导
- ✅ 白话版：具体性格画像（用"你可能…""你大概率…"）

### 模块五：人生过往回顾
- 完整列出8步大运（每步天干/地支/五行/十神）
- 对已走过的大运逐段详细分析（每段2-3句）
- 标注忌神大运（压力期）和用神大运（顺遂期）
- 当前大运详细分析
- ✅ 白话版：用"你回忆一下…是不是…"引导验证

### 模块六：五行→大学专业推荐
- 按用神五行推荐3-5个适配专业方向
- 每个方向给五行匹配理由
- 参考：木→教育/文学/中医/生态/心理 | 火→计算机/AI/传媒/能源/设计 | 土→土木/建筑/管理/行政 | 金→金融/会计/法律/精密制造 | 水→物流/贸易/外交/旅游/营销

### 模块七：五行→职业行业推荐
- 结合十神组合推荐3-5个具体职业
- 每个职业标注十神适配度
- 如：正官+正印旺→公务员/教师/事业单位（官印相生格）

### 模块八：大运职业规划
- 标注未来各阶段主题：深耕期/转型期/收获期/调整期
- 指出最佳发力窗口
- 给出职业发展节奏建议

## 风格要求
1. **先专业后白话**：每个模块先列八字术语和推导过程，再用口语化翻译
2. **具体不模糊**：给具体信号，不给废话式结论
3. **术语准确**：十神用正印/偏印/正官/七杀等标准术语
4. **有温度但不讨好**：好坏都客观说
5. **所有8个模块必须完整输出**，不要省略任何部分
6. 报告开头用"## 🎯 命盘概览"作为第一个二级标题
7. 用户为${genderLabel}，注意大运顺逆和十神解读方向`;
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

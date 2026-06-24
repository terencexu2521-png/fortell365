// Cloudflare Worker: 八字专业职业解读 API v3.3
// v3.3: 修复 - 死标题约束(回调10模块), 子标题从####→###, 加双重死约束

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
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
    const a=zhiArr[i],b=zhiArr[j];
    if(liuhe[a]===b)rels.push(`六合(${a}${b})`);
    if(liuchong[a]===b)rels.push(`六冲(${a}${b})`);
  }
  for(const[k,v]of Object.entries(sanhe)){
    const [x,y,z]=k;
    if(zhiArr.includes(x)&&zhiArr.includes(y)&&zhiArr.includes(z))rels.push(`三合${v}局(${k})`);
  }
  return rels.length?rels.join(' '):'无明显冲合';
}

function genId(){return'rpt_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);}
function parseBazi(str){return str.trim().split(/\s+/).map(p=>({gan:p.charAt(0),zhi:p.substring(1)}));}

function computeDayun(yearGan, monthGan, monthZhi, gender){
  const yinyang=GAN_YINYANG[yearGan];
  const shun=((yinyang==='阳'&&gender==='male')||(yinyang==='阴'&&gender==='female'));
  const ganIdx=GAN.indexOf(monthGan),zhiIdx=ZHI.indexOf(monthZhi),dir=shun?1:-1;
  const dayun=[];let gi=ganIdx,zi=zhiIdx;
  for(let step=0;step<8;step++){
    gi=(gi+dir+10)%10;zi=(zi+dir+12)%12;
    const dyGan=GAN[gi],dyZhi=ZHI[zi];
    dayun.push({gan:dyGan,zhi:dyZhi,startAge:5+step*10,endAge:5+step*10+9,quanpin:dyGan+dyZhi,wuxing:GAN_WUXING[dyGan]});
  }
  return dayun;
}

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

  let cgText='';
  for(let i=0;i<4;i++){
    const cg=ZHI_CANGGAN[zhiArr[i]]||[];
    cgText+=`${['年','月','日','时'][i]}支${zhiArr[i]}: `+cg.map(g=>`${g}(${getShiShen(dg,g)})`).join(' ')+'\n';
  }

  let dyTable='';
  for(const d of dayun)dyTable+=`| ${d.startAge}-${d.endAge}岁 | ${d.quanpin} | ${d.wuxing} | ${getShiShen(dg,d.gan)} |\n`;

  const rizhuMeta={甲:'参天大树→正直向上，有领导力',乙:'藤萝花草→灵活柔韧，适应力强',丙:'太阳之火→热情大方，感染力强',丁:'灯烛之火→温暖细腻，洞察力强',戊:'城墙之土→稳重踏实，能扛事',己:'田园之土→包容滋养，善于经营',庚:'刀剑之金→果断刚毅，执行力强',辛:'珠玉之金→精细精准，追求完美',壬:'江河之水→大气包容，有格局',癸:'雨露之水→细腻敏感，直觉准'};

  let yongShenHint='';
  if(dw==='火')yongShenHint='水（官杀调候，降温平衡）为主，辅以金（财星生官）';
  else if(dw==='水')yongShenHint='金（印星生身，补充源头）为主，辅以木（食伤泄秀）';
  else if(dw==='木')yongShenHint='水（印星滋养）为主，辅以火（食伤泄秀）';
  else if(dw==='金')yongShenHint='土（印星生身）为主，辅以水（食伤泄秀）';
  else if(dw==='土')yongShenHint='火（印星生身）为主，辅以金（食伤泄秀）';

  return `🔒 【死约束 — 违反输出无效】以下10个模块标题和子标题必须一字不差输出。你不允许改动任何标题的文字、标点或顺序。子标题只能用"### 专业分析"和"### 白话解读"，不能用其他格式。如果改了任何一个字，整个输出无效。这条规则高于其他所有写作建议。

你是一位资深命理师，精通《渊海子平》《三命通会》。你不是在填表格——你是在帮一位朋友看他的八字。

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

### 五行力量
金${(wx['金']||0).toFixed(1)} | 木${(wx['木']||0).toFixed(1)} | 水${(wx['水']||0).toFixed(1)} | 火${(wx['火']||0).toFixed(1)} | 土${(wx['土']||0).toFixed(1)}

天干十神：年${pillars[0].gan}→${gs[0]} 月${pillars[1].gan}→${gs[1]} 日${dg}→日主 时${pillars[3].gan}→${gs[3]}

### 地支藏干与关系
${cgText}
${dizhiRels}

### 大运（${shun?'顺':'逆'}排，约5岁起运）
| 年龄段 | 大运 | 五行 | 十神 |
|--------|------|------|------|
${dyTable}

---

## 写作风格（不影响标题约束）

洞察优先：找到这个八字真正有意思的矛盾或天赋，在那里展开。平淡的常规信息一两句带过。全局无财星、杀印相生、地支三合局——这种信号值得深入聊聊。

场景化表达：不要说"你热情大方"，要说"你在团队里不自觉地就成了那个带动气氛的人"。把命理结论翻译成真实的生活场景。

有温度：推测用"大概率""往往是""你可能会发现"，不用"一定""绝对"。

字数3000~5000字，质量优先。表格用PLANTEXT包裹。

---

以下是10个模块的死标题，**一字不改输出**。每个模块下必须用"### 专业分析"然后"### 白话解读"两个子标题。

## 模块一：命盘概览

### 专业分析
呈现八字排盘表格。日主得令还是失令。天干排列有什么特点。纳音格局如有明显流转提一下。

### 白话解读
用${rizhuMeta[dg]||''}的比喻把这个命格说清楚。天干排列暗示的人生节奏用一句大白话概括。

## 模块二：性格DNA

### 专业分析
从日主五行和最强的十神组合入手。具体到行为模式——别说"你有才华"，要说"你食神透干，靠手艺和作品说话"。

### 白话解读
这个性格在真实生活中的表现。比如"你接到新任务第一反应是先研究透再动手"。让用户能对号入座。写透——用户最关心的模块。

## 模块三：五行力量深度分析

### 专业分析
五行统计表。最旺五行→天赋，最弱五行→盲区。五行生克链条。

### 白话解读
五行格局优势+需要补充的方向，各一句说清。

## 模块四：格局与十神详解

### 专业分析
四柱各柱天干十神+地支藏干十神。核心格局定性——"食神泄秀格""杀印相生""财官双美"。全局无某十神的显著特征点明。

### 白话解读
天赋引擎在哪，核心驱动力是什么。如有全局无官星/无财星等特征，用生活化语言说清影响。

## 模块五：地支关系与人生密码

### 专业分析
最关键的地支关系——六合和六冲比三合更有分量。年月、日时关系最重要。有关系多的展开，干净的别硬说。

### 白话解读
年月→原生家庭和早年环境。日时→伴侣、子女和晚年。冲动→人际张力，合→相处默契。

## 模块六：身强弱与用神喜忌

### 专业分析
日主${dg}生于${yueZhi}月→${deling?'得令':'不得令'}判断。得地/得势分析。用神${yongShenHint}。用神/喜神/忌神表格。

### 白话解读
身强还是身弱→这意味着什么。优势和注意事项。

## 模块七：人生各阶段命理详解

### 专业分析
逐十年大运分析。用神运=高光期，忌神运=需谨慎。五行变化、事业财运感情信号。有料的展开，平淡的一句带过。

${dayun.map((d,i)=>{return `**${d.startAge}-${d.endAge}岁 [${d.quanpin}]（${d.wuxing}·${getShiShen(dg,d.gan)}）**`;}).join('\\n')}

### 白话解读
"你回忆一下…"开头。已走过的验证式描述，正在经历的具体建议，未来的趋势判断。写得越细越好——这是用户最觉得"准"的模块。

## 模块八：当前运势详判

### 专业分析
当前大运阶段。2026丙午流年天干丙火地支午火，与原局各柱合冲关系，与大运的互动。

### 白话解读
今年一句话定调。机遇在哪，坑在哪。抓住最可能发生的一两件事说透。

## 模块九：天赋领域与人生优势

### 专业分析
日主五行+最强十神+用神方向→核心天赋领域。五行→行业映射有理有据。不太适合的方向也点一下。

### 白话解读
做什么最容易出彩。适合的行业点明原因。不适合的用"可能"开头——命理给倾向不给判决。

## 模块十：命格总结

### 专业分析
一句命理格言或经典论断收尾。这个命格最大的优势和最需注意的风险。

### 白话解读
一句话道破命格本质，有诗意有力量。像懂命理的老朋友看完盘后说的掏心话。

---

🔒 【再次强调死约束】你输出的标题必须是上面10个，一字不差。如果输出"模块一：你的命盘"而不是"模块一：命盘概览"→ 无效。如果用"### 命理分析"而不是"### 专业分析"→ 无效。标题里的冒号必须是中文全角：。违反任何一条，输出作废。

> ⚠️ 命理分析仅供娱乐参考。`;
}

// OCR prompt (DeepSeek Vision)
function buildOcrPrompt(imageBase64){
  return {model:'deepseek-chat',messages:[{role:'user',content:[{type:'text',text:'这是一张八字排盘工具截图。提取信息返回纯JSON：\n\n{"name":"姓名","gender":"male或female","baziString":"年柱 月柱 日柱 时柱"}\n\n规则：坤造=女(female)，乾造=男(male)。八字4组，每组天干+地支空格分隔，如"乙亥 乙酉 丁卯 丁未"。只输出JSON。'},{type:'image_url',image_url:{url:imageBase64}}]}],temperature:0.1,max_tokens:300};
}

function tryExtractBazi(rawText){
  const G='甲乙丙丁戊己庚辛壬癸',Z='子丑寅卯辰巳午未申酉戌亥';
  const m1=rawText.match(new RegExp(`([${G}][${Z}])\\s+([${G}][${Z}])\\s+([${G}][${Z}])\\s+([${G}][${Z}])`));
  if(m1)return[m1[1],m1[2],m1[3],m1[4]].join(' ');
  const m2=rawText.match(new RegExp(`([${G}][${Z}])([${G}][${Z}])([${G}][${Z}])([${G}][${Z}])`));
  if(m2)return[m2[1],m2[2],m2[3],m2[4]].join(' ');
  const pairs=[],re=new RegExp(`([${G}])([${Z}])`,'g');let m;
  while((m=re.exec(rawText))!==null)pairs.push(m[1]+m[2]);
  if(pairs.length>=4)return pairs.slice(-4).join(' ');
  if(pairs.length===4)return pairs.join(' ');
  return null;
}

export default {
  async fetch(request, env) {
    const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'};
    if(request.method==='OPTIONS')return new Response(null,{headers:cors});
    const url=new URL(request.url);

    // OCR
    if(request.method==='POST' && url.pathname==='/ocr'){
      try {
        const input=await request.json();
        if(!input.imageBase64)return new Response(JSON.stringify({error:'请提供imageBase64'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});
        const aiRes=await fetch('https://api.deepseek.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+env.DEEPSEEK_API_KEY},body:JSON.stringify(buildOcrPrompt(input.imageBase64))});
        if(!aiRes.ok){const e=await aiRes.text();return new Response(JSON.stringify({error:'OCR失败:'+aiRes.status}),{status:500,headers:{...cors,'Content-Type':'application/json'}});}
        const rawContent=(await aiRes.json()).choices?.[0]?.message?.content||'';
        let parsed;try{parsed=JSON.parse(rawContent);}catch(e){const jm=rawContent.match(/\{[\s\S]*\}/);if(jm)try{parsed=JSON.parse(jm[0]);}catch(e2){parsed=null;}}
        const fb=tryExtractBazi(rawContent);
        if(parsed?.baziString){const p=parsed.baziString.trim().split(/\s+/);if(p.length===4&&p.every(x=>x.length===2))return new Response(JSON.stringify({success:true,data:{name:parsed.name||'',gender:parsed.gender||'',baziString:parsed.baziString,pillars:p.map(x=>({gan:x.charAt(0),zhi:x.substring(1)}))}}),{headers:{...cors,'Content-Type':'application/json'}});}
        if(fb){const p=fb.split(' ');if(p.length===4)return new Response(JSON.stringify({success:true,data:{name:parsed?.name||'',gender:parsed?.gender||'',baziString:fb,pillars:p.map(x=>({gan:x.charAt(0),zhi:x.substring(1)}))}}),{headers:{...cors,'Content-Type':'application/json'}});}
        return new Response(JSON.stringify({success:true,data:{name:parsed?.name||'',gender:parsed?.gender||'',baziString:parsed?.baziString||fb||'',pillars:null,needsManualCheck:true}}),{headers:{...cors,'Content-Type':'application/json'}});
      }catch(err){return new Response(JSON.stringify({error:'OCR异常:'+err.message}),{status:500,headers:{...cors,'Content-Type':'application/json'}});}
    }

    // Auth + Reports (D1 required)
    if(request.method==='POST' && url.pathname==='/auth/register'){
      try {
        const {email,password}=await request.json();
        if(!email||!password)return new Response(JSON.stringify({error:'请提供邮箱和密码'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});
        if(password.length<6)return new Response(JSON.stringify({error:'密码至少6位'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});
        if(await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first())return new Response(JSON.stringify({error:'该邮箱已注册'}),{status:409,headers:{...cors,'Content-Type':'application/json'}});
        const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(password+email));
        const hh=Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
        await env.DB.prepare('INSERT INTO users(email,password_hash)VALUES(?,?)').bind(email,hh).run();
        return new Response(JSON.stringify({success:true,data:{email}}),{headers:{...cors,'Content-Type':'application/json'}});
      }catch(err){return new Response(JSON.stringify({error:'注册失败:'+err.message}),{status:500,headers:{...cors,'Content-Type':'application/json'}});}
    }
    if(request.method==='POST' && url.pathname==='/auth/login'){
      try {
        const {email,password}=await request.json();
        if(!email||!password)return new Response(JSON.stringify({error:'请提供邮箱和密码'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});
        const user=await env.DB.prepare('SELECT id,email,password_hash FROM users WHERE email=?').bind(email).first();
        if(!user)return new Response(JSON.stringify({error:'邮箱未注册'}),{status:401,headers:{...cors,'Content-Type':'application/json'}});
        const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(password+email));
        const hh=Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
        if(hh!==user.password_hash)return new Response(JSON.stringify({error:'密码错误'}),{status:401,headers:{...cors,'Content-Type':'application/json'}});
        const token=btoa(JSON.stringify({id:user.id,email:user.email,exp:Date.now()+7*24*3600000}));
        return new Response(JSON.stringify({success:true,data:{token,email:user.email,userId:user.id}}),{headers:{...cors,'Content-Type':'application/json'}});
      }catch(err){return new Response(JSON.stringify({error:'登录失败:'+err.message}),{status:500,headers:{...cors,'Content-Type':'application/json'}});}
    }
    if(request.method==='GET' && url.pathname==='/reports'){
      try {
        const p=parseAuth(request);if(!p)return authError(cors);
        const {results}=await env.DB.prepare('SELECT id,name,gender,bazi_string,created_at FROM reports WHERE user_id=? ORDER BY created_at DESC LIMIT 50').bind(p.id).all();
        return new Response(JSON.stringify({success:true,data:results}),{headers:{...cors,'Content-Type':'application/json'}});
      }catch(err){return new Response(JSON.stringify({error:'查询失败:'+err.message}),{status:500,headers:{...cors,'Content-Type':'application/json'}});}
    }
    if(request.method==='POST' && url.pathname==='/reports'){
      try {
        const p=parseAuth(request);if(!p)return authError(cors);
        const {reportId,name,gender,baziString,content}=await request.json();
        if(!reportId||!content)return new Response(JSON.stringify({error:'请提供完整报告数据'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});
        await env.DB.prepare('INSERT OR REPLACE INTO reports(id,user_id,name,gender,bazi_string,content)VALUES(?,?,?,?,?,?)').bind(reportId,p.id,name,gender,baziString,content).run();
        return new Response(JSON.stringify({success:true,data:{reportId}}),{headers:{...cors,'Content-Type':'application/json'}});
      }catch(err){return new Response(JSON.stringify({error:'保存失败:'+err.message}),{status:500,headers:{...cors,'Content-Type':'application/json'}});}
    }
    if(request.method==='GET' && url.pathname.startsWith('/reports/')){
      try {
        const rid=url.pathname.split('/')[2];
        if(!rid)return new Response(JSON.stringify({error:'请提供报告ID'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});
        const report=await env.DB.prepare('SELECT * FROM reports WHERE id=?').bind(rid).first();
        return report?new Response(JSON.stringify({success:true,data:report}),{headers:{...cors,'Content-Type':'application/json'}}):new Response(JSON.stringify({error:'报告不存在'}),{status:404,headers:{...cors,'Content-Type':'application/json'}});
      }catch(err){return new Response(JSON.stringify({error:'查询失败:'+err.message}),{status:500,headers:{...cors,'Content-Type':'application/json'}});}
    }

    // Generate
    if(request.method==='POST'){
      try {
        const input=await request.json();
        if(!input.baziString)return new Response(JSON.stringify({error:'请提供baziString'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});
        const pillars=parseBazi(input.baziString);
        if(pillars.length!==4)return new Response(JSON.stringify({error:'八字需4柱'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});
        const prompt=buildPrompt(pillars,input.name||'用户',input.gender||'male');
        const aiRes=await fetch('https://api.deepseek.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+env.DEEPSEEK_API_KEY},body:JSON.stringify({model:'deepseek-chat',messages:[{role:'user',content:prompt}],temperature:0.3,max_tokens:12000})});
        if(!aiRes.ok){const e=await aiRes.text();return new Response(JSON.stringify({error:'AI失败:'+aiRes.status}),{status:500,headers:{...cors,'Content-Type':'application/json'}});}
        const content=(await aiRes.json()).choices?.[0]?.message?.content||'';
        const rid=genId();
        await env.BAZI_KV.put('report:'+rid,JSON.stringify({id:rid,content,name:input.name,createdAt:Date.now(),gender:input.gender,baziString:input.baziString}));
        return new Response(JSON.stringify({success:true,data:{reportId:rid,fullContent:content,baziString:pillars.map(p=>p.gan+p.zhi).join(' '),dayGan:pillars[2].gan,dayWuxing:GAN_WUXING[pillars[2].gan]}}),{headers:{...cors,'Content-Type':'application/json'}});
      }catch(err){return new Response(JSON.stringify({error:err.message}),{status:500,headers:{...cors,'Content-Type':'application/json'}});}
    }
    return new Response(JSON.stringify({status:'ok',version:'3.3'}),{headers:{...cors,'Content-Type':'application/json'}});
  }
};

function parseAuth(request){
  const token=(request.headers.get('Authorization')||'').replace('Bearer ','');
  try{const p=JSON.parse(atob(token));if(p.id&&p.exp>Date.now())return p;}catch(e){}
  return null;
}
function authError(cors){return new Response(JSON.stringify({error:'请先登录'}),{status:401,headers:{...cors,'Content-Type':'application/json'}});}

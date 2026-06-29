// Cloudflare Worker: 八字专业职业解读 API v3.6
// v3.5: 合规层 — 模块标题微调 + 生成后敏感词替换
// v3.6: 小程序 — 排盘 / 微信登录 / 功能开关

import { computePaipan } from './paipan.js';
import { alipayConfigured, createOnlinePayUrl, verifyNotify, parseNotifyBody, isMobileUserAgent } from './alipay.js';

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
function genOrderId(){return'ord_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);}

const PRICE_CENTS=10; // 测试价 ¥0.10，正式上线改回 1990
const FREE_DEADLINE_ISO='2020-01-01T00:00:00+08:00'; // 测试收费流程时关闭限时全免，上线前改回 2026-07-31
const ALIPAY_QR_URL='https://fortell365.com/pay/alipay-qr.png';
const FREE_MODULE_COUNT=5;
const MODULE_HEADER_RE=/^## (?:模块[一二三四五六七八九十\d]+[：:]|(?:[一二三四五六七八九十]+、))/;

const MODULE_TITLE_REPLACEMENTS=[
  ['## 模块一：命盘概览','## 一、文化档案概览'],
  ['## 模块一：文化档案概览','## 一、文化档案概览'],
  ['## 模块二：性格DNA','## 二、性格DNA'],
  ['## 模块三：五行力量深度分析','## 三、五行力量深度分析'],
  ['## 模块四：格局与十神详解','## 四、格局与十神详解'],
  ['## 模块五：地支关系与人生密码','## 五、地支关系与人生密码'],
  ['## 模块六：身强弱与用神喜忌','## 六、身强弱与用神喜忌'],
  ['## 模块七：人生各阶段命理详解','## 七、人生各阶段趋势详解'],
  ['## 模块七：人生各阶段趋势详解','## 七、人生各阶段趋势详解'],
  ['## 模块八：当前运势详判','## 八、当前阶段趋势分析'],
  ['## 模块八：当前阶段趋势分析','## 八、当前阶段趋势分析'],
  ['## 模块九：天赋领域与人生优势','## 九、天赋领域与人生优势'],
  ['## 模块十：命格总结','## 十、个性画像总结'],
  ['## 模块十：个性画像总结','## 十、个性画像总结'],
];
const COMPLIANCE_REPLACEMENTS=[
  ['人生各阶段命理详解','人生各阶段趋势详解'],
  ['当前运势详判','当前阶段趋势分析'],
  ['命盘概览','文化档案概览'],
  ['命格总结','个性画像总结'],
  ['命理分析仅供娱乐参考','国学分析仅供娱乐参考'],
  ['流年运势','流年趋势'],
  ['当前运势','当前阶段趋势'],
  ['今年运势','今年趋势'],
  ['整体运势','整体趋势'],
  ['运势','阶段趋势'],
  ['命格','个性特质'],
  ['命理格言','国学格言'],
  ['懂命理','懂国学'],
  ['命理给','分析给'],
  ['命理结论','分析结论'],
  ['命理','国学'],
  ['算命','分析'],
  ['占卜','参考'],
  ['吉凶','利弊'],
  ['转运','调整'],
  ['灾祸','挑战'],
  ['桃花运','人际缘分'],
  ['桃花','人际缘分'],
  ['姻缘','情感关系'],
  ['合婚','情感匹配'],
  ['财运','事业与收入'],
  ['发财','增收'],
  ['破财','支出压力'],
];
function applyComplianceFilter(content){
  let out=content||'';
  for(const [from,to] of MODULE_TITLE_REPLACEMENTS)out=out.split(from).join(to);
  for(const [from,to] of COMPLIANCE_REPLACEMENTS)out=out.split(from).join(to);
  return out;
}

const REPORT_FOOTER_MARKER='【温馨提示】';
const REPORT_FOOTER=`\n\n---\n\n> **温馨提示**：本报告基于国学文化档案与 AI 分析生成，仅供娱乐与自我探索参考，不构成升学、就业、投资或医疗决策依据。了解特质只是起点，人生掌握在自己手中——持续学习、主动争取，才能走出属于自己的精彩。`;

function stripReportInternal(content){
  return (content||'')
    .replace(/🔒\s*【死约束[^】]*】[\s\S]*?(?=## 一、)/g,'')
    .replace(/---\s*\n\s*🔒.*$/gm,'')
    .replace(/【.*?死约束.*?】[\s\S]*$/g,'')
    .replace(/---\s*\n\s*> ⚠️.*$/g,'')
    .replace(/\n\n---\n\n> \*\*温馨提示\*\*[\s\S]*$/,'')
    .trim();
}

function appendReportFooter(content){
  const text=(content||'').trim();
  if(!text)return REPORT_FOOTER.trim();
  if(text.includes(REPORT_FOOTER_MARKER)||text.includes('人生掌握在自己手中'))return text;
  return text+REPORT_FOOTER;
}

function isFreePeriodNow(){
  return Date.now()<new Date(FREE_DEADLINE_ISO).getTime();
}

function cleanReportContent(content){
  return appendReportFooter(applyComplianceFilter(stripReportInternal(content))).replace(/（详写）/g,'');
}

function splitReportModules(content){
  const cleaned=applyComplianceFilter(stripReportInternal(content));
  const modules=[];let current='';
  for(const line of cleaned.split('\n')){
    if(MODULE_HEADER_RE.test(line)&&current.trim()){modules.push(current.trim());current=line+'\n';}
    else current+=line+'\n';
  }
  if(current.trim())modules.push(current.trim());
  return modules;
}

function getPreviewContent(content){
  const modules=splitReportModules(content);
  if(!modules.length)return appendReportFooter(applyComplianceFilter(stripReportInternal(content)));
  if(modules.length<=FREE_MODULE_COUNT)return appendReportFooter(modules.join('\n\n'));
  return appendReportFooter(
    modules.slice(0,FREE_MODULE_COUNT).join('\n\n')+'\n\n> *…以上为免费预览（前5章）。解锁后可查看完整10章报告*'
  );
}

function getDisplayContent(content,isUnlocked){
  return isUnlocked?cleanReportContent(content):getPreviewContent(content);
}

async function getKvReport(env,rid){
  const raw=await env.BAZI_KV.get('report:'+rid);
  if(!raw)return null;
  try{return JSON.parse(raw);}catch(e){return null;}
}

async function saveKvReport(env,report){
  await env.BAZI_KV.put('report:'+report.id,JSON.stringify(report));
}

async function saveOrderKv(env,order){
  await env.BAZI_KV.put('order:'+order.id,JSON.stringify(order),{expirationTtl:604800});
}

async function getOrderKv(env,oid){
  const raw=await env.BAZI_KV.get('order:'+oid);
  if(!raw)return null;
  try{return JSON.parse(raw);}catch(e){return null;}
}

async function markOrderPaid(env,oid,reportId){
  await unlockReport(env,reportId,'paid',oid);
  const order=await getOrderKv(env,oid);
  if(order){
    order.status='paid';
    order.paidAt=Date.now();
    await saveOrderKv(env,order);
  }
  if(env.DB){
    try{
      await env.DB.prepare('UPDATE orders SET status=?,paid_at=datetime(\'now\') WHERE id=? AND report_id=?')
        .bind('paid',oid,reportId).run();
    }catch(e){}
  }
}

async function unlockReport(env,rid,unlockType,orderId=null){
  const kv=await getKvReport(env,rid);
  if(kv){
    kv.isUnlocked=true;kv.unlockType=unlockType;
    if(orderId)kv.orderId=orderId;
    await saveKvReport(env,kv);
  }
  if(env.DB){
    try{
      await env.DB.prepare('UPDATE reports SET is_unlocked=1,unlock_type=?,order_id=COALESCE(?,order_id) WHERE id=?')
        .bind(unlockType,orderId,rid).run();
    }catch(e){}
  }
}

function pricingPayload(){
  return {
    price:PRICE_CENTS,
    priceYuan:(PRICE_CENTS/100).toFixed(2),
    freeDeadline:FREE_DEADLINE_ISO,
    isFreePeriod:isFreePeriodNow(),
    alipayQrUrl:ALIPAY_QR_URL,
    freeModuleCount:FREE_MODULE_COUNT,
  };
}

function featuresPayload(env){
  return {
    paipan:true,
    report:true,
    payment:alipayConfigured(env),
    paymentMode:alipayConfigured(env)?'alipay_online':'static_qr',
    freeModuleCount:FREE_MODULE_COUNT,
    isFreePeriod:isFreePeriodNow(),
    freeDeadline:FREE_DEADLINE_ISO,
  };
}

async function upsertWechatUser(env,openid){
  if(!env.DB)throw new Error('数据库未配置');
  let user=await env.DB.prepare('SELECT id,email FROM users WHERE wechat_openid=?').bind(openid).first();
  if(!user){
    const email=`wx_${openid.slice(-12)}@mp.local`;
    const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(openid+'wx_mp_salt'));
    const hh=Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
    await env.DB.prepare('INSERT INTO users(email,password_hash,wechat_openid)VALUES(?,?,?)').bind(email,hh,openid).run();
    user=await env.DB.prepare('SELECT id,email FROM users WHERE wechat_openid=?').bind(openid).first();
  }
  const token=btoa(JSON.stringify({id:user.id,email:user.email,exp:Date.now()+7*24*3600000}));
  return {token,email:user.email,userId:user.id,openid};
}

async function wechatLogin(env,code){
  const appid=env.WECHAT_APPID,secret=env.WECHAT_SECRET;
  if(!appid||!secret)throw new Error('微信登录未配置');
  const wxRes=await fetch(`https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`);
  const wx=await wxRes.json();
  if(wx.errcode)throw new Error(wx.errmsg||'微信登录失败');
  const openid=wx.openid;
  if(!openid)throw new Error('未获取 openid');
  return upsertWechatUser(env,openid);
}

async function devProbeLogin(env,probeId){
  if(env.ALLOW_PROBE_DEV_AUTH!=='true')throw new Error('探路开发登录未开启');
  const raw=String(probeId||'').trim();
  if(!raw||raw.length<6)throw new Error('无效探路设备 ID');
  const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('probe:'+raw));
  const openid='probe_'+Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,24);
  const data=await upsertWechatUser(env,openid);
  return {...data,mode:'dev_probe'};
}

function jsonResponse(data,status=200,cors={}){
  return new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
}
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

  return `🔒 【死约束 — 违反输出无效】以下10个章节标题和子标题必须一字不差输出。标题格式为"## 一、标题名"（用中文序号一、二、三…，禁止写"模块"二字）。子标题只能用"### 专业分析"和"### 白话解读"。如果改了任何一个字，整个输出无效。这条规则高于其他所有写作建议。

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

以下是10个章节的死标题，**一字不改输出**（禁止出现"模块"二字）。每个章节下必须用"### 专业分析"然后"### 白话解读"两个子标题。

## 一、文化档案概览

### 专业分析
呈现八字排盘表格。日主得令还是失令。天干排列有什么特点。纳音格局如有明显流转提一下。

### 白话解读
用${rizhuMeta[dg]||''}的比喻把这个命格说清楚。天干排列暗示的人生节奏用一句大白话概括。

## 二、性格DNA

### 专业分析
从日主五行和最强的十神组合入手。具体到行为模式——别说"你有才华"，要说"你食神透干，靠手艺和作品说话"。

### 白话解读
这个性格在真实生活中的表现。比如"你接到新任务第一反应是先研究透再动手"。让用户能对号入座。写透——用户最关心的章节。

## 三、五行力量深度分析

### 专业分析
五行统计表。最旺五行→天赋，最弱五行→盲区。五行生克链条。

### 白话解读
五行格局优势+需要补充的方向，各一句说清。

## 四、格局与十神详解

### 专业分析
四柱各柱天干十神+地支藏干十神。核心格局定性——"食神泄秀格""杀印相生""财官双美"。全局无某十神的显著特征点明。

### 白话解读
天赋引擎在哪，核心驱动力是什么。如有全局无官星/无财星等特征，用生活化语言说清影响。

## 五、地支关系与人生密码

### 专业分析
最关键的地支关系——六合和六冲比三合更有分量。年月、日时关系最重要。有关系多的展开，干净的别硬说。

### 白话解读
年月→原生家庭和早年环境。日时→伴侣、子女和晚年。冲动→人际张力，合→相处默契。

## 六、身强弱与用神喜忌

### 专业分析
日主${dg}生于${yueZhi}月→${deling?'得令':'不得令'}判断。得地/得势分析。用神${yongShenHint}。用神/喜神/忌神表格。

### 白话解读
身强还是身弱→这意味着什么。优势和注意事项。

## 七、人生各阶段趋势详解

### 专业分析
逐十年大运分析。用神运=高光期，忌神运=需谨慎。五行变化、事业财运感情信号。有料的展开，平淡的一句带过。

${dayun.map((d,i)=>{return `**${d.startAge}-${d.endAge}岁 [${d.quanpin}]（${d.wuxing}·${getShiShen(dg,d.gan)}）**`;}).join('\\n')}

### 白话解读
"你回忆一下…"开头。已走过的验证式描述，正在经历的具体建议，未来的趋势判断。写得越细越好——这是用户最觉得"准"的章节。

## 八、当前阶段趋势分析

### 专业分析
当前大运阶段。2026丙午流年天干丙火地支午火，与原局各柱合冲关系，与大运的互动。

### 白话解读
今年一句话定调。机遇在哪，坑在哪。抓住最可能发生的一两件事说透。

## 九、天赋领域与人生优势

### 专业分析
日主五行+最强十神+用神方向→核心天赋领域。五行→行业映射有理有据。
**本产品是专业/职业探索工具，本章必须重点展开：**
1. **适合专业**：列出4-6个具体大学专业/学科方向（如计算机科学、金融学、心理学、建筑学、新闻传播、护理学等），每个专业用2-3句说明：为何与本命五行、十神、用神契合；该专业典型课程/训练方式是否匹配你的学习风格。
2. **适合职业**：列出4-6个具体职业/岗位（如产品经理、教师、律师、设计师、数据分析师、创业者等），每个职业用2-3句说明：岗位日常做什么、需要哪些能力、你的命盘哪些特质会在该岗位上被放大。
3. **不太适合的方向**：点1-2个专业或职业类型，用"可能"开头，说明原因，不给绝对判决。

### 白话解读
**必须给出可执行的选专业/选职业清单（用户最关心）：**
- **专业推荐 TOP3**：每条格式「专业名 → 一句话为什么适合你 → 未来可衔接的职业举例」
- **职业推荐 TOP3**：每条格式「职业名 → 你在这个岗位最容易出彩的原因 → 入门建议（如需要补什么技能）」
- 用生活化语言，让高中生/大学生/转行者都能看懂、能拿去和家长或老师讨论。

## 十、个性画像总结

### 专业分析
一句命理格言或经典论断收尾。这个命格最大的优势和最需注意的风险。

### 白话解读
一句话道破命格本质，有诗意有力量。像懂命理的老朋友看完盘后说的掏心话。可顺带一句：若只能记住一个专业方向和一个职业方向，分别是……

---

🔒 【再次强调死约束】你输出的标题必须是上面10个，一字不差，且禁止写"模块"二字。如果输出"## 模块一：…"或"## 一. …"→ 无效。必须用"## 一、文化档案概览"这种格式。如果用"### 命理分析"而不是"### 专业分析"→ 无效。标题里的序号必须用中文"一、二、三…"加顿号。违反任何一条，输出作废。

不要在正文末尾自行添加免责声明或温馨提示，系统会自动追加。`;
}

// OCR：从文本提取 hint
const GAN_OCR_FIX={心:'乙',用:'辛',千:'甲',画:'庚',华:'辛',王:'壬',于:'丁',平:'辛',扬:'辛',士:'辛',E:'壬',Z:'乙'};
const ZHI_OCR_FIX={习:'丑',乍:'丑',丘:'丑',财:'寅',术:'未'};

function fixGanOcr(ch){
  const G='甲乙丙丁戊己庚辛壬癸';
  if(G.includes(ch))return ch;
  return GAN_OCR_FIX[ch]||null;
}

function extractCharsFromSeg(segment, fix, valid){
  const out=[];
  for(const ch of segment.replace(/[^\u4e00-\u9fff]/g,'')){
    const f=fix(ch);
    if(f&&valid.includes(f)){out.push(f);if(out.length>=4)break;}
  }
  return out.slice(0,4);
}

function normalizeShiShenLabel(raw){
  const s=String(raw).replace(/\s/g,'');
  if(s==='日元'||s==='日主')return'日元';
  const exact={正印:'正印',偏印:'偏印',偶印:'偏印',正财:'正财',偏财:'偏财',正官:'正官',偏官:'七杀',七杀:'七杀',比肩:'比肩',劫财:'劫财',食神:'食神',伤官:'伤官',仿官:'伤官',比局:'比肩',比肽:'比肩',比所:'比肩',比股:'比肩',正F:'正印',正f:'正印',正宠:'正官',正宫:'正官',劫才:'劫财',劲哉:'劫财',励财:'劫财',食饲:'食神',食伯:'食神',食伸:'食神',偏E:'偏印',俳印:'偏印',仿百:'伤官',份定:'伤官'};
  if(exact[s])return exact[s];
  if(/食神|食饲|食伯|食伸/.test(s))return'食神';
  if(/伤官|仿官|份定|仿百/.test(s))return'伤官';
  if(/偏印|偶印|俳印|偏E/.test(s))return'偏印';
  if(/正印/.test(s))return'正印';
  if(/正财/.test(s))return'正财';
  if(/偏财/.test(s))return'偏财';
  if(/正官|正宠/.test(s))return'正官';
  if(/七杀|偏官/.test(s))return'七杀';
  if(/比肩|比局|比肽|比所|比股/.test(s))return'比肩';
  if(/劫财|劫才|劲哉|励财/.test(s))return'劫财';
  return s;
}

function mergeShiShenTokens(tokens){
  const out=[], pairs=[['日','元'],['日','主'],['正','印'],['偏','印'],['正','财'],['偏','财'],['正','官'],['正','F'],['七','杀'],['比','肩'],['劫','财'],['食','神'],['伤','官']];
  for(let i=0;i<tokens.length;i++){
    let matched=false;
    for(const[a,b]of pairs){
      if(tokens[i]===a&&tokens[i+1]===b){out.push(a+b);i++;matched=true;break;}
    }
    if(!matched&&tokens[i].length>1&&/印|财|官|杀|神|肩|元|主/.test(tokens[i]))out.push(tokens[i]);
  }
  return out;
}

const SHISHEN_KNOWN=['正印','偏印','正财','偏财','正官','七杀','比肩','劫财','食神','伤官','日元'];

function extractShiShenRow(ocrText){
  const labelRes=['主\\s*星','副\\s*星'];
  let best=null, bestValid=0;
  for(const label of labelRes){
    for(const line of String(ocrText).split('\n')){
      if(!new RegExp(label).test(line))continue;
      const seg=line.replace(new RegExp(`^[\\s\\S]*?${label}[：:\\s]*`,'u'),'');
      const merged=mergeShiShenTokens(seg.split(/\s+/).filter(Boolean)).map(normalizeShiShenLabel);
      if(merged.length<4)continue;
      const top=merged.slice(0,4);
      const valid=top.filter(s=>SHISHEN_KNOWN.includes(s)).length;
      if(valid>bestValid){bestValid=valid;best=top;}
    }
    if(label==='主\\s*星'&&bestValid>=4)break;
  }
  return bestValid>=4?best:null;
}

const ZHI_ROW_RE=/(?:地|坚|&)\s*支|&\s*爻/;
const ZHI_ROW_STRIP=/^[\s\S]*?(?:地|坚|&)\s*支[：:\s"'「『]*/u;

function extractZhiTipChars(ocrText){
  const m=String(ocrText).match(/地\s*支\s*提\s*示[：:\s]*([^\n]+)/);
  if(!m)return [];
  const Z='子丑寅卯辰巳午未申酉戌亥';
  const out=[];
  for(const ch of m[1].replace(/[^\u4e00-\u9fff]/g,'')){
    const z=ZHI_OCR_FIX[ch]||(Z.includes(ch)?ch:null);
    if(z&&!out.includes(z))out.push(z);
  }
  return out;
}

function repairZhisFromTips(partial, ocrText){
  if(partial.length!==3)return null;
  const tips=extractZhiTipChars(ocrText);
  const missing=tips.filter(z=>!partial.includes(z));
  if(missing.length!==1)return null;
  return [partial[0],missing[0],partial[1],partial[2]];
}

function extractGanFreqFromText(ocrText){
  const G='甲乙丙丁戊己庚辛壬癸';
  const freq=new Map();
  for(const line of String(ocrText).split('\n')){
    if(/提\s*示|笔\s*记|节\s*气|农\s*历|属\s|藏\s*干|副\s*星/.test(line))continue;
    const compact=line.replace(/\s+/g,'');
    if(/[甲乙丙丁戊己庚辛壬癸][金木水火土]/.test(compact))continue;
    for(const ch of line.replace(/[^\u4e00-\u9fffA-Za-z]/g,'')){
      const f=fixGanOcr(ch);
      if(f&&G.includes(f))freq.set(f,(freq.get(f)||0)+1);
    }
  }
  return freq;
}

function extractLooseStemHints(ocrText){
  const fromCombine=extractGanCombineHint(ocrText);
  if(fromCombine)return fromCombine;
  const hints=[];
  if(/王\s*水|\b王\b/.test(ocrText)&&/藏\s*干/.test(ocrText))hints.push('壬');
  if(/丁\s*火/.test(ocrText))hints.push('丁');
  if(/辛\s*金|平\s*金|年\s*金/.test(ocrText))hints.push('辛');
  return hints.length>=2?hints:null;
}

function extractHeaderGanHint(ocrText){
  const m=String(ocrText).match(/\(\s*([甲乙丙丁戊己庚辛壬癸])\s*[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]\s*\)/);
  return m?m[1]:null;
}

function extractGansFromLineAboveZhi(ocrText){
  const lines=String(ocrText).split('\n');
  const G='甲乙丙丁戊己庚辛壬癸';
  const Z='子丑寅卯辰巳午未申酉戌亥';
  const fixZhi=(ch)=>ZHI_OCR_FIX[ch]||(Z.includes(ch)?ch:null);
  for(let i=1;i<lines.length;i++){
    const ln=lines[i].trim();
    if(!ZHI_ROW_RE.test(ln))continue;
    if(/提\s*示|相\s*冲|半\s*合|暗\s*合|自\s*刑/.test(ln))continue;
    const seg=ln.replace(ZHI_ROW_STRIP,'');
    const zhis=extractCharsFromSeg(seg,fixZhi,Z);
    if(zhis.length<3)continue;
    const above=(lines[i-1]||'').replace(/^[^\u4e00-\u9fff]+/,'');
    const gans=extractCharsFromSeg(above,fixGanOcr,G);
    if(gans.length>=3)return gans.slice(0,4);
  }
  // 2. 兜底：含最多地支的行，取其上一行作天干行
  let bestZhiIdx=-1, bestZhiCount=0;
  for(let i=0;i<lines.length;i++){
    if(/提\s*示|笔\s*记|节\s*气|惊\s*蛰|春\s*分|藏\s*干|主\s*星|副\s*星/.test(lines[i]))continue;
    const zhis=extractCharsFromSeg(lines[i].replace(/\s+/g,''),fixZhi,Z);
    if(zhis.length>bestZhiCount){bestZhiCount=zhis.length;bestZhiIdx=i;}
  }
  if(bestZhiIdx>0&&bestZhiCount>=3){
    const above=(lines[bestZhiIdx-1]||'').replace(/^[^\u4e00-\u9fff]+/,'');
    const gans=extractCharsFromSeg(above,fixGanOcr,G);
    if(gans.length>=3)return gans.slice(0,4);
  }
  return null;
}

function extractGanCombineHint(ocrText){
  const m=String(ocrText).match(/天\s*干\s*提\s*示[：:\s]*([^\n]+)/);
  if(!m)return null;
  const G='甲乙丙丁戊己庚辛壬癸';
  const gans=[];
  for(const ch of m[1].replace(/[^\u4e00-\u9fff]/g,'')){
    const f=fixGanOcr(ch);
    if(f&&G.includes(f)&&!gans.includes(f))gans.push(f);
  }
  return gans.length>=2?gans:null;
}

function extractGansFromLabelsText(ocrText){
  for(const line of String(ocrText).split('\n')){
    if(!/天\s*干|大\s*干/.test(line)||/提\s*示/.test(line))continue;
    const seg=line.replace(/^[\s\S]*?(?:天|大)\s*干[：:\s]*/u,'');
    const gans=extractCharsFromSeg(seg,fixGanOcr,'甲乙丙丁戊己庚辛壬癸');
    if(gans.length>=3)return gans.slice(0,4);
  }
  return null;
}

function extractGansFromCangGanText(ocrText){
  const lines=String(ocrText).split('\n').map(l=>l.trim()).filter(Boolean);
  const idx=lines.findIndex(l=>/藏\s*干/.test(l));
  if(idx<0)return null;
  const WUXING='金木水火土';
  const pick=(s)=>{
    const out=[];
    for(const ch of s.replace(/[^\u4e00-\u9fff]/g,'')){
      if(WUXING.includes(ch))continue;
      const f=fixGanOcr(ch);
      if(f)out.push(f);
    }
    return out;
  };
  const block=pick(lines[idx].replace(/^[\s\S]*?藏\s*干[：:\s]*/u,'')).concat(pick(lines[idx+1]||''));
  if(block.length>=4){
    // 问真藏干按列：取每柱首个透干 hint → 辛乙壬丁 模式
    return [block[0],block[1],block[2],block[block.length-1]].slice(0,4);
  }
  return block.length>=3?block:null;
}

function ganFromShiShen(dayGan, label){
  const norm=normalizeShiShenLabel(label);
  if(norm==='日元'||norm==='日主')return dayGan;
  if(norm==='比肩')return dayGan;
  for(const g of GAN){
    if(g===dayGan)continue;
    if(getShiShen(dayGan,g)===norm)return g;
  }
  return null;
}

const ZHI_CANG={子:['癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],辰:['戊','乙','癸'],巳:['丙','庚','戊'],午:['丁','己'],未:['己','丁','乙'],申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']};

function inferGansFromShiShenRow(ocrText, knownZhi){
  const G='甲乙丙丁戊己庚辛壬癸';
  const row=extractShiShenRow(ocrText);
  if(!row||row.length<4)return null;
  const labels=row.slice(0,4).map(normalizeShiShenLabel);
  labels[2]='日元';
  const candidates=[];
  for(const dayGan of G){
    const gans=labels.map(ss=>(ss==='日元'?dayGan:ganFromShiShen(dayGan,ss)));
    if(!gans.every(g=>g&&G.includes(g)))continue;
    const ok=labels.every((ss,i)=>{
      if(ss==='日元')return true;
      if(ss==='比肩')return gans[i]===dayGan;
      return getShiShen(dayGan,gans[i])===ss;
    });
    if(ok)candidates.push(gans);
  }
  if(candidates.length===0)return null;
  if(candidates.length===1)return candidates[0];
  const labelGans=extractGansFromLabelsText(ocrText)||extractGansFromLineAboveZhi(ocrText);
  const ganTip=extractLooseStemHints(ocrText);
  const cangGan=extractGansFromCangGanText(ocrText);
  const ganFreq=extractGanFreqFromText(ocrText);
  const headerGan=extractHeaderGanHint(ocrText);
  const scoreCandidate=(gans)=>{
    let score=0;
    if(headerGan&&gans[0]===headerGan)score+=15;
    if(labelGans?.[0]&&gans[0]===labelGans[0])score+=10;
    if(labelGans){for(let i=1;i<4;i++){if(labelGans[i]&&gans[i]===labelGans[i])score+=4;}}
    if(cangGan){for(let i=0;i<Math.min(4,cangGan.length);i++){if(cangGan[i]&&gans[i]===cangGan[i])score+=8;}}
    if(ganTip){
      if(ganTip.includes(gans[2]))score+=20;
      if(ganTip.includes(gans[3]))score+=16;
      if(ganTip.includes(gans[1]))score+=8;
      if(ganTip.includes(gans[0]))score+=8;
    }
    if(labels[0]===labels[1]&&labels[0]!=='日元'&&gans[0]===gans[1])score+=10;
    if(/王/.test(ocrText)&&gans[2]==='壬')score+=22;
    if(/丁\s*火/.test(ocrText)&&gans[3]==='丁')score+=22;
    if(/辛\s*金|平\s*金/.test(ocrText)&&gans[0]==='辛')score+=12;
    for(const g of gans)score+=(ganFreq.get(g)||0)*2;
    return score;
  };
  const scored=candidates.map(gans=>({gans,score:scoreCandidate(gans)}));
  scored.sort((a,b)=>b.score-a.score);
  return scored[0].gans;
}

function extractGansFromStemRow(ocrText){
  const Z='子丑寅卯辰巳午未申酉戌亥';
  const fixZhi=(ch)=>ZHI_OCR_FIX[ch]||(Z.includes(ch)?ch:null);
  const lines=String(ocrText).split('\n').map(l=>l.trim()).filter(Boolean);
  let starIdx=-1, zhiIdx=-1, bestZhiCount=0;
  for(let i=0;i<lines.length;i++){
    if(starIdx<0&&/主\s*星/.test(lines[i]))starIdx=i;
    if(!ZHI_ROW_RE.test(lines[i])||/提\s*示|相\s*冲|半\s*合/.test(lines[i]))continue;
    const zhis=extractCharsFromSeg(lines[i].replace(ZHI_ROW_STRIP,''),fixZhi,Z);
    if(zhis.length>=3&&zhis.length>=bestZhiCount){bestZhiCount=zhis.length;zhiIdx=i;}
  }
  if(starIdx<0||zhiIdx<=starIdx)return null;
  for(let i=starIdx+1;i<zhiIdx;i++){
    const line=lines[i];
    if(/藏\s*干|提\s*示|副\s*星|五\s*行|主\s*星|日\s*期|年\s*柱/.test(line))continue;
    if(/天\s*干|大\s*干/.test(line)){
      const seg=line.replace(/^[\s\S]*?(?:天|大)\s*干[：:\s]*/u,'');
      const gans=extractCharsFromSeg(seg,fixGanOcr,'甲乙丙丁戊己庚辛壬癸');
      if(gans.length===4)return gans;
    }
    if(/[甲乙丙丁戊己庚辛壬癸][金木水火土]/.test(line.replace(/\s/g,'')))continue;
    const gans=extractCharsFromSeg(line,fixGanOcr,'甲乙丙丁戊己庚辛壬癸');
    if(gans.length===4)return gans;
  }
  return null;
}

function resolveGans(ocrText, knownZhi, coloredGansHint){
  const G='甲乙丙丁戊己庚辛壬癸';
  if(Array.isArray(coloredGansHint)&&coloredGansHint.length===4&&coloredGansHint.every(g=>G.includes(g))){
    return coloredGansHint.slice();
  }
  const stemRow=extractGansFromStemRow(ocrText);
  if(stemRow?.length===4){
    const inferred=inferGansFromShiShenRow(ocrText, knownZhi);
    const row=extractShiShenRow(ocrText);
    if(inferred?.length===4&&row?.length>=4){
      const labels=row.slice(0,4).map(normalizeShiShenLabel);
      labels[2]='日元';
      const dayGan=inferred[2];
      const fixed=stemRow.slice();
      fixed[2]=dayGan;
      const stemMatches=labels.every((ss,i)=>{
        if(i===2)return true;
        if(ss==='比肩')return fixed[i]===dayGan;
        return getShiShen(dayGan,fixed[i])===ss;
      });
      return stemMatches?fixed:inferred;
    }
    return stemRow;
  }
  const labeled=extractGansFromLabelsText(ocrText);
  if(labeled?.length===4)return labeled;
  const aboveZhi=extractGansFromLineAboveZhi(ocrText);
  if(aboveZhi?.length===4)return aboveZhi;
  return inferGansFromShiShenRow(ocrText, knownZhi);
}

function extractRowSnippet(ocrText, labelRe){
  for(const line of String(ocrText).split('\n')){
    if(labelRe.test(line))return line.trim();
  }
  return '';
}

function refineGansWithHints(ocrText, aiGans, knownGansHint, knownZhi){
  const G='甲乙丙丁戊己庚辛壬癸';
  const inferred=resolveGans(ocrText, knownZhi, knownGansHint);
  const cang=extractGansFromCangGanText(ocrText);
  const hints=(Array.isArray(knownGansHint)&&knownGansHint.length===4)?knownGansHint:(inferred||cang);

  if(inferred&&inferred.every(g=>G.includes(g)))return inferred;

  const base=Array.isArray(aiGans)&&aiGans.length===4?aiGans.slice():null;
  if(!base){
    if(hints&&hints.length===4&&hints.every(g=>G.includes(g)))return hints;
    return null;
  }

  return base.map((gan,i)=>{
    if(!G.includes(gan)&&hints?.[i])return hints[i];
    const hint=hints?.[i], cg=cang?.[i];
    if(gan==='己'&&(hint==='辛'||cg==='辛'))return'辛';
    if(i===2&&(gan==='丁'||gan==='己')&&(hint==='壬'||cg==='壬'))return'壬';
    if(hint&&hint!==gan){
      if((gan==='己'&&hint==='辛')||(gan==='丁'&&hint==='壬')||(gan==='壬'&&hint==='丁'))return hint;
    }
    return gan;
  });
}

function parseNameGenderFromOcr(ocrText){
  const t=String(ocrText);
  let name='', gender='';
  const collapsed=t.replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g,'$1$2');
  const m1=collapsed.match(/(?:坤造|乾造)([\u4e00-\u9fff]{2,4})/);
  if(m1)name=m1[1].replace(/[命盘细]+$/,'').slice(0,4);
  if(/坤造/.test(t))gender='female';
  else if(/乾造/.test(t))gender='male';
  return {name,gender};
}

// OCR：文本解析（deepseek-chat 支持，可靠）
function buildOcrPromptFromText(ocrText, knownZhi, knownGansHint){
  const ganRow=extractRowSnippet(ocrText,/天\s*干/);
  const zhiRow=extractRowSnippet(ocrText,/地\s*支|坚\s*支/);
  const cangRow=extractRowSnippet(ocrText,/藏\s*干/);
  const shiRow=extractRowSnippet(ocrText,/主\s*星/);
  const inferred=resolveGans(ocrText, knownZhi, knownGansHint);
  const cangGans=extractGansFromCangGanText(ocrText);
  const ganHint=(Array.isArray(knownGansHint)&&knownGansHint.length===4)?knownGansHint:(inferred||cangGans);

  const zhiHint = (Array.isArray(knownZhi) && knownZhi.length === 4)
    ? `\n【重要约束】四柱地支已确定为：${knownZhi.join('、')}（年支、月支、日支、时支）。你必须使用这四个地支，只需推断对应天干。\n`
    : '';
  const ganHintBlock = ganHint?.length === 4
    ? `\n【天干推断参考】主星十神/藏干推断天干为：${ganHint.join('、')}。正确示例：丑卯申未 → 辛丑 辛卯 壬申 丁未（非己丑 丁卯 己卯 辛未）。辛↔己、壬↔丁/王 是常见 OCR 混淆。\n`
    : '';
  const rowsBlock = [ganRow&&`天干行 OCR：${ganRow}`, zhiRow&&`地支行 OCR：${zhiRow}`, cangRow&&`藏干 OCR：${cangRow}`, shiRow&&`主星 OCR：${shiRow}`].filter(Boolean).join('\n');

  return {
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: `以下是从八字排盘 App（问真/小巫等）截图 OCR 出来的文字。汉字之间可能有空格，有错字。
${zhiHint}${ganHintBlock}
${rowsBlock ? rowsBlock + '\n' : ''}
${String(ocrText).slice(0, 5000)}

请提取姓名、性别、四柱八字，返回纯 JSON，不要 markdown：
{"name":"","gender":"male或female","baziString":"辛丑 辛卯 壬申 丁未","pillars":[{"gan":"辛","zhi":"丑"},{"gan":"辛","zhi":"卯"},{"gan":"壬","zhi":"申"},{"gan":"丁","zhi":"未"}]}

规则：
1. 坤造=女(female)，乾造=男(male)；姓名在「乾造/坤造」后面
2. 排盘表格有「天干」「地支」「藏干」「主星」行：地支行通常更准；主星十神可反推天干（如正印+正印+日元+正财且日主壬 → 辛辛壬丁）
3. 常见 OCR 误识：辛↔己、壬↔丁/王、申↔卯、丑↔习、未↔术
4. 只取命局四柱，不要大运流年
5. 若上方已给定地支，输出 pillars 的地支必须与之一致
6. 只输出 JSON` }],
    temperature: 0.1,
    max_tokens: 400,
  };
}

// OCR：图片解析（部分账号/模型可能不支持，作备选）
function buildOcrPromptFromImage(imageBase64){
  const prompt = `这是一张八字排盘 App 的截图（可能是小巫排盘、问真八字等）。
请仔细读取图中的四柱八字、姓名、性别，返回纯 JSON，不要 markdown：

{
  "name": "姓名或空字符串",
  "gender": "male 或 female",
  "baziString": "年柱 月柱 日柱 时柱，空格分隔，如：乙亥 乙酉 丁卯 丁未",
  "pillars": [
    {"gan":"乙","zhi":"亥"},
    {"gan":"乙","zhi":"酉"},
    {"gan":"丁","zhi":"卯"},
    {"gan":"丁","zhi":"未"}
  ]
}

规则：
1. 坤造=女(female)，乾造=男(male)
2. 必须恰好4柱，每柱1天干+1地支，天干只能是甲乙丙丁戊己庚辛壬癸，地支只能是子丑寅卯辰巳午未申酉戌亥
3. 优先读排盘表格中的四柱，不要读大运流年
4. 只输出 JSON，无其他文字`;

  return {
    model: 'deepseek-v4-flash',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageBase64 } },
      ],
    }],
    temperature: 0.1,
    max_tokens: 400,
  };
}

async function callDeepSeek(env, body){
  const aiRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.DEEPSEEK_API_KEY },
    body: JSON.stringify(body),
  });
  if (!aiRes.ok) {
    const errText = await aiRes.text();
    return { ok: false, status: aiRes.status, errText, content: '' };
  }
  const content = (await aiRes.json()).choices?.[0]?.message?.content || '';
  return { ok: true, content };
}

async function parseOcrWithDeepSeek(env, { ocrText, imageBase64, knownZhi, knownGansHint }){
  const G='甲乙丙丁戊己庚辛壬癸';
  let parsed = null;
  let rawContent = '';
  let source = '';

  const ocrStr = ocrText && String(ocrText).trim() ? String(ocrText) : '';
  const meta = ocrStr ? parseNameGenderFromOcr(ocrStr) : { name:'', gender:'' };

  // 地支锁定 + 主星十神可确定性反推天干时，直接返回（不依赖 AI）
  if (ocrStr && Array.isArray(knownZhi) && knownZhi.length === 4) {
    const inferred = resolveGans(ocrStr, knownZhi, knownGansHint);
    if (inferred && inferred.every(g => G.includes(g))) {
      const pillars = knownZhi.map((zhi, i) => ({ gan: inferred[i], zhi }));
      return {
        parsed: { name: meta.name, gender: meta.gender, baziString: pillars.map(p => p.gan + p.zhi).join(' ') },
        pillars,
        rawContent: '',
        source: 'stemRow',
      };
    }
  }

  if (ocrStr) {
    const r = await callDeepSeek(env, buildOcrPromptFromText(ocrStr, knownZhi, knownGansHint));
    if (r.ok) {
      rawContent = r.content;
      parsed = parseOcrJson(rawContent);
      source = 'text';
    }
  }

  let aiGans = null;
  let pillars = normalizeOcrPillars(parsed, tryExtractBazi(rawContent));
  if (pillars) aiGans = pillars.map(p => p.gan);

  if (Array.isArray(knownZhi) && knownZhi.length === 4) {
    const refined = refineGansWithHints(ocrStr, aiGans, knownGansHint, knownZhi);
    if (refined && refined.every(g => G.includes(g))) {
      pillars = knownZhi.map((zhi, i) => ({ gan: refined[i], zhi }));
      source = source || 'refined';
    } else if (pillars) {
      pillars = knownZhi.map((zhi, i) => ({ gan: pillars[i]?.gan || '', zhi }));
      if (!pillars.every(p => p.gan && G.includes(p.gan))) pillars = null;
    }
  }

  if (!pillars && imageBase64) {
    const r = await callDeepSeek(env, buildOcrPromptFromImage(imageBase64));
    if (r.ok) {
      rawContent = r.content;
      parsed = parseOcrJson(rawContent);
      pillars = normalizeOcrPillars(parsed, tryExtractBazi(rawContent));
      source = 'vision';
      if (Array.isArray(knownZhi) && knownZhi.length === 4 && pillars) {
        const refined = refineGansWithHints(ocrStr, pillars.map(p => p.gan), knownGansHint, knownZhi);
        if (refined && refined.every(g => G.includes(g))) {
          pillars = knownZhi.map((zhi, i) => ({ gan: refined[i], zhi }));
        }
      }
    }
  }

  if (parsed && meta.name && !parsed.name) parsed.name = meta.name;
  if (parsed && meta.gender && !parsed.gender) parsed.gender = meta.gender;

  return { parsed, pillars, rawContent, source };
}

function parseOcrJson(rawContent){
  let parsed = null;
  try { parsed = JSON.parse(rawContent); } catch (e) {
    const jm = rawContent.match(/\{[\s\S]*\}/);
    if (jm) try { parsed = JSON.parse(jm[0]); } catch (e2) { parsed = null; }
  }
  return parsed;
}

function normalizeOcrPillars(parsed, fb){
  const G='甲乙丙丁戊己庚辛壬癸', Z='子丑寅卯辰巳午未申酉戌亥';
  const valid = (p) => p && p.gan && p.zhi && G.includes(p.gan) && Z.includes(p.zhi);

  if (Array.isArray(parsed?.pillars) && parsed.pillars.length === 4 && parsed.pillars.every(valid)) {
    return parsed.pillars.map(p => ({ gan: p.gan, zhi: p.zhi }));
  }

  const bazi = parsed?.baziString || fb;
  if (bazi) {
    const parts = bazi.trim().split(/\s+/);
    if (parts.length === 4 && parts.every(x => x.length === 2 && G.includes(x[0]) && Z.includes(x[1]))) {
      return parts.map(x => ({ gan: x.charAt(0), zhi: x.substring(1) }));
    }
  }
  return null;
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
        if(!input.imageBase64 && !input.ocrText){
          return new Response(JSON.stringify({error:'请提供 ocrText 或 imageBase64'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});
        }
        const { parsed, pillars, rawContent, source } = await parseOcrWithDeepSeek(env, {
          ocrText: input.ocrText || '',
          imageBase64: input.imageBase64 || '',
          knownZhi: input.knownZhi,
          knownGansHint: input.knownGansHint || input.knownGans,
        });
        if(pillars){
          const baziString=pillars.map(p=>p.gan+p.zhi).join(' ');
          return new Response(JSON.stringify({success:true,data:{
            name:parsed?.name||'',
            gender:parsed?.gender==='female'?'female':parsed?.gender==='male'?'male':'',
            baziString,
            pillars,
            source,
          }}),{headers:{...cors,'Content-Type':'application/json'}});
        }
        return new Response(JSON.stringify({success:false,data:{
          name:parsed?.name||'',
          gender:parsed?.gender||'',
          baziString:parsed?.baziString||tryExtractBazi(rawContent)||'',
          pillars:null,
          needsManualCheck:true,
          source,
          raw:rawContent.slice(0,500),
        }}),{headers:{...cors,'Content-Type':'application/json'}});
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
    if(request.method==='GET' && url.pathname==='/config/pricing'){
      return jsonResponse({success:true,data:pricingPayload()},200,cors);
    }
    if(request.method==='GET' && url.pathname==='/config/features'){
      return jsonResponse({success:true,data:featuresPayload(env)},200,cors);
    }

    if(request.method==='POST' && url.pathname==='/auth/wechat'){
      try {
        if(!env.DB)return jsonResponse({error:'数据库未配置'},503,cors);
        const {code}=await request.json();
        if(!code)return jsonResponse({error:'请提供 code'},400,cors);
        const data=await wechatLogin(env,code);
        return jsonResponse({success:true,data},200,cors);
      }catch(err){return jsonResponse({error:'微信登录失败:'+err.message},500,cors);}
    }

    if(request.method==='POST' && url.pathname==='/auth/dev-probe'){
      try {
        if(!env.DB)return jsonResponse({error:'数据库未配置'},503,cors);
        const {probeId}=await request.json();
        const data=await devProbeLogin(env,probeId);
        return jsonResponse({success:true,data},200,cors);
      }catch(err){return jsonResponse({error:'探路登录失败:'+err.message},500,cors);}
    }

    if(request.method==='POST' && url.pathname==='/paipan'){
      try {
        const input=await request.json();
        if(!input.year||!input.month||!input.day)return jsonResponse({error:'请提供完整出生日期'},400,cors);
        const result=computePaipan(input);
        return jsonResponse({success:true,data:result},200,cors);
      }catch(err){return jsonResponse({error:'排盘失败:'+err.message},400,cors);}
    }

    if(request.method==='GET' && url.pathname.startsWith('/report/')){
      try {
        const rid=url.pathname.split('/')[2];
        if(!rid)return jsonResponse({error:'请提供报告ID'},400,cors);
        const kv=await getKvReport(env,rid);
        if(!kv)return jsonResponse({error:'报告不存在'},404,cors);
        const isUnlocked=!!kv.isUnlocked;
        return jsonResponse({success:true,data:{
          reportId:rid,name:kv.name||'',gender:kv.gender||'',baziString:kv.baziString||'',
          content:getDisplayContent(kv.content||'',isUnlocked),
          fullContent:cleanReportContent(kv.content||''),
          isUnlocked,unlockType:kv.unlockType||null,...pricingPayload(),
        }},200,cors);
      }catch(err){return jsonResponse({error:'查询失败:'+err.message},500,cors);}
    }

    if(request.method==='POST' && url.pathname.match(/^\/report\/[^/]+\/unlock-free$/)){
      try {
        if(!isFreePeriodNow())return jsonResponse({error:'限时免费已结束，请支付解锁'},403,cors);
        const rid=url.pathname.split('/')[2];
        const kv=await getKvReport(env,rid);
        if(!kv)return jsonResponse({error:'报告不存在'},404,cors);
        await unlockReport(env,rid,'free_promo');
        return jsonResponse({success:true,data:{reportId:rid,isUnlocked:true,unlockType:'free_promo'}},200,cors);
      }catch(err){return jsonResponse({error:'解锁失败:'+err.message},500,cors);}
    }

    if(request.method==='POST' && url.pathname==='/orders/create'){
      try {
        const {reportId}=await request.json();
        if(!reportId)return jsonResponse({error:'请提供 reportId'},400,cors);
        const kv=await getKvReport(env,reportId);
        if(!kv)return jsonResponse({error:'报告不存在'},404,cors);
        if(kv.isUnlocked)return jsonResponse({success:true,data:{alreadyUnlocked:true,reportId}},200,cors);
        const p=parseAuth(request);
        const oid=genOrderId();
        const totalYuan=(PRICE_CENTS/100).toFixed(2);
        await saveOrderKv(env,{id:oid,reportId,userId:p?.id||null,amount:PRICE_CENTS,status:'pending',createdAt:Date.now()});
        if(env.DB){
          try{
            await env.DB.prepare('INSERT INTO orders(id,report_id,user_id,amount,status)VALUES(?,?,?,?,?)')
              .bind(oid,reportId,p?.id||null,PRICE_CENTS,'pending').run();
          }catch(e){}
        }
        let paymentMode='static_qr';
        let payUrl=null;
        if(alipayConfigured(env)){
          try{
            const ua=request.headers.get('User-Agent')||'';
            payUrl=await createOnlinePayUrl(env,{
              outTradeNo:oid,totalYuan,subject:'Fortell365职业探索报告',
              returnUrl:`https://fortell365.com/report/${reportId}?order=${oid}`,
              isMobile:isMobileUserAgent(ua),
            });
            paymentMode='alipay_online';
          }catch(e){
            console.error('alipay online pay failed',e.message);
          }
        }
        return jsonResponse({success:true,data:{
          orderId:oid,reportId,amount:PRICE_CENTS,priceYuan:totalYuan,
          alipayQrUrl:ALIPAY_QR_URL,status:'pending',paymentMode,payUrl,
          autoConfirm:paymentMode==='alipay_online',
        }},200,cors);
      }catch(err){return jsonResponse({error:'创建订单失败:'+err.message},500,cors);}
    }

    if(request.method==='POST' && url.pathname==='/payments/alipay/notify'){
      try {
        const raw=await request.text();
        const params=parseNotifyBody(raw);
        if(!(await verifyNotify(env,params)))return new Response('fail',{status:400});
        const tradeStatus=params.trade_status;
        if(tradeStatus!=='TRADE_SUCCESS'&&tradeStatus!=='TRADE_FINISHED')return new Response('success');
        const oid=params.out_trade_no;
        const order=await getOrderKv(env,oid);
        if(!order)return new Response('success');
        if(order.status==='paid')return new Response('success');
        await markOrderPaid(env,oid,order.reportId);
        return new Response('success');
      }catch(err){
        console.error('alipay notify error',err.message);
        return new Response('fail',{status:500});
      }
    }

    if(request.method==='POST' && url.pathname.match(/^\/orders\/[^/]+\/confirm-paid$/)){
      try {
        const oid=url.pathname.split('/')[2];
        const {reportId}=await request.json();
        if(!reportId)return jsonResponse({error:'请提供 reportId'},400,cors);
        const kv=await getKvReport(env,reportId);
        if(!kv)return jsonResponse({error:'报告不存在'},404,cors);
        await markOrderPaid(env,oid,reportId);
        return jsonResponse({success:true,data:{orderId:oid,reportId,isUnlocked:true,unlockType:'paid'}},200,cors);
      }catch(err){return jsonResponse({error:'确认支付失败:'+err.message},500,cors);}
    }

    if(request.method==='GET' && url.pathname.startsWith('/orders/')){
      try {
        const oid=url.pathname.split('/')[2];
        if(!oid)return jsonResponse({error:'请提供订单ID'},400,cors);
        let order=await getOrderKv(env,oid);
        if(!order&&env.DB){
          order=await env.DB.prepare('SELECT id,report_id,status,amount,created_at,paid_at FROM orders WHERE id=?').bind(oid).first();
          if(order)order={id:order.id,reportId:order.report_id,status:order.status,amount:order.amount,createdAt:order.created_at,paidAt:order.paid_at};
        }
        if(!order)return jsonResponse({error:'订单不存在'},404,cors);
        const kv=await getKvReport(env,order.reportId);
        return jsonResponse({success:true,data:{
          orderId:order.id,reportId:order.reportId,status:order.status,amount:order.amount,
          isUnlocked:!!(kv&&kv.isUnlocked),
        }},200,cors);
      }catch(err){return jsonResponse({error:'查询失败:'+err.message},500,cors);}
    }

    if(request.method==='POST' && url.pathname.match(/^\/reports\/[^/]+\/claim$/)){
      try {
        const p=parseAuth(request);if(!p)return authError(cors);
        const rid=url.pathname.split('/')[2];
        const kv=await getKvReport(env,rid);
        if(!kv)return jsonResponse({error:'报告不存在'},404,cors);
        const existing=await env.DB.prepare('SELECT id FROM reports WHERE id=? AND user_id=?').bind(rid,p.id).first();
        if(!existing){
          await env.DB.prepare('INSERT OR REPLACE INTO reports(id,user_id,name,gender,bazi_string,content,is_unlocked,unlock_type,order_id)VALUES(?,?,?,?,?,?,?,?,?)')
            .bind(rid,p.id,kv.name||'',kv.gender||'',kv.baziString||'',kv.content||'',kv.isUnlocked?1:0,kv.unlockType||null,kv.orderId||null).run();
        }
        return jsonResponse({success:true,data:{reportId:rid}},200,cors);
      }catch(err){return jsonResponse({error:'绑定失败:'+err.message},500,cors);}
    }

    if(request.method==='GET' && url.pathname==='/reports'){
      try {
        const p=parseAuth(request);if(!p)return authError(cors);
        const {results}=await env.DB.prepare('SELECT id,name,gender,bazi_string,is_unlocked,unlock_type,created_at FROM reports WHERE user_id=? ORDER BY created_at DESC LIMIT 50').bind(p.id).all();
        return jsonResponse({success:true,data:results},200,cors);
      }catch(err){return jsonResponse({error:'查询失败:'+err.message},500,cors);}
    }
    if(request.method==='POST' && url.pathname==='/reports'){
      try {
        const p=parseAuth(request);if(!p)return authError(cors);
        const {reportId,name,gender,baziString,content,isUnlocked,unlockType,orderId}=await request.json();
        if(!reportId||!content)return jsonResponse({error:'请提供完整报告数据'},400,cors);
        await env.DB.prepare('INSERT OR REPLACE INTO reports(id,user_id,name,gender,bazi_string,content,is_unlocked,unlock_type,order_id)VALUES(?,?,?,?,?,?,?,?,?)')
          .bind(reportId,p.id,name,gender,baziString,content,isUnlocked?1:0,unlockType||null,orderId||null).run();
        return jsonResponse({success:true,data:{reportId}},200,cors);
      }catch(err){return jsonResponse({error:'保存失败:'+err.message},500,cors);}
    }
    if(request.method==='GET' && url.pathname.startsWith('/reports/')){
      try {
        const rid=url.pathname.split('/')[2];
        if(!rid||rid==='claim')return jsonResponse({error:'请提供报告ID'},400,cors);
        const p=parseAuth(request);if(!p)return authError(cors);
        const report=await env.DB.prepare('SELECT * FROM reports WHERE id=? AND user_id=?').bind(rid,p.id).first();
        if(!report)return jsonResponse({error:'报告不存在'},404,cors);
        const isUnlocked=!!report.is_unlocked;
        return jsonResponse({success:true,data:{
          reportId:report.id,name:report.name,gender:report.gender,baziString:report.bazi_string,
          content:getDisplayContent(report.content,isUnlocked),
          fullContent:cleanReportContent(report.content),
          isUnlocked,unlockType:report.unlock_type,...pricingPayload(),
        }},200,cors);
      }catch(err){return jsonResponse({error:'查询失败:'+err.message},500,cors);}
    }

    // Generate
    if(request.method==='POST' && (url.pathname==='/generate' || url.pathname==='/')){
      try {
        const input=await request.json();
        if(!input.baziString)return jsonResponse({error:'请提供baziString'},400,cors);
        const pillars=parseBazi(input.baziString);
        if(pillars.length!==4)return jsonResponse({error:'八字需4柱'},400,cors);
        const prompt=buildPrompt(pillars,input.name||'用户',input.gender||'male');
        const aiRes=await fetch('https://api.deepseek.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+env.DEEPSEEK_API_KEY},body:JSON.stringify({model:'deepseek-chat',messages:[{role:'user',content:prompt}],temperature:0.3,max_tokens:12000})});
        if(!aiRes.ok){const e=await aiRes.text();return jsonResponse({error:'AI失败:'+aiRes.status},500,cors);}
        const rawContent=(await aiRes.json()).choices?.[0]?.message?.content||'';
        const content=cleanReportContent(rawContent);
        const rid=genId();
        await saveKvReport(env,{id:rid,content,name:input.name,createdAt:Date.now(),gender:input.gender,baziString:input.baziString,isUnlocked:false,unlockType:null});
        const authUser=parseAuth(request);
        if(authUser&&env.DB){
          try{
            await env.DB.prepare('INSERT OR REPLACE INTO reports(id,user_id,name,gender,bazi_string,content,is_unlocked,unlock_type)VALUES(?,?,?,?,?,?,?,?)')
              .bind(rid,authUser.id,input.name||'',input.gender||'',input.baziString,content,0,null).run();
          }catch(e){}
        }
        const preview=getDisplayContent(content,false);
        return jsonResponse({success:true,data:{
          reportId:rid,
          fullContent:cleanReportContent(content),
          previewContent:preview,
          baziString:pillars.map(p=>p.gan+p.zhi).join(' '),
          dayGan:pillars[2].gan,
          dayWuxing:GAN_WUXING[pillars[2].gan],
          isUnlocked:false,
        }},200,cors);
      }catch(err){return jsonResponse({error:err.message},500,cors);}
    }
    return jsonResponse({status:'ok',version:'3.6',features:featuresPayload(env)},200,cors);
  }
};

function parseAuth(request){
  const token=(request.headers.get('Authorization')||'').replace('Bearer ','');
  try{const p=JSON.parse(atob(token));if(p.id&&p.exp>Date.now())return p;}catch(e){}
  return null;
}
function authError(cors){return new Response(JSON.stringify({error:'请先登录'}),{status:401,headers:{...cors,'Content-Type':'application/json'}});}

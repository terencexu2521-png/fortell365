// Cloudflare Worker: 八字职业解读 API
// Deployed via Cloudflare API

const GAN_WUXING = { '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水' };
const GAN_SEQ = { '甲':1,'乙':2,'丙':3,'丁':4,'戊':5,'己':6,'庚':7,'辛':8,'壬':9,'癸':10 };
const ZHI_CANGGAN = { '子':['癸'],'丑':['己','癸','辛'],'寅':['甲','丙','戊'],'卯':['乙'],'辰':['戊','乙','癸'],'巳':['丙','戊','庚'],'午':['丁','己'],'未':['己','丁','乙'],'申':['庚','壬','戊'],'酉':['辛'],'戌':['戊','辛','丁'],'亥':['壬','甲'] };
const NAYIN={甲子:'海中金',乙丑:'海中金',丙寅:'炉中火',丁卯:'炉中火',戊辰:'大林木',己巳:'大林木',庚午:'路旁土',辛未:'路旁土',壬申:'剑锋金',癸酉:'剑锋金',甲戌:'山头火',乙亥:'山头火',丙子:'涧下水',丁丑:'涧下水',戊寅:'城头土',己卯:'城头土',庚辰:'白蜡金',辛巳:'白蜡金',壬午:'杨柳木',癸未:'杨柳木',甲申:'泉中水',乙酉:'泉中水',丙戌:'屋上土',丁亥:'屋上土',戊子:'霹雳火',己丑:'霹雳火',庚寅:'松柏木',辛卯:'松柏木',壬辰:'长流水',癸巳:'长流水',甲午:'沙中金',乙未:'沙中金',丙申:'山下火',丁酉:'山下火',戊戌:'平地木',己亥:'平地木',庚子:'壁上土',辛丑:'壁上土',壬寅:'金箔金',癸卯:'金箔金',甲辰:'覆灯火',乙巳:'覆灯火',丙午:'天河水',丁未:'天河水',戊申:'大驿土',己酉:'大驿土',庚戌:'钗钏金',辛亥:'钗钏金',壬子:'桑柘木',癸丑:'桑柘木',甲寅:'大溪水',乙卯:'大溪水',丙辰:'沙中土',丁巳:'沙中土',戊午:'天上火',己未:'天上火',庚申:'石榴木',辛酉:'石榴木',壬戌:'大海水',癸亥:'大海水'};

const sW={木:'水',火:'木',土:'火',金:'土',水:'金'};
const wS={木:'火',火:'土',土:'金',金:'水',水:'木'};
const kW={木:'金',火:'水',土:'木',金:'火',水:'土'};
const wK={木:'土',火:'金',土:'水',金:'木',水:'火'};

function getShiShen(dg,og){if(dg===og)return'日主';const dw=GAN_WUXING[dg],ow=GAN_WUXING[og],ds=GAN_SEQ[dg],os=GAN_SEQ[og],s=(ds%2)===(os%2);if(dw===ow)return s?'比肩':'劫财';if(ow===sW[dw])return s?'偏印':'正印';if(ow===wS[dw])return s?'食神':'伤官';if(ow===kW[dw])return s?'七杀':'正官';if(ow===wK[dw])return s?'偏财':'正财';return'?';}
function countWuxing(ps){const c={金:0,木:0,水:0,火:0,土:0};const ZW={子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};for(const p of ps){c[GAN_WUXING[p.gan]]+=1;c[ZW[p.zhi]]+=1;for(const g of(ZHI_CANGGAN[p.zhi]||[]))c[GAN_WUXING[g]]+=0.5;}return c;}
function getDizhiRelations(zhi){const r=[],lh={子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'},lc={子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'},ps=[{a:0,b:1,l:'年月'},{a:0,b:2,l:'年日'},{a:0,b:3,l:'年时'},{a:1,b:2,l:'月日'},{a:1,b:3,l:'月时'},{a:2,b:3,l:'日时'}];for(const p of ps){if(lh[zhi[p.a]]===zhi[p.b])r.push('✅'+p.l+'六合');if(lc[zhi[p.a]]===zhi[p.b])r.push('⚡'+p.l+'相冲');}return r.join('  ')||'无明显冲合';}

function genId(){return'rpt_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);}

function buildSysPrompt(){return`你是资深八字命理分析师，精通《渊海子平》《三命通会》《子平真诠》等经典，擅长将命理符号翻译成现代职业和学业建议。根据八字四柱信息生成「专业选择+职业规划」结构化报告。

## 输出结构

### 🔓 免费层（只输出以下四个模块）

#### ## 一、命盘速览
- 表格：年/月/日/时柱（天干、地支、十神、纳音）
- 日主一句话定性（比喻），如「癸水如清晨露珠——细腻敏感」

#### ## 二、性格DNA
- 日主五行→性格底色（2-3句具体描述）
- 最强十神→行为模式+天赋倾向
- 用「你可能…」「大概率…」推测语气

#### ## 三、人生过往回顾
- 从出生年起，用大运阶段反推已走过的人生阶段
- 纯按大运五行推导，不给具体年份（用户会自己对号入座）
- 标注忌神大运（压力期）、用神大运（顺遂期）
- 用「大概在…」「你回忆下…是不是…」引导语气

#### ## 四、先天优势&潜在短板
- 最强五行=天赋领域，最弱五行=需补足
- 十神组合说明优势具体表现

## 输出风格
1. 术语+白话混合
2. 具体不模糊
3. 有温度不讨好
4. 每个模块结尾自然引出职业意味
5. 全部中文，Markdown格式
6. ⚠️ 只输出模块一至四，不要输出付费层内容`;}

function buildUsrPrompt(ps,name,gender,wxCount,shishen,dizhiRels){const labels=['年柱','月柱','日柱','时柱'],dg=ps[2].gan,dw=GAN_WUXING[dg],gl=gender==='male'?'男':'女';let t='';for(let i=0;i<4;i++){const p=ps[i],n=NAYIN[p.gan+p.zhi]||'未知';t+=`| ${labels[i]} | ${p.gan} | ${p.zhi} | ${shishen[i]||'日主'} | ${n} |\\n`;}return`请为以下用户生成八字专业职业解读报告：

## 用户信息
- 称呼：${name} | 性别：${gl}

## 八字四柱
| 柱位 | 天干 | 地支 | 天干十神 | 纳音 |
|------|------|------|---------|------|
${t}**日主：${dg}${dw}**

## 五行分布
金:${(wxCount['金']||0).toFixed(1)} | 木:${(wxCount['木']||0).toFixed(1)} | 水:${(wxCount['水']||0).toFixed(1)} | 火:${(wxCount['火']||0).toFixed(1)} | 土:${(wxCount['土']||0).toFixed(1)}

## 地支关系：${dizhiRels}

要求：性别${gl}，重点在专业选择+职业规划，只输出模块一至四，具体不模糊。`;}

function parsePillars(input){if(input.pillars)return['year','month','day','hour'].map(k=>input.pillars[k]);if(input.baziString)return input.baziString.trim().split(/\\s+/).map(p=>({gan:p[0],zhi:p.slice(1)}));return[];}

export default {
  async fetch(request, env) {
    const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
    if(request.method==='OPTIONS')return new Response(null,{headers:cors});
    
    const url=new URL(request.url);
    
    try {
      // POST /generate
      if(url.pathname==='/generate'&&request.method==='POST'){
        const input=await request.json();
        const pillars=parsePillars(input);
        if(pillars.length!==4)return new Response(JSON.stringify({error:'请提供完整的八字四柱'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});
        
        const dg=pillars[2].gan,wx=countWuxing(pillars),zhi=pillars.map(p=>p.zhi);
        const gs=pillars.map(p=>p.gan===dg?'日主':getShiShen(dg,p.gan));
        const dr=getDizhiRelations(zhi),bs=pillars.map(p=>p.gan+p.zhi).join(' ');
        
        const aiRes=await fetch('https://api.deepseek.com/v1/chat/completions',{
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':`Bearer ${env.DEEPSEEK_API_KEY}`},
          body:JSON.stringify({model:'deepseek-chat',messages:[{role:'system',content:buildSysPrompt()},{role:'user',content:buildUsrPrompt(pillars,input.name,input.gender,wx,gs,dr)}],temperature:0.7,max_tokens:8000})
        });
        
        if(!aiRes.ok){const e=await aiRes.text();return new Response(JSON.stringify({error:`AI生成失败 (${aiRes.status})`}),{status:500,headers:{...cors,'Content-Type':'application/json'}});}
        
        const aiData=await aiRes.json();
        const fc=aiData.choices?.[0]?.message?.content||'';
        const parts=fc.split(/---\\s*\\n\\s*⚠️.*解锁.*\\n\\s*---/);
        const freeContent=parts[0]?.trim()||fc;
        const paidContent=parts.length>1?parts.slice(1).join('\\n').trim():'';
        const rid=genId();
        
        const reportData={id:rid,fortuneType:'bazi',freeContent,paidContent:paidContent||null,isPaid:false,price:3990,baziString:bs,dayGan:dg,dayWuxing:GAN_WUXING[dg],gender:input.gender,createdAt:Date.now()};
        await env.BAZI_KV.put(`report:${rid}`,JSON.stringify(reportData));
        
        return new Response(JSON.stringify({success:true,data:{reportId:rid,freeContent,paidContent:paidContent||null,reportData:{pillars,baziString:bs,dayGan:dg,dayWuxing:GAN_WUXING[dg],wuxingCount:wx,ganShishen:gs,dizhiRels:dr}}}),{headers:{...cors,'Content-Type':'application/json'}});
      }
      
      return new Response(JSON.stringify({error:'Not Found'}),{status:404,headers:{...cors,'Content-Type':'application/json'}});
    }catch(err){return new Response(JSON.stringify({error:`服务器错误: ${err.message}`}),{status:500,headers:{...cors,'Content-Type':'application/json'}});}
  }
};

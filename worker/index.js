// Cloudflare Worker: 八字职业解读 API

const GAN_WUXING={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
const GAN_SEQ={甲:1,乙:2,丙:3,丁:4,戊:5,己:6,庚:7,辛:8,壬:9,癸:10};
const ZHI_CANGGAN={
  子:['癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],
  辰:['戊','乙','癸'],巳:['丙','戊','庚'],午:['丁','己'],未:['己','丁','乙'],
  申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']
};
const NAYIN={'甲子':'海中金','乙丑':'海中金','丙寅':'炉中火','丁卯':'炉中火','戊辰':'大林木','己巳':'大林木','庚午':'路旁土','辛未':'路旁土','壬申':'剑锋金','癸酉':'剑锋金','甲戌':'山头火','乙亥':'山头火','丙子':'涧下水','丁丑':'涧下水','戊寅':'城头土','己卯':'城头土','庚辰':'白蜡金','辛巳':'白蜡金','壬午':'杨柳木','癸未':'杨柳木','甲申':'泉中水','乙酉':'泉中水','丙戌':'屋上土','丁亥':'屋上土','戊子':'霹雳火','己丑':'霹雳火','庚寅':'松柏木','辛卯':'松柏木','壬辰':'长流水','癸巳':'长流水','甲午':'沙中金','乙未':'沙中金','丙申':'山下火','丁酉':'山下火','戊戌':'平地木','己亥':'平地木','庚子':'壁上土','辛丑':'壁上土','壬寅':'金箔金','癸卯':'金箔金','甲辰':'覆灯火','乙巳':'覆灯火','丙午':'天河水','丁未':'天河水','戊申':'大驿土','己酉':'大驿土','庚戌':'钗钏金','辛亥':'钗钏金','壬子':'桑柘木','癸丑':'桑柘木','甲寅':'大溪水','乙卯':'大溪水','丙辰':'沙中土','丁巳':'沙中土','戊午':'天上火','己未':'天上火','庚申':'石榴木','辛酉':'石榴木','壬戌':'大海水','癸亥':'大海水'};

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

function genId(){return'rpt_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);}

function parseBazi(str){
  const parts=str.trim().split(/\s+/);
  return parts.map(p=>({gan:p.charAt(0),zhi:p.substring(1)}));
}

function buildPrompt(pillars,name,gender){
  const dg=pillars[2].gan,dw=GAN_WUXING[dg];
  const wx=countWuxing(pillars);
  const gs=pillars.map(p=>p.gan===dg?'日主':getShiShen(dg,p.gan));
  const labels=['年柱','月柱','日柱','时柱'];
  let t='';
  for(let i=0;i<4;i++){
    const p=pillars[i];
    t+=`| ${labels[i]} | ${p.gan} | ${p.zhi} | ${gs[i]} | ${NAYIN[p.gan+p.zhi]||'未知'} |\n`;
  }
  return `你是资深八字命理分析师。请为以下用户生成八字专业职业解读报告（只输出模块一至四）：

用户：${name}，${gender==='male'?'男':'女'}

## 八字四柱
| 柱位 | 天干 | 地支 | 十神 | 纳音 |
|------|------|------|------|------|
${t}
日主：${dg}${dw}
五行：金${(wx['金']||0).toFixed(1)} 木${(wx['木']||0).toFixed(1)} 水${(wx['水']||0).toFixed(1)} 火${(wx['火']||0).toFixed(1)} 土${(wx['土']||0).toFixed(1)}

## 输出格式
一、命盘速览（表格+日主比喻定性）
二、性格DNA（五行→性格+十神→天赋，用推测语气）
三、人生过往回顾（大运反推，引导语气）
四、先天优势与短板

风格：术语+白话混合，具体不模糊，Markdown格式，500-800字。只输出这四个模块。`;
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
        body:JSON.stringify({model:'deepseek-chat',messages:[{role:'user',content:prompt}],temperature:0.7,max_tokens:4000})
      });

      if(!aiRes.ok)return new Response(JSON.stringify({error:'AI生成失败:'+aiRes.status}),{status:500,headers:{...cors,'Content-Type':'application/json'}});

      const aiData=await aiRes.json();
      const content=aiData.choices?.[0]?.message?.content||'';
      const rid=genId();
      await env.BAZI_KV.put('report:'+rid,JSON.stringify({id:rid,content,name:input.name,createdAt:Date.now()}));

      return new Response(JSON.stringify({
        success:true,
        data:{
          reportId:rid,
          freeContent:content,
          paidContent:null,
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

import { extractZhisFromLabels, resolveGans, pillarsFromGansZhi } from '../src/lib/ocr.ts'

const xu = `乾 造 许 为 杰
主 星 正 F 正 F 日 元 正 财
地 支 " 丑 " 卯 " 申 " 未
藏 干 辛 金 乙 木 王 水 乙 木
天 干 提 示 : 丁 壬 可 合 木`

const zhang = `乾 造 张 煜
主 星 劫 财 正 财 日 元 正 官
天 干 乙 丁 用 E
地 支 " 丑 " 卯 " 寅 " 未
藏 干 辛 金 Z 木 丙 火 Z 木
天 干 提 示 : 甲 己 可 合 土`

const zhangLive = `< 时 间 局 :
余 乾 造 张 煜 20 划 ( 癸 未 ) 属 牛
命 盘 细 盘
日 期 年 柱 月 柱 日 柱 时 柳
主 星 劫 财 正 财 日 元 正 官
天 干 乙 丁 用 E
地 支 " 丑 " 卯 " 寅 " 未
藏 干 辛 金 Z 木 丙 火 Z 木
天 干 提 示 : 甲 己 可 合 土`

const fanbo = `< 时 间 局 :
一 乾 造 樊 博 27 划 ( 庞 寅 ) 属 马
命 盘 细 盘
主 星 食 神 比 肩 日 元 偏 印
f " 戊 _ 丙 " 丙 " 申
z _ " 午 _ 辰 " 寅 " 午`

const tang = `坤 造 唐 琦
主 星 偏 印 偏 印 日 元 比 肩
乙 乙 丙 丁
地 支 亥 酉 卯 未
天 干 提 示 : 无 合 局 的 关 系`

function test(name: string, text: string, expect: string) {
  const zhi = extractZhisFromLabels(text)
  const gans = resolveGans(text, zhi)
  const bazi = zhi && gans ? pillarsFromGansZhi(gans, zhi) : null
  const got = bazi ? Object.values(bazi).map((p) => p.gan + p.zhi).join(' ') : 'FAIL'
  const ok = got === expect
  console.log(name, ok ? '✅' : '❌', got, ok ? '' : `(expected ${expect})`, '| zhi:', zhi?.join(''), '| gans:', gans?.join(''))
  if (!ok) process.exitCode = 1
}

test('许为杰', xu, '辛丑 辛卯 壬申 丁未')
test('张煜', zhang, '乙丑 己卯 甲寅 辛未')
test('张煜-live', zhangLive, '乙丑 己卯 甲寅 辛未')
const xuLive = `< 时 间 局 :
乾 造 许 为 杰 18 划 ( 辛 巳 ) 属 牛
农 历 : 一 雾 二 年 二 月 十 三 未 时
日 期 年 柱 月 柱 日 柱 时 柱
主 星 正 印 正 印 日 元 正 财
天 干 王
坂 " 丑 卯 未
藏 干 辛 金 乙 木 王 水 乙 木
天 干 提 示 : 丁 壬 可 合 木
---
主 星 正 F 正 F 日 元 正 财
魏 " 丑 " 卯 " 申 " 未`

const xuUserConsole = `日 期 年 柱 月 柱 日 柱 时 柱
主 星 正 印 正 印 日 元 正 财
地 文 办 ) 〖 十 未
己 土 庚 金 己 土
藏 干 年 金 心 木 王 水 心 木
癸 水 戈 土 丁 火
正 官 偏 印 正 官
副 星 正 印 仿 官 比 局 伤 自
---
主 星 正 印 正 印 日 元 正 财
大 干 E 华 士 于
坚 支 " 习 " 卯 " 申 " 术
己 土 庚 金 己 土
藏 干 平 金 心 木 王 水 人 木
癸 水 戈 土 丁 火
---
主 星 正 F 正 F 日 元 正 财
魏 " 丑 " 卯 " 申 " 未
己 土 庚 金 己 土
藏 干 年 金 心 木 王 水 乙 木
癸 水 戈 土 丁 火`

test('许为杰-stem-row', `主 星 正 印 正 印 日 元 正 财
辛 辛 壬 丁
魏 " 丑 " 卯 " 申 " 未`, '辛丑 辛卯 壬申 丁未')

test('许为杰-live', xuLive, '辛丑 辛卯 壬申 丁未')
test('许为杰-user-console', xuUserConsole, '辛丑 辛卯 壬申 丁未')
test('樊博', fanbo, '戊午 丙辰 丙寅 甲午')
test('唐琦-日柱丙误识', tang, '乙亥 乙酉 丁卯 丁未')

const tangYuanMisread = `坤 造 唐 琦
主 星 偏 印 偏 印 偏 印 比 肩
乙 乙 丙 丁
地 支 亥 酉 卯 未`

test('唐琦-日元误识为偏印', tangYuanMisread, '乙亥 乙酉 丁卯 丁未')

const tangBrowser = `< 时 间 局
坤 造 唐 琦 22 划 ( 乙 酉 ) 属 猪
主 星 偏 印 偏 印 日 元 比 肩
天 干 心 乙
& 支 " 亥 卯 " 未
藏 干 才 水 辛 金 乙 木 乙 木
天 干 提 示 : 无 合 局 的 关 系
地 支 提 示 : 卯 酉 可 相 冲 , 亥 卯 未 可 合 木 局`

test('唐琦-browser', tangBrowser, '乙亥 乙酉 丁卯 丁未')

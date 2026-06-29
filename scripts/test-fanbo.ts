import { extractShiShenRow, extractZhisFromLabels, inferGansFromShiShenRow, pillarsFromGansZhi, extractGansFromLineAboveZhi, extractGansFromLabels } from '../src/lib/ocr.ts'

const fanbo = `< 时 间 局 :
一 乾 造 樊 博 27 划 ( 庞 寅 ) 属 马
命 盘 细 盘
日 期 年 柳 月 柱 日 柱 时 柱
主 星 食 神 比 肩 日 元 偏 印
f " 戊 _ 丙 " 丙 " 申
z _ " 午 _ 辰 " 寅 " 午
T 人 戊 士 甲 木 T 人
藏 干 目 王 Z 木 丙 火 自
癸 水 戊 土
食 神 偏 印
天 干 提 示 : 无 合 局 的 关 系
地 支 提 示 : 寅 午 可 半 合 火 局 , 午 午 可 自 刑`

const zhi = extractZhisFromLabels(fanbo)
console.log('zhi:', zhi)
const row = extractShiShenRow(fanbo)
console.log('row:', row)
const gans = inferGansFromShiShenRow(fanbo, zhi)
console.log('gans:', gans)
console.log('labelGans:', extractGansFromLabels(fanbo))
console.log('aboveZhi:', extractGansFromLineAboveZhi(fanbo))
const bazi = zhi && gans ? pillarsFromGansZhi(gans, zhi) : null
console.log('bazi:', bazi ? Object.values(bazi).map((p) => p.gan + p.zhi).join(' ') : 'FAIL')

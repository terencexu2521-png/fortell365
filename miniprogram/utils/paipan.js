const { Solar, Lunar } = require('../libs/lunar-javascript/lunar.js');

const PILLAR_NAMES = ['年柱', '月柱', '日柱', '时柱'];

function parsePillar(str) {
  const s = String(str || '').trim();
  return { gan: s.charAt(0), zhi: s.charAt(1), label: s };
}

function applyTrueSolarTime(y, m, d, h, min, longitude) {
  const lng = Number(longitude);
  const offsetMin = Math.round((lng - 120) * 4);
  let totalMin = h * 60 + min + offsetMin;
  let dayDelta = 0;
  while (totalMin < 0) {
    totalMin += 1440;
    dayDelta -= 1;
  }
  while (totalMin >= 1440) {
    totalMin -= 1440;
    dayDelta += 1;
  }
  const nh = Math.floor(totalMin / 60);
  const nmin = totalMin % 60;
  let solar = Solar.fromYmdHms(y, m, d, nh, nmin, 0);
  if (dayDelta !== 0) solar = solar.nextDay(dayDelta);
  return {
    year: solar.getYear(),
    month: solar.getMonth(),
    day: solar.getDay(),
    hour: solar.getHour(),
    minute: solar.getMinute(),
    offsetMin,
  };
}

function buildSolar(input) {
  const {
    calendarType = 'solar',
    year,
    month,
    day,
    hour = 0,
    minute = 0,
    isLeapMonth = false,
    longitude = 120,
  } = input;

  if (calendarType === 'lunar') {
    let lunarMonth = Number(month);
    if (isLeapMonth) lunarMonth = -Math.abs(lunarMonth);
    const lunar = Lunar.fromYmdHms(Number(year), lunarMonth, Number(day), Number(hour), Number(minute), 0);
    const solar = lunar.getSolar();
    const adjusted = applyTrueSolarTime(
      solar.getYear(),
      solar.getMonth(),
      solar.getDay(),
      Number(hour),
      Number(minute),
      longitude
    );
    return { solar: Solar.fromYmdHms(adjusted.year, adjusted.month, adjusted.day, adjusted.hour, adjusted.minute, 0), adjusted };
  }

  const adjusted = applyTrueSolarTime(Number(year), Number(month), Number(day), Number(hour), Number(minute), longitude);
  return { solar: Solar.fromYmdHms(adjusted.year, adjusted.month, adjusted.day, adjusted.hour, adjusted.minute, 0), adjusted };
}

function computePaipan(input) {
  const { solar, adjusted } = buildSolar(input);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  const pillarStrs = [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()];
  const pillars = pillarStrs.map((p, i) => ({ ...parsePillar(p), name: PILLAR_NAMES[i] }));
  const baziString = pillarStrs.join(' ');
  const offsetMin = adjusted.offsetMin;
  const sign = offsetMin >= 0 ? '+' : '';
  const solarTimeNote = `真太阳时校正 ${sign}${offsetMin} 分钟（经度 ${input.longitude ?? 120}°）`;

  return {
    pillars,
    baziString,
    solarTimeNote,
    adjustedDateTime: {
      year: adjusted.year,
      month: adjusted.month,
      day: adjusted.day,
      hour: adjusted.hour,
      minute: adjusted.minute,
    },
    solarDate: `${solar.getYear()}-${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')} ${String(solar.getHour()).padStart(2, '0')}:${String(solar.getMinute()).padStart(2, '0')}`,
    lunarDate: lunar.toString(),
    longitude: Number(input.longitude ?? 120),
    offsetMinutes: offsetMin,
  };
}

module.exports = { computePaipan };

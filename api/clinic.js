// /api/clinic?mode=baby                 → 전국 달빛어린이병원·소아전문센터 (하루 1번만 받아 저장)
// /api/clinic?mode=near&lat=&lon=       → 내 주변 병·의원 (오늘 진료시간)
// /api/clinic?mode=area&sido=&gu=&dept= → 지역·진료과별 병·의원 (요일별 진료시간)
// 이 API는 하루 호출 한도가 1,000번이라 결과를 오래 저장합니다.
import { call, callAll, clean, realTel, SIDO, sidoNames, getQuery } from './_lib.js';

export const DEPTS = { D001: '내과', D002: '소아청소년과', D013: '이비인후과', D022: '가정의학과', D005: '피부과', D008: '정형외과', D012: '안과', D011: '산부인과', D014: '비뇨의학과' };
function send(res, status, obj, sec) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', sec ? `public, s-maxage=${sec}, stale-while-revalidate=${sec * 4}` : 'no-store');
  res.end(JSON.stringify(obj));
}
const hours = x => Array.from({ length: 8 }, (_, i) => { const s = x[`DUTYTIME${i + 1}S`], c = x[`DUTYTIME${i + 1}C`]; return s && c ? `${s}-${c}` : ''; });
const row = x => ({ hpid: x.HPID, name: clean(x.DUTYNAME), addr: clean(x.DUTYADDR), tel: realTel(x.DUTYTEL1), kind: clean(x.DUTYDIVNAM || x.DUTYDIVNAME),
  lat: +(x.WGS84LAT || x.LATITUDE) || null, lon: +(x.WGS84LON || x.LONGITUDE) || null, h: hours(x), note: clean(x.DUTYETC || x.DUTYINF || '').slice(0, 120) });

export async function babyList() {
  const d = await callAll('baby', {}, 500, 2, 1);
  return d.items.map(row);
}

export default async function handler(req, res) {
  const q = getQuery(req); const mode = String(q.mode || '');
  try {
    if (mode === 'baby') return send(res, 200, { ok: true, items: await babyList() }, 86400);
    if (mode === 'near') {
      const lat = parseFloat(q.lat), lon = parseFloat(q.lon);
      if (!(lat >= 33 && lat <= 39 && lon >= 124 && lon <= 132)) return send(res, 400, { ok: false, error: '국내 위치가 아닙니다.' });
      // 약 1km 단위로 묶어서 저장 → 같은 동네 사람은 다시 부르지 않음
      const d = await call('hospNear', { WGS84_LAT: lat.toFixed(2), WGS84_LON: lon.toFixed(2), numOfRows: 100 });
      const items = d.items.map(x => ({ ...row(x), dist: parseFloat(x.DISTANCE), today: x.STARTTIME && x.ENDTIME ? `${x.STARTTIME}-${x.ENDTIME}` : '' }))
        .filter(x => Number.isFinite(x.dist)).sort((a, b) => a.dist - b.dist);
      return send(res, 200, { ok: true, items }, 3600);
    }
    if (mode === 'area') {
      const sido = String(q.sido || '').trim(), gu = String(q.gu || '').trim(), dept = String(q.dept || '');
      if (!SIDO.includes(sido)) return send(res, 400, { ok: false, error: '시·도를 정확히 골라 주세요.' });
      if (!gu) return send(res, 400, { ok: false, error: '시·군·구를 입력해 주세요.' });
      if (dept && !DEPTS[dept]) return send(res, 400, { ok: false, error: '진료과를 다시 골라 주세요.' });
      const items = [];
      for (const n of sidoNames(sido)) {
        const d = await callAll('hospList', { Q0: n, Q1: gu, ...(dept ? { QD: dept } : {}), ORD: 'NAME' }, 500, 2, 1).catch(() => ({ items: [] }));
        items.push(...d.items.map(row));
      }
      const seen = new Set();
      return send(res, 200, { ok: true, items: items.filter(x => !seen.has(x.hpid) && seen.add(x.hpid)) }, 21600);
    }
    send(res, 400, { ok: false, error: '알 수 없는 요청' });
  } catch (e) {
    const m = String(e.message || '');
    send(res, 502, { ok: false, error: /LIMITED/.test(m) ? '오늘 병원 정보 조회 한도를 넘었어요. 내일 다시 시도해 주세요. 급하면 119에 전화하세요.' : '병원 정보를 받아오지 못했어요. 잠시 후 다시 시도해 주세요.' });
  }
}

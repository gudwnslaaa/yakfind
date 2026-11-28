// /api/er?lat=&lon=  또는  /api/er?sido=&gu=  → 가까운 응급실 + 실시간 남은 병상
import { call, callAll, clean, realTel, SIDO, sidoNames, getQuery } from './_lib.js';

function send(res, status, obj, sec) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', sec ? `public, s-maxage=${sec}, stale-while-revalidate=60` : 'no-store');
  res.end(JSON.stringify(obj));
}
const num = v => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };
const sidoOf = addr => clean(addr).split(' ')[0] || '';

export default async function handler(req, res) {
  const q = getQuery(req);
  try {
    let hosp = [];
    if (q.lat && q.lon) {
      const lat = parseFloat(q.lat), lon = parseFloat(q.lon);
      if (!(lat >= 33 && lat <= 39 && lon >= 124 && lon <= 132)) return send(res, 400, { ok: false, error: '국내 위치가 아닙니다.' });
      const d = await call('erLoc', { WGS84_LAT: lat.toFixed(3), WGS84_LON: lon.toFixed(3), numOfRows: 100 });
      hosp = d.items.map(x => ({ hpid: x.HPID, name: clean(x.DUTYNAME), addr: clean(x.DUTYADDR), tel: realTel(x.DUTYTEL1), dist: parseFloat(x.DISTANCE), lat: +x.LATITUDE, lon: +x.LONGITUDE, kind: clean(x.DUTYDIVNAME) }))
        .filter(x => Number.isFinite(x.dist)).sort((a, b) => a.dist - b.dist).slice(0, 15);
    } else {
      const sido = String(q.sido || '').trim(), gu = String(q.gu || '').trim();
      if (!SIDO.includes(sido)) return send(res, 400, { ok: false, error: '시·도를 정확히 골라 주세요.' });
      const items = [];
      for (const n of sidoNames(sido)) { const d = await callAll('erList', { Q0: n, ...(gu ? { Q1: gu } : {}) }, 100, 3, 3).catch(() => ({ items: [] })); items.push(...d.items); }
      hosp = items.map(x => ({ hpid: x.HPID, name: clean(x.DUTYNAME), addr: clean(x.DUTYADDR), tel: realTel(x.DUTYTEL1), dist: null, lat: +x.WGS84LAT, lon: +x.WGS84LON, kind: clean(x.DUTYEMCLSNAME), erTel: realTel(x.DUTYTEL3) }));
    }
    // 실시간 병상: 관련 시·도별로 한 번씩
    const sidos = [...new Set(hosp.map(h => sidoOf(h.addr)).filter(Boolean))];
    const beds = new Map();
    await Promise.all(sidos.map(async s => {
      try { const b = await callAll('erBed', { STAGE1: s }, 100, 3, 3); for (const x of b.items) beds.set(x.HPID, x); } catch (e) { /* 병상 정보 없이 */ }
    }));
    const out = hosp.map(h => {
      const b = beds.get(h.hpid);
      return { ...h, erTel: (b && realTel(b.DUTYTEL3)) || h.erTel || '',
        bed: b ? { er: num(b.HVEC), base: num(b.HVS01), ambulance: b.HVAMYN === 'Y', ct: b.HVCTAYN === 'Y', updated: String(b.HVIDATE || '') } : null };
    });
    send(res, 200, { ok: true, items: out, at: new Date().toISOString() }, 60);
  } catch (e) {
    send(res, 502, { ok: false, error: '응급실 정보를 받아오지 못했어요. 급하면 119에 전화하세요.' });
  }
}

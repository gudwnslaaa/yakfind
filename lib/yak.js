// 약 찾기 — 공공데이터 중계 함수 (Vercel Serverless Function)
// 인증키는 Vercel 환경변수 DATA_GO_KR_KEY 에만 둡니다. (GitHub에 올리지 마세요)
//
// /api/yak?action=drug&q=제품명      식약처 의약품 제품 허가정보
// /api/yak?action=ingr&q=성분명      같은 성분 제품
// /api/yak?action=easy&seq=품목코드   식약처 e약은요
// /api/yak?action=near&lat=&lon=     국립중앙의료원 약국 위치정보
// /api/yak?action=area&sido=&gu=&qt= 국립중앙의료원 약국 목록

const UPSTREAM = process.env.UPSTREAM || 'https://apis.data.go.kr';
const ROUTES = {
  drug: '/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnInq08',
  ingr: '/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnInq08',
  easy: '/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList',
  symptom: '/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList',
  near: '/B552657/ErmctInsttInfoInqireService/getParmacyLcinfoInqire',
  area: '/B552657/ErmctInsttInfoInqireService/getParmacyListInfoInqire',
  barcode: '/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnDtlInq08',
};

function send(res, status, obj, cacheSec = 0) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Vercel CDN 캐시 — 같은 검색은 공공 API를 다시 부르지 않음 (호출 한도 절약)
  res.setHeader('Cache-Control', cacheSec ? `public, s-maxage=${cacheSec}, stale-while-revalidate=600` : 'no-store');
  res.end(JSON.stringify(obj));
}
const arg = (q, k, max = 60) => String(q[k] ?? '').trim().slice(0, max);

function keyHint(m) {
  if (m.includes('NOT_REGISTERED')) return `인증키가 아직 등록되지 않았어요. 활용신청 직후라면 1~2시간 뒤 다시 해 보세요. (${m})`;
  if (m.includes('LIMITED')) return `오늘 호출 한도를 넘었어요. (${m})`;
  if (m.includes('ACCESS_DENIED') || m.includes('PERMISSION')) return `이 API의 활용신청이 안 되어 있어요. (${m})`;
  return m;
}

// 공공 API XML은 구조가 단순해서 작은 해석기로 충분합니다
const unxml = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`)); return m ? unxml(m[1]).trim() : ''; };
function parseXml(xml) {
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const row = {};
    for (const f of m[1].matchAll(/<([A-Za-z0-9_]+)\s*\/>|<([A-Za-z0-9_]+)>([\s\S]*?)<\/\2>/g)) {
      if (f[1]) row[f[1].toUpperCase()] = '';
      else row[f[2].toUpperCase()] = unxml(f[3]).trim();
    }
    items.push(row);
  }
  return {
    gateway: tag(xml, 'returnAuthMsg') || (xml.includes('<cmmMsgHeader>') ? tag(xml, 'errMsg') || '오류' : ''),
    code: tag(xml, 'resultCode'), msg: tag(xml, 'resultMsg') || tag(xml, 'resultMag'),
    total: parseInt(tag(xml, 'totalCount'), 10) || items.length, items,
  };
}
function parseJson(j) {
  const root = j.response || j;
  const h = root.header || {}; const b = root.body || {};
  let items = b.items ?? [];
  if (items && !Array.isArray(items) && items.item) items = items.item;
  if (items && !Array.isArray(items)) items = [items];
  items = (items || []).filter(x => x && typeof x === 'object').map(x => (x.item && typeof x.item === 'object' ? x.item : x)).map(x => {
    const r = {}; for (const [k, v] of Object.entries(x)) r[k.toUpperCase()] = v == null || typeof v === 'object' ? '' : String(v); return r;
  });
  return { gateway: '', code: String(h.resultCode ?? '00'), msg: h.resultMsg || '', total: Number(b.totalCount) || items.length, items };
}

export default async function handler(req, res) {
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const action = arg(q, 'action', 10);
  const KEY = process.env.DATA_GO_KR_KEY;
  if (!ROUTES[action]) return send(res, 400, { ok: false, error: '알 수 없는 요청' });
  if (!KEY) return send(res, 500, { ok: false, error: 'Vercel 환경변수 DATA_GO_KR_KEY에 공공데이터포털 인증키를 넣어 주세요.' });

  const p = { serviceKey: KEY, pageNo: 1 };
  let ttl = 43200;
  if (action === 'drug' || action === 'ingr') {
    const s = arg(q, 'q');
    if (s.length < 2) return send(res, 400, { ok: false, error: '두 글자 이상 입력해 주세요.' });
    Object.assign(p, action === 'drug' ? { item_name: s, numOfRows: 40 } : { item_ingr_name: s, numOfRows: 100 }, { type: 'json' });
  } else if (action === 'symptom') {
    const s = arg(q, 'q', 20);
    if (s.length < 2) return send(res, 400, { ok: false, error: '증상을 두 글자 이상 입력해 주세요.' });
    Object.assign(p, { efcyQesitm: s, numOfRows: 100, type: 'json' });
  } else if (action === 'easy') {
    const seq = arg(q, 'seq', 20).replace(/\D/g, '');
    if (!seq) return send(res, 400, { ok: false, error: '품목코드가 없습니다.' });
    Object.assign(p, { itemSeq: seq, numOfRows: 1, type: 'json' });
  } else if (action === 'barcode') {
    // 약 상자 바코드(880으로 시작하는 13자리) → 품목 하나
    const code = arg(q, 'code', 20).replace(/\D/g, '');
    if (!/^880\d{10}$/.test(code)) return send(res, 400, { ok: false, error: '국내 의약품 바코드(880으로 시작하는 13자리)가 아니에요.' });
    Object.assign(p, { bar_code: code, numOfRows: 3, type: 'json' });
    ttl = 604800;
  } else if (action === 'near') {
    const lat = parseFloat(arg(q, 'lat', 20)), lon = parseFloat(arg(q, 'lon', 20));
    if (!(lat >= 33 && lat <= 39 && lon >= 124 && lon <= 132)) return send(res, 400, { ok: false, error: '국내 위치가 아닙니다.' });
    Object.assign(p, { WGS84_LAT: lat.toFixed(3), WGS84_LON: lon.toFixed(3), numOfRows: 40 });
    ttl = 3600;
  } else {
    const sido = arg(q, 'sido', 20); const qt = parseInt(arg(q, 'qt', 1), 10);
    if (!sido) return send(res, 400, { ok: false, error: '시·도를 입력해 주세요.' });
    Object.assign(p, { Q0: sido, Q1: arg(q, 'gu', 20), numOfRows: 200, ORD: 'NAME' });
    if (qt >= 1 && qt <= 8) p.QT = qt;
    ttl = 3600;
  }

  const call = async params => {
    const r = await fetch(UPSTREAM + ROUTES[action] + '?' + new URLSearchParams(params), { signal: AbortSignal.timeout(12000) });
    const text = await r.text();
    let d;
    try { d = parseJson(JSON.parse(text)); } catch { d = parseXml(text); }
    return d;
  };

  let d;
  try {
    d = await call(p);
    // 2026.7 전남광주통합특별시 출범: 자료에 옛 이름(광주광역시·전라남도)이 섞여 있어 함께 조회
    const MERGED = ['전남광주통합특별시', '광주광역시', '전라남도'];
    if (action === 'area' && MERGED.includes(p.Q0) && !d.gateway) {
      const more = await Promise.all(MERGED.filter(n => n !== p.Q0).map(n => call({ ...p, Q0: n }).catch(() => null)));
      const seen = new Set(d.items.map(x => x.HPID));
      for (const m of more) if (m && m.items) for (const x of m.items) if (!seen.has(x.HPID)) { seen.add(x.HPID); d.items.push(x); }
      d.total = d.items.length;
    }
    // 성분 검색은 결과가 많아서(아세트아미노펜 1천 건 이상) 최대 5쪽(500건)까지 이어서 받음
    if (action === 'ingr' && !d.gateway && d.total > d.items.length) {
      const pages = Math.min(5, Math.ceil(d.total / 100));
      const more = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => call({ ...p, pageNo: i + 2 }).catch(() => null)));
      for (const m of more) if (m && m.items) d.items.push(...m.items);
    }
  } catch (e) {
    return send(res, 502, { ok: false, error: '공공데이터 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' });
  }
  if (d.gateway) return send(res, 502, { ok: false, error: keyHint(d.gateway) });
  if (d.code && d.code !== '00' && d.code !== '0') return send(res, 502, { ok: false, error: keyHint(d.msg || '오류 ' + d.code) });
  if (action === 'barcode') { // 상세정보는 문서가 길어서 필요한 것만, 바코드가 정확히 맞는 것만
    const code = p.bar_code;
    const hit = d.items.filter(x => String(x.BAR_CODE || '').split(/[,\s]+/).includes(code));
    const items = (hit.length ? hit : d.items.slice(0, d.total === 1 ? 1 : 0)).map(x => ({ ITEM_SEQ: x.ITEM_SEQ, ITEM_NAME: x.ITEM_NAME, ENTP_NAME: x.ENTP_NAME,
      ETC_OTC_CODE: x.ETC_OTC_CODE, CHART: x.CHART, STORAGE_METHOD: x.STORAGE_METHOD, VALID_TERM: x.VALID_TERM, PACK_UNIT: x.PACK_UNIT, CANCEL_NAME: x.CANCEL_NAME }));
    return send(res, 200, { ok: true, total: items.length, items }, items.length ? ttl : 3600);
  }
  return send(res, 200, { ok: true, total: d.total, items: d.items }, ttl);
}

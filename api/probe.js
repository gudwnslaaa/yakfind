// 임시 확인용: 병·의원 찾기 API 확인 (확인 후 삭제)
const KEY = process.env.DATA_GO_KR_KEY;
const B = '/B552657/HsptlAsembySearchService/';
const C = [
  ['baby-all', B + 'getBabyListInfoInqire', { numOfRows: 500 }],
  ['baby-loc', B + 'getBabyLcinfoInqire', { WGS84_LAT: 37.55, WGS84_LON: 126.91, numOfRows: 3 }],
  ['near', B + 'getHsptlMdcncLcinfoInqire', { WGS84_LAT: 37.55, WGS84_LON: 126.91, numOfRows: 3 }],
  ['list-peds', B + 'getHsptlMdcncListInfoInqire', { Q0: '서울특별시', Q1: '마포구', QD: 'D002', QT: 6, numOfRows: 3 }],
  ['list-ent', B + 'getHsptlMdcncListInfoInqire', { Q0: '서울특별시', Q1: '마포구', QD: 'D013', numOfRows: 2 }],
];
const parse = t => [...t.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => Object.fromEntries([...m[1].matchAll(/<([A-Za-z0-9_]+)>([\s\S]*?)<\/\1>/g)].map(f => [f[1], f[2].slice(0, 80)])));
export default async function handler(req, res) {
  const out = {};
  await Promise.all(C.map(async ([k, path, p]) => {
    try {
      const r = await fetch('https://apis.data.go.kr' + path + '?' + new URLSearchParams({ serviceKey: KEY, pageNo: 1, ...p }), { signal: AbortSignal.timeout(20000) });
      const t = await r.text(); const items = parse(t);
      out[k] = { http: r.status, total: (t.match(/<totalCount>(\d+)/) || [])[1], n: items.length, first: items[0] || null, text: items.length ? undefined : t.slice(0, 250),
        ...(k === 'baby-all' ? { sidos: [...new Set(items.map(x => (x.dutyAddr || '').split(' ')[0]))] } : {}) };
      if (k.startsWith('list') && items[0] && items[0].hpid) {
        const r2 = await fetch('https://apis.data.go.kr' + B + 'getHsptlBassInfoInqire?' + new URLSearchParams({ serviceKey: KEY, HPID: items[0].hpid }));
        const b = parse(await r2.text())[0] || {}; out[k].dept = b.dgidIdName; out[k].bassKeys = Object.keys(b);
      }
    } catch (e) { out[k] = { error: String(e) }; }
  }));
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(out, null, 1));
}

// 임시: 바코드 데이터 확인용 (확인 후 삭제)
const U = 'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08/';
const T0 = [
  ['dtl-seq', 'getDrugPrdtPrmsnDtlInq07', { item_seq: '202005623' }],
  ['dtl-seq08', 'getDrugPrdtPrmsnDtlInq08', { item_seq: '202005623' }],
  ['dtl-bar', 'getDrugPrdtPrmsnDtlInq07', { bar_code: '8806469007008' }],
  ['list-bar', 'getDrugPrdtPrmsnInq08', { bar_code: '8806469007008' }],
];
export default async function handler(req, res) {
  const key = process.env.DATA_GO_KR_KEY, out = {};
  const q = req.query || {};
  const T = [
    ['d8-bar', 'getDrugPrdtPrmsnDtlInq08', { bar_code: '8806723001704' }],
    ['d8-bar2', 'getDrugPrdtPrmsnDtlInq08', { BAR_CODE: '8806723001704' }],
    ['d8-edi', 'getDrugPrdtPrmsnDtlInq08', { edi_code: '' , item_name: '어린이타이레놀산' }],
    ['d8-page100', 'getDrugPrdtPrmsnDtlInq08', { numOfRows: 100, pageNo: 200 }],
  ];
  for (const [k, op, p] of T) {
    try {
      const r = await fetch(U + op + '?' + new URLSearchParams({ serviceKey: key, type: 'json', numOfRows: 3, pageNo: 1, ...p }), { signal: AbortSignal.timeout(12000) });
      const t = await r.text(); let j; try { j = JSON.parse(t); } catch { out[k] = { http: r.status, raw: t.slice(0, 300) }; continue; }
      const b = j.body || {}; let items = b.items || []; if (!Array.isArray(items)) items = items.item ? [].concat(items.item) : [items];
      items = items.map(x => x.item || x);
      const f = items[0] || {};
      out[k] = { http: r.status, bytes: t.length, total: b.totalCount, n: items.length, keys: Object.keys(f), name: f.ITEM_NAME, bar: f.BAR_CODE, seq: items.map(x => x.ITEM_SEQ) };
    } catch (e) { out[k] = { err: String(e.message) }; }
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(out, null, 1));
}

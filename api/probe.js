// 임시 확인용: 새 API 주소가 맞는지 시험 (확인 후 삭제)
const KEY = process.env.DATA_GO_KR_KEY;
const C = [
  ['usjnt-alpra', '/1471000/DURPrdlstInfoService03/getUsjntTabooInfoList03', { itemName: '자낙스', type: 'json', numOfRows: 2 }],
  ['usjnt-seq', '/1471000/DURPrdlstInfoService03/getUsjntTabooInfoList03', { itemSeq: '202106092', type: 'json', numOfRows: 2 }],
  ['agrde-lop', '/1471000/DURPrdlstInfoService03/getSpcifyAgrdeTabooInfoList03', { itemName: '로페라미드', type: 'json', numOfRows: 2 }],
  ['pwnm-isotre', '/1471000/DURPrdlstInfoService03/getPwnmTabooInfoList03', { itemName: '이소트레티노인', type: 'json', numOfRows: 2 }],
  ['odsn-seq', '/1471000/DURPrdlstInfoService03/getOdsnAtentInfoList03', { itemSeq: '196000010', type: 'json', numOfRows: 2 }],
  ['pill-all', '/1471000/MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03', { type: 'json', numOfRows: 100 }],
  ['pill-big', '/1471000/MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03', { type: 'json', numOfRows: 1000 }],
  ['pill-print', '/1471000/MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03', { print_front: 'TYLENOL', type: 'json', numOfRows: 2 }],
  ['pill-shape', '/1471000/MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03', { drug_shape: '원형', color_class1: '분홍', type: 'json', numOfRows: 2 }],
  ['pill-seq', '/1471000/MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03', { item_seq: '202106092', type: 'json', numOfRows: 2 }],
];
export default async function handler(req, res) {
  const out = {};
  await Promise.all(C.map(async ([k, path, p]) => {
    try {
      const r = await fetch('https://apis.data.go.kr' + path + '?' + new URLSearchParams({ serviceKey: KEY, pageNo: 1, ...p }), { signal: AbortSignal.timeout(20000) });
      const t = await r.text();
      let j = null; try { j = JSON.parse(t); } catch {}
      if (!j) { out[k] = { http: r.status, text: t.slice(0, 300) }; return; }
      const b = (j.body || (j.response && j.response.body)) || {};
      let items = b.items; if (items && items.item) items = items.item; if (items && !Array.isArray(items)) items = [items];
      out[k] = { http: r.status, header: j.header || (j.response && j.response.header), total: b.totalCount, n: (items || []).length, keys: items && items[0] ? Object.keys(items[0]) : [], first: items && items[0] ? Object.fromEntries(Object.entries(items[0]).map(([a, v]) => [a, String(v).slice(0, 80)])) : null };
    } catch (e) { out[k] = { error: String(e) }; }
  }));
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(out, null, 1));
}

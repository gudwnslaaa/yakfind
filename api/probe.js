// 임시 확인용: 새 API 주소가 맞는지 시험 (확인 후 삭제)
const KEY = process.env.DATA_GO_KR_KEY;
const C = [
  ['dur3-usjnt', '/1471000/DURPrdlstInfoService03/getUsjntTabooInfoList03', { itemName: '타이레놀', type: 'json', numOfRows: 2 }],
  ['dur3-prdlst', '/1471000/DURPrdlstInfoService03/getDurPrdlstInfoList03', { itemName: '타이레놀', type: 'json', numOfRows: 2 }],
  ['dur3-pwnm', '/1471000/DURPrdlstInfoService03/getPwnmTabooInfoList03', { itemName: '타이레놀', type: 'json', numOfRows: 2 }],
  ['dur3-agrde', '/1471000/DURPrdlstInfoService03/getSpcifyAgrdeTabooInfoList03', { itemName: '아스피린', type: 'json', numOfRows: 2 }],
  ['dur3-odsn', '/1471000/DURPrdlstInfoService03/getOdsnAtentInfoList03', { type: 'json', numOfRows: 2 }],
  ['dur3-efcy', '/1471000/DURPrdlstInfoService03/getEfcyDplctInfoList03', { itemName: '타이레놀', type: 'json', numOfRows: 2 }],
  ['dur3-cpcty', '/1471000/DURPrdlstInfoService03/getCpctyAtentInfoList03', { type: 'json', numOfRows: 2 }],
  ['dur2-usjnt', '/1471000/DURPrdlstInfoService02/getUsjntTabooInfoList02', { itemName: '타이레놀', type: 'json', numOfRows: 2 }],
  ['pill2', '/1471000/MdcinGrnIdntfcInfoService02/getMdcinGrnIdntfcInfoList02', { item_name: '타이레놀', type: 'json', numOfRows: 2 }],
  ['pill3', '/1471000/MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03', { item_name: '타이레놀', type: 'json', numOfRows: 2 }],
  ['pill1', '/1471000/MdcinGrnIdntfcInfoService01/getMdcinGrnIdntfcInfoList01', { item_name: '타이레놀', type: 'json', numOfRows: 2 }],
  ['pill2-big', '/1471000/MdcinGrnIdntfcInfoService02/getMdcinGrnIdntfcInfoList02', { type: 'json', numOfRows: 1000 }],
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

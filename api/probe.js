// 임시 확인용: 회수·판매중지 API 확인 (확인 후 삭제)
const KEY = process.env.DATA_GO_KR_KEY;
const C = [
  ['list', '/1471000/MdcinRtrvlSleStpgeInfoService05/getMdcinRtrvlSleStpgelList05', { type: 'json', numOfRows: 3, pageNo: 1 }],
  ['list-big', '/1471000/MdcinRtrvlSleStpgeInfoService05/getMdcinRtrvlSleStpgelList05', { type: 'json', numOfRows: 500, pageNo: 1 }],
  ['item', '/1471000/MdcinRtrvlSleStpgeInfoService05/getMdcinRtrvlSleStpgeItem05', { type: 'json', numOfRows: 3, pageNo: 1 }],
];
export default async function handler(req, res) {
  const out = {};
  await Promise.all(C.map(async ([k, path, p]) => {
    try {
      const r = await fetch('https://apis.data.go.kr' + path + '?' + new URLSearchParams({ serviceKey: KEY, ...p }), { signal: AbortSignal.timeout(20000) });
      const t = await r.text();
      let j = null; try { j = JSON.parse(t); } catch {}
      if (!j) { out[k] = { http: r.status, text: t.slice(0, 300) }; return; }
      const b = (j.body || (j.response && j.response.body)) || {};
      let items = b.items; if (items && items.item) items = items.item; if (items && !Array.isArray(items)) items = [items];
      out[k] = { http: r.status, header: j.header || (j.response && j.response.header), total: b.totalCount, n: (items || []).length,
        last: (items || []).slice(-1).map(x => Object.fromEntries(Object.entries(x).map(([a, v]) => [a, String(v).slice(0, 70)]))), rows: (items || []).slice(0, 3).map(x => Object.fromEntries(Object.entries(x).map(([a, v]) => [a, String(v).slice(0, 70)]))) };
    } catch (e) { out[k] = { error: String(e) }; }
  }));
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(out, null, 1));
}

// 임시 확인용: 새 API 주소가 맞는지 시험 (확인 후 삭제)
const KEY = process.env.DATA_GO_KR_KEY;
const C = [
  ['er-list', '/B552657/ErmctInfoInqireService/getEgytListInfoInqire', { Q0: '서울특별시', Q1: '마포구', numOfRows: 2 }],
  ['er-loc', '/B552657/ErmctInfoInqireService/getEgytLcinfoInqire', { WGS84_LAT: 37.55, WGS84_LON: 126.91, numOfRows: 2 }],
  ['er-bed', '/B552657/ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfoInqire', { STAGE1: '서울특별시', STAGE2: '마포구', numOfRows: 2 }],
  ['er-msg', '/B552657/ErmctInfoInqireService/getEmrrmSrsillDissMsgInqire', { Q0: '서울특별시', Q1: '마포구', numOfRows: 2 }],
  ['rc4', '/1471000/MdcinRtrvlSleStpgeInfoService04/getMdcinRtrvlSleStpgelList03', { type: 'json', numOfRows: 2 }],
  ['rc4b', '/1471000/MdcinRtrvlSleStpgeInfoService04/getMdcinRtrvlSleStpgeList04', { type: 'json', numOfRows: 2 }],
  ['rc3', '/1471000/MdcinRtrvlSleStpgeInfoService03/getMdcinRtrvlSleStpgelList02', { type: 'json', numOfRows: 2 }],
  ['rc3b', '/1471000/MdcinRtrvlSleStpgeInfoService03/getMdcinRtrvlSleStpgeList03', { type: 'json', numOfRows: 2 }],
  ['rc2', '/1471000/MdcinRtrvlSleStpgeInfoService02/getMdcinRtrvlSleStpgelList01', { type: 'json', numOfRows: 2 }],
  ['rc2b', '/1471000/MdcinRtrvlSleStpgeInfoService02/getMdcinRtrvlSleStpgeList02', { type: 'json', numOfRows: 2 }],
  ['rc1', '/1471000/MdcinRtrvlSleStpgeInfoService01/getMdcinRtrvlSleStpgeList01', { type: 'json', numOfRows: 2 }],
  ['rc5', '/1471000/MdcinRtrvlSleStpgeInfoService05/getMdcinRtrvlSleStpgeList05', { type: 'json', numOfRows: 2 }],
];
export default async function handler(req, res) {
  const out = {};
  await Promise.all(C.map(async ([k, path, p]) => {
    try {
      const r = await fetch('https://apis.data.go.kr' + path + '?' + new URLSearchParams({ serviceKey: KEY, pageNo: 1, ...p }), { signal: AbortSignal.timeout(20000) });
      const t = await r.text();
      let j = null; try { j = JSON.parse(t); } catch {}
      if (!j) {
        const items = [...t.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => Object.fromEntries([...m[1].matchAll(/<([A-Za-z0-9_]+)>([\s\S]*?)<\/\1>/g)].map(f => [f[1], f[2].slice(0, 60)])));
        out[k] = { http: r.status, xml: true, total: (t.match(/<totalCount>(\d+)/) || [])[1], n: items.length, first: items[0] || null, text: items.length ? undefined : t.slice(0, 250) };
        return;
      }
      const b = (j.body || (j.response && j.response.body)) || {};
      let items = b.items; if (items && items.item) items = items.item; if (items && !Array.isArray(items)) items = [items];
      out[k] = { http: r.status, header: j.header || (j.response && j.response.header), total: b.totalCount, n: (items || []).length, first: items && items[0] ? Object.fromEntries(Object.entries(items[0]).map(([a, v]) => [a, String(v).slice(0, 60)])) : null };
    } catch (e) { out[k] = { error: String(e) }; }
  }));
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(out, null, 1));
}

// 임시 확인용: 새 API 주소가 맞는지 시험 (확인 후 삭제)
const KEY = process.env.DATA_GO_KR_KEY;
const C = [
  ['bed-sido', '/B552657/ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfoInqire', { STAGE1: '서울특별시', numOfRows: 2 }],
  ['bed-gu', '/B552657/ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfoInqire', { STAGE1: '서울특별시', STAGE2: '서대문구', numOfRows: 2 }],
  ['bass', '/B552657/ErmctInfoInqireService/getEgytBassInfoInqire', { HPID: 'A1100063', numOfRows: 1 }],
  ['list-sido', '/B552657/ErmctInfoInqireService/getEgytListInfoInqire', { Q0: '서울특별시', numOfRows: 2 }],
  ['rc4', '/1471000/MdcinRtrvlSleStpgeInfoService04/getMdcinRtrvlSleStpgelList03', { type: 'json', numOfRows: 2 }],
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

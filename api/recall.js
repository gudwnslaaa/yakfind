// /api/recall            → 의약품 회수·판매중지 전체 목록 (최신순, CDN 6시간)
// /api/recall?seqs=a,b   → 그중 품목코드가 맞는 것만
import { callAll, clean, nz, getQuery } from './_lib.js';
import { recallList } from './_recall.js';
import recallPage from './_recall-page.js';
export { recallList };

const d8 = v => { v = String(v || '').replace(/\D/g, ''); return v.length === 8 ? `${v.slice(0, 4)}.${v.slice(4, 6)}.${v.slice(6)}` : ''; };
export default async function handler(req, res) {
  if (getQuery(req).view === 'page') return recallPage(req, res);
  const seqs = String(getQuery(req).seqs || '').split(',').map(s => s.replace(/\D/g, '')).filter(Boolean);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const all = await recallList();
    const items = seqs.length ? all.filter(r => seqs.includes(r.seq)) : all;
    res.statusCode = 200;
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
    res.end(JSON.stringify({ ok: true, total: all.length, items }));
  } catch (e) {
    res.statusCode = 502; res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ ok: false, error: '회수 정보를 받아오지 못했어요.' }));
  }
}

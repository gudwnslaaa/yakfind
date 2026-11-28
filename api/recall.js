// /api/recall            → 의약품 회수·판매중지 전체 목록 (최신순, CDN 6시간)
// /api/recall?seqs=a,b   → 그중 품목코드가 맞는 것만
import { callAll, clean, nz, getQuery } from './_lib.js';

const d8 = v => { v = String(v || '').replace(/\D/g, ''); return v.length === 8 ? `${v.slice(0, 4)}.${v.slice(4, 6)}.${v.slice(6)}` : ''; };
export async function recallList() {
  const d = await callAll('recall', { type: 'json' }, 500, 4, 2);
  const seen = new Set();
  return d.items.map(x => ({
    seq: String(x.ITEM_SEQ || '').replace(/\D/g, ''), name: clean(x.PRDUCT), entp: clean(x.ENTRPS), reason: nz(x.RTRVL_RESN),
    date: String(x.RECALL_COMMAND_DATE || '').replace(/\D/g, ''), lot: nz(x.MNFCTUR_NO), made: d8(x.MNFCTUR_DT), useBy: d8(x.USGPD),
  })).filter(r => { const k = r.seq + '|' + r.lot + '|' + r.date; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export default async function handler(req, res) {
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

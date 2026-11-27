// /api/pill-index?part=0~9 → 낱알식별 전체 목록을 10조각으로 나눠 받아 저장(CDN 7일)
import { call, clean, getQuery } from './_lib.js';
const PARTS = 10, ROWS = 100;
const IMG = 'https://nedrug.mfds.go.kr/pbp/cmn/itemImageDownload/';
const v = x => { x = clean(x); return x === 'null' ? '' : x; };

export default async function handler(req, res) {
  const part = Math.max(0, Math.min(PARTS - 1, parseInt(getQuery(req).part, 10) || 0));
  try {
    const first = await call('pill', { numOfRows: ROWS, pageNo: 1, type: 'json' });
    const pages = Math.ceil(first.total / ROWS);
    const per = Math.ceil(pages / PARTS);
    const nums = []; for (let p = part * per + 1; p <= Math.min(pages, (part + 1) * per); p++) nums.push(p);
    const rows = [];
    for (let i = 0; i < nums.length; i += 9) {
      const got = await Promise.all(nums.slice(i, i + 9).map(n => n === 1 ? first : call('pill', { numOfRows: ROWS, pageNo: n, type: 'json' }).catch(() => null)));
      for (const g of got) if (g) for (const x of g.items) {
        const img = v(x.ITEM_IMAGE);
        rows.push([v(x.ITEM_SEQ), v(x.ITEM_NAME), v(x.ENTP_NAME), v(x.DRUG_SHAPE), v(x.COLOR_CLASS1), v(x.COLOR_CLASS2), v(x.PRINT_FRONT), v(x.PRINT_BACK),
          v(x.LINE_FRONT), v(x.LINE_BACK), v(x.FORM_CODE_NAME), v(x.ETC_OTC_NAME), img.startsWith(IMG) ? img.slice(IMG.length) : img, v(x.LENG_LONG), v(x.LENG_SHORT)]);
      }
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=2592000');
    res.end(JSON.stringify({ ok: true, part, total: first.total, rows }));
  } catch (e) {
    res.statusCode = 502; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ ok: false, error: e.message }));
  }
}

// /sitemaps/drugs.xml, /sitemaps/pharmacy.xml → 검색엔진용 주소 목록
import { callAll, SIDO, sidoNames, regionOf, getQuery, SITE, INGR_LIST, SYMPTOMS } from './_lib.js';

const xml = urls => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u.replace(/&/g, '&amp;')}</loc></url>`).join('\n')}\n</urlset>\n`;

export default async function handler(req, res) {
  const type = String(getQuery(req).type || '');
  try {
    let urls = [];
    if (type === 'home') {
      urls = [`${SITE}/`, `${SITE}/pharmacy`, `${SITE}/convenience`, `${SITE}/check`, `${SITE}/pill`, `${SITE}/disposal`, `${SITE}/er`, `${SITE}/recall`, `${SITE}/ingredient`, `${SITE}/symptom`,
        ...INGR_LIST.map(x => `${SITE}/ingredient/${encodeURIComponent(x.ko)}`), ...SYMPTOMS.map(x => `${SITE}/symptom/${encodeURIComponent(x[0])}`)];
    } else if (type === 'drugs') {
      // e약은요에 실린 일반의약품 (효능·사용법 정보가 있는 약)
      const d = await callAll('easy', { type: 'json' }, 100, 80, 8);
      const seen = new Set();
      for (const x of d.items) { const s = String(x.ITEMSEQ || '').replace(/\D/g, ''); if (s && !seen.has(s)) { seen.add(s); urls.push(`${SITE}/drug/${s}`); } }
    } else if (type === 'pharmacy') {
      urls.push(`${SITE}/pharmacy`, `${SITE}/moonlight`, `${SITE}/clinic`, `${SITE}/scan`, `${SITE}/mybox`, `${SITE}/holiday`, `${SITE}/travel`, `${SITE}/privacy`);
      const all = await Promise.all(SIDO.map(s => Promise.all(sidoNames(s).map(n => callAll('area', { Q0: n, ORD: 'NAME' }, 500, 30, 4).then(d => d.items).catch(() => []))).then(l => [s, l.flat()])));
      for (const [s, items] of all) {
        urls.push(`${SITE}/pharmacy/${encodeURIComponent(s)}`);
        const slugs = new Set();
        for (const p of items) { const r = regionOf(p.DUTYADDR); if (r) slugs.add(r.slug); }
        for (const g of [...slugs].sort()) urls.push(`${SITE}/pharmacy/${encodeURIComponent(s)}/${encodeURIComponent(g)}`);
      }
    } else {
      res.statusCode = 404; return res.end('not found');
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.end(xml(urls));
  } catch (e) {
    res.statusCode = 503; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end('잠시 후 다시 시도해 주세요: ' + e.message);
  }
}

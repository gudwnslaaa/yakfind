// /sitemaps/drugs.xml, /sitemaps/pharmacy.xml → 검색엔진용 주소 목록
import { call, callAll, alive, SIDO, sidoNames, regionOf, getQuery, SITE, INGR_LIST, SYMPTOMS } from './_lib.js';

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
    } else if (type === 'popular') {
      // 검색이 많은 제품 이름 (네이버 검색량 기준으로 고름). 전문약도 정보 페이지로만 포함하고 순위·추천 표시는 하지 않음
      const names = ['비판텐', '에스로반', '지르텍', '마데카솔', '후시딘', '판콜', '게보린', '타이레놀', '이지엔6', '탁센', '부루펜', '챔프', '맥시부펜', '콜대원', '판피린',
        '베아제', '훼스탈', '겔포스', '개비스콘', '스멕타', '둘코락스', '액티피드', '코대원', '클라리틴', '알레그라', '인사돌', '이가탄', '오라메디', '센시아', '우루사',
        '아로나민', '임팩타민', '벤포벨', '펜잘', '그날엔', '노스카나', '베타딘', '카네스텐', '니조랄', '라미실', '로게인', '마이녹실', '판토가', '복합우루사',
        '타미플루', '리피토', '크레스토', '아모잘탄', '넥시움', '리리카'];
      const seen = new Set();
      for (let i = 0; i < names.length; i += 6) {
        const got = await Promise.all(names.slice(i, i + 6).map(n => call('permit', { item_name: n, numOfRows: 30, type: 'json' }).then(d => [n, d.items]).catch(() => [n, []])));
        for (const [n, items] of got) {
          for (const x of items.filter(alive).filter(x => String(x.ITEM_NAME || '').replace(/\s/g, '').startsWith(n)).slice(0, 8)) {
            const q = String(x.ITEM_SEQ || '').replace(/\D/g, ''); if (q && !seen.has(q)) { seen.add(q); urls.push(`${SITE}/drug/${q}`); }
          }
        }
      }
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

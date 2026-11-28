// /api/pill?shape=&color=&print=&line=&form= → 모양·색·글자로 낱알 찾기
import { getQuery } from './_lib.js';
const PARTS = 10;
const norm = s => String(s || '').toUpperCase().replace(/[^0-9A-Z가-힣]/g, '');

export default async function handler(req, res) {
  const q = getQuery(req);
  const shape = String(q.shape || ''), color = String(q.color || ''), print = norm(q.print), line = String(q.line || ''), form = String(q.form || '');
  const send = (s, o, c) => { res.statusCode = s; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', c ? 'public, s-maxage=86400, stale-while-revalidate=604800' : 'no-store'); res.end(JSON.stringify(o)); };
  if (!shape && !color && !print) return send(400, { ok: false, error: '모양, 색, 글자 중 하나 이상을 골라 주세요.' });
  try {
    const base = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.headers.host}`;
    // 공공데이터 서버가 동시 요청을 거절하므로 두 조각씩 차례로 (저장된 뒤에는 금방 끝남)
    const one = i => fetch(`${base}/api/pill-index?part=${i}`, { signal: AbortSignal.timeout(50000) }).then(r => r.json()).catch(() => null);
    const parts = [];
    for (let i = 0; i < PARTS; i += 2) parts.push(...await Promise.all([one(i), i + 1 < PARTS ? one(i + 1) : null].filter(Boolean)));
    const failed = parts.filter(p => !p || !p.ok || p.missing).length;
    const rows = parts.flatMap(p => (p && p.ok ? p.rows : []));
    const hit = rows.filter(r => {
      const [, , , sh, c1, c2, pf, pb, lf, lb, fm] = r;
      if (shape && sh !== shape) return false;
      if (color && c1 !== color && c2 !== color) return false;
      if (print) { const f = norm(pf), b = norm(pb); if (!(f.includes(print) || b.includes(print))) return false; }
      if (line === 'yes' && !(lf || lb)) return false;
      if (line === 'no' && (lf || lb)) return false;
      if (form === '정제' && /캡슐/.test(fm)) return false;
      if (form && form !== '정제' && !fm.includes(form)) return false;
      return true;
    });
    // 글자가 정확히 같은 것 먼저
    if (print) hit.sort((a, b) => (norm(b[6]) === print || norm(b[7]) === print) - (norm(a[6]) === print || norm(a[7]) === print));
    send(200, { ok: true, total: hit.length, partial: failed > 0, items: hit.slice(0, 80) }, failed === 0);
  } catch (e) {
    send(502, { ok: false, error: '정보를 받아오지 못했어요. 잠시 후 다시 시도해 주세요.' });
  }
}

// 모든 /api/<이름> 요청을 받는 하나뿐인 서버 함수 (Vercel 무료 요금제 함수 12개 한도 대비)
// 실제 처리 코드는 lib/<이름>.js 에 있어요. 새 API를 만들면 lib/에 파일을 만들고 아래 ROUTES에 한 줄 추가하세요.
// 주의: Next.js가 아닌 프로젝트라 [...path] 같은 여러 단계 경로는 안 돼요. /api/이름 한 단계만 받아요.
import yak from '../lib/yak.js';
import drugPage from '../lib/drug-page.js';
import regionPage from '../lib/region-page.js';
import topicPage from '../lib/topic-page.js';
import durCheck from '../lib/dur-check.js';
import pillIndex from '../lib/pill-index.js';
import pill from '../lib/pill.js';
import er from '../lib/er.js';
import clinic from '../lib/clinic.js';
import recall from '../lib/recall.js';
import sitemap from '../lib/sitemap.js';

const ROUTES = {
  yak, 'drug-page': drugPage, 'region-page': regionPage, 'topic-page': topicPage, 'dur-check': durCheck,
  'pill-index': pillIndex, pill, er, clinic, recall, sitemap,
  ping: (req, res) => { res.statusCode = 200; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end('{"ok":true}'); },
};

export default async function handler(req, res) {
  const q = req.query || {};
  const name = String(q.fn || new URL(req.url || '/', 'http://x').pathname.split('/')[2] || '');
  const run = Object.prototype.hasOwnProperty.call(ROUTES, name) ? ROUTES[name] : null;
  if (!run) {
    res.statusCode = 404; res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: '없는 주소예요.' }));
  }
  if (req.query) delete req.query.fn; // 각 처리 코드는 예전처럼 자기 쿼리만 보게
  return run(req, res);
}

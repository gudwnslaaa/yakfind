// /api/dur-check?seqs=품목코드,품목코드… → 함께 먹어도 되는지 (병용금기·같은 성분 중복·같은 효능군 중복)
import { call, callAll, clean, ingredients, ingrKey, koName, shortName, findPermit, nz, getQuery } from './_lib.js';

function send(res, status, obj, cache) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache ? 'public, s-maxage=86400, stale-while-revalidate=604800' : 'no-store');
  res.end(JSON.stringify(obj));
}
const keyMatch = (a, b) => a && b && (a === b || a.startsWith(b + ' ') || b.startsWith(a + ' '));

export default async function handler(req, res) {
  const seqs = [...new Set(String(getQuery(req).seqs || '').split(',').map(s => s.replace(/\D/g, '')).filter(Boolean))].slice(0, 5);
  if (seqs.length < 2) return send(res, 400, { ok: false, error: '약을 두 개 이상 골라 주세요.' });
  try {
    const drugs = await Promise.all(seqs.map(async seq => {
      const [p, tab, ef] = await Promise.all([
        findPermit(seq).catch(() => null),
        callAll('dur_병용금기', { itemSeq: seq, type: 'json' }, 100, 5, 5).catch(() => ({ items: [] })),
        call('dur_효능군중복', { itemSeq: seq, numOfRows: 20, type: 'json' }).catch(() => ({ items: [] })),
      ]);
      const ing = p ? ingredients(p) : [];
      return {
        seq, name: p ? shortName(p.ITEM_NAME) : seq,
        ingr: ing.map(x => ({ en: x, ko: koName(x), key: ingrKey(x) })),
        taboo: tab.items.filter(r => !r.ITEM_SEQ || r.ITEM_SEQ === seq),
        effects: [...new Set(ef.items.filter(r => !r.ITEM_SEQ || r.ITEM_SEQ === seq).map(r => nz(r.EFFECT_NAME)).filter(Boolean))],
      };
    }));
    const issues = [];
    for (let i = 0; i < drugs.length; i++) for (let j = i + 1; j < drugs.length; j++) {
      const A = drugs[i], B = drugs[j];
      // 1) 병용금기 (양쪽 방향 모두 확인)
      const why = new Set(), via = new Set();
      for (const [X, Y] of [[A, B], [B, A]]) {
        const yKeys = Y.ingr.map(x => x.key);
        for (const r of X.taboo) {
          const mk = ingrKey(r.MIXTURE_INGR_ENG_NAME || '');
          if (r.MIXTURE_ITEM_SEQ === Y.seq || yKeys.some(k => keyMatch(k, mk))) {
            const w = nz(r.PROHBT_CONTENT); if (w) why.add(w);
            via.add(`${nz(r.INGR_KOR_NAME) || nz(r.INGR_ENG_NAME)} + ${nz(r.MIXTURE_INGR_KOR_NAME) || nz(r.MIXTURE_INGR_ENG_NAME)}`);
          }
        }
      }
      if (via.size) issues.push({ level: 'stop', type: '병용금기', a: A.seq, b: B.seq, title: '함께 먹으면 안 돼요 (병용금기)', detail: [...via].join(', '), why: [...why].slice(0, 3) });
      // 2) 같은 성분 중복 (과다 복용 위험)
      const same = A.ingr.filter(x => B.ingr.some(y => keyMatch(x.key, y.key)));
      if (same.length) issues.push({ level: 'warn', type: '같은 성분', a: A.seq, b: B.seq, title: '같은 성분이 겹쳐요', detail: same.map(x => x.ko || x.en).join(', '), why: ['같은 성분을 두 번 먹게 되어 하루 최대 용량을 넘길 수 있어요. 한 가지만 드세요.'] });
      // 3) 같은 효능군
      const eff = A.effects.filter(e => B.effects.includes(e));
      if (eff.length && !same.length) issues.push({ level: 'warn', type: '효능군중복', a: A.seq, b: B.seq, title: '같은 종류의 약이에요', detail: eff.join(', '), why: ['효능이 같은 약을 함께 먹으면 부작용 위험이 커질 수 있어요.'] });
    }
    send(res, 200, { ok: true, drugs: drugs.map(d => ({ seq: d.seq, name: d.name, ingr: d.ingr.map(x => x.ko || x.en), effects: d.effects, tabooCount: d.taboo.length })), issues }, true);
  } catch (e) {
    send(res, 502, { ok: false, error: '정보를 받아오지 못했어요. 잠시 후 다시 시도해 주세요.' });
  }
}

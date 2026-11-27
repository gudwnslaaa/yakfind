// /ingredient/성분, /symptom/증상 (+ 목록 페이지) → 검색엔진용 주제 페이지
import { call, callAll, esc, clean, ingredients, ingrKey, koName, isRx, alive, imgOf, shortName, INGR_LIST, findIngr, SYMPTOMS,
  page, sendHtml, notFound, failPage, getQuery } from './_lib.js';

const dec = v => { try { return decodeURIComponent(String(v || '')); } catch { return String(v || ''); } };
const MONTH = 2592000;
const thumb = x => { const u = imgOf(x); return `<span class="thumb">${u ? `<img src="${esc(u)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`; };
const li = (seq, name, sub, img) => `<li><a class="it" href="/drug/${esc(seq)}">${thumb(img)}<span><b>${esc(name)}</b><small>${esc(sub)}</small></span></a></li>`;

async function ingredientPage(res, raw) {
  const info = findIngr(raw);
  const ko = info ? info.ko : raw, q = info ? info.q : raw, key = info ? info.key : ingrKey(raw);
  if (!q || q.length < 2) return notFound(res, '성분 이름이 없어요.');
  const d = await callAll('permit', { item_ingr_name: q, type: 'json' }, 100, 10, 5);
  const seen = new Set();
  const all = d.items.filter(alive).filter(x => !seen.has(x.ITEM_SEQ) && seen.add(x.ITEM_SEQ))
    .filter(x => ingredients(x).some(i => { const k = ingrKey(i); return k === key || k.startsWith(key + ' ') || key.startsWith(k + ' '); }));
  if (!all.length) return notFound(res, `'${ko}' 성분이 들어간 약을 찾지 못했어요.`);
  const single = all.filter(x => ingredients(x).length === 1), combo = all.filter(x => ingredients(x).length > 1);
  const otcFirst = list => list.sort((a, b) => isRx(a) - isRx(b));
  otcFirst(single); otcFirst(combo);
  const nOtc = all.filter(x => !isRx(x)).length;
  const row = x => li(x.ITEM_SEQ, clean(x.ITEM_NAME), `${clean(x.ENTP_NAME)} · ${isRx(x) ? '전문' : '일반'}${ingredients(x).length > 1 ? ' · ' + ingredients(x).map(i => koName(i) || i).join(', ') : ''}`, x);
  const body = `
<nav class="crumb"><a href="/ingredient">성분별 약</a> › ${esc(ko)}</nav>
<h1>${esc(ko)} 들어간 약</h1>
<p class="sub">${esc(ko)}${info ? ` (${esc(q)})` : ''} 성분이 들어간 약 ${d.total > d.items.length ? `${all.length}개 이상을` : `${all.length}개를`} 모았어요. 일반의약품 ${nOtc}개, 이 성분 하나만 든 약 ${single.length}개, 다른 성분과 섞인 복합제 ${combo.length}개예요.</p>
<div class="box cta"><b>같은 성분은 겹쳐 먹지 마세요</b><p class="note" style="margin:6px 0 0">감기약·진통제·생리통약에 같은 성분이 함께 들어 있는 경우가 많아요. 두 가지 약을 같이 먹기 전에 아래 목록에 둘 다 있는지 확인하거나 <a href="/check">같이 먹어도 되나요?</a>에서 확인하세요.</p></div>
${single.length ? `<h2>${esc(ko)}만 든 약 <small class="note">${single.length}개</small></h2><ul class="list">${single.slice(0, 80).map(row).join('')}</ul>` : ''}
${combo.length ? `<h2>${esc(ko)}이(가) 들어간 복합제 <small class="note">${combo.length}개</small></h2><ul class="list">${combo.slice(0, 120).map(row).join('')}</ul>` : ''}
<p class="note" style="margin-top:20px">자료: 식품의약품안전처 의약품 제품 허가정보. 허가가 취소된 약과 수출용 제품은 뺐어요.</p>
<h2>다른 성분</h2><ul class="grid">${INGR_LIST.filter(x => x.ko !== ko).map(x => `<li><a href="/ingredient/${encodeURIComponent(x.ko)}">${esc(x.ko)}</a></li>`).join('')}</ul>`;
  return sendHtml(res, 200, page({ title: `${ko} 들어간 약 ${all.length}개 — 같은 성분 약 목록 | 이 약, 어디 있지?`,
    desc: `${ko} 성분이 들어간 약 목록. 단일 성분 ${single.length}개, 복합제 ${combo.length}개. 감기약·진통제를 같이 먹기 전에 성분이 겹치는지 확인하세요.`,
    path: '/ingredient/' + encodeURIComponent(ko), body }), MONTH);
}

async function symptomPage(res, key) {
  const s = SYMPTOMS.find(x => x[0] === key);
  if (!s) return notFound(res, `'${key}' 증상 페이지가 없어요.`);
  const [k, label] = s;
  const d = await callAll('easy', { efcyQesitm: k, type: 'json' }, 100, 3, 3);
  const list = d.items.filter(x => !/수출용/.test(x.ITEMNAME || ''));
  const body = `
<nav class="crumb"><a href="/symptom">증상별 약</a> › ${esc(label)}</nav>
<h1>${esc(label)}에 먹는 약</h1>
<p class="sub">효능에 '${esc(k)}'이(가) 적힌 일반의약품 ${d.total}개${d.total > list.length ? ` 중 ${list.length}개` : ''}를 모았어요. 식약처 e약은요 자료예요.</p>
<div class="box"><b>먼저 확인하세요</b><p class="note" style="margin:6px 0 0">증상이 심하거나 2~3일 넘게 계속되면 병원에 가세요. 임신 중이거나, 어린이·어르신이거나, 다른 약을 먹고 있다면 약사에게 먼저 물어보세요. 약 이름을 누르면 성분, 먹는 법, 주의사항을 볼 수 있어요.</p></div>
<div class="box cta"><b>지금 사러 가시나요?</b><p style="margin:10px 0 0"><a class="btn red" href="/">지금 문 연 약국 찾기</a> <a class="btn" href="/convenience">편의점 상비약 보기</a></p></div>
<h2>약 목록 <small class="note">${list.length}개</small></h2>
<ul class="list">${list.map(x => li(x.ITEMSEQ, clean(x.ITEMNAME), `${clean(x.ENTPNAME)} · ${clean(x.EFCYQESITM).slice(0, 70)}…`, { ITEMIMAGE: x.ITEMIMAGE })).join('')}</ul>
<h2>다른 증상</h2><ul class="grid">${SYMPTOMS.filter(x => x[0] !== k).map(([a, b]) => `<li><a href="/symptom/${encodeURIComponent(a)}">${esc(b)}</a></li>`).join('')}</ul>`;
  return sendHtml(res, 200, page({ title: `${label}에 먹는 약 ${d.total}가지 — 일반의약품 목록 | 이 약, 어디 있지?`,
    desc: `${label}에 쓰는 일반의약품 ${d.total}가지를 성분·효능과 함께 정리했어요. 약국 가기 전에 어떤 약이 있는지 확인하세요.`,
    path: '/symptom/' + encodeURIComponent(k), body }), MONTH);
}

export default async function handler(req, res) {
  const q = getQuery(req);
  const type = String(q.type || ''), name = dec(q.name).trim();
  try {
    if (type === 'ingredient' && !name) {
      const body = `<h1>성분별 약 찾기</h1><p class="sub">자주 쓰는 일반약 성분을 고르면 그 성분이 들어간 약을 모두 보여드려요. 감기약과 진통제를 같이 먹을 때 성분이 겹치는지 확인하기 좋아요.</p>
<ul class="grid" style="margin-top:18px">${INGR_LIST.map(x => `<li><a href="/ingredient/${encodeURIComponent(x.ko)}"><span>${esc(x.ko)}</span><small>${esc(x.q)}</small></a></li>`).join('')}</ul>`;
      return sendHtml(res, 200, page({ title: '성분별 약 찾기 — 아세트아미노펜·이부프로펜 들어간 약 | 이 약, 어디 있지?', desc: '아세트아미노펜, 이부프로펜, 카페인 등 성분별로 그 성분이 들어간 약을 모두 확인하세요.', path: '/ingredient', body }), MONTH);
    }
    if (type === 'symptom' && !name) {
      const body = `<h1>증상별 약 찾기</h1><p class="sub">증상을 고르면 그 증상에 쓰는 일반의약품을 모아 보여드려요.</p>
<ul class="grid" style="margin-top:18px">${SYMPTOMS.map(([a, b]) => `<li><a href="/symptom/${encodeURIComponent(a)}">${esc(b)}</a></li>`).join('')}</ul>`;
      return sendHtml(res, 200, page({ title: '증상별 약 찾기 — 두통·감기·소화불량에 먹는 약 | 이 약, 어디 있지?', desc: '두통, 감기, 소화불량, 설사, 멀미 등 증상별로 먹을 수 있는 일반의약품을 확인하세요.', path: '/symptom', body }), MONTH);
    }
    if (type === 'ingredient') return await ingredientPage(res, name);
    if (type === 'symptom') return await symptomPage(res, name);
    return notFound(res, '페이지를 찾을 수 없어요.');
  } catch (e) {
    return failPage(res, e.message);
  }
}

// /drug/품목기준코드 → 약 상세 페이지 (검색엔진이 읽을 수 있게 서버에서 완성)
import { call, callAll, esc, clean, ingredients, ingrSet, koName, showIngr, queryIngr, isRx, alive, imgOf, shortName,
  page, sendHtml, notFound, failPage, getQuery } from './_lib.js';

async function findPermit(seq) {
  // 1) 품목코드로 바로 조회
  try {
    const d = await call('permit', { item_seq: seq, numOfRows: 5, type: 'json' });
    const hit = d.items.find(x => x.ITEM_SEQ === seq);
    if (hit) return hit;
  } catch (e) { /* 아래 방법으로 */ }
  // 2) e약은요에서 이름을 얻어 이름으로 조회
  const e = await call('easy', { itemSeq: seq, numOfRows: 1, type: 'json' }).catch(() => null);
  const name = e && e.items[0] && e.items[0].ITEMNAME;
  if (!name) return null;
  const d = await call('permit', { item_name: shortName(name).slice(0, 30), numOfRows: 100, type: 'json' });
  return d.items.find(x => x.ITEM_SEQ === seq) || null;
}

export default async function handler(req, res) {
  const seq = String(getQuery(req).seq || '').replace(/\D/g, '').slice(0, 12);
  if (!seq) return notFound(res, '품목코드가 없어요.');
  let d, easy = null, same = [];
  try {
    d = await findPermit(seq);
    if (!d) return notFound(res, '이 품목코드의 약을 찾지 못했어요. 허가가 취소됐거나 주소가 잘못됐을 수 있어요.');
    const ing = ingredients(d);
    const [e, s] = await Promise.all([
      isRx(d) ? null : call('easy', { itemSeq: seq, numOfRows: 1, type: 'json' }).catch(() => null),
      ing.length ? callAll('permit', { item_ingr_name: queryIngr(ing), type: 'json' }, 100, 5, 5).catch(() => null) : null,
    ]);
    easy = e && e.items[0] || null;
    if (s) {
      const key = ingrSet(d);
      same = s.items.filter(alive).filter(x => x.ITEM_SEQ !== seq && ingrSet(x) === key);
      const seen = new Set(); same = same.filter(x => !seen.has(x.ITEM_SEQ) && seen.add(x.ITEM_SEQ));
    }
  } catch (e) {
    return failPage(res, e.message);
  }

  const name = clean(d.ITEM_NAME), sname = shortName(name), ing = ingredients(d), rx = isRx(d);
  const img = imgOf(d) || imgOf({ ITEMIMAGE: easy && easy.ITEMIMAGE });
  const ingText = ing.map(x => koName(x) || x).join(', ');
  const efcy = easy ? clean(easy.EFCYQESITM) : '';
  const desc = `${sname} 성분(${ingText || '정보 없음'}), ${efcy ? efcy.slice(0, 70) + ' ' : ''}같은 성분 약과 지금 문 연 약국을 확인하세요.`.slice(0, 155);
  const parts = [['효능', 'EFCYQESITM'], ['먹는 법', 'USEMETHODQESITM'], ['꼭 알아둘 경고', 'ATPNWARNQESITM'], ['주의사항', 'ATPNQESITM'], ['같이 먹으면 안 되는 것', 'INTRCQESITM'], ['부작용', 'SEQESITM'], ['보관법', 'DEPOSITMETHODQESITM']];
  const script = `안녕하세요, ${sname} 있나요?` + (ing.length && !rx ? ` 없으면 같은 성분(${ing.slice(0, 3).map(x => koName(x) || x).join(', ')}) 제품도 괜찮아요.` : '');
  const thumb = x => { const u = imgOf(x); return `<span class="thumb">${u ? `<img src="${esc(u)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`; };

  const body = `
<nav class="crumb"><a href="/">약 검색</a> › ${esc(sname)}</nav>
<h1>${esc(name)}</h1>
<p class="sub">${esc(clean(d.ENTP_NAME))} · <span class="tag ${rx ? 'rx' : 'otc'}">${rx ? '전문의약품' : '일반의약품'}</span>${d.PRDUCT_TYPE ? ' · ' + esc(clean(d.PRDUCT_TYPE).replace(/\[\d+\]/, '')) : ''}</p>
${img ? `<a class="photo" href="${esc(img)}" target="_blank" rel="noopener"><img src="${esc(img)}" alt="${esc(sname)} 낱알 사진"></a><p class="cap">식약처 제공 낱알 사진 · 포장이나 색은 실제와 다를 수 있어요</p>` : ''}

<h2>성분</h2>
${ing.length ? `<div class="chips">${ing.map(x => `<span>${esc(showIngr(x))}</span>`).join('')}</div>` : '<p class="note">성분 정보가 없어요.</p>'}
${rx ? '<p class="box">전문의약품이라 처방전이 있어야 살 수 있어요. 처방전을 받았다면 약국에 이 약이 있는지 전화로 먼저 물어보세요.</p>' : ''}

<div class="box cta">
  <b>이 약, 지금 사러 가시나요?</b>
  <p class="note" style="margin:6px 0 10px">약국마다 갖춘 약이 달라요. 문 연 약국을 찾아 전화로 먼저 물어보세요.</p>
  <p style="margin:0 0 12px">“${esc(script)}”</p>
  <a class="btn red" href="/?q=${encodeURIComponent(sname)}">지금 문 연 약국 찾기</a>
</div>

${easy ? `<h2>효능과 먹는 법</h2>` + parts.filter(([, k]) => clean(easy[k])).map(([t, k]) => `<section class="sec"><h3>${t}</h3><p>${esc(clean(easy[k]))}</p></section>`).join('<br>') : ''}

<h2>같은 성분 제품 ${same.length ? `<small class="note">${same.length}개</small>` : ''}</h2>
${same.length ? `<ul class="list">${same.slice(0, 40).map(x => `<li><a class="it" href="/drug/${esc(x.ITEM_SEQ)}">${thumb(x)}<span><b>${esc(clean(x.ITEM_NAME))}</b><small>${esc(clean(x.ENTP_NAME))} · ${isRx(x) ? '전문' : '일반'}</small></span></a></li>`).join('')}</ul>
<p class="note">성분이 같아도 함량이나 제형(정·캡슐·시럽)이 다를 수 있어요. 바꿔 사기 전에 약사에게 꼭 확인하세요.</p>` : '<p class="note">성분 구성이 똑같은 다른 제품을 찾지 못했어요.</p>'}
<p class="note" style="margin-top:24px">품목기준코드 ${esc(seq)}${d.ITEM_PERMIT_DATE ? ` · 허가일 ${esc(d.ITEM_PERMIT_DATE.replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3'))}` : ''} · 자료: 식품의약품안전처</p>`;

  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Drug', name, url: `https://yakfind.vercel.app/drug/${seq}`,
    ...(img ? { image: img } : {}),
    activeIngredient: ing.join(', '),
    manufacturer: { '@type': 'Organization', name: clean(d.ENTP_NAME) },
    prescriptionStatus: rx ? 'https://schema.org/PrescriptionOnly' : 'https://schema.org/OTC',
    ...(efcy ? { description: efcy.slice(0, 300) } : {}),
  };
  sendHtml(res, 200, page({ title: `${sname} 성분·효능·같은 성분 약 | 이 약, 어디 있지?`, desc, path: `/drug/${seq}`, body, jsonld, image: img || undefined }), 2592000);
}

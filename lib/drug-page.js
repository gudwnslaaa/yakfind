// /drug/품목기준코드 → 약 상세 페이지 (검색엔진이 읽을 수 있게 서버에서 완성)
import { call, callAll, esc, clean, ingredients, ingrSet, koName, showIngr, queryIngr, isRx, alive, imgOf, shortName,
  page, sendHtml, notFound, failPage, getQuery, findPermit, durFor, groupTaboo, durText, nz, strengthOf, dupOf, travelRiskOf, TRAVEL_NOTICE } from './_lib.js';

const DUR_INFO = {
  임부금기: ['임신 중에는 먹으면 안 돼요', '임신했거나 임신 가능성이 있으면 의사·약사와 먼저 상의하세요.'],
  특정연령대금기: ['특정 나이에서는 먹으면 안 돼요', '주로 어린이에게 해당해요. 나이 기준은 약사에게 확인하세요.'],
  노인주의: ['어르신은 주의가 필요해요', '65세 이상은 부작용이 더 잘 생길 수 있어요.'],
  용량주의: ['하루 최대 용량을 넘기지 마세요', '같은 성분이 든 다른 약과 겹치지 않게 주의하세요.'],
  투여기간주의: ['오래 먹으면 안 되는 약이에요', '정해진 기간보다 오래 먹지 마세요.'],
  효능군중복: ['같은 종류 약을 겹쳐 먹지 마세요', '효능이 같은 약을 함께 먹으면 부작용 위험이 커져요.'],
  서방정분할주의: ['쪼개거나 씹어 먹지 마세요', '천천히 녹도록 만든 약이라 통째로 삼켜야 해요.'],
};
function durHtml(dur) {
  if (!dur) return '';
  const order = ['임부금기', '특정연령대금기', '노인주의', '용량주의', '투여기간주의', '효능군중복', '서방정분할주의'];
  const blocks = order.filter(t => dur.rows[t]).map(t => {
    const r = dur.rows[t]; const [head, sub] = DUR_INFO[t];
    const txt = [...new Set(r.map(durText).filter(Boolean))].slice(0, 3).join(' / ');
    const extra = t === '효능군중복' ? [...new Set(r.map(x => nz(x.EFFECT_NAME) || nz(x.SERS_NAME)).filter(Boolean))].join(', ') : [...new Set(r.map(x => nz(x.INGR_NAME) || nz(x.INGR_KOR_NAME)).filter(Boolean))].join(', ');
    return `<li class="dur"><b>⚠ ${esc(head)}</b><small>${esc(sub)}${extra ? ` · 해당 성분·분류: ${esc(extra)}` : ''}${txt ? `<br>${esc(txt)}` : ''}</small></li>`;
  });
  const taboo = dur.rows['병용금기'] ? groupTaboo(dur.rows['병용금기']) : [];
  if (!blocks.length && !taboo.length) return `<h2>먹을 때 주의할 점</h2><p class="note">식약처 DUR(의약품 안전사용 정보)에 등록된 금기·주의 사항이 없어요. 그래도 다른 약과 함께 먹을 땐 약사에게 물어보세요.</p>`;
  return `<h2>먹을 때 주의할 점 <small class="note">식약처 DUR</small></h2>
${blocks.length ? `<ul class="list">${blocks.join('')}</ul>` : ''}
${taboo.length ? `<h3 style="margin-top:18px">같이 먹으면 안 되는 성분 ${taboo.length}가지</h3>
<ul class="list">${taboo.slice(0, 30).map(g => `<li class="dur"><b>${esc(g.ingr)}</b><small>${g.why ? esc(g.why) : ''}${g.items.length ? `<br>예: ${g.items.map(x => x.seq ? `<a href="/drug/${esc(x.seq)}">${esc(x.name)}</a>` : esc(x.name)).join(', ')}` : ''}</small></li>`).join('')}</ul>
${taboo.length > 30 ? `<p class="note">외 ${taboo.length - 30}가지가 더 있어요.</p>` : ''}` : ''}
<p class="note"><a href="/check">먹고 있는 다른 약과 같이 먹어도 되는지 확인하기 →</a></p>`;
}

export default async function handler(req, res) {
  const seq = String(getQuery(req).seq || '').replace(/\D/g, '').slice(0, 12);
  if (!seq) return notFound(res, '품목코드가 없어요.');
  let d, easy = null, same = [], dur = null, recalls = [], str = [];
  try {
    d = await findPermit(seq);
    if (!d) {
      // 마스크·거즈 같은 의약외품은 허가정보에 없어서, 회수 이력이 있으면 회수 안내만 보여줌
      const base = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.headers.host}`;
      const rc = await fetch(`${base}/api/recall?seqs=${seq}`, { signal: AbortSignal.timeout(20000) }).then(r => r.json()).catch(() => null);
      const list = rc && rc.ok ? rc.items : [];
      if (!list.length) return notFound(res, '이 품목코드의 약을 찾지 못했어요. 허가가 취소됐거나 주소가 잘못됐을 수 있어요.');
      const r0 = list[0];
      const body = `<nav class="crumb"><a href="/recall">회수·판매중지 약</a> › ${esc(r0.name)}</nav>
<h1>${esc(r0.name)}</h1><p class="sub">${esc(r0.entp)} · 의약외품 등 (의약품 허가정보에 없는 제품)</p>
<div class="box" style="background:var(--redbg);border-left:6px solid var(--red)"><b>⚠ 회수·판매중지된 제품이에요</b><p class="note" style="margin:6px 0 0;color:var(--ink)">${list.map(r => `${esc(r.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3'))} · ${esc(r.reason || '사유 비공개')}${r.lot ? ` · <b>제조번호 ${esc(r.lot)}</b>` : ''}${r.useBy ? ` · 사용기한 ${esc(r.useBy)}` : ''}`).join('<br>')}<br>갖고 있는 제품의 제조번호가 같을 때만 해당돼요. 같다면 쓰지 말고 산 곳에 문의하세요.</p></div>
<p><a class="btn" href="/recall">회수 목록 전체 보기</a></p>`;
      return sendHtml(res, 200, page({ title: `${r0.name} 회수·판매중지 정보 | 이 약, 어디 있지?`, desc: `${r0.name} 회수·판매중지 이유와 제조번호를 확인하세요.`, path: `/drug/${seq}`, body, noindex: true }), 21600);
    }
    const ing = ingredients(d);
    const base = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.headers.host}`;
    const [e, s, du, rc, st] = await Promise.all([
      isRx(d) ? null : call('easy', { itemSeq: seq, numOfRows: 1, type: 'json' }).catch(() => null),
      ing.length ? callAll('permit', { item_ingr_name: queryIngr(ing), type: 'json' }, 100, 5, 5).catch(() => null) : null,
      durFor(seq).catch(() => null),
      fetch(`${base}/api/recall?seqs=${seq}`, { signal: AbortSignal.timeout(20000) }).then(r => r.json()).catch(() => null),
      strengthOf(seq).catch(() => []),
    ]);
    str = st || [];
    dur = du; recalls = rc && rc.ok ? rc.items : [];
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
  const strTxt = str.slice(0, 4).map(x => `${x.name} ${x.amt}${x.unit}`).join(', ');
  const script = `안녕하세요, ${sname} 있나요?` + (ing.length && !rx ? ` 없으면 ${strTxt ? `같은 성분·같은 함량(${strTxt})` : `같은 성분(${ing.slice(0, 3).map(x => koName(x) || x).join(', ')})`} 제품이 있는지 알려 주세요.` : '');
  const dups = dupOf(ing), risks = travelRiskOf(ing);
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10).replace(/-/g, '.');
  const faq = [
    [`${sname}은(는) 처방전 없이 살 수 있나요?`, rx ? '아니요. 전문의약품이라 의사의 처방이 있어야 약국에서 받을 수 있어요.' : '네. 일반의약품이라 약국에서 처방전 없이 살 수 있어요. 먹기 전에 약사에게 먹는 법을 확인하세요.'],
    [`${sname}의 성분과 함량은?`, str.length ? `${str[0].per ? str[0].per + '에 ' : ''}${str.map(x => `${x.name} ${x.amt}${x.unit}`).join(', ')}이(가) 들어 있어요.` : (ing.length ? `${ing.map(x => koName(x) || x).join(', ')}이(가) 들어 있어요.` : '성분 정보가 없어요.')],
    [`${sname}과(와) 같은 성분 약은?`, same.length ? `성분 구성이 같은 제품이 ${same.length}개 있어요(예: ${same.slice(0, 3).map(x => shortName(clean(x.ITEM_NAME))).join(', ')}). 함량·제형이 다를 수 있으니 바꿔 먹기 전에 약사에게 확인하세요.` : '성분 구성이 똑같은 다른 제품은 찾지 못했어요.'],
    ...(dups.length ? [[`${sname}을(를) 다른 감기약·진통제와 같이 먹어도 되나요?`, `${dups.join(', ')}은(는) 여러 감기약·진통제에 들어 있는 성분이에요. 다른 약과 함께 먹으면 같은 성분을 두 번 먹게 될 수 있으니, 성분이 겹치는지 먼저 확인하세요.`]] : []),
  ];
  const thumb = x => { const u = imgOf(x); return `<span class="thumb">${u ? `<img src="${esc(u)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`; };

  const body = `
<nav class="crumb"><a href="/">약 검색</a> › ${esc(sname)}</nav>
<h1>${esc(name)}</h1>
${recalls.length ? `<div class="box" style="background:var(--redbg);border-left:6px solid var(--red)"><b>⚠ 이 약은 회수·판매중지 목록에 있어요</b><p class="note" style="margin:6px 0 0;color:var(--ink)">${recalls.slice(0, 5).map(r => `${esc(r.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3'))} · ${esc(r.reason || '사유 비공개')}${r.lot ? ` · <b>제조번호 ${esc(r.lot)}</b>` : ''}`).join('<br>')}<br>갖고 있는 약의 포장에 적힌 제조번호가 같을 때만 해당돼요. 같다면 먹지 말고 산 약국에 문의하세요. <a href="/recall">회수 목록 전체 보기</a></p></div>` : ''}
<p class="sub">${esc(clean(d.ENTP_NAME))} · <span class="tag ${rx ? 'rx' : 'otc'}">${rx ? '전문의약품' : '일반의약품'}</span>${d.PRDUCT_TYPE ? ' · ' + esc(clean(d.PRDUCT_TYPE).replace(/\[\d+\]/, '')) : ''}</p>
${img ? `<a class="photo" href="${esc(img)}" target="_blank" rel="noopener"><img src="${esc(img)}" alt="${esc(sname)} 낱알 사진"></a><p class="cap">식약처 제공 낱알 사진 · 포장이나 색은 실제와 다를 수 있어요</p>` : ''}

<h2>성분</h2>
${ing.length ? `<div class="chips">${ing.map(x => koName(x) ? `<a href="/ingredient/${encodeURIComponent(koName(x))}" style="background:var(--paper);border-radius:8px;padding:4px 10px;font-weight:500">${esc(showIngr(x))} →</a>` : `<span>${esc(showIngr(x))}</span>`).join('')}</div>` : '<p class="note">성분 정보가 없어요.</p>'}
${str.length ? `<div class="box" style="margin-top:10px"><b>${esc(str[0].per ? str[0].per + '에 든 양' : '들어 있는 양')}</b><ul style="margin:6px 0 0;padding-left:18px">${str.map(x => `<li>${esc(x.name)} <b>${esc(x.amt + x.unit)}</b></li>`).join('')}</ul></div>` : ''}
${dups.length ? `<div class="box" style="background:var(--warnbg);border-left:6px solid var(--warn)"><b>⚠ 다른 약과 성분이 겹치기 쉬워요</b><p class="note" style="margin:6px 0 0;color:var(--ink)"><b>${esc(dups.join(', '))}</b>은(는) 여러 감기약·진통제에 함께 들어 있어요. 이 약과 다른 약을 같이 먹으면 같은 성분을 두 번 먹게 될 수 있어요. <a href="/check?seqs=${esc(seq)}">먹는 약과 겹치는지 확인하기 →</a></p></div>` : ''}
${risks.length ? `<div class="box" style="background:var(--redbg);border-left:6px solid var(--red)"><b>✈ 해외여행 주의</b><p class="note" style="margin:6px 0 0;color:var(--ink)">이 약의 <b>${esc(risks.join(', '))}</b> 성분은 일본 등 일부 나라에서 반입이 제한되거나 사전 허가가 필요해요. 여행 전에 <a href="${TRAVEL_NOTICE}" target="_blank" rel="noopener">외교부 재외공관 안내</a>와 가는 나라의 규정을 확인하세요.</p></div>` : ''}
${rx ? '<p class="box">전문의약품이라 처방전이 있어야 살 수 있어요. 처방전을 받았다면 약국에 이 약이 있는지 전화로 먼저 물어보세요.</p>' : ''}

<div class="box cta">
  <b>이 약, 지금 사러 가시나요?</b>
  <p class="note" style="margin:6px 0 10px">약국마다 갖춘 약이 달라요. 문 연 약국을 찾아 전화로 먼저 물어보세요.</p>
  <p style="margin:0 0 12px">“${esc(script)}”</p>
  <a class="btn red" href="/?q=${encodeURIComponent(sname)}">지금 문 연 약국 찾기</a>
</div>
<p style="display:flex;gap:8px;flex-wrap:wrap;margin:14px 0"><button class="btn" type="button" id="boxBtn">★ 우리 집 약 상자에 넣기</button><a class="btn" href="/check?seqs=${esc(seq)}">같이 먹어도 되나요?</a><a class="btn" href="/travel?seqs=${esc(seq)}">✈ 해외용 영문 약 카드</a></p>
<script>{const b=document.getElementById('boxBtn'),K='yak_mine',seq=${JSON.stringify(String(seq))},nm=${JSON.stringify(String(sname)).replace(/</g, "\\u003c")};
const get=()=>{try{return JSON.parse(localStorage.getItem(K))||[]}catch(e){return[]}};const on=()=>get().some(x=>x.seq===seq);
const draw=()=>{b.textContent=on()?'★ 약 상자에 있어요 (약 상자 열기)':'☆ 우리 집 약 상자에 넣기'};draw();
b.addEventListener('click',()=>{if(on()){location.href='/mybox';return}const a=get();a.unshift({seq,name:nm,who:'나',at:Date.now()});try{localStorage.setItem(K,JSON.stringify(a.slice(0,80)))}catch(e){}draw()});}</script>

${easy ? `<h2>효능과 먹는 법</h2>` + parts.filter(([, k]) => clean(easy[k])).map(([t, k]) => `<section class="sec"><h3>${t}</h3><p>${esc(clean(easy[k]))}</p></section>`).join('<br>') : ''}

${durHtml(dur)}

<h2>같은 성분 제품 ${same.length ? `<small class="note">${same.length}개</small>` : ''}</h2>
${same.length ? `<ul class="list">${same.slice(0, 40).map(x => `<li><a class="it" href="/drug/${esc(x.ITEM_SEQ)}">${thumb(x)}<span><b>${esc(clean(x.ITEM_NAME))}</b><small>${esc(clean(x.ENTP_NAME))} · ${isRx(x) ? '전문' : '일반'}</small></span></a></li>`).join('')}</ul>
<p class="note">성분이 같아도 함량이나 제형(정·캡슐·시럽)이 다를 수 있어요. 바꿔 사기 전에 약사에게 꼭 확인하세요.</p>` : '<p class="note">성분 구성이 똑같은 다른 제품을 찾지 못했어요.</p>'}
<h2>자주 묻는 질문</h2>
${faq.map(([q, a]) => `<details class="sec" style="margin-bottom:8px"><summary><b>${esc(q)}</b></summary><p style="margin:8px 0 0">${esc(a)}</p></details>`).join('')}
<p class="note" style="margin-top:24px">자료: 식품의약품안전처 의약품 허가정보·의약품개요정보(e약은요)·DUR · 정보 확인 ${today} · 이 페이지는 정보 안내이며 진료·복약지도를 대신하지 않아요.<br>품목기준코드 ${esc(seq)}${d.ITEM_PERMIT_DATE ? ` · 허가일 ${esc(d.ITEM_PERMIT_DATE.replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3'))}` : ''} · 자료: 식품의약품안전처</p>`;

  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Drug', name, url: `https://yakfind.vercel.app/drug/${seq}`,
    ...(img ? { image: img } : {}),
    activeIngredient: ing.join(', '),
    manufacturer: { '@type': 'Organization', name: clean(d.ENTP_NAME) },
    prescriptionStatus: rx ? 'https://schema.org/PrescriptionOnly' : 'https://schema.org/OTC',
    ...(efcy ? { description: efcy.slice(0, 300) } : {}),
  };
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  if (str.length) jsonld.activeIngredient = str.map(x => `${x.name} ${x.amt}${x.unit}`).join(', ');
  sendHtml(res, 200, page({ title: `${sname} 성분·효능·같은 성분 약 | 이 약, 어디 있지?`, desc, path: `/drug/${seq}`, body, jsonld: [jsonld, faqLd], image: img || undefined }), 2592000);
}

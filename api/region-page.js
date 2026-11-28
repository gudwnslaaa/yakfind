// /pharmacy, /pharmacy/시도, /pharmacy/시도/시군구 → 지역별 약국 영업시간 페이지
import { callAll, esc, clean, realTel, dedupe, DAYS, hoursOf, isLate, is24, SIDO, OLD_SIDO, sidoNames, regionOf, page, sendHtml, notFound, failPage, getQuery } from './_lib.js';

const dec = v => { try { return decodeURIComponent(String(v || '')); } catch { return String(v || ''); } };
const WEEK = 604800;

async function fetchArea(sido, gu) {
  const all = [];
  for (const name of sidoNames(sido)) {
    const params = { Q0: name, ORD: 'NAME' };
    if (gu) params.Q1 = gu;
    const d = await callAll('area', params, 500, gu ? 6 : 30, 6);
    all.push(...d.items);
  }
  const seen = new Set();
  return dedupe(all.filter(p => p.HPID ? !seen.has(p.HPID) && seen.add(p.HPID) : true));
}

function card(p) {
  const h = hoursOf(p);
  const sun = !!h[6], hol = !!h[7], late = h.slice(0, 5).some(isLate), all24 = h.slice(0, 7).some(is24);
  const tel = realTel(p.DUTYTEL1), name = clean(p.DUTYNAME), addr = clean(p.DUTYADDR);
  const lat = parseFloat(p.WGS84LAT), lon = parseFloat(p.WGS84LON);
  const map = !isNaN(lat) && !isNaN(lon) ? `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lon}` : `https://map.naver.com/p/search/${encodeURIComponent(name + ' ' + addr.split(' ').slice(0, 2).join(' '))}`;
  const data = h.map(x => x ? `${x.s}-${x.c}` : '').join('|');
  return `<li class="ph" data-sun="${sun ? 1 : 0}" data-hol="${hol ? 1 : 0}" data-late="${late ? 1 : 0}" data-h24="${all24 ? 1 : 0}" data-h="${esc(data)}">
  <div class="hd"><h3>${esc(name)}</h3><span class="badges"><span class="tag now closed" hidden></span>${all24 ? '<span class="tag late">24시간</span>' : late ? '<span class="tag late">밤 10시 이후</span>' : ''}${sun ? '<span class="tag otc">일요일 영업</span>' : ''}${hol ? '<span class="tag otc">공휴일 영업</span>' : ''}</span></div>
  <div class="addr">${esc(addr)}</div>
  <div class="hrs">${DAYS.map((d, i) => `<div class="${h[i] ? '' : 'off'}" data-d="${i}"><b>${d}</b>${h[i] ? esc(h[i].text).replace('~', '~<wbr>') : '휴무'}</div>`).join('')}</div>
  <div class="acts">${tel ? `<a class="btn red" href="tel:${esc(tel.replace(/[^\d]/g, ''))}">전화 ${esc(tel)}</a>` : ''}<a class="btn" href="${esc(map)}" target="_blank" rel="noopener">지도 보기</a></div>
</li>`;
}

const CLIENT = `<script>{
const H=new Set(['2026-12-25','2027-01-01','2027-02-06','2027-02-07','2027-02-08','2027-02-09','2027-03-01','2027-05-01','2027-05-03','2027-05-05','2027-05-13','2027-06-06','2027-07-17','2027-07-19','2027-08-15','2027-08-16','2027-09-14','2027-09-15','2027-09-16','2027-10-03','2027-10-04','2027-10-09','2027-10-11','2027-12-25','2027-12-27']);
const n=new Date(),ymd=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');
const qi=H.has(ymd)?7:(n.getDay()+6)%7, m=n.getHours()*60+n.getMinutes();
const tm=t=>{t=String(t).replace(/\\D/g,'');if(t.length<3)return null;t=t.padStart(4,'0');return +t.slice(0,2)*60+ +t.slice(2)};
for(const li of document.querySelectorAll('.ph')){
  const h=li.dataset.h.split('|')[qi]; const cell=li.querySelector('[data-d="'+qi+'"]'); if(cell)cell.classList.add('today');
  let open=false,left=null; if(h){const [s,c]=h.split('-').map(tm); if(s!==null&&c!==null){open=c>s?(m>=s&&m<c):(m>=s||m<c); left=(c-m+1440)%1440;}}
  li.dataset.open=open?1:0; const b=li.querySelector('.now'); b.hidden=false;
  if(open&&left<=30){b.className='tag now soon';b.textContent='곧 마감 · '+left+'분 남음'}else if(open){b.className='tag now open';b.textContent='지금 영업 중'}else{b.className='tag now closed';b.textContent='지금 영업 안 함'}
}
const f=document.querySelector('.filters'); if(f) f.addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b)return;
  for(const x of f.children)x.classList.toggle('on',x===b);const k=b.dataset.f;let c=0;
  for(const li of document.querySelectorAll('.ph')){const ok=k==='all'||li.dataset[k]==='1';li.hidden=!ok;if(ok)c++}
  document.querySelector('#shown').textContent=c+'곳'});
}</script>`;

function listPage(res, sido, label, slug, items) {
  const h = items.map(hoursOf);
  const nSun = h.filter(x => x[6]).length, nHol = h.filter(x => x[7]).length, nLate = h.filter(x => x.slice(0, 5).some(isLate)).length;
  const place = label ? `${sido} ${label}` : sido;
  const short = label || sido;
  const body = `
<nav class="crumb"><a href="/pharmacy">지역별 약국</a> › ${label ? `<a href="/pharmacy/${encodeURIComponent(sido)}">${esc(sido)}</a> › ${esc(label)}` : esc(sido)}</nav>
<h1>${esc(short)} 약국 영업시간</h1>
<p class="sub">${esc(place)}의 약국 ${items.length}곳을 요일별 영업시간과 함께 모았어요. 오늘 요일은 빨간 테두리로 표시돼요.</p>
<div class="stats"><div><b>${items.length}</b>전체 약국</div><div><b>${nSun}</b>일요일 영업</div><div><b>${nHol}</b>공휴일 영업</div><div><b>${nLate}</b>평일 밤 10시 이후</div></div>
<div class="filters" role="group" aria-label="약국 거르기">
  <button type="button" class="fchip on" data-f="all">전체</button><button type="button" class="fchip" data-f="open">지금 영업 중</button>
  <button type="button" class="fchip" data-f="sun">일요일</button><button type="button" class="fchip" data-f="hol">공휴일</button>
  <button type="button" class="fchip" data-f="late">밤 10시 이후</button><button type="button" class="fchip" data-f="h24">24시간</button>
  <span class="note" style="align-self:center">보이는 약국 <b id="shown">${items.length}곳</b></span>
</div>
<ul class="list">${items.map(card).join('')}</ul>
<p class="note" style="margin-top:20px">영업시간은 약국이 국립중앙의료원에 신고한 정보예요. 시간이 등록되지 않은 요일은 휴무로 표시했어요. 임시 휴무나 시간 변경은 반영되지 않을 수 있으니 방문 전에 전화로 확인하세요.</p>
${CLIENT}`;
  const jsonld = { '@context': 'https://schema.org', '@type': 'ItemList', name: `${place} 약국`, numberOfItems: items.length,
    itemListElement: items.slice(0, 100).map((p, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'Pharmacy', name: clean(p.DUTYNAME), telephone: realTel(p.DUTYTEL1) || undefined,
      address: clean(p.DUTYADDR), ...(p.WGS84LAT ? { geo: { '@type': 'GeoCoordinates', latitude: +p.WGS84LAT, longitude: +p.WGS84LON } } : {}) } })) };
  const path = '/pharmacy/' + encodeURIComponent(sido) + (slug ? '/' + encodeURIComponent(slug) : '');
  sendHtml(res, 200, page({ title: `${short} 약국 ${items.length}곳 영업시간 — 일요일·공휴일·심야 약국 | 이 약, 어디 있지?`,
    desc: `${place} 약국 ${items.length}곳의 요일별 영업시간. 일요일 영업 ${nSun}곳, 공휴일 영업 ${nHol}곳, 평일 밤 10시 이후 ${nLate}곳. 전화번호와 지도까지 한 번에 확인하세요.`,
    path, body, jsonld }), WEEK);
}

export default async function handler(req, res) {
  const q = getQuery(req);
  const sido = dec(q.sido).trim(), slug = dec(q.gu).trim();

  // 1) 전국 → 시·도 목록
  if (!sido) {
    const body = `<h1>지역별 약국 영업시간</h1><p class="sub">시·도를 고르면 시·군·구별로 약국의 요일별 영업시간과 일요일·공휴일·심야 영업 여부를 볼 수 있어요.</p>
<h2>시·도</h2><ul class="grid">${SIDO.map(s => `<li><a href="/pharmacy/${encodeURIComponent(s)}">${esc(s)}</a></li>`).join('')}</ul>`;
    return sendHtml(res, 200, page({ title: '지역별 약국 영업시간 — 일요일·공휴일·심야 약국 찾기 | 이 약, 어디 있지?', desc: '전국 시·군·구별 약국 영업시간을 요일별로 확인하세요. 일요일·공휴일·밤 늦게 여는 약국을 한눈에 볼 수 있어요.', path: '/pharmacy', body }), WEEK);
  }
  if (OLD_SIDO[sido]) { // 옛 이름 주소는 새 이름 주소로 옮김
    res.statusCode = 301; res.setHeader('Location', '/pharmacy/' + encodeURIComponent(OLD_SIDO[sido]) + (slug ? '/' + encodeURIComponent(slug) : '')); res.setHeader('Cache-Control', 'public, s-maxage=604800'); return res.end();
  }
  if (!SIDO.includes(sido)) return notFound(res, `'${sido}'은(는) 시·도 이름이 아니에요.`);

  try {
    // 2) 시·도 → 시·군·구 목록
    if (!slug) {
      const items = await fetchArea(sido);
      const groups = new Map();
      for (const p of items) {
        const r = regionOf(p.DUTYADDR); if (!r) continue;
        const g = groups.get(r.slug) || { ...r, n: 0, sun: 0 }; g.n++; if (hoursOf(p)[6]) g.sun++; groups.set(r.slug, g);
      }
      if (!groups.size) return listPage(res, sido, '', '', items); // 세종처럼 시·군·구가 없는 곳
      const list = [...groups.values()].sort((a, b) => a.label.localeCompare(b.label, 'ko'));
      const body = `<nav class="crumb"><a href="/pharmacy">지역별 약국</a> › ${esc(sido)}</nav>
<h1>${esc(sido)} 약국 영업시간</h1><p class="sub">${esc(sido)} 약국 ${items.length}곳을 시·군·구별로 나눴어요. 숫자는 약국 수, 괄호는 일요일에 여는 약국 수예요.</p>
<ul class="grid" style="margin-top:18px">${list.map(g => `<li><a href="/pharmacy/${encodeURIComponent(sido)}/${encodeURIComponent(g.slug)}"><span>${esc(g.label)}</span><small>${g.n}곳 (${g.sun})</small></a></li>`).join('')}</ul>`;
      return sendHtml(res, 200, page({ title: `${sido} 약국 영업시간 — 시·군·구별 일요일·심야 약국 | 이 약, 어디 있지?`,
        desc: `${sido} 약국 ${items.length}곳의 영업시간을 시·군·구별로 확인하세요. 일요일·공휴일·밤 늦게 여는 약국을 찾을 수 있어요.`, path: '/pharmacy/' + encodeURIComponent(sido), body }), WEEK);
    }

    // 3) 시·군·구 → 약국 목록
    const label = slug.replace(/-/g, ' ');
    const qword = label.split(' ').pop();
    const items = (await fetchArea(sido, qword)).filter(p => { const r = regionOf(p.DUTYADDR); return r ? r.label === label : clean(p.DUTYADDR).includes(label); });
    if (!items.length) return notFound(res, `${sido} ${label}에서 약국을 찾지 못했어요.`);
    return listPage(res, sido, label, slug, items);
  } catch (e) {
    return failPage(res, e.message);
  }
}

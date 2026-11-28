// /moonlight → 전국 달빛어린이병원·소아전문센터 (밤·휴일 소아 진료)
import { esc, clean, DAYS, fmt, OLD_SIDO, page, sendHtml, failPage, notFound, getQuery } from './_lib.js';
import { babyList } from './_clinic.js';

const HOL = "['2026-12-25','2027-01-01','2027-02-06','2027-02-07','2027-02-08','2027-02-09','2027-03-01','2027-05-01','2027-05-03','2027-05-05','2027-05-13','2027-06-06','2027-07-17','2027-07-19','2027-08-15','2027-08-16','2027-09-14','2027-09-15','2027-09-16','2027-10-03','2027-10-04','2027-10-09','2027-10-11','2027-12-25','2027-12-27']";
const txt = h => { if (!h) return '휴진'; const [s, c] = h.split('-'); return `${fmt(s)}~<wbr>${fmt(c)}`; };
const late = h => h && +h.split('-')[1] >= 2000;
// 지역 주소: 시·도(/moonlight/서울)와 도 안의 시·군(/moonlight/수원)
export const SHORT = { 서울특별시: '서울', 부산광역시: '부산', 대구광역시: '대구', 인천광역시: '인천', 전남광주통합특별시: '광주', 대전광역시: '대전', 울산광역시: '울산', 세종특별자치시: '세종', 경기도: '경기', 강원특별자치도: '강원', 충청북도: '충북', 충청남도: '충남', 전북특별자치도: '전북', 경상북도: '경북', 경상남도: '경남', 제주특별자치도: '제주' };
const LABEL = { 광주: '광주·전남' };
const ALIAS = { 전남: '광주' };
export function regionOfBaby(x) {
  const t = clean(x.addr).split(' '); const sido = OLD_SIDO[t[0]] || t[0]; const ss = SHORT[sido];
  let city = null, cityLabel = null;
  if (t[1] && /[시군]$/.test(t[1]) && !/구$/.test(t[1])) { city = t[1].replace(/[시군]$/, ''); cityLabel = t[1]; if (Object.values(SHORT).includes(city)) { city = ss + city; cityLabel = ss + ' ' + cityLabel; } }
  return { sido, ss, city, cityLabel };
}
export function babyRegions(list) {
  const map = new Map();
  for (const x of list) { const r = regionOfBaby(x); if (!r.ss) continue;
    if (!map.has(r.ss)) map.set(r.ss, { slug: r.ss, label: LABEL[r.ss] || r.ss, n: 0, sido: r.sido, kind: 'sido' }); map.get(r.ss).n++;
    if (r.city) { if (!map.has(r.city)) map.set(r.city, { slug: r.city, label: r.cityLabel, short: r.cityLabel.replace(/^\S+ /, ''), n: 0, parent: r.ss, kind: 'city' }); map.get(r.city).n++; } }
  return map;
}

export default async function handler(req, res) {
  try {
    const all = await babyList();
    let region = String(getQuery(req).region || '').trim(); region = ALIAS[region] || region;
    const regs = babyRegions(all);
    const cur = region ? regs.get(region) : null;
    if (region && !cur) return notFound(res, `'${region}' 지역의 달빛어린이병원을 찾지 못했어요.`);
    const list = cur ? all.filter(x => { const r = regionOfBaby(x); return cur.kind === 'sido' ? r.ss === cur.slug : r.city === cur.slug; }) : all;
    const sidos = [...regs.values()].filter(r => r.kind === 'sido').sort((a, b) => a.label.localeCompare(b.label, 'ko'));
    const cities = cur ? [...regs.values()].filter(r => r.kind === 'city' && r.parent === (cur.kind === 'sido' ? cur.slug : cur.parent)).sort((a, b) => b.n - a.n) : [];
    const chip = (r, on) => `<a class="fchip${on ? ' on' : ''}" style="display:inline-flex;align-items:center;text-decoration:none;flex:none" href="/moonlight/${encodeURIComponent(r.slug)}">${esc(r.short || r.label)} ${r.n}</a>`;
    const where = cur ? cur.label : '';
    const groups = new Map();
    for (const x of list) { let s = x.addr.split(' ')[0] || '기타'; s = OLD_SIDO[s] || s; if (!groups.has(s)) groups.set(s, []); groups.get(s).push(x); }
    const order = [...groups.keys()].sort((a, b) => a.localeCompare(b, 'ko'));
    const nNight = list.filter(x => x.h.slice(0, 5).some(late)).length, nSun = list.filter(x => x.h[6]).length, nHol = list.filter(x => x.h[7]).length;
    const card = x => {
      const map = x.lat ? `https://map.kakao.com/link/map/${encodeURIComponent(x.name)},${x.lat},${x.lon}` : `https://map.naver.com/p/search/${encodeURIComponent(x.name)}`;
      return `<li class="ph" data-h="${esc(x.h.join('|'))}" data-lat="${esc(x.lat || '')}" data-lon="${esc(x.lon || '')}">
<div class="hd"><h3>${esc(x.name)}</h3><span class="badges"><span class="tag now closed" hidden></span>${x.h[6] ? '<span class="tag otc">일요일</span>' : ''}${x.h[7] ? '<span class="tag otc">공휴일</span>' : ''}</span></div>
<div class="addr">${esc(x.addr)} <span class="dist"></span></div>
<div class="hrs">${DAYS.map((d, i) => `<div class="${x.h[i] ? '' : 'off'}" data-d="${i}"><b>${d}</b>${x.h[i] ? txt(x.h[i]) : '휴진'}</div>`).join('')}</div>
${x.note ? `<p class="note" style="margin:0 0 8px">${esc(x.note)}</p>` : ''}
<div class="acts">${x.tel ? `<a class="btn red" href="tel:${esc(x.tel.replace(/[^\d]/g, ''))}">전화 ${esc(x.tel)}</a>` : ''}<a class="btn" href="${esc(map)}" target="_blank" rel="noopener">지도 보기</a><button class="rep" type="button" data-report="${esc(x.name + ' (' + x.addr + ')')}">정보가 틀려요</button></div></li>`;
    };
    const body = `
<nav class="crumb"><a href="/">약 검색</a> › ${cur ? `<a href="/moonlight">달빛어린이병원</a> › ${cur.kind === 'city' ? `<a href="/moonlight/${encodeURIComponent(cur.parent)}">${esc(regs.get(cur.parent).label)}</a> › ${esc(cur.short)}` : esc(cur.label)}` : '달빛어린이병원'}</nav>
<h1>${cur ? esc(where) + ' ' : ''}달빛어린이병원${cur ? '' : '·소아전문센터'}</h1>
<p class="sub">밤이나 휴일에 아이가 아플 때 응급실 대신 갈 수 있는 ${cur ? esc(where) + ' ' : ''}소아 진료 병원 ${list.length}곳이에요. 평일 밤(오후 8시 이후) 진료 ${nNight}곳, 일요일 ${nSun}곳, 공휴일 ${nHol}곳이에요.</p>
<div class="box" style="background:var(--redbg);border-left:6px solid var(--red)"><b>숨쉬기 힘들어하거나, 의식이 흐리거나, 경련이 멈추지 않으면 바로 119</b><p style="margin:8px 0 0"><a class="btn red" href="tel:119">119 전화</a> <a class="btn" href="/er">가까운 응급실</a></p></div>
<p class="note" style="margin:12px 0 0">해열제 먹이는 간격이 헷갈리면 → <a href="/fever"><b>아이 해열제 교차복용 정리·먹인 시간 기록</b></a></p>
<p style="margin:16px 0"><button class="btn red" id="mgeo" type="button">내 위치에서 가까운 순으로 보기</button> <button class="btn" id="mopen" type="button">지금 진료 중인 곳만</button> <span class="note" id="mmsg"></span></p>
<nav class="scroll" aria-label="지역별 보기" style="display:flex;gap:8px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:6px;margin-bottom:8px;scrollbar-width:thin">${cur ? `<a class="fchip" style="display:inline-flex;align-items:center;text-decoration:none;flex:none" href="/moonlight">전국 ${all.length}</a>` : ''}${sidos.map(r => chip(r, cur && (cur.slug === r.slug || cur.parent === r.slug))).join('')}</nav>
${cities.length ? `<nav class="scroll" aria-label="시·군별 보기" style="display:flex;gap:8px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:6px;margin-bottom:8px">${cities.map(r => chip(r, cur.slug === r.slug)).join('')}</nav>` : ''}
<div id="mall">${order.map((s, i) => `<section id="s${i}"><h2>${esc(s)} <small class="note">${groups.get(s).length}곳${!cur && SHORT[s] ? ` · <a href="/moonlight/${encodeURIComponent(SHORT[s])}">${esc(LABEL[SHORT[s]] || SHORT[s])} 페이지 →</a>` : ''}</small></h2><ul class="list">${groups.get(s).map(card).join('')}</ul></section>`).join('')}</div>
<ul class="list" id="mnear" hidden></ul>
<p class="note" style="margin-top:20px">진료시간은 병원이 국립중앙의료원에 신고한 정보예요. 접수 마감이 진료 종료보다 이를 수 있으니 가기 전에 꼭 전화로 확인하세요. 자료: 국립중앙의료원 전국 병·의원 찾기 서비스.</p>
<script>{
const H=new Set(${HOL});const n=new Date(),ymd=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');
const qi=H.has(ymd)?7:(n.getDay()+6)%7,m=n.getHours()*60+n.getMinutes();
const tm=t=>{t=String(t).replace(/\\D/g,'');if(t.length<3)return null;t=t.padStart(4,'0');return +t.slice(0,2)*60+ +t.slice(2)};
const lis=[...document.querySelectorAll('.ph')];
for(const li of lis){const h=li.dataset.h.split('|')[qi];const c=li.querySelector('[data-d="'+qi+'"]');if(c)c.classList.add('today');let open=false,left=null;
  if(h){const [s,e]=h.split('-').map(tm);if(s!==null&&e!==null){open=e>s?(m>=s&&m<e):(m>=s||m<e);left=(e-m+1440)%1440}}
  li.dataset.open=open?1:0;const b=li.querySelector('.now');b.hidden=false;
  if(open&&left<=30){b.className='tag now soon';b.textContent='곧 마감 · '+left+'분'}else if(open){b.className='tag now open';b.textContent='지금 진료 중'}else{b.className='tag now closed';b.textContent='지금 진료 안 함'}}
let onlyOpen=false;const apply=()=>{for(const li of lis)li.hidden=onlyOpen&&li.dataset.open!=='1'};
document.getElementById('mopen').addEventListener('click',e=>{onlyOpen=!onlyOpen;e.currentTarget.classList.toggle('ink',onlyOpen);apply()});
const rad=x=>x*Math.PI/180,dist=(a,b,c,d)=>{const R=6371,x=rad(c-a),y=rad(d-b),h=Math.sin(x/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
document.getElementById('mgeo').addEventListener('click',()=>{const msg=document.getElementById('mmsg');if(!navigator.geolocation){msg.textContent='위치 기능을 쓸 수 없어요.';return}msg.textContent='위치 확인 중…';
  navigator.geolocation.getCurrentPosition(p=>{const la=p.coords.latitude,lo=p.coords.longitude;const arr=lis.filter(li=>li.dataset.lat).map(li=>[dist(la,lo,+li.dataset.lat,+li.dataset.lon),li]).sort((a,b)=>a[0]-b[0]).slice(0,20);
    const ul=document.getElementById('mnear');ul.innerHTML='';for(const [d,li] of arr){const c=li.cloneNode(true);c.querySelector('.dist').textContent='· '+(d<1?Math.round(d*1000)+'m':d.toFixed(1)+'km');ul.appendChild(c)}
    ul.hidden=false;document.getElementById('mall').hidden=true;lis.splice(0,lis.length,...ul.children);apply();msg.textContent='가까운 20곳이에요.'},()=>{msg.textContent='위치를 확인하지 못했어요.'},{timeout:10000,maximumAge:120000})});
}</script>`;
    const names = list.slice(0, 3).map(x => x.name).join(', ');
    sendHtml(res, 200, page({ title: cur ? `${where} 달빛어린이병원 ${list.length}곳 — 밤·주말·공휴일 진료시간 | 이 약, 어디 있지?` : `달빛어린이병원 ${list.length}곳 — 밤·휴일 소아 진료 병원 찾기 | 이 약, 어디 있지?`,
      desc: cur ? `${where} 달빛어린이병원 ${list.length}곳(${names} 등)의 평일 밤·토요일·일요일·공휴일 진료시간과 전화번호, 지금 진료 중인지 확인하세요.` : `밤이나 주말·공휴일에 아이가 아플 때 갈 수 있는 달빛어린이병원·소아전문센터 ${list.length}곳. 요일별 진료시간, 지금 진료 중인지, 전화번호까지 확인하세요.`,
      path: cur ? `/moonlight/${encodeURIComponent(region)}` : '/moonlight', body }), 43200);
  } catch (e) { failPage(res, e.message); }
}

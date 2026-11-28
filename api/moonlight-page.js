// /moonlight → 전국 달빛어린이병원·소아전문센터 (밤·휴일 소아 진료)
import { esc, clean, DAYS, fmt, OLD_SIDO, page, sendHtml, failPage } from './_lib.js';
import { babyList } from './clinic.js';

const HOL = "['2026-12-25','2027-01-01','2027-02-06','2027-02-07','2027-02-08','2027-02-09','2027-03-01','2027-05-01','2027-05-03','2027-05-05','2027-05-13','2027-06-06','2027-07-17','2027-07-19','2027-08-15','2027-08-16','2027-09-14','2027-09-15','2027-09-16','2027-10-03','2027-10-04','2027-10-09','2027-10-11','2027-12-25','2027-12-27']";
const txt = h => { if (!h) return '휴진'; const [s, c] = h.split('-'); return `${fmt(s)}~<wbr>${fmt(c)}`; };
const late = h => h && +h.split('-')[1] >= 2000;

export default async function handler(req, res) {
  try {
    const list = await babyList();
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
<div class="acts">${x.tel ? `<a class="btn red" href="tel:${esc(x.tel.replace(/[^\d]/g, ''))}">전화 ${esc(x.tel)}</a>` : ''}<a class="btn" href="${esc(map)}" target="_blank" rel="noopener">지도 보기</a></div></li>`;
    };
    const body = `
<nav class="crumb"><a href="/">약 검색</a> › 달빛어린이병원</nav>
<h1>달빛어린이병원·소아전문센터</h1>
<p class="sub">밤이나 휴일에 아이가 아플 때 응급실 대신 갈 수 있는 소아 진료 병원 ${list.length}곳이에요. 평일 밤(오후 8시 이후) 진료 ${nNight}곳, 일요일 ${nSun}곳, 공휴일 ${nHol}곳이에요.</p>
<div class="box" style="background:var(--redbg);border-left:6px solid var(--red)"><b>숨쉬기 힘들어하거나, 의식이 흐리거나, 경련이 멈추지 않으면 바로 119</b><p style="margin:8px 0 0"><a class="btn red" href="tel:119">119 전화</a> <a class="btn" href="/er">가까운 응급실</a></p></div>
<p style="margin:16px 0"><button class="btn red" id="mgeo" type="button">내 위치에서 가까운 순으로 보기</button> <button class="btn" id="mopen" type="button">지금 진료 중인 곳만</button> <span class="note" id="mmsg"></span></p>
<nav class="scroll" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">${order.map(s => `<a class="fchip" style="display:inline-flex;align-items:center;text-decoration:none" href="#s${order.indexOf(s)}">${esc(s)} ${groups.get(s).length}</a>`).join('')}</nav>
<div id="mall">${order.map((s, i) => `<section id="s${i}"><h2>${esc(s)} <small class="note">${groups.get(s).length}곳</small></h2><ul class="list">${groups.get(s).map(card).join('')}</ul></section>`).join('')}</div>
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
    sendHtml(res, 200, page({ title: `달빛어린이병원 ${list.length}곳 — 밤·휴일 소아 진료 병원 찾기 | 이 약, 어디 있지?`,
      desc: `밤이나 주말·공휴일에 아이가 아플 때 갈 수 있는 달빛어린이병원·소아전문센터 ${list.length}곳. 요일별 진료시간, 지금 진료 중인지, 전화번호까지 확인하세요.`, path: '/moonlight', body }), 43200);
  } catch (e) { failPage(res, e.message); }
}

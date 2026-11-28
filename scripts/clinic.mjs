import { page, SIDO } from '../api/_lib.js';
import { DEPTS } from '../api/_clinic.js';
import fs from 'fs';
const body = `
<nav class="crumb"><a href="/">약 검색</a> › 문 연 병원</nav>
<h1>지금 문 연 병원 찾기</h1>
<p class="sub">진료과와 동네를 고르면 요일별 진료시간과 <b>지금 진료 중인지</b>를 보여드려요. 밤·주말에 아이가 아프면 <a href="/moonlight">달빛어린이병원</a>을, 위급하면 <a href="/er">응급실</a>을 확인하세요.</p>
<div class="box" style="display:grid;gap:14px">
  <div><b>진료과</b><div class="filters" id="depts" style="margin:8px 0 0"><button type="button" class="fchip on" data-dept="">전체</button>${Object.entries(DEPTS).map(([k, v]) => `<button type="button" class="fchip" data-dept="${k}">${v}</button>`).join('')}</div></div>
  <form id="cf2" style="display:flex;gap:8px;flex-wrap:wrap">
    <select id="csido" aria-label="시·도" style="height:44px;border:1px solid var(--line);border-radius:12px;padding:0 10px;font:inherit;background:var(--bg);color:var(--ink)"><option value="">시·도 선택</option>${SIDO.map(s => `<option>${s}</option>`).join('')}</select>
    <input id="cgu" placeholder="시·군·구 (예: 마포구, 수지구)" aria-label="시·군·구" required style="flex:1;min-width:150px;height:44px;border:1px solid var(--line);border-radius:12px;padding:0 12px;font:inherit;font-size:16px;background:var(--bg);color:var(--ink)">
    <button class="btn ink" type="submit">병원 찾기</button>
  </form>
  <p class="note" style="margin:0">또는 <button class="btn" id="cgeo" type="button">내 위치 주변 병원 (진료과 구분 없음)</button></p>
</div>
<div class="filters" id="cfil" hidden><button type="button" class="fchip on" data-f="open">지금 진료 중</button><button type="button" class="fchip" data-f="night">밤 8시 이후</button><button type="button" class="fchip" data-f="sun">일요일</button><button type="button" class="fchip" data-f="hol">공휴일</button><button type="button" class="fchip" data-f="all">전체</button></div>
<div id="cout"></div>
<p class="note" style="margin-top:20px">진료시간은 병원이 신고한 정보예요. 점심시간·접수 마감·임시 휴진은 다를 수 있으니 가기 전에 꼭 전화하세요. 자료: 국립중앙의료원 전국 병·의원 찾기 서비스.</p>
<script>{
const $=s=>document.querySelector(s);const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const H=new Set(['2026-12-25','2027-01-01','2027-02-06','2027-02-07','2027-02-08','2027-02-09','2027-03-01','2027-05-01','2027-05-03','2027-05-05','2027-05-13','2027-06-06','2027-07-17','2027-07-19','2027-08-15','2027-08-16','2027-09-14','2027-09-15','2027-09-16','2027-10-03','2027-10-04','2027-10-09','2027-10-11','2027-12-25','2027-12-27']);
const n=new Date(),ymd=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');
const qi=H.has(ymd)?7:(n.getDay()+6)%7,m=n.getHours()*60+n.getMinutes();const DAYS=['월','화','수','목','금','토','일','공휴일'];
const tm=t=>{t=String(t||'').replace(/\\D/g,'');if(t.length<3)return null;t=t.padStart(4,'0');return +t.slice(0,2)*60+ +t.slice(2)};
const f2=t=>{t=String(t).padStart(4,'0');return t.slice(0,2)+':'+t.slice(2)};
const openAt=h=>{if(!h)return [false,null];const [s,e]=h.split('-').map(tm);if(s===null||e===null)return [false,null];const o=e>s?(m>=s&&m<e):(m>=s||m<e);return [o,(e-m+1440)%1440]};
let dept='',data=[],mode='area',filter='open';
$('#depts').addEventListener('click',e=>{const b=e.target.closest('[data-dept]');if(!b)return;dept=b.dataset.dept;for(const x of $('#depts').children)x.classList.toggle('on',x===b)});
$('#cfil').addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b)return;filter=b.dataset.f;for(const x of $('#cfil').children)x.classList.toggle('on',x===b);draw()});
const draw=()=>{const ok=x=>{const h=mode==='near'?(x.today||x.h[qi]):x.h[qi];if(filter==='open')return openAt(h)[0];if(filter==='night')return x.h.slice(0,5).some(v=>v&&tm(v.split('-')[1])>=1200);if(filter==='sun')return !!x.h[6];if(filter==='hol')return !!x.h[7];return true};
  const list=data.filter(ok);
  if(!data.length){$('#cout').innerHTML='<p class="note">병원을 찾지 못했어요. 시·군·구 이름을 확인해 주세요(예: 수지구, 마포구, 나주시).</p>';return}
  if(!list.length){$('#cout').innerHTML='<p class="note">조건에 맞는 병원이 없어요. \\'전체\\'를 누르면 '+data.length+'곳을 모두 볼 수 있어요.'+(filter==='open'?' 아이가 아프면 <a href="/moonlight">달빛어린이병원</a>도 확인해 보세요.':'')+'</p>';return}
  $('#cout').innerHTML='<h2>병원 '+list.length+'곳 <small class="note">전체 '+data.length+'곳 중</small></h2><ul class="list">'+list.slice(0,150).map(x=>{const h=mode==='near'?(x.today||x.h[qi]):x.h[qi];const [o,left]=openAt(h);
    const tag=o?(left<=30?'<span class="tag soon">곧 마감 · '+left+'분</span>':'<span class="tag open">지금 진료 중</span>'):'<span class="tag closed">지금 진료 안 함</span>';
    const map=x.lat?'https://map.kakao.com/link/map/'+encodeURIComponent(x.name)+','+x.lat+','+x.lon:'https://map.naver.com/p/search/'+encodeURIComponent(x.name);
    const hrs=mode==='near'&&!x.h.some(Boolean)?'<p class="note" style="margin:6px 0">오늘 '+(h?f2(h.split('-')[0])+'~'+f2(h.split('-')[1]):'진료시간 정보 없음')+'</p>':'<div class="hrs">'+DAYS.map((d,i)=>'<div class="'+(x.h[i]?'':'off')+(i===qi?' today':'')+'"><b>'+d+'</b>'+(x.h[i]?f2(x.h[i].split('-')[0])+'~<wbr>'+f2(x.h[i].split('-')[1]):'휴진')+'</div>').join('')+'</div>';
    return '<li class="ph"><div class="hd"><h3>'+esc(x.name)+'</h3><span class="badges">'+tag+(x.kind?'<span class="tag closed">'+esc(x.kind)+'</span>':'')+'</span></div><div class="addr">'+esc(x.addr)+(x.dist!=null&&isFinite(x.dist)?' · <b>'+(x.dist<1?Math.round(x.dist*1000)+'m':x.dist.toFixed(1)+'km')+'</b>':'')+'</div>'+hrs+(x.note?'<p class="note" style="margin:0 0 8px">'+esc(x.note)+'</p>':'')+'<div class="acts">'+(x.tel?'<a class="btn red" href="tel:'+esc(x.tel.replace(/[^\\d]/g,''))+'">전화 '+esc(x.tel)+'</a>':'')+'<a class="btn" href="'+esc(map)+'" target="_blank" rel="noopener">지도 보기</a><button class="rep" type="button" data-report="'+esc(x.name+' ('+x.addr+')')+'">정보가 틀려요</button></div></li>'}).join('')+'</ul>'};
const run=async q=>{$('#cout').innerHTML='<p class="note">병원 찾는 중…</p>';$('#cfil').hidden=false;try{const j=await (await fetch('/api/clinic?'+new URLSearchParams(q))).json();if(!j.ok)throw new Error(j.error);data=j.items;draw()}catch(e){data=[];$('#cout').innerHTML='<p class="note" style="color:var(--red)">'+esc(e.message||'오류가 났어요.')+'</p>'}};
$('#cf2').addEventListener('submit',e=>{e.preventDefault();const s=$('#csido').value;if(!s){$('#csido').focus();return}mode='area';const q={mode:'area',sido:s,gu:$('#cgu').value.trim()};if(dept)q.dept=dept;try{localStorage.setItem('yak_clinic_area',JSON.stringify({s,g:q.gu}))}catch(er){}run(q)});
$('#cgeo').addEventListener('click',()=>{if(!navigator.geolocation)return;$('#cout').innerHTML='<p class="note">위치 확인 중…</p>';navigator.geolocation.getCurrentPosition(p=>{mode='near';run({mode:'near',lat:p.coords.latitude,lon:p.coords.longitude})},()=>{$('#cout').innerHTML='<p class="note">위치를 확인하지 못했어요. 지역으로 찾아 주세요.</p>'},{timeout:10000,maximumAge:120000})});
try{const a=JSON.parse(localStorage.getItem('yak_clinic_area'));if(a){$('#csido').value=a.s;$('#cgu').value=a.g}}catch(e){}
}</script>`;
fs.writeFileSync(new URL('../clinic.html', import.meta.url), page({ title: '지금 문 연 병원 찾기 — 진료과별·동네별 진료시간 | 이 약, 어디 있지?', desc: '소아청소년과, 내과, 이비인후과 등 진료과와 동네를 고르면 요일별 진료시간과 지금 진료 중인 병원을 보여드려요. 밤·일요일·공휴일 진료 병원도 찾을 수 있어요.', path: '/clinic', body }));
console.log('ok');

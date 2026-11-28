import { page, SIDO } from '../api/_lib.js';
import fs from 'fs';
const body = `
<nav class="crumb"><a href="/">약 검색</a> › 가까운 응급실</nav>
<div class="box" style="background:var(--redbg);border-left:6px solid var(--red)"><b style="font-size:20px">생명이 위급하면 바로 119</b><p class="note" style="margin:6px 0 10px;color:var(--ink)">의식이 없거나, 숨쉬기 힘들거나, 가슴 통증·마비·심한 출혈이 있으면 응급실을 찾지 말고 119에 먼저 전화하세요.</p><a class="btn red" href="tel:119">119 전화</a></div>
<h1>지금 가까운 응급실</h1>
<p class="sub">국립중앙의료원 응급의료정보로 가까운 응급실과 <b>지금 남은 병상 수</b>를 보여드려요. 출발 전에 응급실에 전화로 진료가 되는지 확인하세요.</p>
<div class="box">
  <p style="margin:0 0 12px"><button class="btn red" id="egeo" type="button">내 위치로 가까운 응급실 찾기</button></p>
  <form id="ef" style="display:flex;gap:8px;flex-wrap:wrap">
    <select id="esido" aria-label="시·도" style="height:44px;border:1px solid var(--line);border-radius:12px;padding:0 10px;font:inherit;background:var(--bg);color:var(--ink)"><option value="">시·도 선택</option>${SIDO.map(s => `<option>${s}</option>`).join('')}</select>
    <input id="egu" placeholder="시·군·구 (예: 마포구)" aria-label="시·군·구" style="flex:1;min-width:140px;height:44px;border:1px solid var(--line);border-radius:12px;padding:0 12px;font:inherit;font-size:16px;background:var(--bg);color:var(--ink)">
    <button class="btn ink" type="submit">지역으로 찾기</button>
  </form>
</div>
<div id="eout"></div>
<div class="box"><b>알아두세요</b><p class="note" style="margin:6px 0 0">· 남은 병상 수는 병원이 실시간으로 입력하는 값이라 실제와 다를 수 있어요. 0이나 마이너스면 대기 환자가 많다는 뜻이에요.<br>· 응급실은 증상이 위급한 순서대로 진료해서, 가벼운 증상은 오래 기다리거나 비용이 더 들 수 있어요. 밤이나 휴일에 가벼운 증상이면 <a href="/">문 연 약국</a>이나 <a href="/convenience">편의점 상비약</a>도 확인해 보세요.<br>· 자료: 국립중앙의료원 전국 응급의료기관 정보 (공공데이터포털)</p></div>
<style>.er{border:1px solid var(--line);border-radius:14px;padding:14px 16px}.er .hd{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start}.er h3{font-size:18px}
.bedbox{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0;padding:10px 12px;border-radius:10px;background:var(--paper)}.bedbox b{font-size:24px}.bedbox.ok b{color:var(--ok)}.bedbox.mid b{color:var(--warn)}.bedbox.full b{color:var(--red)}</style>
<script>{
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t=u=>{u=String(u||'');return u.length>=12?u.slice(8,10)+':'+u.slice(10,12):''};
const draw=j=>{ if(!j.items.length){$('#eout').innerHTML='<p class="note">응급실을 찾지 못했어요. 시·군·구를 비우고 시·도만으로 찾아 보세요.</p>';return}
  $('#eout').innerHTML='<h2>응급실 '+j.items.length+'곳</h2><ul class="list">'+j.items.map(h=>{const b=h.bed;const cls=!b||b.er===null?'':b.er<=0?'full':b.er<=2?'mid':'ok';
    const tel=h.erTel||h.tel; const map=Number.isFinite(h.lat)&&h.lat?'https://map.kakao.com/link/map/'+encodeURIComponent(h.name)+','+h.lat+','+h.lon:'https://map.naver.com/p/search/'+encodeURIComponent(h.name);
    return '<li class="er"><div class="hd"><h3>'+esc(h.name)+'</h3><span class="tag closed">'+esc(h.kind||'응급의료기관')+'</span></div><div class="note">'+esc(h.addr)+(h.dist!=null?' · <b>'+(h.dist<1?Math.round(h.dist*1000)+'m':h.dist.toFixed(1)+'km')+'</b>':'')+'</div>'+
    (b&&b.er!==null?'<div class="bedbox '+cls+'"><span>응급실 남은 병상</span><b>'+esc(b.er)+'</b>'+(b.base?'<span class="note">/ 전체 '+esc(b.base)+'</span>':'')+(b.er<=0?'<span class="tag rx">대기 많음</span>':'')+'<span class="note">'+esc(t(b.updated))+' 기준'+(b.ambulance?' · 구급차 있음':'')+(b.ct?' · CT 가능':'')+'</span></div>':'<p class="note">실시간 병상 정보가 없어요. 전화로 확인하세요.</p>')+
    '<div class="acts">'+(tel?'<a class="btn red" href="tel:'+esc(tel.replace(/[^\\d]/g,''))+'">응급실 전화 '+esc(tel)+'</a>':'')+'<a class="btn" href="'+esc(map)+'" target="_blank" rel="noopener">지도 보기</a><button class="rep" type="button" data-report="'+esc(h.name)+'">정보가 틀려요</button></div></li>'}).join('')+'</ul><p class="note">'+new Date(j.at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+' 조회 · 1분마다 새 정보로 바뀌어요.</p>'};
const run=async q=>{$('#eout').innerHTML='<p class="note">응급실 찾는 중…</p>';try{const j=await (await fetch('/api/er?'+new URLSearchParams(q))).json();if(!j.ok)throw new Error(j.error);draw(j)}catch(e){$('#eout').innerHTML='<p class="note" style="color:var(--red)">'+esc(e.message||'오류가 났어요. 급하면 119에 전화하세요.')+'</p>'}};
$('#egeo').addEventListener('click',()=>{if(!navigator.geolocation){$('#eout').innerHTML='<p class="note">이 브라우저는 위치 찾기를 지원하지 않아요. 지역으로 찾아 주세요.</p>';return}
  $('#eout').innerHTML='<p class="note">위치 확인 중…</p>';navigator.geolocation.getCurrentPosition(p=>run({lat:p.coords.latitude,lon:p.coords.longitude}),()=>{$('#eout').innerHTML='<p class="note">위치를 확인하지 못했어요. 지역으로 찾아 주세요.</p>'},{enableHighAccuracy:true,timeout:10000,maximumAge:60000})});
$('#ef').addEventListener('submit',e=>{e.preventDefault();const s=$('#esido').value;if(!s){$('#esido').focus();return}run({sido:s,gu:$('#egu').value.trim()})});
}</script>`;
fs.writeFileSync(new URL('../er.html', import.meta.url), page({ title: '지금 가까운 응급실 찾기 — 실시간 남은 병상 | 이 약, 어디 있지?', desc: '내 위치나 지역으로 가까운 응급실과 지금 남은 응급실 병상 수, 응급실 직통 전화번호를 확인하세요. 국립중앙의료원 실시간 정보.', path: '/er', body }));
console.log('ok');

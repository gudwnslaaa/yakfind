import { page } from '../lib/_lib.js';
import fs from 'fs';
const body = `
<nav class="crumb"><a href="/">약 검색</a> › 해외용 영문 약 카드</nav>
<h1>해외여행용 영문 약 카드</h1>
<p class="sub">먹는 약을 고르면 <b>성분 이름(영어)</b>과 약 종류를 카드로 만들어 드려요. 외국 약국에서 이 화면을 보여주면 같은 성분의 약을 찾기 쉬워요.</p>
<div class="box" id="pickBox">
  <form id="tf" style="display:flex;gap:8px"><input id="tq" type="search" placeholder="약 이름 (예: 타이레놀)" aria-label="약 이름" minlength="2" required style="flex:1;min-width:0;height:46px;border:1px solid var(--line);border-radius:12px;padding:0 12px;font:inherit;font-size:16px;background:var(--bg);color:var(--ink)"><button class="btn ink" type="submit">찾기</button></form>
  <div id="tres" class="list" style="margin-top:8px"></div>
  <p id="tmine" class="note" style="margin:10px 0 0"></p>
  <p class="note" style="margin:10px 0 0">고른 약: <span id="tsel">없음</span></p>
</div>
<div id="card" aria-live="polite"></div>
<div class="box" style="margin-top:18px"><b>여행 전에 꼭 챙기세요</b><ul class="note" style="margin:8px 0 0;padding-left:18px">
<li><b>일본</b>은 코막힘 성분 <b>슈도에페드린</b>, 기침약 성분 <b>코데인</b> 등이 든 약의 반입을 엄격히 제한해요. 위 카드에 경고가 뜨면 여행 전에 꼭 확인하세요.</li>
<li>처방약은 나라마다 반입 규정이 달라요. <b>영문 처방전이나 진단서</b>를 받아 가고, 약은 원래 포장 그대로 가져가세요.</li>
<li>외국 약은 같은 성분이어도 <b>함량(mg)과 한 번 먹는 양</b>이 다를 수 있어요. 현지 약사에게 먹는 양을 꼭 물어보세요.</li>
<li>성분 이름은 식약처 허가 정보를 그대로 옮긴 거예요. 처방약은 처방한 의사·약사에게 확인하세요.</li></ul></div>
<style>.mcard{border:2px solid var(--ink);border-radius:18px;padding:18px;margin-top:16px;background:var(--bg)}.mcard h2{font-size:22px;margin:0 0 4px}.mcard .row{border-top:1px solid var(--line);padding:12px 0}.mcard .row:first-of-type{border-top:0}
.mcard .ing{font-size:22px;font-weight:800;line-height:1.3;font-family:system-ui,sans-serif}.mcard .ko{color:var(--mute);font-size:14px}.mcard .ty{font-size:16px;margin-top:2px}
.phr{display:grid;gap:8px;margin-top:12px}.phr div{background:var(--paper);border-radius:12px;padding:10px 12px;font-size:17px}.phr small{display:block;color:var(--mute);font-size:13px}
.big .mcard .ing{font-size:28px}.pk{display:inline-flex;align-items:center;gap:6px}.pk button{border:0;background:none;color:var(--mute);font-size:18px;cursor:pointer}
.addbtn{display:flex;justify-content:space-between;width:100%;text-align:left;border:1px solid var(--line);border-radius:12px;padding:10px 14px;background:var(--bg);color:var(--ink);font:inherit;cursor:pointer}.addbtn small{color:var(--mute)}
#card:fullscreen{background:var(--bg);padding:20px;overflow:auto}</style>
<script>{
const $=s=>document.querySelector(s);const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TY=[['해열','진통','Pain reliever / Fever reducer (analgesic, antipyretic)'],['소염','','Anti-inflammatory'],['진해','거담','Cough medicine / Expectorant'],['항히스타민','','Antihistamine (allergy)'],['알레르기','','Allergy medicine'],['소화성궤양','','Antacid / Stomach ulcer medicine'],['제산','','Antacid'],['건위','소화','Digestive aid'],['정장','','Antidiarrheal / Intestinal regulator'],['지사','','Antidiarrheal'],['하제','','Laxative'],['완장','','Laxative'],['진토','','Anti-nausea'],['진훈','','Motion sickness medicine'],['비타민','','Vitamin supplement'],['항생','','Antibiotic'],['혈압강하','','Blood pressure medicine'],['당뇨','','Diabetes medicine'],['동맥경화','','Cholesterol medicine'],['최면','진정','Sleep aid / Sedative'],['진경','','Antispasmodic'],['안과','','Eye medicine'],['이비과','','Ear / Nose medicine'],['피부','','Skin medicine (topical)'],['외피','','Topical medicine (for skin)'],['구충','','Anthelmintic (deworming)'],['감기','','Cold medicine']];
const tyEn=t=>{for(const [a,b,e] of TY)if(t.includes(a)&&(!b||t.includes(b)||true))return e;return ''};
const cap=s=>String(s||'').replace(/\\b([a-z])/g,m=>m.toUpperCase());
let sel=[];
const chips=()=>{$('#tsel').innerHTML=sel.length?sel.map((x,i)=>'<span class="pk fchip" style="margin:2px">'+esc(x.name)+'<button type="button" data-rm="'+i+'" aria-label="빼기">×</button></span>').join(''):'없음'};
const drawSel=()=>{chips();try{history.replaceState(null,'',sel.length?'/travel?seqs='+sel.map(x=>x.seq).join(','):'/travel')}catch(e){}make()};
const add=(seq,name)=>{if(!seq||sel.some(x=>x.seq===seq)||sel.length>=8)return;sel.push({seq,name});drawSel()};
$('#tsel').addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(b){sel.splice(+b.dataset.rm,1);drawSel()}});
$('#tf').addEventListener('submit',async e=>{e.preventDefault();const q=$('#tq').value.trim();if(q.length<2)return;$('#tres').innerHTML='<p class="note">찾는 중…</p>';
  try{const j=await (await fetch('/api/yak?action=drug&q='+encodeURIComponent(q))).json();if(!j.ok)throw new Error(j.error);
    const l=j.items.filter(x=>!/취소|취하/.test(x.CANCEL_NAME||'')&&!/수출용/.test(x.ITEM_NAME||'')).slice(0,8);
    $('#tres').innerHTML=l.length?l.map(x=>'<button type="button" class="addbtn" data-seq="'+esc(x.ITEM_SEQ)+'" data-name="'+esc(String(x.ITEM_NAME).replace(/\\(.*?\\)/g,'').trim())+'"><span>'+esc(x.ITEM_NAME)+'<br><small>'+esc(x.ENTP_NAME)+'</small></span><span>＋</span></button>').join(''):'<p class="note">검색 결과가 없어요.</p>'}
  catch(er){$('#tres').innerHTML='<p class="note">'+esc(er.message||'오류가 났어요.')+'</p>'}});
$('#tres').addEventListener('click',e=>{const b=e.target.closest('[data-seq]');if(b){add(b.dataset.seq,b.dataset.name);$('#tres').innerHTML='';$('#tq').value=''}});
let mine=[];try{mine=JSON.parse(localStorage.getItem('yak_mine'))||[]}catch(e){}
const seen=new Set();mine=mine.filter(x=>!seen.has(x.seq)&&seen.add(x.seq));
if(mine.length){$('#tmine').innerHTML='★ 약 상자에서 고르기: '+mine.slice(0,12).map(m=>'<button type="button" class="fchip" data-mseq="'+esc(m.seq)+'" data-mname="'+esc(m.name)+'">'+esc(m.name)+'</button>').join(' ');
  $('#tmine').addEventListener('click',e=>{const b=e.target.closest('[data-mseq]');if(b)add(b.dataset.mseq,b.dataset.mname)})}
let tk=0;
async function make(){const my=++tk;if(!sel.length){$('#card').innerHTML='';return}
  $('#card').innerHTML='<p class="note">카드를 만드는 중…</p>';
  try{const j=await (await fetch('/api/dur-check?en=1&seqs='+sel.map(x=>x.seq).join(','))).json();if(my!==tk)return;if(!j.ok)throw new Error(j.error);
    j.drugs.forEach(d=>{const x=sel.find(v=>v.seq===d.seq);if(x&&d.ok&&d.name)x.name=d.name});chips();
    const rows=j.drugs.filter(d=>d.ok).map(d=>{const t=tyEn(d.type||'');return '<div class="row"><div class="ing">'+(d.ingr.length?d.ingr.map(x=>esc(cap(x.en))).join(' + '):'(ingredient unknown)')+'</div>'
      +(t?'<div class="ty">'+esc(t)+'</div>':'')+'<div class="ko">'+esc(d.name)+(d.en?' · '+esc(d.en):'')+' · '+(d.rx?'Prescription medicine (전문의약품)':'Over-the-counter (일반의약품)')+(d.ingr.some(x=>x.ko)?' · '+esc(d.ingr.map(x=>x.ko).filter(Boolean).join(', ')):'')+'</div></div>'}).join('');
    const RISK={pseudoephedrine:'슈도에페드린',codeine:'코데인',tramadol:'트라마돌',methylphenidate:'메틸페니데이트',amphetamine:'암페타민'};
    const warn=j.drugs.filter(d=>d.ok).map(d=>{const hit=[...new Set(d.ingr.flatMap(x=>Object.keys(RISK).filter(k=>String(x.en).toLowerCase().includes(k))))].map(k=>RISK[k]);return hit.length?esc(d.name)+' (<b>'+hit.join(', ')+'</b>)':''}).filter(Boolean);
    const warnHtml=warn.length?'<div class="box" style="background:var(--redbg);border-left:6px solid var(--red);margin-top:16px"><b>✈ 반입 주의 성분이 있어요</b><p class="note" style="margin:6px 0 0;color:var(--ink)">'+warn.join('<br>')+'<br>이 성분은 <b>일본</b> 등 일부 나라에서 반입이 금지되거나 사전 허가가 필요해요. 압수되거나 입국이 막힐 수 있으니 여행 전에 <a href="https://www.mofa.go.kr/jp-osaka-ko/brd/m_26891/view.do?seq=1945798" target="_blank" rel="noopener">외교부 재외공관 안내</a>와 가는 나라의 세관 규정을 꼭 확인하세요.</p></div>':'';
    $('#card').innerHTML=warnHtml+'<div class="mcard" id="mc"><p class="note" style="margin:0">Medicine information · 약 정보 (Korea)</p><h2>Active ingredients</h2>'+rows
      +'<div class="phr"><div>I am currently taking these medicines.<small>現在、これらの薬を服用しています。 · 我目前正在服用这些药。</small></div><div>Do you have a medicine with the same active ingredient?<small>同じ成分の薬はありますか？ · 有相同成分的药吗？</small></div><div>How much should I take, and how often?<small>1回にどのくらい、1日に何回飲めばいいですか？ · 一次吃多少，一天吃几次？</small></div></div></div>'
      +'<p style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 0"><button class="btn red" type="button" id="fs">화면 가득 보여주기</button><button class="btn" type="button" id="sh">카드 주소 저장·공유</button></p>';
    $('#fs').onclick=()=>{const c=$('#card');(c.requestFullscreen?c.requestFullscreen():Promise.reject()).catch(()=>{$('#mc').scrollIntoView({behavior:'smooth'})})};
    $('#sh').onclick=async()=>{try{if(navigator.share)await navigator.share({title:'영문 약 카드',url:location.href});else{await navigator.clipboard.writeText(location.href);$('#sh').textContent='주소를 복사했어요'}}catch(e){}};
  }catch(er){$('#card').innerHTML='<p class="note">'+esc(er.message||'카드를 만들지 못했어요.')+'</p>'}}
const s0=new URLSearchParams(location.search).get('seqs');
if(s0){sel=s0.split(',').filter(Boolean).slice(0,8).map(seq=>({seq,name:(mine.find(m=>m.seq===seq)||{}).name||'품목 '+seq}));drawSel()}
}</script>`;
fs.writeFileSync(new URL('../travel.html', import.meta.url), page({ title: '해외여행 약 영어로 — 영문 약 성분 카드 만들기 | 이 약, 어디 있지?', desc: '먹는 약의 성분 이름을 영어로 정리한 카드를 만들어 외국 약국에서 보여주세요. 같은 성분 약 찾는 영어·일본어·중국어 문장도 함께 있어요.', path: '/travel', body }));
console.log('ok');

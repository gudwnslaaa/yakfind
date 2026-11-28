// /fever → 아이 해열제 교차복용 안내 (식약처·정책브리핑 공식 안내만 사용)
import { page } from '../api/_lib.js';
import fs from 'fs';
const SRC = [
  ['식품의약품안전처 소아 해열제 안내 (뉴시스, 2025.12.26)', 'https://www.newsis.com/view/NISX20251226_0003455699'],
  ['식품의약품안전처 어린이 해열제 복약 안내 (데일리팜, 2025.12.26)', 'https://www.dailypharm.com/user/news/334299'],
  ['아이들을 위한 해열소염진통제, 안전하게 사용하세요 (정책브리핑)', 'https://www.korea.kr/multi/visualNewsView.do?newsId=148922737'],
];
const body = `
<nav class="crumb"><a href="/">약 검색</a> › 아이 해열제 교차복용</nav>
<h1>아이 해열제 교차복용, 안전하게 하는 법</h1>
<p class="sub">밤에 아이 열이 안 떨어질 때 가장 많이 헷갈리는 <b>해열제 종류, 먹이는 간격, 교차복용</b>을 식약처 안내 기준으로 정리했어요. 아래 <b>먹인 시간 기록</b>을 쓰면 다음에 언제 먹일 수 있는지 바로 보여드려요.</p>
<div class="box" style="background:var(--redbg);border-left:6px solid var(--red)"><b>이럴 땐 해열제보다 먼저 병원·119</b><p class="note" style="margin:6px 0 10px;color:var(--ink)">숨쉬기 힘들어하거나, 축 처져서 잘 깨지 않거나, 경련을 하거나, <b>3개월 미만 아기</b>가 열이 날 때는 해열제로 버티지 말고 바로 진료를 받으세요.</p><p style="margin:0;display:flex;gap:8px;flex-wrap:wrap"><a class="btn red" href="tel:119">119 전화</a><a class="btn" href="/moonlight">달빛어린이병원</a><a class="btn" href="/er">가까운 응급실</a></p></div>

<h2>1. 아이 해열제는 크게 두 계열이에요</h2>
<div class="tbl"><table>
<thead><tr><th>계열</th><th>성분</th><th>대표 제품</th><th>1회 양 (시럽)</th><th>간격</th><th>하루 최대</th></tr></thead>
<tbody>
<tr><td><b>A 계열</b></td><td>아세트아미노펜</td><td>어린이타이레놀, 챔프 등</td><td>10~15mg/kg</td><td>4~6시간</td><td>5회</td></tr>
<tr><td rowspan="2"><b>B 계열</b></td><td>이부프로펜</td><td>부루펜 등</td><td>5~10mg/kg</td><td rowspan="2">6~8시간</td><td rowspan="2">4회</td></tr>
<tr><td>덱시부프로펜</td><td>맥시부키즈 등</td><td>5~7mg/kg</td></tr>
</tbody></table></div>
<p class="note">mg/kg는 아이 몸무게 1kg당 양이에요. <b>실제로 먹일 mL는 제품 상자·설명서의 나이·체중별 표</b>를 따라 주세요. 같은 성분이라도 제품마다 농도가 달라요. 아세트아미노펜·이부프로펜은 약국과 편의점에서, 덱시부프로펜은 약국에서만 살 수 있어요. 6개월 이하 아기는 아세트아미노펜을 써요.</p>

<h2>2. 교차복용 규칙 5가지</h2>
<ol class="rules">
<li><b>대부분은 한 가지 해열제로 충분해요.</b> 교차복용은 꼭 필요할 때만, 가능하면 의사·약사와 상의하고 하세요.</li>
<li><b>같은 약은 간격을 지켜요.</b> 먹인 뒤에도 열이 안 떨어진다고 같은 해열제를 간격 안에 또 먹이지 마세요.</li>
<li><b>다른 계열로 바꿀 땐 2~3시간 뒤에.</b> 먹이고 2시간이 지나도 고열이 계속되면 <b>다른 계열</b>(A↔B)을 쓸 수 있어요. 두 가지를 동시에 먹이는 게 아니라 번갈아 먹이는 거예요.</li>
<li><b>이부프로펜 ↔ 덱시부프로펜은 교차 금지.</b> 둘은 같은 B 계열이에요.</li>
<li><b>감기약·처방약 속 해열 성분을 확인해요.</b> 종합감기약이나 병원 약에 아세트아미노펜 등이 들어 있으면 중복이 돼요. <a href="/check">같이 먹어도 되나요?</a>에서 확인할 수 있어요.</li>
</ol>

<h2>3. 먹인 시간 기록 <small class="note">이 휴대폰에만 저장돼요</small></h2>
<div class="box" id="logBox">
  <p style="display:flex;gap:8px;flex-wrap:wrap;margin:0"><button class="btn" type="button" data-give="A" style="flex:1;min-width:140px;height:56px">A 아세트아미노펜<br><small>타이레놀·챔프</small></button><button class="btn" type="button" data-give="B1" style="flex:1;min-width:140px;height:56px">B 이부프로펜<br><small>부루펜</small></button><button class="btn" type="button" data-give="B2" style="flex:1;min-width:140px;height:56px">B 덱시부프로펜<br><small>맥시부키즈</small></button></p>
  <p class="note" style="margin:8px 0 0">먹인 직후 해당 버튼을 누르세요. 시간을 바꾸려면 <input type="time" id="tm" aria-label="먹인 시각" style="height:36px;border:1px solid var(--line);border-radius:8px;padding:0 6px;font:inherit;background:var(--bg);color:var(--ink)"> 을 먼저 고르고 누르세요.</p>
  <div id="status" aria-live="polite" style="margin-top:14px"></div>
  <ul class="list" id="log" style="margin-top:10px"></ul>
  <p style="margin:10px 0 0"><button class="rep" type="button" id="clr">기록 모두 지우기</button></p>
</div>
<p class="note">이 기록은 식약처 안내의 <b>최소 간격</b>(A 4시간, B 6시간, 다른 계열 2시간)과 <b>하루 최대 횟수</b>를 알려 주는 도우미예요. 먹일 양을 계산하지는 않아요. 열이 오래가거나 아이 상태가 나빠지면 진료를 받으세요.</p>

<h2>자주 묻는 질문</h2>
<details class="sec"><summary><b>교차복용은 몇 시간 간격으로 하나요?</b></summary><p>한 가지 해열제를 먹이고 2시간이 지나도 고열이 계속될 때, 다른 계열의 해열제를 2~3시간 간격을 두고 쓸 수 있어요. 같은 해열제는 아세트아미노펜 4~6시간, 이부프로펜·덱시부프로펜 6~8시간 간격을 지켜요.</p></details>
<details class="sec"><summary><b>부루펜과 맥시부키즈를 번갈아 먹여도 되나요?</b></summary><p>안 돼요. 이부프로펜과 덱시부프로펜은 같은 계열이라 교차복용하지 않아요. 교차할 때는 아세트아미노펜(타이레놀·챔프 등)과 바꿔 써요.</p></details>
<details class="sec"><summary><b>하루에 몇 번까지 먹일 수 있나요?</b></summary><p>시럽 기준으로 아세트아미노펜은 하루 최대 5회, 이부프로펜·덱시부프로펜은 하루 최대 4회예요.</p></details>
<details class="sec"><summary><b>몇 도부터 해열제를 먹이나요?</b></summary><p>정책브리핑 안내에 따르면 39℃ 이상으로 열이 나고 아이가 힘들어할 때(3개월 미만은 38℃) 해열제 사용을 고려해요. 열 자체보다 아이 상태를 보고 판단하고, 원인 치료를 위해 진료를 받으세요.</p></details>

<h2>밤·휴일에 도움이 되는 곳</h2>
<p style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn" href="/moonlight">달빛어린이병원</a><a class="btn" href="/#h-ph">지금 문 연 약국</a><a class="btn" href="/convenience">편의점 상비약</a><a class="btn" href="/er">응급실 남은 병상</a></p>

<p class="note" style="margin-top:20px"><b>출처</b><br>${SRC.map(([t, u]) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`).join('<br>')}<br>이 페이지는 공공 안내를 정리한 정보예요. 아이의 나이·체중·질환에 따라 다를 수 있으니 의사·약사의 안내를 먼저 따르세요.</p>
<style>.tbl{overflow-x:auto}.tbl table{border-collapse:collapse;width:100%;min-width:560px;font-size:15px}.tbl th,.tbl td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}.tbl th{background:var(--paper)}
.rules li{margin:8px 0}.lg{display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:8px 12px}.lg button{border:0;background:none;color:var(--mute);font-size:18px;cursor:pointer;min-width:40px;min-height:40px}
.st{border-radius:12px;padding:10px 12px;margin-top:8px}.st.ok{background:var(--okbg)}.st.no{background:var(--warnbg)}.st b{display:block}</style>
<script>{
const $=s=>document.querySelector(s),K='yak_fever';
const NAME={A:'아세트아미노펜(A)',B1:'이부프로펜(B)',B2:'덱시부프로펜(B)'},CLS=x=>x==='A'?'A':'B',GAP={A:4,B:6},MAX={A:5,B:4};
const get=()=>{try{return JSON.parse(localStorage.getItem(K))||[]}catch(e){return[]}},set=a=>{try{localStorage.setItem(K,JSON.stringify(a.slice(-40)))}catch(e){}};
const hm=t=>{const d=new Date(t);return (d.getHours()<12?'오전 ':'오후 ')+((d.getHours()+11)%12+1)+':'+String(d.getMinutes()).padStart(2,'0')};
function draw(){const now=Date.now(),day=now-24*3600e3,a=get().filter(x=>x.t>now-48*3600e3).sort((p,q)=>q.t-p.t);
  $('#log').innerHTML=a.length?a.map((x,i)=>'<li class="lg"><span><b>'+hm(x.t)+'</b> · '+NAME[x.k]+'</span><button type="button" data-rm="'+x.t+'" aria-label="지우기">×</button></li>').join(''):'<li class="note">아직 기록이 없어요.</li>';
  if(!a.length){$('#status').innerHTML='';return}
  let h='';
  for(const c of ['A','B']){const mine=a.filter(x=>CLS(x.k)===c),cnt=mine.filter(x=>x.t>day).length,last=mine[0];
    const lab=c==='A'?'아세트아미노펜(A)':'이부프로펜·덱시부프로펜(B)';
    if(!last){continue}
    const next=last.t+GAP[c]*3600e3;
    if(cnt>=MAX[c])h+='<div class="st no"><b>'+lab+': 24시간 동안 '+cnt+'회 — 하루 최대('+MAX[c]+'회)에 닿았어요</b>더 먹이지 말고 진료를 받으세요.</div>';
    else if(now<next)h+='<div class="st no"><b>'+lab+': '+hm(next)+' 이후에 다시 먹일 수 있어요</b>마지막 '+hm(last.t)+' · 24시간 '+cnt+'/'+MAX[c]+'회</div>';
    else h+='<div class="st ok"><b>'+lab+': 다시 먹일 수 있는 시간이 지났어요</b>마지막 '+hm(last.t)+' · 24시간 '+cnt+'/'+MAX[c]+'회</div>';
  }
  const last=a[0],other=CLS(last.k)==='A'?'B':'A',ot=last.t+2*3600e3,mx=a.filter(x=>CLS(x.k)===other&&x.t>day).length;
  if(mx<MAX[other]){const lastO=a.find(x=>CLS(x.k)===other),okO=!lastO||now>=lastO.t+GAP[other]*3600e3;
    h+='<div class="st" style="background:var(--paper)"><b>다른 계열('+(other==='A'?'아세트아미노펜':'이부프로펜·덱시부프로펜')+')로 바꾸려면: '+(now<ot?hm(ot)+' 이후':'지금 가능 시간')+(okO?'':' · 단, 그 약 자체 간격('+hm(lastO.t+GAP[other]*3600e3)+')도 지켜야 해요')+'</b>먹이고 2시간이 지나도 고열이 계속될 때만, 가능하면 의사·약사와 상의 후에 쓰세요.</div>'}
  if(a.some(x=>x.k==='B1')&&a.some(x=>x.k==='B2'))h+='<div class="st no"><b>⚠ 이부프로펜과 덱시부프로펜을 함께 기록했어요</b>둘은 같은 계열이라 교차하면 안 돼요. 약사·의사에게 확인하세요.</div>';
  $('#status').innerHTML=h;
}
document.querySelectorAll('[data-give]').forEach(b=>b.addEventListener('click',()=>{let t=Date.now();const v=$('#tm').value;if(v){const [H,M]=v.split(':').map(Number);const d=new Date();d.setHours(H,M,0,0);if(d.getTime()>Date.now())d.setDate(d.getDate()-1);t=d.getTime();$('#tm').value=''}
  const a=get();a.push({k:b.dataset.give,t});set(a);draw();navigator.vibrate&&navigator.vibrate(40)}));
$('#log').addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(b){set(get().filter(x=>String(x.t)!==b.dataset.rm));draw()}});
$('#clr').addEventListener('click',()=>{set([]);draw()});
draw();setInterval(draw,60000);
}</script>`;
const jsonld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
  ['해열제 교차복용은 몇 시간 간격으로 하나요?', '한 가지 해열제를 먹이고 2시간이 지나도 고열이 계속될 때, 다른 계열의 해열제를 2~3시간 간격을 두고 쓸 수 있어요. 같은 해열제는 아세트아미노펜 4~6시간, 이부프로펜·덱시부프로펜 6~8시간 간격을 지켜요.'],
  ['부루펜과 맥시부키즈를 번갈아 먹여도 되나요?', '안 돼요. 이부프로펜과 덱시부프로펜은 같은 계열이라 교차복용하지 않아요.'],
  ['해열제는 하루에 몇 번까지 먹일 수 있나요?', '시럽 기준으로 아세트아미노펜은 하루 최대 5회, 이부프로펜·덱시부프로펜은 하루 최대 4회예요.'],
].map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
fs.writeFileSync(new URL('../fever.html', import.meta.url), page({ title: '아이 해열제 교차복용 시간·간격 정리 (식약처 기준) | 이 약, 어디 있지?', desc: '아세트아미노펜(타이레놀·챔프)과 이부프로펜·덱시부프로펜(부루펜·맥시부키즈) 교차복용 간격, 하루 최대 횟수를 식약처 안내 기준으로 정리했어요. 먹인 시간을 기록하면 다음에 먹일 수 있는 시간을 알려드려요.', path: '/fever', body, jsonld }));
console.log('ok');

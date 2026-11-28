import { page } from '../lib/_lib.js';
import fs from 'fs';
const body = `
<nav class="crumb"><a href="/">약 검색</a> › 같이 먹어도 되나요?</nav>
<h1>이 약들, 같이 먹어도 되나요?</h1>
<p class="sub">먹고 있는 약이나 먹으려는 약을 2~5개 고르면, 식약처 DUR 정보로 <b>함께 먹으면 안 되는 조합</b>, <b>같은 성분 중복</b>, <b>같은 종류 약 중복</b>을 확인해 드려요.</p>
<div class="box">
  <form id="cf" class="s" style="max-width:none" role="search"><input id="cq" type="search" placeholder="약 이름 (예: 타이레놀, 판콜)" aria-label="약 이름" minlength="2" required><button class="btn ink" type="submit">찾기</button></form>
  <div id="cres" class="list" style="margin-top:10px"></div>
  <p id="mineRow" class="note" style="margin:10px 0 0"></p>
  <div style="border-top:1px solid var(--line);margin-top:14px;padding-top:14px"><b>📷 약봉투·처방전 사진으로 넣기</b>
    <p class="note" style="margin:4px 0 10px">약 이름이 적힌 부분을 밝게, 반듯하게 찍어 주세요. 글자는 <b>휴대폰 안에서</b> 읽고 사진은 어디에도 보내지 않아요. 처음 한 번은 글자 인식 도구를 받느라 30초쯤 걸릴 수 있어요.</p>
    <label class="btn" style="display:inline-flex;align-items:center;cursor:pointer">사진 찍기·고르기<input id="ocrFile" type="file" accept="image/*" capture="environment" hidden></label>
    <div id="ocrOut" aria-live="polite"></div></div>
</div>
<h2>고른 약 <small class="note" id="ccount">0개</small></h2>
<ul id="picked" class="list"><li class="note">아직 고른 약이 없어요. 위에서 검색해서 추가하세요.</li></ul>
<p style="margin-top:14px"><button class="btn red" id="go" type="button" disabled>같이 먹어도 되는지 확인</button></p>
<div id="out"></div>
<p class="note" style="margin-top:24px">DUR은 식약처가 고시한 금기·주의 정보예요. 여기 나오지 않아도 체질이나 질환에 따라 문제가 될 수 있으니, 여러 약을 함께 먹을 땐 꼭 약사에게 확인하세요. 처방약은 처방한 의사·약사의 안내를 따르세요.</p>
<style>.pick{display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:10px 14px}.pick button{border:0;background:none;color:var(--mute);font-size:20px;cursor:pointer;min-width:44px;min-height:44px}
.res{border-radius:14px;padding:14px 16px;margin-top:10px}.res b{display:block;font-size:17px}.res.stop{background:var(--redbg);border-left:5px solid var(--red)}.res.warn{background:var(--warnbg);border-left:5px solid var(--warn)}.res.ok{background:var(--okbg);border-left:5px solid var(--ok)}
.addbtn{display:flex;justify-content:space-between;width:100%;text-align:left;border:1px solid var(--line);border-radius:12px;padding:10px 14px;background:var(--bg);color:var(--ink);font:inherit;cursor:pointer}.addbtn:hover{border-color:var(--ink)}.addbtn small{color:var(--mute)}</style>
<script>{
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short=n=>String(n||'').replace(/<[^>]*>/g,'').replace(/\\(.*?\\)/g,'').trim();
let picked=[];
const draw=()=>{ $('#ccount').textContent=picked.length+'개'; $('#go').disabled=picked.length<2;
  $('#picked').innerHTML=picked.length?picked.map((p,i)=>'<li class="pick"><span><b>'+esc(p.name)+'</b></span><button type="button" data-rm="'+i+'" aria-label="'+esc(p.name)+' 빼기">×</button></li>').join(''):'<li class="note">아직 고른 약이 없어요. 위에서 검색해서 추가하세요.</li>';
  try{history.replaceState(null,'',picked.length?'/check?seqs='+picked.map(p=>p.seq).join(','):'/check')}catch(e){} };
const add=(seq,name)=>{ if(!seq||picked.some(p=>p.seq===seq))return; if(picked.length>=5){alertBox('최대 5개까지 고를 수 있어요.');return} picked.push({seq,name}); draw(); $('#out').innerHTML=''; };
const alertBox=t=>{$('#out').innerHTML='<p class="note">'+esc(t)+'</p>'};
$('#picked').addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(b){picked.splice(+b.dataset.rm,1);draw();$('#out').innerHTML=''}});
$('#cf').addEventListener('submit',async e=>{e.preventDefault();const q=$('#cq').value.trim();if(q.length<2)return;$('#cres').innerHTML='<p class="note">찾는 중…</p>';
  try{const j=await (await fetch('/api/yak?action=drug&q='+encodeURIComponent(q))).json(); if(!j.ok)throw new Error(j.error);
    const list=j.items.filter(x=>!/취소|취하/.test(x.CANCEL_NAME||'')&&!/수출용/.test(x.ITEM_NAME||'')).slice(0,12);
    $('#cres').innerHTML=list.length?list.map(x=>'<button type="button" class="addbtn" data-seq="'+esc(x.ITEM_SEQ)+'" data-name="'+esc(short(x.ITEM_NAME))+'"><span>'+esc(x.ITEM_NAME)+'<br><small>'+esc(x.ENTP_NAME)+' · '+(/전문/.test(x.SPCLTY_PBLC)?'전문':'일반')+'</small></span><span>＋ 추가</span></button>').join(''):'<p class="note">검색 결과가 없어요.</p>';
  }catch(er){$('#cres').innerHTML='<p class="note">'+esc(er.message||'오류가 났어요.')+'</p>'}});
$('#cres').addEventListener('click',e=>{const b=e.target.closest('[data-seq]');if(b){add(b.dataset.seq,b.dataset.name);$('#cres').innerHTML='';$('#cq').value='';$('#cq').focus()}});
let mine=[];try{mine=JSON.parse(localStorage.getItem('yak_mine'))||[]}catch(e){}
if(mine.length){$('#mineRow').innerHTML='★ 내 약에서 추가: '+mine.map(m=>'<button type="button" class="fchip" data-mseq="'+esc(m.seq)+'" data-mname="'+esc(m.name)+'">'+esc(m.name)+'</button>').join(' ');
  $('#mineRow').addEventListener('click',e=>{const b=e.target.closest('[data-mseq]');if(b)add(b.dataset.mseq,b.dataset.mname)})}
$('#go').addEventListener('click',async()=>{ $('#out').innerHTML='<p class="note">확인하는 중… (약이 많으면 10초쯤 걸려요)</p>';
  try{const j=await (await fetch('/api/dur-check?seqs='+picked.map(p=>p.seq).sort().join(','))).json(); if(!j.ok)throw new Error(j.error);
    const nm=s=>{const d=j.drugs.find(x=>x.seq===s);return d?d.name:s};
    j.drugs.forEach(d=>{const p=picked.find(x=>x.seq===d.seq);if(p&&d.name)p.name=d.name}); draw();
    let h='<h2>확인 결과</h2>';
    if(!j.issues.length) h+='<div class="res ok"><b>✓ 등록된 금기나 중복이 없어요</b><p class="note" style="margin:6px 0 0">고른 '+j.drugs.length+'가지 약 사이에 식약처가 고시한 병용금기, 같은 성분 중복, 같은 종류 중복이 없어요. 그래도 처음 함께 먹는다면 약사에게 한 번 물어보세요.</p></div>';
    else h+=j.issues.map(x=>'<div class="res '+x.level+'"><b>'+(x.level==='stop'?'⛔ ':'⚠ ')+esc(x.title)+'</b><p style="margin:6px 0 0"><b style="display:inline;font-size:15px">'+esc(nm(x.a))+'</b> + <b style="display:inline;font-size:15px">'+esc(nm(x.b))+'</b></p><p class="note" style="margin:4px 0 0">'+esc(x.detail)+(x.why&&x.why.length?'<br>'+x.why.map(esc).join('<br>'):'')+'</p></div>').join('');
    h+='<p class="note" style="margin-top:12px">'+j.drugs.map(d=>'<a href="/drug/'+esc(d.seq)+'">'+esc(d.name)+'</a> 성분: '+esc(d.ingr.join(', ')||'정보 없음')).join('<br>')+'</p>';
    $('#out').innerHTML=h;
  }catch(er){$('#out').innerHTML='<p class="note">'+esc(er.message||'오류가 났어요.')+'</p>'}});
const s0=new URLSearchParams(location.search).get('seqs');
if(s0){picked=s0.split(',').filter(Boolean).slice(0,5).map(seq=>({seq,name:'품목 '+seq}));draw();if(picked.length>=2)$('#go').click()}

const STOP=new Set('조제일 투약량 투약일 처방일 약품명 복용 복약 식후 식전 식간 아침 점심 저녁 취침 하루 매일 약국 약사 환자 처방 조제 투약 성명 병원 의원 주의 보관 냉장 실온 안내 효능 효과 용법 용량 영수증 금액 본인부담 합계 전화 주소 일수 개수 횟수 총량 투여 내복 외용 진료 발행 교부 보험 의료 기관 번호 날짜 분량 시간 이전 이후 정도 경우 사항 다음 함께 드세요 마세요 하세요 복용법 약품명 약품 사진 모양 색깔 처방전 조제약 의약품 일반 전문 진통제 소화제 항생제 해열제 감기약 위장약 소염제 근이완제 기관지 가래 기침 콧물 두통 발열 해열 진통 소화'.split(' '));
const base=t=>t.replace(/[0-9.]+\\s*(mg|㎎|밀리그램|mcg|g|ml|mL|㎖|그램|정|캡슐)?$/i,'').replace(/(필름코팅정|서방정|연질캡슐|경질캡슐|장용정|캡슐|시럽|과립|현탁액|정|액|산)$/,'');
let tessP=null;
const loadTess=()=>tessP||(tessP=new Promise((ok,no)=>{if(window.Tesseract)return ok(window.Tesseract);const sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';sc.onload=()=>ok(window.Tesseract);sc.onerror=()=>{tessP=null;no(new Error('load'))};document.head.appendChild(sc)}));
const shrink=f=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>{const k=Math.min(1,2000/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=im.width*k;c.height=im.height*k;const g=c.getContext('2d');g.filter='grayscale(1) contrast(1.4)';g.drawImage(im,0,0,c.width,c.height);ok(c)};im.onerror=no;im.src=URL.createObjectURL(f)});
$('#ocrFile').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const o=$('#ocrOut');
  o.innerHTML='<p class="note">글자 인식 도구를 준비하는 중…</p>';
  let text='';
  try{const T=await loadTess();const cv=await shrink(f);const w=await T.createWorker('kor',1,{logger:m=>{if(m.status==='recognizing text')o.innerHTML='<p class="note">사진 속 글자를 읽는 중… '+Math.round(m.progress*100)+'%</p>'}});
    const r=await w.recognize(cv);text=r.data.text||'';await w.terminate();
  }catch(er){o.innerHTML='<p class="note">글자를 읽지 못했어요. 인터넷 연결을 확인하거나 위에서 약 이름으로 검색해 주세요.</p>';return}
  // 환자 이름 같은 개인정보는 검색어로 보내지 않음
  const names=new Set((text.match(/(?:환자|성명|이름|수진자|환자명)\\s*[:：]?\\s*([가-힣]{2,4})/g)||[]).map(m=>m.replace(/^(환자명|환자|성명|이름|수진자)\\s*[:：]?\\s*/,'')));
  const toks=[...new Set((text.match(/[가-힣A-Za-z][가-힣A-Za-z0-9.]{1,30}/g)||[]).map(t=>t.trim()).filter(t=>(t.match(/[가-힣]/g)||[]).length>=2).map(base).filter(t=>t.length>=2&&!STOP.has(t)&&!names.has(t)&&!/^(오전|오후|월|일|회)/.test(t)&&!/(약국|병원|의원|약방|센터|하세요|세요|니다|십시오)$/.test(t)))].slice(0,14);
  if(!toks.length){o.innerHTML='<p class="note">사진에서 약 이름을 찾지 못했어요. 약 이름 부분만 가까이 다시 찍거나 위에서 검색해 주세요.</p>';return}
  o.innerHTML='<p class="note">읽은 글자로 약을 찾는 중… ('+toks.length+'개 단어)</p>';
  const found=[];let i=0;
  const work=async()=>{while(i<toks.length){const t=toks[i++];if(t.length<2)continue;try{
    // 글자를 잘못 읽은 경우(캡슬·갭슐 등)를 생각해 짧게 줄여 다시 찾기
    const tries=[...new Set([t,t.replace(/(캡|갭|겝|켑|시러|과리|연고|크림|정|산).*$/,''),t.slice(0,4),t.slice(0,3)])].filter(x=>x.length>=2);
    let j={items:[]};for(const q of tries){j=await (await fetch('/api/yak?action=drug&q='+encodeURIComponent(q))).json();if((j.items||[]).length)break}
    const l=(j.items||[]).filter(x=>!/취소|취하/.test(x.CANCEL_NAME||'')&&!/수출용/.test(x.ITEM_NAME||'')&&String(x.ITEM_NAME).replace(/\\s/g,'').startsWith(t.replace(/\\s/g,'').slice(0,2)));
    if(l.length)found.push({t,l:l.slice(0,3)})}catch(er){}}};
  await Promise.all([work(),work(),work()]);
  if(!found.length){o.innerHTML='<p class="note">읽은 글자 중에 약 이름을 찾지 못했어요. 더 밝고 가까이 찍거나 위에서 직접 검색해 주세요.</p><details><summary class="note">읽은 글자 보기</summary><pre style="white-space:pre-wrap;font-size:13px">'+esc(text)+'</pre></details>';return}
  o.innerHTML='<p class="note" style="margin-top:10px">사진에서 찾은 약 후보예요. <b>약봉투에 적힌 이름과 같은지 확인하고</b> 추가하세요.</p>'+found.map(x=>'<div style="margin-top:8px"><small class="note">읽은 글자: '+esc(x.t)+'</small>'+x.l.map(d=>'<button type="button" class="addbtn" style="margin-top:4px" data-seq="'+esc(d.ITEM_SEQ)+'" data-name="'+esc(short(d.ITEM_NAME))+'"><span>'+esc(d.ITEM_NAME)+'<br><small>'+esc(d.ENTP_NAME)+'</small></span><span>＋ 추가</span></button>').join('')+'</div>').join('')+'<details style="margin-top:8px"><summary class="note">읽은 글자 전체 보기</summary><pre style="white-space:pre-wrap;font-size:13px">'+esc(text)+'</pre></details>';
});
$('#ocrOut').addEventListener('click',e=>{const b=e.target.closest('[data-seq]');if(b){add(b.dataset.seq,b.dataset.name);b.disabled=true;b.lastChild.textContent='✓ 추가됨'}});
}</script>`;
fs.writeFileSync(new URL('../check.html', import.meta.url), page({ title: '같이 먹어도 되나요? 약 병용금기·성분 중복 확인 | 이 약, 어디 있지?', desc: '먹는 약 2~5개를 고르면 식약처 DUR 정보로 함께 먹으면 안 되는 조합, 같은 성분 중복, 같은 종류 약 중복을 무료로 확인해 드려요.', path: '/check', body }));
console.log('ok');

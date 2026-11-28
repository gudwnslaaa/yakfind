import { page } from '../api/_lib.js';
import fs from 'fs';
const BOXJS = fs.readFileSync(new URL('./box.js', import.meta.url), 'utf8').replace(/^\/\/.*\n/, '');
const body = `
<nav class="crumb"><a href="/">약 검색</a> › 우리 집 약 상자</nav>
<h1>우리 집 약 상자</h1>
<p class="sub">집에 있는 약을 사람별로 저장해 두면 <b>사용기한이 지난 약</b>, <b>회수된 약</b>을 알려 드리고, 같이 먹어도 되는지도 바로 확인할 수 있어요.</p>
<div id="alerts"></div>
<div class="tabs" id="tabs" role="tablist" aria-label="사람별 보기"></div>
<p style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0"><a class="btn red" href="/scan">📷 바코드로 약 넣기</a><button class="btn" id="addName" type="button">이름으로 약 넣기</button><button class="btn" id="chk" type="button" hidden>이 사람 약 같이 먹어도 되나요?</button></p>
<form id="af" class="box" hidden style="display:grid;gap:10px"><div style="display:flex;gap:8px"><input id="aq" type="search" placeholder="약 이름 (예: 타이레놀)" aria-label="약 이름" minlength="2" required style="flex:1;min-width:0;height:46px;border:1px solid var(--line);border-radius:12px;padding:0 12px;font:inherit;font-size:16px;background:var(--bg);color:var(--ink)"><button class="btn ink" type="submit">찾기</button></div><div id="ares" class="list"></div></form>
<ul class="list" id="items"></ul>
<p class="note" style="margin-top:20px">약 상자는 <b>이 휴대폰(브라우저)에만</b> 저장돼요. 서버로 보내지 않아서 다른 기기에서는 보이지 않고, 브라우저 기록을 지우면 사라져요.</p>
<style>.tabs{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-top:8px}.tabs button{flex:none}
.bx{border:1px solid var(--line);border-radius:14px;padding:12px 14px;display:grid;gap:8px}.bx.bad{border-color:var(--red);background:var(--redbg)}.bx.soon{border-color:var(--warn)}
.bx .top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.bx h3{font-size:17px;margin:0}.bx h3 a{color:inherit}.bx .meta{font-size:14px;color:var(--mute)}
.bx .ed{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.bx select,.bx input{height:42px;border:1px solid var(--line);border-radius:10px;padding:0 8px;font:inherit;font-size:16px;background:var(--bg);color:var(--ink)}
.bx .rm{border:0;background:none;color:var(--mute);font-size:14px;cursor:pointer;min-height:42px;text-decoration:underline}
.res{border-radius:14px;padding:12px 14px;margin-top:10px}.res.stop{background:var(--redbg);border-left:5px solid var(--red)}.res.warn{background:var(--warnbg);border-left:5px solid var(--warn)}
.addbtn{display:flex;justify-content:space-between;width:100%;text-align:left;border:1px solid var(--line);border-radius:12px;padding:10px 14px;background:var(--bg);color:var(--ink);font:inherit;cursor:pointer}.addbtn small{color:var(--mute)}</style>
<script>{
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
${BOXJS}
let tab='전체',recalls=[];
const lotsOf=r=>String(r.lot||'').split(/,\\s*/).map(x=>x.replace(/\\s/g,'').toUpperCase()).filter(Boolean);
const recallOf=x=>{const rs=recalls.filter(r=>r.seq===x.seq);if(!rs.length)return null;if(x.lot){const L=x.lot.replace(/\\s/g,'').toUpperCase();return rs.some(r=>lotsOf(r).includes(L))?'hit':'other'}return 'maybe'};
function draw(){
  const all=BOX.get(),ps=BOX.people();
  if(tab!=='전체'&&!ps.includes(tab))tab='전체';
  $('#tabs').innerHTML=['전체',...ps].map(p=>'<button type="button" class="fchip'+(p===tab?' on':'')+'" data-tab="'+esc(p)+'" role="tab" aria-selected="'+(p===tab)+'">'+esc(p)+' '+(p==='전체'?all.length:all.filter(x=>x.who===p).length)+'</button>').join('')+'<button type="button" class="fchip" id="np">＋ 사람</button>';
  const list=all.map((x,i)=>({...x,i})).filter(x=>tab==='전체'||x.who===tab);
  const mineP=list.filter(x=>tab!=='전체');$('#chk').hidden=!(tab!=='전체'&&mineP.length>=2);
  const exp=all.filter(x=>{const d=BOX.days(x.exp);return d!==null&&d<0}),soon=all.filter(x=>{const d=BOX.days(x.exp);return d!==null&&d>=0&&d<=30});
  const hit=all.filter(x=>recallOf(x)==='hit'),maybe=all.filter(x=>recallOf(x)==='maybe');
  let a='';
  if(hit.length)a+='<p class="res stop"><b>⛔ 회수 대상 제조번호: '+esc(hit.map(x=>x.name+'('+x.who+')').join(', '))+'</b><br>먹지 말고 산 약국에 문의하세요.</p>';
  if(maybe.length)a+='<p class="res warn"><b>회수된 적 있는 약: '+esc([...new Set(maybe.map(x=>x.name))].join(', '))+'</b><br>상자의 제조번호가 <a href="/recall">회수 목록</a>과 같은지 확인하세요. 바코드로 다시 찍으면 자동으로 비교해 드려요.</p>';
  if(exp.length)a+='<p class="res stop"><b>사용기한 지난 약 '+exp.length+'개</b>: '+esc(exp.map(x=>x.name).join(', '))+'<br><a href="/disposal">남은 약 버리는 법 보기 →</a></p>';
  if(soon.length)a+='<p class="res warn">30일 안에 사용기한이 끝나는 약 '+soon.length+'개: '+esc(soon.map(x=>x.name).join(', '))+'</p>';
  $('#alerts').innerHTML=a;
  if(!list.length){$('#items').innerHTML='<li class="empty">'+(all.length?'이 사람의 약이 아직 없어요.':'약 상자가 비어 있어요. 약 상자의 바코드를 찍거나 이름으로 넣어 보세요.')+'</li>';return}
  list.sort((p,q)=>(BOX.days(p.exp)??9e9)-(BOX.days(q.exp)??9e9));
  $('#items').innerHTML=list.map(x=>{const d=BOX.days(x.exp),rc=recallOf(x);const cls=(d!==null&&d<0)||rc==='hit'?'bad':(d!==null&&d<=30)||rc?'soon':'';
    const st=d===null?'<span class="note">사용기한 미입력</span>':d<0?'<span class="tag closed" style="color:var(--red)">기한 지남</span>':d<=30?'<span class="tag soon">'+d+'일 남음</span>':'<span class="tag open">'+x.exp.replace(/-/g,'.')+'까지</span>';
    return '<li class="bx '+cls+'"><div class="top"><div><h3><a href="/drug/'+esc(x.seq)+'">'+esc(x.name)+'</a></h3><div class="meta">'+esc(x.who)+(x.lot?' · 제조번호 '+esc(x.lot):'')+(rc==='hit'?' · <b style="color:var(--red)">회수 대상</b>':rc?' · 회수 이력 있음':'')+'</div></div>'+st+'</div>'
     +'<div class="ed"><select data-who="'+x.i+'" aria-label="누구 약">'+BOX.people().map(p=>'<option'+(p===x.who?' selected':'')+'>'+esc(p)+'</option>').join('')+'</select><input type="date" data-exp="'+x.i+'" value="'+esc(x.exp||'')+'" aria-label="사용기한"><button type="button" class="rm" data-rm="'+x.i+'">빼기</button></div></li>'}).join('');
}
$('#tabs').addEventListener('click',e=>{if(e.target.id==='np'){const p=BOX.addPerson(prompt('누구의 약 상자를 만들까요? (예: 엄마, 아빠, 아이)')||'');if(p){tab=p;draw()}return}const b=e.target.closest('[data-tab]');if(b){tab=b.dataset.tab;draw()}});
$('#items').addEventListener('change',e=>{const a=BOX.get();const t=e.target;if(t.dataset.who){a[+t.dataset.who].who=t.value;BOX.set(a);draw()}if(t.dataset.exp){a[+t.dataset.exp].exp=t.value;BOX.set(a);draw()}});
$('#items').addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(!b)return;const a=BOX.get();a.splice(+b.dataset.rm,1);BOX.set(a);draw()});
$('#chk').addEventListener('click',()=>{const s=[...new Set(BOX.get().filter(x=>x.who===tab).map(x=>x.seq))].slice(0,5);location.href='/check?seqs='+s.join(',')});
$('#addName').addEventListener('click',()=>{$('#af').hidden=!$('#af').hidden;if(!$('#af').hidden)$('#aq').focus()});
$('#af').addEventListener('submit',async e=>{e.preventDefault();const q=$('#aq').value.trim();if(q.length<2)return;$('#ares').innerHTML='<p class="note">찾는 중…</p>';
  try{const j=await (await fetch('/api/yak?action=drug&q='+encodeURIComponent(q))).json();if(!j.ok)throw new Error(j.error);
    const l=j.items.filter(x=>!/취소|취하/.test(x.CANCEL_NAME||'')&&!/수출용/.test(x.ITEM_NAME||'')).slice(0,10);
    $('#ares').innerHTML=l.length?l.map(x=>'<button type="button" class="addbtn" data-seq="'+esc(x.ITEM_SEQ)+'" data-name="'+esc(String(x.ITEM_NAME).replace(/\\(.*?\\)/g,'').trim())+'"><span>'+esc(x.ITEM_NAME)+'<br><small>'+esc(x.ENTP_NAME)+'</small></span><span>＋ 넣기</span></button>').join(''):'<p class="note">검색 결과가 없어요.</p>'}
  catch(er){$('#ares').innerHTML='<p class="note">'+esc(er.message||'오류가 났어요.')+'</p>'}});
$('#ares').addEventListener('click',e=>{const b=e.target.closest('[data-seq]');if(!b)return;BOX.add({seq:b.dataset.seq,name:b.dataset.name,who:tab==='전체'?'나':tab,exp:''});$('#ares').innerHTML='<p class="note">넣었어요. 아래에서 사용기한을 입력해 주세요.</p>';$('#aq').value='';draw()});
draw();
const seqs=[...new Set(BOX.get().map(x=>x.seq))];
if(seqs.length)fetch('/api/recall?seqs='+seqs.join(',')).then(r=>r.json()).then(j=>{recalls=j.items||[];draw()}).catch(()=>{});
}</script>`;
fs.writeFileSync(new URL('../mybox.html', import.meta.url), page({ title: '우리 집 약 상자 — 사용기한·회수 약 알림 | 이 약, 어디 있지?', desc: '집에 있는 약을 가족별로 저장하고 사용기한이 지난 약, 회수된 약을 확인하세요. 바코드로 쉽게 넣을 수 있어요.', path: '/mybox', body, noindex: false }));
console.log('ok');

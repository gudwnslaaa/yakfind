import { page } from '../lib/_lib.js';
import fs from 'fs';
const SH = ['원형','타원형','장방형','반원형','삼각형','사각형','마름모형','오각형','육각형','팔각형','기타'];
const CO = [['하양','#ffffff'],['노랑','#f6d33c'],['주황','#f39a2b'],['분홍','#f4a6c0'],['빨강','#d93a3a'],['갈색','#8b5a2b'],['연두','#a8d65a'],['초록','#2f9e4f'],['청록','#1aa3a3'],['파랑','#2f6fd6'],['남색','#23337a'],['자주','#a23a7a'],['보라','#8255c9'],['회색','#9aa0a6'],['검정','#222222'],['투명','linear-gradient(135deg,#eef3f7,#cfd9e2)']];
const body = `
<nav class="crumb"><a href="/">약 검색</a> › 모양으로 약 찾기</nav>
<h1>이 알약, 무슨 약이지?</h1>
<p class="sub">알약에 새겨진 글자, 모양, 색을 고르면 식약처 낱알식별 정보 2만5천여 개 중에서 찾아 드려요. 글자를 넣으면 가장 정확해요.</p>
<div class="box" id="ph"><b>📷 알약 사진으로 보면서 고르기</b><p class="note" style="margin:6px 0 10px">알약을 밝은 곳에서 크게 찍으면, 확대해서 새겨진 글자를 읽고 <b>알약을 눌러 색을 고를 수 있어요</b>. 사진은 휴대폰 안에서만 보여요.</p>
  <label class="btn" style="display:inline-flex;align-items:center;cursor:pointer">사진 찍기·고르기<input id="pfile" type="file" accept="image/*" capture="environment" hidden></label>
  <div id="pview" hidden><div id="pbox" style="margin-top:12px;overflow:auto;max-height:60vh;border-radius:12px;background:#000;touch-action:pan-x pan-y;cursor:crosshair"><img id="pimg" alt="찍은 알약 사진" style="display:block;width:100%;max-width:none"></div>
  <p style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0 0"><button type="button" class="btn" id="zin">＋ 크게</button><button type="button" class="btn" id="zout">－ 작게</button><span class="note" id="pmsg">알약 위를 누르면 색을 골라 드려요.</span></p></div>
</div>
<form id="pf" class="box" style="display:grid;gap:16px">
  <label><b>알약에 적힌 글자·숫자</b> <small class="note">앞면이나 뒷면, 한쪽만 넣어도 돼요</small><br><input id="pp" type="search" placeholder="예: TYLENOL, YH, 500" style="margin-top:8px;width:100%;height:48px;border:1px solid var(--line);border-radius:12px;padding:0 14px;font:inherit;font-size:16px;background:var(--bg);color:var(--ink)"></label>
  <div><b>모양</b><div class="chips2" id="shapes">${['', ...SH].map(s => `<button type="button" class="fchip${s ? '' : ' on'}" data-shape="${s}">${s || '상관없음'}</button>`).join('')}</div></div>
  <div><b>색</b><div class="chips2" id="colors"><button type="button" class="fchip on" data-color="">상관없음</button>${CO.map(([n, c]) => `<button type="button" class="fchip" data-color="${n}"><i style="background:${c}"></i>${n}</button>`).join('')}</div></div>
  <div><b>종류</b><div class="chips2" id="forms">${[['', '상관없음'], ['정제', '알약(정제)'], ['경질캡슐', '딱딱한 캡슐'], ['연질캡슐', '말랑한 캡슐']].map(([v, t], i) => `<button type="button" class="fchip${i ? '' : ' on'}" data-form="${v}">${t}</button>`).join('')}</div></div>
  <div><b>가운데 쪼개는 선(분할선)</b><div class="chips2" id="lines">${[['', '상관없음'], ['yes', '있음'], ['no', '없음']].map(([v, t], i) => `<button type="button" class="fchip${i ? '' : ' on'}" data-line="${v}">${t}</button>`).join('')}</div></div>
  <p style="margin:0"><button class="btn red" type="submit">알약 찾기</button></p>
</form>
<div id="pout"></div>
<div class="box"><b>모르는 약은 먹지 마세요</b><p class="note" style="margin:6px 0 0">사진과 정보가 비슷해도 다른 약일 수 있어요. 확실하지 않으면 약을 들고 가까운 약국에 가서 확인하세요. 아이나 반려동물이 삼켰다면 바로 119나 병원에 연락하세요.</p></div>
<style>.chips2{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.chips2 i{display:inline-block;width:14px;height:14px;border-radius:50%;border:1px solid var(--line);margin-right:6px;vertical-align:-2px}
.pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;list-style:none;padding:0;margin:12px 0}
.pgrid a{display:block;border:1px solid var(--line);border-radius:14px;overflow:hidden;text-decoration:none;color:var(--ink)}.pgrid a:hover{border-color:var(--ink)}
.pgrid img{display:block;width:100%;aspect-ratio:780/426;object-fit:cover;background:#fff}.pgrid .noimg{aspect-ratio:780/426;background:var(--paper)}
.pgrid div{padding:10px 12px}.pgrid b{display:block;font-size:15px}.pgrid small{color:var(--mute);font-size:13px;display:block}</style>
<script>{
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const st={shape:'',color:'',form:'',line:''};
for(const [id,k] of [['#shapes','shape'],['#colors','color'],['#forms','form'],['#lines','line']])
  $(id).addEventListener('click',e=>{const b=e.target.closest('[data-'+k+']');if(!b)return;st[k]=b.dataset[k];for(const x of $(id).children)x.classList.toggle('on',x===b)});
$('#pf').addEventListener('submit',async e=>{e.preventDefault();
  const print=$('#pp').value.trim();
  if(!print&&!st.shape&&!st.color){$('#pout').innerHTML='<p class="note">글자, 모양, 색 중 하나 이상을 골라 주세요.</p>';return}
  $('#pout').innerHTML='<p class="note">찾는 중… 처음 한 번은 전체 목록을 받느라 20~30초 걸릴 수 있어요.</p>';
  const p=new URLSearchParams({...st,print});for(const [k,v] of [...p])if(!v)p.delete(k);
  try{history.replaceState(null,'','/pill?'+p)}catch(er){}
  try{const j=await (await fetch('/api/pill?'+p)).json();if(!j.ok)throw new Error(j.error);
    if(!j.total){$('#pout').innerHTML='<h2>찾은 알약 0개</h2><p class="note">조건을 하나씩 빼 보세요. 글자는 일부만 넣어도 돼요(예: TYLENOL → TYL).</p>';return}
    $('#pout').innerHTML='<h2>찾은 알약 '+j.total+'개'+(j.total>80?' <small class="note">앞의 80개만 보여요. 조건을 더 골라 보세요.</small>':'')+'</h2>'+(j.partial?'<p class="note">일부 목록을 받지 못해 결과가 빠졌을 수 있어요.</p>':'')+
    '<ul class="pgrid">'+j.items.map(r=>{const img=r[12]?(r[12].startsWith('http')?r[12]:'https://nedrug.mfds.go.kr/pbp/cmn/itemImageDownload/'+r[12]):'';
      return '<li><a href="/drug/'+esc(r[0])+'">'+(img?'<img src="'+esc(img)+'" alt="'+esc(r[1])+' 낱알 사진" loading="lazy">':'<span class="noimg" style="display:block"></span>')+'<div><b>'+esc(r[1])+'</b><small>'+esc(r[2])+' · '+esc(r[11])+'</small><small>'+esc([r[3],[r[4],r[5]].filter(Boolean).join('/'),r[6]?'앞 '+r[6]:'',r[7]?'뒤 '+r[7]:'',r[13]?r[13]+'×'+r[14]+'mm':''].filter(Boolean).join(' · '))+'</small></div></a></li>'}).join('')+'</ul>';
  }catch(er){$('#pout').innerHTML='<p class="note">'+esc(er.message||'오류가 났어요.')+'</p>'}});
const u=new URLSearchParams(location.search);
if([...u].length){$('#pp').value=u.get('print')||'';for(const [id,k] of [['#shapes','shape'],['#colors','color'],['#forms','form'],['#lines','line']]){const v=u.get(k)||'';const b=[...$(id).children].find(x=>x.dataset[k]===v);if(b)b.click()}$('#pf').requestSubmit()}

{const CO2=${JSON.stringify(CO)};const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
 const near=([r,g,b])=>{const mx=Math.max(r,g,b),mn=Math.min(r,g,b);if(mx>215&&mx-mn<28)return '하양';if(mx<55)return '검정';if(mx-mn<22)return '회색';let best='',bd=1e9;for(const [n,c] of CO2){if(!c.startsWith('#')||n==='하양'||n==='검정'||n==='회색')continue;const [R,G,B]=hex(c);const d=(R-r)**2*.3+(G-g)**2*.59+(B-b)**2*.11;if(d<bd){bd=d;best=n}}return best};
 let z=1,cv=null;const img=document.getElementById('pimg');
 document.getElementById('pfile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const u=URL.createObjectURL(f);img.onload=()=>{cv=document.createElement('canvas');const k=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));cv.width=img.naturalWidth*k;cv.height=img.naturalHeight*k;cv.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0,cv.width,cv.height);document.getElementById('pview').hidden=false;z=1;img.style.width='100%'};img.src=u});
 const zoom=f=>{z=Math.max(1,Math.min(5,z*f));img.style.width=(z*100)+'%'};
 document.getElementById('zin').addEventListener('click',()=>zoom(1.5));document.getElementById('zout').addEventListener('click',()=>zoom(1/1.5));
 img.addEventListener('click',e=>{if(!cv)return;const r=img.getBoundingClientRect();const x=Math.round((e.clientX-r.left)/r.width*cv.width),y=Math.round((e.clientY-r.top)/r.height*cv.height);
   const d=cv.getContext('2d').getImageData(Math.max(0,x-4),Math.max(0,y-4),9,9).data;let R=0,G=0,B=0,n=0;for(let i=0;i<d.length;i+=4){R+=d[i];G+=d[i+1];B+=d[i+2];n++}
   const c=[R/n,G/n,B/n].map(Math.round),nm=near(c);const btn=[...document.querySelectorAll('#colors [data-color]')].find(b=>b.dataset.color===nm);if(btn)btn.click();
   document.getElementById('pmsg').innerHTML='<i style="display:inline-block;width:18px;height:18px;border-radius:50%;vertical-align:-4px;border:1px solid var(--line);background:rgb('+c.join(',')+')"></i> 고른 색: <b>'+nm+'</b> — 아래 색 선택에 반영했어요. 글자도 읽어서 넣어 주세요.'})}
}</script>`;
fs.writeFileSync(new URL('../pill.html', import.meta.url), page({ title: '알약 모양·색·글자로 무슨 약인지 찾기 | 이 약, 어디 있지?', desc: '알약에 새겨진 글자, 모양, 색으로 식약처 낱알식별 정보 2만5천여 개 중에서 무슨 약인지 찾아보세요. 사진과 함께 보여드려요.', path: '/pill', body }));
console.log('ok');

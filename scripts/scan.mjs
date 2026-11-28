import { page } from '../api/_lib.js';
import fs from 'fs';
const BOXJS = fs.readFileSync(new URL('./box.js', import.meta.url), 'utf8').replace(/^\/\/.*\n/, '');
const body = `
<nav class="crumb"><a href="/">약 검색</a> › 바코드로 약 찾기</nav>
<h1>약 상자 바코드 찍기</h1>
<p class="sub">약 상자나 병에 있는 바코드를 비추면 무슨 약인지, 회수 대상인지 바로 알려드려요. 네모난 2D 바코드를 찍으면 <b>제조번호와 사용기한</b>까지 읽어요.</p>
<p class="res warn" id="kakao" hidden>카카오톡 안에서 열면 카메라 초점이 잘 안 맞을 수 있어요. <a class="btn" id="kakaoOpen" href="#" style="margin-top:6px">크롬(기본 브라우저)으로 열기</a></p>
<div class="box" style="display:grid;gap:12px">
  <button class="btn red big" id="cam" type="button">📷 카메라로 바코드 찍기</button>
  <div id="camWrap" hidden><div class="vf"><video id="vid" playsinline muted></video><i></i></div>
  <p class="note" id="camMsg" style="text-align:center">휴대폰을 <b>한 뼘(15~20cm) 떨어뜨리고</b>, 바코드가 작으면 <b>확대</b>를 눌러 네모 안에 맞춰 주세요. 너무 가까우면 초점이 안 맞아요.</p>
  <div class="camctl"><button class="btn" id="zoomBtn" type="button" hidden>🔍 확대 1x</button><button class="btn" id="torchBtn" type="button" hidden>🔦 플래시</button><button class="btn" id="camStop" type="button">카메라 끄기</button></div>
  <p class="res warn" id="camHelp" hidden>잘 안 읽히나요? <b>‘사진으로 찍기’</b>를 눌러 휴대폰 카메라로 찍어 보세요. 초점을 더 잘 맞춰요.</p></div>
  <label class="btn" style="display:flex;align-items:center;justify-content:center;cursor:pointer">🖼 사진으로 찍기·고르기<input id="photo" type="file" accept="image/*" capture="environment" hidden></label>
  <form id="mf" style="display:flex;gap:8px"><input id="mcode" inputmode="numeric" pattern="[0-9]*" maxlength="13" placeholder="바코드 아래 숫자 13자리 (880…)" aria-label="바코드 숫자" style="flex:1;min-width:0;height:48px;border:1px solid var(--line);border-radius:12px;padding:0 12px;font:inherit;font-size:16px;background:var(--bg);color:var(--ink)"><button class="btn ink" type="submit">찾기</button></form>
</div>
<div id="out" aria-live="polite"></div>
<details class="box" style="margin-top:18px"><summary><b>잘 안 읽혀요</b></summary><ul class="note" style="margin:10px 0 0;padding-left:18px"><li>밝은 곳에서, 바코드가 화면 가운데 크게 오도록 찍어 주세요.</li><li>병이나 둥근 용기는 바코드가 휘지 않게 옆으로 살짝 돌려 보세요.</li><li>그래도 안 되면 바코드 아래 <b>880으로 시작하는 13자리 숫자</b>를 직접 넣어 주세요.</li><li>건강기능식품(영양제)·화장품은 의약품 바코드가 아니라서 나오지 않아요.</li></ul></details>
<p class="note" style="margin-top:16px">카메라 영상과 사진은 휴대폰 안에서만 읽고 어디에도 보내지 않아요. 자료: 식품의약품안전처 의약품 제품 허가정보.</p>
<style>.big{height:56px;font-size:18px;width:100%}.camctl{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.camctl .btn{flex:1;min-width:0}.vf{position:relative;border-radius:16px;overflow:hidden;background:#000;aspect-ratio:4/3}.vf video{width:100%;height:100%;object-fit:cover;display:block}.vf i{position:absolute;inset:22% 10%;border:3px solid #fff;border-radius:12px;box-shadow:0 0 0 999px rgba(0,0,0,.35)}
.card{border:1px solid var(--line);border-radius:16px;padding:16px;margin-top:16px;background:var(--paper)}.card h2{font-size:21px;margin:0 0 4px}.kv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:12px 0;font-size:15px}.kv b{color:var(--mute);font-weight:500}
.res{border-radius:14px;padding:12px 14px;margin-top:12px}.res.stop{background:var(--redbg);border-left:5px solid var(--red)}.res.warn{background:var(--warnbg);border-left:5px solid var(--warn)}.res.ok{background:var(--okbg);border-left:5px solid var(--ok)}
.save{display:grid;gap:10px;margin-top:14px;border-top:1px solid var(--line);padding-top:14px}.save label{display:grid;gap:4px;font-size:15px}.save select,.save input{height:46px;border:1px solid var(--line);border-radius:12px;padding:0 10px;font:inherit;font-size:16px;background:var(--bg);color:var(--ink)}</style>
<script type="module">
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
${BOXJS}
let Det=null;
async function detector(){ if(Det)return Det;
  const F=['ean_13','data_matrix','code_128','qr_code'];
  if('BarcodeDetector' in window){try{const s=await BarcodeDetector.getSupportedFormats();if(s.includes('ean_13'))return Det=new BarcodeDetector({formats:F.filter(f=>s.includes(f))})}catch(e){}}
  const m=await import('https://fastly.jsdelivr.net/npm/barcode-detector@3/dist/es/ponyfill.min.js');
  return Det=new m.BarcodeDetector({formats:F});
}
// GS1 2D 바코드: (01)GTIN14 (17)사용기한YYMMDD (10)제조번호 (21)일련번호
function parse(raw){ let s=String(raw||'').replace(/^\\]d2|^\\]C1|^\\]Q3/,'');
  const out={raw:s};
  if(/^880\\d{10}$/.test(s)){out.code=s;return out}
  if(/^0?880\\d{10}$/.test(s.replace(/\\D/g,''))&&s.replace(/\\D/g,'').length<=14){out.code=s.replace(/\\D/g,'').slice(-13);return out}
  const GS=String.fromCharCode(29); const fixed={'01':14,'17':6,'11':6,'15':6};
  let i=0;s=s.replace(/\\(|\\)/g,m=>m==='('?GS:'');if(s[0]===GS)s=s.slice(1);
  while(i<s.length){const ai=s.slice(i,i+2);i+=2;
    if(fixed[ai]){const v=s.slice(i,i+fixed[ai]);i+=fixed[ai];if(s[i]===GS)i++;
      if(ai==='01')out.code=v.slice(1);if(ai==='17'){const y=2000+ +v.slice(0,2),mo=v.slice(2,4),d=v.slice(4,6)==='00'?String(new Date(y,+mo,0).getDate()):v.slice(4,6);out.exp=y+'-'+mo+'-'+d.padStart(2,'0')}}
    else if(ai==='10'||ai==='21'){let j=s.indexOf(GS,i);if(j<0)j=s.length;const v=s.slice(i,j);i=j+1;if(ai==='10')out.lot=v;else out.serial=v}
    else break;}
  if(out.code&&!/^880\\d{10}$/.test(out.code))out.code='';
  return out;
}
let stream=null,timer=null,busy=false;
let track=null,zooms=[],zi=0,started=0,torch=false;
function stopCam(){if(timer)clearInterval(timer);timer=null;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;track=null;$('#camWrap').hidden=true;$('#cam').hidden=false;$('#camHelp').hidden=true}
$('#camStop').addEventListener('click',stopCam);
// 가운데 네모 부분만 잘라 2배로 키워서 읽기 (작은 바코드도 잘 읽히게)
const cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true});
function crop(v){const w=v.videoWidth,h=v.videoHeight;if(!w)return null;const cw=w*.8,ch=h*.56;cv.width=Math.min(1600,cw*2);cv.height=cv.width*ch/cw;cx.drawImage(v,(w-cw)/2,(h-ch)/2,cw,ch,0,0,cv.width,cv.height);return cv}
$('#zoomBtn').addEventListener('click',async()=>{if(!track||!zooms.length)return;zi=(zi+1)%zooms.length;try{await track.applyConstraints({advanced:[{zoom:zooms[zi]}]})}catch(e){}$('#zoomBtn').textContent='🔍 확대 '+zooms[zi]+'x'});
$('#torchBtn').addEventListener('click',async()=>{if(!track)return;torch=!torch;try{await track.applyConstraints({advanced:[{torch}]})}catch(e){}$('#torchBtn').classList.toggle('ink',torch)});
$('#cam').addEventListener('click',async()=>{
  $('#out').innerHTML='';
  try{ const d=detector();
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});
    const v=$('#vid');v.srcObject=stream;await v.play();$('#camWrap').hidden=false;$('#cam').hidden=true;$('#camWrap').scrollIntoView({block:'center',behavior:'smooth'});
    track=stream.getVideoTracks()[0];
    try{const c=track.getCapabilities?track.getCapabilities():{};
      if(c.focusMode&&c.focusMode.includes('continuous'))await track.applyConstraints({advanced:[{focusMode:'continuous'}]}).catch(()=>{});
      if(c.zoom&&c.zoom.max>1){zooms=[1,2,3].filter(z=>z>=c.zoom.min&&z<=c.zoom.max);if(zooms.length>1){zi=0;$('#zoomBtn').hidden=false;$('#zoomBtn').textContent='🔍 확대 1x'}}
      if(c.torch){$('#torchBtn').hidden=false}}catch(e){}
    const det=await d;started=Date.now();let flip=0;
    timer=setInterval(async()=>{if(busy||!stream)return;busy=true;try{
        const src=(flip++%2===0)?crop(v):v; const r=src?await det.detect(src):[];
        const hit=r.map(x=>parse(x.rawValue)).find(x=>x.code);
        if(hit){navigator.vibrate&&navigator.vibrate(80);stopCam();show(hit)}
        else if(Date.now()-started>8000)$('#camHelp').hidden=false;
      }catch(e){}busy=false},200);
  }catch(e){stopCam();$('#out').innerHTML='<p class="res warn">카메라를 켜지 못했어요. 카메라 권한을 허용했는지 확인해 주세요. 안 되면 <b>사진으로 찍기</b>나 숫자 입력을 써 주세요.</p>'}
});
// 사진: 원본 → 가운데 확대 → 작게 줄인 것 순서로 여러 번 시도
async function detectFile(det,f){const bmp=await createImageBitmap(f);const tries=[bmp];
  const mk=(sx,sy,sw,sh,maxW)=>{const c=document.createElement('canvas');const k=Math.min(1,maxW/sw);c.width=sw*k;c.height=sh*k;c.getContext('2d').drawImage(bmp,sx,sy,sw,sh,0,0,c.width,c.height);return c};
  const W=bmp.width,H=bmp.height;tries.push(mk(W*.15,H*.2,W*.7,H*.6,2000),mk(0,0,W,H,1400));
  for(const t of tries){try{const r=await det.detect(t);const hit=r.map(x=>parse(x.rawValue)).find(x=>x.code);if(hit)return hit}catch(e){}}return null}
$('#photo').closest('label').addEventListener('click',()=>{if(stream)stopCam()});
$('#photo').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;$('#out').innerHTML='<p class="note">사진에서 바코드를 찾는 중…</p>';
  try{stopCam();const det=await detector();const hit=await detectFile(det,f);
    if(hit)show(hit);else $('#out').innerHTML='<p class="res warn">사진에서 약 바코드를 찾지 못했어요. 한 뼘 떨어져서 바코드가 <b>흔들림 없이 선명하게</b> 나오게 다시 찍어 주세요. 둥근 병은 바코드가 정면으로 오게 돌려서 찍으면 잘 돼요. 안 되면 바코드 아래 숫자 13자리를 직접 넣어 주세요.</p>';
  }catch(er){$('#out').innerHTML='<p class="res warn">바코드를 읽는 도구를 불러오지 못했어요. 숫자 13자리를 직접 넣어 주세요.</p>'}
  e.target.value='';});
$('#mf').addEventListener('submit',e=>{e.preventDefault();const p=parse($('#mcode').value.replace(/\\D/g,''));if(!p.code){$('#out').innerHTML='<p class="res warn">880으로 시작하는 13자리 숫자를 넣어 주세요.</p>';return}show(p)});
const fmt=s=>s?s.replace(/-/g,'.'):'';
async function show(p){
  $('#out').innerHTML='<p class="note">약 정보를 찾는 중…</p>';
  let j;try{j=await (await fetch('/api/yak?action=barcode&code='+p.code)).json()}catch(e){j={ok:false,error:'연결이 끊겼어요. 다시 시도해 주세요.'}}
  if(!j.ok){$('#out').innerHTML='<p class="res warn">'+esc(j.error||'오류가 났어요.')+'</p>';return}
  const d=j.items[0];
  if(!d){$('#out').innerHTML='<div class="card"><b>바코드 '+esc(p.code)+'</b><p class="note">등록된 의약품을 찾지 못했어요. 건강기능식품·의약외품이거나 바코드가 바뀐 제품일 수 있어요. <a href="/?q=">약 이름으로 검색</a>해 보세요.</p></div>';return}
  const rx=/전문/.test(d.ETC_OTC_CODE||'');const cancel=/취소|취하/.test(d.CANCEL_NAME||'');
  const nm=String(d.ITEM_NAME||'').replace(/\\(.*?\\)/g,'').trim();
  const dd=p.exp?BOX.days(p.exp):null;
  let h='<div class="card"><p class="note" style="margin:0">'+esc(d.ENTP_NAME)+' · <span class="tag '+(rx?'rx':'otc')+'">'+(rx?'전문의약품':'일반의약품')+'</span></p><h2>'+esc(d.ITEM_NAME)+'</h2>';
  if(cancel)h+='<p class="res stop"><b>허가가 '+esc(d.CANCEL_NAME)+'된 약이에요.</b> 먹기 전에 약사에게 확인하세요.</p>';
  h+='<div class="kv">'+(p.exp?'<b>사용기한</b><span>'+esc(fmt(p.exp))+(dd<0?' <span class="tag closed" style="background:var(--redbg);color:var(--red)">지났어요</span>':dd<=30?' <span class="tag soon">'+dd+'일 남음</span>':'')+'</span>':'')+(p.lot?'<b>제조번호</b><span>'+esc(p.lot)+'</span>':'')+(d.CHART?'<b>모양</b><span>'+esc(d.CHART)+'</span>':'')+(d.STORAGE_METHOD?'<b>보관</b><span>'+esc(d.STORAGE_METHOD)+'</span>':'')+(d.VALID_TERM?'<b>유효기간</b><span>'+esc(d.VALID_TERM)+'</span>':'')+'</div>';
  if(dd!==null&&dd<0)h+='<p class="res stop">사용기한이 지난 약이에요. 먹지 말고 <a href="/disposal">약국·보건소 폐의약품 수거함</a>에 버려 주세요.</p>';
  h+='<div id="rc"><p class="note">회수 대상인지 확인 중…</p></div>';
  h+='<p style="display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 0"><a class="btn ink" href="/drug/'+esc(d.ITEM_SEQ)+'">약 정보 자세히 보기</a><a class="btn" href="/check?seqs='+esc(d.ITEM_SEQ)+'">같이 먹어도 되나요?</a></p>';
  const ps=BOX.people();
  h+='<form class="save" id="sv"><b>우리 집 약 상자에 넣기</b><label>누구 약인가요?<select id="who">'+ps.map(x=>'<option>'+esc(x)+'</option>').join('')+'<option value="__new">＋ 사람 추가</option></select></label><input id="newWho" placeholder="이름 (예: 엄마, 아이)" maxlength="10" hidden><label>사용기한 <small class="note">상자에 적힌 날짜</small><input id="exp" type="date" value="'+esc(p.exp||'')+'"></label><button class="btn red" type="submit">★ 약 상자에 저장</button><p class="note" id="svMsg" style="margin:0"></p></form></div>';
  $('#out').innerHTML=h;$('#out').scrollIntoView({block:'start',behavior:'smooth'});
  $('#who').addEventListener('change',e=>{$('#newWho').hidden=e.target.value!=='__new';if(!$('#newWho').hidden)$('#newWho').focus()});
  $('#sv').addEventListener('submit',e=>{e.preventDefault();let who=$('#who').value;if(who==='__new'){who=BOX.addPerson($('#newWho').value);if(!who){$('#newWho').focus();return}}
    BOX.add({seq:d.ITEM_SEQ,name:nm,who,exp:$('#exp').value||'',lot:p.lot||''});
    $('#svMsg').innerHTML='저장했어요. <a href="/mybox">약 상자 열기 →</a>';});
  try{const r=await (await fetch('/api/recall?seqs='+d.ITEM_SEQ)).json();const list=(r.items||[]);
    let rc;
    if(!list.length)rc='<p class="res ok">✓ 회수·판매중지 목록에 없는 약이에요.</p>';
    else{const lots=list.flatMap(x=>String(x.lot||'').split(/,\\s*/)).filter(Boolean);
      const mine=p.lot&&lots.some(l=>l.replace(/\\s/g,'').toUpperCase()===p.lot.replace(/\\s/g,'').toUpperCase());
      if(mine)rc='<p class="res stop"><b>⛔ 이 제조번호('+esc(p.lot)+')는 회수 대상이에요.</b><br>먹지 말고 산 약국에 가져가 문의하세요. 이유: '+esc(list[0].reason||'공개되지 않음')+'</p>';
      else if(p.lot)rc='<p class="res warn">이 약의 <b>다른 제조번호</b>가 회수된 적이 있어요. 이 상자(제조번호 '+esc(p.lot)+')는 목록에 없어요.<br><small>회수된 번호: '+esc(lots.slice(0,6).join(', ')||'공개되지 않음')+'</small></p>';
      else rc='<p class="res warn"><b>이 약은 회수된 적이 있어요.</b> 상자의 제조번호가 아래와 같은지 확인하세요.<br><small>회수된 번호: '+esc(lots.slice(0,8).join(', ')||'공개되지 않음')+' · '+esc(list[0].date?list[0].date.slice(0,4)+'.'+list[0].date.slice(4,6):'')+'</small></p>';}
    $('#rc').innerHTML=rc;
  }catch(e){$('#rc').innerHTML=''}
}
if(/KAKAOTALK/i.test(navigator.userAgent)){$('#kakao').hidden=false;$('#kakaoOpen').href='kakaotalk://web/openExternal?url='+encodeURIComponent(location.href)}
const c0=new URLSearchParams(location.search).get('code');if(c0){const p=parse(c0);if(p.code)show(p)}
</script>`;
fs.writeFileSync(new URL('../scan.html', import.meta.url), page({ title: '약 바코드 찍어서 무슨 약인지·회수 대상인지 확인 | 이 약, 어디 있지?', desc: '약 상자 바코드를 휴대폰 카메라로 비추면 무슨 약인지, 회수·판매중지 대상인지, 사용기한이 지났는지 바로 알려드려요. 무료, 설치 필요 없음.', path: '/scan', body }));
console.log('ok');

// 약 상자 공통 (이 기기 localStorage 'yak_mine') — 각 페이지 <script>에 문자열로 넣음
const BOX=(()=>{const K='yak_mine';
 const get=()=>{try{const a=JSON.parse(localStorage.getItem(K))||[];return a.map(x=>({who:'나',...x}))}catch(e){return[]}};
 const set=a=>{try{localStorage.setItem(K,JSON.stringify(a.slice(0,80)))}catch(e){}};
 const people=()=>{const s=new Set(['나']);get().forEach(x=>s.add(x.who||'나'));try{(JSON.parse(localStorage.getItem('yak_people'))||[]).forEach(p=>s.add(p))}catch(e){}return [...s]};
 const addPerson=p=>{p=String(p||'').trim().slice(0,10);if(!p)return;let a=[];try{a=JSON.parse(localStorage.getItem('yak_people'))||[]}catch(e){}if(!a.includes(p)){a.push(p);try{localStorage.setItem('yak_people',JSON.stringify(a))}catch(e){}}return p};
 const add=it=>{const a=get();const i=a.findIndex(x=>x.seq===it.seq&&(x.who||'나')===(it.who||'나')&&(x.lot||'')===(it.lot||''));const v={who:'나',at:Date.now(),...(i>=0?a[i]:{}),...it};if(i>=0)a[i]=v;else a.unshift(v);set(a);return v};
 const days=exp=>{if(!exp)return null;const d=new Date(exp+'T00:00:00');if(isNaN(d))return null;return Math.floor((d-new Date(new Date().toDateString()))/864e5)};
 return {get,set,people,addPerson,add,days}})();

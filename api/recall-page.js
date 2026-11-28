// /recall → 최근 의약품 회수·판매중지 목록 페이지
import { esc, page, sendHtml, failPage } from './_lib.js';
import { recallList } from './recall.js';

const fmt = v => v.length === 8 ? `${v.slice(0, 4)}.${v.slice(4, 6)}.${v.slice(6)}` : v;
export default async function handler(req, res) {
  try {
    const all = await recallList();
    const year = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10).replace(/-/g, '');
    const recent = all.filter(r => r.date >= year);
    const months = new Map();
    for (const r of recent) { const m = r.date.slice(0, 6); if (!months.has(m)) months.set(m, []); months.get(m).push(r); }
    const body = `
<nav class="crumb"><a href="/">약 검색</a> › 회수·판매중지 약</nav>
<h1>회수·판매중지된 약</h1>
<p class="sub">식품의약품안전처가 공개한 최근 1년 동안의 의약품(마스크·거즈 같은 의약외품 포함) 회수·판매중지 ${recent.length}건이에요. 가장 최근 것이 위에 있어요.</p>
<div class="box cta"><b>회수 대상인지 확인하는 법</b><p class="note" style="margin:6px 0 0">회수는 대부분 <b>특정 제조번호(로트)</b>만 해당돼요. 같은 이름의 약이라도 상자나 병에 적힌 <b>제조번호</b>가 아래 목록과 같을 때만 회수 대상이에요. 해당하면 먹지 말고 산 약국에 가져가 문의하세요. 메인 화면에서 ★ 내 약에 저장해 두면, 저장한 약이 회수 목록에 오를 때 알려드려요.</p></div>
<p><input id="rq" type="search" placeholder="약 이름·회사로 찾기" aria-label="회수 목록에서 찾기" style="width:100%;max-width:420px;height:46px;border:1px solid var(--line);border-radius:12px;padding:0 14px;font:inherit;font-size:16px;background:var(--bg);color:var(--ink)"></p>
${[...months.entries()].map(([m, list]) => `<h2>${m.slice(0, 4)}년 ${+m.slice(4)}월 <small class="note">${list.length}건</small></h2><ul class="list">${list.map(r => `<li class="dur rc" data-t="${esc((r.name + ' ' + r.entp).toLowerCase())}"><b>${r.seq ? `<a href="/drug/${esc(r.seq)}">${esc(r.name)}</a>` : esc(r.name)}</b><small>${esc(r.entp)} · ${esc(fmt(r.date))} · 이유: ${esc(r.reason || '공개되지 않음')}${r.lot ? `<br>제조번호 <b style="display:inline;color:var(--ink)">${esc(r.lot)}</b>${r.made ? ` · 제조일 ${esc(r.made)}` : ''}${r.useBy ? ` · 사용기한 ${esc(r.useBy)}` : ''}` : ''}</small></li>`).join('')}</ul>`).join('')}
<p class="note" style="margin-top:20px">자료: 식품의약품안전처 의약품 회수·판매중지 정보 (공공데이터포털). 6시간마다 새로 받아요. 자세한 내용은 <a href="https://nedrug.mfds.go.kr" target="_blank" rel="noopener">의약품안전나라</a>에서 확인하세요.</p>
<script>{const q=document.getElementById('rq');q.addEventListener('input',()=>{const v=q.value.trim().toLowerCase();for(const li of document.querySelectorAll('.rc'))li.hidden=v&&!li.dataset.t.includes(v)})}</script>`;
    sendHtml(res, 200, page({ title: `회수·판매중지된 약 ${recent.length}건 — 최근 1년 의약품 회수 목록 | 이 약, 어디 있지?`,
      desc: `식약처가 공개한 최근 1년 의약품 회수·판매중지 ${recent.length}건. 제품명, 회사, 회수 이유, 제조번호까지 확인하세요.`, path: '/recall', body }), 21600);
  } catch (e) { failPage(res, e.message); }
}

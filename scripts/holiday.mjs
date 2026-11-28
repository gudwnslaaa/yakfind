import { page, SIDO, esc } from '../lib/_lib.js';
import fs from 'fs';
const body = `
<nav class="crumb"><a href="/">약 검색</a> › 설 연휴 문 여는 약국·병원</nav>
<h1>설 연휴 문 여는 약국·병원</h1>
<p class="sub">2027년 설 연휴는 <b>2월 6일(토)부터 9일(화)까지 나흘</b>이에요(9일은 대체공휴일). 연휴에 아프면 아래 순서로 찾아보세요. <span id="dday" class="tag soon" hidden></span></p>
<div class="box" style="background:var(--redbg);border-left:6px solid var(--red)"><b>숨쉬기 힘들거나, 의식이 흐리거나, 심한 통증·출혈이 있으면 바로 119</b><p style="margin:8px 0 0;display:flex;gap:8px;flex-wrap:wrap"><a class="btn red" href="tel:119">119 전화</a><a class="btn" href="/er">가까운 응급실 남은 병상</a></p></div>
<h2>1. 지금 문 연 약국</h2>
<p>공휴일 영업시간을 신고한 약국을 지금 시간 기준으로 보여드려요.</p>
<p style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn red" href="/#h-ph">내 위치 주변 문 연 약국</a><a class="btn" href="/convenience">편의점 상비약 (약국이 다 닫았을 때)</a></p>
<p class="note">우리 지역 약국의 공휴일 영업시간 한눈에 보기:</p>
<div style="display:flex;gap:8px;flex-wrap:wrap">${SIDO.map(s => `<a class="fchip" style="display:inline-flex;align-items:center;text-decoration:none" href="/pharmacy/${encodeURIComponent(s)}">${esc(s)}</a>`).join('')}</div>
<h2>2. 아이가 아플 때</h2>
<p><a href="/moonlight">달빛어린이병원</a>은 밤·주말·공휴일에도 소아 진료를 해요. 명절에도 문을 여는 곳이 많지만, 연휴 진료 여부는 꼭 전화로 확인하세요.</p>
<h2>3. 문 연 병원·의원</h2>
<p><a href="/clinic">문 연 병원 찾기</a>에서 진료과를 고르고 <b>‘공휴일’</b> 버튼을 누르면 공휴일 진료시간을 신고한 곳만 볼 수 있어요.</p>
<h2>4. 연휴 당번 약국·병원 확인</h2>
<p>명절 연휴에는 지자체가 당번 약국과 문 여는 병·의원을 따로 정해 알려요. 정확한 당번 정보는 아래에서 확인하세요.</p>
<ul><li><a href="https://www.e-gen.or.kr" target="_blank" rel="noopener">응급의료포털 E-gen</a> — 명절 문 여는 병·의원·약국 조회</li><li><a href="tel:120">120</a> 지역 콜센터, <a href="tel:129">129</a> 보건복지상담센터</li><li>시·군·구 보건소 누리집 공지</li></ul>
<h2>연휴 전에 챙겨 두면 좋은 상비약</h2>
<ul><li>해열·진통제 (아이가 있다면 어린이용도)</li><li>소화제, 지사제(설사약)</li><li>밴드·소독약, 화상 연고</li><li>체온계</li></ul>
<p class="note">집에 있는 약의 사용기한은 <a href="/mybox">우리 집 약 상자</a>에서 바코드로 확인할 수 있어요. 기한 지난 약은 <a href="/disposal">약국·보건소 수거함</a>에 버려 주세요.</p>
<p class="note" style="margin-top:20px">영업·진료시간은 기관이 국립중앙의료원에 신고한 공휴일 기준 정보예요. 명절 당일에는 신고한 시간과 다르게 쉬는 곳이 많으니 가기 전에 꼭 전화하세요.</p>
<script>{const s=new Date('2027-02-06T00:00:00+09:00'),e=new Date('2027-02-10T00:00:00+09:00'),n=new Date(),el=document.getElementById('dday');
if(n<s){el.hidden=false;el.textContent='연휴까지 D-'+Math.ceil((s-n)/864e5)}else if(n<e){el.hidden=false;el.textContent='지금 설 연휴예요'}}</script>`;
const jsonld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
  { '@type': 'Question', name: '2027년 설 연휴는 언제인가요?', acceptedAnswer: { '@type': 'Answer', text: '2027년 2월 6일(토)부터 9일(화)까지 나흘이에요. 9일은 대체공휴일이에요.' } },
  { '@type': 'Question', name: '설 연휴에 문 여는 약국은 어떻게 찾나요?', acceptedAnswer: { '@type': 'Answer', text: '내 위치 주변 문 연 약국 찾기로 지금 영업 중인 약국을 확인하고, 명절 당번 약국은 응급의료포털 E-gen이나 120 콜센터에서 확인하세요. 가기 전에 꼭 전화로 확인하세요.' } },
  { '@type': 'Question', name: '설 연휴에 아이가 아프면 어디로 가나요?', acceptedAnswer: { '@type': 'Answer', text: '밤·휴일 소아 진료를 하는 달빛어린이병원을 찾아보세요. 숨쉬기 힘들거나 경련이 멈추지 않는 등 위급하면 바로 119에 전화하세요.' } }] };
fs.writeFileSync(new URL('../holiday.html', import.meta.url), page({ title: '설 연휴 문 여는 약국·병원 찾기 (2027년 2월 6일~9일) | 이 약, 어디 있지?', desc: '2027년 설 연휴(2월 6일~9일)에 문 여는 약국, 달빛어린이병원, 공휴일 진료 병원, 응급실 남은 병상을 한 번에 찾아보세요. 지역별 공휴일 영업시간도 확인할 수 있어요.', path: '/holiday', body, jsonld }));
console.log('ok');

import { page } from '../api/_lib.js';
import fs from 'fs';
const body = `<h1>인터넷이 연결되지 않았어요</h1>
<p class="sub">연결되면 다시 시도해 주세요. 지금 급하다면 바로 전화하세요.</p>
<p style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn red" href="tel:119">119 전화 (응급)</a><a class="btn" href="tel:1339">1339 (질병관리청)</a><a class="btn" href="tel:120">120 (지역 콜센터 — 문 연 약국 안내)</a></p>
<p class="note">이전에 열어 본 화면과 <a href="/mybox">우리 집 약 상자</a>는 인터넷 없이도 볼 수 있어요.</p>
<p><button class="btn ink" type="button" onclick="location.reload()">다시 시도</button></p>`;
fs.writeFileSync(new URL('../offline.html', import.meta.url), page({ title: '인터넷 연결 없음 | 이 약, 어디 있지?', desc: '인터넷이 연결되지 않았어요.', path: '/offline', body, noindex: true }));
console.log('ok');

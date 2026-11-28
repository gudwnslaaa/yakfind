// 정적 페이지 다시 만들기: node scripts/build.mjs
// api/_lib.js 의 page()(머리말·바닥글·공통 CSS)를 고친 뒤에는 꼭 다시 실행해서 *.html 을 새로 만들어야 해요.
// index.html 은 손으로 관리하는 파일이라 여기서 만들지 않아요.
const pages = ['fever', 'convenience', 'check', 'pill', 'disposal', 'er', 'clinic', 'scan', 'mybox', 'offline', 'travel', 'privacy', 'holiday'];
for (const p of pages) { await import(new URL('./' + p + '.mjs', import.meta.url)); }

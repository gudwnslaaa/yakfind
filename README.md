# 이 약, 어디 있지? — GitHub + Vercel 배포 안내

PHP 호스팅 없이 GitHub 저장소와 Vercel(무료)로 올리는 버전입니다.
GitHub에 푸시하면 Vercel이 자동으로 다시 배포합니다.

## 주요 기능
- 약 이름 검색 → 성분(자주 쓰는 성분은 한글 표시), 전문/일반 구분, 효능·먹는 법·주의사항
- 같은 성분 제품 찾기 (드문 성분으로 검색해 정확도 높임, 수출용 제품 제외)
- 내 위치·지역으로 약국 찾기, 필터: 지금 영업 중 / 밤 10시 이후 / 24시간 / 전체
- 공휴일에는 지역 검색이 공휴일 영업시간을 사용 (index.html의 HOLIDAYS 목록, 해마다 추가)
- 주소로 바로 검색: `https://yakfind.vercel.app/?q=타이레놀` (블로그 링크용)
- SEO: 메타 태그, 공유 썸네일(og.png), robots.txt, sitemap.xml
- 방문자 통계: Vercel Web Analytics

## 파일 구성 (2026-11 기준)
**화면**
- `index.html` — 메인 화면 (손으로 관리. 약 검색·문 연 약국·메뉴)
- `*.html` (check, pill, scan, mybox, travel, holiday, privacy, er, clinic, convenience, disposal, offline) — **`scripts/`가 만들어 내는 파일. 직접 고치지 말고 `scripts/<이름>.mjs`를 고친 뒤 `node scripts/build.mjs` 실행**
- `manifest.webmanifest`, `sw.js`, `icon-*.png`, `apple-touch-icon.png` — 홈 화면 설치(PWA)

**서버 함수 (`api/`, Vercel 무료 요금제는 함수 12개까지 → `_`로 시작하는 파일은 함수가 아닌 공용 모듈)**
- `_lib.js` — 공용: 공공데이터 호출, 성분 정리, 영업시간 계산, 시·도 목록, **모든 페이지 틀 `page()`** (머리말·바닥글·하단 빠른 메뉴·신고 버튼)
- `yak.js` — 약 검색·성분·e약은요·주변/지역 약국·바코드
- `drug-page.js` (/drug/품목코드), `region-page.js` (/pharmacy/...), `topic-page.js` (/ingredient, /symptom)
- `dur-check.js` — 병용금기·중복 확인, `?en=1`은 영문 약 카드 정보
- `pill-index.js`, `pill.js` — 낱알식별(알약 찾기)
- `er.js` — 응급실 실시간 병상
- `clinic.js` (+ `_clinic.js`, `_moonlight.js`) — 병·의원, 달빛어린이병원(/moonlight)
- `recall.js` (+ `_recall.js`, `_recall-page.js`) — 회수·판매중지(/recall)
- `sitemap.js` — /sitemaps/*.xml

**기타**
- `scripts/` — 정적 페이지 생성기 (배포에는 안 올라감, `.vercelignore`)
- `vercel.json` — 주소 연결(rewrites), 함수 시간, 서울 리전

**해마다 할 일**
- 공휴일 목록: `index.html`의 HOLIDAYS, `scripts/clinic.mjs`·`api/_moonlight.js`의 HOL (현재 2027년 12월까지)
- `scripts/holiday.mjs` — 다음 명절(추석 등)에 맞게 날짜·문구 바꾸기

## 1. GitHub에 올리기
1. GitHub에서 새 저장소를 만듭니다 (예: `yakfind`). 공개·비공개 둘 다 됩니다.
2. 이 폴더의 파일을 전부 올립니다.
3. **인증키는 절대 파일에 넣지 마세요.** 키는 3번에서 Vercel에만 넣습니다.

## 2. Vercel 연결
1. https://vercel.com 에 GitHub 계정으로 가입합니다 (Hobby 무료 플랜).
2. Add New → Project → 방금 만든 저장소를 Import 합니다.
3. Framework Preset은 **Other**로 두고, 나머지 설정은 건드리지 않고 Deploy 합니다.

## 3. 인증키 넣기
1. Vercel 프로젝트 → Settings → Environment Variables
2. Name: `DATA_GO_KR_KEY`, Value: 공공데이터포털의 **일반 인증키(Decoding)**
3. 저장한 뒤 Deployments 탭에서 최신 배포를 **Redeploy** 해야 키가 적용됩니다.

## 4. 동작 확인
배포 주소(예: `https://yakfind.vercel.app`) 뒤에 붙여서 열어 봅니다. `"ok":true`가 나오면 정상입니다.
- `/api/yak?action=drug&q=타이레놀`
- `/api/yak?action=near&lat=37.5665&lon=126.9780`
- `/api/yak?action=area&sido=서울특별시&gu=중구&qt=1`

`"ok":true`인데 화면에 성분이나 영업시간이 비어 있으면, 위 주소의 응답에서 필드 이름(예: `ITEM_INGR_NAME`, `STARTTIME`)을 확인해 `index.html`의 같은 이름과 맞춰 주세요.

## 알아둘 점
- Vercel 주소는 기본으로 https라서 "내 위치로 찾기"가 바로 됩니다.
- 같은 검색은 Vercel 캐시가 받아서 공공 API를 다시 부르지 않습니다 (약 정보 12시간, 약국 정보 1시간).
- 개인 도메인은 Vercel → Settings → Domains에서 연결할 수 있습니다.
- 약 판매나 주문 기능은 넣지 마세요. 의약품 온라인 판매는 불법입니다.
- 약국 재고는 공개된 데이터가 없어 보여주지 않습니다.

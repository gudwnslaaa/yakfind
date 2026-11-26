# 이 약, 어디 있지? — GitHub + Vercel 배포 안내

PHP 호스팅 없이 GitHub 저장소와 Vercel(무료)로 올리는 버전입니다.
GitHub에 푸시하면 Vercel이 자동으로 다시 배포합니다.

## 파일 구성
- `index.html` — 화면
- `api/yak.js` — 공공데이터포털 중계 함수 (Vercel이 서버에서 실행, 인증키를 숨김)
- `vercel.json` — 함수를 서울 리전(icn1)에서 실행하도록 설정 (공공 API 응답 속도와 해외 접속 문제 대비)
- `package.json` — 함수 실행 설정 (설치할 패키지 없음)

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

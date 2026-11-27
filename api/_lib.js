// 공용 도구: 공공데이터 호출, 성분 정리, 페이지 틀
// 파일 이름이 _ 로 시작해서 Vercel이 주소로 열지 않고, 다른 함수에서 가져다 씁니다.

export const SITE = 'https://yakfind.vercel.app';
const UPSTREAM = process.env.UPSTREAM || 'https://apis.data.go.kr';
export const ROUTES = {
  permit: '/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnInq08',
  easy: '/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList',
  area: '/B552657/ErmctInsttInfoInqireService/getParmacyListInfoInqire',
  pill: '/1471000/MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03',
  durList: '/1471000/DURPrdlstInfoService03/getDurPrdlstInfoList03',
  dur_병용금기: '/1471000/DURPrdlstInfoService03/getUsjntTabooInfoList03',
  dur_특정연령대금기: '/1471000/DURPrdlstInfoService03/getSpcifyAgrdeTabooInfoList03',
  dur_임부금기: '/1471000/DURPrdlstInfoService03/getPwnmTabooInfoList03',
  dur_용량주의: '/1471000/DURPrdlstInfoService03/getCpctyAtentInfoList03',
  dur_투여기간주의: '/1471000/DURPrdlstInfoService03/getMdctnPdAtentInfoList03',
  dur_노인주의: '/1471000/DURPrdlstInfoService03/getOdsnAtentInfoList03',
  dur_효능군중복: '/1471000/DURPrdlstInfoService03/getEfcyDplctInfoList03',
  dur_서방정분할주의: '/1471000/DURPrdlstInfoService03/getSeobangjeongPartitnAtentInfoList03',
};
export const DUR_TYPES = ['병용금기', '특정연령대금기', '임부금기', '노인주의', '용량주의', '투여기간주의', '효능군중복', '서방정분할주의'];

const unxml = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`)); return m ? unxml(m[1]).trim() : ''; };
function parseXml(xml) {
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const row = {};
    for (const f of m[1].matchAll(/<([A-Za-z0-9_]+)\s*\/>|<([A-Za-z0-9_]+)>([\s\S]*?)<\/\2>/g)) {
      if (f[1]) row[f[1].toUpperCase()] = ''; else row[f[2].toUpperCase()] = unxml(f[3]).trim();
    }
    items.push(row);
  }
  return { gateway: tag(xml, 'returnAuthMsg') || (xml.includes('<cmmMsgHeader>') ? tag(xml, 'errMsg') || '오류' : ''),
    code: tag(xml, 'resultCode'), total: parseInt(tag(xml, 'totalCount'), 10) || items.length, items };
}
function parseJson(j) {
  const root = j.response || j; const h = root.header || {}; const b = root.body || {};
  let items = b.items ?? [];
  if (items && !Array.isArray(items) && items.item) items = items.item;
  if (items && !Array.isArray(items)) items = [items];
  items = (items || []).filter(x => x && typeof x === 'object').map(x => {
    const r = {}; for (const [k, v] of Object.entries(x)) r[k.trim().toUpperCase()] = v == null || typeof v === 'object' || v === 'null' ? '' : String(v); return r;
  });
  return { gateway: '', code: String(h.resultCode ?? '00'), total: Number(b.totalCount) || items.length, items };
}

// 공공 API 한 번 호출. 실패하면 예외.
export async function call(route, params) {
  const KEY = process.env.DATA_GO_KR_KEY;
  if (!KEY) throw new Error('인증키가 설정되지 않았어요.');
  const r = await fetch(UPSTREAM + ROUTES[route] + '?' + new URLSearchParams({ serviceKey: KEY, pageNo: 1, ...params }), { signal: AbortSignal.timeout(15000) });
  const text = await r.text();
  let d; try { d = parseJson(JSON.parse(text)); } catch { d = parseXml(text); }
  if (d.gateway) throw new Error(d.gateway);
  if (d.code && d.code !== '00' && d.code !== '0') throw new Error('오류 ' + d.code);
  return d;
}
// 여러 쪽을 이어 받기 (최대 maxPages쪽, 동시에 batch개씩)
export async function callAll(route, params, rows, maxPages = 40, batch = 6) {
  let first = await call(route, { ...params, numOfRows: rows });
  // 서버가 한 번에 주는 개수를 줄여 보내면 그 개수에 맞춰 다시 셈
  if (first.items.length && first.items.length < rows && first.total > first.items.length) {
    rows = first.items.length; first = await call(route, { ...params, numOfRows: rows });
  }
  const pages = Math.min(maxPages, Math.ceil(first.total / rows));
  const items = [...first.items];
  for (let p = 2; p <= pages; p += batch) {
    const nums = Array.from({ length: Math.min(batch, pages - p + 1) }, (_, i) => p + i);
    const got = await Promise.all(nums.map(n => call(route, { ...params, numOfRows: rows, pageNo: n }).catch(() => null)));
    for (const g of got) if (g) items.push(...g.items);
  }
  return { total: first.total, items };
}

export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const clean = v => String(v ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ').trim();

// ---- 성분 ----
const FORM_WORDS = /\b(granules?|micronized|powder|coated|encapsulated|fine|direct compression|dc|anhydrous|hydrate|monohydrate|dihydrate|trihydrate|sesquihydrate)\b/gi;
export const ingrKey = s => s.toLowerCase().replace(/\d+(\.\d+)?\s*%/g, ' ').replace(FORM_WORDS, ' ').replace(/[^a-z0-9가-힣]+/g, ' ').trim();
export function ingredients(d) {
  const seen = new Map();
  for (const part of String(d.ITEM_INGR_NAME || '').replace(/\[[A-Z]?\d+\]/g, '').split(/[\/|;]+/)) {
    const name = part.trim(); if (/^as\b/i.test(name)) continue; const k = ingrKey(name);
    if (k && !seen.has(k)) seen.set(k, name.replace(FORM_WORDS, '').replace(/\s*\d+(\.\d+)?\s*%/g, '').replace(/\s+/g, ' ').trim() || name);
  }
  return [...seen.values()];
}
export const ingrSet = d => [...new Set(ingredients(d).map(ingrKey))].sort().join('|');
const KO = {'acetaminophen':'아세트아미노펜','ibuprofen':'이부프로펜','dexibuprofen':'덱시부프로펜','naproxen':'나프록센','naproxen sodium':'나프록센나트륨','aspirin':'아스피린','caffeine':'카페인','isopropylantipyrine':'이소프로필안티피린','chlorpheniramine maleate':'클로르페니라민말레산염','pseudoephedrine hydrochloride':'슈도에페드린염산염','phenylephrine hydrochloride':'페닐레프린염산염','dextromethorphan hydrobromide':'덱스트로메토르판브롬화수소산염','guaifenesin':'구아이페네신','dl methylephedrine hydrochloride':'dl-메틸에페드린염산염','loratadine':'로라타딘','cetirizine hydrochloride':'세티리진염산염','fexofenadine hydrochloride':'펙소페나딘염산염','famotidine':'파모티딘','pamabrom':'파마브롬','magnesium oxide':'산화마그네슘','ascorbic acid':'아스코르브산','thiamine nitrate':'질산티아민','riboflavin':'리보플라빈','loperamide hydrochloride':'로페라미드염산염','simethicone':'시메티콘','bisacodyl':'비사코딜','ketoprofen':'케토프로펜','diclofenac sodium':'디클로페낙나트륨','noscapine':'노스카핀'};
export const koName = n => KO[ingrKey(n)] || '';
export const showIngr = n => koName(n) ? `${koName(n)} (${n})` : n;
const COMMON = new Set(['acetaminophen','caffeine','ibuprofen','chlorpheniramine maleate','ascorbic acid','thiamine nitrate','riboflavin','magnesium oxide','pyridoxine hydrochloride']);
export const queryIngr = ing => ing.find(x => !COMMON.has(ingrKey(x))) || ing[0];
export const isRx = d => /전문/.test(d.SPCLTY_PBLC || '');
export const alive = d => !/취소|취하|폐지/.test(d.CANCEL_NAME || '') && !/수출용/.test(d.ITEM_NAME || '');
export const imgOf = d => { const u = String(d.BIG_PRDT_IMG_URL || d.ITEMIMAGE || '').trim(); return /^https?:\/\//.test(u) ? u.replace(/^http:/, 'https:') : ''; };
export const shortName = n => clean(n).replace(/\(.*?\)/g, '').trim();

// ---- 품목 찾기 (품목코드 → 허가정보) ----
export async function findPermit(seq) {
  try {
    const d = await call('permit', { item_seq: seq, numOfRows: 5, type: 'json' });
    const hit = d.items.find(x => x.ITEM_SEQ === seq);
    if (hit) return hit;
  } catch (e) { /* 아래 방법으로 */ }
  // 이름을 다른 자료에서 찾아 이름으로 다시 조회 (e약은요 → 낱알식별 → DUR 순)
  const [e, pl, du] = await Promise.all([
    call('easy', { itemSeq: seq, numOfRows: 1, type: 'json' }).catch(() => null),
    call('pill', { item_seq: seq, numOfRows: 3, type: 'json' }).catch(() => null),
    call('durList', { itemSeq: seq, numOfRows: 3, type: 'json' }).catch(() => null),
  ]);
  const pick = (d, k) => d && (d.items.find(x => (x.ITEMSEQ || x.ITEM_SEQ) === seq) || {})[k];
  const name = pick(e, 'ITEMNAME') || pick(pl, 'ITEM_NAME') || pick(du, 'ITEM_NAME');
  if (!name) return null;
  for (const q of [shortName(name).slice(0, 30), shortName(name).replace(/[\d.]+\s*(밀리그램|밀리그람|mg|그램|g).*$/i, '').slice(0, 20)]) {
    if (!q) continue;
    const d = await call('permit', { item_name: q, numOfRows: 100, type: 'json' }).catch(() => null);
    const hit = d && d.items.find(x => x.ITEM_SEQ === seq);
    if (hit) return hit;
  }
  return null;
}

// ---- DUR (의약품 안전사용 정보) ----
const nz = v => { v = clean(v).replace(/^["'\-\s]+|["'\s]+$/g, ''); return v && v !== 'null' ? v : ''; };
// 품목코드 하나의 DUR 정보 → { types: [...], rows: {유형: [행...]} }
export async function durFor(seq) {
  let types = null;
  try {
    const d = await call('durList', { itemSeq: seq, numOfRows: 20, type: 'json' });
    if (d.total <= 50) {
      types = new Set();
      for (const r of d.items) if (r.ITEM_SEQ === seq) for (const t of String(r.TYPE_NAME || '').split(/[,/]/)) { const k = t.trim().replace(/\s/g, ''); if (k) types.add(k); }
    }
  } catch (e) { /* 아래에서 전부 조회 */ }
  const want = types ? DUR_TYPES.filter(t => types.has(t)) : DUR_TYPES;
  const rows = {};
  await Promise.all(want.map(async t => {
    try {
      const d = t === '병용금기' ? await callAll('dur_' + t, { itemSeq: seq, type: 'json' }, 100, 5, 5) : await call('dur_' + t, { itemSeq: seq, numOfRows: 50, type: 'json' });
      const list = d.items.filter(r => !r.ITEM_SEQ || r.ITEM_SEQ === seq);
      if (list.length) rows[t] = list;
    } catch (e) { /* 이 유형은 건너뜀 */ }
  }));
  return { types: DUR_TYPES.filter(t => rows[t]), rows };
}
// 병용금기 행들을 상대 성분별로 묶기
export function groupTaboo(list) {
  const m = new Map();
  for (const r of list) {
    const k = nz(r.MIXTURE_INGR_KOR_NAME) || nz(r.MIXTURE_INGR_ENG_NAME) || '알 수 없음';
    const g = m.get(k) || { ingr: k, eng: nz(r.MIXTURE_INGR_ENG_NAME), why: nz(r.PROHBT_CONTENT), items: [] };
    if (r.MIXTURE_ITEM_NAME && g.items.length < 3 && !g.items.some(x => x.seq === r.MIXTURE_ITEM_SEQ)) g.items.push({ seq: r.MIXTURE_ITEM_SEQ, name: shortName(r.MIXTURE_ITEM_NAME) });
    m.set(k, g);
  }
  return [...m.values()];
}
export const durText = r => nz(r.PROHBT_CONTENT) || nz(r.REMARK);
export { nz };

// ---- 영업시간 ----
export const DAYS = ['월', '화', '수', '목', '금', '토', '일', '공휴일'];
export const toMin = t => { t = String(t || '').replace(/\D/g, ''); if (t.length < 3) return null; t = t.padStart(4, '0'); return +t.slice(0, 2) * 60 + +t.slice(2); };
export const fmt = t => { t = String(t || '').replace(/\D/g, ''); if (t.length < 3) return ''; t = t.padStart(4, '0'); return t.slice(0, 2) + ':' + t.slice(2); };
export function hoursOf(p) {
  return DAYS.map((_, i) => { const s = p[`DUTYTIME${i + 1}S`], c = p[`DUTYTIME${i + 1}C`]; return fmt(s) && fmt(c) ? { s, c, text: `${fmt(s)}~${fmt(c)}` } : null; });
}
export const isLate = h => { if (!h) return false; const c = toMin(h.c), s = toMin(h.s); return c !== null && (c >= 1320 || (s !== null && c <= s)); };
export const is24 = h => { if (!h) return false; const c = toMin(h.c), s = toMin(h.s); return (s === 0 && c >= 1440) || s === c; };

// 가짜·빈 전화번호(000-0000 등) 거르기
export const realTel = t => { const d = String(t || '').replace(/\D/g, ''); return d.length >= 8 && !/^0\d{1,2}0{6,}$/.test(d) && !/0000000/.test(d) ? clean(t) : ''; };
// 같은 약국 중복(띄어쓰기만 다른 이름 + 같은 주소) 거르기
export function dedupe(list) {
  const seen = new Set();
  return list.filter(p => { const k = clean(p.DUTYNAME).replace(/\s/g, '') + '|' + clean(p.DUTYADDR).replace(/\s/g, '').replace(/\(.*\)$/, ''); if (seen.has(k)) return false; seen.add(k); return true; });
}

// ---- 지역 ----
export const SIDO = ['서울특별시','부산광역시','대구광역시','인천광역시','광주광역시','대전광역시','울산광역시','세종특별자치시','경기도','강원특별자치도','충청북도','충청남도','전북특별자치도','전라남도','경상북도','경상남도','제주특별자치도'];
// 주소 → { label: '용인시 수지구', q: '수지구', slug: '용인시-수지구' }  (세종처럼 시·군·구가 없으면 null)
export function regionOf(addr) {
  const t = clean(addr).split(' ');
  if (!t[1] || !/(시|군|구)$/.test(t[1])) return null;
  if (/시$/.test(t[1]) && t[2] && /구$/.test(t[2])) return { label: `${t[1]} ${t[2]}`, q: t[2], slug: `${t[1]}-${t[2]}` };
  return { label: t[1], q: t[1], slug: t[1] };
}

// ---- 페이지 틀 ----
const CSS = `:root{color-scheme:light dark;--bg:light-dark(#ffffff,#15171a);--paper:light-dark(#f6f3ee,#1f2226);--ink:light-dark(#1b1d20,#eceae6);--mute:light-dark(#5f646b,#a3a7ad);--line:light-dark(#e3ded6,#33373c);--red:light-dark(#d1291f,#ff6a5e);--redbg:light-dark(#fdecea,#3a1f1d);--ok:light-dark(#1f6f45,#7fd3a3);--okbg:light-dark(#e6f4ec,#1d3327);--warnbg:light-dark(#fff1d6,#3a2e14);--warn:light-dark(#8a5a00,#f3c96b)}
*{box-sizing:border-box;min-width:0}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 "Noto Sans KR",system-ui,sans-serif;overflow-x:clip}
h1,h2,h3{font-family:"Gothic A1","Noto Sans KR",sans-serif;line-height:1.2;text-wrap:balance;margin:0}a{color:inherit}
.band{padding:clamp(18px,3vw,40px) max(5vw,16px)}.wrap{max-width:980px;margin:0 auto}
header.band{border-bottom:1px solid var(--line);padding-top:16px;padding-bottom:16px}
.top{display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:space-between}
.brand{display:flex;gap:10px;align-items:center;text-decoration:none;font:800 20px "Gothic A1",sans-serif}
.sign{width:38px;height:38px;border-radius:10px;background:var(--red);color:#fff;display:grid;place-items:center;font:800 22px/1 "Gothic A1",sans-serif}
form.s{display:flex;gap:8px;flex:1;max-width:420px}form.s input{flex:1;height:44px;border:1px solid var(--line);border-radius:12px;padding:0 14px;font:inherit;font-size:16px;background:var(--bg);color:var(--ink)}
.btn{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:12px;border:1px solid var(--line);background:var(--paper);color:var(--ink);font:inherit;font-weight:600;text-decoration:none;cursor:pointer;white-space:nowrap}
.btn.red{background:var(--red);border-color:var(--red);color:#fff}.btn.ink{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.crumb{font-size:14px;color:var(--mute);margin-bottom:10px}.crumb a{color:var(--mute)}
h1{font-size:clamp(26px,4vw,40px);font-weight:800}h2{font-size:21px;font-weight:800;margin:32px 0 12px}
.sub{color:var(--mute);margin:6px 0 0}
.tag{display:inline-block;font-size:13px;font-weight:600;border-radius:6px;padding:1px 8px;white-space:nowrap}
.rx{background:var(--redbg);color:var(--red)}.otc,.open{background:var(--okbg);color:var(--ok)}.soon,.late{background:var(--warnbg);color:var(--warn)}.closed{background:var(--paper);color:var(--mute)}
.photo{display:block;width:100%;max-width:560px;border-radius:14px;overflow:hidden;border:1px solid var(--line);margin:18px 0 6px;background:#fff}.photo img{display:block;width:100%;aspect-ratio:780/426;object-fit:cover}
.cap{font-size:13px;color:var(--mute);margin:0 0 8px}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.chips span{background:var(--paper);border-radius:8px;padding:4px 10px;font-weight:500}
.box{background:var(--paper);border-radius:16px;padding:18px 20px;margin:20px 0}.box.cta{border-top:5px solid var(--red)}
.sec p{margin:6px 0 0;white-space:pre-line;max-width:72ch}
.list{display:flex;flex-direction:column;gap:8px;list-style:none;padding:0;margin:0}
.it{display:flex;gap:12px;align-items:center;border:1px solid var(--line);border-radius:14px;padding:12px 14px;text-decoration:none;color:var(--ink)}a.it:hover{border-color:var(--ink)}
.it b{display:block}.it small{color:var(--mute);font-size:14px}
.thumb{flex:none;width:64px;height:44px;border-radius:8px;background:var(--paper);overflow:hidden}.thumb img{width:100%;height:100%;object-fit:cover;display:block}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;list-style:none;padding:0;margin:0}
.grid a{display:flex;justify-content:space-between;gap:8px;border:1px solid var(--line);border-radius:12px;padding:12px 14px;text-decoration:none}.grid a:hover{border-color:var(--ink)}.grid small{color:var(--mute)}
.stats{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0}.stats div{background:var(--paper);border-radius:12px;padding:10px 16px}.stats b{font-size:22px;display:block}
.filters{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.fchip{min-height:40px;padding:0 14px;border-radius:999px;border:1px solid var(--line);background:var(--bg);color:var(--ink);cursor:pointer;font:inherit;font-weight:500}.fchip.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.ph{border:1px solid var(--line);border-radius:14px;padding:14px 16px}.ph .hd{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.ph h3{font-size:18px}
.ph .addr{color:var(--mute);font-size:14px;margin:2px 0 8px}.ph .badges{display:flex;gap:6px;flex-wrap:wrap}
.hrs{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:4px;margin:10px 0;font-size:13px;text-align:center}
.hrs div{background:var(--paper);border-radius:8px;padding:6px 2px}.hrs b{display:block;font-size:12px;color:var(--mute);font-weight:500}.hrs .off{opacity:.55}.hrs .today{outline:2px solid var(--red)}
.acts{display:flex;gap:8px;flex-wrap:wrap}
.note{font-size:14px;color:var(--mute)}
li.dur{border:1px solid var(--line);border-left:4px solid var(--warn);border-radius:12px;padding:10px 14px}li.dur b{display:block}li.dur small{color:var(--mute);font-size:14px}li.dur a{color:var(--ink)}
footer{border-top:1px solid var(--line);color:var(--mute);font-size:14px;margin-top:40px}footer p{margin:4px 0;max-width:80ch}footer a{color:var(--mute)}
@media(max-width:600px){.hrs{grid-template-columns:repeat(4,minmax(0,1fr))}form.s{max-width:none;flex-basis:100%}}`;

export function page({ title, desc, path, body, jsonld, image, noindex }) {
  const url = SITE + path;
  return `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:type" content="website"><meta property="og:site_name" content="이 약, 어디 있지?">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(image || SITE + '/og.png')}">
<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#d1291f">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23d1291f'/%3E%3Ctext x='32' y='45' font-size='38' font-weight='800' text-anchor='middle' fill='white' font-family='sans-serif'%3E%EC%95%BD%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Gothic+A1:wght@600;800&family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}
<script defer src="/_vercel/insights/script.js"></script>
</head><body>
<header class="band"><div class="wrap top">
  <a class="brand" href="/"><span class="sign" aria-hidden="true">약</span>이 약, 어디 있지?</a>
  <form class="s" action="/" method="get" role="search"><input name="q" type="search" placeholder="약 이름 검색" aria-label="약 이름" required minlength="2"><button class="btn ink" type="submit">찾기</button></form>
</div></header>
<main class="band"><div class="wrap">${body}
<p style="margin-top:28px"><button class="btn" type="button" id="shareBtn">이 페이지 공유하기</button> <span class="note" id="shareMsg"></span></p>
<script>{const b=document.getElementById('shareBtn'),m=document.getElementById('shareMsg');b.addEventListener('click',async()=>{const d={title:document.title,url:location.href};try{if(navigator.share){await navigator.share(d);return}await navigator.clipboard.writeText(location.href);m.textContent='주소를 복사했어요. 카톡에 붙여넣어 보내세요.'}catch(e){if(e&&e.name==='AbortError')return;m.textContent=location.href}})}</script>
</div></main>
<footer class="band"><div class="wrap">
  <p><a href="/">약 검색</a> · <a href="/check">같이 먹어도 되나요?</a> · <a href="/pill">모양으로 약 찾기</a> · <a href="/pharmacy">지역별 약국 영업시간</a> · <a href="/convenience">편의점 상비약</a></p>
  <p>약 정보: 식품의약품안전처 의약품 제품 허가정보·의약품개요정보(e약은요). 약국 정보: 국립중앙의료원 전국 약국 정보. 공공데이터포털(data.go.kr) 제공.</p>
  <p>영업시간은 약국이 신고한 정보라 실제와 다를 수 있어요. 방문 전에 꼭 전화로 확인하세요. 이 사이트는 정보 안내만 하며 약을 팔지 않습니다. 복용은 약사나 의사와 상담하세요.</p>
</div></footer>
</body></html>`;
}

export function sendHtml(res, status, html, cacheSec) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cacheSec ? `public, max-age=600, s-maxage=${cacheSec}, stale-while-revalidate=${cacheSec}` : 'no-store');
  res.end(html);
}
export const notFound = (res, msg) => sendHtml(res, 404, page({ title: '페이지를 찾을 수 없어요 | 이 약, 어디 있지?', desc: msg, path: '/', noindex: true,
  body: `<h1>페이지를 찾을 수 없어요</h1><p class="sub">${esc(msg)}</p><p><a class="btn ink" href="/">처음 화면으로</a></p>` }), 300);
export const failPage = (res, msg) => sendHtml(res, 503, page({ title: '잠시 후 다시 시도해 주세요 | 이 약, 어디 있지?', desc: msg, path: '/', noindex: true,
  body: `<h1>잠시 후 다시 시도해 주세요</h1><p class="sub">공공데이터 서버에서 정보를 받아오지 못했어요. (${esc(msg)})</p><p><a class="btn ink" href="/">처음 화면으로</a></p>` }), 0);
export const getQuery = req => req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);

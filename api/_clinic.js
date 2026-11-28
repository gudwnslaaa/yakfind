// 병·의원 공통 함수 (라우트 아님)
import { callAll, clean, realTel } from './_lib.js';

export const DEPTS = { D001: '내과', D002: '소아청소년과', D013: '이비인후과', D022: '가정의학과', D005: '피부과', D008: '정형외과', D012: '안과', D011: '산부인과', D014: '비뇨의학과' };
export const hours = x => Array.from({ length: 8 }, (_, i) => { const s = x[`DUTYTIME${i + 1}S`], c = x[`DUTYTIME${i + 1}C`]; return s && c ? `${s}-${c}` : ''; });
export const row = x => ({ hpid: x.HPID, name: clean(x.DUTYNAME), addr: clean(x.DUTYADDR), tel: realTel(x.DUTYTEL1), kind: clean(x.DUTYDIVNAM || x.DUTYDIVNAME),
  lat: +(x.WGS84LAT || x.LATITUDE) || null, lon: +(x.WGS84LON || x.LONGITUDE) || null, h: hours(x), note: clean(x.DUTYETC || x.DUTYINF || '').slice(0, 120) });

export async function babyList() {
  const d = await callAll('baby', {}, 500, 2, 1);
  return d.items.map(row);
}


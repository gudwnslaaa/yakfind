// 임시: 허가 상세정보의 함량 항목 확인 (확인 후 삭제)
export default async function handler(req, res) {
  const key = process.env.DATA_GO_KR_KEY, out = {};
  for (const [k, p] of [['tylenol500', { item_name: '타이레놀정500밀리그람' }], ['tylenolKid', { item_seq: '202005623' }], ['esroban', { item_name: '에스로반' }], ['pancol', { item_name: '판콜에이' }]]) {
    try {
      const r = await fetch('https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnDtlInq08?' + new URLSearchParams({ serviceKey: key, type: 'json', numOfRows: 2, pageNo: 1, ...p }), { signal: AbortSignal.timeout(12000) });
      const j = await r.json(); let it = (j.body && j.body.items) || []; it = it.map(x => x.item || x);
      out[k] = it.slice(0, 2).map(f => ({ seq: f.ITEM_SEQ, name: f.ITEM_NAME, etc: f.ETC_OTC_CODE, MAIN_ITEM_INGR: f.MAIN_ITEM_INGR, INGR_NAME: String(f.INGR_NAME || '').slice(0, 300), TOTAL_CONTENT: f.TOTAL_CONTENT, MATERIAL_NAME: String(f.MATERIAL_NAME || '').slice(0, 400), MAIN_INGR_ENG: f.MAIN_INGR_ENG, chart: String(f.CHART || '').slice(0, 80) }));
    } catch (e) { out[k] = String(e.message); }
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(out, null, 1));
}

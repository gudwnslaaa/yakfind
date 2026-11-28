// 회수 목록 공통 함수 (라우트 아님)
import { callAll, clean, nz } from './_lib.js';

const d8 = v => { v = String(v || '').replace(/\D/g, ''); return v.length === 8 ? `${v.slice(0, 4)}.${v.slice(4, 6)}.${v.slice(6)}` : ''; };
export async function recallList() {
  const d = await callAll('recall', { type: 'json' }, 500, 4, 2);
  const seen = new Set();
  return d.items.map(x => ({
    seq: String(x.ITEM_SEQ || '').replace(/\D/g, ''), name: clean(x.PRDUCT), entp: clean(x.ENTRPS), reason: nz(x.RTRVL_RESN),
    date: String(x.RECALL_COMMAND_DATE || '').replace(/\D/g, ''), lot: [...new Set(nz(x.MNFCTUR_NO).split(/[,\s]+/).filter(Boolean))].join(', '), made: d8(x.MNFCTUR_DT), useBy: d8(x.USGPD),
  })).filter(r => { const k = r.seq + '|' + r.lot + '|' + r.date; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => b.date.localeCompare(a.date));
}


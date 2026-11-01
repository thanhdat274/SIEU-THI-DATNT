// ───── Hồ sơ tiệm + Huy hiệu thâm niên (GĐ71): meta-progression dài hạn ─────
// Một trang "chân dung" gộp mọi bể dài hạn (mối quen, khách quen, chợ phiên, đón lễ,
// dịch vụ, nhân khẩu, công trình, NG+, rival, ngày hoàn hảo) + 4 huy hiệu thâm niên.
// Huy hiệu THUẦN DANH DỰ (không tiền) — toàn bộ derive từ state sống, không cần lưu
// field mới, không đụng kinh tế/coopGuard/save.

export interface DossierInput {
  supplierTier: number;        // bậc mối quen cao nhất (relTier)
  regularTier: number;         // bậc Tiệm (vipTierOf)
  closeRegulars: number;       // số khách ruột thân ≥ 40
  fairTaken: boolean;          // đã lấy lô chợ phiên
  prepClaimed: boolean;        // đã nhận thưởng đón lễ
  servicesOwned: number;       // dịch vụ quầy đã mua
  servicesPaidBack: number;    // dịch vụ đã thu hồi vốn (serviceLife ≥ giá mua)
  demographicsCount: number;   // phân khúc khách đang tới
  landmarkContrib: number;     // đã góp công trình hẻm
  prestigeLevel: number;       // bậc tái sinh NG+
  rivalArcs: number;           // số arc rival đã đi qua
  perfectDays: number;         // ngày hoàn hảo
}

export interface MasterCriterion { label: string; ok: (d: DossierInput) => boolean }
export interface MasterBadgeDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  criteria: MasterCriterion[];
}

/** Mỗi huy hiệu chỉ đạt khi giữ NHIỀU hệ cùng sống (không một trục nào là đủ). */
export const MASTER_BADGES: MasterBadgeDef[] = [
  {
    id: 'tu_phuong', icon: '🤝', name: 'Mối Tứ Phương',
    desc: 'Phía mua nở rộ: mối quen lớn, chợ phiên và đón lễ đều từng góp tay.',
    criteria: [
      { label: 'Mối quen bậc Thân trở lên', ok: (d) => d.supplierTier >= 2 },
      { label: 'Từng lấy lô chợ phiên', ok: (d) => d.fairTaken },
      { label: 'Từng nhận thưởng đón lễ', ok: (d) => d.prepClaimed },
    ],
  },
  {
    id: 'tu_phia', icon: '💛', name: 'Bán Tứ Phía',
    desc: 'Phía bán trù phú: khách quen thân thiết, nhiều phân khúc đang tới.',
    criteria: [
      { label: 'Tiệm đạt bậc Thân (khách quen)', ok: (d) => d.regularTier >= 2 },
      { label: '3 khách ruột thân ≥ 40', ok: (d) => d.closeRegulars >= 3 },
      { label: '3 phân khúc khách đang tới', ok: (d) => d.demographicsCount >= 3 },
    ],
  },
  {
    id: 'du_nghe', icon: '🛠️', name: 'Nhà Buôn Đủ Nghề',
    desc: 'Dịch vụ quầy lên đời: mở nhiều, thu hồi vốn, ngày bán trọn vẹn.',
    criteria: [
      { label: 'Mở 3 dịch vụ quầy', ok: (d) => d.servicesOwned >= 3 },
      { label: '2 dịch vụ đã thu hồi vốn', ok: (d) => d.servicesPaidBack >= 2 },
      { label: '2 ngày hoàn hảo', ok: (d) => d.perfectDays >= 2 },
    ],
  },
  {
    id: 'huyen_thoai', icon: '🏆', name: 'Huyền Thoại Hẻm',
    desc: 'Đỉnh cao toàn diện: mối vàng, tiệm vàng, tái sinh, công trình và ngày trọn vẹn.',
    criteria: [
      { label: 'Mối quen bậc Vàng', ok: (d) => d.supplierTier >= 4 },
      { label: 'Tiệm bậc Vàng (khách quen)', ok: (d) => d.regularTier >= 4 },
      { label: 'Tái sinh NG+ (prestige ≥ 1)', ok: (d) => d.prestigeLevel >= 1 },
      { label: 'Góp sức công trình hẻm', ok: (d) => d.landmarkContrib > 0 },
      { label: '5 ngày hoàn hảo', ok: (d) => d.perfectDays >= 5 },
    ],
  },
];

export const badgeEarned = (d: DossierInput, b: MasterBadgeDef) => b.criteria.every((c) => c.ok(d));

/** Thống kê nhanh cho nút HUD: số huy hiệu đã đạt. */
export const dossierEarnedCount = (d: DossierInput) => MASTER_BADGES.filter((b) => badgeEarned(d, b)).length;

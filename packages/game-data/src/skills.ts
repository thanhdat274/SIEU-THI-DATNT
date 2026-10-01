import type { PerkDef, SkillType } from '@game/shared';

export const SKILL_XP_PER_LEVEL = [0, 100, 250, 500, 1000]; // Mức XP cho level 1, 2, 3, 4

export const SKILL_PERKS: readonly PerkDef[] = [
  // Quản lý (Management)
  {
    id: 'perk_quick_hands',
    skill: 'management',
    tier: 1,
    name: 'Tay thoăn thoắt',
    description: 'Thao tác thu ngân nhanh nhẹn, giảm 15% thời gian xử lý hóa đơn.',
  },
  {
    id: 'perk_good_boss',
    skill: 'management',
    tier: 2,
    name: 'Chủ tiệm chu đáo',
    description: 'Tạo động lực cho nhân sự, tối ưu 10% chi phí lương nhân viên mỗi ngày.',
  },
  {
    id: 'perk_master_manager',
    skill: 'management',
    tier: 3,
    name: 'Bậc thầy điều phối',
    description: 'Nhân viên bổ sung kệ và thu ngân làm việc nhanh hơn 20%.',
  },

  // Buôn bán & Ngoại giao (Marketing)
  {
    id: 'perk_charm',
    skill: 'marketing',
    tier: 1,
    name: 'Duyên bán hàng',
    description: 'Lời chào niềm nở, khách quen và khách mua boa thêm 5% giá trị đơn.',
  },
  {
    id: 'perk_negotiator',
    skill: 'marketing',
    tier: 2,
    name: 'Mối quen giảm giá',
    description: 'Thương lượng giá tốt, được giảm thêm 5% đơn giá từ mọi nhà phân phối.',
  },
  {
    id: 'perk_local_legend',
    skill: 'marketing',
    tier: 3,
    name: 'Tiếng lành đồn xa',
    description: 'Tiệm nổi tiếng khắp khu phố, tăng 10% lượng khách ghé tiệm mỗi ngày.',
  },

  // Kho bãi & Bảo quản (Storage)
  {
    id: 'perk_cool_pack',
    skill: 'storage',
    tier: 1,
    name: 'Bọc giữ tươi',
    description: 'Bảo quản cẩn thận, hạn sử dụng của hàng tươi sống được tăng thêm 1 ngày.',
  },
  {
    id: 'perk_neat_shelves',
    skill: 'storage',
    tier: 2,
    name: 'Kê xếp gọn gàng',
    description: 'Bày hàng khoa học, tăng thêm 20% sức chứa tối đa của các kệ bán hàng.',
  },
  {
    id: 'perk_zero_waste',
    skill: 'storage',
    tier: 3,
    name: 'Bảo quản chu đáo',
    description: 'Kiểm soát nhiệt độ kho tối ưu, giảm 50% tốc độ hư hỏng thực phẩm.',
  },
];

export const PERK_MAP: Record<string, PerkDef> = Object.fromEntries(
  SKILL_PERKS.map((p) => [p.id, p])
);

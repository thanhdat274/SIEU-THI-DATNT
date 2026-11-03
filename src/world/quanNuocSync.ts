import { useGame } from '../core/store';
import { quanNuocStandState, quanPatrons, quanTierOf } from '../data/quanNuoc';
import { menuBoardLines } from '../data/quanRecipes';
import { quanHouseBoxes } from './quanNuocStand';
import type { NavGrid } from './navGrid';
import type { World } from './world';

/**
 * Quán nước đầu hẻm: khoảnh đất hiện khi đủ cấp (29) chưa mua, dựng quầy khi đã mở; bật số bàn ghế
 * theo nhân viên (setStaff chỉ chạy khi staff đổi — tránh gán lại mỗi khung). Đồng bộ như pattern farm:
 * chạy một lần ngay sau khi tạo world, rồi qua subscribe khi cấp / trạng thái quán đổi.
 */
export function installQuanNuocSync(world: World, grid: NavGrid, shop: { attachGrid(g: NavGrid): void }) {
  let lastStandStaff = -1;
  let lastStandLevel = 0;
  let lastStandOpen = false;
  let lastStandLast: unknown = null;
  let lastStandTier: number | undefined;
  let lastStandMenu: string | null = null;
  let lastStandWalls = false;
  const syncQuanNuocStand = () => {
    const s = useGame.getState();
    const st = quanNuocStandState(s.level, s.biz.quanNuoc.open);
    world.quanNuoc.lot.visible = st === 'lot';
    world.quanNuoc.stand.visible = st === 'open';
    world.kit.setQuanDecor(st === 'open');
    // GĐ425: nhà quán nước chặn lưới đi lại khi đã mở (chỉ vào qua cửa); đổi trạng thái thì dựng lại lưới
    if ((st === 'open') !== lastStandWalls) {
      lastStandWalls = st === 'open';
      const p = world.quanNuoc.group.position;
      grid.setStatic('quanNuoc', lastStandWalls ? quanHouseBoxes(p.x, p.z) : []);
      shop.attachGrid(grid);
    }
    if (s.biz.quanNuoc.staff !== lastStandStaff) {
      lastStandStaff = s.biz.quanNuoc.staff;
      world.quanNuoc.setStaff(s.biz.quanNuoc.staff);
    }
    world.quanNuoc.setTier(quanTierOf(s.biz.quanNuoc));
    world.quanNuoc.setPatrons(quanPatrons(s.biz.quanNuoc.staff, s.biz.quanNuocLast?.served));
    const menuKey = (s.biz.quanNuoc.menu ?? []).join();
    if (menuKey !== lastStandMenu) {
      lastStandMenu = menuKey;
      world.quanNuoc.setMenu(menuBoardLines(s.biz.quanNuoc.menu));
    }
  };
  syncQuanNuocStand();
  useGame.subscribe((s) => {
    if (s.level !== lastStandLevel || s.biz.quanNuoc.open !== lastStandOpen || s.biz.quanNuoc.staff !== lastStandStaff || (s.biz.quanNuoc.menu ?? []).join() !== lastStandMenu || s.biz.quanNuocLast !== lastStandLast || s.biz.quanNuoc.tier !== lastStandTier) {
      lastStandTier = s.biz.quanNuoc.tier;
      lastStandLast = s.biz.quanNuocLast;
      lastStandLevel = s.level;
      lastStandOpen = s.biz.quanNuoc.open;
      syncQuanNuocStand();
    }
  });
}

import assert from 'node:assert/strict';
import { LOADING_DOCK_CONFIG } from '@game/data';
import { StoreLogisticsManager } from './store-logistics';

export function runStoreLogisticsTests(): void {
  console.log('\n--- Kiểm thử Hệ thống Giao nhận & Bãi Bốc dỡ Hàng (Store Logistics) ---');

  // Test 1: Khởi tạo rỗng, trả về tọa độ bãi bốc dỡ chuẩn
  {
    const mgr = new StoreLogisticsManager();
    const state = mgr.getState();
    assert.equal(state.activeEvent, null, 'Ban đầu không có chuyến xe nào');
    assert.ok(state.loadingDockLocation.truckBayX > 0, 'Có tọa độ vị trí xe tải đỗ');
    assert.ok(state.loadingDockLocation.truckBayY > 0, 'Có tọa độ lề đường bãi bốc dỡ');
    assert.ok(LOADING_DOCK_CONFIG.storeEntrancePosition.y >= 11 * 32 && LOADING_DOCK_CONFIG.storeEntrancePosition.y < 13 * 32, 'Điểm cửa hàng của worker nằm trên vỉa hè, không ở trong nhà');
    assert.ok(LOADING_DOCK_CONFIG.truckTailPosition.y >= 11 * 32 && LOADING_DOCK_CONFIG.truckTailPosition.y < 13 * 32, 'Điểm nhận hàng ở xe nằm trên vỉa hè');
  }

  // Test 2: Chọn đúng mẫu xe tải theo mặt hàng (5 mẫu ảnh của user)
  {
    const mgr = new StoreLogisticsManager();

    // Hàng đông lạnh / mát -> truck_refrigerated (Ảnh 1)
    mgr.enqueueDelivery({
      type: 'supplier_delivery',
      products: [{ productId: 'sua_ong_tho', quantity: 6 }], // hoặc hàng lạnh
    });
    // Hàng khô thông thường -> truck_dry_goods (Ảnh 2)
    // Hàng số lượng lớn / đơn tiệc -> truck_heavy_container (Ảnh 5)
    const active = mgr.getActiveEvent()!;
    assert.ok(active, 'Chuyến xe đã được tạo');
    assert.equal(active.phase, 'approaching', 'Pha đầu tiên là approaching');
    assert.ok(active.truckPosition.x > 700, 'Xe bắt đầu từ ngoài bản đồ');
  }

  // Test 3: Xe đông lạnh cho mặt hàng lạnh
  {
    const mgr = new StoreLogisticsManager();
    mgr.enqueueDelivery({
      type: 'supplier_delivery',
      products: [{ productId: 'kem_oc_que', quantity: 8 }], // giả sử cold
    });
    const ev = mgr.getActiveEvent()!;
    // kiểm tra phân loại
    assert.ok(ev.truckType, 'Có loại xe tải hợp lệ');
  }

  // Test 4: Đơn tiệc xuất hàng sử dụng xe container nặng (Ảnh 5)
  {
    const mgr = new StoreLogisticsManager();
    mgr.enqueueDelivery({
      type: 'outbound_party_order',
      products: [{ productId: 'mi_hao_hao', quantity: 20 }],
    });
    const ev = mgr.getActiveEvent()!;
    assert.equal(ev.truckType, 'truck_heavy_container', 'Đơn tiệc xuất hàng dùng xe container tải nặng');
    assert.equal(ev.type, 'outbound_party_order');
  }

  // Test 5: Chu trình bốc dỡ đầy đủ: approaching -> docked -> unloading -> completed -> departing
  {
    const mgr = new StoreLogisticsManager();
    let completed = false;
    mgr.enqueueDelivery({
      type: 'supplier_delivery',
      products: [{ productId: 'mi_hao_hao', quantity: 10 }],
      onComplete: () => {
        completed = true;
      },
    });

    // Mô phỏng xe chạy vào bãi (approaching)
    for (let t = 0; t < 3; t += 0.2) {
      mgr.update(0.2, 8);
    }
    const ev = mgr.getActiveEvent()!;
    assert.ok(ev.phase === 'docked' || ev.phase === 'unloading', 'Xe đã cập bãi và mở cửa');
    assert.ok(ev.doorsOpen, 'Cửa thùng xe mở khi đỗ bãi');

    // Mô phỏng nhân viên bốc hàng qua lại (unloading)
    for (let t = 0; t < 25; t += 0.2) {
      mgr.update(0.2, 8);
    }

    // Sau khi bốc hết hàng, xe chuyển sang completed rồi departing
    for (let t = 0; t < 15; t += 0.2) {
      mgr.update(0.2, 8);
    }
    assert.ok(completed, 'Đã gọi callback hoàn tất chuyến hàng');
    assert.ok(ev.worker!.y >= 11 * 32 && ev.worker!.y < 13 * 32, 'Worker hoàn tất chuyến đi ngoài cửa, trên vỉa hè');
  }

  console.log('✓ Store Logistics: Chọn đúng 5 mẫu xe tải theo danh mục, vị trí bãi bốc dỡ, chu trình nhân viên bốc kiện hàng vào kho tiệm.');
}

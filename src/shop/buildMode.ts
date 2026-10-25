import * as THREE from 'three';
import { useGame } from '../core/store';
import { furnitureDef, type FurnitureType } from '../data/furniture';
import { formatMoney } from '../data/products';
import type { GroceryShop } from './groceryShop';
import { FurnitureView } from './furnitureView';

const SNAP = 0.1;

/**
 * Chế độ xây dựng trong tiệm:
 * - Chọn đồ trong danh mục → bóng mờ đi theo chuột → bấm để đặt
 * - Bấm vào đồ có sẵn để nhấc lên di chuyển
 * - R: xoay · Delete: bán món đang cầm · Esc / chuột phải: huỷ
 */
export class BuildMode {
  private ghost: FurnitureView | null = null;
  private ghostType: FurnitureType | null = null;
  private tile: THREE.Mesh;
  private pos = { x: 0, z: 0 };
  private raycaster = new THREE.Raycaster();
  private ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private dom: HTMLElement,
    private shop: GroceryShop,
  ) {
    this.tile = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.45, depthWrite: false }),
    );
    this.tile.rotation.x = -Math.PI / 2;
    this.tile.visible = false;
    scene.add(this.tile);

    // Bóng mờ chỉ theo con trỏ chuột đang lơ lửng. Kéo bản đồ (giữ chuột, hay vuốt trên màn cảm ứng)
    // thì bóng mờ đứng yên tại chỗ; trên màn cảm ứng muốn dời thì chạm vào chỗ mới.
    dom.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || e.buttons !== 0) return;
      this.onMove(e);
    });
    window.addEventListener('keydown', (e) => this.onKey(e));
    useGame.subscribe((s, prev) => {
      if (s.placing !== prev.placing) this.refreshGhost();
    });
  }

  private get placing() {
    return useGame.getState().placing;
  }

  private ndc(e: { clientX: number; clientY: number }) {
    const rect = this.dom.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  }

  private refreshGhost() {
    const placing = this.placing;
    // Hiện lại món đồ gốc nếu trước đó đang nhấc
    for (const view of this.shop.views.values()) view.group.visible = true;

    if (!placing) {
      if (this.ghost) {
        this.scene.remove(this.ghost.group);
        this.ghost.dispose(); // bóng xem trước có material clone riêng, phải giải phóng
      }
      this.ghost = null;
      this.ghostType = null;
      this.tile.visible = false;
      return;
    }
    if (placing.movingUid !== undefined) {
      const original = this.shop.views.get(placing.movingUid);
      if (original) original.group.visible = false;
    }
    if (this.ghostType !== placing.type) {
      if (this.ghost) {
        this.scene.remove(this.ghost.group);
        this.ghost.dispose();
      }
      this.ghost = new FurnitureView(placing.type);
      this.ghost.makeGhost();
      this.ghostType = placing.type;
      this.scene.add(this.ghost.group);
    }
    this.updateGhost();
  }

  private onMove(e: PointerEvent) {
    if (!this.placing) return;
    this.raycaster.setFromCamera(this.ndc(e), this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.ground, new THREE.Vector3());
    if (!hit) return;
    const local = this.shop.toLocal(hit);
    this.pos = { x: Math.round(local.x / SNAP) * SNAP, z: Math.round(local.z / SNAP) * SNAP };
    this.updateGhost();
  }

  private updateGhost() {
    const placing = this.placing;
    if (!placing || !this.ghost) return;
    const { x, z } = this.pos;
    const world = this.shop.local(x, z);
    this.ghost.group.position.copy(world);
    this.ghost.group.rotation.y = (placing.rot * Math.PI) / 2;

    const box = this.shop.footprintBox(placing.type, x, z, placing.rot);
    const size = box.getSize(new THREE.Vector3());
    this.tile.scale.set(size.x, size.z, 1);
    this.tile.position.set(world.x, 0.12, world.z);
    this.tile.visible = true;
    const reason = this.shop.quickCheck(placing.type, x, z, placing.rot, placing.movingUid);
    (this.tile.material as THREE.MeshBasicMaterial).color.setHex(reason ? 0xe74c3c : 0x2ecc71);

    const def = furnitureDef(placing.type);
    const action = placing.movingUid !== undefined ? 'Bấm: đặt xuống · Delete: bán' : `Bấm: mua và đặt (${formatMoney(def.price)})`;
    const hint = `${def.name} · ${reason ?? action} · R: xoay · Esc: huỷ`;
    if (useGame.getState().hint !== hint) useGame.setState({ hint });
  }

  /** Bấm chuột trái trong chế độ xây. Trả về true nếu đã xử lý. */
  click(e: { clientX: number; clientY: number; pointerType?: string }) {
    const s = useGame.getState();
    if (!s.buildMode) return false;
    const placing = s.placing;

    if (!placing) {
      // Bấm vào đồ có sẵn để nhấc lên
      this.raycaster.setFromCamera(this.ndc(e), this.camera);
      const groups = [...this.shop.views.values()].map((v) => v.group);
      const hit = this.raycaster.intersectObjects(groups, true)[0];
      if (!hit) return true;
      let obj: THREE.Object3D | null = hit.object;
      while (obj && obj.userData.uid === undefined) obj = obj.parent;
      const f = s.furniture.find((it) => it.uid === obj?.userData.uid);
      if (!f) return true;
      this.pos = { x: f.x, z: f.z };
      s.setPlacing({ type: f.type, rot: f.rot, movingUid: f.uid });
      return true;
    }

    // Màn hình cảm ứng không có con trỏ lơ lửng: chạm chỗ mới thì chỉ dời bóng mờ tới đó,
    // chạm lại đúng chỗ (hoặc bấm nút Đặt) mới đặt thật
    if (e.pointerType === 'touch') {
      const before = { ...this.pos };
      this.onMove(e as PointerEvent);
      if (Math.hypot(before.x - this.pos.x, before.z - this.pos.z) > 0.3) return true;
    }
    return this.confirm();
  }

  /** Đặt món đang cầm ở chỗ bóng mờ đang đứng. */
  confirm() {
    const s = useGame.getState();
    const placing = s.placing;
    if (!s.buildMode || !placing) return false;
    const { x, z } = this.pos;
    const reason = this.shop.fullCheck(placing.type, x, z, placing.rot, placing.movingUid);
    if (reason) {
      s.notify(`❌ ${reason}`);
      return true;
    }
    if (placing.movingUid !== undefined) {
      s.moveFurniture(placing.movingUid, x, z, placing.rot);
      s.setPlacing(null);
    } else if (s.placeFurniture(placing.type, x, z, placing.rot)) {
      // Giữ nguyên món đang chọn để đặt tiếp nhiều cái
      this.updateGhost();
    }
    return true;
  }

  rotate() {
    const s = useGame.getState();
    if (s.placing) useGame.setState({ placing: { ...s.placing, rot: (s.placing.rot + 1) % 4 } });
  }

  cancel() {
    const s = useGame.getState();
    if (s.placing) s.setPlacing(null);
    else if (s.buildMode) s.setBuildMode(false);
  }

  private onKey(e: KeyboardEvent) {
    const s = useGame.getState();
    if (!s.buildMode) return;
    if (e.key === 'Escape') this.cancel();
    if (!s.placing) return;
    if (e.key.toLowerCase() === 'r') this.rotate();
    if (e.key === 'Delete' && s.placing.movingUid !== undefined) s.sellFurniture(s.placing.movingUid);
  }
}

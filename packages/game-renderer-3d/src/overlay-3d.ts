import { Vector3, Matrix } from '@babylonjs/core/Maths/math.vector';
import { Viewport } from '@babylonjs/core/Maths/math.viewport';
import type { Scene } from '@babylonjs/core/scene';
import type { GameSimulation } from '@game/core';
import { MAP_WIDTH, PRODUCT_MAP, productPixels } from '@game/data';
import { TILE_SIZE } from '@game/shared';
import { cameraUp, isoAlpha, pixelToWorld } from './coords';
import type { RoofInfo } from './map-builder';
import { hiddenByRoof } from './crowd-3d';
import { ACTOR_WORLD_HEIGHT, type PartnerAvatarInfo } from './actors-3d';

/** Bộ đệm SVG cho các icon 16x16: đồng xu hoặc hàng hóa, sinh 1 lần dùng mãi. */
const iconSvgCache = new Map<string, string>();

export function getIconSvg(iconKey: string): string {
  let cached = iconSvgCache.get(iconKey);
  if (cached) return cached;

  if (iconKey === 'pixel_coin' || iconKey === 'coin') {
    // Icon đồng xu 16x16: viền đậm #593A2B, ánh vàng #E9B95D, bóng #936044, sáng #FFF2D6
    cached = '<svg width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges">' +
      '<rect x="3" y="2" width="10" height="12" fill="#593A2B"/>' +
      '<rect x="2" y="4" width="12" height="8" fill="#593A2B"/>' +
      '<rect x="4" y="3" width="8" height="10" fill="#E9B95D"/>' +
      '<rect x="3" y="5" width="10" height="6" fill="#E9B95D"/>' +
      '<rect x="5" y="4" width="2" height="7" fill="#FFF2D6"/>' +
      '<rect x="8" y="5" width="2" height="6" fill="#936044"/>' +
      '</svg>';
  } else {
    const prodId = iconKey.startsWith('product:') ? iconKey.slice(8) : iconKey;
    const prod = prodId !== 'none' ? PRODUCT_MAP[prodId] : undefined;
    const pixels = productPixels(prod);
    const rects = pixels.map((p) => `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.color}"/>`).join('');
    cached = `<svg width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges">${rects}</svg>`;
  }

  iconSvgCache.set(iconKey, cached);
  return cached;
}

interface CustomerOverlayEntry {
  wrapper: HTMLDivElement;
  requestBadge: HTMLDivElement;
  regularTag: HTMLDivElement;
  bubble: HTMLDivElement;
  bubbleBox: HTMLDivElement;
  currentIconKey: string;
  currentRegularName: string;
  wantsRequest: boolean;
  seenFrame: number;
}

interface FloatingGainItem {
  element: HTMLDivElement;
  worldX: number;
  worldY: number;
  worldZ: number;
  life: number;
  maxLife: number;
}

/**
 * Lớp phủ HTML/CSS tuyệt đối đè trên canvas WebGL:
 * - Bong bóng nhu cầu hàng hóa & trạng thái chờ (icon SVG từ @game/data)
 * - Dấu "!" yêu cầu đặc biệt của khách quen
 * - Thẻ tên khách quen (regularTag)
 * - Chữ "+12.000 đ" bay lên và mờ dần trong ~1s
 * - Bong bóng "Tính tiền" của chủ tiệm và thẻ tên bạn chơi co-op
 *
 * Mọi phần tử định vị bằng `transform: translate3d(...)` chiếu từ không gian 3D,
 * không sửa top/left để tránh reflow.
 */
export class Overlay3D {
  private readonly container: HTMLDivElement | null = null;
  private readonly activeCustomers = new Map<string, CustomerOverlayEntry>();
  private readonly customerPool: CustomerOverlayEntry[] = [];
  private readonly floatingGains: FloatingGainItem[] = [];
  private readonly floatingPool: HTMLDivElement[] = [];

  private shopkeeperBubble: HTMLDivElement | null = null;
  private partnerTag: HTMLDivElement | null = null;

  private readonly tempVector = new Vector3();
  private readonly projVector = new Vector3();
  private readonly viewport = new Viewport(0, 0, 1, 1);

  private frameId = 0;
  private animTimer = 0;
  private motionQuery: MediaQueryList | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly simulation: GameSimulation,
    private readonly scene: Scene,
  ) {
    if (typeof document === 'undefined') return;

    const div = document.createElement('div');
    div.className = 'game-overlay-3d';
    div.style.position = 'absolute';
    div.style.left = '0';
    div.style.top = '0';
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.pointerEvents = 'none';
    div.style.overflow = 'hidden';
    div.style.userSelect = 'none';
    div.style.contain = 'strict';
    div.style.zIndex = '10';

    if (canvas.parentElement) {
      canvas.parentElement.appendChild(div);
    }
    this.container = div;

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    }
  }

  public get containerElement(): HTMLDivElement | null {
    return this.container;
  }

  /** Thêm chữ bay lên (tiền, kinh nghiệm, thông báo) tại toạ độ pixel mô phỏng. */
  public addFloatingGain(x: number, y: number, text: string, color: number = 0xf4a261): void {
    if (!this.container) return;
    const world = pixelToWorld(x, y);

    let el = this.floatingPool.pop();
    if (!el) {
      el = document.createElement('div');
      el.className = 'game-overlay-floating-gain';
      el.style.position = 'absolute';
      el.style.left = '0';
      el.style.top = '0';
      el.style.fontFamily = 'var(--font-pixel, "VT323", monospace)';
      el.style.fontSize = '16px';
      el.style.fontWeight = 'bold';
      el.style.textShadow = '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000';
      el.style.whiteSpace = 'nowrap';
      el.style.pointerEvents = 'none';
      el.style.userSelect = 'none';
      el.style.willChange = 'transform, opacity';
      this.container.appendChild(el);
    }

    const hex = '#' + (color & 0xffffff).toString(16).padStart(6, '0');
    el.textContent = text;
    el.style.color = hex;
    el.style.display = 'block';
    el.style.opacity = '1';

    this.floatingGains.push({
      element: el,
      worldX: world.x,
      worldY: 1.8,
      worldZ: world.z,
      life: 1.0,
      maxLife: 1.0,
    });
  }

  private acquireCustomerOverlay(): CustomerOverlayEntry {
    const reused = this.customerPool.pop();
    if (reused) {
      reused.wrapper.style.display = 'flex';
      return reused;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'game-overlay-customer';
    wrapper.style.position = 'absolute';
    wrapper.style.left = '0';
    wrapper.style.top = '0';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '2px';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.userSelect = 'none';
    wrapper.style.willChange = 'transform, opacity';

    // Dấu "!" yêu cầu đặc biệt
    const requestBadge = document.createElement('div');
    requestBadge.className = 'game-overlay-request-badge';
    requestBadge.textContent = '!';
    requestBadge.style.background = '#f5b82e';
    requestBadge.style.border = '1.5px solid #4a2b16';
    requestBadge.style.color = '#4a2b16';
    requestBadge.style.fontFamily = 'var(--font-pixel, "VT323", monospace)';
    requestBadge.style.fontWeight = 'bold';
    requestBadge.style.fontSize = '13px';
    requestBadge.style.width = '16px';
    requestBadge.style.height = '16px';
    requestBadge.style.borderRadius = '50%';
    requestBadge.style.display = 'none';
    requestBadge.style.alignItems = 'center';
    requestBadge.style.justifyContent = 'center';
    requestBadge.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.25)';

    // Thẻ tên khách quen
    const regularTag = document.createElement('div');
    regularTag.className = 'game-overlay-regular-tag';
    regularTag.style.background = 'rgba(139, 92, 246, 0.95)';
    regularTag.style.border = '1px solid #ffffff';
    regularTag.style.color = '#ffffff';
    regularTag.style.fontFamily = 'var(--font-pixel, "VT323", monospace)';
    regularTag.style.fontSize = '12px';
    regularTag.style.lineHeight = '1';
    regularTag.style.padding = '1px 5px';
    regularTag.style.borderRadius = '2px';
    regularTag.style.whiteSpace = 'nowrap';
    regularTag.style.display = 'none';
    regularTag.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.3)';

    // Bong bóng nhu cầu
    const bubble = document.createElement('div');
    bubble.className = 'game-overlay-bubble';
    bubble.style.display = 'flex';
    bubble.style.flexDirection = 'column';
    bubble.style.alignItems = 'center';

    const bubbleBox = document.createElement('div');
    bubbleBox.className = 'game-overlay-bubble-box';
    bubbleBox.style.background = 'rgba(255, 255, 255, 0.95)';
    bubbleBox.style.border = '1px solid #4a2b16';
    bubbleBox.style.borderRadius = '4px';
    bubbleBox.style.padding = '2px';
    bubbleBox.style.width = '20px';
    bubbleBox.style.height = '20px';
    bubbleBox.style.display = 'flex';
    bubbleBox.style.alignItems = 'center';
    bubbleBox.style.justifyContent = 'center';
    bubbleBox.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.25)';

    const bubblePointer = document.createElement('div');
    bubblePointer.className = 'game-overlay-bubble-pointer';
    bubblePointer.style.width = '0';
    bubblePointer.style.height = '0';
    bubblePointer.style.borderLeft = '3px solid transparent';
    bubblePointer.style.borderRight = '3px solid transparent';
    bubblePointer.style.borderTop = '3px solid #4a2b16';
    bubblePointer.style.marginTop = '-1px';

    bubble.appendChild(bubbleBox);
    bubble.appendChild(bubblePointer);

    wrapper.appendChild(requestBadge);
    wrapper.appendChild(regularTag);
    wrapper.appendChild(bubble);

    this.container?.appendChild(wrapper);

    return {
      wrapper,
      requestBadge,
      regularTag,
      bubble,
      bubbleBox,
      currentIconKey: '',
      currentRegularName: '',
      wantsRequest: false,
      seenFrame: 0,
    };
  }

  public update(
    elapsed: number,
    quarter: number,
    cameraBeta: number,
    roofs: readonly RoofInfo[],
    partnerAvatar?: PartnerAvatarInfo | null,
  ): void {
    if (!this.container) return;

    // Gắn vào canvas.parentElement nếu lúc khởi tạo chưa có
    if (!this.container.parentElement && this.canvas.parentElement) {
      this.canvas.parentElement.appendChild(this.container);
    }

    this.frameId++;
    this.animTimer += elapsed;
    const reducedMotion = this.motionQuery?.matches ?? false;

    const cw = Math.max(1, this.canvas.clientWidth);
    const ch = Math.max(1, this.canvas.clientHeight);
    this.viewport.width = cw;
    this.viewport.height = ch;

    const transformMatrix = this.scene.getTransformMatrix();
    // Đầu sprite billboard = chân + H·(vector lên của camera): đúng cả ortho lẫn phối cảnh (chiếu qua getTransformMatrix).
    const up = cameraUp(isoAlpha(quarter), cameraBeta);
    const headDx = up.x * ACTOR_WORLD_HEIGHT, headDy = up.y * ACTOR_WORLD_HEIGHT, headDz = up.z * ACTOR_WORLD_HEIGHT;

    // 1. Cập nhật floating gains
    for (let i = this.floatingGains.length - 1; i >= 0; i--) {
      const item = this.floatingGains[i];
      item.life -= elapsed;
      if (item.life <= 0) {
        item.element.style.display = 'none';
        this.floatingPool.push(item.element);
        this.floatingGains.splice(i, 1);
        continue;
      }

      const progress = 1 - item.life / item.maxLife;
      const currentWorldY = item.worldY + progress * 0.9;
      this.tempVector.set(item.worldX, currentWorldY, item.worldZ);
      Vector3.ProjectToRef(this.tempVector, Matrix.IdentityReadOnly, transformMatrix, this.viewport, this.projVector);

      const offScreen =
        this.projVector.x < -100 ||
        this.projVector.x > cw + 100 ||
        this.projVector.y < -100 ||
        this.projVector.y > ch + 100 ||
        this.projVector.z < 0 ||
        this.projVector.z > 1;

      if (offScreen) {
        item.element.style.display = 'none';
      } else {
        item.element.style.display = 'block';
        item.element.style.transform = `translate3d(${Math.round(this.projVector.x)}px, ${Math.round(this.projVector.y)}px, 0) translate(-50%, -100%)`;
        item.element.style.opacity = String(Math.max(0, item.life / item.maxLife));
      }
    }

    // 2. Cập nhật khách (bong bóng nhu cầu, thẻ khách quen, yêu cầu đặc biệt)
    const customers = this.simulation.peekCustomers();
    const requestCustomerIds = this.simulation.getSpecialRequestCustomerIds();
    const fixtures = this.simulation.getFixtures();

    for (let idx = 0; idx < customers.length; idx++) {
      const cust = customers[idx];
      const id = `c:${cust.id ?? cust.checkoutId ?? idx}`;
      const world = pixelToWorld(cust.position.x, cust.position.y);

      let entry = this.activeCustomers.get(id);
      if (!entry) {
        entry = this.acquireCustomerOverlay();
        this.activeCustomers.set(id, entry);
      }
      entry.seenFrame = this.frameId;

      // Ẩn nếu nằm trong tòa nhà chưa bóc mái
      if (hiddenByRoof(world.x, world.z, roofs)) {
        entry.wrapper.style.display = 'none';
        continue;
      }

      this.tempVector.set(world.x + headDx, headDy, world.z + headDz);
      Vector3.ProjectToRef(this.tempVector, Matrix.IdentityReadOnly, transformMatrix, this.viewport, this.projVector);

      const offScreen =
        this.projVector.x < -100 ||
        this.projVector.x > cw + 100 ||
        this.projVector.y < -100 ||
        this.projVector.y > ch + 100 ||
        this.projVector.z < 0 ||
        this.projVector.z > 1;

      if (offScreen) {
        entry.wrapper.style.display = 'none';
        continue;
      }

      entry.wrapper.style.display = 'flex';
      entry.wrapper.style.transform = `translate3d(${Math.round(this.projVector.x)}px, ${Math.round(this.projVector.y)}px, 0) translate(-50%, -100%)`;

      // Mờ dần ở hai mép bản đồ (giống Pixi)
      const distFromEdge = Math.min(cust.position.x, MAP_WIDTH * TILE_SIZE - cust.position.x);
      entry.wrapper.style.opacity = distFromEdge < 48 ? String(Math.max(0, Math.min(1, distFromEdge / 48))) : '1';

      // Nội dung icon nhu cầu (chuẩn Pixi)
      const target = fixtures.find((f) => f.id === cust.targetFixtureId);
      const iconKey = cust.stage === 'to_shelf'
        ? `product:${target?.assignedProductId ?? 'none'}`
        : cust.stage === 'leaving'
        ? 'pixel_coin'
        : (cust.basket?.[0]?.productId ? `product:${cust.basket[0].productId}` : 'pixel_coin');

      if (entry.currentIconKey !== iconKey) {
        entry.bubbleBox.innerHTML = getIconSvg(iconKey);
        entry.currentIconKey = iconKey;
      }

      // Trạng thái chờ / yêu cầu đặc biệt ("!")
      const wantsRequest = !!cust.id && requestCustomerIds.has(cust.id);
      if (wantsRequest) {
        entry.requestBadge.style.display = 'flex';
        const bounce = reducedMotion ? 0 : Math.round(Math.sin(this.animTimer * 4) * 2);
        entry.requestBadge.style.transform = bounce ? `translateY(${bounce}px)` : '';
      } else {
        entry.requestBadge.style.display = 'none';
      }

      // Thẻ tên khách quen
      if (cust.regularName) {
        entry.regularTag.style.display = 'block';
        if (entry.currentRegularName !== cust.regularName) {
          entry.regularTag.textContent = `♥ ${cust.regularName}`;
          entry.currentRegularName = cust.regularName;
        }
      } else {
        entry.regularTag.style.display = 'none';
      }
    }

    // Thu dọn khách đã rời
    for (const [id, entry] of this.activeCustomers) {
      if (entry.seenFrame === this.frameId) continue;
      entry.wrapper.style.display = 'none';
      this.customerPool.push(entry);
      this.activeCustomers.delete(id);
    }

    // 3. Bong bóng "Tính tiền" của chủ tiệm
    const keeper = this.simulation.getShopkeeper();
    if (keeper.visible && keeper.serving) {
      if (!this.shopkeeperBubble) {
        const bubble = document.createElement('div');
        bubble.className = 'game-overlay-shopkeeper-bubble';
        bubble.style.position = 'absolute';
        bubble.style.left = '0';
        bubble.style.top = '0';
        bubble.style.background = '#f3e4cb';
        bubble.style.border = '1px solid #4a2b16';
        bubble.style.color = '#263d35';
        bubble.style.fontFamily = 'var(--font-pixel, "VT323", monospace)';
        bubble.style.fontSize = '13px';
        bubble.style.fontWeight = 'bold';
        bubble.style.lineHeight = '1';
        bubble.style.padding = '3px 6px';
        bubble.style.borderRadius = '3px';
        bubble.style.whiteSpace = 'nowrap';
        bubble.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.25)';
        bubble.style.pointerEvents = 'none';
        bubble.style.userSelect = 'none';
        bubble.style.willChange = 'transform';
        bubble.textContent = 'Tính tiền';
        this.container.appendChild(bubble);
        this.shopkeeperBubble = bubble;
      }

      const kw = pixelToWorld(keeper.position.x, keeper.position.y);
      this.tempVector.set(kw.x + headDx, headDy + 0.1, kw.z + headDz);
      Vector3.ProjectToRef(this.tempVector, Matrix.IdentityReadOnly, transformMatrix, this.viewport, this.projVector);

      const offScreen =
        this.projVector.x < -100 ||
        this.projVector.x > cw + 100 ||
        this.projVector.y < -100 ||
        this.projVector.y > ch + 100 ||
        this.projVector.z < 0 ||
        this.projVector.z > 1;

      if (offScreen) {
        this.shopkeeperBubble.style.display = 'none';
      } else {
        this.shopkeeperBubble.style.display = 'block';
        this.shopkeeperBubble.style.transform = `translate3d(${Math.round(this.projVector.x)}px, ${Math.round(this.projVector.y)}px, 0) translate(-50%, -100%)`;
      }
    } else if (this.shopkeeperBubble) {
      this.shopkeeperBubble.style.display = 'none';
    }

    // 4. Thẻ tên bạn chơi co-op
    if (partnerAvatar?.name) {
      if (!this.partnerTag) {
        const tag = document.createElement('div');
        tag.className = 'game-overlay-partner-tag';
        tag.style.position = 'absolute';
        tag.style.left = '0';
        tag.style.top = '0';
        tag.style.background = '#2b6cb0';
        tag.style.border = '1px solid #ffffff';
        tag.style.color = '#ffffff';
        tag.style.fontFamily = 'var(--font-pixel, "VT323", monospace)';
        tag.style.fontSize = '12px';
        tag.style.lineHeight = '1';
        tag.style.padding = '1px 5px';
        tag.style.borderRadius = '2px';
        tag.style.whiteSpace = 'nowrap';
        tag.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.3)';
        tag.style.pointerEvents = 'none';
        tag.style.userSelect = 'none';
        tag.style.willChange = 'transform';
        this.container.appendChild(tag);
        this.partnerTag = tag;
      }

      this.partnerTag.textContent = partnerAvatar.name;
      const pw = pixelToWorld(partnerAvatar.position.x, partnerAvatar.position.y);
      this.tempVector.set(pw.x + headDx, headDy, pw.z + headDz);
      Vector3.ProjectToRef(this.tempVector, Matrix.IdentityReadOnly, transformMatrix, this.viewport, this.projVector);

      const offScreen =
        this.projVector.x < -100 ||
        this.projVector.x > cw + 100 ||
        this.projVector.y < -100 ||
        this.projVector.y > ch + 100 ||
        this.projVector.z < 0 ||
        this.projVector.z > 1;

      if (offScreen) {
        this.partnerTag.style.display = 'none';
      } else {
        this.partnerTag.style.display = 'block';
        this.partnerTag.style.transform = `translate3d(${Math.round(this.projVector.x)}px, ${Math.round(this.projVector.y)}px, 0) translate(-50%, -100%)`;
      }
    } else if (this.partnerTag) {
      this.partnerTag.style.display = 'none';
    }
  }

  /** Dọn dẹp toàn bộ phần tử overlay khi huỷ viewport, đảm bảo không còn div thừa. */
  public destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container.replaceChildren();
    }
    this.activeCustomers.clear();
    this.customerPool.length = 0;
    this.floatingGains.length = 0;
    this.floatingPool.length = 0;
    this.shopkeeperBubble = null;
    this.partnerTag = null;
  }
}

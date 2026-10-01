import { Application, Container, Sprite, Graphics, Text, TextStyle } from 'pixi.js';
import { GameTileMap, TILE_SIZE, Vector2D, isWarehouseFixture, getFixtureDimensions } from '@game/shared';
import { FixedStepSimulationRunner, GameSimulation, getLightingState, computeTreeShadow, treeShadowNeedsRedraw, type TreeShadowSnapshot } from '@game/core';
import { PixelTextureFactory } from './textures';
import { PixelCamera } from './camera';
import { ShopLighting } from './shop-lighting';
import { PRODUCT_MAP, effectiveShelfCapacity, WAREHOUSE_ENTRANCE, WAREHOUSE_CENTER, WAREHOUSE_BOUNDS, WAREHOUSE_DOOR_LEFT, STORE_BOUNDS, isInWarehouse, isFenceTile, STREET_LAMP_TILES, TREE_PROPS, TREE_SPRITE_OFFSET, type TreeProp } from '@game/data';

export interface PixiGameViewportOptions {
  canvas: HTMLCanvasElement;
  tileMap: GameTileMap;
  simulation: GameSimulation;
  onResize?: (width: number, height: number) => void;
  onZoomChange?: (zoom: number) => void;
  getPartnerAvatar?: () => { position: Vector2D; direction: string; isMoving?: boolean; name?: string } | null;
}

import { getDebugVisualTime } from './debug-time';
import { buildRoadSurface, type RoadSurface } from './road-surface';
import { buildTrafficSignalHeads, createPedestrianSprite, placePedestrian, type TrafficSignalHeads } from './street-signal';

/** Điểm gốc bóng so với góc trên-trái sprite cây 80x100 (px): chân thân cây, để bóng đổ từ mặt đất chứ không từ tán. */
const TREE_SHADOW_ORIGIN_PX = { x: 40, y: 90 } as const;

export class PixiGameViewport {
  private app!: Application;
  private canvas: HTMLCanvasElement;
  private tileMap: GameTileMap;
  private simulation: GameSimulation;
  private simulationRunner: FixedStepSimulationRunner;
  private textures: PixelTextureFactory;
  private camera: PixelCamera;
  private getPartnerAvatar?: () => { position: Vector2D; direction: string; isMoving?: boolean; name?: string } | null;

  // Containers
  private worldContainer!: Container;
  private groundLayer!: Container;
  private entitiesLayer!: Container;
  private wallLayer!: Container;
  private uiOverlayLayer!: Container;

  // Dynamic entity sprites & containers
  private playerContainer!: Container;
  private playerSprite!: Sprite;
  private partnerContainer!: Container;
  private partnerSprite!: Sprite;
  private partnerTagBg: Graphics | null = null;
  private partnerTagText: Text | null = null;
  private partnerTagLabel = 'BẠN CÙNG HẺM';
  private partnerShown: { x: number; y: number } | null = null;
  private customerSprites = new Map<string, {
    container: Container;
    sprite: Sprite;
    bubble: Container;
    bubbleIcon: Sprite;
    regularTag: { container: Container; text: Text; bg: Graphics };
    lastPosition: Vector2D | null;
    npcVariant: number;
    npcDirection: string;
  }>();
  private workerSprites = new Map<string, { container: Container; sprite: Sprite; bubble: Container; status: Text; lastPosition: Vector2D | null; variant: number; direction: string }>();
  private parkedMotorbikeSprites = new Map<string, Sprite>();
  private streetTrafficSprites = new Map<string, Sprite>();
  private resizeObserver?: ResizeObserver;
  private onZoomChange?: (zoom: number) => void;
  private ambientSprites: Array<{sprite: Sprite; key: string; frames: number}> = [];
  private stallSprites: Sprite[] = [];
  private shopkeeper?: { container: Container; sprite: Sprite; bubble: Container };
  private motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  private fixtureSprites: Map<string, { container: Container; stockText: Text; dotMarker: Graphics; sprite: Sprite; textureKey: string; lastState: string }> = new Map();
  private interactionBubble!: Container;
  private warehouseLocator!: Container;
  private locatingWarehouse = false;
  private floatingTexts: Array<{ container: Container; life: number; maxLife: number }> = [];

  // Doors & animations
  private warehouseDoorContainer!: Container;
  private warehouseDoorLeft!: Sprite;
  private warehouseDoorRight!: Sprite;
  private storeDoorContainer!: Container;
  private storeDoorLeft!: Sprite;
  private storeDoorRight!: Sprite;
  private storeDoorBell!: Sprite;
  private storeDoorOpenProgress = 0;
  private warehouseDoorOpenProgress = 0;
  private storeBellTimer = 999;
  private wasStoreDoorOpen = false;

  private isInitialized: boolean = false;
  private animTimer: number = 0;

  constructor(options: PixiGameViewportOptions) {
    this.canvas = options.canvas;
    this.tileMap = options.tileMap;
    this.simulation = options.simulation;
    this.simulationRunner = new FixedStepSimulationRunner(options.simulation);
    this.textures = new PixelTextureFactory();
    this.camera = new PixelCamera(this.tileMap.width, this.tileMap.height);
    this.onZoomChange = options.onZoomChange;
    this.getPartnerAvatar = options.getPartnerAvatar;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.app = new Application();
    await this.app.init({
      canvas: this.canvas,
      resizeTo: this.canvas.parentElement || window,
      backgroundColor: 0xb8aea0, // Warm concrete pavement matching Vietnamese alley instead of pitch black
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      roundPixels: true,
      antialias: false,
    });

    this.camera.setViewportSize(this.app.screen.width, this.app.screen.height);

    // Build Scene Graph
    this.worldContainer = new Container();
    this.groundLayer = new Container();
    this.wallLayer = new Container();
    this.entitiesLayer = new Container();
    this.uiOverlayLayer = new Container();

    this.shadowLayer = new Container();
    this.tintLayer = new Container();
    this.lightLayer = new Container();

    // Thứ tự: nền, bóng nắng, tường, thực thể, nhân màu ánh sáng, quầng đèn cộng, nhãn UI.
    this.worldContainer.addChild(this.groundLayer);
    this.worldContainer.addChild(this.shadowLayer);
    this.worldContainer.addChild(this.wallLayer);
    this.worldContainer.addChild(this.entitiesLayer);
    this.worldContainer.addChild(this.tintLayer);
    this.worldContainer.addChild(this.lightLayer);
    this.worldContainer.addChild(this.uiOverlayLayer);
    this.lighting = new ShopLighting(this.tintLayer, this.lightLayer, this.shadowLayer);

    this.app.stage.addChild(this.worldContainer);

    // Build Tile Layers
    this.buildMapLayers();
    this.lighting.rebuildMap(this.tileMap);
    this.rainOverlay = new Graphics();
    this.rainOverlay.eventMode = 'none';
    this.worldContainer.addChild(this.rainOverlay);
    // Build Fixtures
    this.buildFixtures();
    this.buildStalls();

    // Build Player Sprite & Tag
    this.buildPlayer();

    this.buildShopkeeper();

    // Build Partner Sprite & Tag (Multiplayer)
    this.buildPartner();


    // Build Interaction Bubble
    this.buildInteractionBubble();
    this.warehouseLocator = new Container();
    const locatorBg=new Graphics().rect(-48,-18,96,24).fill(0xfff2d6).stroke({color:0x357f72,width:2});
    const locatorText=new Text({text:'CỬA NHÀ KHO ↑',style:{fontFamily:'Arial',fontSize:10,fontWeight:'bold',fill:0x24584f}});
    locatorText.anchor.set(.5);locatorText.y=-6;
    this.warehouseLocator.addChild(locatorBg,locatorText);
    this.warehouseLocator.position.set(WAREHOUSE_ENTRANCE.x,WAREHOUSE_ENTRANCE.y+40);
    this.warehouseLocator.visible=false;
    this.uiOverlayLayer.addChild(this.warehouseLocator);

    // Hook Resize, Zoom & Pan Drag Events
    window.addEventListener('resize', this.handleResize);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });

    // Pointer Dragging for Map Panning
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);

    this.resizeObserver = new ResizeObserver(() => {
      this.app.resize();
      this.camera.setViewportSize(this.app.screen.width, this.app.screen.height);
      this.onZoomChange?.(this.camera.zoom);
    });
    if (this.canvas.parentElement) this.resizeObserver.observe(this.canvas.parentElement);
    // Hook Ticker
    this.app.ticker.add(this.renderTick);

    this.isInitialized = true;
  }

  public updateTileMap(tileMap: GameTileMap): void {
    this.tileMap = tileMap;
    for (const child of this.groundLayer.removeChildren()) child.destroy({ children: true });
    for (const child of this.wallLayer.removeChildren()) child.destroy({ children: true });
    this.buildMapLayers();
    this.lighting.rebuildMap(this.tileMap);
    this.rainOverlay.clear();
    this.buildStalls();
  }

  private initialPinchDistance: number | null = null;
  private initialPinchZoom: number = 2.0;

  private isPointerDown: boolean = false;
  private isPointerDragging: boolean = false;
  private pointerStartX: number = 0;
  private pointerStartY: number = 0;

  private handlePointerDown = (e: PointerEvent): void => {
    // Only primary button (left click) or middle button
    if (e.button !== 0 && e.button !== 1) return;
    this.isPointerDown = true;
    this.isPointerDragging = false;
    this.pointerStartX = e.clientX;
    this.pointerStartY = e.clientY;
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.isPointerDown) return;

    const dx = e.clientX - this.pointerStartX;
    const dy = e.clientY - this.pointerStartY;

    // Small threshold to differentiate between a click and a drag
    if (!this.isPointerDragging && Math.hypot(dx, dy) > 4) {
      this.isPointerDragging = true;
      this.camera.isDragging = true;
      if (this.canvas) {
        this.canvas.style.cursor = 'grabbing';
      }
    }

    if (this.isPointerDragging) {
      this.camera.pan(dx, dy);
      this.pointerStartX = e.clientX;
      this.pointerStartY = e.clientY;
    }
  };

  private handlePointerUp = (_e: PointerEvent): void => {
    this.isPointerDown = false;
    this.isPointerDragging = false;
    this.camera.isDragging = false;
    if (this.canvas) {
      this.canvas.style.cursor = 'default';
    }
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (e.deltaY < 0) {
      this.camera.zoomIn(1);
      this.onZoomChange?.(this.camera.zoom);
    } else if (e.deltaY > 0) {
      this.camera.zoomOut(1);
      this.onZoomChange?.(this.camera.zoom);
    }
  };

  private handleTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.initialPinchDistance = Math.hypot(dx, dy);
      this.initialPinchZoom = this.camera.zoom;
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (e.touches.length === 2 && this.initialPinchDistance) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDistance = Math.hypot(dx, dy);
      const scaleFactor = currentDistance / this.initialPinchDistance;
      this.camera.setZoom(this.initialPinchZoom * scaleFactor);
      this.onZoomChange?.(this.camera.zoom);
    }
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    if (e.touches.length < 2) {
      this.initialPinchDistance = null;
    }
  };

  private handleResize = (): void => {
    if (!this.app || !this.app.renderer) return;
    this.camera.setViewportSize(this.app.screen.width, this.app.screen.height);
    this.onZoomChange?.(this.camera.zoom);
  };

  private buildMapLayers(): void {
    const storeBounds = this.tileMap.storeBounds ?? STORE_BOUNDS;
    const width = this.tileMap.width;
    const height = this.tileMap.height;
    const originY=this.tileMap.originTileY??0;

    // Surrounding buffer around the shop map (-20 to +20 tiles)
    // Ensures seamless nostalgic alley pavement with zero black borders when zoomed out
    const buffer = 18;
    for (let y = -buffer; y < height + buffer; y++) {
      for (let x = -buffer; x < width + buffer; x++) {
        // If outside original shop map bounds, fill with authentic alley ground
        if (x < 0 || x >= width || y < 0 || y >= height) {
          // Use pavement alley texture, with occasional street or sidewalk accents
          // Cỏ bao quanh (kiểu làng quê Stardew) thay cho nền xám phẳng; vỉa hè bám sát mặt tiền.
          let outerTexture = `tile_grass_v${this.tileHash(x, y) % 3}`;
          if (y + originY >= originY + height - 3 || Math.abs(x - width / 2) < 2.5) outerTexture = 'tile_pavement_alley';
          if (y >= height - 2 && y <= height + 2) {
            outerTexture = 'tile_street';
          } else if ((x === -1 || x === width) && y > 2) {
            outerTexture = 'tile_sidewalk';
          }
          const bgSprite = new Sprite(this.textures.getTexture(outerTexture));
          bgSprite.x = x * TILE_SIZE;
          bgSprite.y = (y+originY) * TILE_SIZE;
          this.groundLayer.addChild(bgSprite);
        }
      }
    }

    const groundLayerData = this.tileMap.layers.find((l) => l.name === 'ground')?.data;
    const wallLayerData = this.tileMap.layers.find((l) => l.name === 'walls')?.data;

    // Ground Layer
    if (groundLayerData) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const tileId = groundLayerData[y * width + x];
          let textureKey = 'tile_sidewalk';

          if (tileId === 3) textureKey = 'tile_store_floor';
          else if (tileId === 1) textureKey = 'tile_street';
          else if (tileId === 2) {
            // Vỉa hè chỉ ở mặt tiền (y 11–12); đất trống phía trên/hai bên là cỏ để có chiều sâu kiểu Stardew.
            textureKey = y + originY < 11 ? `tile_grass_v${this.tileHash(x, y) % 3}` : 'tile_sidewalk';
          }
          else if (tileId === 9) textureKey = 'warehouse_floor';

          const tileSprite = new Sprite(this.textures.getTexture(textureKey));
          tileSprite.x = x * TILE_SIZE;
          tileSprite.y = (y+originY) * TILE_SIZE;
          this.groundLayer.addChild(tileSprite);
        }
      }

      // Mặt cắt lòng đường: bó vỉa, rãnh, cửa thu nước, vạch giữa, vạch qua đường, lớp ướt. Chỉ hình ảnh.
      this.roadSurface = buildRoadSurface(this.groundLayer, width);
    }

    // Wall Layer & Shop decorations (2.5D Stardew Valley-inspired slim walls)
    // Trang trí ngoài trời (chỉ hình ảnh): hoa rải rác trên cỏ và hàng rào thấp giữa cỏ với vỉa hè.
    if (groundLayerData) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (groundLayerData[y * width + x] !== 2 || y + originY >= 11) continue;
          const h = this.tileHash(x + 91, y + 17);
          if (isFenceTile(x, y + originY, width)) {
            const fence = new Sprite(this.textures.getTexture('deco_fence'));
            fence.x = x * TILE_SIZE;
            fence.y = (y + originY) * TILE_SIZE;
            this.groundLayer.addChild(fence);
          } else if (h % 7 === 0) {
            const flowers = new Sprite(this.textures.getTexture(`deco_flowers_${(h >>> 4) % 3}`));
            flowers.x = x * TILE_SIZE;
            flowers.y = (y + originY) * TILE_SIZE;
            this.groundLayer.addChild(flowers);
          }
        }
      }
    }

    this.worldContainer.sortableChildren = true;
    // Cột đèn đường; quầng sáng do ShopLighting quản lý theo giờ.
    for (const lamp of STREET_LAMP_TILES) {
      const pole = new Sprite(this.textures.getTexture('deco_lamp_pole'));
      pole.anchor.set(0, 1);
      pole.x = lamp.x * TILE_SIZE;
      pole.y = (lamp.y + 1) * TILE_SIZE;
      this.groundLayer.addChild(pole);
    }

    if (wallLayerData) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const tileId = wallLayerData[y * width + x];
          if (tileId === 4 || tileId === 10) {
            const worldY = y + originY;
            let textureKey = tileId === 10 ? 'warehouse_wall' : 'tile_yellow_wall';

            // 2.5D Stardew Valley slim walls:
            if (worldY < STORE_BOUNDS.top) {
              if (worldY === WAREHOUSE_BOUNDS.top) {
                if (x === WAREHOUSE_BOUNDS.left) textureKey = 'wall_warehouse_corner_tl';
                else if (x === WAREHOUSE_BOUNDS.right) textureKey = 'wall_warehouse_corner_tr';
                else textureKey = 'wall_warehouse_back';
              } else if (x === WAREHOUSE_BOUNDS.left) {
                textureKey = 'wall_warehouse_left';
              } else if (x === WAREHOUSE_BOUNDS.right) {
                textureKey = 'wall_warehouse_right';
              }
            } else if (worldY === STORE_BOUNDS.top) {
              if (x <= WAREHOUSE_DOOR_LEFT) textureKey = 'wall_partition_left';
              else textureKey = 'wall_partition_right';
            } else {
              if (worldY === STORE_BOUNDS.bottom) {
                if (x === STORE_BOUNDS.left) textureKey = 'wall_store_corner_bl';
                else if (x === storeBounds.right) textureKey = 'wall_store_corner_br';
                else textureKey = 'wall_store_front';
              } else if (x === STORE_BOUNDS.left) {
                textureKey = 'wall_store_left';
              } else if (x === storeBounds.right) {
                textureKey = 'wall_store_right';
              }
            }

            const wallSprite = new Sprite(this.textures.getTexture(textureKey));
            wallSprite.x = x * TILE_SIZE;
            wallSprite.y = worldY * TILE_SIZE;
            this.wallLayer.addChild(wallSprite);
          }
        }
      }
    }

    // 2.5D Stardew Valley ambient drop shadows cast by walls onto floors
    const wallShadows = new Graphics();
    wallShadows.rect((WAREHOUSE_BOUNDS.left + 1) * TILE_SIZE, (WAREHOUSE_BOUNDS.top + 1) * TILE_SIZE, 6 * TILE_SIZE, 5).fill({ color: 0x26190e, alpha: 0.22 });
    wallShadows.rect((STORE_BOUNDS.left + 1) * TILE_SIZE, (STORE_BOUNDS.top + 1) * TILE_SIZE, 6 * TILE_SIZE, 5).fill({ color: 0x26190e, alpha: 0.22 });
    wallShadows.rect((WAREHOUSE_BOUNDS.left + 1) * TILE_SIZE, (WAREHOUSE_BOUNDS.top + 1) * TILE_SIZE, 5, 5 * TILE_SIZE).fill({ color: 0x26190e, alpha: 0.18 });
    wallShadows.rect((STORE_BOUNDS.left + 1) * TILE_SIZE, (STORE_BOUNDS.top + 1) * TILE_SIZE, 5, 6 * TILE_SIZE).fill({ color: 0x26190e, alpha: 0.18 });
    this.groundLayer.addChild(wallShadows);

    // Main shop signboard crowning the top of the building
    const shopSign = new Sprite(this.textures.getTexture('tile_signboard'));
    shopSign.position.set((WAREHOUSE_BOUNDS.left + 2) * TILE_SIZE, WAREHOUSE_BOUNDS.top * TILE_SIZE - 28);
    this.wallLayer.addChild(shopSign);

    // Warehouse sign located on the arch/transom right above the warehouse door
    const warehouseSign = new Sprite(this.textures.getTexture('warehouse_sign'));
    warehouseSign.position.set(WAREHOUSE_DOOR_LEFT * TILE_SIZE, STORE_BOUNDS.top * TILE_SIZE - 20);
    this.wallLayer.addChild(warehouseSign);

    // Clean warehouse doorway frame and wood threshold
    const doorway = new Graphics();
    doorway.rect(WAREHOUSE_DOOR_LEFT * TILE_SIZE, STORE_BOUNDS.top * TILE_SIZE, 2, 32).fill(0x936044);
    doorway.rect((WAREHOUSE_DOOR_LEFT + 2) * TILE_SIZE - 2, STORE_BOUNDS.top * TILE_SIZE, 2, 32).fill(0xc69464);
    doorway.rect(WAREHOUSE_DOOR_LEFT * TILE_SIZE, (STORE_BOUNDS.top + 1) * TILE_SIZE - 2, 64, 2).fill(0xbfa993);
    this.groundLayer.addChild(doorway);

    // Warehouse sliding doors on overhead steel track
    this.warehouseDoorContainer = new Container();
    this.warehouseDoorContainer.position.set(WAREHOUSE_DOOR_LEFT * TILE_SIZE, STORE_BOUNDS.top * TILE_SIZE);
    this.warehouseDoorContainer.zIndex = 115;

    const track = new Sprite(this.textures.getTexture('warehouse_door_track'));
    track.position.set(0, -3);
    this.warehouseDoorContainer.addChild(track);

    this.warehouseDoorLeft = new Sprite(this.textures.getTexture('warehouse_door_left'));
    this.warehouseDoorLeft.position.set(0, 0);
    this.warehouseDoorContainer.addChild(this.warehouseDoorLeft);

    this.warehouseDoorRight = new Sprite(this.textures.getTexture('warehouse_door_right'));
    this.warehouseDoorRight.position.set(32, 0);
    this.warehouseDoorContainer.addChild(this.warehouseDoorRight);

    this.entitiesLayer.addChild(this.warehouseDoorContainer);

    // 1. Wall fan mounted cleanly on the store partition wall (y = 3)
    const fan = new Sprite(this.textures.getTexture('tile_fan_0'));
    fan.position.set(7 * TILE_SIZE, 3 * TILE_SIZE + 6);
    this.wallLayer.addChild(fan);
    this.ambientSprites.push({ sprite: fan, key: 'tile_fan_', frames: 4 });

    // 2. Standing pedestal fan (quạt cây) located beside the cashier counter on floor
    const standingFan = new Sprite(this.textures.getTexture('standing_fan_0'));
    standingFan.position.set(6 * TILE_SIZE + 18, 8 * TILE_SIZE + 6);
    standingFan.zIndex = (8 * TILE_SIZE + 6) + 32;
    this.entitiesLayer.addChild(standingFan);
    this.ambientSprites.push({ sprite: standingFan, key: 'standing_fan_', frames: 4 });

    // 3. Vintage Vietnamese wooden window with security bars & soft sunlight beam
    // Window placed on LEFT side wall (x=6) of the shop, facing the exterior street
    // The window texture shows the inside-looking-out view → correct orientation on left wall
    const storeWindow = new Sprite(this.textures.getTexture('store_window'));
    storeWindow.position.set(6 * TILE_SIZE, 5 * TILE_SIZE);
    this.wallLayer.addChild(storeWindow);

    // Warm morning sunlight beam casting through left-wall window aperture into shop interior (east direction)
    const sunBeam = new Graphics();
    this.sunBeamGraphic = sunBeam;
    sunBeam.poly([
      6 * TILE_SIZE + 29, 5 * TILE_SIZE + 6,
      6 * TILE_SIZE + 29, 5 * TILE_SIZE + 22,
      9 * TILE_SIZE,      7 * TILE_SIZE,
      9 * TILE_SIZE,      6 * TILE_SIZE,
    ]).fill({ color: 0xfff3c4, alpha: 0.12 });
    this.groundLayer.addChild(sunBeam);

    // Storefront awning (mái hiên sọc 2.5D) crowning the front entrance facade neatly
    // Positioned at x = 7 * TILE_SIZE (centered over the 9..10 entrance and adjacent wall)
    // and elevated above the door transom (y = 10 * TILE_SIZE - 20) with high zIndex so it looks natural and doesn't cut across the door
    const awning = new Sprite(this.textures.getTexture('tile_awning'));
    awning.position.set(7 * TILE_SIZE, 10 * TILE_SIZE - 22);
    awning.zIndex = 360;
    this.entitiesLayer.addChild(awning);

    // Front store entrance doors (vintage Vietnamese glass-wood double doors with brass chime bell)
    const frontDoorSill = new Graphics();
    frontDoorSill.rect(9 * TILE_SIZE, (10 + 1) * TILE_SIZE - 2, 64, 2).fill(0x8a7762);
    this.groundLayer.addChild(frontDoorSill);

    this.storeDoorContainer = new Container();
    this.storeDoorContainer.position.set(9 * TILE_SIZE, 10 * TILE_SIZE);
    this.storeDoorContainer.zIndex = 345;

    this.storeDoorLeft = new Sprite(this.textures.getTexture('store_door_left'));
    this.storeDoorLeft.anchor.set(0, 0);
    this.storeDoorLeft.position.set(0, 0);
    this.storeDoorContainer.addChild(this.storeDoorLeft);

    this.storeDoorRight = new Sprite(this.textures.getTexture('store_door_right'));
    this.storeDoorRight.anchor.set(1, 0);
    this.storeDoorRight.position.set(64, 0);
    this.storeDoorContainer.addChild(this.storeDoorRight);

    this.storeDoorBell = new Sprite(this.textures.getTexture('store_door_bell'));
    this.storeDoorBell.anchor.set(0.5, 0);
    this.storeDoorBell.position.set(32, -3);
    this.storeDoorContainer.addChild(this.storeDoorBell);

    this.entitiesLayer.addChild(this.storeDoorContainer);

    // Sidewalk Produce Crates - placed naturally along the sidewalk
    const crates = new Sprite(this.textures.getTexture('tile_crates'));
    crates.position.set(5 * TILE_SIZE, 11 * TILE_SIZE + 4);
    crates.zIndex = crates.y + 32;
    this.entitiesLayer.addChild(crates);

    // Chair inside the store near the shelves/cashier area
    const chair = new Sprite(this.textures.getTexture('tile_chair'));
    chair.position.set(11 * TILE_SIZE, 7 * TILE_SIZE);
    chair.zIndex = chair.y + 32;
    this.entitiesLayer.addChild(chair);

    // Cozy Alley Shade Tree on sidewalk
    this.trafficSignalHeads = buildTrafficSignalHeads(this.entitiesLayer);
    for (const prop of TREE_PROPS) {
      const tree = new Sprite(this.textures.getTexture('tile_tree'));
      tree.position.set((prop.tileX + TREE_SPRITE_OFFSET.tilesX) * TILE_SIZE, (prop.tileY + TREE_SPRITE_OFFSET.tilesY) * TILE_SIZE + TREE_SPRITE_OFFSET.pixelsY);
      tree.zIndex = tree.y + 100;
      this.entitiesLayer.addChild(tree);
      const shadow = new Graphics();
      shadow.eventMode = 'none';
      this.shadowLayer.addChild(shadow);
      this.treeShadows.push({ prop, graphic: shadow, last: null });
    }

    const wires = new Graphics();
    const wireY=(WAREHOUSE_BOUNDS.top-1)*TILE_SIZE;
    wires.moveTo(2*TILE_SIZE,wireY).lineTo(5*TILE_SIZE,wireY+16).lineTo(14*TILE_SIZE,wireY).stroke({color:0x593a2b,width:1});
    this.wallLayer.addChild(wires);

    // Flanking Potted Plants & Baskets on either side of the entrance
    const plant1 = new Sprite(this.textures.getTexture('tile_plant_pot'));
    plant1.x = 7 * TILE_SIZE + 8;
    plant1.y = 10 * TILE_SIZE;
    plant1.zIndex = plant1.y + 40;
    this.ambientSprites.push({sprite:plant1,key:'tile_plant_',frames:2});
    this.entitiesLayer.addChild(plant1);

    const plant2 = new Sprite(this.textures.getTexture('tile_plant_pot'));
    plant2.x = 11 * TILE_SIZE + 8;
    plant2.y = 10 * TILE_SIZE;
    plant2.zIndex = plant2.y + 40;
    this.ambientSprites.push({sprite:plant2,key:'tile_plant_',frames:2});
    this.entitiesLayer.addChild(plant2);

    const baskets = new Sprite(this.textures.getTexture('tile_shopping_baskets'));
    baskets.x = 8 * TILE_SIZE + 4;
    baskets.y = 10 * TILE_SIZE + 6;
    baskets.zIndex = baskets.y + 32;
    this.entitiesLayer.addChild(baskets);
  }

  /** Quầy ăn uống trên vỉa hè; chỉ vẽ, va chạm đã có trong collisionLayer của bản đồ. */
  private buildStalls(): void {
    for (const sprite of this.stallSprites) sprite.destroy();
    this.stallSprites = [];
    for (const stall of this.tileMap.stalls ?? []) {
      const sprite = new Sprite(this.textures.getTexture(`stall_${stall.id}`));
      sprite.position.set(stall.tileX * TILE_SIZE, (stall.tileY + 1) * TILE_SIZE - 48);
      sprite.zIndex = (stall.tileY + 1) * TILE_SIZE + 2;
      this.entitiesLayer.addChild(sprite);
      this.stallSprites.push(sprite);

      // Người bán quầy phụ đứng sau quầy
      const vendor = new Sprite(this.textures.getTexture('npc_1_down_idle_0'));
      vendor.anchor.set(0.5, 1);
      vendor.position.set((stall.tileX + 1) * TILE_SIZE, (stall.tileY + 0.6) * TILE_SIZE);
      vendor.zIndex = stall.tileY * TILE_SIZE;
      this.entitiesLayer.addChild(vendor);
      this.stallSprites.push(vendor);
    }
  }

  private buildFixtures(): void {
    const fixtures = this.simulation.getFixtures();
    for (const fix of fixtures) {
      if (fix.parentId) continue;
      const dimensions = getFixtureDimensions(fix);
      const container = new Container();
      container.pivot.set(fix.widthTiles * TILE_SIZE / 2, fix.heightTiles * TILE_SIZE / 2);
      container.x = fix.tileX * TILE_SIZE + dimensions.widthTiles * TILE_SIZE / 2;
      container.y = fix.tileY * TILE_SIZE + dimensions.heightTiles * TILE_SIZE / 2;
      container.rotation = fix.rotation * Math.PI / 180;

      let textureKey = 'fixture_shelf_wooden';
      if (fix.type === 'cashier_counter') {
        textureKey = 'fixture_cashier';
      } else if (fix.type === 'refrigerator') {
        textureKey = 'fixture_refrigerator';
      } else if(isWarehouseFixture(fix)) {
        textureKey = `fixture_${fix.type}`;
      }

      const sprite = new Sprite(this.textures.getTexture(textureKey));
      sprite.y = -16;
      container.zIndex = (fix.tileY + dimensions.heightTiles) * TILE_SIZE;
      container.addChild(sprite);

      // Pill stock badge under shelf (Matching user reference image & Redhexx!)
      const badgeBg = new Graphics();
      badgeBg.rect(isWarehouseFixture(fix)?2:10, 34, isWarehouseFixture(fix)?60:44, 13);
      badgeBg.fill({ color: 0xeadcc9, alpha: 0.96 });
      badgeBg.stroke({ color: 0xbfa993, width: 1 });
      badgeBg.visible = fix.type !== 'cashier_counter';
      container.addChild(badgeBg);

      // Dot marker (Green = Full, Yellow = Low stock, Red = Out of stock)
      const dotMarker = new Graphics();
      dotMarker.rect(13, 38, 6, 6);
      dotMarker.fill({ color: 0x2a7a43 });
      container.addChild(dotMarker);

      const style = new TextStyle({
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: 9,
        fontWeight: 'bold',
        fill: 0x43382f,
      });

      const stockText = new Text({ text: '', style });
      stockText.anchor.set(0, 0.5);
      stockText.x = isWarehouseFixture(fix)?14:22;
      stockText.y = 40.5;
      container.addChild(stockText);

      this.entitiesLayer.addChild(container);
      this.fixtureSprites.set(fix.id, { container, stockText, dotMarker, sprite, textureKey, lastState: '' });
    }
  }

  private buildPlayer(): void {
    this.playerContainer = new Container();

    this.playerSprite = new Sprite(this.textures.getTexture('player_down_idle_0'));
    this.playerSprite.anchor.set(0.5, 1); // Anchor at feet
    this.playerContainer.addChild(this.playerSprite);

    // Vietnamese Overhead "BẠN" Tag (Ảnh 4 - Tạp hóa đầu hẻm)
    const tagBg = new Graphics();
    tagBg.rect(-12, -62, 24, 11);
    tagBg.fill({ color: 0xd9381e });
    tagBg.stroke({ color: 0xffffff, width: 1 });
    this.playerContainer.addChild(tagBg);

    const tagStyle = new TextStyle({
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: 8,
      fontWeight: 'bold',
      fill: 0xffffff,
    });
    const tagText = new Text({ text: 'BẠN', style: tagStyle });
    tagText.anchor.set(0.5);
    tagText.x = 0;
    tagText.y = -56;
    this.playerContainer.addChild(tagText);

    this.entitiesLayer.addChild(this.playerContainer);
  }

  /** Chủ tiệm đứng sau quầy thu ngân; bong bóng "Tính tiền" hiện khi đang phục vụ khách. */
  private buildShopkeeper(): void {
    const container = new Container();
    const sprite = new Sprite(this.textures.getTexture('npc_1_down_idle_0'));
    sprite.anchor.set(0.5, 1);
    container.addChild(sprite);
    const bubble = new Container();
    const background = new Graphics();
    background.roundRect(-28, -70, 56, 18, 3);
    background.fill({ color: 0xfff7df, alpha: 0.95 });
    background.stroke({ color: 0x593a2b, width: 1 });
    bubble.addChild(background);
    const label = new Text({ text: 'Tính tiền', style: new TextStyle({ fontFamily: 'Arial', fontSize: 9, fill: 0x263d35, align: 'center' }) });
    label.anchor.set(0.5);
    label.y = -61;
    bubble.addChild(label);
    bubble.visible = false;
    container.addChild(bubble);
    this.entitiesLayer.addChild(container);
    this.shopkeeper = { container, sprite, bubble };
  }

  private setPartnerTag(label: string): void {
    this.partnerTagLabel = label;
    if (!this.partnerTagText || !this.partnerTagBg) return;
    this.partnerTagText.text = label;
    const width = Math.max(32, Math.ceil(this.partnerTagText.width) + 10);
    this.partnerTagBg.clear();
    this.partnerTagBg.rect(-width / 2, -62, width, 11);
    this.partnerTagBg.fill({ color: 0x2b6cb0 });
    this.partnerTagBg.stroke({ color: 0xffffff, width: 1 });
  }

  private buildPartner(): void {
    this.partnerContainer = new Container();

    this.partnerSprite = new Sprite(this.textures.getTexture('player_down_idle_0'));
    this.partnerSprite.anchor.set(0.5, 1);
    this.partnerContainer.addChild(this.partnerSprite);

    this.partnerTagBg = new Graphics();
    this.partnerContainer.addChild(this.partnerTagBg);
    this.setPartnerTag('BẠN CÙNG HẺM');

    const tagStyle = new TextStyle({
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: 8,
      fontWeight: 'bold',
      fill: 0xffffff,
    });
    this.partnerTagText = new Text({ text: this.partnerTagLabel, style: tagStyle });
    this.partnerTagText.anchor.set(0.5);
    this.partnerTagText.x = 0;
    this.partnerTagText.y = -56;
    this.partnerContainer.addChild(this.partnerTagText);
    this.setPartnerTag(this.partnerTagLabel);

    this.partnerContainer.visible = false;
    this.entitiesLayer.addChild(this.partnerContainer);
  }

  private bubbleWidth = 0;
  private lighting!: ShopLighting;
  private shadowLayer!: Container;
  private tintLayer!: Container;
  private lightLayer!: Container;
  private sunBeamGraphic!: Graphics;
  private roadSurface: RoadSurface | null = null;
  private trafficSignalHeads: TrafficSignalHeads | null = null;
  private pedestrianSprites = new Map<string, Container>();
  private treeShadows: Array<{ prop: TreeProp; graphic: Graphics; last: TreeShadowSnapshot | null }> = [];
  private rainOverlay!: Graphics;

  /** Băm cố định theo ô để cỏ/hoa không nhấp nháy giữa các lần dựng. */
  private tileHash(x: number, y: number): number {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }


  private buildInteractionBubble(): void {
    this.interactionBubble = new Container();

    // Cute Question Bubble (?) Sprite from reference image
    const questionSprite = new Sprite(this.textures.getTexture('bubble_question'));
    questionSprite.anchor.set(0.5, 1.0);
    questionSprite.y = -6;
    this.interactionBubble.addChild(questionSprite);

    // Pill badge for button hint
    const bg = new Graphics();
    bg.rect(-48, -36, 96, 24);
    bg.fill({ color: 0xfcf4dc, alpha: 0.96 });
    bg.stroke({ color: 0x8b5a2b, width: 2 });
    this.interactionBubble.addChild(bg);

    const style = new TextStyle({
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: 10,
      fontWeight: 'bold',
      fill: 0x38200e,
    });

    const text = new Text({ text: '[E] Xem kệ', style });
    text.anchor.set(0.5);
    text.y = -23;
    this.interactionBubble.addChild(text);

    this.interactionBubble.visible = false;
    this.uiOverlayLayer.addChild(this.interactionBubble);
  }

  private renderTick = (): void => {
    const elapsed = Math.min(this.app.ticker.deltaMS / 1000, 0.25);
    const dt = 1 / 60;
    this.animTimer += elapsed;
    this.simulationRunner.advance(elapsed);

    const playerData = this.simulation.getPlayerData();
    const isMoving = this.simulation.getIsMoving();
    if(isMoving && this.locatingWarehouse) {
      this.camera.resetPan();this.locatingWarehouse=false;this.warehouseLocator.visible=false;
    }

    const reducedMotion = this.motionQuery.matches;
    const mode = isMoving ? 'walk' : 'idle';
    const frame = reducedMotion ? 0 : Math.floor(this.animTimer * (isMoving ? 8 : 1.5)) % (isMoving ? 4 : 2);
    this.playerSprite.texture = this.textures.getTexture(`player_${playerData.direction}_${mode}_${frame}`);
    this.playerContainer.position.set(Math.round(playerData.position.x), Math.round(playerData.position.y));
    this.playerContainer.zIndex = playerData.position.y;

    // Render partner avatar if in online co-op session
    const partner = this.getPartnerAvatar?.();
    if (partner) {
      this.partnerContainer.visible = true;
      const partnerLabel = (partner.name ?? 'BẠN CÙNG HẺM').toUpperCase().slice(0, 18);
      if (partnerLabel !== this.partnerTagLabel) this.setPartnerTag(partnerLabel);
      // Smooth the ~10Hz server snapshots and derive walk animation from displayed motion
      const target = partner.position;
      const shown = this.partnerShown ?? { x: target.x, y: target.y };
      const gap = Math.hypot(target.x - shown.x, target.y - shown.y);
      if (gap > 96) { shown.x = target.x; shown.y = target.y; }
      else { const k = Math.min(1, elapsed * 12); shown.x += (target.x - shown.x) * k; shown.y += (target.y - shown.y) * k; }
      this.partnerShown = shown;
      const partnerMoving = partner.isMoving ?? gap > 1.5;
      const partnerMode = partnerMoving ? 'walk' : 'idle';
      const partnerFrame = reducedMotion ? 0 : Math.floor(this.animTimer * (partnerMoving ? 8 : 1.5)) % (partnerMoving ? 4 : 2);
      this.partnerSprite.texture = this.textures.getTexture(`player_${partner.direction || 'down'}_${partnerMode}_${partnerFrame}`);
      this.partnerContainer.position.set(Math.round(shown.x), Math.round(shown.y));
      this.partnerContainer.zIndex = shown.y;
    } else if (this.partnerContainer) {
      this.partnerContainer.visible = false;
      this.partnerShown = null;
    }

    if (this.shopkeeper) {
      const keeper = this.simulation.getShopkeeper();
      const frame = reducedMotion ? 0 : Math.floor(this.animTimer * 1.5) % 2;
      this.shopkeeper.sprite.texture = this.textures.getTexture(`npc_1_${keeper.direction}_idle_${frame}`);
      this.shopkeeper.container.position.set(Math.round(keeper.position.x), Math.round(keeper.position.y));
      this.shopkeeper.container.zIndex = keeper.position.y;
      this.shopkeeper.bubble.visible = keeper.serving;
    }

    const customers = this.simulation.getCustomers();
    const activeCustomerKeys = new Set<string>();

    for (let idx = 0; idx < customers.length; idx++) {
      const cust = customers[idx];
      const key = cust.id ?? cust.checkoutId ?? `cust-${idx}`;
      activeCustomerKeys.add(key);

      let entry = this.customerSprites.get(key);
      if (!entry) {
        entry = this.createCustomerSprite(idx % 3);
        this.customerSprites.set(key, entry);
      }

      const previous = entry.lastPosition;
      const dx = previous ? cust.position.x - previous.x : 0;
      const dy = previous ? cust.position.y - previous.y : 0;
      const walking = Math.abs(dx) + Math.abs(dy) > 0.01;
      if (walking) {
        entry.npcDirection = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      } else if (cust.stage === 'checkout') {
        entry.npcDirection = 'left'; // dừng ở quầy thì quay mặt vào quầy thu ngân
      }
      const npcFrame = reducedMotion ? 0 : Math.floor(this.animTimer * (walking ? 8 : 1.5)) % (walking ? 4 : 2);
      entry.sprite.texture = this.textures.getTexture(`npc_${entry.npcVariant}_${entry.npcDirection}_${walking ? 'walk' : 'idle'}_${npcFrame}`);
      entry.container.position.set(Math.round(cust.position.x), Math.round(cust.position.y));
      entry.container.zIndex = cust.position.y;

      const target = this.simulation.getFixtures().find((f) => f.id === cust.targetFixtureId);
      const iconKey = cust.stage === 'to_shelf'
        ? `product:${target?.assignedProductId ?? 'none'}`
        : cust.stage === 'leaving'
        ? 'pixel_coin'
        : (cust.basket?.[0]?.productId ? `product:${cust.basket[0].productId}` : 'pixel_coin');
      entry.bubbleIcon.texture = this.textures.getTexture(iconKey);

      if (cust.regularName) {
        entry.regularTag.container.visible = true;
        entry.regularTag.text.text = `♥ ${cust.regularName}`;
        const tagWidth = Math.max(32, Math.ceil(entry.regularTag.text.width) + 8);
        entry.regularTag.bg.clear();
        entry.regularTag.bg.rect(-tagWidth / 2, -78, tagWidth, 12);
        entry.regularTag.bg.fill({ color: 0x8b5cf6, alpha: 0.95 });
        entry.regularTag.bg.stroke({ color: 0xffffff, width: 1 });
      } else {
        entry.regularTag.container.visible = false;
      }

      entry.lastPosition = { ...cust.position };
    }

    // Clean up departed customer sprites
    for (const [key, entry] of this.customerSprites.entries()) {
      if (!activeCustomerKeys.has(key)) {
        this.entitiesLayer.removeChild(entry.container);
        entry.container.destroy({ children: true });
        this.customerSprites.delete(key);
      }
    }

    const workers = this.simulation.getStaff().slice(0, 4);
    const workerIds = new Set(workers.map((worker) => worker.id));
    workers.forEach((worker, idx) => {
      const position = worker.position ?? { x: 300 + idx * TILE_SIZE, y: 300 };
      let entry = this.workerSprites.get(worker.id);
      if (!entry) {
        const container = new Container();
        const sprite = new Sprite(this.textures.getTexture(`npc_${idx % 3}_down_idle_0`));
        sprite.anchor.set(0.5, 1);
        container.addChild(sprite);
        const bubble = new Container();
        const background = new Graphics();
        background.roundRect(-25, -70, 50, 18, 3);
        background.fill({ color: 0xfff7df, alpha: 0.95 });
        background.stroke({ color: 0x593a2b, width: 1 });
        bubble.addChild(background);
        const status = new Text({ text: '', style: new TextStyle({ fontFamily: 'Arial', fontSize: 8, fill: 0x263d35, align: 'center' }) });
        status.anchor.set(0.5);
        status.y = -61;
        bubble.addChild(status);
        container.addChild(bubble);
        this.entitiesLayer.addChild(container);
        entry = { container, sprite, bubble, status, lastPosition: null, variant: idx % 3, direction: 'down' };
        this.workerSprites.set(worker.id, entry);
      }
      const previous = entry.lastPosition;
      const dx = previous ? position.x - previous.x : 0;
      const dy = previous ? position.y - previous.y : 0;
      const walking = Math.abs(dx) + Math.abs(dy) > 0.01;
      if (walking) entry.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      const frame = reducedMotion ? 0 : Math.floor(this.animTimer * (walking ? 8 : 1.5)) % (walking ? 4 : 2);
      entry.sprite.texture = this.textures.getTexture(`npc_${entry.variant}_${entry.direction}_${walking ? 'walk' : 'idle'}_${frame}`);
      entry.container.position.set(Math.round(position.x), Math.round(position.y));
      entry.container.zIndex = position.y + 1;
      entry.status.text = worker.lastWorkerError
        ? 'kẹt'
        : worker.role === 'security'
        ? 'bảo vệ xe'
        : worker.role === 'cashier'
        ? (worker.currentCheckoutId ? 'thu ngân' : 'chờ khách')
        : worker.workerTask ? 'châm kệ' : 'rảnh';
      entry.lastPosition = { ...position };
    });
    for (const [id, entry] of this.workerSprites.entries()) {
      if (!workerIds.has(id)) {
        this.entitiesLayer.removeChild(entry.container);
        entry.container.destroy({ children: true });
        this.workerSprites.delete(id);
      }
    }

    for (const ambient of this.ambientSprites) {
      ambient.sprite.texture = this.textures.getTexture(`${ambient.key}${reducedMotion ? 0 : Math.floor(this.animTimer * (ambient.key === 'tile_fan_' ? 5 : 1)) % ambient.frames}`);
    }
    // Render parked motorbikes of customers currently visiting
    const activeVehicleKeys = new Set<string>();
    for (const cust of customers) {
      if (cust.vehicleSpot && (cust.arrivalMode === 'motorbike' || cust.arrivalMode === 'car')) {
        const parkedTexture = cust.arrivalMode === 'car' ? 'vehicle_car_right' : `vehicle_motorbike_parked_${cust.vehicleVariant ?? 0}`;
        const key = cust.id ?? cust.checkoutId ?? 'vehicle';
        activeVehicleKeys.add(key);
        let sprite = this.parkedMotorbikeSprites.get(key);
        if (!sprite) {
          sprite = new Sprite(this.textures.getTexture(parkedTexture));
          sprite.anchor.set(0.5, 1);
          sprite.x = Math.round(cust.vehicleSpot.x);
          sprite.y = Math.round(cust.vehicleSpot.y);
          sprite.zIndex = cust.vehicleSpot.y;
          this.entitiesLayer.addChild(sprite);
          this.parkedMotorbikeSprites.set(key, sprite);
        } else {
          sprite.texture = this.textures.getTexture(parkedTexture);
        }
      }
    }
    for (const [key, sprite] of this.parkedMotorbikeSprites.entries()) {
      if (!activeVehicleKeys.has(key)) {
        this.entitiesLayer.removeChild(sprite);
        sprite.destroy();
        this.parkedMotorbikeSprites.delete(key);
      }
    }

    // Render ambient street vehicles flowing along alley
    const streetVehicles = this.simulation.getStreetVehicles();
    const activeStreetKeys = new Set<string>();
    for (const veh of streetVehicles) {
      activeStreetKeys.add(veh.id);
      let sprite = this.streetTrafficSprites.get(veh.id);
      const textureKey = veh.type === 'motorbike'
        ? `vehicle_motorbike_rider_${veh.variant ?? 0}_${veh.direction}`
        : `vehicle_car_${veh.direction}`;
      if (!sprite) {
        sprite = new Sprite(this.textures.getTexture(textureKey));
        sprite.anchor.set(0.5, 1);
        this.entitiesLayer.addChild(sprite);
        this.streetTrafficSprites.set(veh.id, sprite);
      } else {
        sprite.texture = this.textures.getTexture(textureKey);
      }
      sprite.x = Math.round(veh.position.x);
      sprite.y = Math.round(veh.position.y);
      sprite.zIndex = veh.position.y;
    }
    for (const [id, sprite] of this.streetTrafficSprites.entries()) {
      if (!activeStreetKeys.has(id)) {
        this.entitiesLayer.removeChild(sprite);
        sprite.destroy();
        this.streetTrafficSprites.delete(id);
      }
    }

    // Đèn tín hiệu và người đi bộ qua vạch trước cửa tiệm (ambient, không phải khách)
    this.trafficSignalHeads?.update(this.simulation.getTrafficSignal());
    const activePedestrians = new Set<string>();
    for (const ped of this.simulation.getStreetPedestrians()) {
      activePedestrians.add(ped.id);
      let sprite = this.pedestrianSprites.get(ped.id);
      if (!sprite) {
        sprite = createPedestrianSprite(ped.variant);
        this.entitiesLayer.addChild(sprite);
        this.pedestrianSprites.set(ped.id, sprite);
      }
      placePedestrian(sprite, ped, this.animTimer);
    }
    for (const [id, sprite] of this.pedestrianSprites.entries()) {
      if (!activePedestrians.has(id)) {
        this.entitiesLayer.removeChild(sprite);
        sprite.destroy({ children: true });
        this.pedestrianSprites.delete(id);
      }
    }

    const time = this.simulation.getTime();
    const debugTime = getDebugVisualTime();
    const light = debugTime ? getLightingState(debugTime.hour, debugTime.minute, debugTime.day) : getLightingState(time.hour, time.minute, time.day);
    const playerPos = playerData.position;
    const isPlayerInWarehouse = isInWarehouse(playerPos) || (playerPos.y >= STORE_BOUNDS.top * TILE_SIZE && playerPos.y <= STORE_BOUNDS.top * TILE_SIZE + 6 && Math.abs(playerPos.x - WAREHOUSE_CENTER.x) < 36);
    const anyWorkerInWarehouse = Array.from(this.workerSprites.values()).some((w) => isInWarehouse(w.container.position));
    const warehouseActive = isPlayerInWarehouse || anyWorkerInWarehouse;
    this.lighting.syncFixtures(this.simulation.getFixtures().filter(fixture => !fixture.parentId));
    this.lighting.update(light, this.animTimer, reducedMotion, warehouseActive, elapsed);
    const feet: Array<{ x: number; y: number }> = [this.playerContainer.position];
    if (this.partnerContainer.visible) feet.push(this.partnerContainer.position);
    for (const c of this.customerSprites.values()) feet.push(c.container.position);
    for (const w of this.workerSprites.values()) feet.push(w.container.position);
    if (this.shopkeeper) feet.push(this.shopkeeper.container.position);
    this.lighting.updateActorShadows(feet, light);
    this.sunBeamGraphic.alpha = light.sun;
    this.app.renderer.background.color = light.sky;
    const rain = debugTime?.rain ?? this.simulation.getRainIntensity();
    this.roadSurface?.setWetness(debugTime?.rain !== undefined ? Math.min(1, rain * 1.5) : this.simulation.getRoadWetness());
    for (const entry of this.treeShadows) {
      const snapshot = { azimuth: light.sunAzimuth, elevation: light.sunElevation, sun: light.sun, rain };
      if (!treeShadowNeedsRedraw(entry.last, snapshot)) continue;
      entry.last = snapshot;
      const shape = computeTreeShadow(entry.prop, light, rain);
      const g = entry.graphic;
      g.clear();
      g.visible = shape.visible;
      if (!shape.visible) continue;
      const baseX = (entry.prop.tileX + TREE_SPRITE_OFFSET.tilesX) * TILE_SIZE + TREE_SHADOW_ORIGIN_PX.x;
      const baseY = (entry.prop.tileY + TREE_SPRITE_OFFSET.tilesY) * TILE_SIZE + TREE_SPRITE_OFFSET.pixelsY + TREE_SHADOW_ORIGIN_PX.y;
      g.position.set(baseX + shape.offsetX * TILE_SIZE, baseY + shape.offsetY * TILE_SIZE);
      g.rotation = shape.angle;
      g.ellipse(0, 0, shape.radiusAlong * TILE_SIZE, shape.radiusAcross * TILE_SIZE).fill({ color: 0x26190e, alpha: shape.alpha });
    }
    this.rainOverlay.clear();
    if (rain > 0.01) {
      const width = this.app.screen.width / this.camera.zoom;
      const height = this.app.screen.height / this.camera.zoom;
      const left = this.camera.x - width / 2;
      const top = this.camera.y - height / 2;
      this.rainOverlay.position.set(left, top);
      for (let i = 0; i < 44; i++) {
        const x = ((i * 67 + this.animTimer * (85 + rain * 130)) % (width + 24)) - 12;
        const y = ((i * 43 + this.animTimer * (155 + rain * 190)) % (height + 24)) - 12;
        this.rainOverlay.moveTo(x, y).lineTo(x - 5, y + 10 + rain * 5).stroke({ color: 0xb9d8e8, alpha: rain * 0.48, width: 1 });
      }
    }

    // 2b. Update Doors & Entrance Animation
    const storeDoorCenter = { x: 304, y: 336 };
    // Trigger from the whole doorway, not a circle around its center. The player
    // collider is wider than a single tile, so the edge can cross the threshold
    // while the player's center is still outside the old radius.
    const isPlayerAtStoreDoor = Math.abs(playerPos.x - storeDoorCenter.x) < 52 && Math.abs(playerPos.y - storeDoorCenter.y) < 48;
    const isCustomerNearDoor = customers.some(
      (c) => Math.hypot(c.position.x - storeDoorCenter.x, c.position.y - storeDoorCenter.y) < 52
    );
    const isStoreTriggered = isPlayerAtStoreDoor || isCustomerNearDoor;
    const targetStoreOpen = isStoreTriggered ? 1 : 0;
    const storeSpeed = isStoreTriggered ? 12 : 5;
    this.storeDoorOpenProgress += (targetStoreOpen - this.storeDoorOpenProgress) * Math.min(1, storeSpeed * elapsed);

    // Chime bell & sound note when someone opens the store door
    if (!this.wasStoreDoorOpen && isStoreTriggered) {
      this.wasStoreDoorOpen = true;
      this.storeBellTimer = 0;
      this.addFloatingGain(304, 308, '♪ Kính coong', 0x24584f);
    } else if (this.wasStoreDoorOpen && !isStoreTriggered && this.storeDoorOpenProgress < 0.08) {
      this.wasStoreDoorOpen = false;
    }

    const doorScaleX = Math.max(0.1, 1.0 - this.storeDoorOpenProgress * 0.9);
    this.storeDoorLeft.scale.x = doorScaleX;
    this.storeDoorRight.scale.x = doorScaleX;
    this.storeDoorLeft.skew.y = this.storeDoorOpenProgress * -0.12;
    this.storeDoorRight.skew.y = this.storeDoorOpenProgress * 0.12;

    this.storeBellTimer += elapsed;
    if (!reducedMotion && this.storeBellTimer < 1.6) {
      this.storeDoorBell.rotation = Math.sin(this.storeBellTimer * 22) * Math.exp(-this.storeBellTimer * 2.5) * 0.45;
    } else {
      this.storeDoorBell.rotation = 0;
    }

    // Warehouse sliding doors (center at x=288, y=112)
    const warehouseDoorCenter = { x: WAREHOUSE_DOOR_LEFT * TILE_SIZE + TILE_SIZE, y: STORE_BOUNDS.top * TILE_SIZE + TILE_SIZE / 2 };
    // Match the two-tile doorway footprint plus a small approach margin so both
    // edges open the door before the player's feet enter the threshold.
    const isWarehouseTriggered = Math.abs(playerPos.x - warehouseDoorCenter.x) < TILE_SIZE + 16 && Math.abs(playerPos.y - warehouseDoorCenter.y) < TILE_SIZE + 16;
    const targetWarehouseOpen = isWarehouseTriggered ? 1 : 0;
    const warehouseSpeed = isWarehouseTriggered ? 10 : 4;
    this.warehouseDoorOpenProgress += (targetWarehouseOpen - this.warehouseDoorOpenProgress) * Math.min(1, warehouseSpeed * elapsed);

    const slideOffset = this.warehouseDoorOpenProgress * 22;
    this.warehouseDoorLeft.x = -slideOffset;
    this.warehouseDoorRight.x = 32 + slideOffset;

    // 3. Update Fixture Badges & Dot Status Markers (Green = Full, Yellow = Low, Red = Out)
    const allFixtures = this.simulation.getFixtures();
    for (const fix of allFixtures) {
      if (fix.parentId) continue;
      const entry = this.fixtureSprites.get(fix.id);
      if (entry) {
        entry.container.visible = true;
        const dimensions = getFixtureDimensions(fix);
        entry.container.x = fix.tileX * TILE_SIZE + dimensions.widthTiles * TILE_SIZE / 2;
        entry.container.y = fix.tileY * TILE_SIZE + dimensions.heightTiles * TILE_SIZE / 2;
        entry.container.pivot.set(fix.widthTiles * TILE_SIZE / 2, fix.heightTiles * TILE_SIZE / 2);
        entry.container.rotation = fix.rotation * Math.PI / 180;
        entry.container.zIndex = (fix.tileY + dimensions.heightTiles) * TILE_SIZE; // mép dưới kệ = mốc sắp xếp theo Y
        // Nhân vật đứng sau kệ (phía trên, trong dải sprite cao) thì làm mờ kệ để vẫn nhìn thấy.
        const pp = this.simulation.getPlayerData().position;
        const fx = fix.tileX * TILE_SIZE, fy = fix.tileY * TILE_SIZE;
        const behind = pp.x > fx - 6 && pp.x < fx + dimensions.widthTiles * TILE_SIZE + 6
          && pp.y > fy - TILE_SIZE * 1.6 && pp.y <= fy + 4;
        const fadeTarget = behind && fix.type !== 'cashier_counter' ? 0.4 : 1;
        entry.container.alpha += (fadeTarget - entry.container.alpha) * 0.25;
        if(isWarehouseFixture(fix)) {
          const cold=fix.type==='warehouse_cold';
          const receiving=fix.type==='warehouse_receiving';
          const count=receiving?this.simulation.getPendingOrders().length:this.simulation.getInventory().reduce((n,i)=>n+((PRODUCT_MAP[i.productId]?.storageType==='cold')===cold?i.quantity:0),0);
          const state=count===0?'empty':count<=(cold?16:10)?'low':'full';
          const key=`${entry.textureKey}:none:${state}`;
          if(entry.lastState!==key){entry.sprite.texture=this.textures.getTexture(key);entry.lastState=key;entry.dotMarker.clear().rect(5,38,6,6).fill(state==='empty'?0xb64c3d:0x357f72);}
          entry.stockText.text=receiving?`${count} đơn`:cold?`${count}/40`:`${count} món`;
          entry.stockText.visible=true;entry.dotMarker.visible=true;
        } else if (fix.type !== 'cashier_counter') {
          const group = allFixtures.filter(item => item.id === fix.id || item.parentId === fix.id);
          const limit = group.reduce((sum, item) => sum + effectiveShelfCapacity(item.maxCapacity, (item.assignedProductId && PRODUCT_MAP[item.assignedProductId]?.shelfCapacity) || item.maxCapacity, this.simulation.getShelfCapacityBonus()), 0);
          const stock = group.reduce((sum, item) => sum + item.currentStock, 0);
          entry.stockText.text = fix.broken ? (fix.broken === 'major' ? 'NẶNG' : 'HỎNG') : `${stock}/${limit}`;
          const state = stock === 0 ? 'empty' : stock / limit <= 0.4 ? 'low' : 'full';
          const key = `${entry.textureKey}:${fix.assignedProductId ?? 'none'}:${state}`;
          const stateKey = `${key}|${fix.broken ?? ''}`;
          if(entry.lastState !== stateKey) {
            entry.sprite.texture = this.textures.getTexture(key);
            entry.lastState = stateKey;
            entry.sprite.tint = fix.broken ? (fix.broken === 'major' ? 0x7a6a6a : 0xb5a29c) : 0xffffff;
            entry.dotMarker.clear().rect(13, 38, 6, 6).fill({color: fix.broken ? 0x6f2a1e : state==='empty'?0xd9381e:state==='low'?0xf4a261:0x2a7a43});
          }
          entry.stockText.visible = true;
          entry.dotMarker.visible = true;
        } else {
          entry.stockText.visible = false;
          entry.dotMarker.visible = false;
        }
      }
    }
    const activeFixtureIds = new Set(this.simulation.getFixtures().map(fixture => fixture.id));
    for (const [id, entry] of this.fixtureSprites) entry.container.visible = activeFixtureIds.has(id);

    // 4. Update Y-sorting for realistic depth (so player can walk behind/in front of fixtures)
    this.entitiesLayer.children.sort((a, b) => a.zIndex - b.zIndex);

    // 5. Update Floating Texts (Juice)
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const item = this.floatingTexts[i];
      item.life -= elapsed;
      if (!reducedMotion) item.container.y -= elapsed * 24; // Float upwards
      item.container.alpha = Math.max(0, item.life / item.maxLife);
      if (item.life <= 0) {
        this.uiOverlayLayer.removeChild(item.container);
        item.container.destroy({ children: true });
        this.floatingTexts.splice(i, 1);
      }
    }

    // 6. Update Camera
    const inWarehouse=isInWarehouse(playerData.position);
    // A small room fits in the default view: keep its north/south edges visible.
    this.camera.follow(inWarehouse?{x:playerData.position.x,y:WAREHOUSE_CENTER.y}:playerData.position, dt, inWarehouse?0:undefined);
    const camOffset = this.camera.getRenderOffset();
    this.worldContainer.scale.set(this.camera.zoom);
    this.worldContainer.x = camOffset.x;
    this.worldContainer.y = camOffset.y;

    // 7. Update Interaction Bubble
    const activeFixture = this.simulation.getActiveFixture();
    if (activeFixture) {
      this.interactionBubble.visible = true;
      const activeSize = getFixtureDimensions(activeFixture);
      const fixCenterX = (activeFixture.tileX + activeSize.widthTiles / 2) * TILE_SIZE;
      const fixTopY = activeFixture.tileY * TILE_SIZE;

      // Floating bounce
      const bubbleFloat = reducedMotion ? 0 : Math.round(Math.sin(this.animTimer * 5) * 2);
      this.interactionBubble.x = fixCenterX;
      this.interactionBubble.y = (isWarehouseFixture(activeFixture)?fixTopY+100:fixTopY-44) + bubbleFloat;

      const textNode = this.interactionBubble.children[2] as Text;
      if(isWarehouseFixture(activeFixture)) {
        textNode.text='[E] Kiểm kê kho';
      } else if (activeFixture.type === 'cashier_counter') {
        textNode.text = '[E] Bàn Thu Ngân';
      } else {
        textNode.text = '[E] Xem Kệ Hàng';
      }
      // Nền bong bóng bám theo độ rộng chữ để không tràn hoặc thừa khoảng trống.
      const bubbleBg = this.interactionBubble.children[1] as Graphics;
      const bubbleWidth = Math.ceil(textNode.width) + 16;
      if (this.bubbleWidth !== bubbleWidth) {
        this.bubbleWidth = bubbleWidth;
        bubbleBg.clear();
        bubbleBg.rect(-bubbleWidth / 2, -36, bubbleWidth, 24);
        bubbleBg.fill({ color: 0xfcf4dc, alpha: 0.96 });
        bubbleBg.stroke({ color: 0x8b5a2b, width: 2 });
      }
    } else {
      this.interactionBubble.visible = false;
    }
  };

  /**
   * Spawns a floating gain label (e.g. "+24.000₫", "+12 XP") above a world coordinate
   */
  public addFloatingGain(x: number, y: number, text: string, color: number = 0xf4a261): void {
    const container = new Container();
    container.x = x;
    container.y = y;

    const style = new TextStyle({
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: 11,
      fontWeight: 'bold',
      fill: color,
    });
    const label = new Text({ text, style });
    label.anchor.set(0.5);
    container.addChild(label);

    this.uiOverlayLayer.addChild(container);
    this.floatingTexts.push({ container, life: 0.8, maxLife: 0.8 });
  };

  private createCustomerSprite(variant: number) {
    const container = new Container();
    const sprite = new Sprite(this.textures.getTexture(`npc_${variant}_down_idle_0`));
    sprite.anchor.set(0.5, 1);
    container.addChild(sprite);

    const bubble = new Container();
    const bubBg = new Graphics();
    bubBg.rect(-12, -66, 24, 24);
    bubBg.fill({ color: 0xffffff, alpha: 0.95 });
    bubBg.stroke({ color: 0x593a2b, width: 1 });
    bubble.addChild(bubBg);

    const bubbleIcon = new Sprite(this.textures.getTexture('product:mi_hao_hao'));
    bubbleIcon.anchor.set(0.5);
    bubbleIcon.y = -54;
    bubble.addChild(bubbleIcon);

    container.addChild(bubble);

    const regularTag = new Container();
    const regularTagBg = new Graphics();
    regularTag.addChild(regularTagBg);
    const regularTagStyle = new TextStyle({
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: 8,
      fontWeight: 'bold',
      fill: 0xffffff,
    });
    const regularTagText = new Text({ text: '', style: regularTagStyle });
    regularTagText.anchor.set(0.5);
    regularTagText.y = -72;
    regularTag.addChild(regularTagText);
    regularTag.visible = false;
    container.addChild(regularTag);

    this.entitiesLayer.addChild(container);

    return {
      container,
      sprite,
      bubble,
      bubbleIcon,
      regularTag: { container: regularTag, text: regularTagText, bg: regularTagBg },
      lastPosition: null as Vector2D | null,
      npcVariant: variant,
      npcDirection: 'down',
    };
  }

  /**
   * Public Camera Zoom controls
   */
  public zoomIn(delta: number = 1): number {
    return this.camera.zoomIn(delta);
  }

  public zoomOut(delta: number = 1): number {
    return this.camera.zoomOut(delta);
  }

  public getZoom(): number {
    return this.camera.zoom;
  }

  public locateWarehouse(): void {
    const p=this.simulation.getPlayerData().position;
    const inWarehouse=isInWarehouse(p);
    const targetY=this.camera.zoom===1&&this.app.screen.height>=450?128:WAREHOUSE_CENTER.y;
    this.camera.panOffsetX=WAREHOUSE_CENTER.x-p.x;
    this.camera.panOffsetY=targetY-(inWarehouse?WAREHOUSE_CENTER.y:p.y)+(inWarehouse?0:this.app.screen.height>=450?70:20);
    this.locatingWarehouse=true;this.warehouseLocator.visible=true;
  }

  public setZoom(zoom: number): void {
    this.camera.setZoom(zoom);
  }

  public destroy(): void {
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.handleResize);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    if (this.app) {
      this.app.destroy(true, { children: true, texture: false });
    }
    this.workerSprites.clear();
    this.parkedMotorbikeSprites.clear();
    this.streetTrafficSprites.clear();
    this.pedestrianSprites.clear();
    this.textures.destroy();
  }
}

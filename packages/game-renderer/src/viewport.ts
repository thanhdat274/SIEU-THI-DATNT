import { furnitureSpriteTexture, STOCK_ART_SHOP_IDS } from './fixture-preview';
import { Application, Container, Sprite, Graphics, Text, TextStyle } from 'pixi.js';
import { GameTileMap, StoreFixture, TILE_SIZE, Vector2D, isWarehouseFixture, getFixtureDimensions } from '@game/shared';
import { FixedStepSimulationRunner, GameSimulation, WeatherVisualModel, weekdayOf, hashSeed, type WeatherVisualState, needsService, getLightingState, computeTreeShadow, treeShadowNeedsRedraw, type TreeShadowSnapshot } from '@game/core';
import { PixelTextureFactory } from './textures';
import { PixelCamera } from './camera';
import { ShopLighting, streetLightStrength, type VehicleLightSource } from './shop-lighting';
import { AWNING_SPANS, DECOR_MAP, seasonalDecorForDay, MAP_WIDTH, PRODUCT_MAP, effectiveShelfCapacity, WAREHOUSE_ENTRANCE, WAREHOUSE_CENTER, WAREHOUSE_BOUNDS, WAREHOUSE_DOOR_LEFT, STORE_BOUNDS, isInWarehouse, isFenceTile, STREET_LAMP_TILES, TREE_PROPS, TREE_SPRITE_OFFSET, WEATHER_CONFIG, MAP_HEIGHT, NEIGHBORHOOD_QUALITY, TRUCK_KINDS, STREET_VEHICLE_RULES, type TreeProp, LOADING_DOCK_CONFIG , XOI_BOUNDS, DRINK_BOUNDS, BUILDING_MAP, type BuildingId} from '@game/data';

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
import { WeatherEffects, swaySkew } from './weather-effects';
import { RainGear, roofProximity, type GearFacing } from './rain-gear';
import { loadWeatherSprites } from './weather-sprites';
import { emitThunder, setRoofProximity, getWeatherFxSettings, publishWeatherVisual, resolveWeatherQuality } from './weather-settings';
import { NeighborhoodScene } from './neighborhood-scene';
import { NeighborhoodActors } from './neighborhood-actors';
import { buildIntersectionSignalHeads, createPedestrianSprite, placePedestrian } from './street-signal';

/** Điểm gốc bóng so với góc trên-trái sprite cây 80x100 (px): chân thân cây, để bóng đổ từ mặt đất chứ không từ tán. */
const TREE_SHADOW_ORIGIN_PX = { x: 40, y: 90 } as const;

/**
 * Bồn cây xây gạch bao quanh gốc, vừa khít ô gốc (32x32, đúng vùng va chạm của cây) để người chơi thấy rõ vì sao ô đó
 * không đi qua được. Chỉ hình ảnh; (x, y) là góc trên-trái ô, tính bằng px thế giới. Thân cây vẽ đè lên trên (zIndex cao hơn).
 */
function buildTreePlanter(x: number, y: number): Graphics {
  const g = new Graphics();
  g.eventMode = 'none';
  g.position.set(x, y);
  g.zIndex = y + 30;
  g.rect(1, 29, 31, 3).fill({ color: 0x000000, alpha: 0.2 });
  // Viền gạch sáng bao quanh (mặt trên của thành bồn) rồi đất lót bên trong
  g.rect(0, 0, 32, 30).fill(0x6a655b);
  g.rect(1, 1, 30, 28).fill(0xb4ad9d);
  g.rect(4, 4, 24, 21).fill(0x3a2616);
  g.rect(5, 5, 22, 19).fill(0x72502f);
  for (const [dx, dy] of [[6, 7], [11, 17], [21, 8], [22, 17], [8, 12], [19, 12]] as const) g.rect(dx, dy, 3, 2).fill(0x4b311c);
  for (const [dx, dy] of [[7, 19], [14, 8], [18, 19], [23, 11]] as const) g.rect(dx, dy, 2, 3).fill(0x5fa14a);
  // Mặt trước bồn: gạch xám có viền sáng ở mép trên và mạch vữa
  g.rect(0, 25, 32, 7).fill(0x8f897c);
  g.rect(0, 25, 32, 1).fill(0xd2ccbd);
  g.rect(0, 31, 32, 1).fill(0x57534b);
  for (const jx of [8, 16, 24]) g.rect(jx, 26, 1, 5).fill(0x6e6a60);
  return g;
}

/** Đáy thùng so với chân nhân viên: thấp hơn đầu/vai để không che mặt. */
const LOGISTICS_BOX_CARRY_Y = -12;

/** Mặt tiền các tòa phụ: biên, tên biển, màu mái hiên/biển, vị trí mái hiên (ô). */
const FACADES = {
  xoi: { bounds: XOI_BOUNDS, name: 'TIỆM XÔI', awning: 0xc0392b, board: 0x7a2f1d, trim: 0xe0b85a, text: 0xffe9b0, awningStart: AWNING_SPANS.xoi.x0 / TILE_SIZE, awningTiles: (AWNING_SPANS.xoi.x1 - AWNING_SPANS.xoi.x0) / TILE_SIZE },
  drink: { bounds: DRINK_BOUNDS, name: 'QUÁN NƯỚC', awning: 0x1f6f8b, board: 0x14506a, trim: 0x8fd3e8, text: 0xd9f4ff, awningStart: AWNING_SPANS.drink.x0 / TILE_SIZE, awningTiles: (AWNING_SPANS.drink.x1 - AWNING_SPANS.drink.x0) / TILE_SIZE },
} as const;

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
  private decorKey = '';
  private decorSprites: Text[] = [];
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
    regularTag: { container: Container; text: Text; bg: Graphics; drawn?: string };
    lastPosition: Vector2D | null;
    npcVariant: number;
    npcDirection: string;
  }>();
  private workerSprites = new Map<string, { container: Container; sprite: Sprite; bubble: Container; status: Text; lastPosition: Vector2D | null; variant: number; direction: string }>();
  private parkedMotorbikeSprites = new Map<string, Sprite>();
  private streetTrafficSprites = new Map<string, Sprite>();
  private neighborhood!: NeighborhoodScene;
  private actors!: NeighborhoodActors;
  private trafficBudgetQuality = '';
  /** Xe đang chạy trong khung hình hiện tại, để ShopLighting bật đèn pha/đèn hậu ban đêm. */
  private vehicleLightSources: VehicleLightSource[] = [];
  private resizeObserver?: ResizeObserver;
  private onZoomChange?: (zoom: number) => void;
  private ambientSprites: Array<{sprite: Sprite; key: string; frames: number}> = [];
  private stallSprites: Sprite[] = [];
  private vendorSprites: Container[] = [];
  private eastDecorSprites: Array<Sprite | Graphics | Text> = [];
  /** Quầng sáng bóng đèn của hai cột đèn trang trí phía đông: chỉ sáng khi trời tối như đèn đường. */
  private decorLampGlows: Graphics[] = [];
  private shopkeeper?: { container: Container; sprite: Sprite; bubble: Container };
  private motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  private fixtureSprites: Map<string, { container: Container; stockText: Text; dotMarker: Graphics; wearMarker: Graphics; sprite: Sprite; textureKey: string; lastState: string; staticArt?: boolean; dotX: number }> = new Map();
  private interactionBubble!: Container;
  private warehouseLocator!: Container;
  private locatingWarehouse = false;
  private floatingTexts: Array<{ container: Container; life: number; maxLife: number }> = [];
  private floatingTextPool: Array<{ container: Container; life: number; maxLife: number }> = [];

  // ===== LOGISTICS RENDERER STATE =====
  private logisticsTruckSprite: Sprite | null = null;
  private logisticsWorkerContainer: Container | null = null;
  private logisticsWorkerSprite: Sprite | null = null;
  private logisticsBoxSprite: Sprite | null = null;
  private logisticsToastContainer: Container | null = null;
  private logisticsToastText: Text | null = null;
  private logisticsToastLife = 0;
  private logisticsLastPhase = '';
  private logisticsLastStatus = '';
  private loadingDockZone: Graphics | null = null;
  private loadingDockPallet: Sprite | null = null;
  private loadingDockTrolley: Sprite | null = null;
  private loadingDockBoxesContainer: Container | null = null;

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
    this.weatherModel = new WeatherVisualModel(options.simulation.getWeatherSeed());
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
      backgroundColor: 0x5c7a52, // màu cỏ khu phố: lộ ra ngoài vùng vẽ cũng liền mạch (nền cỏ vô hạn trong NeighborhoodScene)
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      roundPixels: true,
      antialias: false,
    });

    this.camera.setViewportSize(this.app.screen.width, this.app.screen.height);
    void loadWeatherSprites(); // sprite ô/áo mưa: nạp nền, chưa xong thì chưa vẽ đồ che

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
    // Khu phố mở rộng nằm dưới bản đồ chơi: trời/đồi, nền (cỏ, đường), rồi công trình/cây xa; bản đồ chơi vẽ đè lên.
    this.neighborhood = new NeighborhoodScene(this.textures);
    this.neighborhood.build(resolveWeatherQuality(getWeatherFxSettings()));
    this.worldContainer.addChild(this.neighborhood.backdrop);
    this.worldContainer.addChild(this.neighborhood.ground);
    this.worldContainer.addChild(this.groundLayer);
    this.worldContainer.addChild(this.shadowLayer);
    this.worldContainer.addChild(this.weatherFx.groundLayer);
    this.worldContainer.addChild(this.neighborhood.props);
    this.worldContainer.addChild(this.wallLayer);
    this.worldContainer.addChild(this.entitiesLayer);
    // Nước chảy từ mái hiên nằm trước mặt tiền (entitiesLayer không tự sắp theo zIndex nên đặt lớp riêng ngay sau nó).
    this.worldContainer.addChild(this.weatherFx.roofLayer);
    this.worldContainer.addChild(this.weatherFx.darknessLayer);
    this.worldContainer.addChild(this.tintLayer);
    this.worldContainer.addChild(this.lightLayer);
    this.worldContainer.addChild(this.neighborhood.glow);
    this.worldContainer.addChild(this.neighborhood.labels);
    this.worldContainer.addChild(this.uiOverlayLayer);
    this.actors = new NeighborhoodActors(this.textures, this.entitiesLayer, this.uiOverlayLayer, hashSeed(String(this.simulation.getWeatherSeed())));
    this.lighting = new ShopLighting(this.tintLayer, this.lightLayer, this.shadowLayer);

    this.app.stage.addChild(this.worldContainer);

    // Build Tile Layers
    this.buildMapLayers();
    this.lighting.rebuildMap(this.tileMap);
    this.worldContainer.addChild(this.weatherFx.topLayer);
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
    this.updateResponsiveSettings();
    this.camera.setViewportSize(this.app.screen.width, this.app.screen.height);
    this.onZoomChange?.(this.camera.zoom);
  };

  /**
   * Responsive Settings: Optimize resolution and default zoom for mobile devices.
   */
  private updateResponsiveSettings(): void {
    const isMobile = window.innerWidth < 768;
    // Reduce resolution on mobile to prevent overheating and frame drops
    const targetRes = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    if (this.app.renderer && this.app.renderer.resolution !== targetRes) {
      this.app.renderer.resize(this.app.screen.width, this.app.screen.height, targetRes);
    }
  }

  /**
   * Mặt tiền tiệm xôi (tòa thứ hai ở dải đất phía tây): biển hiệu, mái hiên sọc, khung cửa; chưa mua thì cửa cuốn đóng
   * và biển "CHO THUÊ". Vẽ vào groundLayer/wallLayer nên được dựng lại mỗi lần bản đồ đổi (mua tiệm).
   */
  private buildXoiFacade(): void { this.buildBuildingFacade('xoi'); }

  /** Mặt tiền tòa phụ (tiệm xôi, quán nước); dữ liệu màu/biển theo `FACADES`. */
  private buildBuildingFacade(id: Exclude<BuildingId, 'main'>): void {
    const facade = FACADES[id];
    const xoi = BUILDING_MAP[id];
    const open = this.tileMap.buildings?.find(building => building.id === id)?.open ?? false;
    const bounds = { ...facade.bounds, top: this.tileMap.buildings?.find(building => building.id === id)?.top ?? facade.bounds.top };
    const frontY = bounds.bottom * TILE_SIZE;
    const doorX = xoi.doorTiles[0].x * TILE_SIZE;
    const doorW = xoi.doorTiles.length * TILE_SIZE;

    // Bóng đổ trong sàn như tiệm chính.
    const shadows = new Graphics();
    shadows.rect((bounds.left + 1) * TILE_SIZE, (bounds.top + 1) * TILE_SIZE, (bounds.right - bounds.left - 1) * TILE_SIZE, 5).fill({ color: 0x26190e, alpha: 0.22 });
    shadows.rect((bounds.left + 1) * TILE_SIZE, (bounds.top + 1) * TILE_SIZE, 5, (bounds.bottom - bounds.top - 1) * TILE_SIZE).fill({ color: 0x26190e, alpha: 0.18 });
    this.groundLayer.addChild(shadows);

    // Ngưỡng cửa và khung cửa gỗ.
    const frame = new Graphics();
    frame.rect(doorX, frontY, 2, TILE_SIZE).fill(0x936044);
    frame.rect(doorX + doorW - 2, frontY, 2, TILE_SIZE).fill(0xc69464);
    frame.rect(doorX, frontY + TILE_SIZE - 2, doorW, 2).fill(0xbfa993);
    this.groundLayer.addChild(frame);

    if (open) {
      // Mái hiên sọc đỏ trắng phía trên cửa.
      const awning = new Graphics();
      // Mái hiên và biển chỉ rộng `awningTiles` ô để không che tán cây hay tòa bên cạnh.
      const awningX = facade.awningStart * TILE_SIZE;
      const stripes = 7;
      const stripeW = (facade.awningTiles * TILE_SIZE) / stripes;
      for (let i = 0; i < stripes; i++) awning.rect(awningX + i * stripeW, frontY - 6, stripeW, 9).fill(i % 2 === 0 ? facade.awning : 0xf5ecd8);
      awning.rect(awningX, frontY + 3, stripes * stripeW, 2).fill({ color: 0x26190e, alpha: 0.35 });
      awning.zIndex = 360;
      this.wallLayer.addChild(awning);
    } else {
      // Cửa cuốn đóng: tấm sắt có rãnh ngang và ổ khóa.
      const shutter = new Graphics();
      shutter.rect(doorX, frontY, doorW, TILE_SIZE).fill(0x8f989f);
      for (let y = 4; y < TILE_SIZE; y += 5) shutter.rect(doorX, frontY + y, doorW, 1).fill({ color: 0x4d555b, alpha: 0.7 });
      shutter.rect(doorX + doorW / 2 - 2, frontY + TILE_SIZE - 7, 4, 4).fill(0x2f3438);
      this.wallLayer.addChild(shutter);
    }

    // Biển hiệu trên cửa.
    const boardW = facade.awningTiles * TILE_SIZE;
    const board = new Graphics();
    board.roundRect(0, 0, boardW, 14, 2).fill(open ? facade.board : 0x6b6f73).stroke({ color: open ? facade.trim : 0x9aa0a4, width: 1 });
    board.position.set(facade.awningStart * TILE_SIZE, frontY - 22);
    board.zIndex = 361;
    this.wallLayer.addChild(board);
    const label = new Text({ text: open ? facade.name : 'CHO THUÊ', style: new TextStyle({ fontFamily: 'Arial', fontSize: 10, fontWeight: 'bold', fill: open ? facade.text : 0xe5e8ea }) });
    label.anchor.set(0.5);
    label.position.set(board.x + boardW / 2, board.y + 7.5);
    label.zIndex = 362;
    this.wallLayer.addChild(label);
  }

  /**
   * Trang trí phía đông bản đồ (khu vực quán nước): cột đèn, biển "QUÁN NƯỚC", đèn lồng, bảng menu.
   * Vẽ vào entitiesLayer để cùng hệ thống với sprite cây/bóng.
   */
  private buildEastDecorations(): void {
    const drinkOpen = this.tileMap.buildings?.find(b => b.id === 'drink')?.open ?? false;
    if (!drinkOpen) return; // Chưa mở quán nước thì không hiển thị decor

    // 1. Biển hiệu "QUÁN NƯỚC" (đặt trên hiên, phía đông tiệm chính)
    const signBoard = new Graphics();
    signBoard.roundRect(0, 0, 128, 20, 3).fill(0x14506a).stroke({ color: 0x8fd3e8, width: 2 });
    signBoard.position.set(DRINK_BOUNDS.left * TILE_SIZE, (DRINK_BOUNDS.bottom + 1) * TILE_SIZE - 38);
    signBoard.zIndex = 361;
    this.wallLayer.addChild(signBoard);
    const signText = new Text({
      text: 'QUÁN NƯỚC',
      style: new TextStyle({ fontFamily: 'Arial', fontSize: 12, fontWeight: 'bold', fill: 0xd9f4ff })
    });
    signText.anchor.set(0.5);
    signText.position.set(signBoard.x + 64, signBoard.y + 10);
    signText.zIndex = 362;
    this.wallLayer.addChild(signText);

    // 2. Cột đèn đường phía đông (2 cột: x=19 và x=33)
    for (const lampX of [19, 33]) {
      const pole = new Sprite(this.textures.getTexture('deco_lamp_pole'));
      pole.anchor.set(0, 1);
      pole.x = lampX * TILE_SIZE;
      pole.y = (11 + 1) * TILE_SIZE;
      pole.zIndex = pole.y + 10;
      this.groundLayer.addChild(pole);

      // Bóng đèn phát sáng (vẽ Graphics)
      const lampLight = new Graphics();
      lampLight.circle(16, 4, 6).fill({ color: 0xfff3c4, alpha: 0.6 });
      lampLight.position.set(lampX * TILE_SIZE + 16, 11 * TILE_SIZE - 12);
      lampLight.zIndex = lampLight.y;
      this.entitiesLayer.addChild(lampLight);
      this.eastDecorSprites.push(lampLight);
      this.decorLampGlows.push(lampLight);
    }

    // 3. Đèn lồng đỏ trước quán nước (x=30)
    if (drinkOpen) {
      for (let i = 0; i < 3; i++) {
        const lantern = new Sprite(this.textures.getTexture('deco_lantern'));
        lantern.position.set((28 + i * 2) * TILE_SIZE, (DRINK_BOUNDS.bottom + 1) * TILE_SIZE - 20 - i * 3);
        lantern.zIndex = lantern.y - 50;
        this.entitiesLayer.addChild(lantern);
        this.eastDecorSprites.push(lantern);
      }
    }

    // 4. Chậu cây cảnh (x=27 và x=35)
    for (const potX of [27, 35]) {
      const pot = new Sprite(this.textures.getTexture('tile_plant_pot'));
      pot.position.set(potX * TILE_SIZE + 8, 11 * TILE_SIZE);
      pot.zIndex = pot.y + 50;
      this.entitiesLayer.addChild(pot);
      this.eastDecorSprites.push(pot);
    }

    // 5. Biển menu bảng gỗ (x=28)
    const menuBoard = new Graphics();
    menuBoard.roundRect(0, 0, 64, 40, 2).fill(0x8b5a2b).stroke({ color: 0x5c3a1a, width: 1 });
    menuBoard.position.set(28 * TILE_SIZE, (DRINK_BOUNDS.bottom + 1) * TILE_SIZE - 52);
    menuBoard.zIndex = 363;
    this.wallLayer.addChild(menuBoard);
    const menuText = new Text({
      text: 'MENU',
      style: new TextStyle({ fontFamily: 'Arial', fontSize: 8, fontWeight: 'bold', fill: 0xd9f4ff })
    });
    menuText.anchor.set(0.5);
    menuText.position.set(menuBoard.x + 32, menuBoard.y + 20);
    menuText.zIndex = 364;
    this.wallLayer.addChild(menuText);
  }

  private buildMapLayers(): void {
    const storeBounds = this.tileMap.storeBounds ?? STORE_BOUNDS;
    const width = this.tileMap.width;
    const height = this.tileMap.height;
    const originY=this.tileMap.originTileY??0;

    // Mặt đất ngoài bản đồ chơi do NeighborhoodScene dựng (cỏ, đường, vỉa hè, nhà, công viên...), không còn vành đai ô cỏ riêng.

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

    // Bãi bốc dỡ & tiếp nhận hàng hóa phía Đông (Dedicated Loading Dock - Phương án 1)
    this.buildLoadingDock();

    if (wallLayerData) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const tileId = wallLayerData[y * width + x];
          if (tileId === 4 || tileId === 10) {
            const worldY = y + originY;
            let textureKey = tileId === 10 ? 'warehouse_wall' : 'tile_yellow_wall';

            // 2.5D Stardew Valley slim walls:
            const drinkTop = this.tileMap.buildings?.find(building => building.id === 'drink')?.top ?? DRINK_BOUNDS.top;
            const xoiTop = this.tileMap.buildings?.find(building => building.id === 'xoi')?.top ?? XOI_BOUNDS.top;
            if (x >= DRINK_BOUNDS.left && worldY >= drinkTop && worldY <= DRINK_BOUNDS.bottom) {
              // Quán nước (dải phía đông): đủ bốn tường riêng, kiểu tường tiệm; tường sau là vách ngăn.
              if (worldY === drinkTop) textureKey = 'wall_partition_right';
              else if (worldY === DRINK_BOUNDS.bottom) textureKey = x === DRINK_BOUNDS.left ? 'wall_store_corner_bl' : x === DRINK_BOUNDS.right ? 'wall_store_corner_br' : 'wall_store_front';
              else textureKey = x === DRINK_BOUNDS.left ? 'wall_store_left' : 'wall_store_right';
            } else if (x < STORE_BOUNDS.left && worldY >= xoiTop && worldY <= XOI_BOUNDS.bottom) {
              // Tiệm xôi (dải phía tây): tường sau là vách ngăn, tường trái và mặt tiền dùng kiểu tường tiệm.
              if (worldY === xoiTop) textureKey = 'wall_partition_left';
              else if (worldY === XOI_BOUNDS.bottom) textureKey = x === XOI_BOUNDS.left ? 'wall_store_corner_bl' : 'wall_store_front';
              else textureKey = 'wall_store_left';
            } else if (worldY < STORE_BOUNDS.top) {
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
    // Bản đồ dựng lại (mua tòa, quầy...) hủy biển cũ: bỏ chúng khỏi danh sách để không ghi vào sprite đã hủy mỗi khung hình.
    this.swaySigns = this.swaySigns.filter((sign) => !sign.destroyed);
    this.swaySigns.push(shopSign);

    // Warehouse sign located on the arch/transom right above the warehouse door
    const warehouseSign = new Sprite(this.textures.getTexture('warehouse_sign'));
    warehouseSign.position.set(WAREHOUSE_DOOR_LEFT * TILE_SIZE, STORE_BOUNDS.top * TILE_SIZE - 20);
    this.wallLayer.addChild(warehouseSign);

    // === BIỂN HIỆU MỚI: Đặt trên các tòa nhà thực tế ===
    // Tiệm xôi (xoi building)
    const xoiSign = new Sprite(this.textures.getTexture('sign_xoi'));
    xoiSign.position.set(XOI_BOUNDS.left * TILE_SIZE, (XOI_BOUNDS.top - 1) * TILE_SIZE);
    xoiSign.zIndex = XOI_BOUNDS.top * TILE_SIZE;
    this.wallLayer.addChild(xoiSign);
    this.swaySigns.push(xoiSign);

    // Quán nước (drink building)
    const drinkSign = new Sprite(this.textures.getTexture('sign_drink'));
    drinkSign.position.set(DRINK_BOUNDS.left * TILE_SIZE, (DRINK_BOUNDS.top - 1) * TILE_SIZE);
    drinkSign.zIndex = DRINK_BOUNDS.top * TILE_SIZE;
    this.wallLayer.addChild(drinkSign);
    this.swaySigns.push(drinkSign);

    this.buildXoiFacade();
    this.buildBuildingFacade('drink');

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
    crates.position.set(6 * TILE_SIZE, 11 * TILE_SIZE + 4); // ô 5 là bồn cây nên thùng hàng dời sang ô 6
    crates.zIndex = crates.y + 32;
    this.entitiesLayer.addChild(crates);

    // Cozy Alley Shade Tree on sidewalk
    this.intersectionSignalHeads = buildIntersectionSignalHeads(this.entitiesLayer);
    this.treeSprites = this.treeSprites.filter(({ sprite }) => !sprite.destroyed); // bỏ cây đã bị hủy khi dựng lại bản đồ
    for (const prop of TREE_PROPS) {
      const tree = new Sprite(this.textures.getTexture('tile_tree'));
      tree.position.set((prop.tileX + TREE_SPRITE_OFFSET.tilesX) * TILE_SIZE + TREE_SPRITE_OFFSET.pixelsX, (prop.tileY + TREE_SPRITE_OFFSET.tilesY) * TILE_SIZE + TREE_SPRITE_OFFSET.pixelsY);
      tree.zIndex = tree.y + 100;
      this.entitiesLayer.addChild(buildTreePlanter(prop.tileX * TILE_SIZE, prop.tileY * TILE_SIZE));
      this.entitiesLayer.addChild(tree);
      this.treeSprites.push({ sprite: tree, baseX: tree.position.x });
      const shadow = new Graphics();
      shadow.eventMode = 'none';
      this.shadowLayer.addChild(shadow);
      this.treeShadows.push({ prop, graphic: shadow, last: null });
    }

    // Build east side decorations (street lamps, signs, plants, etc.)
    this.buildEastDecorations();

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
    for (const v of this.vendorSprites) v.destroy({ children: true });
    this.vendorSprites = [];
    this.vendorGears = [];
    for (const stall of this.tileMap.stalls ?? []) {
      const sprite = new Sprite(this.textures.getTexture(`stall_${stall.id}`));
      sprite.position.set(stall.tileX * TILE_SIZE, (stall.tileY + 1) * TILE_SIZE - 48);
      sprite.zIndex = (stall.tileY + 1) * TILE_SIZE + 2;
      this.entitiesLayer.addChild(sprite);
      this.stallSprites.push(sprite);

      // Người bán quầy phụ đứng sau quầy
      const vendorSprite = new Sprite(this.textures.getTexture('npc_1_down_idle_0'));
      vendorSprite.anchor.set(0.5, 1);
      const gear = new RainGear();
      const vendor = new Container();
      vendor.addChild(vendorSprite, gear.container);
      vendor.position.set((stall.tileX + 1) * TILE_SIZE, (stall.tileY + 0.6) * TILE_SIZE);
      vendor.zIndex = stall.tileY * TILE_SIZE;
      this.entitiesLayer.addChild(vendor);
      this.vendorSprites.push(vendor);
      this.vendorGears.push({ id: `vendor-${stall.id}`, gear, container: vendor });
    }
  }

  private buildFixtures(): void {
    for (const fix of this.simulation.getFixtures()) this.addFixtureSprite(fix);
  }

  /** Đồ trang trí tường/biển đã mua: biểu tượng treo dọc tường sau của tiệm, dựng lại khi danh sách đổi. */
  private syncDecor(): void {
    const owned = this.simulation.getDecorOwned();
    const seasonal = seasonalDecorForDay(this.simulation.getTime().day);
    const key = `${owned.join(',')}|${seasonal.map(item => item.id).join(',')}`;
    if (key === this.decorKey) return;
    this.decorKey = key;
    for (const old of this.decorSprites) old.destroy();
    this.decorSprites = [];
    const slots = [[7.5, 3.7], [8.5, 3.7], [11.5, 3.7], [12.5, 3.7]];
    owned.slice(0, slots.length).forEach((id, index) => {
      const item = DECOR_MAP[id];
      if (!item) return;
      const text = new Text({ text: item.icon, style: new TextStyle({ fontSize: 20 }) });
      text.anchor.set(0.5);
      text.x = slots[index][0] * TILE_SIZE;
      text.y = slots[index][1] * TILE_SIZE;
      text.zIndex = STORE_BOUNDS.top * TILE_SIZE + 20;
      this.entitiesLayer.addChild(text);
      this.decorSprites.push(text);
    });
    // Trang trí theo sự kiện đang diễn ra: xen giữa các món đã mua, tự gỡ khi hết mùa.
    const seasonalSlots = [[9.5, 3.7], [10.5, 3.7]];
    seasonal.slice(0, seasonalSlots.length).forEach((item, index) => {
      const text = new Text({ text: item.icon, style: new TextStyle({ fontSize: 20 }) });
      text.anchor.set(0.5);
      text.x = seasonalSlots[index][0] * TILE_SIZE;
      text.y = seasonalSlots[index][1] * TILE_SIZE;
      text.zIndex = STORE_BOUNDS.top * TILE_SIZE + 20;
      this.entitiesLayer.addChild(text);
      this.decorSprites.push(text);
    });
  }

  /** Thêm sprite cho nội thất mới mua / lấy lại, và bỏ sprite của nội thất đã cất (trước đây chỉ dựng một lần lúc vào game). */
  private syncFixtureSprites(): void {
    const fixtures = this.simulation.getFixtures().filter(fix => !fix.parentId);
    const ids = new Set(fixtures.map(fix => fix.id));
    for (const [id, entry] of this.fixtureSprites) {
      if (ids.has(id)) continue;
      entry.container.destroy({ children: true });
      this.fixtureSprites.delete(id);
    }
    for (const fix of fixtures) if (!this.fixtureSprites.has(fix.id)) this.addFixtureSprite(fix);
  }

  private addFixtureSprite(fix: StoreFixture): void {
    {
      if (fix.parentId) return;
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
        textureKey = fix.widthTiles >= 2 ? 'fixture_refrigerator' : 'fixture_refrigerator_single';
      } else if(isWarehouseFixture(fix)) {
        textureKey = `fixture_${fix.type}`;
      }

      // Nội thất mua thêm không có bản vẽ theo lượng hàng: dùng sprite danh mục (tỉ lệ nguyên theo bề rộng ô).
      const art = fix.shopId && !STOCK_ART_SHOP_IDS.has(fix.shopId) ? furnitureSpriteTexture(fix.shopId) : null;
      const sprite = new Sprite(art ?? this.textures.getTexture(textureKey));
      if (art) {
        const scale = Math.max(1, Math.round(fix.widthTiles * TILE_SIZE / art.width));
        sprite.scale.set(scale);
        sprite.y = fix.heightTiles * TILE_SIZE - art.height * scale;
      } else sprite.y = -16;
      container.zIndex = (fix.tileY + dimensions.heightTiles) * TILE_SIZE;
      container.addChild(sprite);

      // Pill stock badge under shelf (Matching user reference image & Redhexx!)
      const isWarehouse = isWarehouseFixture(fix);
      const is1Tile = fix.widthTiles === 1 && !isWarehouse;
      const badgeW = isWarehouse ? 60 : is1Tile ? 38 : 44;
      const badgeX = isWarehouse ? 2 : Math.round((fix.widthTiles * TILE_SIZE - badgeW) / 2);
      const dotX = badgeX + 3;
      const textX = badgeX + 12;

      const badgeBg = new Graphics();
      badgeBg.rect(badgeX, 34, badgeW, 13);
      badgeBg.fill({ color: 0xeadcc9, alpha: 0.96 });
      badgeBg.stroke({ color: 0xbfa993, width: 1 });
      badgeBg.visible = fix.type !== 'cashier_counter' && fix.type !== 'decor' && fix.type !== 'dining_table' && fix.type !== 'kitchen_station';
      container.addChild(badgeBg);

      // Dot marker (Green = Full, Yellow = Low stock, Red = Out of stock)
      const dotMarker = new Graphics();
      dotMarker.rect(dotX, 38, 6, 6);
      dotMarker.fill({ color: 0x2a7a43 });
      container.addChild(dotMarker);

      // Vạch hổ phách ngay cạnh huy hiệu: đồ đã mòn, nên bảo trì trước khi hỏng
      const wearMarker = new Graphics();
      wearMarker.rect(badgeX + badgeW + 2, 34, 7, 13).fill({ color: 0xd98a1c }).stroke({ color: 0x6b3d0a, width: 1 });
      wearMarker.visible = false;
      container.addChild(wearMarker);

      const style = new TextStyle({
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: 9,
        fontWeight: 'bold',
        fill: 0x43382f,
      });

      const stockText = new Text({ text: '', style });
      stockText.anchor.set(0, 0.5);
      stockText.x = textX;
      stockText.y = 40.5;
      container.addChild(stockText);

      this.entitiesLayer.addChild(container);
      this.fixtureSprites.set(fix.id, { container, stockText, dotMarker, wearMarker, sprite, textureKey, lastState: '', staticArt: !!art, dotX });
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

    this.playerContainer.addChild(this.playerGear.container);
    this.entitiesLayer.addChild(this.playerContainer);

    // Home entrance doormat at HOME_DOOR_TILE (3, 12)
    const homeMat = new Graphics();
    homeMat.rect(3 * 32 + 2, 12 * 32 + 18, 28, 12).fill({ color: 0x824d28 }).stroke({ color: 0x3d1f0f, width: 1 });
    homeMat.rect(3 * 32 + 5, 12 * 32 + 21, 22, 6).fill({ color: 0xd9a76a });
    this.groundLayer.addChild(homeMat);
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
    this.partnerContainer.addChild(this.partnerSprite, this.partnerGear.container);

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
  private intersectionSignalHeads: ReturnType<typeof buildIntersectionSignalHeads> | null = null;
  private pedestrianSprites = new Map<string, Container>();
  private treeShadows: Array<{ prop: TreeProp; graphic: Graphics; last: TreeShadowSnapshot | null }> = [];
  private weatherFx = new WeatherEffects();
  private weatherModel!: WeatherVisualModel;
  private lastWeather: WeatherVisualState | null = null;
  private playerGear = new RainGear();
  private customerGear = new Map<string, RainGear>();
  private pedestrianGear = new Map<string, RainGear>();
  private workerGear = new Map<string, RainGear>();
  private partnerGear = new RainGear();
  private vendorGears: Array<{ id: string; gear: RainGear; container: Container }> = [];
  private treeSprites: Array<{ sprite: Sprite; baseX: number }> = [];
  private swaySigns: Sprite[] = [];

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
    // Có hộp thoại phủ màn hình (PixelDialog đặt data-dialogs): hạ trần khung hình để giao diện cuộn mượt hơn.
    const targetMaxFps = document.documentElement.dataset.dialogs ? 20 : 0;
    if (this.app.ticker.maxFPS !== targetMaxFps) this.app.ticker.maxFPS = targetMaxFps;
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

    if (this.simulation.isDailyRoutineEnabled()) {
      const routineState = this.simulation.getDailyRoutineState();
      const clockTime = this.simulation.getTime();
      const currentMin = clockTime.hour * 60 + clockTime.minute;
      if (routineState === 'SLEEPING') {
        this.playerSprite.rotation = Math.PI / 2;
        this.playerSprite.x = 10;
      } else if (routineState === 'AT_HOME' && currentMin < 7 * 60 + 5) {
        const wakeT = Math.min(1, Math.max(0, (currentMin - 420) / 4));
        if (wakeT < 0.5) {
          this.playerSprite.rotation = (Math.PI / 2) * (1 - wakeT * 2);
          this.playerSprite.x = 10 * (1 - wakeT * 2);
        } else {
          this.playerSprite.rotation = 0;
          this.playerSprite.x = 0;
        }
      } else {
        this.playerSprite.rotation = 0;
        this.playerSprite.x = 0;
      }
    } else {
      this.playerSprite.rotation = 0;
      this.playerSprite.x = 0;
    }

    // Vẽ nội suy giữa hai bước mô phỏng, rồi chốt về lưới điểm ảnh màn hình (1/zoom) để khớp camera; không còn nhảy 0/1/2 bước mỗi khung.
    const renderPos = this.simulation.getPlayerRenderPosition(this.simulationRunner.getAlpha());
    const zoomNow = this.camera.zoom || 1;
    this.playerContainer.position.set(Math.round(renderPos.x * zoomNow) / zoomNow, Math.round(renderPos.y * zoomNow) / zoomNow);
    this.playerContainer.zIndex = renderPos.y;
    setRoofProximity(roofProximity(playerData.position.x, playerData.position.y));
    const gearDay = getDebugVisualTime()?.day ?? this.simulation.getTime().day;
    const fxSettingsEnabled = getWeatherFxSettings().enabled;
    const gearOn = true; // đồ che mưa là hành vi của nhân vật, không phụ thuộc nút bật/tắt hiệu ứng
    this.playerGear.update({ dt: elapsed, time: this.animTimer, characterId: 'player', day: gearDay, x: playerData.position.x, y: playerData.position.y, facing: (playerData.direction === 'left' || playerData.direction === 'right' || playerData.direction === 'up') ? playerData.direction : 'down', walking: isMoving, weather: this.lastWeather, enabled: gearOn, reducedMotion, windEffects: fxSettingsEnabled });

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
      const partnerDir = partner.direction === 'left' || partner.direction === 'right' || partner.direction === 'up' ? partner.direction : 'down';
      this.partnerGear.update({ dt: elapsed, time: this.animTimer, characterId: 'partner', day: gearDay, x: shown.x, y: shown.y, facing: partnerDir, walking: partnerMoving, weather: this.lastWeather, enabled: gearOn, reducedMotion, windEffects: fxSettingsEnabled });
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
      this.shopkeeper.container.visible = keeper.visible;
      this.shopkeeper.bubble.visible = keeper.serving;
    }

    const customers = this.simulation.peekCustomers(); // không sao chép sâu mỗi khung; vòng vẽ chỉ đọc
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

      // ✅ Frustum Culling: Skip off-screen customers to save CPU/GPU
      if (!this.isOnScreen(cust.position.x, cust.position.y)) {
        entry.container.visible = false;
        continue;
      }
      entry.container.visible = true;

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
      const gearKey = key;
      let gear = this.customerGear.get(gearKey);
      if (!gear) { gear = new RainGear(); this.customerGear.set(gearKey, gear); entry.container.addChild(gear.container); }
      gear.update({ dt: elapsed, time: this.animTimer, characterId: gearKey, day: gearDay, x: cust.position.x, y: cust.position.y, facing: entry.npcDirection as GearFacing, walking, weather: this.lastWeather, enabled: gearOn, reducedMotion, windEffects: fxSettingsEnabled });

      const target = this.simulation.getFixtures().find((f) => f.id === cust.targetFixtureId);
      const iconKey = cust.stage === 'to_shelf'
        ? `product:${target?.assignedProductId ?? 'none'}`
        : cust.stage === 'leaving'
        ? 'pixel_coin'
        : (cust.basket?.[0]?.productId ? `product:${cust.basket[0].productId}` : 'pixel_coin');
      entry.bubbleIcon.texture = this.textures.getTexture(iconKey);

      if (cust.regularName) {
        entry.regularTag.container.visible = true;
        const tagLabel = `♥ ${cust.regularName}`;
        if (entry.regularTag.drawn !== tagLabel) { // chỉ đo chữ và vẽ nền khi tên đổi, không mỗi khung
          entry.regularTag.drawn = tagLabel;
          entry.regularTag.text.text = tagLabel;
          const tagWidth = Math.max(32, Math.ceil(entry.regularTag.text.width) + 8);
          entry.regularTag.bg.clear();
          entry.regularTag.bg.rect(-tagWidth / 2, -78, tagWidth, 12);
          entry.regularTag.bg.fill({ color: 0x8b5cf6, alpha: 0.95 });
          entry.regularTag.bg.stroke({ color: 0xffffff, width: 1 });
        }
      } else {
        entry.regularTag.container.visible = false;
      }

      // Mờ dần ở hai mép bản đồ: khách đi bộ đến từ mép và rời đi về mép, không hiện/biến mất đột ngột.
      const distFromEdge = Math.min(cust.position.x, MAP_WIDTH * TILE_SIZE - cust.position.x);
      entry.container.alpha = distFromEdge < 48 ? Math.max(0, Math.min(1, distFromEdge / 48)) : 1;
      entry.lastPosition = { ...cust.position };
    }

    // Clean up departed customer sprites
    for (const [key, entry] of this.customerSprites.entries()) {
      if (!activeCustomerKeys.has(key)) {
        this.entitiesLayer.removeChild(entry.container);
        entry.container.destroy({ children: true });
        this.customerSprites.delete(key);
        this.customerGear.delete(key);
      }
    }

    const workers = this.simulation.peekStaff().slice(0, 4); // không sao chép từng nhân viên mỗi khung; chỉ đọc
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

      // ✅ Frustum Culling: Skip off-screen workers
      if (!this.isOnScreen(position.x, position.y)) {
        entry.container.visible = false;
        return;
      }
      entry.container.visible = true;

      const previous = entry.lastPosition;
      const dx = previous ? position.x - previous.x : 0;
      const dy = previous ? position.y - previous.y : 0;
      const walking = Math.abs(dx) + Math.abs(dy) > 0.01;
      if (walking) entry.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      const frame = reducedMotion ? 0 : Math.floor(this.animTimer * (walking ? 8 : 1.5)) % (walking ? 4 : 2);
      entry.sprite.texture = this.textures.getTexture(`npc_${entry.variant}_${entry.direction}_${walking ? 'walk' : 'idle'}_${frame}`);
      entry.container.position.set(Math.round(position.x), Math.round(position.y));
      entry.container.zIndex = position.y + 1;
      let wGear = this.workerGear.get(worker.id);
      if (!wGear) { wGear = new RainGear(); this.workerGear.set(worker.id, wGear); entry.container.addChildAt(wGear.container, 1); }
      wGear.update({ dt: elapsed, time: this.animTimer, characterId: worker.id, day: gearDay, x: position.x, y: position.y, facing: entry.direction as GearFacing, walking, weather: this.lastWeather, enabled: gearOn, reducedMotion, windEffects: fxSettingsEnabled });
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
        this.workerGear.delete(id);
      }
    }

    for (const v of this.vendorGears) {
      v.gear.update({ dt: elapsed, time: this.animTimer, characterId: v.id, day: gearDay, x: v.container.x, y: v.container.y, facing: 'down', walking: false, weather: this.lastWeather, enabled: gearOn, reducedMotion, windEffects: fxSettingsEnabled });
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

    // Xe chạy trên mạng đường của khu phố (đường chính + đường phụ): chỉ dựng sprite cho xe trong tầm nhìn, xe ngoài tầm
    // là dữ liệu thuần (không sprite) nên khu phố rộng không tốn thêm khi zoom gần.
    const streetVehicles = this.simulation.getStreetVehicles();
    const activeStreetKeys = new Set<string>();
    this.vehicleLightSources.length = 0;
    const camLeft = this.camera.x;
    const camTop = this.camera.y;
    const camRight = camLeft + this.app.screen.width / this.camera.zoom;
    const camBottom = camTop + this.app.screen.height / this.camera.zoom;
    for (const veh of streetVehicles) {
      const vx = veh.position.x, vy = veh.position.y;
      if (vx < camLeft - 220 || vx > camRight + 220 || vy < camTop - 140 || vy > camBottom + 140) continue;
      activeStreetKeys.add(veh.id);
      let sprite = this.streetTrafficSprites.get(veh.id);
      let textureKey: string;
      const vertical = veh.axis === 'y';
      if (vertical) textureKey = `vehicle_ns_${veh.type}_${veh.variant ?? 0}_${veh.direction === 'right' ? 'down' : 'up'}`;
      else if (veh.type === 'motorbike') textureKey = `vehicle_motorbike_rider_${veh.variant ?? 0}_${veh.direction}`;
      else if (veh.type === 'bicycle') textureKey = `vehicle_bicycle_rider_${veh.direction}`;
      else if (veh.type === 'minibus') textureKey = `vehicle_minibus_${veh.variant ?? 0}_${veh.direction}`;
      else if (veh.type === 'truck') textureKey = `truck_${TRUCK_KINDS[(veh.variant ?? 0) % TRUCK_KINDS.length]}_${veh.direction}`;
      else textureKey = (veh.variant ?? 0) === 0 ? `vehicle_car_${veh.direction}` : `vehicle_car_v${veh.variant}_${veh.direction}`;

      if (!sprite) {
        sprite = new Sprite(this.textures.getTexture(textureKey));
        sprite.anchor.set(0.5, 1);
        this.entitiesLayer.addChild(sprite);
        this.streetTrafficSprites.set(veh.id, sprite);
      } else {
        sprite.texture = this.textures.getTexture(textureKey);
      }
      // Xe đường dọc: vị trí là tâm vệt bánh, đáy sprite lùi nửa chiều dài về phía nam.
      const footY = vertical ? vy + STREET_VEHICLE_RULES.halfLengthY[veh.type] : vy;
      sprite.x = Math.round(vx);
      sprite.y = Math.round(footY);
      sprite.zIndex = footY;
      sprite.alpha = 1;
      if (!vertical) this.vehicleLightSources.push({ x: sprite.x, y: sprite.y, direction: veh.direction === 'left' ? 'left' : 'right', type: veh.type, alpha: sprite.alpha });
    }
    for (const [id, sprite] of this.streetTrafficSprites.entries()) {
      if (!activeStreetKeys.has(id)) {
        this.entitiesLayer.removeChild(sprite);
        sprite.destroy();
        this.streetTrafficSprites.delete(id);
      }
    }

    // Đèn tín hiệu và người đi bộ qua vạch trước cửa tiệm (ambient, không phải khách)
    this.intersectionSignalHeads?.update(this.simulation.getIntersectionSignals());
    const activePedestrians = new Set<string>();
    const getPedTexture = (key: string) => this.textures.getTexture(key);
    for (const ped of this.simulation.getStreetPedestrians()) {
      activePedestrians.add(ped.id);
      let sprite = this.pedestrianSprites.get(ped.id);
      if (!sprite) {
        sprite = createPedestrianSprite(ped.variant, ped.activity, getPedTexture);
        this.entitiesLayer.addChild(sprite);
        this.pedestrianSprites.set(ped.id, sprite);
      }
      placePedestrian(sprite, ped, this.animTimer, getPedTexture, reducedMotion);
      let pedGear = this.pedestrianGear.get(ped.id);
      if (!pedGear) { pedGear = new RainGear(); this.pedestrianGear.set(ped.id, pedGear); sprite.addChild(pedGear.container); }
      pedGear.update({ dt: elapsed, time: this.animTimer, characterId: ped.id, day: gearDay, x: ped.position.x, y: ped.position.y, facing: ped.direction, walking: ped.state === 'walking', weather: this.lastWeather, enabled: gearOn, reducedMotion, windEffects: fxSettingsEnabled });
      const pedDist = Math.min(ped.position.x, MAP_WIDTH * TILE_SIZE - ped.position.x);
      if (pedDist < 48) {
        sprite.alpha = Math.max(0, Math.min(1, pedDist / 48));
      } else {
        sprite.alpha = 1;
      }
    }
    for (const [id, sprite] of this.pedestrianSprites.entries()) {
      if (!activePedestrians.has(id)) {
        this.entitiesLayer.removeChild(sprite);
        sprite.destroy({ children: true });
        this.pedestrianSprites.delete(id);
        this.pedestrianGear.delete(id);
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
    const streetStrength = streetLightStrength(light);
    for (const glow of this.decorLampGlows) glow.alpha = streetStrength;
    const feet: Array<{ x: number; y: number }> = [this.playerContainer.position];
    if (this.partnerContainer.visible) feet.push(this.partnerContainer.position);
    for (const c of this.customerSprites.values()) feet.push(c.container.position);
    for (const w of this.workerSprites.values()) feet.push(w.container.position);
    if (this.shopkeeper) feet.push(this.shopkeeper.container.position);
    this.lighting.updateActorShadows(feet, light);
    this.sunBeamGraphic.alpha = light.sun;
    this.app.renderer.background.color = light.sky;
    const fxSettings = getWeatherFxSettings();
    const dbgRain = debugTime?.rain;
    const timeNow = debugTime ?? time;
    const rainNow = dbgRain ?? this.simulation.getRainIntensity();
    const weatherState = this.weatherModel.update(elapsed, {
      rain: rainNow,
      rainAhead: dbgRain ?? this.simulation.getRainIntensityAhead(WEATHER_CONFIG.lookAheadMinutes),
      weatherId: this.simulation.getEffectiveWeatherId(),
      day: timeNow.day,
      wetness: dbgRain !== undefined ? Math.min(1, dbgRain * 1.5) : this.simulation.getRoadWetness(),
    });
    publishWeatherVisual(weatherState, this.weatherModel);
    this.lastWeather = weatherState;
    for (const thunder of this.weatherModel.consumeThunders()) {
      emitThunder(thunder);
      this.weatherFx.onThunder(thunder.strength);
    }
    // Mưa cho bóng/đường dùng cường độ đã làm mượt; tắt hiệu ứng thì quay về cường độ thô của mô phỏng.
    const rain = fxSettings.enabled ? weatherState.rainIntensity : rainNow;
    this.roadSurface?.setWetness(fxSettings.enabled ? weatherState.puddleLevel : (dbgRain !== undefined ? Math.min(1, rain * 1.5) : this.simulation.getRoadWetness()));
    const shadowSoftness = fxSettings.enabled ? Math.max(rain, weatherState.sunOcclusion * 0.5) : rain;
    for (const entry of this.treeShadows) {
      const snapshot = { azimuth: light.sunAzimuth, elevation: light.sunElevation, sun: light.sun, rain: shadowSoftness };
      if (!treeShadowNeedsRedraw(entry.last, snapshot)) continue;
      entry.last = snapshot;
      const shape = computeTreeShadow(entry.prop, light, shadowSoftness);
      const g = entry.graphic;
      g.clear();
      g.visible = shape.visible;
      if (!shape.visible) continue;
      const baseX = (entry.prop.tileX + TREE_SPRITE_OFFSET.tilesX) * TILE_SIZE + TREE_SPRITE_OFFSET.pixelsX + TREE_SHADOW_ORIGIN_PX.x;
      const baseY = (entry.prop.tileY + TREE_SPRITE_OFFSET.tilesY) * TILE_SIZE + TREE_SPRITE_OFFSET.pixelsY + TREE_SHADOW_ORIGIN_PX.y;
      g.position.set(baseX + shape.offsetX * TILE_SIZE, baseY + shape.offsetY * TILE_SIZE);
      g.rotation = shape.angle;
      g.ellipse(0, 0, shape.radiusAlong * TILE_SIZE, shape.radiusAcross * TILE_SIZE).fill({ color: 0x26190e, alpha: shape.alpha });
    }
    this.weatherFx.groundLayer.visible = this.weatherFx.roofLayer.visible = this.weatherFx.darknessLayer.visible = this.weatherFx.topLayer.visible = fxSettings.enabled;
    if (fxSettings.enabled) {
      const viewW = this.app.screen.width / this.camera.zoom;
      const viewH = this.app.screen.height / this.camera.zoom;
      const frameCtx = {
        dt: elapsed, time: this.animTimer, sun: light.sun, night: streetStrength, quality: resolveWeatherQuality(fxSettings),
        userIntensity: fxSettings.intensity, reducedMotion, mapWidthPx: MAP_WIDTH * TILE_SIZE, mapHeightPx: MAP_HEIGHT * TILE_SIZE, actors: feet,
      };
      this.weatherFx.update(weatherState, { left: this.camera.x, top: this.camera.y, width: viewW, height: viewH }, frameCtx);
      this.weatherFx.stepActors(weatherState, frameCtx);
      // Gió lay cây và biển hiệu (vật nhẹ phản ứng nhiều hơn vật nặng; công trình không rung).
      if (!reducedMotion) {
        this.treeSprites.forEach(({ sprite, baseX }, i) => {
          const skew = swaySkew('tree', weatherState.windIntensity, weatherState.windDirection, this.animTimer, i * 1.9);
          sprite.skew.x = skew;
          // Skew quanh góc trên-trái: bù vị trí để gốc cây đứng yên, chỉ ngọn nghiêng.
          sprite.x = baseX - skew * sprite.height;
        });
        this.swaySigns.forEach((sign, i) => {
          sign.skew.x = swaySkew('sign', weatherState.windIntensity, weatherState.windDirection, this.animTimer, 0.7 + i * 2.3);
        });
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
    this.syncFixtureSprites();
    this.syncDecor();
    const allFixtures = this.simulation.getFixtures();
    // Đọc một lần mỗi khung: getInventory/getPendingOrders sao chép sâu, trước đây gọi lại cho từng kệ kho mỗi khung (rác cho GC).
    const pp = playerData.position;
    let warehouseCounts: { cold: number; dry: number; orders: number } | null = null;
    const countsForWarehouse = () => {
      if (warehouseCounts) return warehouseCounts;
      let cold = 0, dry = 0;
      for (const item of this.simulation.getInventory()) {
        if (PRODUCT_MAP[item.productId]?.storageType === 'cold') cold += item.quantity; else dry += item.quantity;
      }
      return (warehouseCounts = { cold, dry, orders: this.simulation.getPendingOrders().length });
    };
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
        const fx = fix.tileX * TILE_SIZE, fy = fix.tileY * TILE_SIZE;
        const behind = pp.x > fx - 6 && pp.x < fx + dimensions.widthTiles * TILE_SIZE + 6
          && pp.y > fy - TILE_SIZE * 1.6 && pp.y <= fy + 4;
        const fadeTarget = behind && fix.type !== 'cashier_counter' ? 0.4 : 1;
        entry.container.alpha += (fadeTarget - entry.container.alpha) * 0.25;
        if(isWarehouseFixture(fix)) {
          const cold=fix.type==='warehouse_cold';
          const receiving=fix.type==='warehouse_receiving';
          const counts=countsForWarehouse();
          const count=receiving?counts.orders:cold?counts.cold:counts.dry;
          const state=count===0?'empty':count<=(cold?16:10)?'low':'full';
          const key=`${entry.textureKey}:none:${state}`;
          if(entry.lastState!==key){entry.sprite.texture=this.textures.getTexture(key);entry.lastState=key;entry.dotMarker.clear().rect(5,38,6,6).fill(state==='empty'?0xb64c3d:0x357f72);}
          entry.stockText.text=receiving?`${count} đơn`:cold?`${count}/40`:`${count} món`;
          entry.stockText.visible=true;entry.dotMarker.visible=true;
        } else if (fix.type !== 'cashier_counter' && fix.type !== 'decor' && fix.type !== 'kitchen_station') {
          const group = allFixtures.filter(item => item.id === fix.id || item.parentId === fix.id);
          const limit = group.reduce((sum, item) => sum + effectiveShelfCapacity(item.maxCapacity, (item.assignedProductId && PRODUCT_MAP[item.assignedProductId]?.shelfCapacity) || item.maxCapacity, this.simulation.getShelfCapacityBonus()), 0);
          const stock = group.reduce((sum, item) => sum + item.currentStock, 0);
          entry.stockText.text = fix.broken ? (fix.broken === 'major' ? 'NẶNG' : 'HỎNG') : `${stock}/${limit}`;
          const state = stock === 0 ? 'empty' : stock / limit <= 0.4 ? 'low' : 'full';
          const key = `${entry.textureKey}:${fix.assignedProductId ?? 'none'}:${state}`;
          const worn = needsService(fix);
          entry.wearMarker.visible = worn;
          const stateKey = `${key}|${fix.broken ?? ''}`;
          if(entry.lastState !== stateKey) {
            if (!entry.staticArt) entry.sprite.texture = this.textures.getTexture(key);
            entry.lastState = stateKey;
            entry.sprite.tint = fix.broken ? (fix.broken === 'major' ? 0x7a6a6a : 0xb5a29c) : 0xffffff;
            entry.dotMarker.clear().rect(entry.dotX, 38, 6, 6).fill({color: fix.broken ? 0x6f2a1e : state==='empty'?0xd9381e:state==='low'?0xf4a261:0x2a7a43});
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

    // Logistics: render trucks, workers, boxes and toast notifications
    this.updateLogistics(elapsed);
    this.lighting.updateVehicleLights(this.vehicleLightSources, light);

    // 4. Update Y-sorting for realistic depth (so player can walk behind/in front of fixtures)
    this.entitiesLayer.children.sort((a, b) => a.zIndex - b.zIndex);

    // 5. Update Floating Texts (Juice) with Object Pooling
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const item = this.floatingTexts[i];
      item.life -= elapsed;
      if (!reducedMotion) item.container.y -= elapsed * 24; // Float upwards
      item.container.alpha = Math.max(0, item.life / item.maxLife);
      if (item.life <= 0) {
        this.uiOverlayLayer.removeChild(item.container);
        item.container.visible = false;
        item.container.alpha = 1;
        this.floatingTextPool.push(this.floatingTexts.splice(i, 1)[0]);
      }
    }

    // 6. Update Camera
    const inWarehouse=isInWarehouse(playerData.position);
    // A small room fits in the default view: keep its north/south edges visible.
    this.camera.follow(inWarehouse?{x:renderPos.x,y:WAREHOUSE_CENTER.y}:renderPos, elapsed, inWarehouse?0:undefined);
    const camOffset = this.camera.getRenderOffset();
    this.worldContainer.scale.set(this.camera.zoom);
    const shake = fxSettings.enabled ? this.weatherFx.shakeOffset(this.camera.zoom, reducedMotion) : { x: 0, y: 0 };
    this.worldContainer.x = camOffset.x + shake.x;
    this.worldContainer.y = camOffset.y + shake.y;

    // 6b. Khu phố mở rộng: đồi/đèn đêm theo thời tiết + dân cư nền (NPC, hội thoại, chim). Ngân sách theo chất lượng đồ họa.
    {
      const quality = resolveWeatherQuality(fxSettings);
      if (quality !== this.trafficBudgetQuality) { this.trafficBudgetQuality = quality; this.simulation.setTrafficBudgetScale(NEIGHBORHOOD_QUALITY[quality].vehicles); }
      const viewW = this.app.screen.width / this.camera.zoom;
      const viewH = this.app.screen.height / this.camera.zoom;
      this.neighborhood.update({ artificial: light.artificial, outdoor: light.outdoor, weather: this.lastWeather, time: this.animTimer, camX: this.camera.x, camY: this.camera.y, viewW, viewH, reducedMotion });
      const lifeTime = debugTime ?? { day: timeNow.day, hour: timeNow.hour, minute: timeNow.minute, rain: undefined };
      this.actors.update({
        dt: elapsed, time: this.animTimer, zoom: this.camera.zoom,
        view: { x0: this.camera.x, y0: this.camera.y, x1: this.camera.x + viewW, y1: this.camera.y + viewH },
        weather: this.lastWeather,
        life: { hour: lifeTime.hour, minute: lifeTime.minute, day: lifeTime.day, weekday: weekdayOf(lifeTime.day), rain: rainNow, weatherId: this.simulation.getEffectiveWeatherId(), vehicles: streetVehicles },
        vehicles: streetVehicles, quality, sun: light.sun, gearEnabled: gearOn, windEffects: fxSettingsEnabled, reducedMotion, mobile: this.app.screen.width < 768,
      });
      this.simulation.setStreetCrossings(this.actors.life.getCrossings());
    }

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
   * Cap nhat hien thi he thong giao nhan kho hang (logistics renderer):
   * ve xe tai den/di, nhan vien boc/xep kien hang va toast thong bao.
   */
  /**
   * Thiết kế bãi tiếp nhận hàng hóa chuyên dụng phía Đông (Phương án 1):
   * vạch sơn an toàn phản quang, pallet gỗ kê hàng và xe đẩy tay đỏ.
   */
  private buildLoadingDock(): void {
    if (this.loadingDockZone) {
      this.groundLayer.removeChild(this.loadingDockZone);
      this.loadingDockZone.destroy();
      this.loadingDockZone = null;
    }
    if (this.loadingDockPallet) {
      this.entitiesLayer.removeChild(this.loadingDockPallet);
      this.loadingDockPallet.destroy();
      this.loadingDockPallet = null;
    }
    if (this.loadingDockTrolley) {
      this.entitiesLayer.removeChild(this.loadingDockTrolley);
      this.loadingDockTrolley.destroy();
      this.loadingDockTrolley = null;
    }

    // 1. Vạch sơn an toàn cảnh báo bãi bốc dỡ trên vỉa hè phía Đông (ô x = 16.5..20, y = 11.2..12.3)
    const g = new Graphics();
    const zx = 16.5 * TILE_SIZE;
    const zy = 11.2 * TILE_SIZE;
    const zw = 3.6 * TILE_SIZE;
    const zh = 1.05 * TILE_SIZE;

    // Vạch viền vàng an toàn công nghiệp
    g.roundRect(zx, zy, zw, zh, 2);
    g.stroke({ color: 0xe5b85c, width: 1, alpha: 0.6 });

    // Vạch chéo vàng cảnh báo khu vực nâng dỡ hàng
    for (let lx = zx + 8; lx < zx + zw; lx += 16) {
      g.moveTo(lx, zy + zh - 1);
      g.lineTo(Math.min(zx + zw - 2, lx + 12), zy + 1);
      g.stroke({ color: 0xe5b85c, width: 1, alpha: 0.35 });
    }
    this.groundLayer.addChild(g);
    this.loadingDockZone = g;

    // 2. Pallet gỗ kê hàng cố định tại bãi tập kết (x = 18.2 * TILE_SIZE, y = 11.8 * TILE_SIZE)
    const pallet = new Sprite(this.textures.getTexture('prop_dock_pallet'));
    pallet.anchor.set(0.5, 1);
    pallet.position.set(Math.round(LOADING_DOCK_CONFIG.palletPosition.x), Math.round(LOADING_DOCK_CONFIG.palletPosition.y));
    pallet.zIndex = LOADING_DOCK_CONFIG.palletPosition.y - 1;
    this.entitiesLayer.addChild(pallet);
    this.loadingDockPallet = pallet;

    // 3. Xe đẩy hàng 2 bánh màu đỏ đứng chờ cạnh pallet (x = 17.2 * TILE_SIZE, y = 11.8 * TILE_SIZE)
    const trolley = new Sprite(this.textures.getTexture('prop_hand_trolley'));
    trolley.anchor.set(0.5, 1);
    trolley.position.set(Math.round(LOADING_DOCK_CONFIG.trolleyPosition.x), Math.round(LOADING_DOCK_CONFIG.trolleyPosition.y));
    trolley.zIndex = LOADING_DOCK_CONFIG.trolleyPosition.y - 1;
    this.entitiesLayer.addChild(trolley);
    this.loadingDockTrolley = trolley;
  }
  private updateLogistics(elapsed: number): void {
    const ev = this.simulation.getLogisticsState().activeEvent;
    const reducedMotion = this.motionQuery.matches;

    if (!ev) {
      if (this.logisticsTruckSprite) {
        this.entitiesLayer.removeChild(this.logisticsTruckSprite);
        this.logisticsTruckSprite.destroy();
        this.logisticsTruckSprite = null;
      }
      if (this.logisticsWorkerContainer) {
        this.entitiesLayer.removeChild(this.logisticsWorkerContainer);
        this.logisticsWorkerContainer.destroy({ children: true });
        this.logisticsWorkerContainer = null;
        this.logisticsWorkerSprite = null;
        this.logisticsBoxSprite = null;
      }
      if (this.loadingDockBoxesContainer) {
        this.entitiesLayer.removeChild(this.loadingDockBoxesContainer);
        this.loadingDockBoxesContainer.destroy({ children: true });
        this.loadingDockBoxesContainer = null;
      }
      if (this.logisticsToastContainer) {
        this.logisticsToastLife -= elapsed;
        this.logisticsToastContainer.alpha = Math.max(0, this.logisticsToastLife / 1.5);
        if (this.logisticsToastLife <= 0) {
          this.uiOverlayLayer.removeChild(this.logisticsToastContainer);
          this.logisticsToastContainer.destroy({ children: true });
          this.logisticsToastContainer = null;
          this.logisticsToastText = null;
          this.logisticsLastStatus = '';
        }
      }
      return;
    }

    // ---- Truck Sprite ----
    const truckTextureKey = ev.truckType + '_' + ev.direction;
    if (!this.logisticsTruckSprite) {
      this.logisticsTruckSprite = new Sprite(this.textures.getTexture(truckTextureKey));
      this.logisticsTruckSprite.anchor.set(0.5, 1);
      this.entitiesLayer.addChild(this.logisticsTruckSprite);
    } else {
      this.logisticsTruckSprite.texture = this.textures.getTexture(truckTextureKey);
    }
    this.logisticsTruckSprite.x = Math.round(ev.truckPosition.x);
    this.logisticsTruckSprite.y = Math.round(ev.truckPosition.y);
    this.logisticsTruckSprite.zIndex = ev.truckPosition.y + 2;

    if (!reducedMotion && (ev.phase === 'docked' || ev.phase === 'unloading' || ev.phase === 'loading')) {
      this.logisticsTruckSprite.x += (Math.random() - 0.5) * 0.4;
    }

    const edgeDist = Math.min(ev.truckPosition.x, MAP_WIDTH * TILE_SIZE - ev.truckPosition.x);
    this.logisticsTruckSprite.alpha = Math.max(0, Math.min(1, edgeDist / 48));
    this.vehicleLightSources.push({ x: this.logisticsTruckSprite.x, y: this.logisticsTruckSprite.y, direction: ev.direction === 'left' ? 'left' : 'right', type: 'truck', alpha: this.logisticsTruckSprite.alpha });

    // ---- Worker Sprite ----
    if (ev.worker && (ev.phase === 'unloading' || ev.phase === 'loading')) {
      if (!this.logisticsWorkerContainer) {
        this.logisticsWorkerContainer = new Container();
        this.logisticsWorkerSprite = new Sprite(this.textures.getTexture('npc_0_right_walk_0'));
        this.logisticsWorkerSprite.anchor.set(0.5, 1);
        this.logisticsWorkerContainer.addChild(this.logisticsWorkerSprite);
        this.logisticsBoxSprite = new Sprite(this.textures.getTexture('prop_cargo_carton'));
        this.logisticsBoxSprite.anchor.set(0.5, 1);
        this.logisticsBoxSprite.y = LOGISTICS_BOX_CARRY_Y;
        this.logisticsWorkerContainer.addChild(this.logisticsBoxSprite);
        this.entitiesLayer.addChild(this.logisticsWorkerContainer);
      }
      const w = ev.worker;
      const walkFrame = reducedMotion ? 0 : Math.floor(this.animTimer * 8) % 4;
      const dir = w.direction === 'right' ? 'right' : 'left';
      if (this.logisticsWorkerSprite) {
        this.logisticsWorkerSprite.texture = this.textures.getTexture('npc_0_' + dir + '_walk_' + walkFrame);
      }
      this.logisticsWorkerContainer.position.set(Math.round(w.x), Math.round(w.y));
      // Đảm bảo nhân viên đứng ngoài cửa vẫn hiện phía trước sprite cửa chính.
      // Xe tải cao hơn người nên che vỉa hè phía sau; nhân viên bốc hàng luôn hiện phía trước thân xe.
      this.logisticsWorkerContainer.zIndex = Math.max(w.y + 1, 346, ev.truckPosition.y + 3);
      if (this.logisticsBoxSprite) {
        this.logisticsBoxSprite.visible = w.carryingBox;
        if (w.carryingBox) {
          const boxKey = w.boxType === 'foam_cold' ? 'prop_foam_box_cold' : w.boxType === 'produce_crate' ? 'prop_produce_crate' : 'prop_cargo_carton';
          this.logisticsBoxSprite.texture = this.textures.getTexture(boxKey);
          // Ôm thùng trước ngực (đáy thùng ngang tay), không che mặt; lệch nhẹ theo hướng đi.
          this.logisticsBoxSprite.x = w.direction === 'right' ? 3 : -3;
          this.logisticsBoxSprite.y = LOGISTICS_BOX_CARRY_Y + (reducedMotion ? 0 : Math.round(Math.sin(this.animTimer * 8)));
        }
      }
    } else if (this.logisticsWorkerContainer && ev.phase !== 'unloading' && ev.phase !== 'loading') {
      this.entitiesLayer.removeChild(this.logisticsWorkerContainer);
      this.logisticsWorkerContainer.destroy({ children: true });
      this.logisticsWorkerContainer = null;
      this.logisticsWorkerSprite = null;
      this.logisticsBoxSprite = null;
    }

    // ---- Dynamic Stacked Boxes on Pallet ----
    const deliveredCount = (ev.phase === 'docked' || ev.phase === 'unloading' || ev.phase === 'loading' || ev.phase === 'completed' || ev.phase === 'departing')
      ? (ev.type === 'outbound_party_order'
          ? Math.max(0, ev.totalBoxes - ev.boxesRemaining)
          : Math.max(0, ev.totalBoxes - ev.boxesRemaining))
      : 0;

    if (deliveredCount > 0) {
      if (!this.loadingDockBoxesContainer) {
        this.loadingDockBoxesContainer = new Container();
        this.loadingDockBoxesContainer.position.set(
          Math.round(LOADING_DOCK_CONFIG.palletPosition.x),
          Math.round(LOADING_DOCK_CONFIG.palletPosition.y)
        );
        this.loadingDockBoxesContainer.zIndex = LOADING_DOCK_CONFIG.palletPosition.y + 1;
        this.entitiesLayer.addChild(this.loadingDockBoxesContainer);
      }

      const boxKey = ev.worker?.boxType === 'foam_cold'
        ? 'prop_foam_box_cold'
        : ev.worker?.boxType === 'produce_crate'
        ? 'prop_produce_crate'
        : 'prop_cargo_carton';

      // Các vị trí xếp tầng trên pallet gỗ (tối đa 6 thùng theo hình tháp)
      const stackOffsets = [
        { x: -5, y: -4 },
        { x: 5, y: -4 },
        { x: 0, y: -13 },
        { x: -6, y: -13 },
        { x: 6, y: -13 },
        { x: 0, y: -21 },
      ];

      while (this.loadingDockBoxesContainer.children.length < deliveredCount && this.loadingDockBoxesContainer.children.length < stackOffsets.length) {
        const idx = this.loadingDockBoxesContainer.children.length;
        const boxSprite = new Sprite(this.textures.getTexture(boxKey));
        boxSprite.anchor.set(0.5, 1);
        boxSprite.position.set(stackOffsets[idx].x, stackOffsets[idx].y);
        this.loadingDockBoxesContainer.addChild(boxSprite);
      }
      while (this.loadingDockBoxesContainer.children.length > deliveredCount) {
        const removed = this.loadingDockBoxesContainer.removeChildAt(this.loadingDockBoxesContainer.children.length - 1);
        removed.destroy();
      }
    } else if (this.loadingDockBoxesContainer && deliveredCount === 0) {
      this.entitiesLayer.removeChild(this.loadingDockBoxesContainer);
      this.loadingDockBoxesContainer.destroy({ children: true });
      this.loadingDockBoxesContainer = null;
    }

    // ---- Toast Notification ----
    if (ev.statusText && ev.statusText !== this.logisticsLastStatus) {
      this.logisticsLastStatus = ev.statusText;
      if (!this.logisticsToastContainer) {
        this.logisticsToastContainer = new Container();
        const bg = new Graphics();
        this.logisticsToastContainer.addChild(bg);
        this.logisticsToastText = new Text({ text: '', style: new TextStyle({
          fontFamily: 'Arial', fontSize: 9, fontWeight: 'bold',
          fill: 0xe8f4d4, align: 'center', wordWrap: true, wordWrapWidth: 200,
        }) });
        this.logisticsToastText.anchor.set(0.5, 1);
        this.logisticsToastContainer.addChild(this.logisticsToastText);
        this.uiOverlayLayer.addChild(this.logisticsToastContainer);
      }
      if (this.logisticsToastText) {
        this.logisticsToastText.text = '\u{1F69A} ' + ev.statusText;
        const tw = Math.max(80, this.logisticsToastText.width + 16);
        const th = this.logisticsToastText.height + 10;
        const bg = this.logisticsToastContainer.children[0] as Graphics;
        bg.clear();
        bg.roundRect(-tw / 2, -th, tw, th, 4).fill({ color: 0x1a3a2a, alpha: 0.88 });
        bg.stroke({ color: 0x4caf50, width: 1, alpha: 0.8 });
      }
      this.logisticsToastLife = 4.0;
      this.logisticsToastContainer.alpha = 1;
      const dockPx = LOADING_DOCK_CONFIG.storeEntrancePosition;
      this.logisticsToastContainer.position.set(dockPx.x, dockPx.y - 36);
    }
    if (this.logisticsToastContainer) {
      this.logisticsToastLife -= elapsed;
      if (this.logisticsToastLife < 1.5) {
        this.logisticsToastContainer.alpha = Math.max(0, this.logisticsToastLife / 1.5);
      }
      if (this.logisticsToastLife <= 0) {
        this.logisticsToastContainer.alpha = 0;
      }
    }
  }

  /**
   * Spawns a floating gain label (e.g. "+24.000₫", "+12 XP") above a world coordinate
   */
  public addFloatingGain(x: number, y: number, text: string, color: number = 0xf4a261): void {
    let item: { container: Container; life: number; maxLife: number };
    if (this.floatingTextPool.length > 0) {
      item = this.floatingTextPool.pop()!;
      item.container.visible = true;
    } else {
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
      item = { container, life: 0.8, maxLife: 0.8 };
    }
    
    item.container.x = x;
    item.container.y = y;
    const label = item.container.children[0] as Text;
    label.text = text;
    (label.style as TextStyle).fill = color;
    item.life = 0.8;
    item.maxLife = 0.8;
    this.floatingTexts.push(item);
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
   * Frustum Culling Helper
   * Chỉ cho phép render những thực thể nằm trong vùng nhìn thấy của camera để tăng hiệu năng.
   */
  private isOnScreen(x: number, y: number): boolean {
    // camera.x/y là góc trên-trái của khung nhìn (không phải tâm).
    const viewW = this.app.screen.width / this.camera.zoom;
    const viewH = this.app.screen.height / this.camera.zoom;
    return x >= this.camera.x - 32 && x <= this.camera.x + viewW + 32 &&
           y >= this.camera.y - 32 && y <= this.camera.y + viewH + 32;
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
    if (this.loadingDockBoxesContainer) {
      this.entitiesLayer.removeChild(this.loadingDockBoxesContainer);
      this.loadingDockBoxesContainer.destroy({ children: true });
      this.loadingDockBoxesContainer = null;
    }
    this.loadingDockZone?.destroy();
    this.loadingDockZone = null;
    this.loadingDockPallet?.destroy();
    this.loadingDockPallet = null;
    this.loadingDockTrolley?.destroy();
    this.loadingDockTrolley = null;
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

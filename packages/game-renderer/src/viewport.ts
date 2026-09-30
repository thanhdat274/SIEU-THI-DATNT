import { Application, Container, Sprite, Graphics, Text, TextStyle } from 'pixi.js';
import { GameTileMap, StoreFixture, TILE_SIZE, Vector2D, isWarehouseFixture } from '@game/shared';
import { GameSimulation } from '@game/core';
import { PixelTextureFactory } from './textures';
import { PixelCamera } from './camera';
import { PRODUCT_MAP, WAREHOUSE_ENTRANCE, WAREHOUSE_CENTER, WAREHOUSE_BOUNDS, WAREHOUSE_DOOR_LEFT, STORE_BOUNDS, isInWarehouse } from '@game/data';

export interface PixiGameViewportOptions {
  canvas: HTMLCanvasElement;
  tileMap: GameTileMap;
  simulation: GameSimulation;
  onResize?: (width: number, height: number) => void;
  onZoomChange?: (zoom: number) => void;
}

export class PixiGameViewport {
  private app!: Application;
  private canvas: HTMLCanvasElement;
  private tileMap: GameTileMap;
  private simulation: GameSimulation;
  private textures: PixelTextureFactory;
  private camera: PixelCamera;

  // Containers
  private worldContainer!: Container;
  private groundLayer!: Container;
  private entitiesLayer!: Container;
  private wallLayer!: Container;
  private uiOverlayLayer!: Container;

  // Dynamic entity sprites & containers
  private playerContainer!: Container;
  private playerSprite!: Sprite;
  private customerContainer!: Container;
  private customerSprite!: Sprite;
  private customerBubble!: Container;
  private customerBubbleIcon!: Sprite;
  private npcVariant = 0;
  private lastCustomerPosition: Vector2D | null = null;
  private npcDirection = 'down';
  private resizeObserver?: ResizeObserver;
  private onZoomChange?: (zoom: number) => void;
  private ambientSprites: Array<{sprite: Sprite; key: string; frames: number}> = [];
  private nightOverlay!: Graphics;
  private motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  private fixtureSprites: Map<string, { container: Container; stockText: Text; dotMarker: Graphics; sprite: Sprite; textureKey: string; lastState: string }> = new Map();
  private interactionBubble!: Container;
  private warehouseLocator!: Container;
  private locatingWarehouse = false;
  private floatingTexts: Array<{ container: Container; life: number; maxLife: number }> = [];

  private isInitialized: boolean = false;
  private animTimer: number = 0;
  private accumulatedTime: number = 0;

  constructor(options: PixiGameViewportOptions) {
    this.canvas = options.canvas;
    this.tileMap = options.tileMap;
    this.simulation = options.simulation;
    this.textures = new PixelTextureFactory();
    this.camera = new PixelCamera(this.tileMap.width, this.tileMap.height);
    this.onZoomChange = options.onZoomChange;
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

    this.worldContainer.addChild(this.groundLayer);
    this.worldContainer.addChild(this.wallLayer);
    this.worldContainer.addChild(this.entitiesLayer);
    this.worldContainer.addChild(this.uiOverlayLayer);

    this.app.stage.addChild(this.worldContainer);

    // Build Tile Layers
    this.buildMapLayers();

    // Build Fixtures
    this.buildFixtures();

    // Build Player Sprite & Tag
    this.buildPlayer();

    // Build Customer Container with Thought Bubble
    this.customerContainer = new Container();
    this.customerSprite = new Sprite(this.textures.getTexture('npc_0_down_idle_0'));
    this.customerSprite.anchor.set(0.5, 1);
    this.customerContainer.addChild(this.customerSprite);

    this.customerBubble = new Container();
    const bubBg = new Graphics();
    bubBg.rect(-12, -66, 24, 24);
    bubBg.fill({ color: 0xffffff, alpha: 0.95 });
    bubBg.stroke({ color: 0x593a2b, width: 1 });
    this.customerBubble.addChild(bubBg);

    this.customerBubbleIcon = new Sprite(this.textures.getTexture('product:mi_hao_hao'));
    this.customerBubbleIcon.anchor.set(0.5);
    this.customerBubbleIcon.y = -54;
    this.customerBubble.addChild(this.customerBubbleIcon);

    this.customerContainer.addChild(this.customerBubble);
    this.customerContainer.visible = false;
    this.entitiesLayer.addChild(this.customerContainer);

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

    this.nightOverlay = new Graphics();
    this.nightOverlay.rect(0, 0, this.app.screen.width, this.app.screen.height).fill(0x253834);
    this.nightOverlay.eventMode = 'none';
    this.app.stage.addChild(this.nightOverlay);
    this.resizeObserver = new ResizeObserver(() => {
      this.app.resize();
      this.camera.setViewportSize(this.app.screen.width, this.app.screen.height);
      this.onZoomChange?.(this.camera.zoom);
      this.nightOverlay.clear().rect(0, 0, this.app.screen.width, this.app.screen.height).fill(0x253834);
    });
    if (this.canvas.parentElement) this.resizeObserver.observe(this.canvas.parentElement);
    // Hook Ticker
    this.app.ticker.add(this.renderTick);

    this.isInitialized = true;
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
          let outerTexture = 'tile_pavement_alley';
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
          else if (tileId === 2) textureKey = 'tile_sidewalk';
          else if (tileId === 9) textureKey = 'warehouse_floor';

          const tileSprite = new Sprite(this.textures.getTexture(textureKey));
          tileSprite.x = x * TILE_SIZE;
          tileSprite.y = (y+originY) * TILE_SIZE;
          this.groundLayer.addChild(tileSprite);
        }
      }
    }

    // Wall Layer & Shop decorations
    if (wallLayerData) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const tileId = wallLayerData[y * width + x];
          if (tileId === 4 || tileId === 10) {
            // Yellow Wall
            const wallSprite = new Sprite(this.textures.getTexture(tileId===10?'warehouse_wall':'tile_yellow_wall'));
            wallSprite.x = x * TILE_SIZE;
            wallSprite.y = (y+originY) * TILE_SIZE;
            this.wallLayer.addChild(wallSprite);
          } else if (tileId === 8 && x === 8 && y === 2) {
            // Signboard (128x32) spanning across x=8..11
            const signSprite = new Sprite(this.textures.getTexture('tile_signboard'));
            signSprite.x = x * TILE_SIZE;
            signSprite.y = y * TILE_SIZE - 16;
            this.wallLayer.addChild(signSprite);
          }
        }
      }
    }

    const awning = new Sprite(this.textures.getTexture('tile_awning'));
    const warehouseSign=new Sprite(this.textures.getTexture('warehouse_sign'));
    warehouseSign.position.set((WAREHOUSE_BOUNDS.left+2)*TILE_SIZE, WAREHOUSE_BOUNDS.top*TILE_SIZE-16);
    this.wallLayer.addChild(warehouseSign);
    const shopSign=new Sprite(this.textures.getTexture('tile_signboard'));
    shopSign.position.set((STORE_BOUNDS.left-1)*TILE_SIZE, STORE_BOUNDS.top*TILE_SIZE-16);
    this.wallLayer.addChild(shopSign);
    const doorway=new Graphics();
    doorway.rect(WAREHOUSE_DOOR_LEFT*TILE_SIZE,STORE_BOUNDS.top*TILE_SIZE,2,32).fill(0x936044);
    doorway.rect((WAREHOUSE_DOOR_LEFT+2)*TILE_SIZE-2,STORE_BOUNDS.top*TILE_SIZE,2,32).fill(0xc69464);
    doorway.rect(WAREHOUSE_ENTRANCE.x-1,WAREHOUSE_ENTRANCE.y-8,3,16).fill(0x357f72);
    doorway.rect(WAREHOUSE_ENTRANCE.x-5,WAREHOUSE_ENTRANCE.y-8,11,4).fill(0x357f72);
    this.groundLayer.addChild(doorway);
    awning.position.set((STORE_BOUNDS.left-1)*TILE_SIZE, 4 * TILE_SIZE+8);
    this.wallLayer.addChild(awning);
    const fan = new Sprite(this.textures.getTexture('tile_fan_0'));
    fan.position.set(7 * TILE_SIZE, 4 * TILE_SIZE + 8);
    this.wallLayer.addChild(fan);
    this.ambientSprites.push({sprite:fan,key:'tile_fan_',frames:4});
    const crates = new Sprite(this.textures.getTexture('tile_crates'));
    crates.position.set(5 * TILE_SIZE, 11 * TILE_SIZE);
    crates.zIndex = crates.y + 32;
    this.entitiesLayer.addChild(crates);
    const chair = new Sprite(this.textures.getTexture('tile_chair'));
    chair.position.set(14 * TILE_SIZE, 10 * TILE_SIZE);
    chair.zIndex = chair.y + 32;
    this.entitiesLayer.addChild(chair);
    const tree = new Sprite(this.textures.getTexture('tile_tree'));
    tree.position.set(2 * TILE_SIZE, 9 * TILE_SIZE);
    tree.zIndex = tree.y + 96;
    this.entitiesLayer.addChild(tree);
    const wires = new Graphics();
    const wireY=(WAREHOUSE_BOUNDS.top-1)*TILE_SIZE;
    wires.moveTo(2*TILE_SIZE,wireY).lineTo(5*TILE_SIZE,wireY+16).lineTo(14*TILE_SIZE,wireY).stroke({color:0x593a2b,width:1});
    this.wallLayer.addChild(wires);
    // Entrance pots and baskets.

    const plant1 = new Sprite(this.textures.getTexture('tile_plant_pot'));
    plant1.x = 6 * TILE_SIZE;
    plant1.y = 10 * TILE_SIZE;
    plant1.zIndex = plant1.y + 40;
    this.ambientSprites.push({sprite:plant1,key:'tile_plant_',frames:2});
    this.entitiesLayer.addChild(plant1);

    const plant2 = new Sprite(this.textures.getTexture('tile_plant_pot'));
    plant2.x = 13 * TILE_SIZE;
    plant2.y = 10 * TILE_SIZE;
    plant2.zIndex = plant2.y + 40;
    this.ambientSprites.push({sprite:plant2,key:'tile_plant_',frames:2});
    this.entitiesLayer.addChild(plant2);

    const baskets = new Sprite(this.textures.getTexture('tile_shopping_baskets'));
    baskets.x = 7 * TILE_SIZE;
    baskets.y = 10 * TILE_SIZE;
    baskets.zIndex = baskets.y + 32;
    this.entitiesLayer.addChild(baskets);
  }

  private buildFixtures(): void {
    const fixtures = this.simulation.getFixtures();
    for (const fix of fixtures) {
      const container = new Container();
      container.x = fix.tileX * TILE_SIZE;
      container.y = fix.tileY * TILE_SIZE;

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
      container.zIndex = container.y + TILE_SIZE;
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
    this.accumulatedTime += elapsed;

    // Fixed simulation steps independent of monitor refresh rate.
    let steps = 0;
    while (this.accumulatedTime >= dt && steps < 15) {
      this.simulation.update(dt);
      this.accumulatedTime -= dt;
      steps++;
    }

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
    const customer = this.simulation.getCustomer();
    if (customer && !this.customerContainer.visible) this.npcVariant = (this.npcVariant + 1) % 3;
    this.customerContainer.visible = !!customer;
    if (customer) {
      const previous = this.lastCustomerPosition;
      const dx = previous ? customer.position.x - previous.x : 0;
      const dy = previous ? customer.position.y - previous.y : 0;
      const walking = Math.abs(dx) + Math.abs(dy) > 0.01;
      if(walking) this.npcDirection = Math.abs(dx)>Math.abs(dy) ? (dx>0?'right':'left') : (dy>0?'down':'up');
      const npcFrame = reducedMotion ? 0 : Math.floor(this.animTimer * (walking ? 8 : 1.5)) % (walking ? 4 : 2);
      this.customerSprite.texture = this.textures.getTexture(`npc_${this.npcVariant}_${this.npcDirection}_${walking?'walk':'idle'}_${npcFrame}`);
      this.customerContainer.position.set(Math.round(customer.position.x),Math.round(customer.position.y));
      this.customerContainer.zIndex = customer.position.y;
      const target = this.simulation.getFixtures().find(f=>f.id===customer.targetFixtureId);
      this.customerBubbleIcon.texture = this.textures.getTexture(customer.stage === 'to_shelf' ? `product:${target?.assignedProductId ?? 'none'}` : 'pixel_coin');
      this.lastCustomerPosition = {...customer.position};
    } else this.lastCustomerPosition = null;
    for(const ambient of this.ambientSprites) ambient.sprite.texture = this.textures.getTexture(`${ambient.key}${reducedMotion?0:Math.floor(this.animTimer*(ambient.key==='tile_fan_'?5:1))%ambient.frames}`);
    const hour = this.simulation.getTime().hour;
    this.nightOverlay.alpha = hour >= 18 ? Math.min(0.25, (hour-17)*0.05) : hour < 7 ? 0.08 : 0;

    // 3. Update Fixture Badges & Dot Status Markers (Green = Full, Yellow = Low, Red = Out)
    for (const fix of this.simulation.getFixtures()) {
      const entry = this.fixtureSprites.get(fix.id);
      if (entry) {
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
          const limit = Math.min(fix.maxCapacity, (fix.assignedProductId && PRODUCT_MAP[fix.assignedProductId]?.shelfCapacity) || fix.maxCapacity);
          entry.stockText.text = `${fix.currentStock}/${limit}`;
          const state = fix.currentStock === 0 ? 'empty' : fix.currentStock / limit <= 0.4 ? 'low' : 'full';
          const key = `${entry.textureKey}:${fix.assignedProductId ?? 'none'}:${state}`;
          if(entry.lastState !== key) {
            entry.sprite.texture = this.textures.getTexture(key);
            entry.lastState = key;
            entry.dotMarker.clear().rect(13, 38, 6, 6).fill({color:state==='empty'?0xd9381e:state==='low'?0xf4a261:0x2a7a43});
          }
          entry.stockText.visible = true;
          entry.dotMarker.visible = true;
        } else {
          entry.stockText.visible = false;
          entry.dotMarker.visible = false;
        }
      }
    }

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
      const fixCenterX = (activeFixture.tileX + activeFixture.widthTiles / 2) * TILE_SIZE;
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
    this.textures.destroy();
  }
}

import { Application, Container, Sprite, Graphics, Text, TextStyle } from 'pixi.js';
import { GameTileMap, StoreFixture, TILE_SIZE, Vector2D } from '@game/shared';
import { GameSimulation } from '@game/core';
import { PixelTextureFactory } from './textures';
import { PixelCamera } from './camera';

export interface PixiGameViewportOptions {
  canvas: HTMLCanvasElement;
  tileMap: GameTileMap;
  simulation: GameSimulation;
  onResize?: (width: number, height: number) => void;
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

  // Dynamic entity sprites
  private playerSprite!: Sprite;
  private fixtureSprites: Map<string, { container: Container; stockText: Text }> = new Map();
  private interactionBubble!: Container;

  private isInitialized: boolean = false;
  private animTimer: number = 0;
  private accumulatedTime: number = 0;

  constructor(options: PixiGameViewportOptions) {
    this.canvas = options.canvas;
    this.tileMap = options.tileMap;
    this.simulation = options.simulation;
    this.textures = new PixelTextureFactory();
    this.camera = new PixelCamera(this.tileMap.width, this.tileMap.height);
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.app = new Application();
    await this.app.init({
      canvas: this.canvas,
      resizeTo: this.canvas.parentElement || window,
      backgroundColor: 0x1b1c1e,
      resolution: window.devicePixelRatio || 1,
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

    // Build Player Sprite
    this.buildPlayer();

    // Build Interaction Bubble
    this.buildInteractionBubble();

    // Hook Resize
    window.addEventListener('resize', this.handleResize);

    // Hook Ticker
    this.app.ticker.add(this.renderTick);

    this.isInitialized = true;
  }

  private handleResize = (): void => {
    if (!this.app || !this.app.renderer) return;
    this.camera.setViewportSize(this.app.screen.width, this.app.screen.height);
  };

  private buildMapLayers(): void {
    const width = this.tileMap.width;
    const height = this.tileMap.height;

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

          const tileSprite = new Sprite(this.textures.getTexture(textureKey));
          tileSprite.x = x * TILE_SIZE;
          tileSprite.y = y * TILE_SIZE;
          this.groundLayer.addChild(tileSprite);
        }
      }
    }

    // Wall Layer & Shop decorations
    if (wallLayerData) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const tileId = wallLayerData[y * width + x];
          if (tileId === 4) {
            // Yellow Wall
            const wallSprite = new Sprite(this.textures.getTexture('tile_yellow_wall'));
            wallSprite.x = x * TILE_SIZE;
            wallSprite.y = y * TILE_SIZE;
            this.wallLayer.addChild(wallSprite);
          } else if (tileId === 8 && x === 8 && y === 2) {
            // Signboard (128x32) spanning across x=8..11
            const signSprite = new Sprite(this.textures.getTexture('tile_signboard'));
            signSprite.x = x * TILE_SIZE;
            signSprite.y = y * TILE_SIZE;
            this.wallLayer.addChild(signSprite);
          }
        }
      }
    }

    // Add entrance decorations matching reference image (baskets and potted plants)
    const plant1 = new Sprite(this.textures.getTexture('tile_plant_pot'));
    plant1.x = 6 * TILE_SIZE;
    plant1.y = 10 * TILE_SIZE;
    this.entitiesLayer.addChild(plant1);

    const plant2 = new Sprite(this.textures.getTexture('tile_plant_pot'));
    plant2.x = 13 * TILE_SIZE;
    plant2.y = 10 * TILE_SIZE;
    this.entitiesLayer.addChild(plant2);

    const baskets = new Sprite(this.textures.getTexture('tile_shopping_baskets'));
    baskets.x = 7 * TILE_SIZE;
    baskets.y = 10 * TILE_SIZE;
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
      }

      const sprite = new Sprite(this.textures.getTexture(textureKey));
      container.addChild(sprite);

      // Pill stock badge under shelf (Matching user reference image!)
      const badgeBg = new Graphics();
      badgeBg.roundRect(14, 34, 36, 12, 3);
      badgeBg.fill({ color: 0xeadcc9, alpha: 0.95 });
      badgeBg.stroke({ color: 0xbfa993, width: 1 });
      container.addChild(badgeBg);

      const style = new TextStyle({
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: 9,
        fontWeight: 'bold',
        fill: 0x43382f,
      });

      const stockText = new Text({ text: '', style });
      stockText.anchor.set(0.5);
      stockText.x = 32;
      stockText.y = 40;
      container.addChild(stockText);

      this.entitiesLayer.addChild(container);
      this.fixtureSprites.set(fix.id, { container, stockText });
    }
  }

  private buildPlayer(): void {
    this.playerSprite = new Sprite(this.textures.getTexture('player_down'));
    this.playerSprite.anchor.set(0.5, 0.9); // Anchor at feet
    this.entitiesLayer.addChild(this.playerSprite);
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
    bg.roundRect(-46, -34, 92, 22, 5);
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

    // 2. Update player sprite texture & animation
    const dir = playerData.direction;
    this.playerSprite.texture = this.textures.getTexture(`player_${dir}`);
    this.playerSprite.x = playerData.position.x;

    // Small walking bounce effect
    const bounce = isMoving ? Math.sin(this.animTimer * 12) * 2 : 0;
    this.playerSprite.y = playerData.position.y + bounce;

    // 3. Update Fixture Badges
    for (const fix of this.simulation.getFixtures()) {
      const entry = this.fixtureSprites.get(fix.id);
      if (entry) {
        if (fix.type !== 'cashier_counter') {
          entry.stockText.text = `${fix.currentStock}/${fix.maxCapacity}`;
          entry.stockText.visible = true;
        } else {
          entry.stockText.visible = false;
        }
      }
    }

    // 4. Update Y-sorting for realistic depth (so player can walk behind/in front of fixtures)
    this.entitiesLayer.children.sort((a, b) => a.y - b.y);

    // 5. Update Camera
    this.camera.follow(playerData.position, dt);
    const camOffset = this.camera.getRenderOffset();
    this.worldContainer.scale.set(this.camera.zoom);
    this.worldContainer.x = camOffset.x;
    this.worldContainer.y = camOffset.y;

    // 6. Update Interaction Bubble
    const activeFixture = this.simulation.getActiveFixture();
    if (activeFixture) {
      this.interactionBubble.visible = true;
      const fixCenterX = (activeFixture.tileX + activeFixture.widthTiles / 2) * TILE_SIZE;
      const fixTopY = activeFixture.tileY * TILE_SIZE;

      // Floating bounce
      const bubbleFloat = Math.sin(this.animTimer * 5) * 3;
      this.interactionBubble.x = fixCenterX;
      this.interactionBubble.y = fixTopY - 14 + bubbleFloat;

      const textNode = this.interactionBubble.children[2] as Text;
      if (activeFixture.type === 'cashier_counter') {
        textNode.text = '[E] Bàn Thu Ngân';
      } else {
        textNode.text = '[E] Xem Kệ Hàng';
      }
    } else {
      this.interactionBubble.visible = false;
    }
  };

  public destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    if (this.app) {
      this.app.destroy(true, { children: true, texture: false });
    }
  }
}

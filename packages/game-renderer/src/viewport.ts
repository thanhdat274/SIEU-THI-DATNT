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

          if (tileId === 3) textureKey = 'tile_encaustic';
          else if (tileId === 1) textureKey = 'tile_street';
          else if (tileId === 2) textureKey = 'tile_sidewalk';

          const tileSprite = new Sprite(this.textures.getTexture(textureKey));
          tileSprite.x = x * TILE_SIZE;
          tileSprite.y = y * TILE_SIZE;
          this.groundLayer.addChild(tileSprite);
        }
      }
    }

    // Wall Layer
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
      }

      const sprite = new Sprite(this.textures.getTexture(textureKey));
      container.addChild(sprite);

      // Stock indicator badge if it's a shelf
      const style = new TextStyle({
        fontFamily: 'monospace',
        fontSize: 9,
        fontWeight: 'bold',
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 2 },
      });

      const stockText = new Text({ text: '', style });
      stockText.x = 4;
      stockText.y = 2;
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

    const bg = new Graphics();
    bg.roundRect(-45, -14, 90, 24, 6);
    bg.fill({ color: 0xffb703, alpha: 0.95 });
    bg.stroke({ color: 0x582f0e, width: 2 });
    this.interactionBubble.addChild(bg);

    const style = new TextStyle({
      fontFamily: 'sans-serif',
      fontSize: 11,
      fontWeight: 'bold',
      fill: 0x2b2d42,
    });

    const text = new Text({ text: '💬 [E] Xem kệ', style });
    text.anchor.set(0.5);
    this.interactionBubble.addChild(text);

    this.interactionBubble.visible = false;
    this.uiOverlayLayer.addChild(this.interactionBubble);
  }

  private renderTick = (): void => {
    const dt = 1 / 60; // Fixed timestep delta
    this.animTimer += dt;

    // 1. Advance simulation
    this.simulation.update(dt);

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

      const textNode = this.interactionBubble.children[1] as Text;
      if (activeFixture.type === 'cashier_counter') {
        textNode.text = '💰 [E] Thu ngân';
      } else {
        textNode.text = '📦 [E] Xem kệ';
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

import { Texture } from 'pixi.js';
import { createPremiumTexture } from './premium-textures';

/**
 * Procedural Pixel Art Generator for "Tiệm Tạp Hóa Đầu Hẻm"
 * Highly authentic 2D pixel art inspired by Stardew Valley and cozy simulation games.
 * 32x32 tiles, nearest-neighbor scaling, warm nostalgic colors.
 */

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
  }
  return canvas;
}

export class PixelTextureFactory {
  private textures: Map<string, Texture> = new Map();

  public destroy(): void {
    for (const texture of this.textures.values()) texture.destroy(true);
    this.textures.clear();
  }

  /** Canvas thô của một khóa texture, dùng cho ảnh xem trước trong giao diện HTML. */
  public getCanvas(key: string): HTMLCanvasElement {
    return this.createCanvasForKey(key);
  }

  public getTexture(key: string): Texture {
    const existing = this.textures.get(key);
    if (existing) return existing;

    const texture = this.generateTexture(key);
    this.textures.set(key, texture);
    return texture;
  }

  private generateTexture(key: string): Texture {
    const canvas = this.createCanvasForKey(key);
    const texture = Texture.from(canvas);
    texture.source.scaleMode = 'nearest';
    return texture;
  }

  private createCanvasForKey(key: string): HTMLCanvasElement {
    const premium = createPremiumTexture(key);
    if (premium) return premium;
    switch (key) {
      case 'tile_store_floor':
        return this.createStoreFloorTile();
      case 'tile_encaustic':
        return this.createEncausticTile();
      case 'tile_sidewalk':
        return this.createSidewalkTile();
      case 'tile_street':
        return this.createStreetTile();
      case 'tile_pavement_alley':
        return this.createPavementAlleyTile();
      case 'tile_grass_patch':
        return this.createGrassPatchTile();
      case 'tile_yellow_wall':
        return this.createYellowWallTile();
      case 'tile_signboard':
        return this.createSignboardTexture();
      case 'tile_plant_pot':
        return this.createPlantPotTexture();
      case 'deco_lantern':
        return this.createLanternTexture();
      case 'deco_lamp_pole':
        return this.createLampPoleTexture();
      case 'tile_shopping_baskets':
        return this.createBasketsTexture();
      case 'fixture_shelf_wooden':
        return this.createDetailedShelfTexture();
      case 'fixture_cashier':
        return this.createDetailedCashierTexture();
      case 'fixture_refrigerator':
        return this.createRefrigeratorTexture(true);
      case 'fixture_refrigerator_single':
        return this.createRefrigeratorTexture(false);
      case 'bubble_question':
        return this.createQuestionBubbleTexture();
      case 'player_down':
        return this.createPlayerTexture('down');
      case 'player_up':
        return this.createPlayerTexture('up');
      case 'player_left':
        return this.createPlayerTexture('left');
      case 'player_right':
        return this.createPlayerTexture('right');
      case 'customer_down':
        return this.createCustomerTexture();
      case 'item_mi_hao_hao':
        return this.createHaoHaoTexture();
      case 'item_xa_xi':
        return this.createXaXiTexture();
      case 'item_keo_big_babol':
        return this.createBigBabolTexture();
      case 'item_sua_ong_tho':
        return this.createSuaOngThoTexture();
      case 'item_banh_mi_que':
        return this.createBanhMiQueTexture();
      default:
        return this.createFallbackTile();
    }
  }

  /**
   * Supermarket / Grocery floor tile (Matching user reference image)
   * Warm beige/cream tile with soft grid grout
   */
  private createStoreFloorTile(): HTMLCanvasElement {
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d')!;

    // Soft warm tile base
    ctx.fillStyle = '#eee5d6';
    ctx.fillRect(0, 0, 32, 32);

    // Subtle marble/grit variation
    ctx.fillStyle = '#e5dbcb';
    ctx.fillRect(4, 6, 8, 8);
    ctx.fillRect(18, 16, 10, 10);
    ctx.fillStyle = '#f5ede0';
    ctx.fillRect(14, 4, 12, 6);
    ctx.fillRect(2, 20, 8, 8);

    // Grout lines (Crisp 1px pixel border)
    ctx.fillStyle = '#d5c8b5';
    ctx.fillRect(0, 0, 32, 1);
    ctx.fillRect(0, 0, 1, 32);

    return canvas;
  }

  /**
   * Vietnamese flower encaustic floor tile (Gạch bông cổ điển cho cửa ra vào)
   */
  private createEncausticTile(): HTMLCanvasElement {
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#f4ecd8';
    ctx.fillRect(0, 0, 32, 32);

    ctx.fillStyle = '#2d6a4f';
    ctx.fillRect(14, 14, 4, 4);
    ctx.fillRect(2, 2, 5, 5);
    ctx.fillRect(25, 2, 5, 5);
    ctx.fillRect(2, 25, 5, 5);
    ctx.fillRect(25, 25, 5, 5);

    ctx.fillStyle = '#d4a373';
    ctx.fillRect(12, 4, 8, 2);
    ctx.fillRect(12, 26, 8, 2);
    ctx.fillRect(4, 12, 2, 8);
    ctx.fillRect(26, 12, 2, 8);

    ctx.fillStyle = '#c4b59f';
    ctx.fillRect(0, 0, 32, 1);
    ctx.fillRect(0, 0, 1, 32);

    return canvas;
  }

  /**
   * Sidewalk pavement (Vỉa hè xi măng / ngõ phố)
   */
  private createSidewalkTile(): HTMLCanvasElement {
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#c7beaf';
    ctx.fillRect(0, 0, 32, 32);

    ctx.fillStyle = '#b5ab9c';
    for (let i = 0; i < 32; i += 8) {
      ctx.fillRect(i, 0, 1, 32);
      ctx.fillRect(0, i, 32, 1);
    }

    ctx.fillStyle = '#9c9284';
    ctx.fillRect(6, 10, 2, 2);
    ctx.fillRect(22, 22, 2, 2);

    return canvas;
  }

  /**
   * Street asphalt
   */
  private createStreetTile(): HTMLCanvasElement {
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#7a8288';
    ctx.fillRect(0, 0, 32, 32);

    ctx.fillStyle = '#656c72';
    ctx.fillRect(8, 6, 4, 2);
    ctx.fillRect(20, 18, 5, 2);
    ctx.fillRect(6, 24, 3, 2);

    return canvas;
  }

  /**
   * Pavement Alley - Nền gạch con hẻm bê tông sáng màu, sạch sẽ
   */
  private createPavementAlleyTile(): HTMLCanvasElement {
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d')!;

    // Warm concrete ground matching nostalgic Vietnamese alley
    ctx.fillStyle = '#b8aea0';
    ctx.fillRect(0, 0, 32, 32);

    // Subtle stone paver texture
    ctx.fillStyle = '#a99e90';
    ctx.fillRect(0, 0, 32, 1);
    ctx.fillRect(0, 0, 1, 32);

    ctx.fillStyle = '#c5bcaf';
    ctx.fillRect(1, 1, 30, 1);
    ctx.fillRect(1, 1, 1, 30);

    // Natural stone flecks
    ctx.fillStyle = '#9e9384';
    ctx.fillRect(7, 11, 2, 2);
    ctx.fillRect(21, 23, 2, 2);
    ctx.fillRect(17, 7, 2, 1);

    return canvas;
  }

  /**
   * Grass / Moss patch around neighborhood trees
   */
  private createGrassPatchTile(): HTMLCanvasElement {
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#5c7a52';
    ctx.fillRect(0, 0, 32, 32);

    ctx.fillStyle = '#4c6843';
    ctx.fillRect(4, 8, 4, 3);
    ctx.fillRect(18, 16, 5, 3);
    ctx.fillRect(10, 24, 6, 2);

    ctx.fillStyle = '#6e9163';
    ctx.fillRect(12, 6, 3, 2);
    ctx.fillRect(24, 10, 3, 3);
    ctx.fillRect(6, 20, 2, 3);

    return canvas;
  }

  /**
   * Yellow plaster colonial wall
   */
  private createYellowWallTile(): HTMLCanvasElement {
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#f0cf75';
    ctx.fillRect(0, 0, 32, 32);

    ctx.fillStyle = '#ddb455';
    ctx.fillRect(2, 6, 8, 4);
    ctx.fillRect(18, 14, 10, 5);

    // Weathered water stain base
    ctx.fillStyle = '#52796f';
    ctx.fillRect(0, 26, 32, 6);

    // Wooden border trim
    ctx.fillStyle = '#b0893b';
    ctx.fillRect(0, 0, 32, 3);
    ctx.fillRect(0, 25, 32, 1);

    return canvas;
  }

  /**
   * Signboard "TIỆM TẠP HÓA ĐẦU HẺM" (128x32)
   */
  private createSignboardTexture(): HTMLCanvasElement {
    const canvas = createCanvas(128, 32);
    const ctx = canvas.getContext('2d')!;

    // Red lacquer board
    ctx.fillStyle = '#9e1a2b';
    ctx.fillRect(0, 0, 128, 32);

    // Gold carved frame
    ctx.strokeStyle = '#f4a261';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 126, 30);

    // Vietnamese handwritten lettering
    ctx.fillStyle = '#fff3b0';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TIỆM TẠP HÓA ĐẦU HẺM', 64, 16);

    return canvas;
  }

  /**
   * Potted plant for decoration (as seen in the reference image)
   */
  private createPlantPotTexture(): HTMLCanvasElement {
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d')!;

    // Clay pot
    ctx.fillStyle = '#9c5932';
    ctx.fillRect(8, 18, 16, 12);
    ctx.fillStyle = '#7a3e1b';
    ctx.fillRect(6, 16, 20, 4);

    // Green bush foliage
    ctx.fillStyle = '#2d6a4f';
    ctx.beginPath();
    ctx.arc(16, 12, 10, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = '#52b788';
    ctx.fillRect(13, 6, 6, 6);

    return canvas;
  }

  /**
   * Stack of shopping baskets (as seen in the reference image)
   */
  private createBasketsTexture(): HTMLCanvasElement {
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d')!;

    // Stacking metal/plastic blue baskets
    for (let y = 14; y < 28; y += 4) {
      ctx.fillStyle = '#1d3557';
      ctx.fillRect(6, y, 20, 6);
      ctx.fillStyle = '#457b9d';
      ctx.fillRect(8, y + 1, 16, 2);
      ctx.fillStyle = '#e63946'; // handle
      ctx.fillRect(14, y - 2, 4, 2);
    }

    return canvas;
  }

  /**
   * Detailed Store Shelf (64x36) matching the reference image
   * Visible snack packages, drinks, cans, crisp metal/wood tier dividers
   */
  private createDetailedShelfTexture(): HTMLCanvasElement {
    const canvas = createCanvas(64, 38);
    const ctx = canvas.getContext('2d')!;

    // Shelf frame (Dark steel/wood)
    ctx.fillStyle = '#495057';
    ctx.fillRect(2, 2, 60, 34);

    // Shelf tiers (2 levels)
    ctx.fillStyle = '#6c757d';
    ctx.fillRect(4, 4, 56, 14);
    ctx.fillRect(4, 20, 56, 14);

    // Tier shelf ledges
    ctx.fillStyle = '#ced4da';
    ctx.fillRect(2, 16, 60, 3);
    ctx.fillRect(2, 32, 60, 3);

    // Products on Top Tier (Colorful instant noodle boxes & snacks)
    // Red packages (Hảo Hảo)
    ctx.fillStyle = '#d90429';
    ctx.fillRect(6, 6, 9, 10);
    ctx.fillRect(17, 6, 9, 10);
    ctx.fillStyle = '#ffb703';
    ctx.fillRect(8, 9, 5, 4);
    ctx.fillRect(19, 9, 5, 4);

    // Green packages
    ctx.fillStyle = '#2a9d8f';
    ctx.fillRect(28, 6, 9, 10);
    ctx.fillRect(39, 6, 9, 10);

    // Yellow boxes
    ctx.fillStyle = '#f4a261';
    ctx.fillRect(50, 6, 8, 10);

    // Products on Bottom Tier (Drinks & Bottles)
    // Brown soda bottles
    ctx.fillStyle = '#582f0e';
    ctx.fillRect(6, 22, 6, 10);
    ctx.fillRect(14, 22, 6, 10);
    ctx.fillStyle = '#52b788'; // caps
    ctx.fillRect(7, 21, 4, 2);
    ctx.fillRect(15, 21, 4, 2);

    // Pink candy packs (Big Babol)
    ctx.fillStyle = '#f72585';
    ctx.fillRect(23, 24, 8, 8);
    ctx.fillRect(33, 24, 8, 8);

    // Tin cans (Ông Thọ)
    ctx.fillStyle = '#e9ecef';
    ctx.fillRect(43, 23, 7, 9);
    ctx.fillRect(52, 23, 7, 9);
    ctx.fillStyle = '#c1121f';
    ctx.fillRect(43, 26, 7, 4);
    ctx.fillRect(52, 26, 7, 4);

    // Side pillars
    ctx.fillStyle = '#343a40';
    ctx.fillRect(0, 0, 3, 38);
    ctx.fillRect(61, 0, 3, 38);

    return canvas;
  }

  /**
   * Cashier Checkout Counter (64x36) matching reference image
   * Includes computer screen, keyboard, scanner, and cash box
   */
  private createDetailedCashierTexture(): HTMLCanvasElement {
    const canvas = createCanvas(64, 38);
    const ctx = canvas.getContext('2d')!;

    // Modern / vintage grey & wood counter
    ctx.fillStyle = '#adb5bd';
    ctx.fillRect(0, 6, 64, 30);

    // Countertop
    ctx.fillStyle = '#dee2e6';
    ctx.fillRect(0, 6, 64, 12);
    ctx.fillStyle = '#495057';
    ctx.fillRect(0, 16, 64, 2);

    // Register terminal / Screen on left
    ctx.fillStyle = '#212529';
    ctx.fillRect(8, 2, 16, 12);
    ctx.fillStyle = '#38b000'; // green retro pos screen
    ctx.fillRect(10, 4, 12, 6);
    ctx.fillStyle = '#6c757d'; // stand
    ctx.fillRect(14, 14, 4, 4);

    // Keyboard / keypad
    ctx.fillStyle = '#495057';
    ctx.fillRect(8, 14, 12, 4);

    // Wooden Cash Box on right
    ctx.fillStyle = '#6f4e37';
    ctx.fillRect(36, 8, 22, 18);
    ctx.fillStyle = '#966f50';
    ctx.fillRect(38, 10, 18, 6);
    // Keyhole
    ctx.fillStyle = '#ffb703';
    ctx.fillRect(46, 18, 2, 3);

    // Bottom drawers
    ctx.fillStyle = '#6c757d';
    ctx.fillRect(2, 22, 60, 12);
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(14, 26, 10, 2);
    ctx.fillRect(38, 26, 10, 2);

    return canvas;
  }

  /**
   * Cute Stardew-style Question Bubble (?)
   */
  private createRefrigeratorTexture(doubleWide = true): HTMLCanvasElement {
    const width = doubleWide ? 64 : 32;
    const canvas = createCanvas(width, 38);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#3d5456';
    ctx.fillRect(0, 2, width, 36);
    ctx.fillStyle = '#d7e3e5';
    ctx.fillRect(2, 0, width - 4, 35);

    if (doubleWide) {
      for (const dx of [5, 35]) {
        ctx.fillStyle = '#6c8f91';
        ctx.fillRect(dx, 4, 24, 23);
        ctx.fillStyle = '#a9d6d8';
        ctx.fillRect(dx + 2, 6, 20, 19);
        ctx.fillStyle = '#f4ecd8';
        ctx.fillRect(dx + 4, 12, 5, 9);
        ctx.fillRect(dx + 11, 12, 5, 9);
        ctx.fillStyle = '#c1121f';
        ctx.fillRect(dx + 4, 9, 5, 3);
        ctx.fillStyle = '#287c84';
        ctx.fillRect(dx + 11, 9, 5, 3);
      }
      ctx.fillStyle = '#455c5e';
      ctx.fillRect(3, 29, width - 6, 4);
    } else {
      ctx.fillStyle = '#6c8f91';
      ctx.fillRect(5, 4, 22, 23);
      ctx.fillStyle = '#a9d6d8';
      ctx.fillRect(7, 6, 18, 19);
      ctx.fillStyle = '#f4ecd8';
      ctx.fillRect(9, 12, 5, 9);
      ctx.fillRect(18, 12, 5, 9);
      ctx.fillStyle = '#c1121f';
      ctx.fillRect(9, 9, 5, 3);
      ctx.fillStyle = '#287c84';
      ctx.fillRect(18, 9, 5, 3);
      ctx.fillStyle = '#455c5e';
      ctx.fillRect(3, 29, 26, 4);
    }
    return canvas;
  }

  private createQuestionBubbleTexture(): HTMLCanvasElement {
    const canvas = createCanvas(24, 24);
    const ctx = canvas.getContext('2d')!;

    // Circle bubble background
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(12, 11, 9, 0, Math.PI * 2);
    ctx.fill();

    // Dark border
    ctx.strokeStyle = '#2b2d42';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bubble pointer at bottom
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(9, 18);
    ctx.lineTo(12, 23);
    ctx.lineTo(15, 18);
    ctx.fill();

    // Blue Question Mark
    ctx.fillStyle = '#3a86ff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 12, 11);

    return canvas;
  }

  /**
   * Chibi RPG Player Character (Stardew Valley aesthetic)
   */
  private createPlayerTexture(direction: 'down' | 'up' | 'left' | 'right'): HTMLCanvasElement {
    const canvas = createCanvas(32, 36);
    const ctx = canvas.getContext('2d')!;

    // Shadow under feet
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(16, 33, 9, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair (warm chestnut brown)
    ctx.fillStyle = '#5c3d2e';
    if (direction === 'up') {
      ctx.fillRect(9, 2, 14, 12);
      ctx.fillRect(7, 5, 18, 8);
    } else {
      ctx.fillRect(9, 2, 14, 7);
      ctx.fillRect(7, 4, 18, 6);
      // Bangs
      ctx.fillRect(10, 8, 4, 2);
      ctx.fillRect(18, 8, 4, 2);
    }

    // Face / Skin (soft warm peach)
    ctx.fillStyle = '#ffdfba';
    ctx.fillRect(10, 8, 12, 9);

    if (direction === 'down') {
      // Cute anime pixel eyes
      ctx.fillStyle = '#2b2d42';
      ctx.fillRect(12, 11, 2, 3);
      ctx.fillRect(18, 11, 2, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(12, 11, 1, 1);
      ctx.fillRect(18, 11, 1, 1);

      // Blush
      ctx.fillStyle = 'rgba(239, 71, 111, 0.45)';
      ctx.fillRect(10, 14, 3, 2);
      ctx.fillRect(19, 14, 3, 2);

      // Smile
      ctx.fillStyle = '#d90429';
      ctx.fillRect(14, 15, 4, 1);
    } else if (direction === 'left') {
      ctx.fillStyle = '#2b2d42';
      ctx.fillRect(11, 11, 2, 3);
      ctx.fillStyle = 'rgba(239, 71, 111, 0.45)';
      ctx.fillRect(10, 14, 3, 2);
    } else if (direction === 'right') {
      ctx.fillStyle = '#2b2d42';
      ctx.fillRect(19, 11, 2, 3);
      ctx.fillStyle = 'rgba(239, 71, 111, 0.45)';
      ctx.fillRect(19, 14, 3, 2);
    }

    // Shirt (Classic cozy burgundy jacket or blue shirt)
    ctx.fillStyle = '#b7094c';
    ctx.fillRect(9, 17, 14, 9);

    // Inner collar (White tee)
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(13, 17, 6, 4);

    // Hands
    ctx.fillStyle = '#ffdfba';
    if (direction === 'left') {
      ctx.fillRect(7, 21, 3, 4);
    } else if (direction === 'right') {
      ctx.fillRect(22, 21, 3, 4);
    } else {
      ctx.fillRect(6, 21, 3, 4);
      ctx.fillRect(23, 21, 3, 4);
    }

    // Pants (Dark blue jeans)
    ctx.fillStyle = '#1d3557';
    ctx.fillRect(11, 26, 4, 6);
    ctx.fillRect(17, 26, 4, 6);

    // Shoes (Tan boots)
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(10, 32, 5, 2);
    ctx.fillRect(17, 32, 5, 2);

    return canvas;
  }

  // --- Product Sprites ---

  private createHaoHaoTexture(): HTMLCanvasElement {
    const canvas = createCanvas(28, 28);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#d90429';
    ctx.fillRect(2, 4, 24, 20);
    ctx.fillStyle = '#ffb703';
    ctx.fillRect(4, 9, 20, 7);
    ctx.fillStyle = '#fb8500';
    ctx.fillRect(10, 17, 8, 5);
    ctx.strokeStyle = '#590d22';
    ctx.lineWidth = 1;
    ctx.strokeRect(2.5, 4.5, 23, 19);
    return canvas;
  }

  private createXaXiTexture(): HTMLCanvasElement {
    const canvas = createCanvas(28, 28);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#582f0e';
    ctx.fillRect(10, 10, 8, 16);
    ctx.fillRect(12, 4, 4, 6);
    ctx.fillStyle = '#2d6a4f';
    ctx.fillRect(11, 2, 6, 3);
    ctx.fillStyle = '#f4ecd8';
    ctx.fillRect(10, 14, 8, 7);
    ctx.fillStyle = '#1b4332';
    ctx.fillRect(12, 16, 4, 3);
    return canvas;
  }

  private createBigBabolTexture(): HTMLCanvasElement {
    const canvas = createCanvas(28, 28);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f72585';
    ctx.fillRect(3, 8, 22, 12);
    ctx.fillStyle = '#4cc9f0';
    ctx.fillRect(3, 8, 22, 2);
    ctx.fillStyle = '#70e000';
    ctx.fillRect(3, 18, 22, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(11, 12, 6, 4);
    return canvas;
  }

  private createSuaOngThoTexture(): HTMLCanvasElement {
    const canvas = createCanvas(28, 28);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#e5e5e5';
    ctx.fillRect(6, 4, 16, 20);
    ctx.fillStyle = '#c1121f';
    ctx.fillRect(6, 8, 16, 12);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(11, 11, 6, 6);
    ctx.fillStyle = '#adb5bd';
    ctx.fillRect(5, 3, 18, 2);
    ctx.fillRect(5, 23, 18, 2);
    return canvas;
  }

  private createBanhMiQueTexture(): HTMLCanvasElement {
    const canvas = createCanvas(28, 28);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#e09f3e';
    ctx.fillRect(4, 11, 20, 6);
    ctx.fillStyle = '#9e2a2b';
    ctx.fillRect(3, 12, 22, 2);
    ctx.fillStyle = '#540b0e';
    ctx.fillRect(8, 14, 12, 2);
    return canvas;
  }

  /**
   * Red Vietnamese lantern (đèn lồng đỏ) - 20x28 pixels
   */
  private createLanternTexture(): HTMLCanvasElement {
    const canvas = createCanvas(20, 28);
    const ctx = canvas.getContext('2d')!;

    // Hanging string
    ctx.fillStyle = '#5c3a1a';
    ctx.fillRect(9, 0, 2, 6);

    // Top cap (gold)
    ctx.fillStyle = '#ffb703';
    ctx.fillRect(6, 6, 8, 3);

    // Red lantern body
    ctx.fillStyle = '#c1121f';
    ctx.fillRect(4, 9, 12, 14);

    // Vertical ribs
    ctx.fillStyle = '#780000';
    ctx.fillRect(4, 9, 2, 14);
    ctx.fillRect(14, 9, 2, 14);
    ctx.fillRect(9, 9, 2, 14);

    // Bottom cap (gold)
    ctx.fillStyle = '#ffb703';
    ctx.fillRect(6, 23, 8, 3);

    // Tassel
    ctx.fillStyle = '#ffb703';
    ctx.fillRect(9, 26, 2, 2);

    // Highlight
    ctx.fillStyle = '#ff4d6d';
    ctx.fillRect(6, 11, 2, 10);

    return canvas;
  }

  /**
   * Street lamp pole (cột đèn đường) - 16x40 pixels
   */
  private createLampPoleTexture(): HTMLCanvasElement {
    const canvas = createCanvas(16, 40);
    const ctx = canvas.getContext('2d')!;

    // Base
    ctx.fillStyle = '#4d555b';
    ctx.fillRect(4, 36, 8, 4);

    // Pole
    ctx.fillStyle = '#6b7278';
    ctx.fillRect(6, 8, 4, 28);

    // Cross bar
    ctx.fillStyle = '#4d555b';
    ctx.fillRect(2, 6, 12, 2);

    // Lamp head (glowing)
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(5, 0, 6, 6);

    // Glow
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(6, 1, 4, 4);

    return canvas;
  }

  private createCustomerTexture(): HTMLCanvasElement {
    const canvas = createCanvas(32, 36);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#3a2c25';
    ctx.fillRect(10, 2, 12, 7);
    ctx.fillStyle = '#dbab78';
    ctx.fillRect(9, 8, 14, 10);
    ctx.fillStyle = '#2d2725';
    ctx.fillRect(12, 12, 2, 2);
    ctx.fillRect(19, 12, 2, 2);
    ctx.fillStyle = '#3b7790';
    ctx.fillRect(8, 18, 16, 10);
    ctx.fillStyle = '#dbab78';
    ctx.fillRect(5, 20, 3, 7);
    ctx.fillRect(24, 20, 3, 7);
    ctx.fillStyle = '#3d4d5f';
    ctx.fillRect(10, 28, 5, 5);
    ctx.fillRect(18, 28, 5, 5);
    ctx.fillStyle = '#49382c';
    ctx.fillRect(9, 33, 7, 2);
    ctx.fillRect(17, 33, 7, 2);
    return canvas;
  }

  private createFallbackTile(): HTMLCanvasElement {
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#999999';
    ctx.fillRect(0, 0, 32, 32);
    return canvas;
  }
}

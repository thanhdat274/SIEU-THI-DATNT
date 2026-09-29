import { Texture, TextureSource } from 'pixi.js';

/**
 * Procedural Pixel Art Generator for "Tiệm Tạp Hóa Đầu Hẻm"
 * Produces crisp, authentic 90s Vietnamese textures at 32x32 resolution with nearest-neighbor scaling.
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
    switch (key) {
      case 'tile_encaustic':
        return this.createEncausticTile();
      case 'tile_sidewalk':
        return this.createSidewalkTile();
      case 'tile_street':
        return this.createStreetTile();
      case 'tile_yellow_wall':
        return this.createYellowWallTile();
      case 'tile_signboard':
        return this.createSignboardTexture();
      case 'fixture_shelf_wooden':
        return this.createWoodenShelfTexture();
      case 'fixture_cashier':
        return this.createCashierTexture();
      case 'player_down':
        return this.createPlayerTexture('down');
      case 'player_up':
        return this.createPlayerTexture('up');
      case 'player_left':
        return this.createPlayerTexture('left');
      case 'player_right':
        return this.createPlayerTexture('right');
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
   * Classic Vietnamese flower encaustic floor tile (Gạch bông hoa văn cổ điển)
   */
  private createEncausticTile(): HTMLCanvasElement {
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d')!;

    // Creamy white background
    ctx.fillStyle = '#f4ecd8';
    ctx.fillRect(0, 0, 32, 32);

    // Dark teal floral pattern
    ctx.fillStyle = '#2d6a4f';
    // Center diamond
    ctx.fillRect(14, 14, 4, 4);

    // Corner petals
    ctx.fillRect(2, 2, 6, 6);
    ctx.fillRect(24, 2, 6, 6);
    ctx.fillRect(2, 24, 6, 6);
    ctx.fillRect(24, 24, 6, 6);

    // Mustard yellow accents
    ctx.fillStyle = '#d4a373';
    ctx.fillRect(12, 4, 8, 2);
    ctx.fillRect(12, 26, 8, 2);
    ctx.fillRect(4, 12, 2, 8);
    ctx.fillRect(26, 12, 2, 8);

    // Subtle grout line
    ctx.strokeStyle = '#c4b59f';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, 31, 31);

    return canvas;
  }

  /**
   * Sidewalk pavement (Vỉa hè xi măng / lát đá ngõ phố)
   */
  private createSidewalkTile(): HTMLCanvasElement {
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#b8b2a6';
    ctx.fillRect(0, 0, 32, 32);

    // Diagonal texture accents
    ctx.fillStyle = '#a69f92';
    for (let i = 0; i < 32; i += 8) {
      ctx.fillRect(i, 0, 1, 32);
      ctx.fillRect(0, i, 32, 1);
    }

    ctx.fillStyle = '#8f887b';
    ctx.fillRect(4, 8, 2, 2);
    ctx.fillRect(18, 20, 2, 2);
    ctx.fillRect(26, 10, 2, 2);

    return canvas;
  }

  /**
   * Street asphalt (Đường hẻm bê tông)
   */
  private createStreetTile(): HTMLCanvasElement {
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#6c757d';
    ctx.fillRect(0, 0, 32, 32);

    // Gravel noise
    ctx.fillStyle = '#5a6268';
    ctx.fillRect(6, 4, 3, 2);
    ctx.fillRect(20, 14, 4, 2);
    ctx.fillRect(10, 24, 3, 2);
    ctx.fillRect(26, 26, 2, 2);

    ctx.fillStyle = '#7d858c';
    ctx.fillRect(14, 8, 2, 2);
    ctx.fillRect(4, 18, 2, 2);

    return canvas;
  }

  /**
   * Yellow plaster colonial wall (Tường vôi vàng truyền thống)
   */
  private createYellowWallTile(): HTMLCanvasElement {
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d')!;

    // Rich vintage golden yellow
    ctx.fillStyle = '#e9c46a';
    ctx.fillRect(0, 0, 32, 32);

    // Weathered plaster stains
    ctx.fillStyle = '#d4a34b';
    ctx.fillRect(2, 6, 8, 4);
    ctx.fillRect(18, 14, 10, 5);

    // Bottom dark moisture base
    ctx.fillStyle = '#52796f';
    ctx.fillRect(0, 26, 32, 6);

    // Top trim / cornice
    ctx.fillStyle = '#b0893b';
    ctx.fillRect(0, 0, 32, 3);

    return canvas;
  }

  /**
   * Grocery Store Signboard (Bảng hiệu "TIỆM TẠP HÓA ĐẦU HẺM")
   */
  private createSignboardTexture(): HTMLCanvasElement {
    const canvas = createCanvas(128, 32);
    const ctx = canvas.getContext('2d')!;

    // Red lacquered wooden board
    ctx.fillStyle = '#b7094c';
    ctx.fillRect(0, 0, 128, 32);

    // Golden frame
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 126, 30);

    // Vietnamese handwritten style text
    ctx.fillStyle = '#fff3b0';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TIỆM TẠP HÓA ĐẦU HẺM', 64, 16);

    return canvas;
  }

  /**
   * Wooden Grocery Shelf (2x1 tiles = 64x32)
   */
  private createWoodenShelfTexture(): HTMLCanvasElement {
    const canvas = createCanvas(64, 32);
    const ctx = canvas.getContext('2d')!;

    // Wood frame
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, 0, 64, 32);

    // Inner shelf tiers
    ctx.fillStyle = '#a06535';
    ctx.fillRect(4, 4, 56, 10);
    ctx.fillRect(4, 18, 56, 10);

    // Shelf dividers & borders
    ctx.fillStyle = '#5c3818';
    ctx.fillRect(0, 0, 64, 2);
    ctx.fillRect(0, 15, 64, 2);
    ctx.fillRect(0, 30, 64, 2);
    ctx.fillRect(0, 0, 3, 32);
    ctx.fillRect(61, 0, 3, 32);
    ctx.fillRect(31, 2, 2, 28);

    // Shelved items details (red & green packages)
    ctx.fillStyle = '#e63946';
    ctx.fillRect(6, 6, 8, 7);
    ctx.fillRect(16, 6, 8, 7);
    ctx.fillRect(36, 6, 8, 7);
    ctx.fillRect(46, 6, 8, 7);

    ctx.fillStyle = '#2a9d8f';
    ctx.fillRect(8, 20, 6, 8);
    ctx.fillRect(18, 20, 6, 8);
    ctx.fillRect(38, 20, 6, 8);
    ctx.fillRect(48, 20, 6, 8);

    return canvas;
  }

  /**
   * Cashier counter with register and cash drawer (64x32)
   */
  private createCashierTexture(): HTMLCanvasElement {
    const canvas = createCanvas(64, 32);
    const ctx = canvas.getContext('2d')!;

    // Dark polished wood countertop
    ctx.fillStyle = '#6f4e37';
    ctx.fillRect(0, 0, 64, 32);

    ctx.fillStyle = '#966f50';
    ctx.fillRect(2, 2, 60, 14);

    // Cashier Register / Calculator
    ctx.fillStyle = '#343a40';
    ctx.fillRect(8, 5, 16, 12);

    // Register screen & keys
    ctx.fillStyle = '#52b788';
    ctx.fillRect(10, 7, 12, 4);
    ctx.fillStyle = '#adb5bd';
    ctx.fillRect(10, 12, 12, 3);

    // Wooden Cash box / Drawer on the right
    ctx.fillStyle = '#583101';
    ctx.fillRect(36, 6, 22, 18);
    ctx.fillStyle = '#dda15e';
    ctx.fillRect(38, 8, 18, 6);
    // Keyhole / lock
    ctx.fillStyle = '#ffb703';
    ctx.fillRect(46, 16, 2, 4);

    // Bottom drawers
    ctx.fillStyle = '#4a2c13';
    ctx.fillRect(2, 20, 60, 10);
    ctx.fillStyle = '#d4a373';
    ctx.fillRect(14, 24, 8, 2);
    ctx.fillRect(42, 24, 8, 2);

    return canvas;
  }

  /**
   * Player Character Sprite (Cô Năm / Chủ Tiệm)
   */
  private createPlayerTexture(direction: 'down' | 'up' | 'left' | 'right'): HTMLCanvasElement {
    const canvas = createCanvas(32, 40);
    const ctx = canvas.getContext('2d')!;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(16, 36, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#212529';
    if (direction === 'up') {
      ctx.fillRect(10, 2, 12, 12);
      ctx.fillRect(8, 4, 16, 8);
    } else {
      ctx.fillRect(10, 2, 12, 6);
      ctx.fillRect(8, 4, 16, 6);
    }

    // Face / Skin
    ctx.fillStyle = '#ffd1a4';
    ctx.fillRect(11, 8, 10, 8);

    if (direction === 'down') {
      // Eyes & smile
      ctx.fillStyle = '#212529';
      ctx.fillRect(13, 11, 2, 2);
      ctx.fillRect(17, 11, 2, 2);
      ctx.fillStyle = '#e76f51';
      ctx.fillRect(14, 14, 4, 1);
    } else if (direction === 'left') {
      ctx.fillStyle = '#212529';
      ctx.fillRect(12, 11, 2, 2);
    } else if (direction === 'right') {
      ctx.fillStyle = '#212529';
      ctx.fillRect(18, 11, 2, 2);
    }

    // Shirt (Vintage teal polo / blouse)
    ctx.fillStyle = '#1d3557';
    ctx.fillRect(9, 16, 14, 12);

    // Collar / Apron (Yellow-cream)
    ctx.fillStyle = '#f1faee';
    ctx.fillRect(12, 16, 8, 8);

    // Hands
    ctx.fillStyle = '#ffd1a4';
    if (direction === 'left') {
      ctx.fillRect(7, 20, 3, 5);
    } else if (direction === 'right') {
      ctx.fillRect(22, 20, 3, 5);
    } else {
      ctx.fillRect(6, 20, 3, 5);
      ctx.fillRect(23, 20, 3, 5);
    }

    // Pants (Dark navy / black trousers)
    ctx.fillStyle = '#2b2d42';
    ctx.fillRect(11, 28, 4, 8);
    ctx.fillRect(17, 28, 4, 8);

    // Sandals / Shoes (Dép lào / dép tổ ong)
    ctx.fillStyle = '#8d99ae';
    ctx.fillRect(10, 36, 5, 2);
    ctx.fillRect(17, 36, 5, 2);

    return canvas;
  }

  // --- Product Sprites ---

  private createHaoHaoTexture(): HTMLCanvasElement {
    const canvas = createCanvas(28, 28);
    const ctx = canvas.getContext('2d')!;
    // Iconic Red Hảo Hảo packaging
    ctx.fillStyle = '#d90429';
    ctx.fillRect(2, 4, 24, 20);
    // Yellow banner
    ctx.fillStyle = '#ffb703';
    ctx.fillRect(4, 9, 20, 7);
    // Shrimp pink illustration
    ctx.fillStyle = '#fb8500';
    ctx.fillRect(10, 17, 8, 5);
    // Dark outline
    ctx.strokeStyle = '#590d22';
    ctx.lineWidth = 1;
    ctx.strokeRect(2.5, 4.5, 23, 19);
    return canvas;
  }

  private createXaXiTexture(): HTMLCanvasElement {
    const canvas = createCanvas(28, 28);
    const ctx = canvas.getContext('2d')!;
    // Brown glass bottle body
    ctx.fillStyle = '#582f0e';
    ctx.fillRect(10, 10, 8, 16);
    // Neck
    ctx.fillRect(12, 4, 4, 6);
    // Green cap
    ctx.fillStyle = '#2d6a4f';
    ctx.fillRect(11, 2, 6, 3);
    // White/green label
    ctx.fillStyle = '#f4ecd8';
    ctx.fillRect(10, 14, 8, 7);
    ctx.fillStyle = '#1b4332';
    ctx.fillRect(12, 16, 4, 3);
    return canvas;
  }

  private createBigBabolTexture(): HTMLCanvasElement {
    const canvas = createCanvas(28, 28);
    const ctx = canvas.getContext('2d')!;
    // Hot pink watermelon wrapper
    ctx.fillStyle = '#f72585';
    ctx.fillRect(3, 8, 22, 12);
    // Green border like watermelon rind
    ctx.fillStyle = '#4cc9f0';
    ctx.fillRect(3, 8, 22, 2);
    ctx.fillStyle = '#70e000';
    ctx.fillRect(3, 18, 22, 2);
    // Bubble
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(11, 12, 6, 4);
    return canvas;
  }

  private createSuaOngThoTexture(): HTMLCanvasElement {
    const canvas = createCanvas(28, 28);
    const ctx = canvas.getContext('2d')!;
    // Can body
    ctx.fillStyle = '#e5e5e5';
    ctx.fillRect(6, 4, 16, 20);
    // Red label band
    ctx.fillStyle = '#c1121f';
    ctx.fillRect(6, 8, 16, 12);
    // Yellow star / icon
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(11, 11, 6, 6);
    // Tin rim
    ctx.fillStyle = '#adb5bd';
    ctx.fillRect(5, 3, 18, 2);
    ctx.fillRect(5, 23, 18, 2);
    return canvas;
  }

  private createBanhMiQueTexture(): HTMLCanvasElement {
    const canvas = createCanvas(28, 28);
    const ctx = canvas.getContext('2d')!;
    // Golden crispy baguette stick
    ctx.fillStyle = '#e09f3e';
    ctx.fillRect(4, 11, 20, 6);
    // Baked crust edges
    ctx.fillStyle = '#9e2a2b';
    ctx.fillRect(3, 12, 22, 2);
    // Pate filling hint
    ctx.fillStyle = '#540b0e';
    ctx.fillRect(8, 14, 12, 2);
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

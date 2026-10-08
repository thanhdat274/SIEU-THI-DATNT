import { GameTileMap, StoreFixture, TILE_SIZE, Vector2D, tileIndex, tileInMap } from '@game/shared';
import { hiddenDecorLotIds, hitsNeighborhood, isFenceTile, streetLampBoxes } from '@game/data';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const LAMP_BOXES = streetLampBoxes();

export class CollisionSystem {
  private tileMap: GameTileMap;
  private fixtures: StoreFixture[];
  /** Nhà trang trí đã bị đợt khai hoang gỡ: không còn chặn người chơi (land-reclamation 1.3). */
  private hiddenLotIds: ReadonlySet<string> | undefined;

  constructor(tileMap: GameTileMap, fixtures: StoreFixture[]) {
    this.tileMap = tileMap;
    this.fixtures = fixtures;
  }

  public updateFixtures(fixtures: StoreFixture[]): void {
    this.fixtures = fixtures;
  }

  public setOpenedWaves(openedWaves: readonly string[]): void {
    const hidden = hiddenDecorLotIds(openedWaves);
    this.hiddenLotIds = hidden.size > 0 ? hidden : undefined;
  }

  public updateTileMap(tileMap: GameTileMap): void {
    this.tileMap = tileMap;
  }

  /**
   * Check if a proposed bounding box collides with the map boundaries, solid tiles, or fixtures.
   */
  public isColliding(box: BoundingBox): boolean {
    const leftTile = Math.floor(box.x / TILE_SIZE);
    const rightTile = Math.floor((box.x + box.width - 0.001) / TILE_SIZE);
    const topTile = Math.floor(box.y / TILE_SIZE);
    const bottomTile = Math.floor((box.y + box.height - 0.001) / TILE_SIZE);

    // 1. Check tile map limits and collision layer
    for (let ty = topTile; ty <= bottomTile; ty++) {
      for (let tx = leftTile; tx <= rightTile; tx++) {
        // Outside map is solid
        if (!tileInMap(this.tileMap, tx, ty)) {
          return true;
        }

        const idx = tileIndex(this.tileMap, tx, ty);
        if (this.tileMap.collisionLayer[idx]) {
          return true;
        }
      }
    }

    // 1b. Chân cột đèn đường (hộp hẹp, không chặn cả ô)
    for (const lamp of LAMP_BOXES) {
      if (this.boxesIntersect(box, lamp)) return true;
    }

    // 2. Check collision against fixtures (so trực tiếp, không tạo hộp mới: hàm này chạy hàng trăm lần mỗi lần tìm đường/lách góc)
    const boxRight = box.x + box.width;
    const boxBottom = box.y + box.height;
    for (const fix of this.fixtures) {
      const left = fix.tileX * TILE_SIZE;
      const top = fix.tileY * TILE_SIZE;
      if (boxRight <= left || boxBottom <= top) continue;
      const rotated = fix.rotation === 90 || fix.rotation === 270; // cùng quy ước với getFixtureDimensions
      if (box.x < left + (rotated ? fix.heightTiles : fix.widthTiles) * TILE_SIZE && box.y < top + (rotated ? fix.widthTiles : fix.heightTiles) * TILE_SIZE) return true;
    }

    return false;
  }

  /**
   * Va chạm của nhân vật người chơi: như `isColliding` nhưng viền ngoài bản đồ ô không còn là tường (đi ra được khu phố),
   * còn phần ngoài bản đồ ô dùng vật cản khu phố (nhà, trường, công viên, hàng rào, cây, cột đèn) và biên khu phố.
   * Khách, nhân viên và A* vẫn dùng `isColliding` (không ra khỏi bản đồ ô).
   */
  public isCollidingPlayer(box: BoundingBox): boolean {
    const leftTile = Math.floor(box.x / TILE_SIZE);
    const rightTile = Math.floor((box.x + box.width - 0.001) / TILE_SIZE);
    const topTile = Math.floor(box.y / TILE_SIZE);
    const bottomTile = Math.floor((box.y + box.height - 0.001) / TILE_SIZE);
    const wallLayer = this.tileMap.layers.find((l) => l.name === 'walls');
    const originX = this.tileMap.originTileX ?? 0;
    const originY = this.tileMap.originTileY ?? 0;
    for (let ty = topTile; ty <= bottomTile; ty++) {
      for (let tx = leftTile; tx <= rightTile; tx++) {
        if (!tileInMap(this.tileMap, tx, ty)) continue; // ngoài bản đồ ô: xét vật cản khu phố bên dưới
        const localX = tx - originX;
        const localY = ty - originY;
        const idx = tileIndex(this.tileMap, tx, ty);
        if (!this.tileMap.collisionLayer[idx]) continue;
        const ring = localX === 0 || localX === this.tileMap.width - 1 || localY === 0 || localY === this.tileMap.height - 1;
        // Ô viền chỉ là tường giữ chân khách; viền không có tường/cây/hàng rào thì người chơi bước qua được.
        if (ring && !(wallLayer && wallLayer.data[idx]) && !isFenceTile(tx, ty, this.tileMap.width)) continue;
        return true;
      }
    }
    for (const lamp of LAMP_BOXES) if (this.boxesIntersect(box, lamp)) return true;
    const boxRight = box.x + box.width;
    const boxBottom = box.y + box.height;
    for (const fix of this.fixtures) {
      const left = fix.tileX * TILE_SIZE;
      const top = fix.tileY * TILE_SIZE;
      if (boxRight <= left || boxBottom <= top) continue;
      const rotated = fix.rotation === 90 || fix.rotation === 270;
      if (box.x < left + (rotated ? fix.heightTiles : fix.widthTiles) * TILE_SIZE && box.y < top + (rotated ? fix.widthTiles : fix.heightTiles) * TILE_SIZE) return true;
    }
    return hitsNeighborhood(box, this.hiddenLotIds);
  }

  /**
   * Attempt movement with axis-aligned sliding and corner assist (smooth navigation past fixtures)
   */
  public resolveMovement(currentPos: Vector2D, velocity: Vector2D, dt: number): Vector2D {
    if (velocity.x === 0 && velocity.y === 0) return currentPos;

    // Player collision box is 14px wide, 8px high positioned at character feet
    // Anchor at feet: box spans [currentPos.x - 7 .. currentPos.x + 7], [currentPos.y - 8 .. currentPos.y]
    const boxWidth = 14;
    const boxHeight = 8;
    const offsetX = -boxWidth / 2;
    const offsetY = -boxHeight;

    const canMove = (x: number, y: number): boolean => !this.isCollidingPlayer({
      x: x + offsetX,
      y: y + offsetY,
      width: boxWidth,
      height: boxHeight,
    });

    // Trượt từng trục, tiến sát vật cản (không dừng cách xa một khe) để không bị khựng.
    const advance = (x: number, y: number, dx: number, dy: number): Vector2D => {
      if (dx === 0 && dy === 0) return { x, y };
      if (canMove(x + dx, y + dy)) return { x: x + dx, y: y + dy };
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 5; i++) {
        const mid = (lo + hi) / 2;
        if (canMove(x + dx * mid, y + dy * mid)) lo = mid; else hi = mid;
      }
      return { x: x + dx * lo, y: y + dy * lo };
    };

    const dx = velocity.x * dt;
    const dy = velocity.y * dt;
    let pos = advance(currentPos.x, currentPos.y, dx, 0);
    pos = advance(pos.x, pos.y, 0, dy);

    // Hỗ trợ góc: đi thẳng mà bị chặn thì lách ngang/dọc tới mép vật cản gần nhất.
    const movedX = Math.abs(pos.x - currentPos.x);
    const movedY = Math.abs(pos.y - currentPos.y);
    const speed = Math.hypot(dx, dy);
    if (Math.abs(dy) > 0 && Math.abs(dx) < 0.01 && movedY < Math.abs(dy) * 0.5) {
      for (let offset = 1; offset <= 8; offset++) {
        if (canMove(pos.x + offset, currentPos.y + dy)) return advance(pos.x, pos.y, Math.min(offset, speed), 0);
        if (canMove(pos.x - offset, currentPos.y + dy)) return advance(pos.x, pos.y, -Math.min(offset, speed), 0);
      }
    } else if (Math.abs(dx) > 0 && Math.abs(dy) < 0.01 && movedX < Math.abs(dx) * 0.5) {
      for (let offset = 1; offset <= 8; offset++) {
        if (canMove(currentPos.x + dx, pos.y + offset)) return advance(pos.x, pos.y, 0, Math.min(offset, speed));
        if (canMove(currentPos.x + dx, pos.y - offset)) return advance(pos.x, pos.y, 0, -Math.min(offset, speed));
      }
    }
    return pos;
  }

  private boxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }
}

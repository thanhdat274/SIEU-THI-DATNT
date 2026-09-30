import { GameTileMap, StoreFixture, TILE_SIZE, Vector2D } from '@game/shared';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class CollisionSystem {
  private tileMap: GameTileMap;
  private fixtures: StoreFixture[];

  constructor(tileMap: GameTileMap, fixtures: StoreFixture[]) {
    this.tileMap = tileMap;
    this.fixtures = fixtures;
  }

  public updateFixtures(fixtures: StoreFixture[]): void {
    this.fixtures = fixtures;
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
        const localY=ty-(this.tileMap.originTileY??0);
        if (tx < 0 || tx >= this.tileMap.width || localY < 0 || localY >= this.tileMap.height) {
          return true;
        }

        const idx = localY * this.tileMap.width + tx;
        if (this.tileMap.collisionLayer[idx]) {
          return true;
        }
      }
    }

    // 2. Check collision against fixtures
    for (const fix of this.fixtures) {
      const fixBox: BoundingBox = {
        x: fix.tileX * TILE_SIZE,
        y: fix.tileY * TILE_SIZE,
        width: fix.widthTiles * TILE_SIZE,
        height: fix.heightTiles * TILE_SIZE,
      };

      if (this.boxesIntersect(box, fixBox)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Attempt movement with axis-aligned sliding (move X then move Y independently)
   */
  public resolveMovement(currentPos: Vector2D, velocity: Vector2D, dt: number): Vector2D {
    // Player collision box is 20px wide, 14px high positioned at character feet
    const boxWidth = 20;
    const boxHeight = 14;
    const offsetX = -boxWidth / 2;
    const offsetY = -4; // bottom anchor

    let nextX = currentPos.x + velocity.x * dt;
    let nextY = currentPos.y + velocity.y * dt;

    // Test X movement
    const testBoxX: BoundingBox = {
      x: nextX + offsetX,
      y: currentPos.y + offsetY,
      width: boxWidth,
      height: boxHeight,
    };
    if (this.isColliding(testBoxX)) {
      nextX = currentPos.x;
    }

    // Test Y movement
    const testBoxY: BoundingBox = {
      x: nextX + offsetX,
      y: nextY + offsetY,
      width: boxWidth,
      height: boxHeight,
    };
    if (this.isColliding(testBoxY)) {
      nextY = currentPos.y;
    }

    return { x: nextX, y: nextY };
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

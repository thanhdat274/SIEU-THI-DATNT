import { ALL_PRODUCTS } from '@game/data';
import { SaveGameData, Product } from '@game/shared';

/**
 * Server REST API Endpoints Contract (Phase 0 & 1 Architecture Foundation)
 * Ready for NestJS Controller integration in Phase 7.
 *
 * GET /api/v1/me
 * GET /api/v1/game/save
 * PUT /api/v1/game/save
 * GET /api/v1/game/profile
 * GET /api/v1/game/catalog
 * GET /api/v1/game/config
 */

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

export class GameApiController {
  public getCatalog(): ApiResponse<Product[]> {
    return {
      statusCode: 200,
      message: 'Lấy danh mục hàng hóa thành công',
      data: ALL_PRODUCTS,
      timestamp: new Date().toISOString(),
    };
  }

  public validateSave(save: SaveGameData): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!save.player || !save.player.name) {
      errors.push('Thiếu thông tin người chơi');
    }
    if (save.player && save.player.money < 0) {
      errors.push('Số tiền không hợp lệ');
    }
    if (!save.storeLayout || !Array.isArray(save.storeLayout.fixtures)) {
      errors.push('Thiếu cấu trúc cửa hàng');
    }
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

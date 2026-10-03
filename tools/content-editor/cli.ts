import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ALL_PRODUCTS, DECOR, FIXTURE_SHOP, PRODUCED_PRODUCTS, RECIPES, SEASON_EVENTS, STALLS, STORY_CHAPTERS } from '@game/data';
import { validateContent } from './validate';

const USAGE = `Công cụ nội dung (chỉ đọc, không sửa dữ liệu game)
  validate            Kiểm tra chéo catalog/công thức/quầy/cốt truyện/mùa/trang trí; thoát mã 1 nếu có lỗi
  export [thư_mục]    Xuất dữ liệu ra JSON để xem/so sánh (mặc định: tools/content-editor/out)
  summary             In số lượng từng nhóm`;

function main(argv: string[]): number {
  const [command, arg] = argv;
  if (command === 'validate') {
    const errors = validateContent();
    if (errors.length) {
      console.error(`Có ${errors.length} lỗi nội dung:`);
      for (const error of errors) console.error(`  - ${error}`);
      return 1;
    }
    console.log('Nội dung hợp lệ.');
    return 0;
  }
  if (command === 'export') {
    const dir = resolve(arg ?? join('tools', 'content-editor', 'out'));
    mkdirSync(dir, { recursive: true });
    const files: Record<string, unknown> = {
      'products.json': ALL_PRODUCTS, 'produced-products.json': PRODUCED_PRODUCTS, 'recipes.json': RECIPES, 'fixtures.json': FIXTURE_SHOP,
      'stalls.json': STALLS, 'story.json': STORY_CHAPTERS, 'seasons.json': SEASON_EVENTS, 'decor.json': DECOR,
    };
    for (const [name, data] of Object.entries(files)) writeFileSync(join(dir, name), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    console.log(`Đã xuất ${Object.keys(files).length} file vào ${dir}`);
    return 0;
  }
  if (command === 'summary') {
    console.log(`Sản phẩm: ${ALL_PRODUCTS.length} (+${PRODUCED_PRODUCTS.length} tự sản xuất) · công thức: ${RECIPES.length} · nội thất: ${FIXTURE_SHOP.length} · quầy: ${STALLS.length} · chương: ${STORY_CHAPTERS.length} · mùa: ${SEASON_EVENTS.length} · trang trí: ${DECOR.length}`);
    return 0;
  }
  console.error(USAGE);
  return command ? 2 : 0;
}

process.exitCode = main(process.argv.slice(2));

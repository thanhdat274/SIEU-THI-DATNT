// Sprite ma trận ký tự lấy từ dự án tham khảo tap-hoa-dau-hem (cùng chủ dự án).
/**
 * Pixel art vẽ bằng ma trận ký tự: mỗi ký tự là một điểm ảnh theo bảng màu PALETTE, "." là trong suốt.
 * Thay đổi hình chỉ cần sửa chuỗi, không phải sửa code vẽ.
 */

export const PALETTE: Record<string, number> = {
  k: 0x2b1d14, // viền
  w: 0xffffff,
  W: 0xd9d9d9,
  g: 0x9e9e9e,
  r: 0xd84a3a,
  R: 0xa83226,
  y: 0xf4c542,
  Y: 0xc9962a,
  o: 0xf28c28,
  b: 0x8b5a2b,
  B: 0x5a3a22,
  c: 0xf6e3c4,
  t: 0xd9a066,
  e: 0xb5651d,
  l: 0x81d4fa,
  L: 0x3b82c4,
  n: 0x3aa35b,
  N: 0x2a7a43,
  p: 0xf06292,
  s: 0xb0bec5, // thép sáng
  S: 0x78909c, // thép tối
  i: 0xe1f5fe, // kính lạnh
  d: 0x4a4a4a, // xám đậm
  v: 0xa070d0, // tím
  V: 0x6a3d9a, // tím đậm
  q: 0xf8c8d8, // hồng nhạt
};

export type Sprite = readonly string[];

/** Trả về danh sách lỗi của một sprite (kích thước, ký tự lạ). */
export function validateSprite(rows: Sprite, size = 16, height = size): string[] {
  const errors: string[] = [];
  if (rows.length !== height) errors.push(`có ${rows.length} dòng, cần ${height}`);
  rows.forEach((row, y) => {
    if (row.length !== size) errors.push(`dòng ${y} dài ${row.length}, cần ${size}`);
    for (const ch of row) if (ch !== '.' && !(ch in PALETTE)) errors.push(`dòng ${y} có ký tự lạ "${ch}"`);
  });
  return errors;
}


/** Nội thất nhìn chính diện; kích thước khớp footprint (1 ô = 16 điểm ảnh). */
function makeFridgeSprite(width: number, height: number, single: boolean): Sprite {
  const pixels = Array.from({ length: height }, () => Array(width).fill('.')) as string[][];
  const rect = (x: number, y: number, w: number, h: number, fill: string, border?: string) => {
    for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) {
      pixels[py][px] = border && (px === x || px === x + w - 1 || py === y || py === y + h - 1) ? border : fill;
    }
  };
  if (single) {
    rect(4, 0, 8, 2, 'L', 'k');
    rect(2, 2, 12, 13, 'L', 'k');
    rect(3, 3, 10, 9, 'i', 'S');
    rect(11, 6, 1, 4, 's');
    rect(3, 12, 10, 2, 'S', 'k');
    rect(4, 15, 3, 1, 'g');
    rect(9, 15, 3, 1, 'g');
  } else {
    rect(6, 0, 20, 3, 'L', 'k');
    rect(2, 2, 28, 12, 'L', 'k');
    rect(3, 4, 12, 8, 'i', 'S');
    rect(17, 4, 12, 8, 'i', 'S');
    rect(15, 3, 2, 10, 'S', 'k');
    rect(14, 7, 1, 3, 's');
    rect(17, 7, 1, 3, 's');
    rect(4, 6, 10, 1, 'W');
    rect(18, 6, 10, 1, 'W');
    rect(4, 9, 10, 1, 'W');
    rect(18, 9, 10, 1, 'W');
    rect(2, 14, 28, 1, 'g', 'k');
    rect(5, 15, 4, 1, 'S');
    rect(23, 15, 4, 1, 'S');
  }
  return pixels.map((row) => row.join(''));
}

export const FURNITURE_SPRITES: Record<string, Sprite> = {
  shelf: [
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    'kttttttttttttttttttttttttttttttk',
    'keccccccccccccccccccccccccccccek',
    'keckrckyckncklckpckockLckyckrcek',
    'kecrrcyycnncllcppcoocLLcyycrrcek',
    'kecrrcyycnncllcppcoocLLcyycrrcek',
    'kecrrcyycnncllcppcoocLLcyycrrcek',
    'kBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBk',
    'keccccccccccccccccccccccccccccek',
    'kecwwcwwcwwcwwcwwcwwcwwcwwcwwcek',
    'kecrrcyycLLcoocppcllcnncyycrrcek',
    'kecrrcyycLLcoocppcllcnncyycrrcek',
    'kecrrcyycLLcoocppcllcnncyycrrcek',
    'kBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBk',
    'kkkeeeeeeeeeeeeeeeeeeeeeeeeeekkk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  ],
  fridge: makeFridgeSprite(32, 16, false),
  fridge_single: makeFridgeSprite(16, 16, true),
  freezer: [
    '.SSSSSSSSSSSSSSSSSSSSSSSSSSSSSS.',
    '.SiwiiiiwiiiiwiiiiwiiiiwiiiiwiS.',
    '.SippiyyillioowppirriwwinniiiwS.',
    'kSippiyyilliooippirriwwinniiiiSk',
    'kSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSk',
    'kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk',
    'kwLLLLLLLLLLLLLLLLLLLLLLLLLLLLwk',
    'kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk',
    'kwwllllllllllllllllllllllllllwwk',
    'kwwllllllllllwwwwwwllllllllllwwk',
    'kwwllllllllllwLLLLwllllllllllwwk',
    'kwwllllllllllwwwwwwllllllllllwwk',
    'kwwllllllllllllllllllllllllllwwk',
    'kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk',
    'kggggggggggggggggggggggggggggggk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  ],
  storage_rack: [
    '.S............S.',
    '.S............S.',
    '.S.kkkk...kkkkS.',
    '.S.kbbbk.ktttkS.',
    '.S.kbYbk.ktYtkS.',
    '.S.kkkk...kkkkS.',
    '.ssssssssssssss.',
    '.S.kkkk...kkkkS.',
    '.S.ktttk.kbbbkS.',
    '.S.ktYtk.kbYbkS.',
    '.S.kkkk...kkkkS.',
    '.ssssssssssssss.',
    '.S.kkkk...kkkkS.',
    '.S.kbbbk.ktttkS.',
    '.S.kbYbk.ktYtkS.',
    '.S.kkkk...kkkkS.',
  ],
  counter: [
    '..................kkkkkkkkkkk...',
    '..................knnnnnnnnnk...',
    '..................knnnnnnnnnk...',
    '....yyy...........kgggggggggk...',
    '...yyyyy..........kgwgwgwgwgk...',
    '...yyyyy..........kkkkkkkkkkk...',
    'kttttttttttttttttttttttttttttttk',
    'kttttttttttttttttttttttttttttttk',
    'kbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbk',
    'kbbbBbbbbbBbbbbbBbbbbbBbbbbbBbbk',
    'kbbbBbbbbbBbbbbbBbbbbbBbbbbbBbbk',
    'kbbbBbbbbbBbbbbbBbbbbbBbbbbbBbbk',
    'kbbbBbbbbbBbbbbbBbbbbbBbbbbbBbbk',
    'kbbbBbbbbbBbbbbbBbbbbbBbbbbbBbbk',
    'kbbbBbbbbbBbbbbbBbbbbbBbbbbbBbbk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  ],
  generator: [
    '................................',
    '..........kkkkkkkkkk............',
    '.........kssssssssssk............',
    '.........kskkkkskkksk............',
    '...kkkkkkkrrrrrrrrrrkkkkkkk......',
    '..krrrrrrrkrkkkkkkkkrkrrrrrrk.....',
    '..krrrrrrrkrdddddddkkrkrrrrrk.....',
    '..krrrrrrrkrdkdkdkdkrkrrrrrrk.....',
    '..krrrrrrrkrdddddddkkrkrrrrrk.....',
    '..krrrrrrrkrrrrrrrrrkrrrrrrrk.....',
    '..kkkkkkkkkkkkkkkkkkkkkkkkkkk.....',
    '....kkkk................kkkk......',
    '...kdddk..............kdddk.......',
    '..kdddddkk..........kkdddddk........',
    '..kkkkkkkk..........kkkkkkkk.......',
    '................................',
  ].map((row) => row.padEnd(32, '.').slice(0, 32)),
  chau_cay: [
    '................',
    '.......n........',
    '......n.n.......',
    '....nnnnNnn.....',
    '.....nNnnnn.....',
    '...nnnnnnnnnn...',
    '...nnnnnnNnnn...',
    '...nnNnnnnnnn...',
    '.....nnNNnn.....',
    '.......NN.......',
    '...oooooooooo...',
    '....keeeeeek....',
    '....keeeeeek....',
    '....keeeeeek....',
    '....kkkkkkkk....',
    '................',
  ],
  shelf_steel: [
    '.ssssssssssssss.',
    '.S............S.',
    '.S.rr.yy.ll.nnS.',
    '.S.rr.yy.ll.nnS.',
    '.S.rr.yy.ll.nnS.',
    '.ssssssssssssss.',
    '.S............S.',
    '.S.ooo.ppp.LLLS.',
    '.S.ooo.ppp.LLLS.',
    '.S.ooo.ppp.LLLS.',
    '.ssssssssssssss.',
    '.S.bbbbbbbbbb.S.',
    '.S.bttttttttb.S.',
    '.S.bttttttttb.S.',
    '.S.bbbbbbbbbb.S.',
    '.ssssssssssssss.',
  ],
};

// Giai đoạn 3: kệ đôi khung thép (chứa gấp đôi) và quầy thu ngân 2 (máy tính tiền màu xanh dương).
FURNITURE_SPRITES.shelf_double = FURNITURE_SPRITES.shelf.map((row) => row.replace(/[te]/g, 's').replace(/B/g, 'S'));
FURNITURE_SPRITES.shelf_3 = FURNITURE_SPRITES.shelf_double;
FURNITURE_SPRITES.shelf_4 = FURNITURE_SPRITES.shelf_double;
FURNITURE_SPRITES.counter2 = FURNITURE_SPRITES.counter.map((row) => row.replace(/n/g, 'l'));

// Chuẩn hóa pixel art cho footprint của từng nội thất.
function fitFurnitureSprite(width: number, rows: string[]): Sprite {
  const height = 16;
  const vertical = rows.length >= height
    ? rows.slice(0, height)
    : [...Array(Math.floor((height - rows.length) / 2)).fill('.'.repeat(width)), ...rows, ...Array(Math.ceil((height - rows.length) / 2)).fill('.'.repeat(width))];
  return vertical.map((row) => {
    const clipped = row.slice(0, width);
    const left = Math.floor((width - clipped.length) / 2);
    return `${'.'.repeat(left)}${clipped}${'.'.repeat(width - left - clipped.length)}`;
  });
}

// Góc đồ ăn, bàn ghế và quầy nước: mỗi nội thất có dáng riêng thay vì dùng hình tủ/quầy chung.
Object.assign(FURNITURE_SPRITES, {
  food_grill: fitFurnitureSprite(32, [
    '........kkkkkkkkkkkk........', '.......ksssssssssssskk......',
    '......kssssssssssssssk......', '.....kkkkkkkkkkkkkkkkkk.....',
    '.....kBBBBBBBBBBBBBBBBk.....', '.....kBrrrrrrrrrrrrrrBk.....',
    '.....kBrrrYrrYrrYrrrrBk.....', '.....kBrrrYrrYrrYrrrrBk.....',
    '.....kBrrrrrrrrrrrrrrBk.....', '.....kBBBBBBBBBBBBBBBBk.....',
    '.....kttttttttttttttttk.....', '.....kkkkkkkkkkkkkkkkkk.....',
    '........kBkk....kkBk.........', '........kkkk....kkkk.........',
  ]),
  hot_kettle: fitFurnitureSprite(16, [
    '......kYk.......', '......k.k.......', '.....k...k......',
    '.......k........', '....kkkkkkkk....', '..kkcwwwwwwckk..',
    '.kcwwwwwwwwwck.', 'kwcwwwwwwwwwcwk', 'kwcwwwwwwwwwcwk',
    '.kccccccccccck.', '..kkkkkkkkkkkk..', '...kBBBBBBBk....',
    '...kkkkkkkkk....', '..kBkk....kkB...',
  ]),
  bread_case: fitFurnitureSprite(32, [
    '....kkkkkkkkkkkkkkkkkkkk....', '...ksssssssssssssssssssskk..',
    '..ksiiiiiiiiiiiiiiiiiiiisk..', '..ksicccccccccccccccccccisk..',
    '..ksicYYcYYcYYcYYcYYcYYcisk.', '..ksicttcttccttccttccttcisk.',
    '..ksicccccccccccccccccccisk..', '..ksiiiiiiiiiiiiiiiiiiiisk..',
    '..ksBBBBBBBBBBBBBBBBBBBBSk..', '..kkkkkkkkkkkkkkkkkkkkkkkk..',
    '...kBkk..............kkBk...', '...kkkk..............kkkk...',
  ]),
  food_table_2: fitFurnitureSprite(16, [
    '....kkkkkkkk....', '...kttttttttk...', '..kttttttttttk..',
    '..kttttttttttk..', '..kkkkkkkkkkkk..',
    '...kB......Bk...', '...kB......Bk...', '...kB......Bk...',
    '...kB......Bk...', '...kB......Bk...', '...kB......Bk...',
    '..kkk......kkk..',
  ]),
  drink_table_2: fitFurnitureSprite(16, [
    '....kkkkkkkk....', '...kLLLLLLLLk...', '..kLllllllllLLk.',
    '..kLLLLLLLLLLk..', '..kkkkkkkkkkkk..',
    '...kB......Bk...', '...kB......Bk...', '...kB......Bk...',
    '...kB......Bk...', '...kB......Bk...', '...kB......Bk...',
    '..kkk......kkk..',
  ]),
  food_table_4: fitFurnitureSprite(32, [
    '....kkkkkkkkkkkkkkkkkkkk....', '...kttttttttttttttttttttk...',
    '..kttttttttttttttttttttttk..', '..kkkkkkkkkkkkkkkkkkkkkkkk..',
    '...kBkk....kkB....kkBkk.....', '...kkkk....kkk....kkkkk.....',
    '...kBkk....kkB....kkBkk.....', '...kkkk....kkk....kkkkk.....',
    '...kBkk....kkB....kkBkk.....', '...kkkk....kkk....kkkkk.....',
  ]),
  drink_counter: fitFurnitureSprite(32, [
    '.........kkkkkkkkkkkk........', '........ksssssssssssskk......',
    '........kLLLLLLLLLLLLLk......', '........kLwLLwLLwLLwLLLk......',
    '........kkkkkkkkkkkkkkk.......', '...kk....kttttttttttttk........',
    '..kYYk...kBBBBBBBBBBBBk........', '..kYYk...kBddddddddddBk........',
    '..kkkk...kBdnNdkkdNndBk........', '.........kBddddddddddBk........',
    '.........kBBBBBBBBBBBBk........', '.........kkkkkkkkkkkkkk........',
    '..........kBkk......kkBk........', '..........kkkk......kkkk........',
  ]),
  blender: fitFurnitureSprite(16, [
    '......kkkk......', '.....ksssssk.....', '.....kLiiLk.....',
    '.....kLiiLk.....', '.....kLwYLk.....', '.....kLiiLk.....',
    '.....kLLLLk.....', '.....kkkkkk.....', '....kBBBBBBk....',
    '...kBYYYYYBk....', '...kBBBBBBBk....', '..kkkkkkkkkkk...',
    '..kBkk....kkB...', '..kkkk....kkkk..',
  ]),
  sugarcane_press: fitFurnitureSprite(32, [
    '......kkkkkk............kkkk....', '.....kssssssk..........ksssssk...',
    '....ksssssssskk........kssssssk...', '....kkkkkkkkkkk........kkkkkkkk...',
    '....kBBBBBBBBBk........kBBYYYYBk...', '....kBnNnNnNnBk........kBBYYYYBk...',
    '....kBBBBBBBBBk........kBBYYYYBk...', '....kkkkkkkkkkk........kkkkkkkk...',
    '....ksssssssssk....................', '....kBBBBBBBBBk....................',
    '....kBBBBBBBBBk....................', '....kkkkkkkkkkk....................',
    '.....kBkk..kkB......................', '.....kkkk..kkkk.....................',
  ]),
  thung_ngam: fitFurnitureSprite(16, [
    '.....kkkkkk.....', '....kssssssk....', '...kBBBBBBBBk...',
    '..kBttttttttBk..', '..kBttttttttBk..', '..kBttttttttBk..',
    '..kBttttttttBk..', '..kBttttttttBk..', '..kBBBBBBBBBBk..',
    '...kkkkkkkkkk...', '....kBkk..kkB...', '....kkkk..kkkk..',
  ]),
  xung_hap: fitFurnitureSprite(16, [
    '......kYk.......', '.....k...k......', '......k.k.......',
    '...kkkkkkkkkk...', '..kssssssssssk..', '.ksiiiiiiiiisk.',
    '.ksicccccccisk.', '.ksicYYYYYYcisk.', '.ksicccwwccisk.',
    '.ksicYYYYYYcisk.', '.ksicccccccisk.', '..ksssssssssk...',
    '...kBBBBBBBBk...', '...kkkkkkkkkk...', '..kBkk....kkB...',
  ]),
});

// Quầy xôi là tủ trưng bày riêng, dùng footprint 1×1 và khác hẳn kệ kho chung.
FURNITURE_SPRITES.quay_xoi = [
  '................',
  '......kkkk......',
  '....kkcccckk....',
  '...kciiiiiick...',
  '...kcYYccYYck...',
  '...kcccccccck...',
  '..kkkkkkkkkkkk..',
  '..kttttttttttk..',
  '..kBBBBBBBBBBk..',
  '..kkBBBBBBBBkk..',
  '....kB....kB....',
  '....kB....kB....',
  '....kkkkkkkk....',
  '.......kk.......',
  '................',
  '................',
];

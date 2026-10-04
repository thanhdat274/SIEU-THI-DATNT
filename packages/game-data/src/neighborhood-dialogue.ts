/**
 * Hội thoại giả giữa hai NPC nền (không LLM): mỗi chủ đề là một đoạn 2–3 câu luân phiên A → B → (A), chọn theo
 * thời tiết, buổi trong ngày, nơi gặp và loại NPC. Chủ đề càng khớp nhiều điều kiện càng được ưu tiên.
 */
import type { NeighborNpcType } from './neighborhood';

export type DialogueWeather = 'clear' | 'hot' | 'cloudy' | 'cold' | 'rain' | 'storm';
export type DialoguePhase = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';
export type DialoguePlace = 'shop' | 'street' | 'park' | 'school' | 'apartment';

export interface DialogueTopic {
  id: string;
  /** Bỏ trống = áp dụng cho mọi giá trị của điều kiện đó. */
  phases?: readonly DialoguePhase[];
  weather?: readonly DialogueWeather[];
  places?: readonly DialoguePlace[];
  /** Phải có ít nhất một trong hai người thuộc các loại này. */
  types?: readonly NeighborNpcType[];
  /** Hệ số ưu tiên thêm (mặc định 1): thời tiết xấu phải lấn át chuyện thường ngày. */
  boost?: number;
  /** Mỗi phần tử là một đoạn hội thoại; câu lẻ do A nói, câu chẵn do B đáp. */
  lines: ReadonlyArray<readonly string[]>;
}

export const DIALOGUE_TOPICS: readonly DialogueTopic[] = [
  { id: 'greet-morning', phases: ['morning'], lines: [
    ['Chào buổi sáng!', 'Chào bạn, dậy sớm ghê.', 'Ừ, đi làm kẻo trễ.'],
    ['Chào buổi sáng nhé!', 'Sáng nay mát ha.'],
    ['Sáng sớm vậy đi đâu đó?', 'Tôi ghé mua ít đồ.', 'Ừ, đi nhé!'],
  ] },
  { id: 'greet-afternoon', phases: ['noon', 'afternoon'], lines: [
    ['Chào bạn, ăn trưa chưa?', 'Rồi, còn bạn?', 'Tôi đi ăn đây.'],
    ['Chiều rồi, đi đâu đó?', 'Tôi ghé tiệm mua chút đồ.', 'Nhớ mua giùm tôi lon nước nhé.'],
  ] },
  { id: 'greet-evening', phases: ['evening', 'night'], lines: [
    ['Tối nay đông người ghê.', 'Ừ, trời mát ra đường chơi.'],
    ['Đi làm về rồi hả?', 'Ừ, mệt quá trời.', 'Về nghỉ sớm nhé!'],
    ['Khuya rồi, sao chưa về?', 'Đi dạo chút thôi.'],
  ] },
  { id: 'shop-near', places: ['shop'], lines: [
    ['Cửa hàng này hôm nay đông nhỉ.', 'Ừ, hàng nào cũng rẻ.', 'Vậy mình vào xem thử.'],
    ['Bạn mua gì vậy?', 'Mua ít sữa với bánh mì.', 'Nhớ lấy thêm trứng nha.'],
    ['Tiệm đầu hẻm còn mở không?', 'Còn, cô chủ mở cả ngày.'],
  ] },
  { id: 'where-to', lines: [
    ['Đi đâu đó?', 'Tôi ghé mua ít đồ.', 'Ừ, đi cẩn thận nhé.'],
    ['Lâu rồi mới gặp bạn.', 'Dạo này bận quá.', 'Rảnh qua nhà chơi nhé.'],
    ['Bạn mua gì vậy?', 'Ít đồ ăn sáng thôi.'],
  ] },
  { id: 'hot', weather: ['hot'], lines: [
    ['Hôm nay nóng thật.', 'Ừ, nóng như đổ lửa.', 'Ghé tiệm uống nước đá đi.'],
    ['Nắng gì mà gắt vậy.', 'Mua cái kem ăn cho mát.'],
  ] },
  { id: 'clear', weather: ['clear'], lines: [
    ['Hôm nay trời đẹp nhỉ.', 'Ừ, nắng đẹp quá.'],
    ['Trời nắng đẹp, ra công viên đi.', 'Ý hay đó!'],
  ] },
  { id: 'cloudy-rain-soon', weather: ['cloudy'], lines: [
    ['Trời âm u ghê.', 'Ừ, lát chắc mưa đó.', 'Nhớ mang áo mưa nhé.'],
    ['Hôm nay trời nhiều mây quá.', 'Chắc sắp mưa rồi.'],
  ] },
  { id: 'cold', weather: ['cold'], lines: [
    ['Hôm nay se lạnh quá.', 'Ừ, nhớ mặc áo ấm.'],
    ['Trời lạnh, uống ly trà nóng đi.', 'Ừ, nghe hợp lý.'],
  ] },
  { id: 'rain', weather: ['rain'], boost: 25, lines: [
    ['Mưa rồi kìa!', 'Mau vào chỗ trú đi.', 'Ừ, chạy lẹ thôi.'],
    ['Mưa to quá, có ô không?', 'Có, qua đây che chung nè.'],
    ['Trời mưa rồi, về nhà thôi.', 'Ừ, đường trơn đó, cẩn thận.'],
  ] },
  { id: 'storm', weather: ['storm'], boost: 100, lines: [
    ['Mau tìm chỗ trú thôi!', 'Sấm sét dữ quá!', 'Vào hiên kia đi!'],
    ['Giông to quá, đừng đứng gần cây!', 'Ừ, chạy vào trong thôi!'],
  ] },
  { id: 'park', places: ['park'], lines: [
    ['Công viên hôm nay thoáng nhỉ.', 'Ừ, hoa mới nở đẹp quá.'],
    ['Ngồi nghỉ chút đi.', 'Ừ, ghế này mát.', 'Chim hót nghe vui tai ghê.'],
    ['Sáng nào tôi cũng ra đây đi bộ.', 'Tốt cho sức khỏe lắm.'],
  ], types: ['elder', 'walker', 'jogger', 'parent', 'child'] },
  { id: 'school-student', places: ['school', 'street'], types: ['student', 'university_student', 'child'], lines: [
    ['Bài tập hôm nay khó không?', 'Khó lắm, cho tớ chép với.', 'Không được đâu, tự làm đi!'],
    ['Hôm nay có kiểm tra không?', 'Có, môn Toán đó.', 'Chết rồi, chưa ôn bài!'],
    ['Ra chơi đá cầu không?', 'Đi, tớ rủ thêm mấy bạn.'],
  ] },
  { id: 'parent-child', types: ['parent', 'child'], lines: [
    ['Con nhớ đội mũ nhé.', 'Dạ, con biết rồi.'],
    ['Học ngoan nghe con.', 'Dạ, mẹ về cẩn thận.'],
  ] },
  { id: 'courier', types: ['courier'], lines: [
    ['Giao hàng cho nhà số mấy vậy?', 'Nhà số 12, đi tìm mãi.', 'Đi thẳng rồi rẽ phải nhé.'],
    ['Đơn nhiều không?', 'Nhiều lắm, chạy hoài chưa hết.'],
  ] },
  { id: 'vendor', types: ['vendor'], lines: [
    ['Bán được nhiều không cô?', 'Cũng tạm, sáng nay đông khách.', 'Cho tôi hai ổ bánh mì nhé.'],
    ['Có gì ăn sáng không?', 'Xôi nóng đây, mua đi con.'],
  ] },
  { id: 'elder-chat', types: ['elder'], lines: [
    ['Dạo này khỏe không bác?', 'Khỏe, nhờ trời. Còn chú?', 'Cũng được, chỉ hơi đau lưng.'],
    ['Khu mình dạo này đông vui nhỉ.', 'Ừ, nhiều nhà mới dọn tới.'],
  ] },
  { id: 'apartment', places: ['apartment'], lines: [
    ['Chung cư mình có thêm quán mới.', 'Thật hả? Mai tôi ghé.'],
    ['Thang máy lại hư rồi.', 'Thôi, leo cầu thang cho khỏe.'],
  ] },
  { id: 'work', types: ['office_worker'], phases: ['morning', 'evening'], lines: [
    ['Hôm nay kẹt xe quá.', 'Giờ cao điểm mà.', 'Chắc phải đi sớm hơn.'],
    ['Cuối ngày rồi, cố lên!', 'Ừ, về ăn cơm thôi.'],
  ] },
  // --- Hội thoại nâng cao ---
  { id: 'neighbor-greet', types: ['elder', 'walker'], lines: [
    ['Chào chú bác!', 'Cháu chào cô ạ.', 'Con chào bác nhé.'],
    ['Hôm nay khỏe không?', 'Khỏe lắm, cảm ơn cháu.'],
  ] },
  { id: 'weather-morning', phases: ['morning'], weather: ['clear'], lines: [
    ['Sáng nay trời đẹp quá!', 'Ừ, đi dạo chút đi.'],
    ['Nắng đẹp ra công viên chơi.', 'Hay đó, đi đi!'],
  ] },
  { id: 'weather-rain-walk', weather: ['rain'], boost: 20, lines: [
    ['Mưa vừa tới kìa!', 'Chạy vào với!', 'Đợi chút cho mưa nhỏ.'],
    ['Có mang ô không?', 'Không, chạy nhanh thôi!', 'Theo tôi vào hiên kia.'],
  ] },
  { id: 'shop-busy', places: ['shop'], lines: [
    ['Tiệm này đông quá!', 'Hàng rẻ nên mới đông.', 'Mai mình tới sớm.'],
    ['Bán hết rồi hả?', 'Hết sạch rồi, chiều có lô mới.'],
    ['Cô bán hàng nhiệt tình quá.', 'Ừ, cô ấy dễ mến lắm.'],
  ] },
  { id: 'park-evening', places: ['park'], phases: ['evening'], lines: [
    ['Tối mát ra đây chơi.', 'Ừ, hoa đẹp lắm.', 'Cảm giác thư giãn quá.'],
    ['Đi bộ buổi tối tốt cho sức khỏe.', 'Nói đúng, tôi đi mỗi ngày.'],
  ] },
  { id: 'school-morning', places: ['school'], phases: ['morning'], types: ['student', 'university_student', 'child'], lines: [
    ['Hôm nay có giờ Thể dục.', 'Hay quá, em thích nhất môn đó.', 'Em cũng vậy!'],
    ['Bạn có bài tập Toán không?', 'Cho tớ xem với.', 'Tớ làm rồi đây này.'],
  ] },
  { id: 'apartment-night', places: ['apartment'], phases: ['night'], lines: [
    ['Khuya rồi, về nhà thôi.', 'Ừ, mai gặp lại.', 'Chúc ngủ ngon!'],
    ['Tầng trên ồn quá.', 'Họ đang xem tivi đó.', 'Thôi kệ, về nghỉ.'],
  ] },
  { id: 'hot-noon', phases: ['noon'], weather: ['hot'], lines: [
    ['Trưa nóng quá đi!', 'Ừ, trốn trong nhà cho mát.', 'Mua nước đá uống đã.'],
    ['Nắng chói chang.', 'Đeo nón đầy đủ đi.', 'Biết rồi, khó chịu thật.'],
  ] },
  { id: 'cold-morning', phases: ['morning'], weather: ['cold'], lines: [
    ['Sáng nay lạnh thật.', 'Ừ, mặc áo dày vào.', 'Trời ơi, run cả người.'],
    ['Uống ly trà nóng đi.', 'Ý hay đó!', 'Tiệm bên kia có bán.'],
  ] },
  { id: 'vendor-chat', types: ['vendor'], lines: [
    ['Cô bán hàng từ mấy giờ?', 'Từ 5 giờ sáng kìa.', 'Nhiệt tình quá!'],
    ['Hôm nay bán được gì?', 'Bánh mì với xôi nóng.', 'Cho tôi một phần.'],
  ] },
  { id: 'jogger-morning', types: ['jogger'], phases: ['morning'], lines: [
    ['Tập thể dục buổi sáng.', 'Tốt cho sức khỏe.', 'Tôi chạy bộ mỗi ngày.'],
    ['Công viên thoáng quá.', 'Ừ, chạy bộ ở đây sướng thật.', 'Hôm nay chạy 5km.'],
  ] },
  { id: 'elder-afternoon', types: ['elder'], phases: ['afternoon'], lines: [
    ['Chiều rồi, nghỉ chút.', 'Ngồi chơi cho vui.', 'Ngày xưa khu này vắng hơn.'],
    ['Bao nhiêu năm rồi quay lại.', 'Khác nhiều ha.', 'Ừ, đổi mới hết rồi.'],
  ] },
];

/** Chọn phiên bản "hôm nay trời nóng/mưa…" khớp với thời tiết hiệu lực của game (id trong `WEATHER_TYPES`). */
export function dialogueWeatherOf(weatherId: string, rain: number): DialogueWeather {
  if (weatherId === 'storm') return 'storm';
  if (rain >= 0.3 || weatherId === 'rainy' || weatherId === 'heavy_rain') return 'rain';
  if (weatherId === 'hot') return 'hot';
  if (weatherId === 'cold') return 'cold';
  if (weatherId === 'cloudy' || weatherId === 'special') return 'cloudy';
  return 'clear';
}

export function dialoguePhaseOf(hour: number): DialoguePhase {
  const h = Number.isFinite(hour) ? hour : 12;
  return h < 10 ? 'morning' : h < 13.5 ? 'noon' : h < 17.5 ? 'afternoon' : h < 20.5 ? 'evening' : 'night';
}

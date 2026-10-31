/**
 * Mạng xã hội của hẻm: khách hài lòng hay bực mình đều có thể đăng bài về tiệm. Bài thường chỉ thêm vài
 * người theo dõi; bài lan truyền thì cả phường biết — khen thì mấy ngày liền đông khách, chê thì thành
 * khủng hoảng, vắng hẳn khách cho tới khi chủ tiệm lên tiếng xin lỗi. Chủ tiệm cũng tự đăng bài quảng bá
 * mỗi ngày một lần, càng nhiều người theo dõi càng kéo được khách.
 * Chỉ có dữ liệu và hàm thuần; áp vào trạng thái ở `core/slices/social` và `core/slices/endDay`.
 */
import type { Review } from './reviews';
import { simRng } from '../core/rand';

/** Mở trang mạng xã hội của tiệm từ cấp này. */
export const SOCIAL_UNLOCK = 8;
/** Lời đánh giá rất tốt (5★) hoặc rất tệ (≤2★) được đăng lên mạng với xác suất này. */
export const POST_CHANCE = 0.35;
/** Xác suất bài đăng thành lan truyền: tin xấu đi nhanh hơn tin tốt. */
export const VIRAL_GOOD = 0.06;
export const VIRAL_BAD = 0.1;
/** Lan truyền kéo dài bấy nhiêu ngày (kể cả ngày mai). */
export const BUZZ_DAYS = 3;
/** Hệ số khách ghé khi đang có bài khen lan truyền / khủng hoảng. */
export const HYPE_MUL = 1.25;
export const CRISIS_MUL = 0.72;
/** Xin lỗi công khai và tặng phiếu giảm giá: chi phí, và khủng hoảng dịu xuống còn hệ số này. */
export const APOLOGY_COST = 150000;
export const APOLOGY_MUL = 0.92;
/** Bài quảng bá: cần tối thiểu từng này người theo dõi; mỗi 1.000 người theo dõi thêm 10% khách, tối đa 15%. */
export const PROMO_MIN_FOLLOWERS = 20;
export const PROMO_MAX = 0.15;
/** Giữ tối đa chừng này bài trên tường. */
export const POST_CAP = 40;

export interface SocialPost {
  id: number;
  day: number;
  author: string;
  stars: number;
  text: string;
  likes: number;
  shares: number;
  viral?: boolean;
  /** Bài do chủ tiệm đăng. */
  own?: boolean;
}

export interface Buzz {
  kind: 'hype' | 'crisis';
  postId: number;
  /** Ngày cuối còn hiệu lực. */
  until: number;
  mul: number;
  responded?: boolean;
}

export interface SocialState {
  followers: number;
  posts: SocialPost[];
  buzz: Buzz | null;
  /** Ngày chủ tiệm đăng bài quảng bá gần nhất. */
  promoDay: number;
  /** Ngày gần nhất một người sáng tạo nội dung nổi tiếng ghé bài khen và trở thành khách quen (thiếu ở save cũ). */
  influencerSince?: number;
}

export const newSocial = (): SocialState => ({ followers: 0, posts: [], buzz: null, promoDay: 0 });

/** Influencer là khách quen trong bấy nhiêu ngày kể từ bài lan truyền. */
export const INFLUENCER_DAYS = 14;
export const influencerActive = (social: SocialState, day: number) =>
  social.influencerSince !== undefined && day - social.influencerSince < INFLUENCER_DAYS;

const buzzOn = (social: SocialState, day: number) => (social.buzz && day <= social.buzz.until ? social.buzz : null);

/** Hệ số khách ghé hôm nay do mạng xã hội. */
export function socialTraffic(social: SocialState | undefined, day: number): number {
  if (!social) return 1;
  const buzz = buzzOn(social, day);
  return (buzz?.mul ?? 1) * (social.promoDay === day ? 1 + promoBoost(social.followers) : 1);
}

export const promoBoost = (followers: number) => Math.min(PROMO_MAX, (followers / 1000) * 0.1);

/** Bài viết về tiệm từ lời đánh giá: ghép thêm câu kiểu mạng xã hội. */
function postText(r: Review): string {
  if (r.stars >= 5) return `${r.text} Cả nhà ghé ủng hộ nha! 👍`;
  return `${r.text} Ai hay ghé thì cân nhắc nhé 😤`;
}

export interface SocialDayResult {
  social: SocialState;
  news: string[];
}

/**
 * Hết ngày: vài lời đánh giá nổi bật của hôm nay lên mạng, cộng người theo dõi, có thể lan truyền.
 * Đang có khủng hoảng thì không bài khen nào lan được (người ta còn đang chê).
 */
export function socialDayEnd(social: SocialState, reviews: Review[], day: number, rng: () => number = simRng()): SocialDayResult {
  const news: string[] = [];
  const posts = [...social.posts];
  let followers = social.followers;
  let influencer = social.influencerSince;
  let buzz = buzzOn(social, day + 1);
  let nextId = (posts.at(-1)?.id ?? 0) + 1;
  for (const r of reviews) {
    if (r.day !== day || (r.stars > 2 && r.stars < 5) || rng() >= POST_CHANCE) continue;
    const good = r.stars >= 5;
    const viral = !buzz && rng() < (good ? VIRAL_GOOD : VIRAL_BAD);
    const reach = 10 + followers * 0.15;
    const likes = Math.round(reach * (0.5 + rng()) * (viral ? 12 : 1));
    const shares = Math.round(likes * (viral ? 0.3 : 0.05));
    const post: SocialPost = { id: nextId++, day, author: r.author, stars: r.stars, text: postText(r), likes, shares, ...(viral ? { viral } : {}) };
    posts.push(post);
    followers += good ? Math.round(likes / 8) : -Math.round(likes / 30);
    if (viral) {
      buzz = { kind: good ? 'hype' : 'crisis', postId: post.id, until: day + BUZZ_DAYS, mul: good ? HYPE_MUL : CRISIS_MUL };
      news.push(good
        ? `📱🔥 Bài khen tiệm của ${r.author} lan truyền khắp phường (${likes} lượt thích)! Mấy ngày tới khách kéo tới đông`
        : `📱⚠️ Bài chê tiệm của ${r.author} lan truyền (${shares} lượt chia sẻ)! Khách ngại ghé — mở Mạng xã hội để xin lỗi`);
      // Bài khen lan truyền: người sáng tạo nội dung ghé quay, thành khách quen đưa tiệm lên sóng
      if (good && (social.influencerSince === undefined || day - social.influencerSince >= INFLUENCER_DAYS + 16) && rng() < 0.5) {
        influencer = day;
        news.push('🎬 Chị Vy livestream ghé quay tiệm sau bài khen lan truyền — hai tuần nay chị hay dẫn fan ghé mua!');
      }
    }
  }
  return { social: { ...social, followers: Math.max(0, followers), posts: posts.slice(-POST_CAP), buzz, ...(influencer !== undefined ? { influencerSince: influencer } : {}) }, news };
}

/** Chủ tiệm lên tiếng xin lỗi khi đang khủng hoảng: dịu xuống, gỡ được ít người theo dõi. */
export function apologize(social: SocialState, day: number): SocialState | null {
  const buzz = buzzOn(social, day);
  if (buzz?.kind !== 'crisis' || buzz.responded) return null;
  return { ...social, followers: social.followers + 15, buzz: { ...buzz, mul: APOLOGY_MUL, responded: true } };
}

/** Chủ tiệm đăng bài quảng bá: mỗi ngày một lần, cần đủ người theo dõi. */
export function promote(social: SocialState, day: number, shopName: string): SocialState | null {
  if (social.promoDay === day || social.followers < PROMO_MIN_FOLLOWERS) return null;
  const likes = Math.round(social.followers * 0.2);
  const post: SocialPost = { id: (social.posts.at(-1)?.id ?? 0) + 1, day, author: shopName, stars: 5, text: `🛒 ${shopName} hôm nay hàng về đầy kệ, ghé tiệm nha cả nhà!`, likes, shares: Math.round(likes * 0.05), own: true };
  return { ...social, promoDay: day, followers: social.followers + Math.round(likes / 10), posts: [...social.posts, post].slice(-POST_CAP) };
}

export const activeBuzz = buzzOn;

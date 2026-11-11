import { lazy, Suspense, useEffect, useRef, useState, type ComponentType, type LazyExoticComponent } from 'react';
import { formatMoney, productById } from '../../data/products';
import { miniDefById, miniTargetRecipe, type MiniMode } from '../../data/festivalMini';
import { useGame } from '../../core/store';
import { useMiniHost } from './miniHost';
import { miniSeed } from './seeded';
import { miniPlace, miniReward, miniSkip } from './feel';
import './minigames.css';

/**
 * Hệ 7 — lớp phủ trò khéo tay (SPEC-CHIEU-RONG §7.4).
 *
 * Đọc `useMiniHost` để biết trò đang mở; vẽ: tiêu đề + bộ đếm giờ (mức Nhanh tay), vùng trò,
 * nút bỏ qua "Để thợ làm" (nhận kết quả cơ bản, không phạt) và màn kết quả với phần thưởng.
 *
 * L1 (khung): chưa có slice `scoreFestivalMini` — khi xong chỉ hiện kết quả và đóng; lát L2+ sẽ
 * gọi scoreFestivalMini để cộng thưởng thật vào mẻ nấu / điểm trang trí.
 */

interface MiniGameProps {
  seed: number;
  mode: MiniMode;
  onFinish: (score: number) => void;
  onProgress: (score: number) => void;
}

// Mỗi trò là một chunk riêng (nạp lười): chỉ tải trò người chơi đang mở.
const TapSpot = lazy(() => import('./TapSpot').then((m) => ({ default: m.TapSpot })));
const GioQua = lazy(() => import('./GioQua').then((m) => ({ default: m.GioQua })));
const BanhChung = lazy(() => import('./BanhChung').then((m) => ({ default: m.BanhChung })));
const MamNguQua = lazy(() => import('./MamNguQua').then((m) => ({ default: m.MamNguQua })));
const DenOngSao = lazy(() => import('./DenOngSao').then((m) => ({ default: m.DenOngSao })));
const GAME_MAP: Record<string, LazyExoticComponent<ComponentType<MiniGameProps>>> = {
  tap_test: TapSpot,
  gio_qua: GioQua,
  banh_chung: BanhChung,
  mam_ngu_qua: MamNguQua,
  den_ong_sao: DenOngSao,
};

type Phase = 'play' | 'result';
const clampScore = (s: number) => Math.max(0, Math.min(100, Math.round(s)));

export function MiniHostView() {
  const active = useMiniHost((s) => s.active);
  const openMini = useMiniHost((s) => s.openMini);
  const closeMini = useMiniHost((s) => s.closeMini);
  const weatherSeed = useGame((s) => s.weatherSeed ?? 0);

  const [phase, setPhase] = useState<Phase>('play');
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(0);
  const progressRef = useRef(0);
  const feelRef = useRef(0); // Hệ7-L6: âm thanh + rung khi điểm tăng trong lúc chơi

  const def = active ? miniDefById(active.defId) : undefined;
  const Game = active ? GAME_MAP[active.defId] : undefined;

  // L1 — mở trò từ hash #mini=<id> để thử khung trên điện thoại (không đụng UI thật).
  useEffect(() => {
    const m = /#mini=([\w-]+)/.exec(window.location.hash);
    if (m && miniDefById(m[1])) openMini(m[1], useGame.getState().day);
  }, [openMini]);

  // Bộ đếm giờ chỉ dùng cho mức "Nhanh tay"; "Thong thả" không đếm giờ (§7.4).
  useEffect(() => {
    if (!active || phase !== 'play' || active.mode === 'calm') return;
    setLeft(def?.seconds ?? 30);
    const t = setInterval(() => setLeft((x) => Math.max(0, x - 1)), 1000);
    return () => clearInterval(t);
  }, [active, phase, def]);

  // Hết giờ: chốt bằng điểm hiện tại của trò.
  useEffect(() => {
    if (active && phase === 'play' && active.mode !== 'calm' && left === 0) finish(progressRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  if (!active || !def) return null;

  function finish(raw: number) {
    const s = clampScore(raw);
    setScore(s);
    setPhase('result');
    miniReward(); // Hệ7-L6: vừa xong trò → rung dài + tiếng thưởng
    // Hệ7-L2: ghi thưởng thật cho TRÒ GẮN DỊP LỄ (trò giả tap_test không vô save).
    if (active && def && def.festivals.length > 0) {
      useGame.getState().scoreFestivalMini(def.id, s, active.mode);
    }
  }
  function skip() { miniSkip(); finish(0); }
  function close() {
    closeMini();
    setPhase('play');
    setScore(0);
    progressRef.current = 0;
    feelRef.current = 0;
  }

  const isFast = active.mode === 'fast';
  const reward = phase === 'result' ? def.reward(score, active.mode) : null;

  return (
    <div className="mini-backdrop">
      <div className="mini-card">
        <div className="mini-head">
          <span className="mini-title">{def.icon} {def.name}</span>
          {phase === 'play' && isFast && (
            <span className={`mini-timer ${left <= 5 ? 'danger' : ''}`}>{left}s</span>
          )}
        </div>

        {phase === 'play' ? (
          <>
            <div className="mini-body">
              {Game ? (
                <Suspense fallback={<p className="mini-loading">⏳ Đang dựng trò…</p>}>
                  <Game
                    seed={miniSeed(weatherSeed, active.day, def.id)}
                    mode={active.mode}
                    onFinish={finish}
                    onProgress={(s) => {
                      if (s > feelRef.current) { feelRef.current = s; miniPlace(); } // Hệ7-L6: có điểm → cạch + rung nhẹ
                      progressRef.current = s;
                    }}
                  />
                </Suspense>
              ) : (
                <p className="mini-loading">Trò này đang được dựng — lát sau quay lại nhé.</p>
              )}
            </div>
            <div className="mini-foot">
              <button className="mini-btn" onClick={skip}>👩‍🍳 Để thợ làm</button>
            </div>
          </>
        ) : (
          <div className="mini-result">
            <p className="mini-result-score">Điểm: <b>{score}</b>/100</p>
            {reward && (
              <p className="mini-result-reward">
                {reward.bonusQty
                  ? `+${reward.bonusQty} thành phẩm cho mẻ hôm nay`
                  : reward.flair
                    ? `+${reward.flair} điểm trang trí cho tới hết dịp`
                    : 'Không có thưởng thêm (để thợ làm).'}
                {reward.xp > 0 && ` · +${reward.xp} XP`}
              </p>
            )}
            <button className="mini-btn primary" onClick={close}>Xong</button>
          </div>
        )}
      </div>
    </div>
  );
}

export type { MiniGameProps };

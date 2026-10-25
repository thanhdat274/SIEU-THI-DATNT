import { useEffect, useRef, useState } from 'react';
import { joystick } from '../core/actions';
import { useGame } from '../core/store';

const RADIUS = 48; // px, quãng núm kéo được tính từ tâm

/**
 * Cần điều khiển ảo cho màn cảm ứng (góc trái dưới): kéo núm để đi, kéo xa thì đi nhanh.
 * Ẩn khi đang mở bảng hoặc ở chế độ xây.
 */
/** Máy chỉ có cảm ứng (điện thoại, iPad): không chuột, không rê được. Máy tính có màn cảm ứng vẫn tính là máy tính. */
const TOUCH_ONLY = '(hover: none) and (pointer: coarse)';

function useTouchOnly() {
  const [touch, setTouch] = useState(() => matchMedia(TOUCH_ONLY).matches);
  useEffect(() => {
    // Cắm chuột vào iPad, hay bật/tắt giả lập điện thoại trong trình duyệt thì cập nhật luôn
    const mq = matchMedia(TOUCH_ONLY);
    const on = () => setTouch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return touch;
}

export function Joystick() {
  const touch = useTouchOnly();
  const hidden = useGame((s) => !!s.panel || s.buildMode) || !touch;
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);

  const move = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    let x = e.clientX - (r.left + r.width / 2);
    let y = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(x, y);
    if (len > RADIUS) {
      x *= RADIUS / len;
      y *= RADIUS / len;
    }
    setKnob({ x, y });
    // Vùng chết nhỏ ở giữa để chạm nhẹ không làm nhân vật nhích
    const k = len < 8 ? 0 : 1;
    joystick.x = (x / RADIUS) * k;
    joystick.y = (y / RADIUS) * k;
  };
  const release = () => {
    active.current = null;
    setKnob({ x: 0, y: 0 });
    joystick.x = joystick.y = 0;
  };

  // Bảng mở giữa lúc đang kéo: thả cần ra để nhân vật không tự đi tiếp
  useEffect(() => () => {
    joystick.x = joystick.y = 0;
  }, [hidden]);

  if (hidden) return null;
  return (
    <div
      ref={base}
      className="hud-joystick"
      aria-hidden="true"
      onPointerDown={(e) => {
        active.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => e.pointerId === active.current && move(e)}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div className="hud-joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}

import React, { useRef, useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';

interface VirtualJoystickProps {
  onMove: (x: number, y: number) => void;
  onInteract: () => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove, onInteract }) => {
  const { nearbyFixture, toggleInventoryModal } = useGameStore();
  const joystickRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  const radius = 45; // Max radius of joystick stick

  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setIsDragging(true);
    updateKnob(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        updateKnob(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setIsDragging(false);
        setKnobPos({ x: 0, y: 0 });
        onMove(0, 0);
        break;
      }
    }
  };

  const updateKnob = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);

    if (distance === 0) {
      setKnobPos({ x: 0, y: 0 });
      onMove(0, 0);
      return;
    }

    const clampedDist = Math.min(distance, radius);
    const nx = (dx / distance) * clampedDist;
    const ny = (dy / distance) * clampedDist;

    setKnobPos({ x: nx, y: ny });
    onMove(nx / radius, ny / radius);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex justify-between items-end p-4 sm:p-6 pb-6 select-none">
      {/* Virtual Joystick (Bottom Left) */}
      <div
        ref={joystickRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="pointer-events-auto relative w-32 h-32 rounded-full bg-black/40 border-2 border-[#d4a373]/70 backdrop-blur-xs flex items-center justify-center touch-none shadow-xl"
      >
        {/* Direction guides */}
        <div className="absolute top-1 text-[#ffd166]/60 text-xs font-bold">▲</div>
        <div className="absolute bottom-1 text-[#ffd166]/60 text-xs font-bold">▼</div>
        <div className="absolute left-1 text-[#ffd166]/60 text-xs font-bold">◀</div>
        <div className="absolute right-1 text-[#ffd166]/60 text-xs font-bold">▶</div>

        {/* Movable Knob */}
        <div
          className="w-14 h-14 rounded-full bg-[#8b5a2b] border-2 border-[#ffd166] shadow-lg flex items-center justify-center transition-transform duration-75"
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
        >
          <div className="w-6 h-6 rounded-full bg-[#583101] border border-[#ffd166]/60" />
        </div>
      </div>

      {/* Action Buttons (Bottom Right) */}
      <div className="pointer-events-auto flex flex-col items-end gap-3 pb-2">
        {/* Quick Inventory Bag Button */}
        <button
          onClick={toggleInventoryModal}
          className="w-14 h-14 rounded-full bg-[#583101]/90 border-2 border-[#d4a373] text-white flex items-center justify-center text-xl shadow-lg active:scale-95 transition-transform"
        >
          📦
        </button>

        {/* Big Action / Interact Button */}
        <button
          onClick={onInteract}
          className={`w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center font-bold shadow-2xl active:scale-95 transition-all ${
            nearbyFixture
              ? 'bg-[#b7094c] border-[#ffd166] text-white animate-pulse'
              : 'bg-[#8b5a2b]/80 border-[#d4a373]/80 text-[#faedcd]'
          }`}
        >
          <span className="text-xl">✋</span>
          <span className="text-[11px] font-mono font-bold tracking-tight">TƯƠNG TÁC</span>
        </button>
      </div>
    </div>
  );
};

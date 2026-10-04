import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../store/useGameStore';
import { PixelButton, PixelIcon } from './pixel';
export const BottomBar: React.FC<{onOpenSupplier:()=>void; onOpenCashier:()=>void}> = ({onOpenSupplier,onOpenCashier}) => {
  const {nearbyFixture, isStoreOpen, toggleInventoryModal} = useGameStore(useShallow((s) => ({nearbyFixture: s.nearbyFixture, isStoreOpen: s.worldTime.isStoreOpen, toggleInventoryModal: s.toggleInventoryModal})));
  return <footer className="game-footer">
    <div className="footer-context"><PixelIcon name="book" size={24}/><div><strong>{nearbyFixture ? nearbyFixture.label : isStoreOpen ? 'Chào bà con, tiệm mở rồi!' : 'Nghỉ một chút, rồi mở tiệm nhé.'}</strong><p className="keyboard-hint"><kbd>WASD</kbd> / <kbd>↑ ↓ ← →</kbd> đi lại · <kbd>E</kbd> tương tác · <kbd>I</kbd> túi đồ · Kéo bản đồ để nhìn quanh</p></div></div>
    <nav className="footer-actions" aria-label="Sổ quản lý">
      <PixelButton icon="bag" onClick={toggleInventoryModal} aria-label="Túi đồ" title="Túi đồ cá nhân (Phím I)"><span className="button-label">Túi đồ</span></PixelButton>
      <PixelButton icon="truck" variant="teal" onClick={onOpenSupplier} aria-label="Đại lý" title="Đại lý nhập hàng"><span className="button-label">Nhập hàng</span></PixelButton>
      <PixelButton icon="book" onClick={onOpenCashier} aria-label="Sổ bán hàng" title="Sổ bán hàng & Thu ngân"><span className="button-label">Sổ bán hàng</span></PixelButton>
    </nav>
  </footer>;
};

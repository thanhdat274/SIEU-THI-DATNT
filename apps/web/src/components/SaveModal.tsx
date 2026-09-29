import React, { useState } from 'react';

interface SaveModalProps {
  onManualSave: () => void;
  onResetSave: () => void;
  onClose: () => void;
  lastSavedAt?: string;
  revision?: number;
}

export const SaveModal: React.FC<SaveModalProps> = ({
  onManualSave,
  onResetSave,
  onClose,
  lastSavedAt,
  revision = 1,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-[#fcf4dc] border-4 border-[#7a4b26] ring-4 ring-[#402611] rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-[#3d2716]">
        {/* Modal Header */}
        <div className="bg-[#7a4b26] px-4 py-2.5 border-b-4 border-[#593215] flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-xl">💾</span>
            <h2 className="text-sm sm:text-base font-bold text-[#ffeaa7] tracking-wide font-mono">
              LƯU TIẾN TRÌNH GAME (INDEXEDDB)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded bg-[#a62b2b] hover:bg-[#852222] border-2 border-[#ffeaa7] text-white font-bold flex items-center justify-center text-sm shadow transition-all active:translate-y-0.5"
            title="Đóng [Esc]"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3.5 bg-[#fcf4dc]">
          <div className="bg-[#f5ecce] p-3 rounded-lg border-2 border-[#caa472] space-y-1.5 text-xs font-mono shadow-xs">
            <div className="flex justify-between">
              <span className="text-[#735841]">Trạng thái:</span>
              <span className="text-[#2a6f44] font-bold">● Đang hoạt động (Offline Dexie)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#735841]">Lần lưu gần nhất:</span>
              <span className="font-extrabold text-[#7a4b26]">
                {lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString('vi-VN') : 'Mới mở tiệm'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#735841]">Phiên bản bản lưu:</span>
              <span className="font-extrabold text-[#7a4b26]">#{revision}</span>
            </div>
          </div>

          <div className="text-xs text-[#634932] leading-relaxed bg-[#f5ecce] p-3 rounded-lg border-2 border-[#caa472] shadow-xs">
            ℹ️ Game tự động lưu ngầm vào trình duyệt mỗi <b>30 giây</b> và khi bạn qua ngày mới. Dữ liệu tiến trình tiệm được bảo toàn an toàn trên máy!
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-1 font-mono">
            <button
              onClick={onManualSave}
              className="w-full bg-[#2a6f44] hover:bg-[#1e5232] text-white font-bold py-2.5 px-4 rounded-lg border border-[#ffeaa7]/40 text-xs shadow transition-all active:translate-y-0.5 flex items-center justify-center gap-2"
            >
              <span>💾</span>
              <span>Lưu tiến trình ngay bây giờ</span>
            </button>

            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="w-full bg-[#9c6a38] hover:bg-[#7a5026] text-white font-bold py-2 px-4 rounded-lg border border-[#ffeaa7]/40 text-xs shadow transition-all active:translate-y-0.5 flex items-center justify-center gap-2"
              >
                <span>🔄</span>
                <span>Khởi tạo lại tiệm mới từ đầu</span>
              </button>
            ) : (
              <div className="bg-[#f5ecce] p-3 rounded-lg border-2 border-[#a62b2b] text-center space-y-2">
                <div className="text-xs font-bold text-[#a62b2b]">
                  Bạn có chắc chắn muốn xóa dữ liệu cũ và chơi lại từ Ngày 1?
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      onResetSave();
                      setConfirmReset(false);
                      onClose();
                    }}
                    className="bg-[#a62b2b] hover:bg-[#852222] text-white text-xs font-bold px-3 py-1.5 rounded shadow active:translate-y-0.5"
                  >
                    Đồng ý xóa & làm lại
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="bg-[#ebdcc3] text-[#3d2716] border border-[#a68453] text-xs font-bold px-3 py-1.5 rounded active:translate-y-0.5"
                  >
                    Hủy bỏ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#ebdcc3] px-4 py-2.5 border-t-2 border-[#cbb694] flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#7a4b26] hover:bg-[#633a1a] active:translate-y-0.5 text-[#ffeaa7] text-xs font-bold font-mono px-4 py-1.5 rounded border border-[#ffeaa7]/50 shadow transition-all"
          >
            Đóng [Esc]
          </button>
        </div>
      </div>
    </div>
  );
};

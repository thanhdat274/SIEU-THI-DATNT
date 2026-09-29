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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#2b1e16] border-4 border-[#d4a373] rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-[#f4ecd8]">
        {/* Modal Header */}
        <div className="bg-[#583101] px-4 py-3 border-b-2 border-[#d4a373] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">💾</span>
            <h2 className="text-base sm:text-lg font-bold text-[#ffd166] tracking-wide">
              Lưu Trữ Game (IndexedDB)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#ffd166] hover:text-white text-lg font-bold px-2 py-0.5 rounded bg-[#8b5a2b] hover:bg-[#a06535] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4">
          <div className="bg-[#1b1c1e] p-3 rounded-lg border border-[#d4a373]/40 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#faedcd]/70">Trạng thái lưu:</span>
              <span className="text-[#52b788] font-bold">● Đang hoạt động (Offline Dexie)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#faedcd]/70">Lần lưu gần nhất:</span>
              <span className="font-mono text-[#ffd166]">
                {lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString('vi-VN') : 'Mới khởi động'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#faedcd]/70">Số phiên bản (Revision):</span>
              <span className="font-mono text-[#ffd166]">#{revision}</span>
            </div>
          </div>

          <div className="text-xs text-[#faedcd]/80 leading-relaxed bg-[#38271e] p-3 rounded-lg border border-[#d4a373]/50">
            ℹ️ Game tự động lưu ngầm vào trình duyệt mỗi <b>30 giây</b> và khi bạn đóng cửa tiệm / kết thúc ngày. Dữ liệu của bạn được bảo toàn an toàn ngay cả khi không có kết nối Internet!
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => {
                onManualSave();
              }}
              className="w-full bg-[#2d6a4f] hover:bg-[#1b4332] text-white font-bold py-2.5 px-4 rounded-lg border border-[#52b788] text-xs transition-all flex items-center justify-center gap-2 shadow"
            >
              <span>💾</span>
              <span>Lưu tiến trình ngay bây giờ</span>
            </button>

            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="w-full bg-[#8b5a2b] hover:bg-[#9e2a2b] text-white font-bold py-2 px-4 rounded-lg border border-[#d4a373] text-xs transition-all flex items-center justify-center gap-2"
              >
                <span>🔄</span>
                <span>Khởi tạo lại tiệm mới từ đầu</span>
              </button>
            ) : (
              <div className="bg-[#9e2a2b] p-3 rounded-lg border border-[#e63946] text-center space-y-2">
                <div className="text-xs font-bold text-white">
                  Bạn có chắc chắn muốn xóa dữ liệu cũ và chơi lại từ Ngày 1?
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      onResetSave();
                      setConfirmReset(false);
                      onClose();
                    }}
                    className="bg-[#540b0e] hover:bg-black text-white text-xs font-bold px-3 py-1.5 rounded border border-white/40"
                  >
                    Đồng ý xóa & làm lại
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded"
                  >
                    Hủy bỏ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#1e140f] px-4 py-3 border-t border-[#d4a373]/30 flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#8b5a2b] hover:bg-[#a06535] text-white text-xs font-bold px-4 py-2 rounded-lg border border-[#ffd166] transition-colors"
          >
            Đóng [Esc]
          </button>
        </div>
      </div>
    </div>
  );
};

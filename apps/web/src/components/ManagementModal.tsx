import { useWeatherFx, WEATHER_QUALITY_LABEL, WEATHER_QUALITY_ORDER } from '../hooks/useWeatherFx';
import React from 'react';
import { PixelDialog, PixelIcon, type IconName } from './pixel';
import { applyAppUpdate, checkForAppUpdate, isAppUpdateReady, subscribeAppUpdate, type AppUpdateResult } from '../services/app-update';

export interface ManagementItem {
  id: string;
  label: string;
  desc: string;
  icon: IconName;
  action: () => void;
  badge?: string;
  badgeVariant?: 'brick' | 'teal' | 'gold';
  disabled?: boolean;
  category: 'hr_social' | 'growth' | 'business' | 'system';
}

interface ManagementModalProps {
  onClose: () => void;
  onOpenStaff?: () => void;
  wageDebt?: number;
  playerLevel: number;
  onOpenRegulars?: () => void;
  onOpenSkills?: () => void;
  onOpenTitles?: () => void;
  onOpenMarket?: () => void;
  onOpenTax?: () => void;
  onOpenStalls?: () => void;
  onOpenSecurity?: () => void;
  onOpenAnalytics?: () => void;
  audioMuted?: boolean;
  onToggleAudioMute?: () => void;
  maintenanceAlerts?: number;
  onOpenMaintenance?: () => void;
  onOpenChain?: () => void;
  onOpenLevelRoadmap?: () => void;
  onOpenPlanogram?: () => void;
  emptySlotsCount?: number;
  onOpenLayout?: () => void;
  canEditLayout?: boolean;
  isStoreOpen?: boolean;
  onToggleSaveModal?: () => void;
}

export const ManagementModal: React.FC<ManagementModalProps> = ({
  onClose,
  onOpenStaff,
  wageDebt = 0,
  playerLevel,
  onOpenRegulars,
  onOpenSkills,
  onOpenTitles,
  onOpenMarket,
  onOpenTax,
  onOpenStalls,
  onOpenSecurity,
  onOpenAnalytics,
  audioMuted = false,
  onToggleAudioMute,
  maintenanceAlerts = 0,
  onOpenMaintenance,
  onOpenChain,
  onOpenLevelRoadmap,
  onOpenPlanogram,
  emptySlotsCount = 0,
  onOpenLayout,
  canEditLayout = false,
  isStoreOpen = false,
  onToggleSaveModal,
}) => {
  const [weatherFx, setWeatherFx] = useWeatherFx();
  const [updateStatus, setUpdateStatus] = React.useState<AppUpdateResult | 'checking' | null>(null);
  const updateText: Record<AppUpdateResult | 'checking', string> = {
    checking: 'Đang kiểm tra…',
    available: 'Đã có bản mới. Bấm lại để lưu tiến trình và cập nhật',
    'up-to-date': 'Bạn đang dùng bản mới nhất',
    offline: 'Không có mạng, thử lại sau',
    unsupported: 'Chỉ hoạt động ở bản đã cài/build (có service worker)',
    error: 'Kiểm tra thất bại, thử lại sau',
  };
  const updateReady = React.useSyncExternalStore(subscribeAppUpdate, isAppUpdateReady);
  const handleCheckUpdate = () => {
    if (updateStatus === 'checking') return;
    if (updateReady) { onClose(); void applyAppUpdate(); return; }
    setUpdateStatus('checking');
    void checkForAppUpdate().then(setUpdateStatus);
  };

  const handleSelect = (action?: () => void) => {
    if (!action) return;
    onClose();
    action();
  };

  const categories = [
    {
      id: 'hr_social',
      title: '👥 Nhân sự & Khách hàng',
      items: [
        {
          id: 'staff',
          label: 'Nhân viên',
          desc: playerLevel >= 2 ? 'Tuyển dụng, xếp ca và quản lý lương bổng' : 'Mở khóa tuyển dụng ở cấp độ 2',
          icon: 'person' as IconName,
          action: () => handleSelect(onOpenStaff),
          badge: wageDebt > 0 ? 'Nợ lương' : undefined,
          badgeVariant: 'brick' as const,
        },
        onOpenRegulars && {
          id: 'regulars',
          label: 'Khách quen',
          desc: 'Sổ khách quen đầu hẻm, độ thân thiết & đặc quyền',
          icon: 'heart' as IconName,
          action: () => handleSelect(onOpenRegulars),
        },
        onOpenSecurity && {
          id: 'security',
          label: 'An ninh tiệm',
          desc: 'Camera giám sát, bảo vệ trông xe và chống trộm',
          icon: 'person' as IconName,
          action: () => handleSelect(onOpenSecurity),
        },
      ].filter(Boolean) as ManagementItem[],
    },
    {
      id: 'growth',
      title: '⭐ Phát triển & Kỹ năng',
      items: [
        onOpenSkills && {
          id: 'skills',
          label: 'Kỹ năng & Đặc quyền',
          desc: 'Cây 3 nhánh kỹ năng: Bán hàng, Quản lý, Giao tiếp',
          icon: 'star' as IconName,
          action: () => handleSelect(onOpenSkills),
        },
        onOpenTitles && {
          id: 'titles',
          label: 'Danh hiệu',
          desc: 'Danh hiệu chủ tiệm và các mốc thành tựu đạt được',
          icon: 'star' as IconName,
          action: () => handleSelect(onOpenTitles),
        },
        onOpenLevelRoadmap && {
          id: 'level-roadmap',
          label: 'Lộ trình cấp độ',
          desc: `Cấp hiện tại: ${playerLevel}. Xem các mốc mở khóa`,
          icon: 'speed' as IconName,
          action: () => handleSelect(onOpenLevelRoadmap),
        },
      ].filter(Boolean) as ManagementItem[],
    },
    {
      id: 'business',
      title: '📊 Kinh doanh & Vận hành',
      items: [
        onOpenAnalytics && {
          id: 'analytics',
          label: 'Phân tích',
          desc: 'Biểu đồ giá, doanh số và bản đồ nhiệt lưu lượng khách',
          icon: 'book' as IconName,
          action: () => handleSelect(onOpenAnalytics),
        },
        onOpenPlanogram && {
          id: 'planogram',
          label: 'Sơ đồ & Bày hàng',
          desc: 'Xem tổng quan tất cả kệ tiệm, châm hàng nhanh hoặc đặt thêm từ đại lý',
          icon: 'warehouse' as IconName,
          action: () => handleSelect(onOpenPlanogram),
          badge: emptySlotsCount > 0 ? `${emptySlotsCount} ô hết` : undefined,
          badgeVariant: 'brick' as const,
        },
        onOpenMarket && {
          id: 'market',
          label: 'Thị trường & Thời tiết',
          desc: 'Dự báo thời tiết, xu hướng mặt hàng và lễ hội',
          icon: 'sun' as IconName,
          action: () => handleSelect(onOpenMarket),
        },
        onOpenTax && {
          id: 'tax',
          label: 'Thuế & Sổ sách',
          desc: 'Theo dõi doanh thu năm và hồ sơ kinh doanh',
          icon: 'book' as IconName,
          action: () => handleSelect(onOpenTax),
        },
        onOpenStalls && {
          id: 'stalls',
          label: 'Quầy ăn uống',
          desc: 'Quầy phục vụ cà phê, điểm tâm & dịch vụ phụ',
          icon: 'coin' as IconName,
          action: () => handleSelect(onOpenStalls),
        },
        (maintenanceAlerts > 0 || onOpenMaintenance) && {
          id: 'maintenance',
          label: 'Sửa chữa nội thất',
          desc: maintenanceAlerts > 0 ? `${maintenanceAlerts} kệ/tủ cần bảo trì` : 'Kiểm tra hao mòn và tình trạng kệ hàng',
          icon: 'warning' as IconName,
          action: () => handleSelect(onOpenMaintenance),
          badge: maintenanceAlerts > 0 ? `${maintenanceAlerts} cần sửa` : undefined,
          badgeVariant: 'brick' as const,
        },
        onOpenChain && {
          id: 'chain',
          label: 'Chuỗi chi nhánh',
          desc: 'Mở chi nhánh, xem doanh thu và chuyển hàng từ kho tổng',
          icon: 'door' as IconName,
          action: () => handleSelect(onOpenChain),
        },
        onOpenLayout && {
          id: 'layout',
          label: 'Sắp xếp tiệm',
          desc: isStoreOpen ? 'Cần nghỉ bán để thay đổi bố cục' : 'Thay đổi vị trí kệ, tủ và nội thất tiệm',
          icon: 'warehouse' as IconName,
          action: () => handleSelect(onOpenLayout),
          disabled: isStoreOpen || !canEditLayout,
          badge: isStoreOpen ? 'Đang mở cửa' : undefined,
        },
      ].filter(Boolean) as ManagementItem[],
    },
    {
      id: 'system',
      title: '💾 Tiện ích & Lưu trữ',
      items: [
        onToggleSaveModal && {
          id: 'save',
          label: 'Lưu tiến trình',
          desc: 'Lưu thủ công save game và quản lý dữ liệu máy chủ',
          icon: 'save' as IconName,
          action: () => handleSelect(onToggleSaveModal),
        },
        onToggleAudioMute && {
          id: 'audio',
          label: audioMuted ? 'Bật âm thanh' : 'Tắt âm thanh',
          desc: 'Âm thanh môi trường theo thời tiết và giờ; chỉ phát sau khi bạn tương tác, tạm dừng khi tab ẩn',
          icon: 'speed' as IconName,
          action: () => onToggleAudioMute(),
          badge: audioMuted ? 'Đang tắt' : undefined,
          badgeVariant: 'gold' as const,
        },
        {
          id: 'weather-quality',
          label: `Chất lượng thời tiết: ${WEATHER_QUALITY_LABEL[weatherFx.quality ?? 'auto']}`,
          desc: 'Mật độ mưa, mây, lá bay. Tự động: điện thoại = Vừa, máy tính = Cao. Bấm để đổi vòng Tự động → Thấp → Vừa → Cao',
          icon: 'cold' as IconName,
          action: () => setWeatherFx({ quality: WEATHER_QUALITY_ORDER[(WEATHER_QUALITY_ORDER.indexOf(weatherFx.quality) + 1) % WEATHER_QUALITY_ORDER.length] }),
        },
        {
          id: 'check-update',
          label: updateReady ? 'Cập nhật ngay' : 'Kiểm tra cập nhật',
          desc: updateReady ? updateText.available : updateStatus ? updateText[updateStatus] : 'Tải giao diện/phiên bản mới nhất của game nếu có',
          icon: 'speed' as IconName,
          action: handleCheckUpdate,
          badge: updateReady ? 'Có bản mới' : undefined,
          badgeVariant: 'teal' as const,
        },
      ].filter(Boolean) as ManagementItem[],
    },
  ];

  return (
    <PixelDialog
      title="Sổ quản lý tiệm"
      subtitle="Các chức năng điều hành, nhân sự và mở rộng"
      icon="menu"
      onClose={onClose}
    >
      <div className="management-modal-container">
        {categories.map((cat) => {
          if (cat.items.length === 0) return null;
          return (
            <section key={cat.id} className="management-section">
              <h3 className="management-section-title">{cat.title}</h3>
              <div className="management-grid">
                {cat.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`management-card ${item.disabled ? 'is-disabled' : ''}`}
                    onClick={item.disabled ? undefined : item.action}
                    disabled={item.disabled}
                    title={item.desc}
                  >
                    <div className="management-card-icon">
                      <PixelIcon name={item.icon} size={24} />
                    </div>
                    <div className="management-card-info">
                      <div className="management-card-header">
                        <strong className="management-card-title">{item.label}</strong>
                        {item.badge && (
                          <span className={`management-badge badge-${item.badgeVariant ?? 'default'}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="management-card-desc">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </PixelDialog>
  );
};

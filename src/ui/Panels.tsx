import { Suspense, lazy, useEffect } from 'react';
import { useGame } from '../core/store';
import { styles, Tabs } from './panels/shared';
import { hubOf, hubTabs } from './hubs';

// Mỗi bảng là một chunk riêng: chỉ tải khi người chơi mở lần đầu (giữ tải ban đầu nhẹ).
const BranchPanel = lazy(() => import('./BranchPanel').then((m) => ({ default: m.BranchPanel })));
const ArrangePanel = lazy(() => import('./ArrangePanel').then((m) => ({ default: m.ArrangePanel })));
const OrderPanel = lazy(() => import('./OrderPanel').then((m) => ({ default: m.OrderPanel })));
const PlanogramPanel = lazy(() => import('./PlanogramPanel').then((m) => ({ default: m.PlanogramPanel })));
const QuestPanel = lazy(() => import('./QuestPanel').then((m) => ({ default: m.QuestPanel })));
const ContractsPanel = lazy(() => import('./ContractsPanel').then((m) => ({ default: m.ContractsPanel })));
const CostumePanel = lazy(() => import('./CostumePanel').then((m) => ({ default: m.CostumePanel })));
const BusinessPanel = lazy(() => import('./BusinessPanel').then((m) => ({ default: m.BusinessPanel })));
const ShelfPanel = lazy(() => import('./panels/ShelfPanel').then((m) => ({ default: m.ShelfPanel })));
const SkillsPanel = lazy(() => import('./panels/SkillsPanel').then((m) => ({ default: m.SkillsPanel })));
const StoragePanel = lazy(() => import('./panels/StoragePanel').then((m) => ({ default: m.StoragePanel })));
const BuildPanel = lazy(() => import('./panels/BuildPanel').then((m) => ({ default: m.BuildPanel })));
const StaffPanel = lazy(() => import('./panels/StaffPanel').then((m) => ({ default: m.StaffPanel })));
const PricePanel = lazy(() => import('./panels/PricePanel').then((m) => ({ default: m.PricePanel })));
const RegularsPanel = lazy(() => import('./panels/RegularsPanel').then((m) => ({ default: m.RegularsPanel })));
const SummaryPanel = lazy(() => import('./panels/ReportPanels').then((m) => ({ default: m.SummaryPanel })));
const MorningPanel = lazy(() => import('./panels/MorningPanel').then((m) => ({ default: m.MorningPanel })));
const HistoryPanel = lazy(() => import('./panels/HistoryPanel').then((m) => ({ default: m.HistoryPanel })));
const ComboPanel = lazy(() => import('./panels/ComboPanel').then((m) => ({ default: m.ComboPanel })));
const LevelsPanel = lazy(() => import('./panels/LevelsPanel').then((m) => ({ default: m.LevelsPanel })));
const ReviewsPanel = lazy(() => import('./panels/ReviewsPanel').then((m) => ({ default: m.ReviewsPanel })));
const CalendarPanel = lazy(() => import('./panels/CalendarPanel').then((m) => ({ default: m.CalendarPanel })));
const GiftPanel = lazy(() => import('./panels/GiftPanel').then((m) => ({ default: m.GiftPanel })));
const CookPanel = lazy(() => import('./panels/CookPanel').then((m) => ({ default: m.CookPanel })));
const SocialPanel = lazy(() => import('./panels/SocialPanel').then((m) => ({ default: m.SocialPanel })));
const OnlinePanel = lazy(() => import('./panels/OnlinePanel').then((m) => ({ default: m.OnlinePanel })));
const CommunityPanel = lazy(() => import('./panels/CommunityPanel').then((m) => ({ default: m.CommunityPanel })));
const LicensesPanel = lazy(() => import('./panels/LicensesPanel').then((m) => ({ default: m.LicensesPanel })));
const GardenPanel = lazy(() => import('./panels/GardenPanel').then((m) => ({ default: m.GardenPanel })));
const AnalyticsPanel = lazy(() => import('./panels/AnalyticsPanel').then((m) => ({ default: m.AnalyticsPanel })));
const QuanNuocPanel = lazy(() => import('./panels/QuanNuocPanel').then((m) => ({ default: m.QuanNuocPanel })));
const RecordsPanel = lazy(() => import('./panels/RecordsPanel').then((m) => ({ default: m.RecordsPanel })));
const DiscoveryPanel = lazy(() => import('./panels/DiscoveryPanel').then((m) => ({ default: m.DiscoveryPanel })));
const LandmarkPanel = lazy(() => import('./panels/LandmarkPanel').then((m) => ({ default: m.LandmarkPanel })));
const DossierPanel = lazy(() => import('./panels/DossierPanel').then((m) => ({ default: m.DossierPanel })));
const RoadmapPanel = lazy(() => import('./panels/RoadmapPanel').then((m) => ({ default: m.RoadmapPanel })));
const BrandPanel = lazy(() => import('./panels/BrandPanel').then((m) => ({ default: m.BrandPanel })));
const TodoListPanel = lazy(() => import('./panels/TodoListPanel').then((m) => ({ default: m.TodoListPanel })));
const NotifLogPanel = lazy(() => import('./panels/NotifLogPanel').then((m) => ({ default: m.NotifLogPanel })));

/** GĐ2349 — khung "vừa" cho vài panel nội dung vốn ngắn (Sổ thông báo): không ép khung LỚN 688px
 *  thì hết khoảng trống đáy lớn khi tin còn ít. Mỗi loại vẫn MỘT khung cố định (không co giãn theo
 *  nội dung — luật GĐ662), chỉ chọn cỡ trong hệ thống khung nhỏ/vừa/lớn của thiết kế. */
export const PANEL_HEIGHT: Partial<Record<string, string>> = {
  log: 'min(520px, calc(100dvh - 108px))',
};

export function Panels() {
  const panel = useGame((s) => s.panel);
  const closePanel = useGame((s) => s.closePanel);
  const openPanel = useGame((s) => s.openPanel);
  const level = useGame((s) => s.level);
  // Esc để đóng bảng đang mở
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closePanel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, closePanel]);
  if (!panel) return null;
  const hub = hubOf(panel.type);
  // Màn sắp xếp chiếm cả màn hình, có khung riêng
  if (panel.type === 'arrange') return <Suspense fallback={<div style={styles.backdrop}><PanelLoading /></div>}><ArrangePanel /></Suspense>;
  return (
    <div style={styles.backdrop} onClick={(e) => e.target === e.currentTarget && closePanel()}>
      <div className="panel" style={{ ...styles.panel, ...(PANEL_HEIGHT[panel.type] ? { height: PANEL_HEIGHT[panel.type] } : {}) }}>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', width: '100%', minWidth: 0 }}>
          <button style={{ ...styles.close, float: undefined, alignSelf: 'flex-end', marginBottom: -30, flex: 'none' }} title="Đóng (Esc)" aria-label="Đóng" onClick={closePanel}>✕</button>
          {hub && <Tabs tabs={hubTabs(hub, level, panel.type)} value={panel.type} onChange={(t) => openPanel({ type: t } as never)} />}
        {/* Playtest P1 T4: panel tải lười hiện khung chờ thay vì màn trắng ~3 giây (tưởng treo) */}
        <Suspense fallback={<PanelLoading />}>
        {panel.type === 'order' && <OrderPanel />}
        {panel.type === 'social' && <SocialPanel />}
        {panel.type === 'online' && <OnlinePanel />}
        {panel.type === 'community' && <CommunityPanel />}
        {panel.type === 'licenses' && <LicensesPanel />}
        {panel.type === 'shelf' && <ShelfPanel uid={panel.uid} />}
        {panel.type === 'build' && <BuildPanel />}
        {panel.type === 'prices' && <PricePanel />}
        {panel.type === 'staff' && <StaffPanel />}
        {panel.type === 'branch' && <BranchPanel />}
        {panel.type === 'summary' && <SummaryPanel day={panel.day} />}
        {panel.type === 'levels' && <LevelsPanel />}
        {panel.type === 'reviews' && <ReviewsPanel />}
        {panel.type === 'storage' && <StoragePanel />}
        {panel.type === 'planogram' && <PlanogramPanel />}
        {panel.type === 'quests' && <QuestPanel />}
        {panel.type === 'regulars' && <RegularsPanel />}
        {panel.type === 'skills' && <SkillsPanel />}
        {panel.type === 'combos' && <ComboPanel />}
        {panel.type === 'contracts' && <ContractsPanel />}
        {panel.type === 'costume' && <CostumePanel />}
        {panel.type === 'business' && <BusinessPanel />}
        {panel.type === 'calendar' && <CalendarPanel />}
        {panel.type === 'gifts' && <GiftPanel />}
        {panel.type === 'cook' && <CookPanel />}
        {panel.type === 'morning' && <MorningPanel />}
        {panel.type === 'history' && <HistoryPanel />}
        {panel.type === 'garden' && <GardenPanel />}
        {panel.type === 'quannuoc' && <QuanNuocPanel />}
        {panel.type === 'analytics' && <AnalyticsPanel />}
        {panel.type === 'discovery' && <DiscoveryPanel />}
        {panel.type === 'landmark' && <LandmarkPanel />}
        {panel.type === 'records' && <RecordsPanel />}
        {panel.type === 'dossier' && <DossierPanel closePanel={closePanel} />}
        {panel.type === 'roadmap' && <RoadmapPanel />}
        {panel.type === 'brand' && <BrandPanel />}
        {panel.type === 'todo' && <TodoListPanel />}
        {panel.type === 'log' && <NotifLogPanel />}
        </Suspense>
        </div>
      </div>
    </div>
  );
}

/** Khung chờ khi panel đang tải (playtest P1 T4). */
export function PanelLoading() {
  return (
    <div style={{ background: '#2b2b3a', color: '#fff', borderRadius: 12, padding: '18px 28px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}>
      <p role="status" aria-live="polite" style={{ margin: 0, opacity: 0.85, textAlign: 'center' }}>⏳ Đang mở…</p>
    </div>
  );
}

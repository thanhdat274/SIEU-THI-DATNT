import { BranchPanel } from './BranchPanel';
import { useEffect } from 'react';
import { ArrangePanel } from './ArrangePanel';
import { OrderPanel } from './OrderPanel';
import { PlanogramPanel } from './PlanogramPanel';
import { QuestPanel } from './QuestPanel';
import { ContractsPanel } from './ContractsPanel';
import { CostumePanel } from './CostumePanel';
import { BusinessPanel } from './BusinessPanel';
import { useGame } from '../core/store';
import { styles } from './panels/shared';
import { ShelfPanel } from './panels/ShelfPanel';
import { SkillsPanel } from './panels/SkillsPanel';
import { StoragePanel } from './panels/StoragePanel';
import { BuildPanel } from './panels/BuildPanel';
import { StaffPanel } from './panels/StaffPanel';
import { PricePanel } from './panels/PricePanel';
import { RegularsPanel } from './panels/RegularsPanel';
import { SummaryPanel, MorningPanel, HistoryPanel } from './panels/ReportPanels';
import { ComboPanel } from './panels/ComboPanel';
import { LevelsPanel } from './panels/LevelsPanel';
import { ReviewsPanel } from './panels/ReviewsPanel';
import { CalendarPanel } from './panels/CalendarPanel';
import { GiftPanel } from './panels/GiftPanel';
import { CookPanel } from './panels/CookPanel';
import { SocialPanel } from './panels/SocialPanel';
import { OnlinePanel } from './panels/OnlinePanel';
import { LicensesPanel } from './panels/LicensesPanel';
import { GardenPanel } from './panels/GardenPanel';
import { AnalyticsPanel } from './panels/AnalyticsPanel';

export function Panels() {
  const panel = useGame((s) => s.panel);
  const closePanel = useGame((s) => s.closePanel);
  // Esc để đóng bảng đang mở
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closePanel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, closePanel]);
  if (!panel) return null;
  // Màn sắp xếp chiếm cả màn hình, có khung riêng
  if (panel.type === 'arrange') return <ArrangePanel />;
  return (
    <div style={styles.backdrop} onClick={(e) => e.target === e.currentTarget && closePanel()}>
      <div style={styles.panel}>
        <button style={styles.close} title="Đóng (Esc)" aria-label="Đóng" onClick={closePanel}>✕</button>
        {panel.type === 'order' && <OrderPanel />}
        {panel.type === 'social' && <SocialPanel />}
        {panel.type === 'online' && <OnlinePanel />}
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
        {panel.type === 'analytics' && <AnalyticsPanel />}
      </div>
    </div>
  );
}

// Các tab/biểu đồ dùng lại ở bảng khác
export { ExpandTab, PaintTab } from './panels/BuildPanel';
export { HistoryChart } from './panels/ReportPanels';

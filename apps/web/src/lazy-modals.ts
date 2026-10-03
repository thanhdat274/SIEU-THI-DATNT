import React, { lazy } from 'react';

/** Modal ít mở nạp theo yêu cầu để không nằm trong chunk đầu (I-10). */
const lazyModal = <P,>(load: () => Promise<Record<string, unknown>>, name: string) =>
  lazy(() => load().then((m) => ({ default: m[name] as React.ComponentType<P> })));
const AnalyticsModal = lazyModal<React.ComponentProps<typeof import('./components/AnalyticsModal').AnalyticsModal>>(() => import('./components/AnalyticsModal'), 'AnalyticsModal');
const KitchenStationModal = lazyModal<React.ComponentProps<typeof import('./components/KitchenStationModal').KitchenStationModal>>(() => import('./components/KitchenStationModal'), 'KitchenStationModal');
const DiningTableModal = lazyModal<React.ComponentProps<typeof import('./components/DiningTableModal').DiningTableModal>>(() => import('./components/DiningTableModal'), 'DiningTableModal');
const SaveModal = lazyModal<React.ComponentProps<typeof import('./components/SaveModal').SaveModal>>(() => import('./components/SaveModal'), 'SaveModal');
const SupplierModal = lazyModal<React.ComponentProps<typeof import('./components/SupplierModal').SupplierModal>>(() => import('./components/SupplierModal'), 'SupplierModal');
const TimeVoteModal = lazyModal<React.ComponentProps<typeof import('./components/TimeVoteModal').TimeVoteModal>>(() => import('./components/TimeVoteModal'), 'TimeVoteModal');
const StoreLayoutModal = lazyModal<React.ComponentProps<typeof import('./components/StoreLayoutModal').StoreLayoutModal>>(() => import('./components/StoreLayoutModal'), 'StoreLayoutModal');
const StorePlanogramModal = lazyModal<React.ComponentProps<typeof import('./components/StorePlanogramModal').StorePlanogramModal>>(() => import('./components/StorePlanogramModal'), 'StorePlanogramModal');
const QuestModal = lazyModal<React.ComponentProps<typeof import('./components/QuestModal').QuestModal>>(() => import('./components/QuestModal'), 'QuestModal');
const LevelRoadmapModal = lazyModal<React.ComponentProps<typeof import('./components/LevelRoadmapModal').LevelRoadmapModal>>(() => import('./components/LevelRoadmapModal'), 'LevelRoadmapModal');
const StallModal = lazyModal<React.ComponentProps<typeof import('./components/StallModal').StallModal>>(() => import('./components/StallModal'), 'StallModal');
const MarketModal = lazyModal<React.ComponentProps<typeof import('./components/MarketModal').MarketModal>>(() => import('./components/MarketModal'), 'MarketModal');
const TaxModal = lazyModal<React.ComponentProps<typeof import('./components/TaxModal').TaxModal>>(() => import('./components/TaxModal'), 'TaxModal');
const DaySummaryModal = lazyModal<React.ComponentProps<typeof import('./components/DaySummaryModal').DaySummaryModal>>(() => import('./components/DaySummaryModal'), 'DaySummaryModal');
const RegularsModal = lazyModal<React.ComponentProps<typeof import('./components/RegularsModal').RegularsModal>>(() => import('./components/RegularsModal'), 'RegularsModal');
const SkillsModal = lazyModal<React.ComponentProps<typeof import('./components/SkillsModal').SkillsModal>>(() => import('./components/SkillsModal'), 'SkillsModal');
const TitlesModal = lazyModal<React.ComponentProps<typeof import('./components/TitlesModal').TitlesModal>>(() => import('./components/TitlesModal'), 'TitlesModal');
const MaintenanceModal = lazyModal<React.ComponentProps<typeof import('./components/MaintenanceModal').MaintenanceModal>>(() => import('./components/MaintenanceModal'), 'MaintenanceModal');
const ReviewsModal = lazyModal<React.ComponentProps<typeof import('./components/ReviewsModal').ReviewsModal>>(() => import('./components/ReviewsModal'), 'ReviewsModal');
const SecurityModal = lazyModal<React.ComponentProps<typeof import('./components/SecurityModal').SecurityModal>>(() => import('./components/SecurityModal'), 'SecurityModal');

export { AnalyticsModal, KitchenStationModal, DiningTableModal, SaveModal, SupplierModal, TimeVoteModal, StoreLayoutModal, StorePlanogramModal, QuestModal, LevelRoadmapModal, StallModal, MarketModal, TaxModal, DaySummaryModal, RegularsModal, SkillsModal, TitlesModal, MaintenanceModal, ReviewsModal, SecurityModal };

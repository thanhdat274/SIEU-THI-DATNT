const fs = require('fs');

// 1. Fix PlanogramPanel.tsx
let plano = fs.readFileSync('src/ui/PlanogramPanel.tsx', 'utf8');
plano = plano.replace(
  "width: 'min(900px, calc(100vw - 76px))'",
  "width: '100%', maxWidth: 900"
);
plano = plano.replace(
  "display: 'flex', alignItems: 'stretch', gap: 6, marginTop: 6",
  "display: 'flex', alignItems: 'stretch', gap: 6, marginTop: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4"
);
fs.writeFileSync('src/ui/PlanogramPanel.tsx', plano, 'utf8');
console.log('Fixed PlanogramPanel.tsx');

// 2. Fix CalendarPanel.tsx
let cal = fs.readFileSync('src/ui/panels/CalendarPanel.tsx', 'utf8');
cal = cal.replace(
  "display: 'grid', gap: 3, marginBottom: 14, maxWidth: 660",
  "display: 'grid', gap: 3, marginBottom: 14, maxWidth: 660, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 6"
);
fs.writeFileSync('src/ui/panels/CalendarPanel.tsx', cal, 'utf8');
console.log('Fixed CalendarPanel.tsx');

// 3. Fix DiscoveryPanel.tsx
let disc = fs.readFileSync('src/ui/panels/DiscoveryPanel.tsx', 'utf8');
disc = disc.replace(
  "display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 4",
  "display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 4"
);
fs.writeFileSync('src/ui/panels/DiscoveryPanel.tsx', disc, 'utf8');
console.log('Fixed DiscoveryPanel.tsx');

import React from 'react';
import { money } from './pixel';

/** Một dòng thành tích (tòa hoặc người phụ trách) — OpenSpec `open-world-coop-contracts` 3.1. */
export interface ScoreRow { key: string; name: string; detail?: string; revenue: number; cogs: number; costs: number; profit: number }

/** Danh sách thành tích gọn (một cột, hợp màn dọc điện thoại): tên · lãi, dòng phụ doanh thu/giá vốn/chi phí. */
export const Scoreboard: React.FC<{ rows: readonly ScoreRow[] }> = ({ rows }) =>
  <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', display: 'grid', gap: 4, fontSize: 12 }} data-scoreboard>
    {rows.map(row => <li key={row.key}>
      <strong>{row.name}</strong>{row.detail ? <span className="muted"> · {row.detail}</span> : null} · lãi <strong style={{ color: row.profit >= 0 ? 'var(--color-green-dark)' : 'var(--color-brick)' }}>{money(row.profit)}</strong>
      <br/><span className="muted">Thu {money(row.revenue)} · vốn {money(row.cogs)} · chi {money(row.costs)}</span>
    </li>)}
  </ul>;

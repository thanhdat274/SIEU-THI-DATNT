/**
 * Lệnh server tự phát lại trên runtime của mình (save client gửi kèm bị bỏ qua, server dựng save chuẩn).
 * Client dùng danh sách này để không gửi kèm cả save (~100 KB) cho các lệnh này.
 */
export const SERVER_REPLAYED_COMMAND_TYPES: ReadonlySet<string> = new Set([
  'checkout', 'repay_customer_credit', 'clean_dining_table', 'assign_dining_cleanup', 'start_production', 'respond_party_order', 'fulfill_party_order', 'rush_fulfill_party_order', 'claim_goal',
  'respond_review',
  'claim_weekly_quest', 'claim_festival_goal', 'begin_story_chapter', 'claim_story_chapter', 'choose_perk', 'set_title', 'maintain_fixture', 'maintain_all_service', 'security_action',
  'order_supplier', 'buy_stall', 'dispose_stock', 'open_case', 'claim_quest',
  'restock', 'unstock', 'set_price', 'reset_prices', 'set_restock_options', 'set_auto_buy_stalls', 'set_auto_buy_config',
  'hire_staff', 'pay_wage_debt', 'set_staff_shift', 'assign_staff_building', 'assign_refill_job',
  'buy_plot', 'buy_warehouse_tier', 'buy_storage_rack', 'auto_buy_sync',
  'reclaim_wave', 'buy_parcel', 'open_building', 'lease_parcel', 'end_lease', 'pay_rent_debt',
  'claim_city_goal',
  'donate_to_bundle',
  'store_status', 'set_tax_declaration', 'advance_day', 'stow', 'stow_all', 'planogram_assignment', 'planogram_restock', 'auto_restock', 'auto_fill_shelf',
  'open_branch', 'switch_branch', 'transfer_stock', 'return_stock', 'set_branch_policy',
]);

export type CardStatus = 'CRITICAL' | 'WARNING' | 'WATCH' | 'HEALTHY';

export interface AlertOut {
  id: number;
  alert_type: string;
  severity: string;
  message: string;
  created_at: string;
}

export interface SKUCard {
  id: number;
  sku_code: string;
  name: string;
  category: string;
  unit: string;
  on_hand: number;
  on_order: number;
  days_of_supply: number;
  reorder_point: number;
  card_status: CardStatus;
  active_alerts: AlertOut[];
  has_active_promo: boolean;
  nearest_expiry_date: string | null;
  days_until_expiry: number | null;
}

export interface PromotionOut {
  id: number;
  promo_name: string;
  start_date: string;
  end_date: string;
  expected_uplift_pct: number;
}

export interface ExpiryBatchOut {
  id: number;
  batch_number: string;
  quantity: number;
  expiry_date: string;
  days_until_expiry: number;
}

export interface StockLevelOut {
  on_hand: number;
  on_order: number;
  last_updated: string;
}

export interface SalesStatsOut {
  daily_avg: number;
  weekly_total: number;
  monthly_total: number;
}

export interface SKUDetail {
  id: number;
  sku_code: string;
  name: string;
  category: string;
  unit: string;
  supplier_name: string;
  supplier_email: string;
  lead_time_days: number;
  unit_cost: number;
  reorder_point: number;
  reorder_qty: number;
  stock: StockLevelOut;
  days_of_supply: number;
  days_of_supply_after_order: number;
  card_status: CardStatus;
  sales_stats: SalesStatsOut;
  promotions: PromotionOut[];
  has_active_promo: boolean;
  expiry_batches: ExpiryBatchOut[];
  active_alerts: AlertOut[];
}

export interface DashboardOut {
  total_skus: number;
  critical_count: number;
  warning_count: number;
  watch_count: number;
  healthy_count: number;
  stockout_count: number;
  low_stock_count: number;
  near_expiry_count: number;
  promo_active_count: number;
  recent_alerts: AlertOut[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
  suggested_actions: string[];
}

/** Optional CSS selectors / keywords to tune parsing for a specific retailer page. */
export interface ParserSelectors {
  title?: string;
  price?: string;
  availability?: string;
  inStockText?: string[];
  outOfStockText?: string[];
}

export interface RetailerTarget {
  name: string;
  url: string;
  selectors?: ParserSelectors;
}

export interface Tracker {
  gpuModel: string;
  /** Alert when the price drops to or below this value. */
  targetPrice?: number;
  enabled?: boolean;
  retailers: RetailerTarget[];
}

export interface PollRetailerJobData {
  gpuModel: string;
  targetPrice?: number;
  retailer: RetailerTarget;
}

export interface ParseHtmlJobData extends PollRetailerJobData {
  html: string;
  fetchedAt: string;
}

export interface ParsedProduct {
  title: string | null;
  price: number | null;
  currency: string | null;
  inStock: boolean | null;
}

export interface ProductSnapshot extends ParsedProduct {
  gpuModel: string;
  retailer: string;
  url: string;
  targetPrice?: number;
  checkedAt: string;
}

export type AlertType = 'BACK_IN_STOCK' | 'PRICE_DROP' | 'TARGET_PRICE_REACHED';

export interface Alert {
  type: AlertType;
  message: string;
  gpuModel: string;
  retailer: string;
  url: string;
  price: number | null;
  previousPrice: number | null;
  currency: string | null;
  createdAt: string;
}

export interface SendNotificationJobData {
  channel: string;
  alert: Alert;
}

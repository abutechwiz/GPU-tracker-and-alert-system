import { Alert, AlertType, ProductSnapshot } from '../common/types';

export interface EvaluateOptions {
  /** Minimum percentage drop before a PRICE_DROP alert fires. */
  priceDropThresholdPercent: number;
}

export function formatPrice(
  price: number | null,
  currency: string | null,
): string {
  if (price === null) return 'unknown price';
  const amount = price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return currency ? `${currency} ${amount}` : amount;
}

function buildAlert(
  type: AlertType,
  message: string,
  current: ProductSnapshot,
  previous: ProductSnapshot | undefined,
): Alert {
  return {
    type,
    message,
    gpuModel: current.gpuModel,
    retailer: current.retailer,
    url: current.url,
    price: current.price,
    previousPrice: previous?.price ?? null,
    currency: current.currency,
    createdAt: current.checkedAt,
  };
}

/**
 * Compares a freshly parsed snapshot with the last known one and returns the
 * alerts that should be sent. Alerts only fire on state transitions, so a
 * product that stays in stock does not trigger repeated notifications.
 */
export function evaluateSnapshot(
  current: ProductSnapshot,
  previous: ProductSnapshot | undefined,
  options: EvaluateOptions,
): Alert[] {
  const alerts: Alert[] = [];
  const name = `${current.gpuModel} @ ${current.retailer}`;
  const price = formatPrice(current.price, current.currency);
  const notOutOfStock = current.inStock !== false;

  if (current.inStock === true && previous?.inStock !== true) {
    alerts.push(
      buildAlert(
        'BACK_IN_STOCK',
        `${name} is in stock for ${price}`,
        current,
        previous,
      ),
    );
  }

  const prevPrice = previous?.price ?? null;
  if (
    current.price !== null &&
    prevPrice !== null &&
    current.price < prevPrice &&
    notOutOfStock
  ) {
    const dropPercent = ((prevPrice - current.price) / prevPrice) * 100;
    if (dropPercent >= options.priceDropThresholdPercent) {
      alerts.push(
        buildAlert(
          'PRICE_DROP',
          `${name} dropped ${dropPercent.toFixed(1)}% from ${formatPrice(prevPrice, current.currency)} to ${price}`,
          current,
          previous,
        ),
      );
    }
  }

  const target = current.targetPrice;
  if (
    target !== undefined &&
    current.price !== null &&
    current.price <= target &&
    notOutOfStock
  ) {
    const wasAlreadyAtTarget =
      prevPrice !== null && prevPrice <= target && previous?.inStock !== false;
    if (!wasAlreadyAtTarget) {
      alerts.push(
        buildAlert(
          'TARGET_PRICE_REACHED',
          `${name} is at ${price}, at or below your target of ${formatPrice(target, current.currency)}`,
          current,
          previous,
        ),
      );
    }
  }

  return alerts;
}

/**
 * Merges a new snapshot with the previous one so that a page we failed to
 * parse (null fields) doesn't wipe out known state and cause duplicate alerts.
 */
export function mergeSnapshot(
  current: ProductSnapshot,
  previous: ProductSnapshot | undefined,
): ProductSnapshot {
  return {
    ...current,
    title: current.title ?? previous?.title ?? null,
    price: current.price ?? previous?.price ?? null,
    currency: current.currency ?? previous?.currency ?? null,
    inStock: current.inStock ?? previous?.inStock ?? null,
  };
}

import { ProductSnapshot } from '../common/types';
import { evaluateSnapshot, mergeSnapshot } from './alert-evaluator';

const opts = { priceDropThresholdPercent: 1 };

function snap(overrides: Partial<ProductSnapshot> = {}): ProductSnapshot {
  return {
    gpuModel: 'RTX 4090',
    retailer: 'Shop',
    url: 'https://shop.example/rtx-4090',
    title: 'RTX 4090',
    price: 1000,
    currency: 'USD',
    inStock: true,
    checkedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const types = (alerts: { type: string }[]) => alerts.map((a) => a.type);

describe('evaluateSnapshot', () => {
  it('alerts when a product is first seen in stock', () => {
    expect(types(evaluateSnapshot(snap(), undefined, opts))).toEqual([
      'BACK_IN_STOCK',
    ]);
  });

  it('does not alert when nothing changed', () => {
    expect(evaluateSnapshot(snap(), snap(), opts)).toEqual([]);
  });

  it('alerts on out of stock -> in stock', () => {
    const alerts = evaluateSnapshot(snap(), snap({ inStock: false }), opts);
    expect(types(alerts)).toEqual(['BACK_IN_STOCK']);
    expect(alerts[0].message).toBe('RTX 4090 @ Shop is in stock for USD 1,000');
  });

  it('does not alert for a product that is out of stock', () => {
    expect(evaluateSnapshot(snap({ inStock: false }), undefined, opts)).toEqual(
      [],
    );
  });

  it('alerts on a price drop above the threshold', () => {
    const alerts = evaluateSnapshot(
      snap({ price: 900 }),
      snap({ price: 1000 }),
      opts,
    );
    expect(types(alerts)).toEqual(['PRICE_DROP']);
    expect(alerts[0]).toMatchObject({ price: 900, previousPrice: 1000 });
    expect(alerts[0].message).toContain('dropped 10.0%');
  });

  it('ignores price drops below the threshold or on out of stock items', () => {
    expect(
      evaluateSnapshot(snap({ price: 995 }), snap({ price: 1000 }), opts),
    ).toEqual([]);
    expect(
      evaluateSnapshot(
        snap({ price: 900, inStock: false }),
        snap({ price: 1000, inStock: false }),
        opts,
      ),
    ).toEqual([]);
  });

  it('alerts once when the target price is reached', () => {
    const current = snap({ price: 950, targetPrice: 960 });
    expect(
      types(evaluateSnapshot(current, snap({ price: 1000 }), opts)),
    ).toEqual(['PRICE_DROP', 'TARGET_PRICE_REACHED']);
    // Already at target last time -> no repeat.
    expect(
      evaluateSnapshot(current, snap({ price: 955 }), {
        priceDropThresholdPercent: 5,
      }),
    ).toEqual([]);
  });

  it('alerts on target price when an item at target comes back in stock', () => {
    const alerts = evaluateSnapshot(
      snap({ price: 900, targetPrice: 950 }),
      snap({ price: 900, inStock: false }),
      opts,
    );
    expect(types(alerts)).toEqual(['BACK_IN_STOCK', 'TARGET_PRICE_REACHED']);
  });

  it('does not alert when the page could not be parsed', () => {
    expect(
      evaluateSnapshot(snap({ price: null, inStock: null }), snap(), opts),
    ).toEqual([]);
  });
});

describe('mergeSnapshot', () => {
  it('keeps previous values for fields that could not be parsed', () => {
    const merged = mergeSnapshot(
      snap({ price: null, inStock: null, title: null, checkedAt: 'later' }),
      snap({ price: 800, inStock: false }),
    );
    expect(merged).toMatchObject({
      price: 800,
      inStock: false,
      title: 'RTX 4090',
      checkedAt: 'later',
    });
  });
});

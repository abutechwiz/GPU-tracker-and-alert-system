import { Alert, ProductSnapshot } from '../common/types';

/** Persists the last known state of every tracked product and recent alerts. */
export interface StateStore {
  getSnapshot(
    retailer: string,
    gpuModel: string,
  ): Promise<ProductSnapshot | undefined>;
  saveSnapshot(snapshot: ProductSnapshot): Promise<void>;
  listSnapshots(): Promise<ProductSnapshot[]>;
  recordAlert(alert: Alert): Promise<void>;
  listAlerts(limit: number): Promise<Alert[]>;
}

export function snapshotKey(retailer: string, gpuModel: string): string {
  return `${retailer.toLowerCase()}::${gpuModel.toLowerCase()}`;
}

/** Simple in-memory store, used by tests. */
export class InMemoryStateStore implements StateStore {
  private readonly snapshots = new Map<string, ProductSnapshot>();
  private readonly alerts: Alert[] = [];

  getSnapshot(retailer: string, gpuModel: string) {
    return Promise.resolve(this.snapshots.get(snapshotKey(retailer, gpuModel)));
  }

  saveSnapshot(snapshot: ProductSnapshot) {
    this.snapshots.set(
      snapshotKey(snapshot.retailer, snapshot.gpuModel),
      snapshot,
    );
    return Promise.resolve();
  }

  listSnapshots() {
    return Promise.resolve([...this.snapshots.values()]);
  }

  recordAlert(alert: Alert) {
    this.alerts.unshift(alert);
    return Promise.resolve();
  }

  listAlerts(limit: number) {
    return Promise.resolve(this.alerts.slice(0, limit));
  }
}

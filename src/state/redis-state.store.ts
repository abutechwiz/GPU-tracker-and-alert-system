import type { Redis } from 'ioredis';
import { Alert, ProductSnapshot } from '../common/types';
import { StateStore, snapshotKey } from './state.store';

const SNAPSHOTS_KEY = 'gpu-tracker:snapshots';
const ALERTS_KEY = 'gpu-tracker:alerts';
const MAX_ALERTS = 500;

export class RedisStateStore implements StateStore {
  constructor(private readonly redis: Redis) {}

  async getSnapshot(retailer: string, gpuModel: string) {
    const raw = await this.redis.hget(
      SNAPSHOTS_KEY,
      snapshotKey(retailer, gpuModel),
    );
    return raw ? (JSON.parse(raw) as ProductSnapshot) : undefined;
  }

  async saveSnapshot(snapshot: ProductSnapshot) {
    await this.redis.hset(
      SNAPSHOTS_KEY,
      snapshotKey(snapshot.retailer, snapshot.gpuModel),
      JSON.stringify(snapshot),
    );
  }

  async listSnapshots() {
    const all = await this.redis.hvals(SNAPSHOTS_KEY);
    return all.map((raw) => JSON.parse(raw) as ProductSnapshot);
  }

  async recordAlert(alert: Alert) {
    await this.redis
      .multi()
      .lpush(ALERTS_KEY, JSON.stringify(alert))
      .ltrim(ALERTS_KEY, 0, MAX_ALERTS - 1)
      .exec();
  }

  async listAlerts(limit: number) {
    const raw = await this.redis.lrange(ALERTS_KEY, 0, Math.max(0, limit - 1));
    return raw.map((r) => JSON.parse(r) as Alert);
  }
}

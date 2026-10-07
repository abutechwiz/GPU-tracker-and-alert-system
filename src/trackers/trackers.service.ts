import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppConfig } from '../config/app-config';
import { RetailerTarget, Tracker } from '../common/types';

export class InvalidTrackerError extends Error {}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function validateRetailer(raw: unknown, where: string): RetailerTarget {
  if (typeof raw !== 'object' || raw === null) {
    throw new InvalidTrackerError(`${where} must be an object`);
  }
  const r = raw as Record<string, unknown>;
  if (!isNonEmptyString(r.name)) {
    throw new InvalidTrackerError(`${where}.name is required`);
  }
  if (!isNonEmptyString(r.url) || !/^https?:\/\//i.test(r.url)) {
    throw new InvalidTrackerError(`${where}.url must be an http(s) URL`);
  }
  if (
    r.selectors !== undefined &&
    (typeof r.selectors !== 'object' || r.selectors === null)
  ) {
    throw new InvalidTrackerError(`${where}.selectors must be an object`);
  }
  return {
    name: r.name.trim(),
    url: r.url.trim(),
    selectors: r.selectors as RetailerTarget['selectors'],
  };
}

/** Validates a tracker definition (from the config file or the API). */
export function validateTracker(raw: unknown, where = 'tracker'): Tracker {
  if (typeof raw !== 'object' || raw === null) {
    throw new InvalidTrackerError(`${where} must be an object`);
  }
  const t = raw as Record<string, unknown>;
  if (!isNonEmptyString(t.gpuModel)) {
    throw new InvalidTrackerError(`${where}.gpuModel is required`);
  }
  if (
    t.targetPrice !== undefined &&
    (typeof t.targetPrice !== 'number' || !(t.targetPrice > 0))
  ) {
    throw new InvalidTrackerError(
      `${where}.targetPrice must be a positive number`,
    );
  }
  if (!Array.isArray(t.retailers) || t.retailers.length === 0) {
    throw new InvalidTrackerError(
      `${where}.retailers must be a non-empty array`,
    );
  }
  return {
    gpuModel: t.gpuModel.trim(),
    targetPrice: t.targetPrice,
    enabled: t.enabled !== false,
    retailers: t.retailers.map((r, i) =>
      validateRetailer(r, `${where}.retailers[${i}]`),
    ),
  };
}

/**
 * Loads the list of tracked GPUs from a JSON file. The file is re-read on every
 * call so it can be edited without restarting the app.
 */
@Injectable()
export class TrackersService {
  private readonly logger = new Logger(TrackersService.name);

  constructor(private readonly config: AppConfig) {}

  getTrackers(): Tracker[] {
    const file = resolve(this.config.trackersFile);
    if (!existsSync(file)) {
      this.logger.warn(
        `Trackers file ${file} not found; nothing to poll. Copy config/trackers.example.json to get started.`,
      );
      return [];
    }

    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
    const list = Array.isArray(parsed)
      ? parsed
      : (parsed as { trackers?: unknown })?.trackers;
    if (!Array.isArray(list)) {
      throw new InvalidTrackerError(
        `${file} must contain an array of trackers or { "trackers": [...] }`,
      );
    }
    return list.map((t, i) => validateTracker(t, `trackers[${i}]`));
  }

  getEnabledTrackers(): Tracker[] {
    return this.getTrackers().filter((t) => t.enabled !== false);
  }
}

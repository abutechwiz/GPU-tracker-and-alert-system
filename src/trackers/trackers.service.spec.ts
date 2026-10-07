import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppConfig } from '../config/app-config';
import {
  InvalidTrackerError,
  TrackersService,
  validateTracker,
} from './trackers.service';

function serviceFor(contents: unknown) {
  const dir = mkdtempSync(join(tmpdir(), 'trackers-'));
  const file = join(dir, 'trackers.json');
  writeFileSync(file, JSON.stringify(contents));
  return new TrackersService(new AppConfig({ TRACKERS_FILE: file }));
}

describe('validateTracker', () => {
  it('accepts a valid tracker', () => {
    expect(
      validateTracker({
        gpuModel: ' RTX 4090 ',
        targetPrice: 1500,
        retailers: [{ name: 'Shop', url: 'https://shop.example/4090' }],
      }),
    ).toEqual({
      gpuModel: 'RTX 4090',
      targetPrice: 1500,
      enabled: true,
      retailers: [
        {
          name: 'Shop',
          url: 'https://shop.example/4090',
          selectors: undefined,
        },
      ],
    });
  });

  it.each([
    [{}, 'gpuModel'],
    [{ gpuModel: 'x', retailers: [] }, 'retailers'],
    [{ gpuModel: 'x', retailers: [{ name: 'a', url: 'ftp://x' }] }, 'url'],
    [
      {
        gpuModel: 'x',
        targetPrice: -1,
        retailers: [{ name: 'a', url: 'https://x' }],
      },
      'targetPrice',
    ],
  ])('rejects %j', (input, field) => {
    expect(() => validateTracker(input)).toThrow(InvalidTrackerError);
    expect(() => validateTracker(input)).toThrow(field);
  });
});

describe('TrackersService', () => {
  const tracker = {
    gpuModel: 'RTX 4090',
    retailers: [{ name: 'Shop', url: 'https://shop.example' }],
  };

  it('returns an empty list when the file is missing', () => {
    const service = new TrackersService(
      new AppConfig({ TRACKERS_FILE: '/nonexistent/trackers.json' }),
    );
    expect(service.getTrackers()).toEqual([]);
  });

  it('accepts an array or { trackers } and filters disabled ones', () => {
    expect(serviceFor([tracker]).getTrackers()).toHaveLength(1);
    const service = serviceFor({
      trackers: [tracker, { ...tracker, gpuModel: 'RTX 4080', enabled: false }],
    });
    expect(service.getTrackers()).toHaveLength(2);
    expect(service.getEnabledTrackers().map((t) => t.gpuModel)).toEqual([
      'RTX 4090',
    ]);
  });

  it('ships a valid example file', () => {
    const service = new TrackersService(
      new AppConfig({ TRACKERS_FILE: 'config/trackers.example.json' }),
    );
    expect(service.getTrackers().length).toBeGreaterThan(0);
  });
});

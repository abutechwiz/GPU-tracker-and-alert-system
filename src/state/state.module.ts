import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AppConfig } from '../config/app-config';
import { REDIS_CLIENT, STATE_STORE } from '../common/constants';
import { RedisStateStore } from './redis-state.store';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [AppConfig],
      useFactory: (config: AppConfig) =>
        new Redis({ ...config.redis, lazyConnect: false }),
    },
    {
      provide: STATE_STORE,
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) => new RedisStateStore(redis),
    },
  ],
  exports: [STATE_STORE],
})
export class StateModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onApplicationShutdown() {
    await this.redis.quit();
  }
}

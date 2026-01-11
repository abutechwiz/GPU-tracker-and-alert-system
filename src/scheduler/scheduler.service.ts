import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SchedulerService {
    private readonly logger = new Logger(SchedulerService.name);

    constructor(@InjectQueue('retailer-queue') private retailerQueue: Queue) { }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async handleCron() {
        this.logger.debug('Running scheduled retail poll');

        // In a real app, this would come from a database or config
        const gpuModel = 'RTX 4090';
        const retailers = [
            {
                name: 'MDComputers',
                url: 'https://mdcomputers.in/', // Placeholder
            },
            {
                name: 'EliteHubs',
                url: 'https://elitehubs.com/', // Placeholder
            },
            {
                name: 'PrimeABGB',
                url: 'https://www.primeabgb.com/', // Placeholder
            },
        ];

        await this.retailerQueue.add(
            'poll_retailer',
            {
                gpuModel,
                retailers,
            },
            {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
            },
        );
        this.logger.log(`Added scheduled poll job for ${gpuModel}`);
    }
}

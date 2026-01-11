import { Queue } from 'bullmq';
export declare class SchedulerService {
    private retailerQueue;
    private readonly logger;
    constructor(retailerQueue: Queue);
    handleCron(): Promise<void>;
}

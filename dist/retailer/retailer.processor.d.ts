import { WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
export declare class RetailerProcessor extends WorkerHost {
    private readonly logger;
    private htmlParserQueue;
    constructor(htmlParserQueue: Queue);
    process(job: Job<any, any, string>): Promise<any>;
    private handlePollRetailer;
}

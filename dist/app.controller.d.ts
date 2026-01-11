import { AppService } from './app.service';
import { Queue } from 'bullmq';
export declare class AppController {
    private readonly appService;
    private retailerQueue;
    constructor(appService: AppService, retailerQueue: Queue);
    getHello(): string;
    pollRetailer(gpuModel: string, retailers: {
        name: string;
        url: string;
    }[]): Promise<{
        message: string;
        jobId?: undefined;
        gpuModel?: undefined;
        retailerCount?: undefined;
    } | {
        message: string;
        jobId: string | undefined;
        gpuModel: string;
        retailerCount: number;
    }>;
}

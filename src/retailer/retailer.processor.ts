import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import axios from 'axios';

interface RetailerInput {
    name: string;
    url: string;
}

interface PollRetailerJobData {
    gpuModel: string;
    retailers: RetailerInput[];
}

@Processor('retailer-queue')
export class RetailerProcessor extends WorkerHost {
    private readonly logger = new Logger(RetailerProcessor.name);
    private htmlParserQueue: Queue;

    constructor(@InjectQueue('html-parser-queue') htmlParserQueue: Queue) {
        super();
        this.htmlParserQueue = htmlParserQueue;
    }

    async process(job: Job<any, any, string>): Promise<any> {
        switch (job.name) {
            case 'poll_retailer':
                return this.handlePollRetailer(job as Job<PollRetailerJobData>);
            default:
                this.logger.warn(`Unknown job name: ${job.name}`);
        }
    }

    private async handlePollRetailer(job: Job<PollRetailerJobData>) {
        const { gpuModel, retailers } = job.data;
        this.logger.log(
            `Processing job ${job.id}: Polling for ${gpuModel} from ${retailers.length} retailers`,
        );

        const results: any[] = [];
        const errors: any[] = [];

        for (const retailer of retailers) {
            try {
                this.logger.log(`Fetching ${retailer.url} (${retailer.name})`);
                const response = await axios.get(retailer.url, {
                    headers: {
                        'User-Agent':
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    },
                });

                this.logger.log(
                    `Fetched ${retailer.name}, status: ${response.status}, length: ${response.data.length}`,
                );

                await this.htmlParserQueue.add('parse_html', {
                    html: response.data,
                    retailer: retailer.name,
                    gpuModel: gpuModel,
                });

                results.push({
                    retailer: retailer.name,
                    status: 'success',
                    length: response.data.length,
                });
            } catch (error) {
                this.logger.error(
                    `Failed to fetch ${retailer.name} (${retailer.url})`,
                    error.stack,
                );
                errors.push({ retailer: retailer.name, error: error.message });
            }
        }

        if (errors.length > 0) {
            // If any retailer failed, we throw an error to trigger the BullMQ backoff/retry mechanism for the job
            // Note: This relies on the strategy that "partial failure = job failure"
            throw new Error(
                `Job completed with ${errors.length} errors: ${JSON.stringify(errors)}`,
            );
        }

        return { results };
    }
}

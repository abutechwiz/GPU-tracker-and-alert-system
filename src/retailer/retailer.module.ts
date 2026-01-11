import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RetailerProcessor } from './retailer.processor';
import { HtmlParserModule } from '../htmlParser/htmlParser.module';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'retailer-queue',
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
            },
        }),
        HtmlParserModule,
    ],
    providers: [RetailerProcessor],
    exports: [BullModule],
})
export class RetailerModule { }

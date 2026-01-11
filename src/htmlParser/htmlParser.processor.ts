import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('html-parser-queue')
export class HtmlParserProcessor extends WorkerHost {
  private readonly logger = new Logger(HtmlParserProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'parse_html':
        return this.handleParseHtml(job);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleParseHtml(job: Job<{ html: string }>) {
    this.logger.log(`Processing job ${job.id}: Parsing HTML content`);
    // Here we would implement real parsing, e.g. using cheerio
    // For now, we simulate work
    const htmlLength = job.data.html ? job.data.html.length : 0;
    this.logger.log(`Parsed HTML. Length: ${htmlLength}`);
    return { success: true, length: htmlLength };
  }
}

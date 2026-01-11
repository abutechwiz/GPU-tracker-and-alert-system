"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var HtmlParserProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HtmlParserProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
let HtmlParserProcessor = HtmlParserProcessor_1 = class HtmlParserProcessor extends bullmq_1.WorkerHost {
    logger = new common_1.Logger(HtmlParserProcessor_1.name);
    async process(job) {
        switch (job.name) {
            case 'parse_html':
                return this.handleParseHtml(job);
            default:
                this.logger.warn(`Unknown job name: ${job.name}`);
        }
    }
    async handleParseHtml(job) {
        this.logger.log(`Processing job ${job.id}: Parsing HTML content`);
        const htmlLength = job.data.html ? job.data.html.length : 0;
        this.logger.log(`Parsed HTML. Length: ${htmlLength}`);
        return { success: true, length: htmlLength };
    }
};
exports.HtmlParserProcessor = HtmlParserProcessor;
exports.HtmlParserProcessor = HtmlParserProcessor = HtmlParserProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('html-parser-queue')
], HtmlParserProcessor);
//# sourceMappingURL=htmlParser.processor.js.map
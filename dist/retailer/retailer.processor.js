"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RetailerProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetailerProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const axios_1 = __importDefault(require("axios"));
let RetailerProcessor = RetailerProcessor_1 = class RetailerProcessor extends bullmq_1.WorkerHost {
    logger = new common_1.Logger(RetailerProcessor_1.name);
    htmlParserQueue;
    constructor(htmlParserQueue) {
        super();
        this.htmlParserQueue = htmlParserQueue;
    }
    async process(job) {
        switch (job.name) {
            case 'poll_retailer':
                return this.handlePollRetailer(job);
            default:
                this.logger.warn(`Unknown job name: ${job.name}`);
        }
    }
    async handlePollRetailer(job) {
        const { gpuModel, retailers } = job.data;
        this.logger.log(`Processing job ${job.id}: Polling for ${gpuModel} from ${retailers.length} retailers`);
        const results = [];
        const errors = [];
        for (const retailer of retailers) {
            try {
                this.logger.log(`Fetching ${retailer.url} (${retailer.name})`);
                const response = await axios_1.default.get(retailer.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    },
                });
                this.logger.log(`Fetched ${retailer.name}, status: ${response.status}, length: ${response.data.length}`);
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
            }
            catch (error) {
                this.logger.error(`Failed to fetch ${retailer.name} (${retailer.url})`, error.stack);
                errors.push({ retailer: retailer.name, error: error.message });
            }
        }
        if (errors.length > 0) {
            throw new Error(`Job completed with ${errors.length} errors: ${JSON.stringify(errors)}`);
        }
        return { results };
    }
};
exports.RetailerProcessor = RetailerProcessor;
exports.RetailerProcessor = RetailerProcessor = RetailerProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('retailer-queue'),
    __param(0, (0, bullmq_1.InjectQueue)('html-parser-queue')),
    __metadata("design:paramtypes", [bullmq_2.Queue])
], RetailerProcessor);
//# sourceMappingURL=retailer.processor.js.map
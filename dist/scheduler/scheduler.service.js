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
var SchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let SchedulerService = SchedulerService_1 = class SchedulerService {
    retailerQueue;
    logger = new common_1.Logger(SchedulerService_1.name);
    constructor(retailerQueue) {
        this.retailerQueue = retailerQueue;
    }
    async handleCron() {
        this.logger.debug('Running scheduled retail poll');
        const gpuModel = 'RTX 4090';
        const retailers = [
            {
                name: 'MDComputers',
                url: 'https://mdcomputers.in/',
            },
            {
                name: 'EliteHubs',
                url: 'https://elitehubs.com/',
            },
            {
                name: 'PrimeABGB',
                url: 'https://www.primeabgb.com/',
            },
        ];
        await this.retailerQueue.add('poll_retailer', {
            gpuModel,
            retailers,
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
        });
        this.logger.log(`Added scheduled poll job for ${gpuModel}`);
    }
};
exports.SchedulerService = SchedulerService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerService.prototype, "handleCron", null);
exports.SchedulerService = SchedulerService = SchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('retailer-queue')),
    __metadata("design:paramtypes", [bullmq_2.Queue])
], SchedulerService);
//# sourceMappingURL=scheduler.service.js.map
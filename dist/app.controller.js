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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let AppController = class AppController {
    appService;
    retailerQueue;
    constructor(appService, retailerQueue) {
        this.appService = appService;
        this.retailerQueue = retailerQueue;
    }
    getHello() {
        return this.appService.getHello();
    }
    async pollRetailer(gpuModel, retailers) {
        if (!gpuModel || !retailers || retailers.length === 0) {
            return { message: 'gpuModel and retailers list are required' };
        }
        const job = await this.retailerQueue.add('poll_retailer', { gpuModel, retailers }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
        });
        return {
            message: 'Job added',
            jobId: job.id,
            gpuModel,
            retailerCount: retailers.length,
        };
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.Post)('poll'),
    __param(0, (0, common_1.Body)('gpuModel')),
    __param(1, (0, common_1.Body)('retailers')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "pollRetailer", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __param(1, (0, bullmq_1.InjectQueue)('retailer-queue')),
    __metadata("design:paramtypes", [app_service_1.AppService,
        bullmq_2.Queue])
], AppController);
//# sourceMappingURL=app.controller.js.map
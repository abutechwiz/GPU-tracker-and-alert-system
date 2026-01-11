"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetailerModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const retailer_processor_1 = require("./retailer.processor");
const htmlParser_module_1 = require("../htmlParser/htmlParser.module");
let RetailerModule = class RetailerModule {
};
exports.RetailerModule = RetailerModule;
exports.RetailerModule = RetailerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({
                name: 'retailer-queue',
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 1000,
                    },
                },
            }),
            htmlParser_module_1.HtmlParserModule,
        ],
        providers: [retailer_processor_1.RetailerProcessor],
        exports: [bullmq_1.BullModule],
    })
], RetailerModule);
//# sourceMappingURL=retailer.module.js.map
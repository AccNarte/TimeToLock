"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainModule = void 0;
const common_1 = require("@nestjs/common");
const web3_service_1 = require("./services/web3.service");
const contract_service_1 = require("./services/contract.service");
const timelock_contract_service_1 = require("./services/timelock-contract.service");
let BlockchainModule = class BlockchainModule {
};
exports.BlockchainModule = BlockchainModule;
exports.BlockchainModule = BlockchainModule = __decorate([
    (0, common_1.Module)({
        providers: [web3_service_1.Web3Service, contract_service_1.ContractService, timelock_contract_service_1.TimelockContractService],
        exports: [web3_service_1.Web3Service, contract_service_1.ContractService, timelock_contract_service_1.TimelockContractService],
    })
], BlockchainModule);
//# sourceMappingURL=blockchain.module.js.map
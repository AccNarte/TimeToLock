"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelockFilesBlockchainModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const blockchain_file_lock_entity_1 = require("./blockchain-file-lock.entity");
const timelock_files_blockchain_service_1 = require("./timelock-files-blockchain.service");
const timelock_files_blockchain_controller_1 = require("./timelock-files-blockchain.controller");
const ipfs_module_1 = require("../ipfs/ipfs.module");
let TimelockFilesBlockchainModule = class TimelockFilesBlockchainModule {
};
exports.TimelockFilesBlockchainModule = TimelockFilesBlockchainModule;
exports.TimelockFilesBlockchainModule = TimelockFilesBlockchainModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([blockchain_file_lock_entity_1.BlockchainFileLock]),
            ipfs_module_1.IpfsModule,
        ],
        controllers: [timelock_files_blockchain_controller_1.TimelockFilesBlockchainController],
        providers: [timelock_files_blockchain_service_1.TimelockFilesBlockchainService],
        exports: [timelock_files_blockchain_service_1.TimelockFilesBlockchainService],
    })
], TimelockFilesBlockchainModule);
//# sourceMappingURL=timelock-files-blockchain.module.js.map
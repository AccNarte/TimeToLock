"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelockFilesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const timelock_files_controller_1 = require("./timelock-files.controller");
const timelock_files_service_1 = require("./timelock-files.service");
const file_lock_entity_1 = require("./file-lock.entity");
const file_entity_1 = require("../files/file.entity");
let TimelockFilesModule = class TimelockFilesModule {
};
exports.TimelockFilesModule = TimelockFilesModule;
exports.TimelockFilesModule = TimelockFilesModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([file_lock_entity_1.FileLock, file_entity_1.File])],
        controllers: [timelock_files_controller_1.TimelockFilesController],
        providers: [timelock_files_service_1.TimelockFilesService],
        exports: [timelock_files_service_1.TimelockFilesService],
    })
], TimelockFilesModule);
//# sourceMappingURL=timelock-files.module.js.map
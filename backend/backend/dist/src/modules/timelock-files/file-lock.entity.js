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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileLock = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
const file_entity_1 = require("../files/file.entity");
let FileLock = class FileLock {
};
exports.FileLock = FileLock;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], FileLock.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'user_id' }),
    __metadata("design:type", Number)
], FileLock.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'file_id' }),
    __metadata("design:type", Number)
], FileLock.prototype, "fileId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], FileLock.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], FileLock.prototype, "ciphertext", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], FileLock.prototype, "iv", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], FileLock.prototype, "salt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, name: 'auth_tag' }),
    __metadata("design:type", String)
], FileLock.prototype, "authTag", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true, name: 'hash_checksum' }),
    __metadata("design:type", String)
], FileLock.prototype, "hashChecksum", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', name: 'unlock_at' }),
    __metadata("design:type", Date)
], FileLock.prototype, "unlockAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'unlocked_at' }),
    __metadata("design:type", Date)
], FileLock.prototype, "unlockedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'LOCKED' }),
    __metadata("design:type", String)
], FileLock.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamp', default: () => 'NOW()', name: 'created_at' }),
    __metadata("design:type", Date)
], FileLock.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamp', default: () => 'NOW()', name: 'updated_at' }),
    __metadata("design:type", Date)
], FileLock.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.fileLocks, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], FileLock.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => file_entity_1.File, (file) => file.fileLocks, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'file_id' }),
    __metadata("design:type", file_entity_1.File)
], FileLock.prototype, "file", void 0);
exports.FileLock = FileLock = __decorate([
    (0, typeorm_1.Entity)('file_locks'),
    (0, typeorm_1.Index)('idx_filelocks_user', ['userId']),
    (0, typeorm_1.Index)('idx_filelocks_file', ['fileId'])
], FileLock);
//# sourceMappingURL=file-lock.entity.js.map
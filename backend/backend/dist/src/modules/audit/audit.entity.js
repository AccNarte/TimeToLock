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
exports.AuditLog = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
const wallet_entity_1 = require("../wallets/wallet.entity");
const entity_type_entity_1 = require("./entity-type.entity");
const action_entity_1 = require("./action.entity");
let AuditLog = class AuditLog {
};
exports.AuditLog = AuditLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], AuditLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true, name: 'user_id' }),
    __metadata("design:type", Number)
], AuditLog.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true, name: 'user_wallet_id' }),
    __metadata("design:type", Number)
], AuditLog.prototype, "userWalletId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'entity_type_id' }),
    __metadata("design:type", Number)
], AuditLog.prototype, "entityTypeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], AuditLog.prototype, "entityId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'action_id' }),
    __metadata("design:type", Number)
], AuditLog.prototype, "actionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true, name: 'metadata_json' }),
    __metadata("design:type", Object)
], AuditLog.prototype, "metadataJson", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamp', default: () => 'NOW()', name: 'created_at' }),
    __metadata("design:type", Date)
], AuditLog.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.auditLogs, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], AuditLog.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => wallet_entity_1.Wallet, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_wallet_id' }),
    __metadata("design:type", wallet_entity_1.Wallet)
], AuditLog.prototype, "wallet", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => entity_type_entity_1.EntityType, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'entity_type_id' }),
    __metadata("design:type", entity_type_entity_1.EntityType)
], AuditLog.prototype, "entityType", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => action_entity_1.Action, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'action_id' }),
    __metadata("design:type", action_entity_1.Action)
], AuditLog.prototype, "action", void 0);
exports.AuditLog = AuditLog = __decorate([
    (0, typeorm_1.Entity)('audit_logs'),
    (0, typeorm_1.Index)('idx_audit_user', ['userId']),
    (0, typeorm_1.Index)('idx_audit_wallet', ['userWalletId']),
    (0, typeorm_1.Index)('idx_audit_entity', ['entityTypeId', 'entityId'])
], AuditLog);
//# sourceMappingURL=audit.entity.js.map
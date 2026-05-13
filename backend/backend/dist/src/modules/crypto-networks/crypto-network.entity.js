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
exports.CryptoNetwork = void 0;
const typeorm_1 = require("typeorm");
const token_contract_entity_1 = require("../tokens/token-contract.entity");
let CryptoNetwork = class CryptoNetwork {
};
exports.CryptoNetwork = CryptoNetwork;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], CryptoNetwork.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, unique: true }),
    __metadata("design:type", String)
], CryptoNetwork.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'chain_id' }),
    __metadata("design:type", Number)
], CryptoNetwork.prototype, "chainId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => token_contract_entity_1.TokenContract, (tokenContract) => tokenContract.network),
    __metadata("design:type", Array)
], CryptoNetwork.prototype, "tokenContracts", void 0);
exports.CryptoNetwork = CryptoNetwork = __decorate([
    (0, typeorm_1.Entity)('crypto_networks')
], CryptoNetwork);
//# sourceMappingURL=crypto-network.entity.js.map
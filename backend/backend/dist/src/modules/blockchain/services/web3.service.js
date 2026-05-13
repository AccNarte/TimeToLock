"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Web3Service_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Web3Service = void 0;
const common_1 = require("@nestjs/common");
const ethers_1 = require("ethers");
const chain_configs_1 = require("../constants/chain-configs");
let Web3Service = Web3Service_1 = class Web3Service {
    constructor() {
        this.logger = new common_1.Logger(Web3Service_1.name);
        this.providers = new Map();
    }
    getProvider(chainId) {
        if (this.providers.has(chainId)) {
            return this.providers.get(chainId);
        }
        const config = (0, chain_configs_1.getChainConfig)(chainId);
        this.logger.log(`Creating provider for ${config.name} (${chainId}) at ${config.rpcUrl}`);
        const provider = new ethers_1.ethers.JsonRpcProvider(config.rpcUrl, {
            chainId,
            name: config.name,
        });
        this.providers.set(chainId, provider);
        return provider;
    }
    getWalletSigner(privateKey, chainId) {
        const provider = this.getProvider(chainId);
        return new ethers_1.ethers.Wallet(privateKey, provider);
    }
    async estimateGas(transaction, chainId) {
        const provider = this.getProvider(chainId);
        try {
            const gasEstimate = await provider.estimateGas(transaction);
            return gasEstimate;
        }
        catch (error) {
            this.logger.error(`Failed to estimate gas: ${error.message}`);
            throw error;
        }
    }
    async getGasPrice(chainId) {
        const provider = this.getProvider(chainId);
        const feeData = await provider.getFeeData();
        return feeData.gasPrice || 0n;
    }
    async waitForTransaction(txHash, chainId, confirmations = 1) {
        const provider = this.getProvider(chainId);
        this.logger.log(`Waiting for transaction ${txHash} (${confirmations} confirmations)`);
        try {
            const receipt = await provider.waitForTransaction(txHash, confirmations);
            if (receipt) {
                this.logger.log(`Transaction ${txHash} confirmed in block ${receipt.blockNumber}`);
            }
            else {
                this.logger.warn(`Transaction ${txHash} returned null receipt`);
            }
            return receipt;
        }
        catch (error) {
            this.logger.error(`Failed to wait for transaction: ${error.message}`);
            throw error;
        }
    }
    async getTransactionReceipt(txHash, chainId) {
        const provider = this.getProvider(chainId);
        return await provider.getTransactionReceipt(txHash);
    }
    async getBlockNumber(chainId) {
        const provider = this.getProvider(chainId);
        return await provider.getBlockNumber();
    }
    async getBalance(address, chainId) {
        const provider = this.getProvider(chainId);
        return await provider.getBalance(address);
    }
    async isContract(address, chainId) {
        const provider = this.getProvider(chainId);
        const code = await provider.getCode(address);
        return code !== '0x';
    }
};
exports.Web3Service = Web3Service;
exports.Web3Service = Web3Service = Web3Service_1 = __decorate([
    (0, common_1.Injectable)()
], Web3Service);
//# sourceMappingURL=web3.service.js.map
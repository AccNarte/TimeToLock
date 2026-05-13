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
var TimelockContractService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelockContractService = void 0;
const common_1 = require("@nestjs/common");
const web3_service_1 = require("./web3.service");
const contract_service_1 = require("./contract.service");
let TimelockContractService = TimelockContractService_1 = class TimelockContractService {
    constructor(web3Service, contractService) {
        this.web3Service = web3Service;
        this.contractService = contractService;
        this.logger = new common_1.Logger(TimelockContractService_1.name);
    }
    async prepareCreateLock(chainId, tokenAddress, amountWei, unlockAt) {
        this.logger.log(`Preparing createLock transaction for chain ${chainId}`);
        const factory = this.contractService.getTimelockFactory(chainId);
        const unlockTimestamp = Math.floor(unlockAt.getTime() / 1000);
        const data = factory.interface.encodeFunctionData('createLock', [
            tokenAddress,
            amountWei,
            unlockTimestamp,
        ]);
        const gasLimit = await this.web3Service.estimateGas({
            to: await factory.getAddress(),
            data,
        }, chainId);
        const gasPrice = await this.web3Service.getGasPrice(chainId);
        return {
            to: await factory.getAddress(),
            data,
            gasLimit: gasLimit * 120n / 100n,
            gasPrice,
        };
    }
    async createLockWithInternalWallet(privateKey, chainId, tokenAddress, amountWei, unlockAt) {
        this.logger.log(`Creating lock with internal wallet on chain ${chainId}`);
        try {
            const signer = this.web3Service.getWalletSigner(privateKey, chainId);
            const factory = this.contractService.getTimelockFactory(chainId, signer);
            const token = this.contractService.getERC20Contract(tokenAddress, chainId, signer);
            const unlockTimestamp = Math.floor(unlockAt.getTime() / 1000);
            const factoryAddress = await factory.getAddress();
            const signerAddress = await signer.getAddress();
            const allowance = await token.allowance(signerAddress, factoryAddress);
            if (allowance < BigInt(amountWei)) {
                this.logger.log(`Approving ${amountWei} tokens...`);
                const approveTx = await token.approve(factoryAddress, amountWei);
                await approveTx.wait();
                this.logger.log(`Tokens approved`);
            }
            this.logger.log(`Creating lock...`);
            const createTx = await factory.createLock(tokenAddress, amountWei, unlockTimestamp);
            this.logger.log(`Transaction sent: ${createTx.hash}`);
            const receipt = await createTx.wait();
            this.logger.log(`Transaction confirmed in block ${receipt.blockNumber}`);
            const lockCreatedEvents = this.contractService.parseEventLogs(receipt, factory.interface, 'LockCreated');
            let lockAddress;
            if (lockCreatedEvents.length > 0) {
                lockAddress = lockCreatedEvents[0].args[0];
                this.logger.log(`Lock created at address: ${lockAddress}`);
            }
            return {
                txHash: receipt.hash,
                lockAddress,
            };
        }
        catch (error) {
            this.logger.error(`Failed to create lock: ${error.message}`);
            throw error;
        }
    }
    async parseLockAddressFromReceipt(txHash, chainId) {
        try {
            const receipt = await this.web3Service.getTransactionReceipt(txHash, chainId);
            if (!receipt) {
                this.logger.warn(`Transaction receipt not found: ${txHash}`);
                return null;
            }
            const factory = this.contractService.getTimelockFactory(chainId);
            const lockCreatedEvents = this.contractService.parseEventLogs(receipt, factory.interface, 'LockCreated');
            if (lockCreatedEvents.length > 0) {
                return lockCreatedEvents[0].args[0];
            }
            return null;
        }
        catch (error) {
            this.logger.error(`Failed to parse lock address from receipt: ${error.message}`);
            return null;
        }
    }
    async withdrawFromLock(privateKey, lockAddress, chainId) {
        this.logger.log(`Withdrawing from lock ${lockAddress}`);
        try {
            const signer = this.web3Service.getWalletSigner(privateKey, chainId);
            const vault = this.contractService.getTimelockVault(lockAddress, chainId, signer);
            const status = await this.getLockStatus(lockAddress, chainId);
            if (status.status !== 'UNLOCKABLE') {
                throw new Error(`Lock is not yet unlockable. Current status: ${status.status}`);
            }
            const tx = await vault.withdraw();
            this.logger.log(`Withdraw transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            this.logger.log(`Withdraw confirmed in block ${receipt.blockNumber}`);
            return receipt.hash;
        }
        catch (error) {
            this.logger.error(`Failed to withdraw: ${error.message}`);
            throw error;
        }
    }
    async getLockStatus(lockAddress, chainId) {
        try {
            const vault = this.contractService.getTimelockVault(lockAddress, chainId);
            const [owner, token, amount, unlockTime, withdrawn] = await vault.getLockDetails();
            const statusEnum = await vault.getStatus();
            let status;
            switch (Number(statusEnum)) {
                case 0:
                    status = 'LOCKED';
                    break;
                case 1:
                    status = 'UNLOCKABLE';
                    break;
                case 2:
                    status = 'WITHDRAWN';
                    break;
                default:
                    status = 'LOCKED';
            }
            return {
                owner,
                token,
                amount,
                unlockTime,
                withdrawn,
                status,
            };
        }
        catch (error) {
            this.logger.error(`Failed to get lock status: ${error.message}`);
            throw error;
        }
    }
    async getUserLocks(userAddress, chainId) {
        try {
            const factory = this.contractService.getTimelockFactory(chainId);
            const locks = await factory.getUserLocks(userAddress);
            return locks;
        }
        catch (error) {
            this.logger.error(`Failed to get user locks: ${error.message}`);
            throw error;
        }
    }
};
exports.TimelockContractService = TimelockContractService;
exports.TimelockContractService = TimelockContractService = TimelockContractService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [web3_service_1.Web3Service,
        contract_service_1.ContractService])
], TimelockContractService);
//# sourceMappingURL=timelock-contract.service.js.map
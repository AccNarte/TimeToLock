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
var ContractService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractService = void 0;
const common_1 = require("@nestjs/common");
const ethers_1 = require("ethers");
const fs = require("fs");
const path = require("path");
const web3_service_1 = require("./web3.service");
const contract_addresses_1 = require("../constants/contract-addresses");
let ContractService = ContractService_1 = class ContractService {
    constructor(web3Service) {
        this.web3Service = web3Service;
        this.logger = new common_1.Logger(ContractService_1.name);
        this.abis = new Map();
        this.loadAbis();
    }
    loadAbis() {
        const possiblePaths = [
            path.join(__dirname, '..', 'abis'),
            path.join(__dirname, '..', '..', 'blockchain', 'abis'),
            path.join(process.cwd(), 'dist', 'modules', 'blockchain', 'abis'),
        ];
        this.logger.log(`Looking for ABIs, __dirname: ${__dirname}`);
        let abisDir = null;
        for (const p of possiblePaths) {
            this.logger.log(`Checking path: ${p}`);
            if (fs.existsSync(p)) {
                abisDir = p;
                this.logger.log(`Found ABIs directory at: ${abisDir}`);
                break;
            }
        }
        if (!abisDir) {
            this.logger.warn(`ABIs directory not found in any of: ${possiblePaths.join(', ')}`);
            return;
        }
        const files = fs.readdirSync(abisDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const contractName = file.replace('.json', '');
                const abiPath = path.join(abisDir, file);
                try {
                    const abiContent = fs.readFileSync(abiPath, 'utf8');
                    const abi = JSON.parse(abiContent);
                    this.abis.set(contractName, abi);
                    this.logger.log(`Loaded ABI for ${contractName}`);
                }
                catch (error) {
                    this.logger.error(`Failed to load ABI ${file}: ${error.message}`);
                }
            }
        }
    }
    getAbi(contractName) {
        const abi = this.abis.get(contractName);
        if (!abi) {
            throw new Error(`ABI not found for contract: ${contractName}`);
        }
        return abi;
    }
    getTimelockFactory(chainId, signer) {
        const factoryAddress = (0, contract_addresses_1.getFactoryAddress)(chainId);
        const abi = this.getAbi('TimelockFactory');
        const providerOrSigner = signer || this.web3Service.getProvider(chainId);
        return new ethers_1.ethers.Contract(factoryAddress, abi, providerOrSigner);
    }
    getTimelockVault(vaultAddress, chainId, signer) {
        const abi = this.getAbi('TimelockVault');
        const providerOrSigner = signer || this.web3Service.getProvider(chainId);
        return new ethers_1.ethers.Contract(vaultAddress, abi, providerOrSigner);
    }
    getERC20Contract(tokenAddress, chainId, signer) {
        const abi = this.getAbi('ERC20');
        const providerOrSigner = signer || this.web3Service.getProvider(chainId);
        return new ethers_1.ethers.Contract(tokenAddress, abi, providerOrSigner);
    }
    getFactoryAddress(chainId) {
        return (0, contract_addresses_1.getFactoryAddress)(chainId);
    }
    parseEventLogs(receipt, contractInterface, eventName) {
        const parsedLogs = [];
        for (const log of receipt.logs) {
            try {
                const parsed = contractInterface.parseLog({
                    topics: [...log.topics],
                    data: log.data,
                });
                if (parsed && parsed.name === eventName) {
                    parsedLogs.push(parsed);
                }
            }
            catch (error) {
                continue;
            }
        }
        return parsedLogs;
    }
};
exports.ContractService = ContractService;
exports.ContractService = ContractService = ContractService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [web3_service_1.Web3Service])
], ContractService);
//# sourceMappingURL=contract.service.js.map
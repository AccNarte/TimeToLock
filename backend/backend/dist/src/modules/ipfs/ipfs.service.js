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
var IpfsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IpfsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
const FormData = require("form-data");
let IpfsService = IpfsService_1 = class IpfsService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(IpfsService_1.name);
        this.pinataApiKey = this.configService.get('PINATA_API_KEY', '');
        this.pinataSecretKey = this.configService.get('PINATA_SECRET_KEY', '');
        this.pinataGateway = this.configService.get('PINATA_GATEWAY', 'https://gateway.pinata.cloud');
        this.isConfigured = !!(this.pinataApiKey && this.pinataSecretKey);
        if (this.isConfigured) {
            this.logger.log('IPFS service configured with Pinata');
        }
        else {
            this.logger.warn('IPFS service not configured. Set PINATA_API_KEY and PINATA_SECRET_KEY to enable IPFS uploads.');
        }
    }
    isIpfsConfigured() {
        return this.isConfigured;
    }
    async uploadFile(fileBuffer, filename, metadata) {
        if (!this.isConfigured) {
            throw new Error('IPFS service not configured');
        }
        this.logger.log(`Uploading file to IPFS: ${filename}`);
        const formData = new FormData();
        formData.append('file', fileBuffer, { filename });
        if (metadata) {
            formData.append('pinataMetadata', JSON.stringify({
                name: filename,
                keyvalues: metadata,
            }));
        }
        try {
            const response = await axios_1.default.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
                headers: {
                    ...formData.getHeaders(),
                    pinata_api_key: this.pinataApiKey,
                    pinata_secret_api_key: this.pinataSecretKey,
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
            });
            const result = {
                ipfsHash: response.data.IpfsHash,
                pinSize: response.data.PinSize,
                timestamp: response.data.Timestamp,
            };
            this.logger.log(`File uploaded to IPFS: ${result.ipfsHash}`);
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to upload to IPFS: ${error.message}`);
            throw new Error(`IPFS upload failed: ${error.message}`);
        }
    }
    async uploadJson(jsonData, name) {
        if (!this.isConfigured) {
            throw new Error('IPFS service not configured');
        }
        this.logger.log(`Uploading JSON to IPFS: ${name}`);
        try {
            const response = await axios_1.default.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
                pinataContent: jsonData,
                pinataMetadata: { name },
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    pinata_api_key: this.pinataApiKey,
                    pinata_secret_api_key: this.pinataSecretKey,
                },
            });
            const result = {
                ipfsHash: response.data.IpfsHash,
                pinSize: response.data.PinSize,
                timestamp: response.data.Timestamp,
            };
            this.logger.log(`JSON uploaded to IPFS: ${result.ipfsHash}`);
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to upload JSON to IPFS: ${error.message}`);
            throw new Error(`IPFS JSON upload failed: ${error.message}`);
        }
    }
    async getFile(ipfsHash) {
        this.logger.log(`Fetching file from IPFS: ${ipfsHash}`);
        try {
            const response = await axios_1.default.get(this.getGatewayUrl(ipfsHash), {
                responseType: 'arraybuffer',
                timeout: 30000,
            });
            return Buffer.from(response.data);
        }
        catch (error) {
            this.logger.error(`Failed to fetch from IPFS: ${error.message}`);
            throw new Error(`IPFS fetch failed: ${error.message}`);
        }
    }
    getGatewayUrl(ipfsHash) {
        return `${this.pinataGateway}/ipfs/${ipfsHash}`;
    }
    getIpfsUrl(ipfsHash) {
        return `ipfs://${ipfsHash}`;
    }
    async unpinFile(ipfsHash) {
        if (!this.isConfigured) {
            throw new Error('IPFS service not configured');
        }
        this.logger.log(`Unpinning file from IPFS: ${ipfsHash}`);
        try {
            await axios_1.default.delete(`https://api.pinata.cloud/pinning/unpin/${ipfsHash}`, {
                headers: {
                    pinata_api_key: this.pinataApiKey,
                    pinata_secret_api_key: this.pinataSecretKey,
                },
            });
            this.logger.log(`File unpinned from IPFS: ${ipfsHash}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to unpin from IPFS: ${error.message}`);
            return false;
        }
    }
    async isPinned(ipfsHash) {
        if (!this.isConfigured) {
            return false;
        }
        try {
            const response = await axios_1.default.get(`https://api.pinata.cloud/data/pinList?hashContains=${ipfsHash}`, {
                headers: {
                    pinata_api_key: this.pinataApiKey,
                    pinata_secret_api_key: this.pinataSecretKey,
                },
            });
            return response.data.count > 0;
        }
        catch {
            return false;
        }
    }
};
exports.IpfsService = IpfsService;
exports.IpfsService = IpfsService = IpfsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], IpfsService);
//# sourceMappingURL=ipfs.service.js.map
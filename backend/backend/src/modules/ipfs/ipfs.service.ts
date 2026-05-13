import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';

export interface IpfsUploadResult {
  ipfsHash: string;
  pinSize: number;
  timestamp: string;
}

@Injectable()
export class IpfsService {
  private readonly logger = new Logger(IpfsService.name);
  private readonly pinataApiKey: string;
  private readonly pinataSecretKey: string;
  private readonly pinataGateway: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.pinataApiKey = this.configService.get<string>('PINATA_API_KEY', '');
    this.pinataSecretKey = this.configService.get<string>('PINATA_SECRET_KEY', '');
    this.pinataGateway = this.configService.get<string>(
      'PINATA_GATEWAY',
      'https://gateway.pinata.cloud',
    );

    this.isConfigured = !!(this.pinataApiKey && this.pinataSecretKey);

    if (this.isConfigured) {
      this.logger.log('IPFS service configured with Pinata');
    } else {
      this.logger.warn(
        'IPFS service not configured. Set PINATA_API_KEY and PINATA_SECRET_KEY to enable IPFS uploads.',
      );
    }
  }

  /**
   * Check if IPFS service is configured
   */
  isIpfsConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Upload a file buffer to IPFS via Pinata
   */
  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    metadata?: Record<string, string>,
  ): Promise<IpfsUploadResult> {
    if (!this.isConfigured) {
      throw new Error('IPFS service not configured');
    }

    this.logger.log(`Uploading file to IPFS: ${filename}`);

    const formData = new FormData();
    formData.append('file', fileBuffer, { filename });

    // Add optional metadata
    if (metadata) {
      formData.append(
        'pinataMetadata',
        JSON.stringify({
          name: filename,
          keyvalues: metadata,
        }),
      );
    }

    try {
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            pinata_api_key: this.pinataApiKey,
            pinata_secret_api_key: this.pinataSecretKey,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        },
      );

      const result: IpfsUploadResult = {
        ipfsHash: response.data.IpfsHash,
        pinSize: response.data.PinSize,
        timestamp: response.data.Timestamp,
      };

      this.logger.log(`File uploaded to IPFS: ${result.ipfsHash}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to upload to IPFS: ${error.message}`);
      throw new Error(`IPFS upload failed: ${error.message}`);
    }
  }

  /**
   * Upload JSON data to IPFS via Pinata
   */
  async uploadJson(
    jsonData: Record<string, any>,
    name: string,
  ): Promise<IpfsUploadResult> {
    if (!this.isConfigured) {
      throw new Error('IPFS service not configured');
    }

    this.logger.log(`Uploading JSON to IPFS: ${name}`);

    try {
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        {
          pinataContent: jsonData,
          pinataMetadata: { name },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            pinata_api_key: this.pinataApiKey,
            pinata_secret_api_key: this.pinataSecretKey,
          },
        },
      );

      const result: IpfsUploadResult = {
        ipfsHash: response.data.IpfsHash,
        pinSize: response.data.PinSize,
        timestamp: response.data.Timestamp,
      };

      this.logger.log(`JSON uploaded to IPFS: ${result.ipfsHash}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to upload JSON to IPFS: ${error.message}`);
      throw new Error(`IPFS JSON upload failed: ${error.message}`);
    }
  }

  /**
   * Fetch a file from IPFS
   */
  async getFile(ipfsHash: string): Promise<Buffer> {
    this.logger.log(`Fetching file from IPFS: ${ipfsHash}`);

    try {
      const response = await axios.get(this.getGatewayUrl(ipfsHash), {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 second timeout
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      this.logger.error(`Failed to fetch from IPFS: ${error.message}`);
      throw new Error(`IPFS fetch failed: ${error.message}`);
    }
  }

  /**
   * Get the gateway URL for an IPFS hash
   */
  getGatewayUrl(ipfsHash: string): string {
    return `${this.pinataGateway}/ipfs/${ipfsHash}`;
  }

  /**
   * Get the IPFS protocol URL
   */
  getIpfsUrl(ipfsHash: string): string {
    return `ipfs://${ipfsHash}`;
  }

  /**
   * Unpin a file from Pinata (delete from their servers)
   */
  async unpinFile(ipfsHash: string): Promise<boolean> {
    if (!this.isConfigured) {
      throw new Error('IPFS service not configured');
    }

    this.logger.log(`Unpinning file from IPFS: ${ipfsHash}`);

    try {
      await axios.delete(
        `https://api.pinata.cloud/pinning/unpin/${ipfsHash}`,
        {
          headers: {
            pinata_api_key: this.pinataApiKey,
            pinata_secret_api_key: this.pinataSecretKey,
          },
        },
      );

      this.logger.log(`File unpinned from IPFS: ${ipfsHash}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to unpin from IPFS: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if a file is pinned on Pinata
   */
  async isPinned(ipfsHash: string): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      const response = await axios.get(
        `https://api.pinata.cloud/data/pinList?hashContains=${ipfsHash}`,
        {
          headers: {
            pinata_api_key: this.pinataApiKey,
            pinata_secret_api_key: this.pinataSecretKey,
          },
        },
      );

      return response.data.count > 0;
    } catch {
      return false;
    }
  }
}

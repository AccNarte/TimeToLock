export interface ChainConfig {
    chainId: number;
    name: string;
    rpcUrl: string;
    rpcUrlBackup?: string;
    explorer: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
}
export declare const CHAIN_CONFIGS: Record<number, ChainConfig>;
export declare function getChainConfig(chainId: number): ChainConfig;

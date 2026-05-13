"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHAIN_CONFIGS = void 0;
exports.getChainConfig = getChainConfig;
exports.CHAIN_CONFIGS = {
    137: {
        chainId: 137,
        name: 'Polygon',
        rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-bor-rpc.publicnode.com',
        rpcUrlBackup: 'https://polygon.drpc.org',
        explorer: 'https://polygonscan.com',
        nativeCurrency: {
            name: 'MATIC',
            symbol: 'MATIC',
            decimals: 18,
        },
    },
    80002: {
        chainId: 80002,
        name: 'Polygon Amoy',
        rpcUrl: process.env.AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
        explorer: 'https://amoy.polygonscan.com',
        nativeCurrency: {
            name: 'MATIC',
            symbol: 'MATIC',
            decimals: 18,
        },
    },
    1: {
        chainId: 1,
        name: 'Ethereum',
        rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://ethereum-rpc.publicnode.com',
        explorer: 'https://etherscan.io',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
        },
    },
};
function getChainConfig(chainId) {
    const config = exports.CHAIN_CONFIGS[chainId];
    if (!config) {
        throw new Error(`Chain ${chainId} not supported`);
    }
    return config;
}
//# sourceMappingURL=chain-configs.js.map
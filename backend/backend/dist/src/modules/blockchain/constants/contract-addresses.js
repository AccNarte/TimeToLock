"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FACTORY_ADDRESSES = void 0;
exports.getFactoryAddress = getFactoryAddress;
exports.FACTORY_ADDRESSES = {
    137: process.env.FACTORY_ADDRESS_POLYGON || '',
    80002: process.env.FACTORY_ADDRESS_AMOY || '',
    31337: process.env.FACTORY_ADDRESS_LOCAL || '',
};
function getFactoryAddress(chainId) {
    const address = exports.FACTORY_ADDRESSES[chainId];
    if (!address) {
        throw new Error(`Factory address not configured for chain ${chainId}. Please set the environment variable.`);
    }
    return address;
}
//# sourceMappingURL=contract-addresses.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSecret = validateSecret;
const config_1 = require("@nestjs/config");
const common_1 = require("@nestjs/common");
const logger = new common_1.Logger('SecurityConfig');
const INSECURE_DEFAULTS = [
    'changeme',
    'secret',
    'password',
    'default-secret-change-in-production',
    '123456',
    'admin',
];
function validateSecret(name, value, required = true) {
    if (!value || value.trim() === '') {
        if (required) {
            throw new Error(`Security Error: ${name} is required but not set`);
        }
        return '';
    }
    const isProduction = process.env.NODE_ENV === 'production';
    const isInsecure = INSECURE_DEFAULTS.some((defaultVal) => value.toLowerCase().includes(defaultVal.toLowerCase()));
    if (isInsecure) {
        if (isProduction) {
            throw new Error(`Security Error: ${name} is using an insecure default value. ` +
                `Please set a strong, unique secret in production.`);
        }
        else {
            logger.warn(`WARNING: ${name} is using an insecure default value. ` +
                `This is acceptable for development but MUST be changed in production.`);
        }
    }
    if (value.length < 32 && isProduction) {
        throw new Error(`Security Error: ${name} must be at least 32 characters in production. ` +
            `Current length: ${value.length}`);
    }
    return value;
}
exports.default = (0, config_1.registerAs)('security', () => {
    const jwtSecret = validateSecret('JWT_SECRET', process.env.JWT_SECRET, true);
    const walletEncryptionSecret = validateSecret('WALLET_ENCRYPTION_SECRET', process.env.WALLET_ENCRYPTION_SECRET, false);
    return {
        jwtSecret,
        walletEncryptionSecret: walletEncryptionSecret || 'default-secret-change-in-production',
        cookieSecret: process.env.COOKIE_SECRET || jwtSecret,
        isProduction: process.env.NODE_ENV === 'production',
    };
});
//# sourceMappingURL=security.config.js.map
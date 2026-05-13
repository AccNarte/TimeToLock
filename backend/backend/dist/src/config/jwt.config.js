"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('jwt', () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is required');
    }
    return {
        secret,
        expiresIn: process.env.JWT_EXPIRES || '1d',
    };
});
//# sourceMappingURL=jwt.config.js.map
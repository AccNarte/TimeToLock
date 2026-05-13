"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dotenv = require("dotenv");
dotenv.config();
const databaseUrl = process.env.DATABASE_URL;
exports.default = new typeorm_1.DataSource({
    type: 'postgres',
    ...(databaseUrl
        ? { url: databaseUrl, ssl: { rejectUnauthorized: false } }
        : {
            host: process.env.DATABASE_HOST || 'localhost',
            port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
            username: process.env.DATABASE_USER || 'root',
            password: process.env.DATABASE_PASSWORD || 'password',
            database: process.env.DATABASE_NAME || 'timelock',
            ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
        }),
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/migrations/*.ts'],
    synchronize: false,
});
//# sourceMappingURL=ormconfig.js.map
declare const _default: (() => {
    type: "postgres";
    url: string;
    entities: string[];
    synchronize: boolean;
    autoLoadEntities: boolean;
    ssl: {
        rejectUnauthorized: boolean;
    };
    host?: undefined;
    port?: undefined;
    username?: undefined;
    password?: undefined;
    database?: undefined;
} | {
    type: "postgres";
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    entities: string[];
    synchronize: boolean;
    autoLoadEntities: boolean;
    ssl: boolean | {
        rejectUnauthorized: boolean;
    };
    url?: undefined;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    type: "postgres";
    url: string;
    entities: string[];
    synchronize: boolean;
    autoLoadEntities: boolean;
    ssl: {
        rejectUnauthorized: boolean;
    };
    host?: undefined;
    port?: undefined;
    username?: undefined;
    password?: undefined;
    database?: undefined;
} | {
    type: "postgres";
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    entities: string[];
    synchronize: boolean;
    autoLoadEntities: boolean;
    ssl: boolean | {
        rejectUnauthorized: boolean;
    };
    url?: undefined;
}>;
export default _default;

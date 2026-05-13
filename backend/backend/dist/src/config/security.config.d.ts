declare function validateSecret(name: string, value: string | undefined, required?: boolean): string;
declare const _default: (() => {
    jwtSecret: string;
    walletEncryptionSecret: string;
    cookieSecret: string;
    isProduction: boolean;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    jwtSecret: string;
    walletEncryptionSecret: string;
    cookieSecret: string;
    isProduction: boolean;
}>;
export default _default;
export { validateSecret };

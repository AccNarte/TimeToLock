import { registerAs } from '@nestjs/config';
import { Logger } from '@nestjs/common';

const logger = new Logger('SecurityConfig');

// List of insecure default values that should not be used in production
const INSECURE_DEFAULTS = [
  'changeme',
  'secret',
  'password',
  'default-secret-change-in-production',
  '123456',
  'admin',
];

/**
 * Validate that a secret is not using an insecure default value
 */
function validateSecret(name: string, value: string | undefined, required = true): string {
  if (!value || value.trim() === '') {
    if (required) {
      throw new Error(`Security Error: ${name} is required but not set`);
    }
    return '';
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const isInsecure = INSECURE_DEFAULTS.some(
    (defaultVal) => value.toLowerCase().includes(defaultVal.toLowerCase())
  );

  if (isInsecure) {
    if (isProduction) {
      throw new Error(
        `Security Error: ${name} is using an insecure default value. ` +
        `Please set a strong, unique secret in production.`
      );
    } else {
      logger.warn(
        `WARNING: ${name} is using an insecure default value. ` +
        `This is acceptable for development but MUST be changed in production.`
      );
    }
  }

  // Check minimum length for secrets
  if (value.length < 32 && isProduction) {
    throw new Error(
      `Security Error: ${name} must be at least 32 characters in production. ` +
      `Current length: ${value.length}`
    );
  }

  return value;
}

export default registerAs('security', () => {
  const jwtSecret = validateSecret('JWT_SECRET', process.env.JWT_SECRET, true);
  const walletEncryptionSecret = validateSecret(
    'WALLET_ENCRYPTION_SECRET',
    process.env.WALLET_ENCRYPTION_SECRET,
    false
  );

  return {
    jwtSecret,
    walletEncryptionSecret: walletEncryptionSecret || 'default-secret-change-in-production',
    cookieSecret: process.env.COOKIE_SECRET || jwtSecret,
    isProduction: process.env.NODE_ENV === 'production',
  };
});

export { validateSecret };

import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  // Support for connection string (NeonDB) or individual parameters
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl) {
    // Parse connection string if provided
    return {
      type: 'postgres' as const,
      url: databaseUrl,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production',
      autoLoadEntities: true,
      ssl: { rejectUnauthorized: false },
    };
  }
  
  // Fallback to individual parameters
  return {
    type: 'postgres' as const,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || 'password',
    database: process.env.DATABASE_NAME || 'timelock',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: process.env.NODE_ENV !== 'production',
    autoLoadEntities: true,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
});



# TimeLock Backend

NestJS backend API for the TimeLock application.

## Features

- 🔐 JWT Authentication (email + password)
- 📁 TimeLock Files - Encrypted documents that unlock after a date
- 💰 TimeLock Crypto - Lock crypto on-chain via smart contracts
- 👛 Wallet Management - External and internal/custodial wallets
- 📋 Audit Logs - Track sensitive actions
- 🔗 CryptoEngine - HTTP client placeholder for external service

## Tech Stack

- NestJS
- TypeScript
- TypeORM + MariaDB
- Passport JWT
- Bcrypt
- Axios
- class-validator

## Getting Started

### Prerequisites

- Node.js 18+
- MariaDB/MySQL

### Installation

```bash
cd backend
npm install
```

### Configuration

Copy `env.example.txt` to `.env` and configure:

```env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=password
DATABASE_NAME=timelock

JWT_SECRET=changeme
JWT_EXPIRES=1d

PORT=3001
```

### Database Setup

Create the database in MariaDB:

```sql
CREATE DATABASE timelock;
```

### Running the Application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Endpoints

### Authentication

| Method | Endpoint       | Description          | Auth |
|--------|----------------|----------------------|------|
| POST   | /api/auth/register | Register new user    | ❌   |
| POST   | /api/auth/login    | Login user           | ❌   |
| GET    | /api/auth/me       | Get current user     | ✅   |

### Users

| Method | Endpoint       | Description          | Auth |
|--------|----------------|----------------------|------|
| GET    | /api/users/me  | Get current user     | ✅   |

### Wallets

| Method | Endpoint                  | Description              | Auth |
|--------|---------------------------|--------------------------|------|
| POST   | /api/wallets/create-internal | Create internal wallet  | ✅   |
| POST   | /api/wallets/link-external   | Link external wallet    | ✅   |
| GET    | /api/wallets              | List all wallets         | ✅   |

### TimeLock Files

| Method | Endpoint                | Description              | Auth |
|--------|-------------------------|--------------------------|------|
| POST   | /api/timelock-files/create | Create file lock       | ✅   |
| GET    | /api/timelock-files     | List all file locks      | ✅   |
| GET    | /api/timelock-files/:id | Get file lock by ID      | ✅   |

### TimeLock Crypto

| Method | Endpoint                 | Description              | Auth |
|--------|--------------------------|--------------------------|------|
| POST   | /api/timelock-crypto/lock | Create crypto lock      | ✅   |
| GET    | /api/timelock-crypto     | List all crypto locks    | ✅   |
| GET    | /api/timelock-crypto/:id | Get crypto lock by ID    | ✅   |

### Audit

| Method | Endpoint    | Description          | Auth |
|--------|-------------|----------------------|------|
| GET    | /api/audit  | List audit logs      | ✅   |

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.config.ts
│   │   └── jwt.config.ts
│   ├── common/
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts
│   │   ├── decorators/
│   │   │   └── user.decorator.ts
│   │   └── interceptors/
│   │       └── logging.interceptor.ts
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── wallets/
│   │   ├── timelock-files/
│   │   ├── timelock-crypto/
│   │   ├── audit/
│   │   └── crypto-engine/
│   ├── app.module.ts
│   └── main.ts
├── ormconfig.ts
├── package.json
└── tsconfig.json
```

## Frontend Integration

This backend is designed to work with the Next.js frontend. The API runs on port 3001 by default, while the frontend runs on port 3000.

CORS is configured to allow requests from `http://localhost:3000`.

## License

MIT



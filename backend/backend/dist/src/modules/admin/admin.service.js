"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
const crypto_lock_entity_1 = require("../timelock-crypto/crypto-lock.entity");
const blockchain_file_lock_entity_1 = require("../timelock-files-blockchain/blockchain-file-lock.entity");
const file_lock_entity_1 = require("../timelock-files/file-lock.entity");
const wallet_entity_1 = require("../wallets/wallet.entity");
const role_entity_1 = require("../roles/role.entity");
let AdminService = class AdminService {
    constructor(usersRepository, cryptoLocksRepository, blockchainFileLocksRepository, fileLocksRepository, walletsRepository, rolesRepository) {
        this.usersRepository = usersRepository;
        this.cryptoLocksRepository = cryptoLocksRepository;
        this.blockchainFileLocksRepository = blockchainFileLocksRepository;
        this.fileLocksRepository = fileLocksRepository;
        this.walletsRepository = walletsRepository;
        this.rolesRepository = rolesRepository;
    }
    async checkAdminAccess(userId) {
        const user = await this.usersRepository.findOne({
            where: { id: userId },
            relations: ['role'],
        });
        if (!user || !user.role) {
            return false;
        }
        return user.role.name === 'admin' || user.role.name === 'superadmin';
    }
    async getStats() {
        const totalUsers = await this.usersRepository.count();
        const passwordAuthUsers = await this.usersRepository.count({
            where: { loginMethod: 'password' },
        });
        const walletAuthUsers = await this.usersRepository.count({
            where: { loginMethod: 'wallet' },
        });
        const verifiedEmailUsers = await this.usersRepository.count({
            where: { isEmailVerified: true },
        });
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const newThisWeek = await this.usersRepository
            .createQueryBuilder('user')
            .where('user.createdAt >= :date', { date: oneWeekAgo })
            .getCount();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const newThisMonth = await this.usersRepository
            .createQueryBuilder('user')
            .where('user.createdAt >= :date', { date: oneMonthAgo })
            .getCount();
        const totalCryptoLocks = await this.cryptoLocksRepository.count();
        const lockedCrypto = await this.cryptoLocksRepository.count({
            where: { status: 'LOCKED' },
        });
        const unlockableCrypto = await this.cryptoLocksRepository.count({
            where: { status: 'UNLOCKABLE' },
        });
        const withdrawnCrypto = await this.cryptoLocksRepository.count({
            where: { status: 'WITHDRAWN' },
        });
        const totalFileLocks = await this.blockchainFileLocksRepository.count();
        const lockedFiles = await this.blockchainFileLocksRepository.count({
            where: { status: 'LOCKED' },
        });
        const unlockableFiles = await this.blockchainFileLocksRepository.count({
            where: { status: 'UNLOCKABLE' },
        });
        const unlockedFiles = await this.blockchainFileLocksRepository.count({
            where: { status: 'UNLOCKED' },
        });
        const sizeResult = await this.blockchainFileLocksRepository
            .createQueryBuilder('file')
            .select('COALESCE(SUM(file.sizeBytes), 0)', 'totalSize')
            .getRawOne();
        const totalSizeBytes = parseInt(sizeResult?.totalSize || '0', 10);
        const totalClassicFiles = await this.fileLocksRepository.count();
        const lockedClassic = await this.fileLocksRepository.count({
            where: { status: 'locked' },
        });
        const unlockableClassic = await this.fileLocksRepository.count({
            where: { status: 'unlockable' },
        });
        const unlockedClassic = await this.fileLocksRepository.count({
            where: { status: 'unlocked' },
        });
        const totalWallets = await this.walletsRepository.count();
        const internalWallets = await this.walletsRepository.count({
            where: { type: 'internal' },
        });
        const externalWallets = await this.walletsRepository.count({
            where: { type: 'external' },
        });
        return {
            users: {
                total: totalUsers,
                passwordAuth: passwordAuthUsers,
                walletAuth: walletAuthUsers,
                passwordAuthPercent: totalUsers > 0 ? Math.round((passwordAuthUsers / totalUsers) * 100) : 0,
                walletAuthPercent: totalUsers > 0 ? Math.round((walletAuthUsers / totalUsers) * 100) : 0,
                verifiedEmail: verifiedEmailUsers,
                newThisWeek,
                newThisMonth,
            },
            cryptoLocks: {
                total: totalCryptoLocks,
                locked: lockedCrypto,
                unlockable: unlockableCrypto,
                withdrawn: withdrawnCrypto,
            },
            fileLocks: {
                total: totalFileLocks,
                locked: lockedFiles,
                unlockable: unlockableFiles,
                unlocked: unlockedFiles,
                totalSizeBytes,
            },
            filesClassic: {
                total: totalClassicFiles,
                locked: lockedClassic,
                unlockable: unlockableClassic,
                unlocked: unlockedClassic,
            },
            wallets: {
                total: totalWallets,
                internal: internalWallets,
                external: externalWallets,
            },
        };
    }
    async getUsers() {
        const users = await this.usersRepository.find({
            relations: ['role', 'wallets'],
            order: { createdAt: 'DESC' },
        });
        const cryptoLocksPerUser = await this.cryptoLocksRepository
            .createQueryBuilder('cl')
            .select('w.userId', 'userId')
            .addSelect('COUNT(cl.id)', 'count')
            .innerJoin('cl.wallet', 'w')
            .groupBy('w.userId')
            .getRawMany();
        const cryptoLocksMap = new Map();
        cryptoLocksPerUser.forEach((item) => {
            cryptoLocksMap.set(parseInt(item.userId), parseInt(item.count));
        });
        const fileLocksPerUser = await this.blockchainFileLocksRepository
            .createQueryBuilder('fl')
            .select('fl.userId', 'userId')
            .addSelect('COUNT(fl.id)', 'count')
            .groupBy('fl.userId')
            .getRawMany();
        const fileLocksMap = new Map();
        fileLocksPerUser.forEach((item) => {
            fileLocksMap.set(parseInt(item.userId), parseInt(item.count));
        });
        return users.map((user) => ({
            id: user.id,
            email: user.email,
            loginMethod: user.loginMethod,
            isEmailVerified: user.isEmailVerified,
            roleName: user.role?.name || null,
            walletsCount: user.wallets?.length || 0,
            cryptoLocksCount: cryptoLocksMap.get(user.id) || 0,
            fileLocksCount: fileLocksMap.get(user.id) || 0,
            createdAt: user.createdAt,
        }));
    }
    async getUserDetails(userId) {
        const user = await this.usersRepository.findOne({
            where: { id: userId },
            relations: ['role', 'wallets'],
        });
        if (!user) {
            return null;
        }
        const cryptoLocks = await this.cryptoLocksRepository
            .createQueryBuilder('cl')
            .innerJoin('cl.wallet', 'w')
            .where('w.userId = :userId', { userId })
            .getMany();
        const fileLocks = await this.blockchainFileLocksRepository.find({
            where: { userId },
        });
        return {
            ...user,
            cryptoLocks,
            fileLocks,
        };
    }
    async setUserRole(userId, roleName) {
        const user = await this.usersRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }
        const role = await this.rolesRepository.findOne({ where: { name: roleName } });
        if (!role) {
            throw new Error('Role not found');
        }
        user.roleId = role.id;
        return this.usersRepository.save(user);
    }
    async getRoles() {
        return this.rolesRepository.find();
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(crypto_lock_entity_1.CryptoLock)),
    __param(2, (0, typeorm_1.InjectRepository)(blockchain_file_lock_entity_1.BlockchainFileLock)),
    __param(3, (0, typeorm_1.InjectRepository)(file_lock_entity_1.FileLock)),
    __param(4, (0, typeorm_1.InjectRepository)(wallet_entity_1.Wallet)),
    __param(5, (0, typeorm_1.InjectRepository)(role_entity_1.Role)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AdminService);
//# sourceMappingURL=admin.service.js.map
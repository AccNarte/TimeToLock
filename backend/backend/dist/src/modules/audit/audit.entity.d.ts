import { User } from '../users/user.entity';
import { Wallet } from '../wallets/wallet.entity';
import { EntityType } from './entity-type.entity';
import { Action } from './action.entity';
export declare class AuditLog {
    id: number;
    userId: number;
    userWalletId: number;
    entityTypeId: number;
    entityId: number;
    actionId: number;
    metadataJson: object;
    createdAt: Date;
    user: User;
    wallet: Wallet;
    entityType: EntityType;
    action: Action;
}

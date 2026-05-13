import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { Role } from './modules/roles/role.entity';
import { User } from './modules/users/user.entity';
import { Wallet } from './modules/wallets/wallet.entity';

// Wallet address to promote as admin
const ADMIN_WALLET_ADDRESS = '0x258c9203aA2B1401B4359862Ee992f4c207112A1';

async function seed() {
  console.log('🔐 Starting admin seed...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const roleRepo = dataSource.getRepository(Role);
  const userRepo = dataSource.getRepository(User);
  const walletRepo = dataSource.getRepository(Wallet);

  // 1. Seed roles
  const rolesData = [
    { name: 'user', description: 'Standard user with basic access' },
    { name: 'admin', description: 'Administrator with full dashboard access' },
    { name: 'superadmin', description: 'Super administrator with system access' },
  ];

  const roles: Record<string, Role> = {};
  for (const roleData of rolesData) {
    let role = await roleRepo.findOne({ where: { name: roleData.name } });
    if (!role) {
      role = await roleRepo.save(roleData);
      console.log(`✅ Created role: ${roleData.name}`);
    } else {
      console.log(`ℹ️ Role ${roleData.name} already exists (ID: ${role.id})`);
    }
    roles[roleData.name] = role;
  }

  // 2. Find user by wallet address and promote to admin
  console.log(`\n🔍 Looking for wallet: ${ADMIN_WALLET_ADDRESS}`);

  const wallet = await walletRepo.findOne({
    where: { address: ADMIN_WALLET_ADDRESS.toLowerCase() },
    relations: ['user'],
  });

  // Try case-insensitive search if not found
  let targetUser: User | null = null;

  if (wallet && wallet.user) {
    targetUser = wallet.user;
  } else {
    // Try with original case
    const walletOriginal = await walletRepo.findOne({
      where: { address: ADMIN_WALLET_ADDRESS },
      relations: ['user'],
    });
    if (walletOriginal && walletOriginal.user) {
      targetUser = walletOriginal.user;
    }
  }

  if (targetUser) {
    const userWithRole = await userRepo.findOne({
      where: { id: targetUser.id },
      relations: ['role'],
    });

    if (userWithRole) {
      if (!userWithRole.role || userWithRole.role.name !== 'admin') {
        userWithRole.roleId = roles['admin'].id;
        await userRepo.save(userWithRole);
        console.log(`✅ Promoted user ${userWithRole.email || `ID ${userWithRole.id}`} (wallet: ${ADMIN_WALLET_ADDRESS}) to admin`);
      } else {
        console.log(`ℹ️ User ${userWithRole.email || `ID ${userWithRole.id}`} is already admin`);
      }
    }
  } else {
    console.log(`⚠️ No user found with wallet address: ${ADMIN_WALLET_ADDRESS}`);
    console.log('   Make sure the wallet is linked to a user account.');
  }

  // Show final state
  console.log('\n📊 All roles:');
  const allRoles = await roleRepo.find();
  for (const role of allRoles) {
    console.log(`   ID ${role.id}: ${role.name} - ${role.description}`);
  }

  console.log('\n👥 Admin users:');
  const adminUsers = await userRepo.find({
    where: { roleId: roles['admin']?.id },
  });
  for (const user of adminUsers) {
    console.log(`   ID ${user.id}: ${user.email || 'No email'}`);
  }

  await app.close();
  console.log('\n🎉 Admin seed complete!');
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});

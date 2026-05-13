import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { CryptoNetwork } from './modules/crypto-networks/crypto-network.entity';
import { Token } from './modules/tokens/token.entity';
import { TokenContract } from './modules/tokens/token-contract.entity';

async function seed() {
  console.log('🌱 Starting token seed...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const networkRepo = dataSource.getRepository(CryptoNetwork);
  const tokenRepo = dataSource.getRepository(Token);
  const tokenContractRepo = dataSource.getRepository(TokenContract);

  // 1. Seed Polygon network
  let polygonNetwork = await networkRepo.findOne({ where: { chainId: 137 } });
  if (!polygonNetwork) {
    polygonNetwork = await networkRepo.save({
      name: 'Polygon',
      chainId: 137,
    });
    console.log('✅ Created Polygon network');
  } else {
    console.log('ℹ️ Polygon network already exists');
  }

  // 2. Seed tokens
  const tokensData = [
    { symbol: 'MATIC', decimals: 18 },
    { symbol: 'USDC', decimals: 6 },
    { symbol: 'USDT', decimals: 6 },
    { symbol: 'DAI', decimals: 18 },
    { symbol: 'WMATIC', decimals: 18 },
  ];

  const tokens: Record<string, Token> = {};
  for (const tokenData of tokensData) {
    let token = await tokenRepo.findOne({ where: { symbol: tokenData.symbol } });
    if (!token) {
      token = await tokenRepo.save(tokenData);
      console.log(`✅ Created token: ${tokenData.symbol}`);
    } else {
      console.log(`ℹ️ Token ${tokenData.symbol} already exists`);
    }
    tokens[tokenData.symbol] = token;
  }

  // 3. Seed token contracts for Polygon
  // IMPORTANT: These IDs must match what's in the frontend TOKEN_ADDRESSES_BY_CHAIN
  const polygonContracts = [
    { symbol: 'MATIC', address: '0x0000000000000000000000000000000000001010', expectedId: 1 },
    { symbol: 'USDC', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', expectedId: 2 },
    { symbol: 'USDT', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', expectedId: 3 },
    { symbol: 'DAI', address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', expectedId: 4 },
    { symbol: 'WMATIC', address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', expectedId: 5 },
  ];

  for (const contract of polygonContracts) {
    const token = tokens[contract.symbol];
    if (!token) {
      console.log(`⚠️ Token ${contract.symbol} not found, skipping`);
      continue;
    }

    let tokenContract = await tokenContractRepo.findOne({
      where: { tokenId: token.id, networkId: polygonNetwork.id },
    });

    if (!tokenContract) {
      tokenContract = await tokenContractRepo.save({
        tokenId: token.id,
        networkId: polygonNetwork.id,
        contractAddress: contract.address,
      });
      console.log(`✅ Created token contract: ${contract.symbol} on Polygon (ID: ${tokenContract.id})`);

      // Warn if ID doesn't match expected
      if (tokenContract.id !== contract.expectedId) {
        console.log(`⚠️ WARNING: Token contract ID ${tokenContract.id} doesn't match expected ${contract.expectedId}`);
        console.log(`   You need to update TOKEN_ADDRESSES_BY_CHAIN in frontend/app/(app)/crypto/page.tsx`);
      }
    } else {
      console.log(`ℹ️ Token contract ${contract.symbol} on Polygon already exists (ID: ${tokenContract.id})`);
    }
  }

  // Show final state
  console.log('\n📊 Final token contracts:');
  const allContracts = await tokenContractRepo.find({
    relations: ['token', 'network'],
  });
  for (const tc of allContracts) {
    console.log(`   ID ${tc.id}: ${tc.token?.symbol} on ${tc.network?.name} (${tc.contractAddress})`);
  }

  await app.close();
  console.log('\n🎉 Seed complete!');
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});

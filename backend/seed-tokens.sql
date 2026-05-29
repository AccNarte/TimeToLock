-- Seed script for token contracts on Polygon
-- Run this in your database

-- 1. Insert Polygon network (if not exists)
INSERT INTO crypto_networks (name, chain_id)
VALUES ('Polygon', 137)
ON CONFLICT (name) DO NOTHING;

-- Get the network ID for Polygon
-- (You may need to adjust this if your DB doesn't support this syntax)

-- 2. Insert tokens
INSERT INTO tokens (symbol, decimals) VALUES ('MATIC', 18) ON CONFLICT DO NOTHING;
INSERT INTO tokens (symbol, decimals) VALUES ('USDC', 6) ON CONFLICT DO NOTHING;
INSERT INTO tokens (symbol, decimals) VALUES ('USDT', 6) ON CONFLICT DO NOTHING;
INSERT INTO tokens (symbol, decimals) VALUES ('DAI', 18) ON CONFLICT DO NOTHING;
INSERT INTO tokens (symbol, decimals) VALUES ('WMATIC', 18) ON CONFLICT DO NOTHING;

-- 3. Insert token contracts for Polygon (chainId: 137)
-- Note: IDs must match what's in the frontend TOKEN_ADDRESSES_BY_CHAIN

-- First, let's do it with explicit IDs to match frontend
-- You may need to truncate and re-insert if IDs don't match

-- Clear existing (be careful in production!)
-- TRUNCATE token_contracts, tokens, crypto_networks RESTART IDENTITY CASCADE;

-- Insert with specific structure
-- Polygon network should have ID 1 (or adjust based on your data)

-- If you need specific IDs, use this approach:
-- Make sure crypto_networks has Polygon with the right ID

-- Token contracts mapping (must match frontend tokenContractId):
-- ID 1 = MATIC on Polygon
-- ID 2 = USDC on Polygon
-- ID 3 = USDT on Polygon
-- ID 4 = DAI on Polygon
-- ID 5 = WMATIC on Polygon

-- Run these queries in order:

-- Check what exists
SELECT * FROM crypto_networks;
SELECT * FROM tokens;
SELECT * FROM token_contracts;

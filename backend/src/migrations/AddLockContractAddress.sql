-- Migration: Add lock_contract_address column to crypto_locks table
-- Date: 2026-01-05
-- Description: Stores the deployed TimelockVault contract address for each lock

-- Add the column
ALTER TABLE crypto_locks
ADD COLUMN lock_contract_address VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX idx_crypto_locks_contract_address
ON crypto_locks(lock_contract_address);

-- Update existing locks (if any) to have NULL for this field
-- New locks will have this field populated by the frontend/backend

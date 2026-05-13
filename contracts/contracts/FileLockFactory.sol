// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./FileLockVault.sol";
import "./interfaces/IFileLockVault.sol";

/**
 * @title FileLockFactory
 * @dev Factory contract that creates and manages FileLockVault instances
 * @notice Users interact with this contract to create file lock vaults
 * @dev Files are stored on IPFS, this factory only creates vaults that store IPFS hashes and encrypted keys
 */
contract FileLockFactory is ReentrancyGuard {
    // Events
    event FileLockCreated(
        address indexed lockAddress,
        address indexed owner,
        string ipfsHash,
        uint256 unlockTime
    );

    // Storage
    address[] public allLocks;
    mapping(address => address[]) public userLocks;
    mapping(address => bool) public isValidLock;

    // Custom errors
    error InvalidIpfsHash();
    error InvalidEncryptionKey();
    error InvalidUnlockTime();

    /**
     * @notice Create a new file lock vault
     * @dev Creates a vault that stores the IPFS hash and encrypted key
     * @param ipfsHash IPFS CID of the encrypted file
     * @param encryptedKey AES encryption key (encrypted with owner's wallet signature)
     * @param unlockTime Timestamp when the key can be retrieved
     * @return lockAddress Address of the created vault
     */
    function createFileLock(
        string calldata ipfsHash,
        bytes calldata encryptedKey,
        uint256 unlockTime
    ) external nonReentrant returns (address lockAddress) {
        // Validation
        if (bytes(ipfsHash).length == 0) revert InvalidIpfsHash();
        if (encryptedKey.length == 0) revert InvalidEncryptionKey();
        if (unlockTime <= block.timestamp) revert InvalidUnlockTime();

        // Create new vault instance
        FileLockVault vault = new FileLockVault(
            msg.sender,    // owner
            ipfsHash,      // IPFS CID of encrypted file
            encryptedKey,  // encrypted AES key
            unlockTime     // when to unlock
        );

        lockAddress = address(vault);

        // Track the lock
        allLocks.push(lockAddress);
        userLocks[msg.sender].push(lockAddress);
        isValidLock[lockAddress] = true;

        emit FileLockCreated(lockAddress, msg.sender, ipfsHash, unlockTime);

        return lockAddress;
    }

    /**
     * @notice Get all locks created by a specific user
     * @param user Address of the user
     * @return Array of lock addresses
     */
    function getUserLocks(address user) external view returns (address[] memory) {
        return userLocks[user];
    }

    /**
     * @notice Get all locks ever created
     * @return Array of all lock addresses
     */
    function getAllLocks() external view returns (address[] memory) {
        return allLocks;
    }

    /**
     * @notice Get total number of locks created
     * @return Total count of locks
     */
    function getTotalLocksCount() external view returns (uint256) {
        return allLocks.length;
    }

    /**
     * @notice Get number of locks for a specific user
     * @param user Address of the user
     * @return Count of user's locks
     */
    function getUserLocksCount(address user) external view returns (uint256) {
        return userLocks[user].length;
    }

    /**
     * @notice Check if an address is a valid lock created by this factory
     * @param lockAddress Address to check
     * @return True if it's a valid lock, false otherwise
     */
    function isLockValid(address lockAddress) external view returns (bool) {
        return isValidLock[lockAddress];
    }

    /**
     * @notice Get user's locks with full details
     * @param user Address of the user
     * @return lockAddresses Array of lock addresses
     * @return ipfsHashes Array of IPFS hashes
     * @return unlockTimes Array of unlock timestamps
     * @return statuses Array of lock statuses
     */
    function getUserLocksWithDetails(address user) external view returns (
        address[] memory lockAddresses,
        string[] memory ipfsHashes,
        uint256[] memory unlockTimes,
        IFileLockVault.LockStatus[] memory statuses
    ) {
        lockAddresses = userLocks[user];
        uint256 length = lockAddresses.length;

        ipfsHashes = new string[](length);
        unlockTimes = new uint256[](length);
        statuses = new IFileLockVault.LockStatus[](length);

        for (uint256 i = 0; i < length; i++) {
            IFileLockVault vault = IFileLockVault(lockAddresses[i]);
            (
                , // owner - already know it's the user
                ipfsHashes[i],
                unlockTimes[i],
                // keyRetrieved - not needed directly
            ) = vault.getLockDetails();
            statuses[i] = vault.getStatus();
        }

        return (lockAddresses, ipfsHashes, unlockTimes, statuses);
    }

    /**
     * @notice Get detailed information about multiple locks
     * @param lockAddresses Array of lock addresses to query
     * @return owners Array of lock owners
     * @return ipfsHashes Array of IPFS hashes
     * @return unlockTimes Array of unlock timestamps
     * @return statuses Array of lock statuses
     */
    function getLocksDetails(address[] calldata lockAddresses) external view returns (
        address[] memory owners,
        string[] memory ipfsHashes,
        uint256[] memory unlockTimes,
        IFileLockVault.LockStatus[] memory statuses
    ) {
        uint256 length = lockAddresses.length;
        owners = new address[](length);
        ipfsHashes = new string[](length);
        unlockTimes = new uint256[](length);
        statuses = new IFileLockVault.LockStatus[](length);

        for (uint256 i = 0; i < length; i++) {
            IFileLockVault vault = IFileLockVault(lockAddresses[i]);
            (
                owners[i],
                ipfsHashes[i],
                unlockTimes[i],
                // keyRetrieved - not needed for status
            ) = vault.getLockDetails();
            statuses[i] = vault.getStatus();
        }

        return (owners, ipfsHashes, unlockTimes, statuses);
    }
}

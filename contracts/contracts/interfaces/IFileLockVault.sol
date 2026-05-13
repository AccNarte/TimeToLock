// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IFileLockVault
 * @dev Interface for individual file lock vault contracts
 * @notice Stores encrypted file references (IPFS) and encryption keys with time-lock
 */
interface IFileLockVault {
    /// @dev Emitted when a file is locked
    event FileLocked(address indexed owner, string ipfsHash, uint256 unlockTime);

    /// @dev Emitted when the encryption key is retrieved
    event KeyRetrieved(address indexed owner, uint256 timestamp);

    /// @dev Status of the file lock
    enum LockStatus {
        LOCKED,      // File locked, unlock time not reached
        UNLOCKABLE,  // Unlock time reached, key can be retrieved
        UNLOCKED     // Key has been retrieved at least once
    }

    /**
     * @notice Get the encrypted encryption key (only after unlock time)
     * @dev Can only be called by owner after unlockTime
     * @return The encrypted AES key
     */
    function getEncryptionKey() external view returns (bytes memory);

    /**
     * @notice Retrieve and mark the key as retrieved
     * @dev Can only be called by owner after unlockTime, marks as UNLOCKED
     * @return The encrypted AES key
     */
    function retrieveKey() external returns (bytes memory);

    /**
     * @notice Get the current status of the lock
     * @return Current lock status
     */
    function getStatus() external view returns (LockStatus);

    /**
     * @notice Get lock details
     * @return owner Address of the lock owner
     * @return ipfsHash IPFS CID of the encrypted file
     * @return unlockTime Timestamp when file can be unlocked
     * @return keyRetrieved Whether the key has been retrieved
     */
    function getLockDetails() external view returns (
        address owner,
        string memory ipfsHash,
        uint256 unlockTime,
        bool keyRetrieved
    );

    /**
     * @notice Get the remaining time until unlock
     * @return Time in seconds until unlock (0 if already unlockable)
     */
    function getTimeUntilUnlock() external view returns (uint256);
}

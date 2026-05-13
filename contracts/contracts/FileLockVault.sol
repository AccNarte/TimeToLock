// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IFileLockVault.sol";

/**
 * @title FileLockVault
 * @dev Individual vault contract that locks an encryption key until a specified time
 * @notice This contract is created by FileLockFactory and holds the encryption key for a single file
 * @dev The encrypted file is stored on IPFS, this contract only stores the IPFS hash and encrypted key
 */
contract FileLockVault is IFileLockVault, ReentrancyGuard {
    // Immutable state variables for gas optimization
    address public immutable factory;
    address public immutable owner;
    string public ipfsHash;           // IPFS CID of the encrypted file
    bytes public encryptedKey;        // AES key encrypted with owner's wallet signature
    uint256 public immutable unlockTime;

    // Mutable state
    bool public keyRetrieved;

    // Custom errors for gas efficiency
    error OnlyFactory();
    error OnlyOwner();
    error NotUnlockableYet();
    error InvalidOwner();
    error InvalidIpfsHash();
    error InvalidEncryptionKey();
    error InvalidUnlockTime();

    /**
     * @notice Creates a new file lock vault
     * @param _owner Address that can retrieve the encryption key
     * @param _ipfsHash IPFS CID of the encrypted file
     * @param _encryptedKey AES encryption key (encrypted with owner's wallet)
     * @param _unlockTime Timestamp when the key can be retrieved
     */
    constructor(
        address _owner,
        string memory _ipfsHash,
        bytes memory _encryptedKey,
        uint256 _unlockTime
    ) {
        if (_owner == address(0)) revert InvalidOwner();
        if (bytes(_ipfsHash).length == 0) revert InvalidIpfsHash();
        if (_encryptedKey.length == 0) revert InvalidEncryptionKey();
        if (_unlockTime <= block.timestamp) revert InvalidUnlockTime();

        factory = msg.sender;
        owner = _owner;
        ipfsHash = _ipfsHash;
        encryptedKey = _encryptedKey;
        unlockTime = _unlockTime;
        keyRetrieved = false;

        emit FileLocked(_owner, _ipfsHash, _unlockTime);
    }

    /**
     * @notice Get the encrypted encryption key (view function, doesn't mark as retrieved)
     * @dev Can only be called by owner after unlockTime
     * @return The encrypted AES key
     */
    function getEncryptionKey() external view override returns (bytes memory) {
        if (msg.sender != owner) revert OnlyOwner();
        if (block.timestamp < unlockTime) revert NotUnlockableYet();

        return encryptedKey;
    }

    /**
     * @notice Retrieve the key and mark as retrieved
     * @dev Can only be called by owner after unlockTime, marks the lock as UNLOCKED
     * @return The encrypted AES key
     */
    function retrieveKey() external override nonReentrant returns (bytes memory) {
        if (msg.sender != owner) revert OnlyOwner();
        if (block.timestamp < unlockTime) revert NotUnlockableYet();

        if (!keyRetrieved) {
            keyRetrieved = true;
            emit KeyRetrieved(owner, block.timestamp);
        }

        return encryptedKey;
    }

    /**
     * @notice Get the current status of the lock
     * @return Current lock status (LOCKED, UNLOCKABLE, or UNLOCKED)
     */
    function getStatus() external view override returns (LockStatus) {
        if (keyRetrieved) {
            return LockStatus.UNLOCKED;
        }

        if (block.timestamp >= unlockTime) {
            return LockStatus.UNLOCKABLE;
        }

        return LockStatus.LOCKED;
    }

    /**
     * @notice Get detailed information about this lock
     * @return owner_ Address of the lock owner
     * @return ipfsHash_ IPFS CID of the encrypted file
     * @return unlockTime_ Timestamp when the key can be retrieved
     * @return keyRetrieved_ Whether the key has been retrieved
     */
    function getLockDetails() external view override returns (
        address owner_,
        string memory ipfsHash_,
        uint256 unlockTime_,
        bool keyRetrieved_
    ) {
        return (owner, ipfsHash, unlockTime, keyRetrieved);
    }

    /**
     * @notice Get the remaining time until unlock
     * @return Time in seconds until unlock (0 if already unlockable)
     */
    function getTimeUntilUnlock() external view override returns (uint256) {
        if (block.timestamp >= unlockTime) {
            return 0;
        }
        return unlockTime - block.timestamp;
    }

    /**
     * @notice Get the IPFS URL for the encrypted file
     * @return The IPFS gateway URL
     */
    function getIpfsUrl() external view returns (string memory) {
        return string(abi.encodePacked("ipfs://", ipfsHash));
    }
}

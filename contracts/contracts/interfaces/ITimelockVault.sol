// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITimelockVault
 * @dev Interface for individual timelock vault contracts
 */
interface ITimelockVault {
    /// @dev Emitted when tokens are locked
    event Locked(address indexed token, uint256 amount, uint256 unlockTime);

    /// @dev Emitted when tokens are withdrawn
    event Withdrawn(address indexed token, uint256 amount);

    /// @dev Status of the lock
    enum LockStatus {
        LOCKED,      // Tokens are locked, unlock time not reached
        UNLOCKABLE,  // Unlock time reached, can be withdrawn
        WITHDRAWN    // Tokens have been withdrawn
    }

    /**
     * @notice Lock tokens in the vault (called by factory)
     * @dev Can only be called once by the factory contract
     */
    function lock() external;

    /**
     * @notice Withdraw tokens after unlock time
     * @dev Can only be called by owner after unlockTime
     */
    function withdraw() external;

    /**
     * @notice Get the current status of the lock
     * @return Current lock status
     */
    function getStatus() external view returns (LockStatus);

    /**
     * @notice Get lock details
     * @return owner Address of the lock owner
     * @return token Address of the locked token
     * @return amount Amount of tokens locked
     * @return unlockTime Timestamp when tokens can be withdrawn
     * @return withdrawn Whether tokens have been withdrawn
     */
    function getLockDetails() external view returns (
        address owner,
        address token,
        uint256 amount,
        uint256 unlockTime,
        bool withdrawn
    );
}

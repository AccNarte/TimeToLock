// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TimelockVault.sol";
import "./interfaces/ITimelockVault.sol";

/**
 * @title TimelockFactory
 * @dev Factory contract that creates and manages TimelockVault instances
 * @notice Users interact with this contract to create timelock vaults for their tokens
 */
contract TimelockFactory is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Events
    event LockCreated(
        address indexed lockAddress,
        address indexed owner,
        address indexed token,
        uint256 amount,
        uint256 unlockTime
    );

    // Storage
    address[] public allLocks;
    mapping(address => address[]) public userLocks;
    mapping(address => bool) public isValidLock;

    // Custom errors
    error InvalidToken();
    error InvalidAmount();
    error InvalidUnlockTime();
    error TransferFailed();
    error LockCreationFailed();

    /**
     * @notice Create a new timelock vault
     * @dev Creates a vault, transfers tokens from user to vault, and locks them
     * @param token Address of the ERC20 token to lock
     * @param amount Amount of tokens to lock
     * @param unlockTime Timestamp when tokens can be withdrawn
     * @return lockAddress Address of the created vault
     */
    function createLock(
        address token,
        uint256 amount,
        uint256 unlockTime
    ) external nonReentrant returns (address lockAddress) {
        // Validation
        if (token == address(0)) revert InvalidToken();
        if (amount == 0) revert InvalidAmount();
        if (unlockTime <= block.timestamp) revert InvalidUnlockTime();

        // Check user has approved enough tokens
        uint256 allowance = IERC20(token).allowance(msg.sender, address(this));
        if (allowance < amount) revert("Insufficient allowance");

        // Check user has enough balance
        uint256 balance = IERC20(token).balanceOf(msg.sender);
        if (balance < amount) revert("Insufficient balance");

        // Create new vault instance
        TimelockVault vault = new TimelockVault(
            msg.sender,  // owner
            token,       // token to lock
            amount,      // amount to lock
            unlockTime   // when to unlock
        );

        lockAddress = address(vault);

        // Transfer tokens from user to this factory
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Approve vault to pull tokens from factory
        IERC20(token).approve(lockAddress, amount);

        // Call vault.lock() to transfer tokens to vault
        vault.lock();

        // Verify the lock was successful
        ITimelockVault.LockStatus status = vault.getStatus();
        if (status != ITimelockVault.LockStatus.LOCKED) revert LockCreationFailed();

        // Track the lock
        allLocks.push(lockAddress);
        userLocks[msg.sender].push(lockAddress);
        isValidLock[lockAddress] = true;

        emit LockCreated(lockAddress, msg.sender, token, amount, unlockTime);

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
     * @notice Get detailed information about multiple locks
     * @param lockAddresses Array of lock addresses to query
     * @return owners Array of lock owners
     * @return tokens Array of token addresses
     * @return amounts Array of locked amounts
     * @return unlockTimes Array of unlock timestamps
     * @return statuses Array of lock statuses
     */
    function getLocksDetails(address[] calldata lockAddresses) external view returns (
        address[] memory owners,
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory unlockTimes,
        ITimelockVault.LockStatus[] memory statuses
    ) {
        uint256 length = lockAddresses.length;
        owners = new address[](length);
        tokens = new address[](length);
        amounts = new uint256[](length);
        unlockTimes = new uint256[](length);
        statuses = new ITimelockVault.LockStatus[](length);

        for (uint256 i = 0; i < length; i++) {
            ITimelockVault vault = ITimelockVault(lockAddresses[i]);
            (
                owners[i],
                tokens[i],
                amounts[i],
                unlockTimes[i],
                // withdrawn - not needed for status
            ) = vault.getLockDetails();
            statuses[i] = vault.getStatus();
        }

        return (owners, tokens, amounts, unlockTimes, statuses);
    }

    /**
     * @notice Get user's locks with full details
     * @param user Address of the user
     * @return lockAddresses Array of lock addresses
     * @return tokens Array of token addresses
     * @return amounts Array of locked amounts
     * @return unlockTimes Array of unlock timestamps
     * @return statuses Array of lock statuses
     */
    function getUserLocksWithDetails(address user) external view returns (
        address[] memory lockAddresses,
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory unlockTimes,
        ITimelockVault.LockStatus[] memory statuses
    ) {
        lockAddresses = userLocks[user];
        uint256 length = lockAddresses.length;

        tokens = new address[](length);
        amounts = new uint256[](length);
        unlockTimes = new uint256[](length);
        statuses = new ITimelockVault.LockStatus[](length);

        for (uint256 i = 0; i < length; i++) {
            ITimelockVault vault = ITimelockVault(lockAddresses[i]);
            (
                , // owner - already know it's the user
                tokens[i],
                amounts[i],
                unlockTimes[i],
                // withdrawn - not needed for status
            ) = vault.getLockDetails();
            statuses[i] = vault.getStatus();
        }

        return (lockAddresses, tokens, amounts, unlockTimes, statuses);
    }
}

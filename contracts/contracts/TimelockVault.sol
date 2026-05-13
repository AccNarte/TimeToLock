// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ITimelockVault.sol";

/**
 * @title TimelockVault
 * @dev Individual vault contract that locks ERC20 tokens until a specified time
 * @notice This contract is created by TimelockFactory and holds tokens for a single lock
 */
contract TimelockVault is ITimelockVault, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Immutable state variables for gas optimization
    address public immutable factory;
    address public immutable owner;
    address public immutable token;
    uint256 public immutable amount;
    uint256 public immutable unlockTime;

    // Mutable state
    bool public withdrawn;

    // Custom errors for gas efficiency
    error OnlyFactory();
    error OnlyOwner();
    error AlreadyLocked();
    error NotUnlockableYet();
    error AlreadyWithdrawn();
    error InvalidAmount();
    error TransferFailed();

    /**
     * @notice Creates a new timelock vault
     * @param _owner Address that can withdraw the tokens
     * @param _token Address of the ERC20 token to lock
     * @param _amount Amount of tokens to lock
     * @param _unlockTime Timestamp when tokens can be withdrawn
     */
    constructor(
        address _owner,
        address _token,
        uint256 _amount,
        uint256 _unlockTime
    ) {
        if (_owner == address(0)) revert("Invalid owner address");
        if (_token == address(0)) revert("Invalid token address");
        if (_amount == 0) revert InvalidAmount();
        if (_unlockTime <= block.timestamp) revert("Unlock time must be in future");

        factory = msg.sender;
        owner = _owner;
        token = _token;
        amount = _amount;
        unlockTime = _unlockTime;
        withdrawn = false;
    }

    /**
     * @notice Lock tokens in this vault (called by factory)
     * @dev Transfers tokens from factory to this contract
     */
    function lock() external override nonReentrant {
        if (msg.sender != factory) revert OnlyFactory();

        // Check if already locked by verifying balance
        uint256 currentBalance = IERC20(token).balanceOf(address(this));
        if (currentBalance > 0) revert AlreadyLocked();

        // Transfer tokens from factory to this vault
        IERC20(token).safeTransferFrom(factory, address(this), amount);

        // Verify the transfer succeeded
        uint256 newBalance = IERC20(token).balanceOf(address(this));
        if (newBalance < amount) revert TransferFailed();

        emit Locked(token, amount, unlockTime);
    }

    /**
     * @notice Withdraw tokens after unlock time
     * @dev Can only be called by owner after unlockTime has passed
     */
    function withdraw() external override nonReentrant {
        if (msg.sender != owner) revert OnlyOwner();
        if (block.timestamp < unlockTime) revert NotUnlockableYet();
        if (withdrawn) revert AlreadyWithdrawn();

        withdrawn = true;

        // Transfer tokens to owner
        IERC20(token).safeTransfer(owner, amount);

        emit Withdrawn(token, amount);
    }

    /**
     * @notice Get the current status of the lock
     * @return Current lock status (LOCKED, UNLOCKABLE, or WITHDRAWN)
     */
    function getStatus() external view override returns (LockStatus) {
        if (withdrawn) {
            return LockStatus.WITHDRAWN;
        }

        if (block.timestamp >= unlockTime) {
            return LockStatus.UNLOCKABLE;
        }

        return LockStatus.LOCKED;
    }

    /**
     * @notice Get detailed information about this lock
     * @return owner_ Address of the lock owner
     * @return token_ Address of the locked token
     * @return amount_ Amount of tokens locked
     * @return unlockTime_ Timestamp when tokens can be withdrawn
     * @return withdrawn_ Whether tokens have been withdrawn
     */
    function getLockDetails() external view override returns (
        address owner_,
        address token_,
        uint256 amount_,
        uint256 unlockTime_,
        bool withdrawn_
    ) {
        return (owner, token, amount, unlockTime, withdrawn);
    }

    /**
     * @notice Get the remaining time until unlock
     * @return Time in seconds until unlock (0 if already unlockable)
     */
    function getTimeUntilUnlock() external view returns (uint256) {
        if (block.timestamp >= unlockTime) {
            return 0;
        }
        return unlockTime - block.timestamp;
    }
}

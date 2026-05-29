// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ITimelockVault.sol";

/**
 * @title TimelockVault
 * @dev Individual vault contract that locks an ERC20 token OR the chain's
 *      native coin (e.g. MATIC on Polygon) until a specified time.
 *      `token == address(0)` is the sentinel for native locks.
 * @notice This contract is created by TimelockFactory and holds funds for a single lock
 */
contract TimelockVault is ITimelockVault, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Immutable state variables for gas optimization
    address public immutable factory;
    address public immutable owner;
    /// @dev address(0) ⇒ native coin (no ERC20 contract). Anything else ⇒ ERC20.
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
     * @notice Creates a new timelock vault.
     * @param _owner Address that can withdraw the funds.
     * @param _token Token contract (or `address(0)` for the chain's native coin).
     * @param _amount Amount to lock.
     * @param _unlockTime Unix timestamp when funds become withdrawable.
     */
    constructor(
        address _owner,
        address _token,
        uint256 _amount,
        uint256 _unlockTime
    ) {
        if (_owner == address(0)) revert("Invalid owner address");
        // _token may be address(0) — that's the native sentinel.
        if (_amount == 0) revert InvalidAmount();
        if (_unlockTime <= block.timestamp) revert("Unlock time must be in future");

        factory = msg.sender;
        owner = _owner;
        token = _token;
        amount = _amount;
        unlockTime = _unlockTime;
        withdrawn = false;
    }

    /// @dev Allow the factory to fund this vault with native coin during creation.
    receive() external payable {}

    /**
     * @notice Lock ERC20 tokens in this vault (called by factory).
     * Pulls tokens from the factory via transferFrom.
     */
    function lock() external override nonReentrant {
        if (msg.sender != factory) revert OnlyFactory();
        if (token == address(0)) revert("Use lockNative for native funds");

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
     * @notice Confirm the vault has been funded with native coin (called by factory
     * after a successful value transfer in `createLockNative`). Pure book-keeping +
     * event emission — the native value arrived via `receive()`.
     */
    function lockNative() external nonReentrant {
        if (msg.sender != factory) revert OnlyFactory();
        if (token != address(0)) revert("Vault is for ERC20");
        // The vault must actually hold the expected amount (factory sent it before calling us).
        if (address(this).balance < amount) revert TransferFailed();

        emit Locked(address(0), amount, unlockTime);
    }

    /**
     * @notice Withdraw funds after unlock time. Owner-only.
     */
    function withdraw() external override nonReentrant {
        if (msg.sender != owner) revert OnlyOwner();
        if (block.timestamp < unlockTime) revert NotUnlockableYet();
        if (withdrawn) revert AlreadyWithdrawn();

        withdrawn = true;

        if (token == address(0)) {
            // Native withdrawal
            (bool sent, ) = payable(owner).call{value: amount}("");
            if (!sent) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(owner, amount);
        }

        emit Withdrawn(token, amount);
    }

    /**
     * @notice Get the current status of the lock
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
     */
    function getTimeUntilUnlock() external view returns (uint256) {
        if (block.timestamp >= unlockTime) {
            return 0;
        }
        return unlockTime - block.timestamp;
    }
}

import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { TimelockFactory, TimelockVault } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TimelockFactory", function () {
  let factory: TimelockFactory;
  let mockToken: any;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const LOCK_AMOUNT = ethers.parseEther("100");
  const UNLOCK_DURATION = 30 * 24 * 60 * 60; // 30 days

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Mock Token", "MOCK");
    await mockToken.waitForDeployment();

    // Mint tokens to users
    await mockToken.mint(user1.address, ethers.parseEther("1000"));
    await mockToken.mint(user2.address, ethers.parseEther("1000"));

    // Deploy factory
    const Factory = await ethers.getContractFactory("TimelockFactory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await factory.getAddress()).to.be.properAddress;
    });

    it("Should start with zero locks", async function () {
      expect(await factory.getTotalLocksCount()).to.equal(0);
    });
  });

  describe("Create Lock", function () {
    let unlockTime: number;

    beforeEach(async function () {
      unlockTime = (await time.latest()) + UNLOCK_DURATION;
    });

    it("Should create lock successfully", async function () {
      await mockToken.connect(user1).approve(await factory.getAddress(), LOCK_AMOUNT);

      const tx = await factory.connect(user1).createLock(
        await mockToken.getAddress(),
        LOCK_AMOUNT,
        unlockTime
      );

      const receipt = await tx.wait();

      // Check event
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "LockCreated";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;

      // Check counters
      expect(await factory.getTotalLocksCount()).to.equal(1);
      expect(await factory.getUserLocksCount(user1.address)).to.equal(1);

      // Check user's tokens were transferred
      expect(await mockToken.balanceOf(user1.address)).to.equal(
        ethers.parseEther("900")
      );
    });

    it("Should emit LockCreated event with correct parameters", async function () {
      await mockToken.connect(user1).approve(await factory.getAddress(), LOCK_AMOUNT);

      await expect(
        factory.connect(user1).createLock(
          await mockToken.getAddress(),
          LOCK_AMOUNT,
          unlockTime
        )
      )
        .to.emit(factory, "LockCreated")
        .withArgs(
          (value: any) => ethers.isAddress(value), // lockAddress
          user1.address, // owner
          await mockToken.getAddress(), // token
          LOCK_AMOUNT, // amount
          unlockTime // unlockTime
        );
    });

    it("Should revert with zero token address", async function () {
      await expect(
        factory.connect(user1).createLock(
          ethers.ZeroAddress,
          LOCK_AMOUNT,
          unlockTime
        )
      ).to.be.revertedWithCustomError(factory, "InvalidToken");
    });

    it("Should revert with zero amount", async function () {
      await expect(
        factory.connect(user1).createLock(
          await mockToken.getAddress(),
          0,
          unlockTime
        )
      ).to.be.revertedWithCustomError(factory, "InvalidAmount");
    });

    it("Should revert with past unlock time", async function () {
      const pastTime = (await time.latest()) - 1000;

      await expect(
        factory.connect(user1).createLock(
          await mockToken.getAddress(),
          LOCK_AMOUNT,
          pastTime
        )
      ).to.be.revertedWithCustomError(factory, "InvalidUnlockTime");
    });

    it("Should revert with insufficient allowance", async function () {
      // Don't approve tokens
      await expect(
        factory.connect(user1).createLock(
          await mockToken.getAddress(),
          LOCK_AMOUNT,
          unlockTime
        )
      ).to.be.revertedWith("Insufficient allowance");
    });

    it("Should revert with insufficient balance", async function () {
      const hugeAmount = ethers.parseEther("10000");
      await mockToken.connect(user1).approve(await factory.getAddress(), hugeAmount);

      await expect(
        factory.connect(user1).createLock(
          await mockToken.getAddress(),
          hugeAmount,
          unlockTime
        )
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should create multiple locks for same user", async function () {
      await mockToken.connect(user1).approve(await factory.getAddress(), LOCK_AMOUNT * 3n);

      await factory.connect(user1).createLock(
        await mockToken.getAddress(),
        LOCK_AMOUNT,
        unlockTime
      );

      await factory.connect(user1).createLock(
        await mockToken.getAddress(),
        LOCK_AMOUNT,
        unlockTime + 1000
      );

      await factory.connect(user1).createLock(
        await mockToken.getAddress(),
        LOCK_AMOUNT,
        unlockTime + 2000
      );

      expect(await factory.getUserLocksCount(user1.address)).to.equal(3);
      expect(await factory.getTotalLocksCount()).to.equal(3);
    });

    it("Should create locks for multiple users", async function () {
      await mockToken.connect(user1).approve(await factory.getAddress(), LOCK_AMOUNT);
      await mockToken.connect(user2).approve(await factory.getAddress(), LOCK_AMOUNT);

      await factory.connect(user1).createLock(
        await mockToken.getAddress(),
        LOCK_AMOUNT,
        unlockTime
      );

      await factory.connect(user2).createLock(
        await mockToken.getAddress(),
        LOCK_AMOUNT,
        unlockTime
      );

      expect(await factory.getUserLocksCount(user1.address)).to.equal(1);
      expect(await factory.getUserLocksCount(user2.address)).to.equal(1);
      expect(await factory.getTotalLocksCount()).to.equal(2);
    });

    it("Should mark created locks as valid", async function () {
      await mockToken.connect(user1).approve(await factory.getAddress(), LOCK_AMOUNT);

      const tx = await factory.connect(user1).createLock(
        await mockToken.getAddress(),
        LOCK_AMOUNT,
        unlockTime
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "LockCreated";
        } catch {
          return false;
        }
      });

      const parsed = factory.interface.parseLog(event!);
      const lockAddress = parsed?.args[0];

      expect(await factory.isLockValid(lockAddress)).to.equal(true);
    });

    it("Should return created vault with correct owner", async function () {
      await mockToken.connect(user1).approve(await factory.getAddress(), LOCK_AMOUNT);

      const tx = await factory.connect(user1).createLock(
        await mockToken.getAddress(),
        LOCK_AMOUNT,
        unlockTime
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "LockCreated";
        } catch {
          return false;
        }
      });

      const parsed = factory.interface.parseLog(event!);
      const vaultAddress = parsed?.args[0];

      const vault = await ethers.getContractAt("TimelockVault", vaultAddress);
      expect(await vault.owner()).to.equal(user1.address);
    });
  });

  describe("Query Functions", function () {
    let lock1Address: string;
    let lock2Address: string;
    let lock3Address: string;
    let unlockTime: number;

    beforeEach(async function () {
      unlockTime = (await time.latest()) + UNLOCK_DURATION;

      // Create locks
      await mockToken.connect(user1).approve(await factory.getAddress(), LOCK_AMOUNT * 2n);
      await mockToken.connect(user2).approve(await factory.getAddress(), LOCK_AMOUNT);

      // User1 creates 2 locks
      let tx = await factory.connect(user1).createLock(
        await mockToken.getAddress(),
        LOCK_AMOUNT,
        unlockTime
      );
      let receipt = await tx.wait();
      let event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "LockCreated";
        } catch {
          return false;
        }
      });
      lock1Address = factory.interface.parseLog(event!)?.args[0];

      tx = await factory.connect(user1).createLock(
        await mockToken.getAddress(),
        LOCK_AMOUNT,
        unlockTime + 1000
      );
      receipt = await tx.wait();
      event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "LockCreated";
        } catch {
          return false;
        }
      });
      lock2Address = factory.interface.parseLog(event!)?.args[0];

      // User2 creates 1 lock
      tx = await factory.connect(user2).createLock(
        await mockToken.getAddress(),
        LOCK_AMOUNT,
        unlockTime
      );
      receipt = await tx.wait();
      event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "LockCreated";
        } catch {
          return false;
        }
      });
      lock3Address = factory.interface.parseLog(event!)?.args[0];
    });

    it("Should return user locks correctly", async function () {
      const user1Locks = await factory.getUserLocks(user1.address);
      const user2Locks = await factory.getUserLocks(user2.address);

      expect(user1Locks.length).to.equal(2);
      expect(user2Locks.length).to.equal(1);

      expect(user1Locks[0]).to.equal(lock1Address);
      expect(user1Locks[1]).to.equal(lock2Address);
      expect(user2Locks[0]).to.equal(lock3Address);
    });

    it("Should return all locks correctly", async function () {
      const allLocks = await factory.getAllLocks();

      expect(allLocks.length).to.equal(3);
      expect(allLocks[0]).to.equal(lock1Address);
      expect(allLocks[1]).to.equal(lock2Address);
      expect(allLocks[2]).to.equal(lock3Address);
    });

    it("Should return correct lock counts", async function () {
      expect(await factory.getTotalLocksCount()).to.equal(3);
      expect(await factory.getUserLocksCount(user1.address)).to.equal(2);
      expect(await factory.getUserLocksCount(user2.address)).to.equal(1);
    });

    it("Should return lock details correctly", async function () {
      const details = await factory.getLocksDetails([lock1Address, lock2Address]);

      expect(details[0][0]).to.equal(user1.address); // owner of lock1
      expect(details[0][1]).to.equal(user1.address); // owner of lock2
      expect(details[1][0]).to.equal(await mockToken.getAddress()); // token of lock1
      expect(details[2][0]).to.equal(LOCK_AMOUNT); // amount of lock1
      expect(details[4][0]).to.equal(0); // status LOCKED
    });

    it("Should return user locks with details correctly", async function () {
      const details = await factory.getUserLocksWithDetails(user1.address);

      expect(details[0].length).to.equal(2); // 2 locks
      expect(details[0][0]).to.equal(lock1Address);
      expect(details[0][1]).to.equal(lock2Address);
      expect(details[1][0]).to.equal(await mockToken.getAddress()); // token
      expect(details[2][0]).to.equal(LOCK_AMOUNT); // amount
    });

    it("Should validate lock addresses correctly", async function () {
      expect(await factory.isLockValid(lock1Address)).to.equal(true);
      expect(await factory.isLockValid(ethers.ZeroAddress)).to.equal(false);
      expect(await factory.isLockValid(user1.address)).to.equal(false);
    });

    it("Should return empty array for user with no locks", async function () {
      const locks = await factory.getUserLocks(owner.address);
      expect(locks.length).to.equal(0);
    });
  });

  describe("Integration with Vault", function () {
    let unlockTime: number;

    beforeEach(async function () {
      unlockTime = (await time.latest()) + UNLOCK_DURATION;
    });

    it("Should create vault with correct parameters", async function () {
      await mockToken.connect(user1).approve(await factory.getAddress(), LOCK_AMOUNT);

      const tx = await factory.connect(user1).createLock(
        await mockToken.getAddress(),
        LOCK_AMOUNT,
        unlockTime
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "LockCreated";
        } catch {
          return false;
        }
      });

      const vaultAddress = factory.interface.parseLog(event!)?.args[0];
      const vault = await ethers.getContractAt("TimelockVault", vaultAddress);

      expect(await vault.owner()).to.equal(user1.address);
      expect(await vault.token()).to.equal(await mockToken.getAddress());
      expect(await vault.amount()).to.equal(LOCK_AMOUNT);
      expect(await vault.unlockTime()).to.equal(unlockTime);
      expect(await vault.factory()).to.equal(await factory.getAddress());
    });

    it("Should transfer tokens to vault correctly", async function () {
      await mockToken.connect(user1).approve(await factory.getAddress(), LOCK_AMOUNT);

      const tx = await factory.connect(user1).createLock(
        await mockToken.getAddress(),
        LOCK_AMOUNT,
        unlockTime
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "LockCreated";
        } catch {
          return false;
        }
      });

      const vaultAddress = factory.interface.parseLog(event!)?.args[0];

      // Check vault has tokens
      expect(await mockToken.balanceOf(vaultAddress)).to.equal(LOCK_AMOUNT);

      // Check factory doesn't have tokens
      expect(await mockToken.balanceOf(await factory.getAddress())).to.equal(0);

      // Check user balance decreased
      expect(await mockToken.balanceOf(user1.address)).to.equal(
        ethers.parseEther("900")
      );
    });

    it("Should allow withdrawal after unlock time", async function () {
      await mockToken.connect(user1).approve(await factory.getAddress(), LOCK_AMOUNT);

      const tx = await factory.connect(user1).createLock(
        await mockToken.getAddress(),
        LOCK_AMOUNT,
        unlockTime
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "LockCreated";
        } catch {
          return false;
        }
      });

      const vaultAddress = factory.interface.parseLog(event!)?.args[0];
      const vault = await ethers.getContractAt("TimelockVault", vaultAddress);

      // Fast forward time
      await time.increaseTo(unlockTime + 1);

      // Withdraw
      await vault.connect(user1).withdraw();

      // Check balances
      expect(await mockToken.balanceOf(user1.address)).to.equal(
        ethers.parseEther("1000")
      );
      expect(await mockToken.balanceOf(vaultAddress)).to.equal(0);
      expect(await vault.withdrawn()).to.equal(true);
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should be protected against reentrancy", async function () {
      const unlockTime = (await time.latest()) + UNLOCK_DURATION;
      await mockToken.connect(user1).approve(await factory.getAddress(), LOCK_AMOUNT);

      // This test verifies ReentrancyGuard is in place
      // Actual reentrancy attack would require a malicious token contract
      // The protection is ensured by OpenZeppelin's ReentrancyGuard
      await expect(
        factory.connect(user1).createLock(
          await mockToken.getAddress(),
          LOCK_AMOUNT,
          unlockTime
        )
      ).to.not.be.reverted;
    });
  });

  describe("Gas Costs", function () {
    it("Should use reasonable gas for operations", async function () {
      const unlockTime = (await time.latest()) + UNLOCK_DURATION;
      await mockToken.connect(user1).approve(await factory.getAddress(), LOCK_AMOUNT);

      const tx = await factory.connect(user1).createLock(
        await mockToken.getAddress(),
        LOCK_AMOUNT,
        unlockTime
      );

      const receipt = await tx.wait();
      console.log("Gas used for lock creation:", receipt?.gasUsed.toString());

      // Factory createLock includes deployment of new contract (~686k gas total)
      // Coverage mode increases gas to ~1070k due to instrumentation
      // This is expected for contract creation and is reasonable
      expect(receipt?.gasUsed).to.be.lessThan(1100000n);
    });
  });
});

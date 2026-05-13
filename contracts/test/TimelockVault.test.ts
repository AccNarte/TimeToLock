import { expect } from "chai";
import { ethers } from "hardhat";
import { time, setBalance } from "@nomicfoundation/hardhat-network-helpers";
import { TimelockVault, TimelockFactory } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TimelockVault", function () {
  let factory: TimelockFactory;
  let vault: TimelockVault;
  let mockToken: any;
  let owner: SignerWithAddress;
  let otherUser: SignerWithAddress;
  let factoryAddress: SignerWithAddress;

  const LOCK_AMOUNT = ethers.parseEther("100");
  const UNLOCK_DURATION = 30 * 24 * 60 * 60; // 30 days

  beforeEach(async function () {
    [owner, otherUser, factoryAddress] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Mock Token", "MOCK");
    await mockToken.waitForDeployment();

    // Mint tokens to owner
    await mockToken.mint(owner.address, ethers.parseEther("1000"));

    // Deploy factory
    const Factory = await ethers.getContractFactory("TimelockFactory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct parameters", async function () {
      const unlockTime = (await time.latest()) + UNLOCK_DURATION;

      const Vault = await ethers.getContractFactory("TimelockVault");
      vault = await Vault.deploy(
        owner.address,
        await mockToken.getAddress(),
        LOCK_AMOUNT,
        unlockTime
      );

      expect(await vault.owner()).to.equal(owner.address);
      expect(await vault.token()).to.equal(await mockToken.getAddress());
      expect(await vault.amount()).to.equal(LOCK_AMOUNT);
      expect(await vault.unlockTime()).to.equal(unlockTime);
      expect(await vault.withdrawn()).to.equal(false);
    });

    it("Should revert with zero owner address", async function () {
      const unlockTime = (await time.latest()) + UNLOCK_DURATION;
      const Vault = await ethers.getContractFactory("TimelockVault");

      await expect(
        Vault.deploy(
          ethers.ZeroAddress,
          await mockToken.getAddress(),
          LOCK_AMOUNT,
          unlockTime
        )
      ).to.be.revertedWith("Invalid owner address");
    });

    it("Should revert with zero token address", async function () {
      const unlockTime = (await time.latest()) + UNLOCK_DURATION;
      const Vault = await ethers.getContractFactory("TimelockVault");

      await expect(
        Vault.deploy(
          owner.address,
          ethers.ZeroAddress,
          LOCK_AMOUNT,
          unlockTime
        )
      ).to.be.revertedWith("Invalid token address");
    });

    it("Should revert with zero amount", async function () {
      const unlockTime = (await time.latest()) + UNLOCK_DURATION;
      const Vault = await ethers.getContractFactory("TimelockVault");

      await expect(
        Vault.deploy(
          owner.address,
          await mockToken.getAddress(),
          0,
          unlockTime
        )
      ).to.be.revertedWithCustomError(Vault, "InvalidAmount");
    });

    it("Should revert with past unlock time", async function () {
      const pastTime = (await time.latest()) - 1000;
      const Vault = await ethers.getContractFactory("TimelockVault");

      await expect(
        Vault.deploy(
          owner.address,
          await mockToken.getAddress(),
          LOCK_AMOUNT,
          pastTime
        )
      ).to.be.revertedWith("Unlock time must be in future");
    });
  });

  describe("Lock Function", function () {
    let unlockTime: number;

    beforeEach(async function () {
      unlockTime = (await time.latest()) + UNLOCK_DURATION;
    });

    it("Should lock tokens successfully via factory", async function () {
      // Approve tokens
      await mockToken.connect(owner).approve(await factory.getAddress(), LOCK_AMOUNT);

      // Create lock via factory
      const tx = await factory.connect(owner).createLock(
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

      vault = await ethers.getContractAt("TimelockVault", vaultAddress);

      // Check vault has tokens
      expect(await mockToken.balanceOf(vaultAddress)).to.equal(LOCK_AMOUNT);
      expect(await vault.getStatus()).to.equal(0); // LOCKED
    });

    it("Should revert if called by non-factory", async function () {
      // Deploy vault from factoryAddress so owner is NOT the factory
      const Vault = await ethers.getContractFactory("TimelockVault");
      vault = await Vault.connect(factoryAddress).deploy(
        owner.address,
        await mockToken.getAddress(),
        LOCK_AMOUNT,
        unlockTime
      );

      // Try to call lock from owner (non-factory address) - should fail
      await expect(
        vault.connect(owner).lock()
      ).to.be.revertedWithCustomError(vault, "OnlyFactory");

      // Even from another random user should fail
      await expect(
        vault.connect(otherUser).lock()
      ).to.be.revertedWithCustomError(vault, "OnlyFactory");
    });

    it("Should revert if already locked", async function () {
      // Create first lock
      await mockToken.connect(owner).approve(await factory.getAddress(), LOCK_AMOUNT * 2n);
      const tx = await factory.connect(owner).createLock(
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
      vault = await ethers.getContractAt("TimelockVault", vaultAddress);

      // Get factory address and impersonate it
      const factoryAddr = await vault.factory();
      const factorySigner = await ethers.getImpersonatedSigner(factoryAddr);

      // Fund the impersonated signer with ETH
      await setBalance(factoryAddr, ethers.parseEther("10"));

      // This should fail because vault already has balance
      await expect(
        vault.connect(factorySigner).lock()
      ).to.be.revertedWithCustomError(vault, "AlreadyLocked");
    });

    it("Should emit Locked event", async function () {
      await mockToken.connect(owner).approve(await factory.getAddress(), LOCK_AMOUNT);

      const tx = await factory.connect(owner).createLock(
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

      expect(event).to.not.be.undefined;
    });
  });

  describe("Withdraw Function", function () {
    let unlockTime: number;

    beforeEach(async function () {
      unlockTime = (await time.latest()) + UNLOCK_DURATION;

      // Create a lock
      await mockToken.connect(owner).approve(await factory.getAddress(), LOCK_AMOUNT);
      const tx = await factory.connect(owner).createLock(
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
      vault = await ethers.getContractAt("TimelockVault", vaultAddress);
    });

    it("Should withdraw successfully after unlock time", async function () {
      // Fast forward time
      await time.increaseTo(unlockTime + 1);

      const balanceBefore = await mockToken.balanceOf(owner.address);
      await vault.connect(owner).withdraw();
      const balanceAfter = await mockToken.balanceOf(owner.address);

      expect(balanceAfter - balanceBefore).to.equal(LOCK_AMOUNT);
      expect(await vault.withdrawn()).to.equal(true);
      expect(await vault.getStatus()).to.equal(2); // WITHDRAWN
    });

    it("Should revert if called before unlock time", async function () {
      await expect(
        vault.connect(owner).withdraw()
      ).to.be.revertedWithCustomError(vault, "NotUnlockableYet");
    });

    it("Should revert if called by non-owner", async function () {
      await time.increaseTo(unlockTime + 1);

      await expect(
        vault.connect(otherUser).withdraw()
      ).to.be.revertedWithCustomError(vault, "OnlyOwner");
    });

    it("Should revert if already withdrawn", async function () {
      await time.increaseTo(unlockTime + 1);

      await vault.connect(owner).withdraw();

      await expect(
        vault.connect(owner).withdraw()
      ).to.be.revertedWithCustomError(vault, "AlreadyWithdrawn");
    });

    it("Should emit Withdrawn event", async function () {
      await time.increaseTo(unlockTime + 1);

      await expect(vault.connect(owner).withdraw())
        .to.emit(vault, "Withdrawn")
        .withArgs(await mockToken.getAddress(), LOCK_AMOUNT);
    });
  });

  describe("Status and Details", function () {
    let unlockTime: number;

    beforeEach(async function () {
      unlockTime = (await time.latest()) + UNLOCK_DURATION;

      await mockToken.connect(owner).approve(await factory.getAddress(), LOCK_AMOUNT);
      const tx = await factory.connect(owner).createLock(
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
      vault = await ethers.getContractAt("TimelockVault", vaultAddress);
    });

    it("Should return LOCKED status before unlock time", async function () {
      expect(await vault.getStatus()).to.equal(0); // LOCKED
    });

    it("Should return UNLOCKABLE status after unlock time", async function () {
      await time.increaseTo(unlockTime + 1);
      expect(await vault.getStatus()).to.equal(1); // UNLOCKABLE
    });

    it("Should return WITHDRAWN status after withdrawal", async function () {
      await time.increaseTo(unlockTime + 1);
      await vault.connect(owner).withdraw();
      expect(await vault.getStatus()).to.equal(2); // WITHDRAWN
    });

    it("Should return correct lock details", async function () {
      const details = await vault.getLockDetails();

      expect(details[0]).to.equal(owner.address);
      expect(details[1]).to.equal(await mockToken.getAddress());
      expect(details[2]).to.equal(LOCK_AMOUNT);
      expect(details[3]).to.equal(unlockTime);
      expect(details[4]).to.equal(false);
    });

    it("Should return correct time until unlock", async function () {
      const timeUntilUnlock = await vault.getTimeUntilUnlock();
      expect(timeUntilUnlock).to.be.closeTo(BigInt(UNLOCK_DURATION), 10n);
    });

    it("Should return 0 time until unlock after unlock time", async function () {
      await time.increaseTo(unlockTime + 1);
      expect(await vault.getTimeUntilUnlock()).to.equal(0);
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for lock creation", async function () {
      const unlockTime = (await time.latest()) + UNLOCK_DURATION;
      await mockToken.connect(owner).approve(await factory.getAddress(), LOCK_AMOUNT);

      const tx = await factory.connect(owner).createLock(
        await mockToken.getAddress(),
        LOCK_AMOUNT,
        unlockTime
      );

      const receipt = await tx.wait();
      console.log("Gas used for lock creation:", receipt?.gasUsed.toString());

      // Creating new contract via factory costs ~686k gas (includes deployment)
      // Coverage mode increases gas to ~1070k due to instrumentation
      // This is expected and reasonable for contract creation
      expect(receipt?.gasUsed).to.be.lessThan(1100000n);
    });
  });
});

// Mock ERC20 contract for testing
// Create this in a separate file: contracts/MockERC20.sol

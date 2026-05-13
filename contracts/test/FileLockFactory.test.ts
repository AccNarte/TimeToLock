import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { FileLockFactory, FileLockVault } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("FileLockFactory", function () {
  let factory: FileLockFactory;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const SAMPLE_IPFS_HASH = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
  const SAMPLE_ENCRYPTED_KEY = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const UNLOCK_DURATION = 30 * 24 * 60 * 60; // 30 days

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy factory
    const Factory = await ethers.getContractFactory("FileLockFactory");
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

  describe("Create File Lock", function () {
    let unlockTime: number;

    beforeEach(async function () {
      unlockTime = (await time.latest()) + UNLOCK_DURATION;
    });

    it("Should create file lock successfully", async function () {
      const tx = await factory.connect(user1).createFileLock(
        SAMPLE_IPFS_HASH,
        SAMPLE_ENCRYPTED_KEY,
        unlockTime
      );

      const receipt = await tx.wait();

      // Check event
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "FileLockCreated";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;

      // Check counters
      expect(await factory.getTotalLocksCount()).to.equal(1);
      expect(await factory.getUserLocksCount(user1.address)).to.equal(1);
    });

    it("Should emit FileLockCreated event with correct parameters", async function () {
      await expect(
        factory.connect(user1).createFileLock(
          SAMPLE_IPFS_HASH,
          SAMPLE_ENCRYPTED_KEY,
          unlockTime
        )
      )
        .to.emit(factory, "FileLockCreated")
        .withArgs(
          (value: any) => ethers.isAddress(value), // lockAddress
          user1.address, // owner
          SAMPLE_IPFS_HASH, // ipfsHash
          unlockTime // unlockTime
        );
    });

    it("Should revert with empty IPFS hash", async function () {
      await expect(
        factory.connect(user1).createFileLock(
          "",
          SAMPLE_ENCRYPTED_KEY,
          unlockTime
        )
      ).to.be.revertedWithCustomError(factory, "InvalidIpfsHash");
    });

    it("Should revert with empty encryption key", async function () {
      await expect(
        factory.connect(user1).createFileLock(
          SAMPLE_IPFS_HASH,
          "0x",
          unlockTime
        )
      ).to.be.revertedWithCustomError(factory, "InvalidEncryptionKey");
    });

    it("Should revert with past unlock time", async function () {
      const pastTime = (await time.latest()) - 1000;

      await expect(
        factory.connect(user1).createFileLock(
          SAMPLE_IPFS_HASH,
          SAMPLE_ENCRYPTED_KEY,
          pastTime
        )
      ).to.be.revertedWithCustomError(factory, "InvalidUnlockTime");
    });

    it("Should create multiple locks for same user", async function () {
      await factory.connect(user1).createFileLock(
        SAMPLE_IPFS_HASH,
        SAMPLE_ENCRYPTED_KEY,
        unlockTime
      );

      await factory.connect(user1).createFileLock(
        "QmDifferentHash123456789",
        SAMPLE_ENCRYPTED_KEY,
        unlockTime + 1000
      );

      await factory.connect(user1).createFileLock(
        "QmAnotherHash987654321",
        SAMPLE_ENCRYPTED_KEY,
        unlockTime + 2000
      );

      expect(await factory.getUserLocksCount(user1.address)).to.equal(3);
      expect(await factory.getTotalLocksCount()).to.equal(3);
    });

    it("Should create locks for multiple users", async function () {
      await factory.connect(user1).createFileLock(
        SAMPLE_IPFS_HASH,
        SAMPLE_ENCRYPTED_KEY,
        unlockTime
      );

      await factory.connect(user2).createFileLock(
        "QmDifferentHash123456789",
        SAMPLE_ENCRYPTED_KEY,
        unlockTime
      );

      expect(await factory.getUserLocksCount(user1.address)).to.equal(1);
      expect(await factory.getUserLocksCount(user2.address)).to.equal(1);
      expect(await factory.getTotalLocksCount()).to.equal(2);
    });

    it("Should mark created locks as valid", async function () {
      const tx = await factory.connect(user1).createFileLock(
        SAMPLE_IPFS_HASH,
        SAMPLE_ENCRYPTED_KEY,
        unlockTime
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "FileLockCreated";
        } catch {
          return false;
        }
      });

      const parsed = factory.interface.parseLog(event!);
      const lockAddress = parsed?.args[0];

      expect(await factory.isLockValid(lockAddress)).to.equal(true);
    });

    it("Should return created vault with correct owner", async function () {
      const tx = await factory.connect(user1).createFileLock(
        SAMPLE_IPFS_HASH,
        SAMPLE_ENCRYPTED_KEY,
        unlockTime
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "FileLockCreated";
        } catch {
          return false;
        }
      });

      const parsed = factory.interface.parseLog(event!);
      const vaultAddress = parsed?.args[0];

      const vault = await ethers.getContractAt("FileLockVault", vaultAddress);
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

      // User1 creates 2 locks
      let tx = await factory.connect(user1).createFileLock(
        SAMPLE_IPFS_HASH,
        SAMPLE_ENCRYPTED_KEY,
        unlockTime
      );
      let receipt = await tx.wait();
      let event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "FileLockCreated";
        } catch {
          return false;
        }
      });
      lock1Address = factory.interface.parseLog(event!)?.args[0];

      tx = await factory.connect(user1).createFileLock(
        "QmSecondFileHash123456789",
        SAMPLE_ENCRYPTED_KEY,
        unlockTime + 1000
      );
      receipt = await tx.wait();
      event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "FileLockCreated";
        } catch {
          return false;
        }
      });
      lock2Address = factory.interface.parseLog(event!)?.args[0];

      // User2 creates 1 lock
      tx = await factory.connect(user2).createFileLock(
        "QmThirdFileHash987654321",
        SAMPLE_ENCRYPTED_KEY,
        unlockTime
      );
      receipt = await tx.wait();
      event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "FileLockCreated";
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

    it("Should return user locks with details correctly", async function () {
      const details = await factory.getUserLocksWithDetails(user1.address);

      expect(details[0].length).to.equal(2); // 2 locks
      expect(details[0][0]).to.equal(lock1Address);
      expect(details[0][1]).to.equal(lock2Address);
      expect(details[1][0]).to.equal(SAMPLE_IPFS_HASH); // ipfsHash
      expect(details[3][0]).to.equal(0); // status LOCKED
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
      const tx = await factory.connect(user1).createFileLock(
        SAMPLE_IPFS_HASH,
        SAMPLE_ENCRYPTED_KEY,
        unlockTime
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "FileLockCreated";
        } catch {
          return false;
        }
      });

      const vaultAddress = factory.interface.parseLog(event!)?.args[0];
      const vault = await ethers.getContractAt("FileLockVault", vaultAddress);

      expect(await vault.owner()).to.equal(user1.address);
      expect(await vault.ipfsHash()).to.equal(SAMPLE_IPFS_HASH);
      expect(await vault.unlockTime()).to.equal(unlockTime);
      expect(await vault.factory()).to.equal(await factory.getAddress());
    });

    it("Should allow key retrieval after unlock time", async function () {
      const tx = await factory.connect(user1).createFileLock(
        SAMPLE_IPFS_HASH,
        SAMPLE_ENCRYPTED_KEY,
        unlockTime
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "FileLockCreated";
        } catch {
          return false;
        }
      });

      const vaultAddress = factory.interface.parseLog(event!)?.args[0];
      const vault = await ethers.getContractAt("FileLockVault", vaultAddress);

      // Fast forward time
      await time.increaseTo(unlockTime + 1);

      // Get status before retrieval
      expect(await vault.getStatus()).to.equal(1); // UNLOCKABLE

      // Retrieve key
      await vault.connect(user1).retrieveKey();

      // Check status after retrieval
      expect(await vault.keyRetrieved()).to.equal(true);
      expect(await vault.getStatus()).to.equal(2); // UNLOCKED
    });

    it("Should prevent key retrieval before unlock time", async function () {
      const tx = await factory.connect(user1).createFileLock(
        SAMPLE_IPFS_HASH,
        SAMPLE_ENCRYPTED_KEY,
        unlockTime
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "FileLockCreated";
        } catch {
          return false;
        }
      });

      const vaultAddress = factory.interface.parseLog(event!)?.args[0];
      const vault = await ethers.getContractAt("FileLockVault", vaultAddress);

      // Try to retrieve key before unlock time
      await expect(vault.connect(user1).retrieveKey())
        .to.be.revertedWithCustomError(vault, "NotUnlockableYet");
    });

    it("Should prevent non-owner from retrieving key", async function () {
      const tx = await factory.connect(user1).createFileLock(
        SAMPLE_IPFS_HASH,
        SAMPLE_ENCRYPTED_KEY,
        unlockTime
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "FileLockCreated";
        } catch {
          return false;
        }
      });

      const vaultAddress = factory.interface.parseLog(event!)?.args[0];
      const vault = await ethers.getContractAt("FileLockVault", vaultAddress);

      // Fast forward time
      await time.increaseTo(unlockTime + 1);

      // Try to retrieve key as non-owner
      await expect(vault.connect(user2).retrieveKey())
        .to.be.revertedWithCustomError(vault, "OnlyOwner");
    });
  });

  describe("Gas Costs", function () {
    it("Should use reasonable gas for file lock creation", async function () {
      const unlockTime = (await time.latest()) + UNLOCK_DURATION;

      const tx = await factory.connect(user1).createFileLock(
        SAMPLE_IPFS_HASH,
        SAMPLE_ENCRYPTED_KEY,
        unlockTime
      );

      const receipt = await tx.wait();
      console.log("Gas used for file lock creation:", receipt?.gasUsed.toString());

      // File lock creation should use less gas than crypto lock (no token transfer)
      expect(receipt?.gasUsed).to.be.lessThan(800000n);
    });
  });
});

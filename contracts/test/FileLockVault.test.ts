import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { FileLockVault } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("FileLockVault", function () {
  let vault: FileLockVault;
  let factory: SignerWithAddress; // Simulating factory as the deployer
  let owner: SignerWithAddress;
  let otherUser: SignerWithAddress;

  const SAMPLE_IPFS_HASH = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
  const SAMPLE_ENCRYPTED_KEY = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const UNLOCK_DURATION = 30 * 24 * 60 * 60; // 30 days

  beforeEach(async function () {
    [factory, owner, otherUser] = await ethers.getSigners();

    const unlockTime = (await time.latest()) + UNLOCK_DURATION;

    // Deploy vault directly (simulating factory deployment)
    const Vault = await ethers.getContractFactory("FileLockVault");
    vault = await Vault.connect(factory).deploy(
      owner.address,
      SAMPLE_IPFS_HASH,
      SAMPLE_ENCRYPTED_KEY,
      unlockTime
    );
    await vault.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set correct owner", async function () {
      expect(await vault.owner()).to.equal(owner.address);
    });

    it("Should set correct factory", async function () {
      expect(await vault.factory()).to.equal(factory.address);
    });

    it("Should set correct IPFS hash", async function () {
      expect(await vault.ipfsHash()).to.equal(SAMPLE_IPFS_HASH);
    });

    it("Should store encrypted key", async function () {
      const storedKey = await vault.encryptedKey();
      expect(storedKey).to.equal(SAMPLE_ENCRYPTED_KEY);
    });

    it("Should set correct unlock time", async function () {
      const unlockTime = await vault.unlockTime();
      expect(unlockTime).to.be.greaterThan(await time.latest());
    });

    it("Should start with keyRetrieved as false", async function () {
      expect(await vault.keyRetrieved()).to.equal(false);
    });

    it("Should emit FileLocked event on deployment", async function () {
      const unlockTime = (await time.latest()) + UNLOCK_DURATION;

      const Vault = await ethers.getContractFactory("FileLockVault");
      await expect(
        Vault.connect(factory).deploy(
          owner.address,
          SAMPLE_IPFS_HASH,
          SAMPLE_ENCRYPTED_KEY,
          unlockTime
        )
      ).to.emit(Vault, "FileLocked");
    });

    it("Should revert with zero address owner", async function () {
      const unlockTime = (await time.latest()) + UNLOCK_DURATION;

      const Vault = await ethers.getContractFactory("FileLockVault");
      await expect(
        Vault.deploy(
          ethers.ZeroAddress,
          SAMPLE_IPFS_HASH,
          SAMPLE_ENCRYPTED_KEY,
          unlockTime
        )
      ).to.be.revertedWithCustomError(Vault, "InvalidOwner");
    });

    it("Should revert with empty IPFS hash", async function () {
      const unlockTime = (await time.latest()) + UNLOCK_DURATION;

      const Vault = await ethers.getContractFactory("FileLockVault");
      await expect(
        Vault.deploy(
          owner.address,
          "",
          SAMPLE_ENCRYPTED_KEY,
          unlockTime
        )
      ).to.be.revertedWithCustomError(Vault, "InvalidIpfsHash");
    });

    it("Should revert with empty encryption key", async function () {
      const unlockTime = (await time.latest()) + UNLOCK_DURATION;

      const Vault = await ethers.getContractFactory("FileLockVault");
      await expect(
        Vault.deploy(
          owner.address,
          SAMPLE_IPFS_HASH,
          "0x",
          unlockTime
        )
      ).to.be.revertedWithCustomError(Vault, "InvalidEncryptionKey");
    });

    it("Should revert with past unlock time", async function () {
      const pastTime = (await time.latest()) - 1000;

      const Vault = await ethers.getContractFactory("FileLockVault");
      await expect(
        Vault.deploy(
          owner.address,
          SAMPLE_IPFS_HASH,
          SAMPLE_ENCRYPTED_KEY,
          pastTime
        )
      ).to.be.revertedWithCustomError(Vault, "InvalidUnlockTime");
    });
  });

  describe("getStatus", function () {
    it("Should return LOCKED before unlock time", async function () {
      expect(await vault.getStatus()).to.equal(0); // LOCKED
    });

    it("Should return UNLOCKABLE after unlock time", async function () {
      const unlockTime = await vault.unlockTime();
      await time.increaseTo(unlockTime + 1n);

      expect(await vault.getStatus()).to.equal(1); // UNLOCKABLE
    });

    it("Should return UNLOCKED after key is retrieved", async function () {
      const unlockTime = await vault.unlockTime();
      await time.increaseTo(unlockTime + 1n);

      await vault.connect(owner).retrieveKey();

      expect(await vault.getStatus()).to.equal(2); // UNLOCKED
    });
  });

  describe("getEncryptionKey (view)", function () {
    it("Should revert if called by non-owner", async function () {
      const unlockTime = await vault.unlockTime();
      await time.increaseTo(unlockTime + 1n);

      await expect(vault.connect(otherUser).getEncryptionKey())
        .to.be.revertedWithCustomError(vault, "OnlyOwner");
    });

    it("Should revert if called before unlock time", async function () {
      await expect(vault.connect(owner).getEncryptionKey())
        .to.be.revertedWithCustomError(vault, "NotUnlockableYet");
    });

    it("Should return encryption key after unlock time", async function () {
      const unlockTime = await vault.unlockTime();
      await time.increaseTo(unlockTime + 1n);

      const key = await vault.connect(owner).getEncryptionKey();
      expect(key).to.equal(SAMPLE_ENCRYPTED_KEY);
    });

    it("Should not change keyRetrieved state (view function)", async function () {
      const unlockTime = await vault.unlockTime();
      await time.increaseTo(unlockTime + 1n);

      await vault.connect(owner).getEncryptionKey();
      expect(await vault.keyRetrieved()).to.equal(false);
    });
  });

  describe("retrieveKey", function () {
    it("Should revert if called by non-owner", async function () {
      const unlockTime = await vault.unlockTime();
      await time.increaseTo(unlockTime + 1n);

      await expect(vault.connect(otherUser).retrieveKey())
        .to.be.revertedWithCustomError(vault, "OnlyOwner");
    });

    it("Should revert if called before unlock time", async function () {
      await expect(vault.connect(owner).retrieveKey())
        .to.be.revertedWithCustomError(vault, "NotUnlockableYet");
    });

    it("Should return encryption key and mark as retrieved", async function () {
      const unlockTime = await vault.unlockTime();
      await time.increaseTo(unlockTime + 1n);

      const tx = await vault.connect(owner).retrieveKey();
      await tx.wait();

      expect(await vault.keyRetrieved()).to.equal(true);
    });

    it("Should emit KeyRetrieved event", async function () {
      const unlockTime = await vault.unlockTime();
      await time.increaseTo(unlockTime + 1n);

      await expect(vault.connect(owner).retrieveKey())
        .to.emit(vault, "KeyRetrieved")
        .withArgs(owner.address, (value: any) => value > 0);
    });

    it("Should only emit KeyRetrieved event once", async function () {
      const unlockTime = await vault.unlockTime();
      await time.increaseTo(unlockTime + 1n);

      // First retrieval - should emit event
      await expect(vault.connect(owner).retrieveKey())
        .to.emit(vault, "KeyRetrieved");

      // Second retrieval - should NOT emit event
      await expect(vault.connect(owner).retrieveKey())
        .to.not.emit(vault, "KeyRetrieved");
    });

    it("Should allow multiple calls after first retrieval", async function () {
      const unlockTime = await vault.unlockTime();
      await time.increaseTo(unlockTime + 1n);

      await vault.connect(owner).retrieveKey();

      // Should not revert on second call
      await expect(vault.connect(owner).retrieveKey()).to.not.be.reverted;
    });
  });

  describe("getLockDetails", function () {
    it("Should return correct lock details", async function () {
      const [returnedOwner, returnedIpfsHash, returnedUnlockTime, returnedKeyRetrieved] =
        await vault.getLockDetails();

      expect(returnedOwner).to.equal(owner.address);
      expect(returnedIpfsHash).to.equal(SAMPLE_IPFS_HASH);
      expect(returnedUnlockTime).to.equal(await vault.unlockTime());
      expect(returnedKeyRetrieved).to.equal(false);
    });

    it("Should reflect keyRetrieved state change", async function () {
      const unlockTime = await vault.unlockTime();
      await time.increaseTo(unlockTime + 1n);

      await vault.connect(owner).retrieveKey();

      const [, , , returnedKeyRetrieved] = await vault.getLockDetails();
      expect(returnedKeyRetrieved).to.equal(true);
    });
  });

  describe("getTimeUntilUnlock", function () {
    it("Should return remaining time before unlock", async function () {
      const remaining = await vault.getTimeUntilUnlock();
      expect(remaining).to.be.greaterThan(0);
    });

    it("Should return 0 after unlock time", async function () {
      const unlockTime = await vault.unlockTime();
      await time.increaseTo(unlockTime + 1n);

      expect(await vault.getTimeUntilUnlock()).to.equal(0);
    });

    it("Should decrease over time", async function () {
      const remaining1 = await vault.getTimeUntilUnlock();

      await time.increase(1000);

      const remaining2 = await vault.getTimeUntilUnlock();
      expect(remaining2).to.be.lessThan(remaining1);
    });
  });

  describe("getIpfsUrl", function () {
    it("Should return correct IPFS URL", async function () {
      const url = await vault.getIpfsUrl();
      expect(url).to.equal(`ipfs://${SAMPLE_IPFS_HASH}`);
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for key retrieval", async function () {
      const unlockTime = await vault.unlockTime();
      await time.increaseTo(unlockTime + 1n);

      const tx = await vault.connect(owner).retrieveKey();
      const receipt = await tx.wait();

      console.log("Gas used for key retrieval:", receipt?.gasUsed.toString());

      // Key retrieval should be very cheap
      expect(receipt?.gasUsed).to.be.lessThan(100000n);
    });
  });
});

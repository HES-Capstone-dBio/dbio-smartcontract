const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const { DBioMinter } = require('../lib')

async function deploy() {
  const [minter, redeemer, _] = await ethers.getSigners()

  let factory = await ethers.getContractFactory("DBioContract1155", minter)
  const contract = await factory.deploy(minter.address)

  return {
    minter,
    redeemer,
    contract
  }
}

describe("DBioContract1155", function() {
  it("Should deploy", async function() {
    const signers = await ethers.getSigners();
    const minter = signers[0].address;

    const DBIO = await ethers.getContractFactory("DBioContract1155");
    const dbio = await DBIO.deploy(minter);
    await dbio.deployed();
  });

  it("Should redeem a single medical record NFT from a signed voucher", async function() {
    const { contract, redeemer, minter } = await deploy()

    const dbioMinter = new DBioMinter({ contract, signer: minter })
    const voucher = await dbioMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi")

    await expect(contract.redeem(redeemer.address, voucher))
      .to.emit(contract, 'TransferSingle')  // transfer to the redeemer
      .withArgs(minter.address, minter.address, redeemer.address, voucher.tokenId, 1)
  });

  it("Should redeem multiple medical record NFTs from  signed vouchers", async function() {
    const { contract, redeemer, minter } = await deploy()

    const dbioMinter = new DBioMinter({ contract, signer: minter })
    const voucher = await dbioMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi")
    const voucher2 = await dbioMinter.createVoucher(2, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdj")

    await expect(contract.redeemMany(redeemer.address, [voucher,voucher2]))
      .to.emit(contract, 'TransferBatch')  // transfer multiple items to the redeemer
      .withArgs(minter.address, minter.address, redeemer.address, [voucher.tokenId, voucher2.tokenId], [1,1])
  });

  it("Should fail to redeem an NFT voucher that's not signed by dBio", async function() {
    const { contract, redeemer, minter } = await deploy()

    const signers = await ethers.getSigners()
    const rando = signers[signers.length-1];
    
    const dbioMinter = new DBioMinter({ contract, signer: rando })
    const voucher = await dbioMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi")

    await expect(contract.redeem(redeemer.address, voucher))
      .to.be.revertedWith('Signature invalid or unauthorized')
  });

  it("Should redeem if payment is >= minPrice", async function() {
    const { contract, redeemer, minter } = await deploy()

    const dbioMinter = new DBioMinter({ contract, signer: minter })
    const minPrice = ethers.constants.WeiPerEther // charge 1 Eth
    const voucher = await dbioMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", minPrice)

    await expect(contract.redeem(redeemer.address, voucher, { value: minPrice }))
      .and.to.emit(contract, 'TransferSingle') // transfer to redeemer
      .withArgs(minter.address, minter.address, redeemer.address, voucher.tokenId, 1)
  })

  it("Should fail to redeem if payment is < minPrice", async function() {
    const { contract, redeemer, minter } = await deploy()

    const dbioMinter = new DBioMinter({ contract, signer: minter })
    const minPrice = ethers.constants.WeiPerEther // charge 1 Eth
    const voucher = await dbioMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", minPrice)

    const payment = minPrice.sub(10000)
    await expect(contract.redeem(redeemer.address, voucher, { value: payment }))
      .to.be.revertedWith('Insufficient funds to redeem')
  })

});
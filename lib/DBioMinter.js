const ethers = require('ethers')

// These constants must match the ones used in the smart contract.
const SIGNING_DOMAIN_NAME = "DBio"
const SIGNING_DOMAIN_VERSION = "1"

/**
 * JSDoc typedefs.
 * 
 * @typedef {object} NFTVoucher
 * @property {string} uri the metadata URI to associate with this NFT
 * @property {ethers.BytesLike} signature an EIP-712 signature of all fields in the NFTVoucher, apart from signature itself.
 */

/**
 * DBioMinter is a helper class that creates NFTVoucher objects and signs them, to be redeemed later by the DBioContract and DBioContract1155 contract.
 */
class DBioMinter {

  /**
   * Create a new DBioMinter targeting a deployed instance of the  contract.
   * 
   * @param {Object} options
   * @param {ethers.Contract} contract an ethers Contract that's wired up to the deployed contract
   * @param {ethers.Signer} signer a Signer whose account is authorized to mint NFTs on the deployed contract
   */
  constructor({ contract, signer }) {
    this.contract = contract
    this.signer = signer
  }

  /**
   * Creates a new NFTVoucher object and signs it using this DBioMinter's signing key.
   * 
   * @param {string} uri the metadata URI to associate with this NFT
   * 
   * @returns {NFTVoucher}
   */
  async createVoucher(uri) {
    const voucher = { uri }
    const domain = await this._signingDomain()
    const types = {
      NFTVoucher: [
        {name: "uri", type: "string"}  
      ]
    }
    const signature = await this.signer._signTypedData(domain, types, voucher)
    return {
      ...voucher,
      signature,
    }
  }

  /**
   * @private
   * @returns {object} the signing domain, tied to the chainId of the signer
   */
  async _signingDomain() {
    if (this._domain != null) {
      return this._domain
    }
    const chainId = await this.contract.getChainID()
    this._domain = {
      name: SIGNING_DOMAIN_NAME,
      version: SIGNING_DOMAIN_VERSION,
      verifyingContract: this.contract.address,
      chainId,
    }
    return this._domain
  }
}

module.exports = {
  DBioMinter
}
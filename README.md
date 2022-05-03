# dBio Smart Contract

[![License: MIT][license-image]][license-link]

| Dependency | Version | 
| --- | --- |
| NodeJS | v17.7.1 |
| npm | 8.5.2 |
| Solidity | ^0.8.0 |

The DBioContract implements [ERC 1155](https://ethereum.org/en/developers/docs/standards/tokens/erc-1155/), which allows for batch minting and batch transfers as well as "burning" the NFT to destroy it. The contract creates a "voucher" instead of the NFT first, which allows dBio to postpone any minting costs until after the patient claims the NFT. The minting cost is then bundled with the transfer cost that the patient covers. The idea for lazy minting came from the [Lazy Minting tutorial](https://nftschool.dev/tutorial/lazy-minting/).

The `lib` directory includes the script from the Lazy Minting Tutorial mentioned above, slightly adjusted for this project. 

The Smart Contract also uses [EIP 712](https://eips.ethereum.org/EIPS/eip-712#definition-of-domainseparator), to help with signing and hashing. The `_hash` functioned is used inside the `_verify` function to check that the signer of the the NFT voucher has the "MINTER_ROLE" that's required to mint the NFTs. 

Since ERC 1155 requires the tokenURI to be set at the intitiation of the contract, the `_setTokenUri` helper function was added as an override so that the URI of the token can be overwritten with each voucher/minting. 

### Access on Rinkeby Testnet 
The contract has been deployed to the Rinkeby testnet using the `deploy.js` script in the `scripts` directory. The contract can be seen [here](https://rinkeby.etherscan.io/address/0x01e6142b67475c9b1092b66ffb76cdc30d6267ce#code).

Currently, the private key that was used for deployment to the testnet does not belong to dBio. This will need to change in the future. 

### Deploy Locally

The contracts can be tested and deployed locally using hardhat. To run, use the following commands: 

```shell
npm i
npx hardhat compile
npx hardhat test
```

[node-image]: https://img.shields.io/node/v/@haluka/box.svg?style=default
[npm-version]: https://img.shields.io/npm/v/@haluka/box.svg
[npm-link]: https://www.npmjs.com/package/@haluka/box
[license-image]: https://img.shields.io/badge/License-MIT-blue.svg?style=badge
[license-link]: https://opensource.org/licenses/MIT

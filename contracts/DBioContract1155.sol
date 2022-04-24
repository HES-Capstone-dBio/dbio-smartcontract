//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
pragma abicoder v2;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";

contract DBioContract1155 is ERC1155, EIP712, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    string private constant SIGNING_DOMAIN = "DBio";
    string private constant SIGNATURE_VERSION = "1";

    mapping(uint256 => string) private _tokenURIs;

    uint256 public total_NFTs;

    constructor(address payable minter)
        ERC1155("placeholder")
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
    {
        _setupRole(MINTER_ROLE, minter); //access managed through Roles, as recommended by the OpenZeppelin documentation here: https://docs.openzeppelin.com/contracts/3.x/access-control
    }

    /// @notice Represents an un-minted NFT, which has not yet been recorded into the blockchain. A signed voucher can be redeemed for a real NFT using the redeem function.
    struct NFTVoucher {
        /// @notice The id of the token to be redeemed. Must be unique - if another token with this ID already exists, the redeem function will revert.
        uint256 tokenId;
        /// @notice The metadata URI to associate with this token.
        string uri;
        /// @notice the EIP-712 signature of all other fields in the NFTVoucher struct. For a voucher to be valid, it must be signed by an account with the MINTER_ROLE.
        bytes signature;
    }

    /// @notice Redeems an NFTVoucher for an actual NFT, creating it in the process.
    /// @param redeemer The address of the account which will receive the NFT upon success.
    /// @param voucher A signed NFTVoucher that describes the NFT to be redeemed.
    function redeem(address redeemer, NFTVoucher calldata voucher)
        public
        payable
        returns (uint256)
    {
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);

        // make sure that the signer is authorized to mint NFTs
        require(
            hasRole(MINTER_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        // first assign the token to the signer, to establish provenance on-chain
        _mint(signer, voucher.tokenId, 1, "");
        _setTokenUri(voucher.tokenId, voucher.uri);

        // transfer the token to the redeemer
        safeTransferFrom(signer, redeemer, voucher.tokenId, 1, "");

        total_NFTs += 1;

        return voucher.tokenId;
    }

    /// @notice Redeems multiple NFT Vouchers for the actual NFTs and creates them in the process.
    /// @param redeemer The address of the account which will receive the NFT upon success.
    /// @param voucherList An array of signed NFTVoucher that describes the NFT to be redeemed.
    function redeemMany(address redeemer, NFTVoucher[] calldata voucherList)
        public
        payable
        returns (uint256[] memory)
    {
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucherList[0]);
        uint256[] memory tokenIds = new uint256[](voucherList.length);
        uint256[] memory amounts = new uint256[](voucherList.length);
        uint256 total_cost;

        // loop through all the NFT vouchers in the list
        for (uint256 i = 0; i < voucherList.length; i++) {
            NFTVoucher calldata voucher = voucherList[i];
            address check_signer = _verify(voucher);

            //checks that all the NFT vouchers share the same signer (i.e. dBio contract and reverts if they do not)
            if (signer != check_signer) {
                revert("Multiple different NFT signers");
            }

            //add token id to the array of tokenIds
            tokenIds[i] = voucher.tokenId;

            //create the input array of amounts per NFT that corresponds to the total NFTs; only one NFT should be created per voucher, hence this value is hard-coded
            amounts[i] = 1;

            //set the token URI for the voucher
            _setTokenUri(voucher.tokenId, voucher.uri);
        }

        // make sure that the signer is authorized to mint NFTs
        require(
            hasRole(MINTER_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        // make sure that the redeemer is paying enough to cover the cost of the resources
        require(msg.value >= total_cost, "Insufficient funds to redeem");

        // first assign the token to the signer, to establish provenance on-chain
        _mintBatch(signer, tokenIds, amounts, "");

        // transfer the token to the redeemer
        safeBatchTransferFrom(signer, redeemer, tokenIds, amounts, "");

        total_NFTs += voucherList.length;

        return tokenIds;
    }

    /// @notice Returns a hash of the given NFTVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher An NFTVoucher to hash.
    function _hash(NFTVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "NFTVoucher(uint256 tokenId,string uri)"
                        ),
                        voucher.tokenId,
                        keccak256(bytes(voucher.uri))
                    )
                )
            );
    }

    /// @notice Returns the chain id of the current blockchain.
    /// @dev This is used to workaround an issue with ganache returning different values from the on-chain chainid() function and
    ///  the eth_chainId RPC method. See https://github.com/protocol/nft-website/issues/121 for context.
    function getChainID() external view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

    /// @notice Verifies the signature for a given NFTVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher An NFTVoucher describing an unminted NFT.
    function _verify(NFTVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return (_tokenURIs[tokenId]);
    }

    /// @dev overrides the 1155 URI standard that initially sets the URI for all tokens, more details at: https://docs.soliditylang.org/en/latest/contracts.html#function-overriding
    function _setTokenUri(uint256 tokenId, string memory tokenURI) private {
        _tokenURIs[tokenId] = tokenURI;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControl, ERC1155)
        returns (bool)
    {
        return
            ERC1155.supportsInterface(interfaceId) ||
            AccessControl.supportsInterface(interfaceId);
    }
}

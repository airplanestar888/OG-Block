// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import { Base64 } from "@openzeppelin/contracts/utils/Base64.sol";

/// @title OG-Block OG Card
/// @notice Soul-bound-ish membership card. One OG Card per wallet, minter pays gas.
///         Metadata is generated fully on-chain (name, description, image, attributes).
///         The base image URL is set once in the constructor and is immutable —
///         there is no setter, so the artwork can never change after deployment.
contract OgCard is ERC721, Ownable {
    using Strings for uint256;

    /// Hard cap on total cards. Mint reverts once this many are minted.
    uint256 public constant MAX_SUPPLY = 1000;

    uint256 private _nextTokenId;

    // per-token provenance
    mapping(uint256 => address) public minterOf;
    mapping(uint256 => uint64) public mintedAt;

    // one-per-wallet guard
    mapping(address => bool) public hasClaimed;

    // off-chain art (e.g. https://og-block.vercel.app/og-card.png). Set once at
    // deploy and immutable — no setter, so the image can never change after mint.
    string public imageURI;

    // collection-level description used in tokenURI + contractURI
    string private constant DESCRIPTION =
        "OG-Block OG Card - on-chain proof of early membership in the OG-Block culture network on Base.";

    event Minted(address indexed to, uint256 indexed tokenId);

    error AlreadyClaimed();
    error NonexistentToken();
    error SoldOut();

    constructor(string memory initialImageURI)
        ERC721("OG-Block OG Card", "OGCARD")
        Ownable(msg.sender)
    {
        imageURI = initialImageURI;
    }

    // ─── Mint ───────────────────────────────────────────

    /// @notice Mint exactly one OG Card to the caller. Reverts if already claimed or sold out.
    function mint() external {
        if (hasClaimed[msg.sender]) revert AlreadyClaimed();
        if (_nextTokenId >= MAX_SUPPLY) revert SoldOut();

        uint256 tokenId = _nextTokenId++;
        hasClaimed[msg.sender] = true;
        minterOf[tokenId] = msg.sender;
        mintedAt[tokenId] = uint64(block.timestamp);

        _safeMint(msg.sender, tokenId);
        emit Minted(msg.sender, tokenId);
    }

    // ─── Views ──────────────────────────────────────────

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    /// @notice Tier derived from mint order.
    function tierOf(uint256 tokenId) public view returns (string memory) {
        _requireOwned(tokenId);
        if (tokenId < 100) return "Genesis";
        if (tokenId < 500) return "Early";
        return "Member";
    }

    // ─── On-chain metadata ──────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory tier = tokenId < 100 ? "Genesis" : (tokenId < 500 ? "Early" : "Member");
        address minter = minterOf[tokenId];
        uint256 timestamp = uint256(mintedAt[tokenId]);

        string memory json = string(
            abi.encodePacked(
                '{"name":"OG Card #',
                tokenId.toString(),
                '","description":"',
                DESCRIPTION,
                '","image":"',
                imageURI,
                '","attributes":[',
                '{"trait_type":"OG Number","value":',
                tokenId.toString(),
                '},{"trait_type":"Tier","value":"',
                tier,
                '"},{"display_type":"date","trait_type":"Minted","value":',
                timestamp.toString(),
                '},{"trait_type":"Minter","value":"',
                Strings.toHexString(uint256(uint160(minter)), 20),
                '"}]}'
            )
        );

        return string(
            abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json)))
        );
    }

    /// @notice Collection-level metadata for marketplaces (OpenSea contractURI standard).
    function contractURI() external view returns (string memory) {
        string memory json = string(
            abi.encodePacked(
                '{"name":"OG-Block OG Card","description":"',
                DESCRIPTION,
                '","image":"',
                imageURI,
                '"}'
            )
        );
        return string(
            abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json)))
        );
    }

    // ─── Admin ──────────────────────────────────────────

    /// @notice Owner-only mint to a specific address. Used to migrate/airdrop
    ///         cards to wallets that already claimed on a previous deployment.
    ///         Same one-per-wallet and supply guards as public mint().
    function airdropMint(address to) external onlyOwner {
        if (hasClaimed[to]) revert AlreadyClaimed();
        if (_nextTokenId >= MAX_SUPPLY) revert SoldOut();

        uint256 tokenId = _nextTokenId++;
        hasClaimed[to] = true;
        minterOf[tokenId] = to;
        mintedAt[tokenId] = uint64(block.timestamp);

        _safeMint(to, tokenId);
        emit Minted(to, tokenId);
    }
}

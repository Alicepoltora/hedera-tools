// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HederaNFT
 * @dev ERC-721 NFT contract deployed on Hedera Testnet
 *      Part of the hedera-ui-kit demo ecosystem.
 *      Allows any address to mint an NFT with a custom tokenURI (metadata).
 */
contract HederaNFT {
    // ── ERC-721 Events ─────────────────────────────────────────────────────
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    // ── Mint Event ─────────────────────────────────────────────────────────
    event Minted(address indexed to, uint256 indexed tokenId, string tokenURI);

    // ── Storage ────────────────────────────────────────────────────────────
    string public name;
    string public symbol;

    uint256 private _tokenIdCounter;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(uint256 => string)  private _tokenURIs;

    // ── Constructor ────────────────────────────────────────────────────────
    constructor(string memory _name, string memory _symbol) {
        name   = _name;
        symbol = _symbol;
    }

    // ── ERC-165 ─────────────────────────────────────────────────────────────
    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return
            interfaceId == 0x80ac58cd || // ERC-721
            interfaceId == 0x5b5e139f || // ERC-721Metadata
            interfaceId == 0x01ffc9a7;   // ERC-165
    }

    // ── ERC-721 View ────────────────────────────────────────────────────────
    function balanceOf(address owner) public view returns (uint256) {
        require(owner != address(0), "ERC721: zero address");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "ERC721: nonexistent token");
        return owner;
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_owners[tokenId] != address(0), "ERC721: nonexistent token");
        return _tokenURIs[tokenId];
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }

    // ── ERC-721 Approvals ───────────────────────────────────────────────────
    function approve(address to, uint256 tokenId) public {
        address owner = ownerOf(tokenId);
        require(msg.sender == owner || isApprovedForAll(owner, msg.sender), "ERC721: not authorized");
        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        require(_owners[tokenId] != address(0), "ERC721: nonexistent token");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) public {
        require(operator != msg.sender, "ERC721: approve to caller");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) public view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    // ── ERC-721 Transfers ───────────────────────────────────────────────────
    function transferFrom(address from, address to, uint256 tokenId) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "ERC721: not approved");
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public {
        transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory) public {
        transferFrom(from, to, tokenId);
    }

    // ── Mint ────────────────────────────────────────────────────────────────
    /**
     * @notice Mint a new NFT to `to` with the given `uri` metadata.
     *         Anyone can call this — open mint for demo purposes.
     * @param to      Recipient address
     * @param uri     IPFS / HTTPS URL for the token metadata JSON
     */
    function mint(address to, string memory uri) public returns (uint256) {
        require(to != address(0), "ERC721: mint to zero address");
        _tokenIdCounter += 1;
        uint256 tokenId = _tokenIdCounter;

        _balances[to]    += 1;
        _owners[tokenId]  = to;
        _tokenURIs[tokenId] = uri;

        emit Transfer(address(0), to, tokenId);
        emit Minted(to, tokenId, uri);

        return tokenId;
    }

    // ── Internal ────────────────────────────────────────────────────────────
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner = ownerOf(tokenId);
        return (
            spender == owner ||
            getApproved(tokenId) == spender ||
            isApprovedForAll(owner, spender)
        );
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        require(ownerOf(tokenId) == from, "ERC721: wrong owner");
        require(to != address(0), "ERC721: transfer to zero address");

        delete _tokenApprovals[tokenId];
        _balances[from] -= 1;
        _balances[to]   += 1;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }
}

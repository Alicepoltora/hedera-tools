// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title HookRegistry
/// @notice On-chain registry of published hedera-ui-kit hooks and libraries.
///         Developers register their hooks with metadata; the registry is
///         queryable by name, author, or category.
contract HookRegistry {
    struct Hook {
        string  name;
        string  category;   // "token" | "hcs" | "staking" | "ai" | "other"
        string  version;
        string  npmPackage;
        string  repoUrl;
        address author;
        uint256 registeredAt;
        bool    active;
    }

    uint256 public hookCount;
    mapping(uint256 => Hook) public hooks;
    mapping(address => uint256[]) public authorHooks;

    event HookRegistered(uint256 indexed id, string name, address indexed author);
    event HookDeactivated(uint256 indexed id);

    function register(
        string calldata name,
        string calldata category,
        string calldata version,
        string calldata npmPackage,
        string calldata repoUrl
    ) external returns (uint256 id) {
        id = hookCount++;
        hooks[id] = Hook(name, category, version, npmPackage, repoUrl, msg.sender, block.timestamp, true);
        authorHooks[msg.sender].push(id);
        emit HookRegistered(id, name, msg.sender);
    }

    function deactivate(uint256 id) external {
        require(hooks[id].author == msg.sender, "Not author");
        hooks[id].active = false;
        emit HookDeactivated(id);
    }

    function getByAuthor(address author) external view returns (uint256[] memory) {
        return authorHooks[author];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AIAgentRegistry
/// @notice Registry of AI Agent tool definitions callable from hedera-ui-kit.
///         Each tool has a name, description, and ABI signature so the
///         AI Agent can discover and invoke on-chain actions dynamically.
contract AIAgentRegistry {
    struct Tool {
        string  name;
        string  description;
        string  abiSignature;   // e.g. "transfer(address,uint256)"
        address contractAddr;
        address registeredBy;
        bool    enabled;
    }

    uint256 public toolCount;
    mapping(uint256 => Tool) public tools;
    mapping(string  => uint256) public toolByName;   // name => id

    address public owner;

    event ToolRegistered(uint256 indexed id, string name, address contractAddr);
    event ToolToggled(uint256 indexed id, bool enabled);

    constructor() { owner = msg.sender; }

    function registerTool(
        string calldata name,
        string calldata description,
        string calldata abiSignature,
        address contractAddr
    ) external returns (uint256 id) {
        id = toolCount++;
        tools[id] = Tool(name, description, abiSignature, contractAddr, msg.sender, true);
        toolByName[name] = id;
        emit ToolRegistered(id, name, contractAddr);
    }

    function toggleTool(uint256 id, bool enabled) external {
        require(tools[id].registeredBy == msg.sender || msg.sender == owner, "Unauthorized");
        tools[id].enabled = enabled;
        emit ToolToggled(id, enabled);
    }

    function getTool(uint256 id) external view
        returns (string memory, string memory, string memory, address, bool)
    {
        Tool memory t = tools[id];
        return (t.name, t.description, t.abiSignature, t.contractAddr, t.enabled);
    }

    function getEnabledTools() external view returns (uint256[] memory ids) {
        uint256 count;
        for (uint256 i = 0; i < toolCount; i++) if (tools[i].enabled) count++;
        ids = new uint256[](count);
        uint256 j;
        for (uint256 i = 0; i < toolCount; i++) if (tools[i].enabled) ids[j++] = i;
    }
}

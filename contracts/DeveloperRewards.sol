// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title DeveloperRewards
/// @notice Holds HBAR rewards for hook developers. The AI Agent (oracle)
///         calls reward() to distribute funds based on quality scores.
contract DeveloperRewards {
    address public owner;
    address public oracle;          // AI Agent oracle address

    mapping(address => uint256) public pendingRewards;
    uint256 public totalDistributed;

    event Rewarded(address indexed developer, uint256 amount, string reason);
    event Claimed(address indexed developer, uint256 amount);
    event OracleUpdated(address indexed newOracle);

    modifier onlyOwnerOrOracle() {
        require(msg.sender == owner || msg.sender == oracle, "Unauthorized");
        _;
    }

    constructor(address _oracle) payable {
        owner = msg.sender;
        oracle = _oracle;
    }

    function reward(address developer, uint256 amount, string calldata reason)
        external onlyOwnerOrOracle
    {
        require(address(this).balance >= amount, "Insufficient contract balance");
        pendingRewards[developer] += amount;
        emit Rewarded(developer, amount, reason);
    }

    function claim() external {
        uint256 amount = pendingRewards[msg.sender];
        require(amount > 0, "Nothing to claim");
        pendingRewards[msg.sender] = 0;
        totalDistributed += amount;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");
        emit Claimed(msg.sender, amount);
    }

    function setOracle(address _oracle) external {
        require(msg.sender == owner, "Not owner");
        oracle = _oracle;
        emit OracleUpdated(_oracle);
    }

    function deposit() external payable {}

    function balance() external view returns (uint256) {
        return address(this).balance;
    }
}

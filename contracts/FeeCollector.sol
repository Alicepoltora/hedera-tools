// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title FeeCollector
/// @notice Collects protocol fees from marketplace transactions and
///         distributes them to the treasury and staking reward pool.
contract FeeCollector {
    address public owner;
    address public treasury;
    address public rewardPool;
    uint256 public treasuryShare = 7000;  // 70% in BPS
    uint256 public totalCollected;

    event FeesReceived(address indexed from, uint256 amount);
    event FeesDistributed(uint256 toTreasury, uint256 toPool);

    constructor(address _treasury, address _rewardPool) {
        owner       = msg.sender;
        treasury    = _treasury;
        rewardPool  = _rewardPool;
    }

    receive() external payable {
        totalCollected += msg.value;
        emit FeesReceived(msg.sender, msg.value);
    }

    function distribute() external {
        uint256 bal = address(this).balance;
        require(bal > 0, "Nothing to distribute");

        uint256 toTreasury = (bal * treasuryShare) / 10_000;
        uint256 toPool     = bal - toTreasury;

        (bool ok1,) = treasury.call{value: toTreasury}("");   require(ok1, "Treasury failed");
        (bool ok2,) = rewardPool.call{value: toPool}("");     require(ok2, "Pool failed");

        emit FeesDistributed(toTreasury, toPool);
    }

    function updateShares(uint256 _treasuryShare) external {
        require(msg.sender == owner, "Not owner");
        require(_treasuryShare <= 10_000, "Invalid");
        treasuryShare = _treasuryShare;
    }
}

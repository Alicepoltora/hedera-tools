// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ReputationSystem
/// @notice Tracks developer reputation points earned through hook quality,
///         downloads, and community reviews.
contract ReputationSystem {
    address public owner;

    struct DevProfile {
        uint256 totalPoints;
        uint256 hooksPublished;
        uint256 reviewsReceived;
        uint256 lastActivity;
        string  displayName;
    }

    mapping(address => DevProfile) public profiles;
    mapping(address => bool)       public authorizedUpdaters;

    event PointsAdded(address indexed developer, uint256 points, string reason);
    event ProfileUpdated(address indexed developer, string displayName);

    modifier onlyUpdater() {
        require(authorizedUpdaters[msg.sender] || msg.sender == owner, "Not authorized");
        _;
    }

    constructor() { owner = msg.sender; authorizedUpdaters[msg.sender] = true; }

    function addPoints(address developer, uint256 points, string calldata reason)
        external onlyUpdater
    {
        profiles[developer].totalPoints   += points;
        profiles[developer].lastActivity   = block.timestamp;
        emit PointsAdded(developer, points, reason);
    }

    function incrementHooks(address developer) external onlyUpdater {
        profiles[developer].hooksPublished++;
    }

    function incrementReviews(address developer) external onlyUpdater {
        profiles[developer].reviewsReceived++;
    }

    function setDisplayName(string calldata name) external {
        profiles[msg.sender].displayName = name;
        emit ProfileUpdated(msg.sender, name);
    }

    function setUpdater(address updater, bool enabled) external {
        require(msg.sender == owner, "Not owner");
        authorizedUpdaters[updater] = enabled;
    }

    function getProfile(address dev) external view
        returns (uint256, uint256, uint256, uint256, string memory)
    {
        DevProfile memory p = profiles[dev];
        return (p.totalPoints, p.hooksPublished, p.reviewsReceived, p.lastActivity, p.displayName);
    }
}

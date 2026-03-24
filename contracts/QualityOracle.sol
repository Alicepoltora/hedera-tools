// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title QualityOracle
/// @notice Stores AI Agent quality scores for hooks and libraries.
///         Scores range 0-100 and are updated by the authorized oracle wallet.
contract QualityOracle {
    address public owner;
    address public oracle;

    struct Score {
        uint8   value;      // 0-100
        string  rationale;
        uint256 updatedAt;
    }

    // hookId => Score
    mapping(uint256 => Score) public scores;

    event ScoreSet(uint256 indexed hookId, uint8 score, string rationale);

    modifier onlyOracle() {
        require(msg.sender == oracle || msg.sender == owner, "Not oracle");
        _;
    }

    constructor(address _oracle) {
        owner  = msg.sender;
        oracle = _oracle;
    }

    function setScore(uint256 hookId, uint8 score, string calldata rationale)
        external onlyOracle
    {
        require(score <= 100, "Score > 100");
        scores[hookId] = Score(score, rationale, block.timestamp);
        emit ScoreSet(hookId, score, rationale);
    }

    function getScore(uint256 hookId) external view returns (uint8, string memory, uint256) {
        Score memory s = scores[hookId];
        return (s.value, s.rationale, s.updatedAt);
    }

    function updateOracle(address _oracle) external {
        require(msg.sender == owner, "Not owner");
        oracle = _oracle;
    }
}

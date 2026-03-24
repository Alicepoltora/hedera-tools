// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title GovernanceVoting
/// @notice Community governance for hedera-ui-kit — vote on feature proposals,
///         reward policies, and library standards.
contract GovernanceVoting {
    enum Status { Active, Passed, Rejected, Cancelled }

    struct Proposal {
        string  title;
        string  description;
        address proposer;
        uint256 createdAt;
        uint256 endsAt;
        uint256 votesFor;
        uint256 votesAgainst;
        Status  status;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(uint256 indexed id, string title, address indexed proposer);
    event Voted(uint256 indexed id, address indexed voter, bool support);
    event ProposalFinalized(uint256 indexed id, Status status);

    function propose(string calldata title, string calldata description, uint256 durationSeconds)
        external returns (uint256 id)
    {
        id = proposalCount++;
        proposals[id] = Proposal(
            title, description, msg.sender,
            block.timestamp, block.timestamp + durationSeconds,
            0, 0, Status.Active
        );
        emit ProposalCreated(id, title, msg.sender);
    }

    function vote(uint256 id, bool support) external {
        Proposal storage p = proposals[id];
        require(p.status == Status.Active,          "Not active");
        require(block.timestamp <= p.endsAt,        "Voting ended");
        require(!hasVoted[id][msg.sender],           "Already voted");

        hasVoted[id][msg.sender] = true;
        if (support) p.votesFor++; else p.votesAgainst++;
        emit Voted(id, msg.sender, support);
    }

    function finalize(uint256 id) external {
        Proposal storage p = proposals[id];
        require(p.status == Status.Active,      "Not active");
        require(block.timestamp > p.endsAt,     "Still ongoing");

        p.status = p.votesFor > p.votesAgainst ? Status.Passed : Status.Rejected;
        emit ProposalFinalized(id, p.status);
    }
}

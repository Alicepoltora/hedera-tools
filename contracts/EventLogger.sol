// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title EventLogger
/// @notice Immutable on-chain event log for hedera-ui-kit interactions.
///         dApps emit structured events that are permanently recorded.
contract EventLogger {
    struct LogEntry {
        address emitter;
        string  eventType;   // "TOKEN_CREATED" | "HCS_SUBMIT" | "STAKE" | etc.
        string  payload;     // JSON-encoded event data
        uint256 timestamp;
    }

    LogEntry[] public log;

    event Logged(uint256 indexed index, address indexed emitter, string eventType);

    function emit_log(string calldata eventType, string calldata payload)
        external returns (uint256 index)
    {
        index = log.length;
        log.push(LogEntry(msg.sender, eventType, payload, block.timestamp));
        emit Logged(index, msg.sender, eventType);
    }

    function getEntry(uint256 index) external view
        returns (address, string memory, string memory, uint256)
    {
        LogEntry memory e = log[index];
        return (e.emitter, e.eventType, e.payload, e.timestamp);
    }

    function totalEntries() external view returns (uint256) {
        return log.length;
    }
}

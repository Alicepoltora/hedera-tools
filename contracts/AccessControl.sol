// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AccessControl
/// @notice Role-based permissions for hedera-ui-kit ecosystem contracts.
///         Roles: ADMIN, ORACLE, MODERATOR, DEVELOPER
contract AccessControl {
    bytes32 public constant ADMIN     = keccak256("ADMIN");
    bytes32 public constant ORACLE    = keccak256("ORACLE");
    bytes32 public constant MODERATOR = keccak256("MODERATOR");
    bytes32 public constant DEVELOPER = keccak256("DEVELOPER");

    mapping(bytes32 => mapping(address => bool)) private _roles;

    event RoleGranted(bytes32 indexed role, address indexed account);
    event RoleRevoked(bytes32 indexed role, address indexed account);

    constructor() {
        _roles[ADMIN][msg.sender] = true;
        emit RoleGranted(ADMIN, msg.sender);
    }

    modifier onlyRole(bytes32 role) {
        require(_roles[role][msg.sender], "Missing role");
        _;
    }

    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[role][account];
    }

    function grantRole(bytes32 role, address account) external onlyRole(ADMIN) {
        _roles[role][account] = true;
        emit RoleGranted(role, account);
    }

    function revokeRole(bytes32 role, address account) external onlyRole(ADMIN) {
        require(account != msg.sender, "Cannot revoke own ADMIN");
        _roles[role][account] = false;
        emit RoleRevoked(role, account);
    }
}

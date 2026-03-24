// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title HookMarketplace
/// @notice Buy and sell access licences for premium hooks.
///         Sellers list their hook with a price; buyers pay in HBAR.
contract HookMarketplace {
    struct Listing {
        address seller;
        uint256 price;      // tinybars equivalent (wei on EVM layer)
        bool    active;
    }

    uint256 public constant FEE_BPS = 250; // 2.5% protocol fee
    address public treasury;

    mapping(uint256 => Listing)  public listings;           // hookId => Listing
    mapping(uint256 => mapping(address => bool)) public hasAccess;

    event Listed(uint256 indexed hookId, address indexed seller, uint256 price);
    event Purchased(uint256 indexed hookId, address indexed buyer);
    event Delisted(uint256 indexed hookId);

    constructor(address _treasury) {
        treasury = _treasury;
    }

    function list(uint256 hookId, uint256 price) external {
        require(price > 0, "Price = 0");
        listings[hookId] = Listing(msg.sender, price, true);
        emit Listed(hookId, msg.sender, price);
    }

    function purchase(uint256 hookId) external payable {
        Listing storage l = listings[hookId];
        require(l.active, "Not listed");
        require(msg.value >= l.price, "Insufficient payment");

        uint256 fee    = (l.price * FEE_BPS) / 10_000;
        uint256 payout = l.price - fee;

        hasAccess[hookId][msg.sender] = true;

        (bool ok1,) = l.seller.call{value: payout}("");   require(ok1, "Payout failed");
        (bool ok2,) = treasury.call{value: fee}("");       require(ok2, "Fee failed");

        // Refund overpayment
        if (msg.value > l.price) {
            (bool ok3,) = msg.sender.call{value: msg.value - l.price}(""); require(ok3, "Refund failed");
        }

        emit Purchased(hookId, msg.sender);
    }

    function delist(uint256 hookId) external {
        require(listings[hookId].seller == msg.sender, "Not seller");
        listings[hookId].active = false;
        emit Delisted(hookId);
    }
}

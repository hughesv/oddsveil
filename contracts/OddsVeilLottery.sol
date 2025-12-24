// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint8, euint32, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title OddsVeil Lottery
/// @notice Buy an encrypted ticket and draw encrypted random numbers for rewards.
contract OddsVeilLottery is ZamaEthereumConfig {
    uint256 public constant TICKET_PRICE = 0.01 ether;

    struct Ticket {
        euint8 first;
        euint8 second;
        bool active;
    }

    mapping(address => Ticket) private tickets;
    mapping(address => euint32) private points;
    mapping(address => euint8[2]) private lastDraw;

    event TicketPurchased(address indexed player, euint8 first, euint8 second);
    event DrawCompleted(address indexed player, euint8 randomFirst, euint8 randomSecond, euint32 reward);

    error InvalidPayment();
    error TicketAlreadyActive();
    error NoActiveTicket();

    /// @notice Buy a ticket using two encrypted numbers.
    /// @param firstInput Encrypted first number (1-20)
    /// @param secondInput Encrypted second number (1-20)
    /// @param proof Input proof from the relayer SDK
    function buyTicket(
        externalEuint8 firstInput,
        externalEuint8 secondInput,
        bytes calldata proof
    ) external payable {
        if (msg.value != TICKET_PRICE) {
            revert InvalidPayment();
        }
        if (tickets[msg.sender].active) {
            revert TicketAlreadyActive();
        }

        euint8 first = FHE.fromExternal(firstInput, proof);
        euint8 second = FHE.fromExternal(secondInput, proof);

        tickets[msg.sender] = Ticket({first: first, second: second, active: true});

        FHE.allowThis(first);
        FHE.allowThis(second);
        FHE.allow(first, msg.sender);
        FHE.allow(second, msg.sender);

        emit TicketPurchased(msg.sender, first, second);
    }

    /// @notice Draw encrypted random numbers and update encrypted points.
    function draw() external {
        Ticket storage ticket = tickets[msg.sender];
        if (!ticket.active) {
            revert NoActiveTicket();
        }

        euint8 randomFirst = FHE.add(FHE.randEuint8(20), FHE.asEuint8(1));
        euint8 randomSecond = FHE.add(FHE.randEuint8(20), FHE.asEuint8(1));

        euint8 firstMatchCount = FHE.add(
            FHE.select(FHE.eq(ticket.first, randomFirst), FHE.asEuint8(1), FHE.asEuint8(0)),
            FHE.select(FHE.eq(ticket.first, randomSecond), FHE.asEuint8(1), FHE.asEuint8(0))
        );
        euint8 secondMatchCount = FHE.add(
            FHE.select(FHE.eq(ticket.second, randomFirst), FHE.asEuint8(1), FHE.asEuint8(0)),
            FHE.select(FHE.eq(ticket.second, randomSecond), FHE.asEuint8(1), FHE.asEuint8(0))
        );

        ebool firstMatch = FHE.gt(firstMatchCount, FHE.asEuint8(0));
        ebool secondMatch = FHE.gt(secondMatchCount, FHE.asEuint8(0));

        euint8 matchCount = FHE.add(
            FHE.select(firstMatch, FHE.asEuint8(1), FHE.asEuint8(0)),
            FHE.select(secondMatch, FHE.asEuint8(1), FHE.asEuint8(0))
        );

        ebool isTwoMatches = FHE.eq(matchCount, FHE.asEuint8(2));
        ebool isOneMatch = FHE.eq(matchCount, FHE.asEuint8(1));

        euint32 reward = FHE.select(
            isTwoMatches,
            FHE.asEuint32(100000),
            FHE.select(isOneMatch, FHE.asEuint32(1000), FHE.asEuint32(0))
        );

        points[msg.sender] = FHE.add(points[msg.sender], reward);
        ticket.active = false;

        lastDraw[msg.sender] = [randomFirst, randomSecond];

        FHE.allowThis(points[msg.sender]);
        FHE.allow(points[msg.sender], msg.sender);
        FHE.allowThis(randomFirst);
        FHE.allowThis(randomSecond);
        FHE.allow(randomFirst, msg.sender);
        FHE.allow(randomSecond, msg.sender);

        emit DrawCompleted(msg.sender, randomFirst, randomSecond, reward);
    }

    /// @notice Get a player's encrypted points.
    /// @param player Player address
    function getPoints(address player) external view returns (euint32) {
        return points[player];
    }

    /// @notice Get a player's current ticket.
    /// @param player Player address
    function getTicket(address player) external view returns (euint8, euint8, bool) {
        Ticket storage ticket = tickets[player];
        return (ticket.first, ticket.second, ticket.active);
    }

    /// @notice Get the last draw numbers for a player.
    /// @param player Player address
    function getLastDraw(address player) external view returns (euint8, euint8) {
        return (lastDraw[player][0], lastDraw[player][1]);
    }
}

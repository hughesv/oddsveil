# OddsVeil

OddsVeil is a privacy-first lottery-style dApp built on Zama FHEVM. Players buy a ticket with two numbers
(1-20) that are encrypted client-side, draw two encrypted random numbers on-chain, and earn encrypted points
based on matches. Only the player can decrypt their points.

## Project Overview

OddsVeil demonstrates how Fully Homomorphic Encryption (FHE) makes sensitive game logic private while keeping
all business rules on-chain. The dApp is intentionally simple: a ticket, a draw, and points. The privacy model
is the main feature.

## Problem This Solves

Typical on-chain games expose user choices and rewards to everyone, enabling:
- Copying strategies or front-running selected numbers.
- Privacy leakage of player behavior and rewards.
- Reputation risks when users do not want their results to be public.

OddsVeil keeps the following data encrypted at all times on-chain:
- Ticket numbers
- Draw results
- Player points

## Key Features

- Encrypted ticket purchase with two numbers (1-20).
- Encrypted on-chain draw using Zama FHE randomness.
- Encrypted points accumulation with clear reward tiers.
- Player-only decryption flow via Zama relayer SDK.
- Simple, wallet-connected UI with clear status messaging.

## Advantages

- Privacy by default: choices, draw results, and scores are hidden on-chain.
- On-chain rule enforcement: rewards are computed in the contract, not in the UI.
- Player-controlled disclosure: only the player can decrypt points.
- Minimal trust surface: no trusted backend is needed to score tickets.
- Clear UX: users see encrypted handles and explicit decryption actions.

## How It Works (End-to-End)

1. Player selects two numbers between 1 and 20.
2. The front end encrypts the numbers with the Zama relayer SDK.
3. The encrypted ticket is submitted to the contract with 0.01 ETH.
4. The player starts a draw. The contract generates two encrypted random numbers.
5. The contract compares encrypted values and computes encrypted rewards:
   - 1 matching number: 1,000 points
   - 2 matching numbers: 100,000 points
6. The player requests a user decryption and reveals their points locally.

## Rewards and Rules

- Ticket price: 0.01 ETH
- Number range: 1-20
- Reward tiers:
  - 1 match: 1,000 points
  - 2 matches: 100,000 points
- Points are non-transferable encrypted values stored in the contract.

## Tech Stack

Smart Contracts
- Solidity (FHE-enabled) on Zama FHEVM
- Hardhat + hardhat-deploy

Frontend
- React + Vite
- RainbowKit + Wagmi
- Ethers (writes) and Viem (reads)
- Zama relayer SDK for encryption and user decryption

## Architecture

- Contract: `OddsVeilLottery` in `contracts/OddsVeilLottery.sol`
  - Stores encrypted tickets, draw results, and points.
  - Enforces reward logic without revealing values.
- Relayer SDK: encrypts inputs and handles user decryption.
- Frontend: React app in `src/` with the user flow and status feedback.

## Project Structure

```
./
├── contracts/              # Solidity smart contracts
├── deploy/                 # Deployment scripts (hardhat-deploy)
├── tasks/                  # Hardhat tasks
├── test/                   # Contract tests
├── docs/                   # Zama docs references
├── src/                    # Frontend (React + Vite)
└── hardhat.config.ts       # Hardhat configuration
```

## Prerequisites

- Node.js 20+
- npm
- A funded wallet for Sepolia
- INFURA API key
- PRIVATE_KEY for deployment (no mnemonic)

## Environment Configuration (Contracts Only)

Create a `.env` file in the project root:

```
INFURA_API_KEY=your_infura_key
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_etherscan_key
```

Notes:
- Do not use MNEMONIC. Deployment uses PRIVATE_KEY only.

## Local Development Workflow

1) Install dependencies

```
npm install
```

2) Compile and test

```
npm run compile
npm run test
```

3) Run a local FHEVM-ready node (optional)

```
npx hardhat node
```

4) Deploy locally (optional)

```
npx hardhat deploy --network localhost
```

## Sepolia Deployment Workflow

Run tasks and tests first, then deploy to Sepolia.

```
npx hardhat task:accounts
npm run test
npx hardhat deploy --network sepolia
```

Optional verification:

```
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## Frontend Setup

The frontend does not use environment variables. Configure it directly in code.

1) Install frontend dependencies

```
cd src
npm install
```

2) Update contract address and ABI

- Edit `src/src/config/contracts.ts`
- Replace `CONTRACT_ADDRESS` with the deployed Sepolia address.
- Copy the ABI from `deployments/sepolia` and paste it into `CONTRACT_ABI`.

3) Start the UI

```
npm run dev
```

Notes:
- The UI targets Sepolia and should not be pointed at localhost.

## User Flow

1. Connect wallet.
2. Pick two numbers and buy a ticket.
3. Start the draw.
4. See encrypted ticket, draw results, and points handles.
5. Decrypt points on demand.

## Testing

- Contract tests live in `test/`.
- Use `npm run test` for the default suite.
- Use the Sepolia test file to validate on-chain integration.

## Security and Privacy Notes

- All ticket numbers, draws, and points remain encrypted on-chain.
- Decryption is user-driven and requires wallet signature authorization.
- Rewards are points only; no ERC-20 or ETH payout is implemented.

## Future Plans

- Add multiple ticket management and historical draws.
- Add on-chain prize redemption or tokenized rewards.
- Improve draw fairness reporting with extra audit data.
- Add UI analytics and richer game history views.
- Support additional networks that expose FHEVM.

## License

BSD-3-Clause-Clear. See `LICENSE`.

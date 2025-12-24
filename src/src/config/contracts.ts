// OddsVeilLottery contract deployed on Sepolia (replace after deployment)
export const CONTRACT_ADDRESS = '0x0cEc0c1c4168a5A671a46966b18CA585d8941d4b';

// Generated ABI from contract artifacts - synced from deployments/sepolia
export const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "euint8",
        "name": "randomFirst",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "euint8",
        "name": "randomSecond",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "euint32",
        "name": "reward",
        "type": "bytes32"
      }
    ],
    "name": "DrawCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "euint8",
        "name": "first",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "euint8",
        "name": "second",
        "type": "bytes32"
      }
    ],
    "name": "TicketPurchased",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "InvalidPayment",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoActiveTicket",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TicketAlreadyActive",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TICKET_PRICE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "externalEuint8",
        "name": "firstInput",
        "type": "bytes32"
      },
      {
        "internalType": "externalEuint8",
        "name": "secondInput",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "proof",
        "type": "bytes"
      }
    ],
    "name": "buyTicket",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "draw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "getLastDraw",
    "outputs": [
      {
        "internalType": "euint8",
        "name": "",
        "type": "bytes32"
      },
      {
        "internalType": "euint8",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "getPoints",
    "outputs": [
      {
        "internalType": "euint32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "getTicket",
    "outputs": [
      {
        "internalType": "euint8",
        "name": "",
        "type": "bytes32"
      },
      {
        "internalType": "euint8",
        "name": "",
        "type": "bytes32"
      },
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

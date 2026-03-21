# 🌿 hedera-tools

**Hedera Hello Future Apex Hackathon 2026 — Sustainability Track**

A platform for tokenizing carbon credits and logging sustainability data on the Hedera network using HTS (Hedera Token Service) and HCS (Hedera Consensus Service).

---

## 🏆 Hackathon

| | |
|---|---|
| **Event** | [Hedera Hello Future Apex 2026](https://hellofuturehackathon.dev/) |
| **Track** | Sustainability |
| **Deadline** | March 23, 2026 — 11:59 PM ET |
| **Prize** | $40,000 (1st: $18,500 · 2nd: $13,500 · 3rd: $8,000) |

---

## 🚀 Quick Start

### 1. Clone & install
```bash
git clone https://github.com/Alicepoltora/hedera-tools.git
cd hedera-tools
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in your OPERATOR_ACCOUNT_ID and OPERATOR_PRIVATE_KEY
# Get a free testnet account at https://portal.hedera.com
```

### 3. Run scripts
```bash
# Create a new Hedera account
npm run create-account

# Deploy Carbon Credit token (CCR)
npm run create-token

# Create an HCS sustainability topic
npm run create-topic

# Start the API server
npm run dev
```

---

## 🗂️ Project Structure

```
hedera-tools/
├── src/
│   ├── index.js               # Express API server entry point
│   ├── services/
│   │   ├── hederaClient.js    # Hedera SDK client factory
│   │   ├── tokenService.js    # HTS: create/mint/transfer tokens
│   │   └── topicService.js    # HCS: create topics, submit & read messages
│   ├── routes/                # API route handlers (coming soon)
│   ├── contracts/             # Solidity smart contracts (coming soon)
│   └── utils/                 # Shared helpers
├── scripts/
│   ├── createAccount.js       # One-off: create testnet account
│   ├── createToken.js         # One-off: deploy CCR token
│   └── createTopic.js         # One-off: create HCS topic
├── tests/                     # Unit & integration tests
├── docs/                      # Architecture diagrams, research notes
├── .env.example
└── package.json
```

---

## 🌍 Architecture

```
User / Company
     │
     ▼
REST API (Express)
     │
     ├── HTS ──► Carbon Credit Token (CCR)
     │           • mint credits when CO₂ offset is verified
     │           • transfer to buyers / retire on redemption
     │
     └── HCS ──► Sustainability Data Topic
                 • immutable log of emissions events
                 • verifiable audit trail on-chain
```

---

## 🔑 Environment Variables

| Variable | Description |
|---|---|
| `HEDERA_NETWORK` | `testnet` \| `mainnet` \| `previewnet` |
| `OPERATOR_ACCOUNT_ID` | Your Hedera account ID (e.g. `0.0.12345`) |
| `OPERATOR_PRIVATE_KEY` | DER-encoded ECDSA private key |
| `MIRROR_NODE_URL` | Mirror node base URL |
| `PORT` | API server port (default `3000`) |

---

## 📚 Resources

- [Hedera Docs](https://docs.hedera.com)
- [Hedera SDK JS](https://github.com/hashgraph/hedera-sdk-js)
- [Mirror Node API](https://testnet.mirrornode.hedera.com/api/v1/docs/)
- [Hedera Portal (Testnet)](https://portal.hedera.com)
- [Hackathon Resources](https://hellofuturehackathon.dev/resources)

---

## 📄 License

MIT

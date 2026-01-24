# VoteChainAI

**Civic Infrastructure for the AI Era**

A production-grade, blockchain-backed voting platform with AI-assisted integrity monitoring.

---

## 🏗️ Architecture

```
VoteChainAI/
│
├── frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── api/            # API client
│   │   ├── components/     # NavBar, etc.
│   │   ├── context/        # Auth context
│   │   ├── pages/          # Landing, Login, Register, Dashboard, Admin, Verify
│   │   └── App.tsx         # Router
│   └── package.json
│
├── backend/                # FastAPI + SQLite
│   ├── app/
│   │   ├── api/            # Auth, Elections, Votes, Audit endpoints
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Blockchain, Auth services
│   │   └── main.py         # App entry
│   └── requirements.txt
│
└── blockchain/             # Solidity + Hardhat
    ├── contracts/
    │   └── VoteLedger.sol
    ├── scripts/
    │   └── deploy.js
    └── test/
```

---

## 🔐 Security

| Feature | Implementation |
|---------|---------------|
| Passwords | bcrypt (12 rounds) |
| Authentication | JWT (HS256, 24h expiry) |
| Vote Privacy | Only SHA-256 hashes stored |
| Immutability | Blockchain-backed ledger |
| One Vote | DB constraint + smart contract |
| Roles | Admin, Voter, Auditor |

---

## 🚀 Quick Start

### 1. Backend (FastAPI + SQLite)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

**API Docs**: http://localhost:8000/docs

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

**App**: http://localhost:5173

### 3. Blockchain (Optional)

```bash
cd blockchain
npm install
npx hardhat node          # Terminal 1
npm run deploy            # Terminal 2
```

---

## 📱 Pages

| Page | Route | Auth | Description |
|------|-------|------|-------------|
| Landing | `/` | No | Hero, features, CTA |
| Login | `/login` | No | JWT login |
| Register | `/register` | No | Create account |
| Dashboard | `/dashboard` | Voter | Vote in elections |
| Admin | `/admin` | Admin | Manage elections |
| Verify | `/verify` | No | Verify vote hash |

---

## 📡 API Endpoints

### Authentication
```
POST /api/v1/auth/register  - Register user
POST /api/v1/auth/login     - Get JWT token
GET  /api/v1/auth/me        - Get profile
```

### Elections
```
POST /api/v1/elections/create      - Create (ADMIN)
GET  /api/v1/elections/active      - List active
POST /api/v1/elections/{id}/close  - Close (ADMIN)
```

### Voting
```
POST /api/v1/vote/cast          - Cast vote
GET  /api/v1/vote/verify/{hash} - Verify vote
```

### Audit
```
GET /api/v1/audit/logs  - View logs (ADMIN/AUDITOR)
```

---

## 🧪 Testing Flow

1. Open http://localhost:5173
2. **Register** as `admin` role
3. **Login** → redirected to Admin Panel
4. **Create election** + activate it
5. **Register** another user as `voter`
6. **Login** as voter → Dashboard
7. **Cast a vote** → get receipt with hash
8. Go to **Verify** → enter hash → see confirmation

---

## 📝 License

MIT License

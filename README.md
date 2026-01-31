# VoteChainAI

**Civic Infrastructure for the AI Era**

A production-grade, blockchain-backed voting platform with AI-assisted integrity monitoring.

---

## 🌐 Live Production Deployment

**Live URL:**  
👉 https://votechainai.duckdns.org

VoteChainAI is deployed on **AWS EC2 (Free Tier)** with a production-grade setup including **Docker**, **Nginx reverse proxy**, **HTTPS**, and **persistent storage**.  
The application supports **browser camera access**, which requires a secure HTTPS origin.

> ⚠️ Note: The application may be in demo mode depending on server uptime to stay within AWS Free Tier limits.

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

## ☁️ AWS Production Deployment

### Infrastructure
- **Cloud Provider:** AWS
- **Service:** EC2
- **Instance Type:** t2.micro (Free Tier)
- **OS:** Ubuntu 24.04 LTS
- **Region:** ap-south-1

---

### 🐳 Containerization Strategy

The entire application (frontend + backend) is packaged into a **single Docker image** using a multi-stage build:

- Frontend built with **Vite**
- Backend served using **FastAPI + Uvicorn**
- Static frontend files served via FastAPI
- Internal application port: `7860`

Docker runs **only on localhost** for security:
127.0.0.1:7860


---

### 🔀 Reverse Proxy (Nginx)

Nginx is used as a **reverse proxy** to:
- Expose the application publicly
- Route traffic to the Docker container
- Handle HTTPS termination


Internet (HTTPS)

↓

Nginx (80 / 443)

↓

Docker container (7860)


All frontend and backend API calls are routed through the **same origin**:

https://votechainai.duckdns.org/api/v1/

---


This avoids CORS issues in production.

---

### 🔐 HTTPS & Domain

- **Domain Provider:** DuckDNS (free subdomain)
- **Domain:** `votechainai.duckdns.org`
- **SSL Provider:** Let’s Encrypt (Certbot)
- **HTTPS:** Enforced with HTTP → HTTPS redirect
- **Auto Renewal:** Enabled via system timer

HTTPS is mandatory for:
- Browser camera access
- Secure authentication
- Modern browser APIs

---

### 🎥 Camera & Face Verification

Camera-based face registration and verification work because:
- Application is served over **HTTPS**
- No mixed-content (HTTP) requests exist
- API calls use **same-origin routing**

Browsers block camera access on insecure origins, which is why HTTPS was explicitly configured.

---

### 🗄️ Database & Persistence

- **Database:** SQLite
- **Persistence:** Docker volume mounted to host

Example:
```bash
-v ~/votechainai_data:/app/data
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

## 📸 Project Demo

Below is a walkthrough of the application functionality:

### 1. Authentication & Onboarding
![Landing](output/demo_01.png)
![Login](output/demo_02.png)
![Register](output/demo_03.png)
![Face Registration](output/demo_04.png)

### 2. Face Liveness & Verification
![Liveness Check](output/demo_05.png)
![Blink Detection](output/demo_06.png)
![Face Match](output/demo_07.png)
![Verification Success](output/demo_08.png)
![Verification Detail](output/demo_09.png)

### 3. Voting Process
![Dashboard](output/demo_10.png)
![Election List](output/demo_11.png)
![Ballot](output/demo_12.png)
![Voting Selection](output/demo_13.png)
![Confirm Vote](output/demo_14.png)

### 4. Verification & Admin
![Vote Receipt](output/demo_15.png)
![Cast Success](output/demo_16.png)
![ZK Verification](output/demo_17.png)
![Admin Panel](output/demo_18.png)
![Results](output/demo_19.png)

---

## 📝 License

MIT License

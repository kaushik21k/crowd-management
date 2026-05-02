# Quick Start — CrowdFlow

Get running in 5 minutes.

## Option 1: Local Development (Fastest)

### 1. Install Dependencies
```bash
pip install -r backend/requirements.txt
cd frontend && npm install && cd ..
```

### 2. Start Backend
```bash
cd backend
python -m uvicorn main:app --reload
```
→ Visit `http://localhost:8000` (should show `{"status":"ok"}`)

### 3. Start Frontend (new terminal)
```bash
cd frontend
npm run dev
```
→ Visit `http://localhost:5174`

### 4. Login
- **Admin:** `admin@crowdflow.com` / `admin123`
- **New User:** Click "Citizen Pass" → Register

**Done!** 🎉

---

## Option 2: Docker (Production-like)

### 1. Setup Environment
```bash
cp .env.production .env
# Edit .env: set DATABASE_URL, SECRET_KEY
```

### 2. Run Stack
```bash
docker compose up --build
```

### 3. Login
- Visit `http://localhost:5173`
- Use `admin@crowdflow.com` / `admin123`

**Done!** 🎉

---

## Testing the API

### Health Check
```bash
curl http://localhost:8000/
```

### Register & Login (Bash/PowerShell)
```bash
# Register citizen
curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com"}'

# Login admin
TOKEN=$(curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crowdflow.com","password":"admin123"}' | jq -r .access_token)

# Get user info
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/me
```

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@crowdflow.com` | `admin123` |

---

## Troubleshooting

**"Backend won't start"** → Check port 8000 is free: `lsof -i :8000`

**"Frontend can't reach API"** → Set `VITE_BACKEND_URL=http://localhost:8000`

**"Database error"** → Check `.env` has `DATABASE_URL` set

---

## Next Steps

- [ ] Read [README.md](README.md) for full docs
- [ ] Read [DEPLOYMENT.md](DEPLOYMENT.md) for production setup with Supabase
- [ ] Change default admin password
- [ ] Create staff/citizen users
- [ ] Deploy to production

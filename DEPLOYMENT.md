# Deployment Guide — CrowdFlow

Complete guide for deploying CrowdFlow to production with Supabase.

## Overview

- **Backend:** FastAPI running in Docker on port 8000
- **Frontend:** Vite (React) running in Docker on port 5173
- **Database:** Supabase PostgreSQL (required for production)
- **Orchestration:** Docker Compose manages all services

---

## Prerequisites

1. **Supabase Account** — Free at [supabase.com](https://supabase.com)
2. **Docker & Docker Compose** — [docker.com/products/docker-desktop](https://docker.com/products/docker-desktop)
3. **Git** — For cloning and version control

---

## Step 1: Create Supabase Project

### 1a. Create Project
1. Log in to [supabase.com](https://supabase.com)
2. Click **New Project** → name it `crowdflow`
3. Select database password (save this!)
4. Choose region closest to your users
5. Wait for creation (2-3 minutes)

### 1b. Get Connection String
1. Go to **Settings** → **Database** → **Connection String**
2. Choose **URI** mode (not SQL mode)
3. Copy the PostgreSQL connection string
4. Replace `[YOUR-PASSWORD]` with your database password

Example:
```
postgresql://postgres:YOUR_PASSWORD@db.diokypqrfjowimrlgsye.supabase.co:5432/postgres?sslmode=require
```

---

## Step 2: Configure Environment

### 2a. Copy Production Template
```bash
cd /path/to/crowd\ management
cp .env.production .env
```

### 2b. Edit `.env` File

Open `.env` and set these values:

```env
# From Supabase (Step 1b)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres?sslmode=require

# Generate a random 32+ character string
SECRET_KEY=abcdefghijklmnopqrstuvwxyz123456789

# From Supabase Dashboard > API settings
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Your API domain (set after deployment)
VITE_BACKEND_URL=https://api.yourdomain.com

# Production: disable SQLite fallback (fail fast if DB down)
ALLOW_SQLITE_FALLBACK=false
```

**Important:** Keep `.env` secure — never commit to git!

---

## Step 3: Build & Deploy

### 3a. Build Docker Images
```bash
docker compose build
```

This creates images for backend, frontend, and postgres (local fallback).

### 3b. Start Services
```bash
docker compose up
```

Expected output:
```
db_1        | SUCCESS: Database started
backend_1   | INFO:     Uvicorn running on http://0.0.0.0:8000
frontend_1  | > vite
```

### 3c. Verify Services
1. **Backend health:** `curl http://localhost:8000/`
   ```json
   {"status":"ok"}
   ```
2. **Frontend:** Open `http://localhost:5173` in browser
3. **Admin login:** `admin@crowdflow.com` / `admin123`

---

## Step 4: Verify Database

### 4a. Check Tables in Supabase
1. Log in to Supabase dashboard
2. Go to **SQL Editor**
3. Run:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   ```
   Should return: `users`, `zones`, `entries`, `alembic_version`

### 4b. Check Postgres Logs
```bash
# View backend logs
docker compose logs backend

# View database logs
docker compose logs db
```

Look for any connection errors or migration issues.

---

## Step 5: Production Hardening

### 5a. SSL Certificate
For HTTPS, use a reverse proxy (nginx) or cloud provider:
- **AWS:** Elastic Load Balancer + ACM certificate
- **Azure:** Application Gateway + Azure Key Vault
- **GCP:** Cloud Load Balancer + SSL cert

### 5b. Environment Secrets
**Never hardcode secrets.** Use:
- **Docker Secrets** (Swarm)
- **AWS Secrets Manager**
- **Azure Key Vault**
- **HashiCorp Vault**

Update `docker-compose.yml` to use secrets:
```yaml
backend:
  environment:
    - SECRET_KEY_FILE=/run/secrets/secret_key
  secrets:
    - secret_key

secrets:
  secret_key:
    external: true  # Create with: docker secret create secret_key <file>
```

### 5c. Database Backups
Enable Supabase backups:
1. Go to **Settings** → **Backups**
2. Enable **Automated Backups**
3. Set backup frequency (daily recommended)

### 5d. Restart Policy
Update `docker-compose.yml`:
```yaml
backend:
  restart_policy:
    condition: on-failure
    delay: 5s
    max_attempts: 3

frontend:
  restart_policy:
    condition: on-failure
```

### 5e. Monitoring
Set up logs/alerts:
```bash
# Use syslog or external logging
docker compose logs -f backend | /usr/bin/logger -t crowdflow-backend
```

---

## Step 6: Custom Domain (Optional)

### 6a. Point Domain to Server
1. Get server IP: `curl https://ifconfig.me`
2. Add DNS record (A record):
   ```
   api.yourdomain.com → YOUR.SERVER.IP.ADDR
   ```

### 6b. Update `.env`
```env
VITE_BACKEND_URL=https://api.yourdomain.com
```

### 6c. Restart Backend
```bash
docker compose restart backend
```

---

## Troubleshooting

### ❌ "DATABASE_URL not set"
**Cause:** Environment variable missing  
**Fix:** Set `DATABASE_URL` in `.env` before running docker

### ❌ "Supabase connection refused"
**Cause:** Invalid password or host unreachable  
**Fix:**
1. Verify password in `.env` matches Supabase
2. Check host is correct: `ping db.YOUR_PROJECT_ID.supabase.co`
3. Ensure firewall allows outbound port 5432

### ❌ "SSL: CERTIFICATE_VERIFY_FAILED"
**Cause:** sslmode in connection string incorrect  
**Fix:** Ensure `sslmode=require` at end of DATABASE_URL

### ❌ "ALLOW_SQLITE_FALLBACK missing"
**Cause:** Production running on SQLite instead of Supabase  
**Fix:** Set `ALLOW_SQLITE_FALLBACK=false` in `.env`

### ❌ "Tables not created in Supabase"
**Cause:** Backend connected to local SQLite, not Postgres  
**Check:** Look for "Falling back to local SQLite" in logs
**Fix:**
```bash
# View backend logs
docker compose logs backend | grep -i "database\|supabase\|fallback"
```

### ❌ "Frontend shows blank page"
**Cause:** `VITE_BACKEND_URL` not set or wrong  
**Fix:**
1. Open browser console (F12)
2. Check Network tab for failed requests to `/me`
3. Update `VITE_BACKEND_URL` in `.env`
4. Rebuild frontend: `docker compose up --build frontend`

### ❌ "Can't login: 'Invalid credentials'"
**Cause:** User not in database  
**Fix:** Use default admin: `admin@crowdflow.com` / `admin123`  
**Note:** If this fails, check backend logs for SQLite/Postgres errors

---

## Scaling Considerations

### Database
- **Small:** Supabase Free tier (up to 500 MB storage)
- **Medium:** Supabase Pro ($25/month, 8GB storage)
- **Large:** Dedicated PostgreSQL instance with WAL replication

### Backend
- **Stateless:** Multiple backends can run behind load balancer
- **Concurrency:** Use Gunicorn with workers: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app`
- **Rate Limiting:** Add middleware in `main.py`:
  ```python
  from slowapi import Limiter
  from slowapi.util import get_remote_address
  
  limiter = Limiter(key_func=get_remote_address)
  app.state.limiter = limiter
  ```

### Frontend
- **CDN:** Serve static assets from CloudFront/Cloudflare
- **Caching:** Set long cache headers for `.js`/`.css`

---

## Maintenance

### Weekly
- [ ] Check Supabase backups are running
- [ ] Review error logs: `docker compose logs --tail 100 backend`
- [ ] Monitor disk usage: `docker system df`

### Monthly
- [ ] Update dependencies: `pip freeze > backend/requirements.txt`
- [ ] Review security: `docker scout cves --only-severity high`
- [ ] Check for updates: `docker image inspect postgres:15` → new version available?

### Quarterly
- [ ] Disaster recovery test: restore from Supabase backup
- [ ] Performance audit: check slow logs in Supabase
- [ ] Security audit: rotate JWT secret if needed

---

## Rollback Plan

If deployment fails:

### 1. Stop Current Services
```bash
docker compose down
```

### 2. Restore Previous Version
```bash
git checkout <previous-tag>
docker compose build
docker compose up
```

### 3. Restore Database
Supabase keeps 7-day backup history:
1. Go to Supabase **Settings** → **Backups**
2. Click **Restore** on desired backup
3. Verify in SQL Editor

---

## Performance Tips

1. **Connection Pooling:** Supabase has built-in connection pooling
2. **Query Optimization:** Use database indices (check `models.py`)
3. **Caching:** Add Redis to `docker-compose.yml`:
   ```yaml
   redis:
     image: redis:7-alpine
     ports:
       - "6379:6379"
   ```
4. **Compression:** Enable gzip in nginx reverse proxy

---

## Security Checklist

- [ ] `ALLOW_SQLITE_FALLBACK=false` in production
- [ ] JWT `SECRET_KEY` is random and 32+ characters
- [ ] Database password is strong (20+ chars, mixed case/numbers/symbols)
- [ ] Supabase Row Level Security (RLS) policies configured (optional)
- [ ] CORS configured to allow only your frontend domain
- [ ] Rate limiting enabled on API endpoints
- [ ] HTTPS enforced (redirect HTTP → HTTPS)
- [ ] Database backups enabled and tested
- [ ] Admin credentials changed from defaults
- [ ] Dependencies updated and scanned for vulnerabilities

---

## Support & Resources

- **Supabase Docs:** https://supabase.com/docs
- **FastAPI Docs:** https://fastapi.tiangolo.com
- **Docker Docs:** https://docs.docker.com
- **PostgreSQL Docs:** https://www.postgresql.org/docs

---

**Last Updated:** April 30, 2026  
**Status:** Production-ready

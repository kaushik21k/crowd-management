# CrowdFlow — Project Modules & Architecture

## Project Overview

CrowdFlow is a crowd management system with real-time monitoring, QR code scanning, and role-based access control (RBAC). The architecture follows a three-tier model:
- **Backend:** FastAPI REST API with WebSocket support
- **Frontend:** React + Vite SPA
- **Database:** SQLite (dev) 

---

## Backend Modules

### 1. `main.py` — FastAPI Application Core
**Purpose:** Entry point, route handlers, WebSocket manager  
**Key Endpoints:**
- `POST /register` — Citizen registration with QR generation
- `POST /login` — JWT-based authentication
- `POST /scan` — QR scan entry recording
- `GET /admin/dashboard_data` — Admin statistics
- `WebSocket /ws` — Real-time broadcast for live updates

**Dependencies:** database, models, schemas, auth  
**Use:** Start backend with `uvicorn main:app --reload`

---

### 2. `models.py` — SQLAlchemy ORM Models
**Purpose:** Database table definitions  
**Models:**
- `User` — Citizens, staff, admins with roles
- `Zone` — Entry zones with capacity tracking
- `Entry` — Scan records linking users to zones
- `UserRole` — Enum for RBAC (admin, staff, citizen)

**Relationships:**
- User ↔ Entry (one-to-many)
- Zone ↔ Entry (one-to-many)

**Use:** Referenced by main.py for CRUD operations

---

### 3. `schemas.py` — Pydantic Request/Response Models
**Purpose:** API request/response validation and documentation  
**Schemas:**
- `UserCreate` — Registration payload
- `UserLogin` — Login credentials
- `UserOut` — User response (no password)
- `ZoneBase` / `ZoneUpdate` — Zone management
- `ScanRequest` — QR scan payload
- `Token` — JWT response

**Use:** Type hints in main.py endpoints, auto-generates Swagger docs

---

### 4. `database.py` — SQLAlchemy Engine & Session
**Purpose:** Database connection management  
**Features:**
- Supports SQLite (dev) and PostgreSQL (prod)
- Automatic fallback to SQLite if Supabase unreachable
- Connection pooling for PostgreSQL
- Environment variable configuration

**Use:** Imported by main.py for SessionLocal dependency

---

### 5. `auth.py` — Authentication & Authorization
**Purpose:** JWT tokens, password hashing, role checking  
**Key Functions:**
- `get_password_hash()` — bcrypt password hashing
- `verify_password()` — Compare hashed passwords
- `create_access_token()` — Generate JWT with role
- `get_current_user_data()` — Extract user from token
- `check_staff_role()` — Verify staff/admin access
- `check_admin_role()` — Verify admin-only access

**Use:** Called in main.py route decorators for security

---

### 6. `requirements.txt` — Python Dependencies
**Key Packages:**
- fastapi, uvicorn — Web framework
- sqlalchemy, psycopg2-binary — Database ORM
- python-jose[cryptography] — JWT handling
- passlib[bcrypt] — Password hashing
- qrcode[pil] — QR code generation
- python-dotenv — .env file loading

---

### 7. `Dockerfile` — Backend Container Image
**Purpose:** Containerize FastAPI app for deployment  
**Base:** python:3.11-slim  
**Installs:** System libs for pillow, psycopg2, runs uvicorn on 0.0.0.0:8000

---

### 8. `check_db.py` — Database Verification Script
**Purpose:** Quick inspection of database contents  
**Checks:**
- Lists all tables
- Shows registered users and roles
- Useful for debugging data issues

**Use:** Run with `python check_db.py` from backend folder

---

## Frontend Modules

### 1. `App.jsx` — Root React Component
**Purpose:** Main app shell, navigation, route management  
**Features:**
- Navigation bar with role-based links
- View routing (login, register, dashboard, admin, staff)
- Authentication state management (localStorage)
- WebSocket listener for live updates

**Child Components:** Login, Registration, Dashboard, Admin, Staff

---

### 2. `components/Login.jsx` — User Authentication
**Purpose:** Email/password login form  
**Features:**
- Email + password input fields
- Show/hide password toggle
- Error message display
- JWT token storage on success

**API Call:** `POST /login`

---

### 3. `components/Registration.jsx` — Citizen Registration
**Purpose:** User self-registration with QR generation  
**Fields:**
- Full name, email, age, DOB
- Department, college email
- Blood group, mobile number, address

**Features:**
- Multi-column form layout
- QR code display + download on success
- Automatic QR code generation by backend

**API Call:** `POST /register`

---

### 4. `components/Dashboard.jsx` — Citizen View
**Purpose:** Display personal entry status  
**Shows:**
- User info from `/me` endpoint
- Whether user has entered event
- Zone name if already entered

**API Calls:** `GET /me`, live WebSocket updates

---

### 5. `components/Admin.jsx` — Admin Dashboard
**Purpose:** Event statistics and attendee management  
**Sections:**
- Stats cards: Total Registered, Total Entered, Not Entered Yet
- Attendee Database table (name, email, dept, age, status, zone)
- Export CSV button
- Live entry broadcasts via WebSocket

**API Calls:** `GET /admin/dashboard_data`, WebSocket `/ws`

---

### 6. `components/Staff.jsx` — Staff Scanner Interface
**Purpose:** QR code scanning for entry recording  
**Features:**
- Zone selection dropdown
- Access code authentication
- Triggers Scanner component
- Logout button

**Child Component:** Scanner

---

### 7. `components/Scanner.jsx` — QR Code Scanner
**Purpose:** Capture and submit QR scans  
**Features:**
- Uses html5-qrcode library
- Video stream from device camera
- Submits scanned QR to `/scan` endpoint
- Displays scan results (success/failure alerts)

**API Call:** `POST /scan`

---

### 8. `index.css` — Global Styles
**Purpose:** Design system and component styling  
**Features:**
- CSS variables (colors, spacing)
- Dark theme (--bg-dark, --text-main)
- Utility classes (.form-group, .btn, .btn-primary)
- Glass panel effect cards
- Responsive grid layouts

**Key Classes:**
- `.glass-panel` — Card container
- `.form-group` — Form field wrapper
- `.form-control` — Input/select styling
- `.btn, .btn-primary, .btn-secondary` — Button styles

---

### 9. `App.css` — App-Specific Styles
**Purpose:** Component-level styling  
**Contains:** Hero section, next steps, animations

---

### 10. `main.jsx` — React Entry Point
**Purpose:** Mount React app to DOM  
**Loads:** App.jsx into #root element

---

### 11. `package.json` — Frontend Dependencies
**Key Packages:**
- react, react-dom — UI framework
- vite — Build tool
- html5-qrcode — QR scanner
- eslint — Linting

---

### 12. `vite.config.js` — Vite Build Configuration
**Purpose:** Configure Vite dev server and production build

---

### 13. `Dockerfile` — Frontend Container Image
**Base:** node:18-alpine  
**Runs:** `npm run dev` on 0.0.0.0:5173

---

## Scanner Module (Standalone)

### `scanner/scanner.py` — QR Scanner Service
**Purpose:** Alternative Python-based QR scanning (device scanning)  
**Use:** For dedicated scanning devices (Raspberry Pi, etc.)

---

## Configuration & Deployment

### 1. `.env` — Development Configuration
**Variables:**
- `DATABASE_URL` — Local SQLite path
- `SECRET_KEY` — JWT secret
- `VITE_BACKEND_URL` — Frontend API target
- `ALLOW_SQLITE_FALLBACK` — Enable/disable fallback

---

### 2. `.env.production` — Production Configuration
**Variables:**
- `DATABASE_URL` — Supabase PostgreSQL connection
- `SECRET_KEY` — Production secret (min 32 chars)
- `ALLOW_SQLITE_FALLBACK=false` — Fail fast if DB down

---

### 3. `docker-compose.yml` — Multi-Service Orchestration
**Services:**
- `db` — PostgreSQL (local dev fallback)
- `backend` — FastAPI on :8000
- `frontend` — Vite React on :5173

**Networks:** Default bridge, all services interconnected

---

## Documentation Files

### 1. `README.md` — Project Overview
Quick start, API endpoints, troubleshooting

### 2. `QUICK_START.md` — 5-Minute Setup Guide
Local dev and Docker-Compose steps

### 3. `DEPLOYMENT.md` — Production Guide
Supabase setup, Docker deployment, hardening

### 4. `SETUP_TEAM.md` — Teammate Onboarding
One-command setup script instructions

### 5. `SECURITY.md` — Security Best Practices
JWT, password hashing, role-based access

---

## Data Flow Diagram

```
┌─────────────┐
│   Frontend  │ (React + Vite)
│  App.jsx    │
└──────┬──────┘
       │ HTTP/WebSocket
       │
┌──────▼──────────────────────┐
│     Backend (FastAPI)       │
│ ┌────────────────────────┐  │
│ │   main.py             │  │
│ │ - /login, /register   │  │
│ │ - /scan, /zones       │  │
│ │ - /admin/dashboard    │  │
│ │ - /ws (broadcast)     │  │
│ └──────┬─────────────────┘  │
│        │                    │
│ ┌──────▼─────────────────┐  │
│ │   ORM Layer           │  │
│ │ - models.py           │  │
│ │ - schemas.py          │  │
│ │ - auth.py             │  │
│ └──────┬────────────────┘  │
└───────┼────────────────────┘
        │ SQL
        │
┌───────▼──────────────────┐
│ Database                 │
│ - SQLite (dev)           │
│ - PostgreSQL (prod)      │
│ Tables:                  │
│ - users, zones, entries  │
└──────────────────────────┘
```

---

## Module Dependencies

```
main.py
  ├── models.py (User, Zone, Entry)
  ├── schemas.py (validation)
  ├── auth.py (JWT, password hashing)
  └── database.py (SQLAlchemy engine)

auth.py
  └── No internal dependencies

models.py
  └── database.py (Base)

check_db.py
  └── sqlite3 (stdlib)

components/*
  ├── App.jsx (parent)
  ├── Login.jsx → /login API
  ├── Registration.jsx → /register API
  ├── Dashboard.jsx → /me, /ws
  ├── Admin.jsx → /admin/dashboard_data, /ws
  ├── Staff.jsx → Scanner.jsx
  └── Scanner.jsx → /scan API
```

---

## For Teammates

1. **Understanding the flow:** Start with README.md, then explore main.py
2. **Making changes:**
   - Backend: Edit models.py → schemas.py → main.py
   - Frontend: Edit components/ → index.css → vite.config.js
3. **Testing:** Use `/docs` Swagger UI or Postman for API
4. **Database inspection:** Use VS Code SQLite extension on crowdflow.db

---

**Last Updated:** May 2, 2026  
**Project:** CrowdFlow v1.0

# Team Setup (Windows)

Use this when sharing the project with another member.

## One-command setup

From the project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup-teammate.ps1
```

## What the script does

- checks Python and Node.js
- creates `.venv` if missing
- installs backend dependencies from `backend/requirements.txt`
- installs frontend dependencies from `frontend/package.json`
- creates `.env` from `.env.example` if `.env` is missing

## Optional flags

```powershell
# preview steps only
powershell -ExecutionPolicy Bypass -File .\setup-teammate.ps1 -DryRun

# reinstall .env from template
powershell -ExecutionPolicy Bypass -File .\setup-teammate.ps1 -ForceEnvRefresh

# also install scanner dependencies
powershell -ExecutionPolicy Bypass -File .\setup-teammate.ps1 -InstallScanner
```

## Run project after setup

Terminal 1 (backend):

```powershell
Set-Location .\backend
..\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2 (frontend):

```powershell
Set-Location .\frontend
npm run dev
```

Open:
- Frontend: http://localhost:5174
- Backend docs: http://localhost:8000/docs

## Notes for sharing

- Do not share your existing `.env` file with real secrets.
- Share `.env.example` and let each teammate create their own `.env`.
- If using Supabase, each teammate should set their own `DATABASE_URL` and `SECRET_KEY` in `.env`.

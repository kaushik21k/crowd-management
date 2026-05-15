# Project Modules Reference

This document maps the project into modules and explains what each module does, with the dependency lists from the requirements files used as the source for the package/module sections.

## Backend Modules

### Application and data layer

`backend/main.py`

- Main FastAPI application entry point.
- Registers routes for authentication, registration, scanning, zone management, staff management, and dashboard data.
- Configures CORS and startup initialization.
- Broadcasts live updates through WebSockets.

`backend/models.py`

- SQLAlchemy ORM models for users, zones, and entries.
- Defines the data relationships used by the backend.

`backend/schemas.py`

- Pydantic request and response models.
- Validates incoming payloads and shapes outgoing API responses.

`backend/database.py`

- Database engine and session setup.
- Reads `DATABASE_URL` and creates the SQLAlchemy base/session objects.

`backend/auth.py`

- Password hashing and verification helpers.
- JWT token creation and validation.
- Role checks for admin and staff access.

### Backend utility scripts

`backend/check_db.py`

- Inspection helper for the local database.

`backend/get_hash.py`

- Utility for generating password hashes.

`backend/update_admin.py`

- Updates the default admin credentials or hash values.

`backend/Dockerfile`

- Container build definition for the backend API.

### Backend requirements

Source file: `backend/requirements.txt`

| Package | Role in the backend |
| --- | --- |
| `fastapi` | Web API framework used for routes and request handling. |
| `uvicorn[standard]` | ASGI server used to run the FastAPI app. |
| `sqlalchemy` | ORM used for database models and queries. |
| `psycopg2-binary` | PostgreSQL driver used for production database connections. |
| `python-jose[cryptography]` | JWT token creation and decoding. |
| `passlib[bcrypt]` | Password hashing and verification. |
| `python-multipart` | Form parsing for login and upload-style requests. |
| `pydantic` | Data validation for schemas. |
| `qrcode[pil]` | QR code generation for registered users. |
| `pillow` | Image support required by QR generation. |
| `python-dotenv` | Loads environment variables from `.env`. |

## Frontend Modules

### React application files

`frontend/src/main.jsx`

- React entry point that mounts the app.

`frontend/src/App.jsx`

- Top-level application controller.
- Switches between login, registration, dashboard, admin, staff, and scanner flows.
- Persists auth state and user role.

`frontend/src/App.css`

- App-level styling for layout and animation details.

`frontend/src/index.css`

- Global styles for typography, spacing, cards, buttons, and form controls.

### Frontend feature components

`frontend/src/components/Login.jsx`

- Handles user login and token storage.

`frontend/src/components/Registration.jsx`

- Handles citizen registration and QR code display.

`frontend/src/components/Dashboard.jsx`

- Displays live crowd status, zone data, and recent activity.

`frontend/src/components/Admin.jsx`

- Admin panel for zones, staff, and system management.

`frontend/src/components/Staff.jsx`

- Staff-facing entry point for selecting a zone and launching scanning.

`frontend/src/components/Scanner.jsx`

- Browser-based QR scanner that reads camera input and sends scan requests.

### Frontend build and tooling

`frontend/package.json`

- Declares scripts, dependencies, and devDependencies.

`frontend/vite.config.js`

- Vite build and development server configuration.

`frontend/Dockerfile`

- Container build definition for the frontend app.

### Frontend requirements

Source file: `frontend/package.json`

| Package | Role in the frontend |
| --- | --- |
| `react` | UI framework. |
| `react-dom` | React DOM rendering. |
| `html5-qrcode` | Browser QR scanner used by the scanner component. |
| `@yudiel/react-qr-scanner` | Alternative QR scanning library available in the project dependencies. |
| `playwright` | Browser automation/testing support. |
| `vite` | Development server and production build tool. |
| `@vitejs/plugin-react` | React support for Vite. |
| `eslint` | Frontend linting. |
| `@eslint/js` | Core ESLint JavaScript configuration. |
| `eslint-plugin-react-hooks` | React hooks lint rules. |
| `eslint-plugin-react-refresh` | Fast refresh lint support. |
| `globals` | Shared global definitions for linting. |
| `@types/react` | Type definitions for React. |
| `@types/react-dom` | Type definitions for React DOM. |

## Scanner Module

`scanner/scanner.py`

- Standalone webcam QR scanner.
- Opens the camera, decodes QR codes, draws the detection outline, and POSTs the result to the backend `/scan` endpoint.

`scanner/README.md`

- Dedicated module documentation for the scanner folder.

### Scanner requirements

Source file: `scanner/requirements.txt`

| Package | Role in the scanner |
| --- | --- |
| `opencv-python` | Reads webcam frames, draws boxes, and displays the scanner window. |
| `pyzbar` | Decodes QR codes from camera frames. |
| `requests` | Sends scan payloads to the backend API. |
| `numpy` | Formats QR polygon points for OpenCV drawing. |
| `python-dotenv` | Loads scanner environment variables from `.env`. |

## Configuration And Documentation Files

`README.md`

- Main project overview.

`QUICK_START.md`

- Short setup guide for local development and Docker.

`DEPLOYMENT.md`

- Deployment notes and production setup guidance.

`SETUP_TEAM.md`

- Team onboarding and setup instructions.

`SECURITY.md`

- Security guidance and hardening notes.

`docker-compose.yml`

- Multi-service local orchestration for backend, frontend, and database.

`.env`

- Local runtime configuration.

`.env.example`

- Example environment file for new setups.

`.env.production`

- Production environment template.

## Module Summary

- Backend: API, auth, data, and scanning endpoints.
- Frontend: React UI, role-based views, and browser-based scanner.
- Scanner: Dedicated Python camera scanner for QR capture.
- Requirements files: dependency maps that define the runtime modules for each part of the project.
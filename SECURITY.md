# Security Guide — CrowdFlow

Security best practices for deployment and operation.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Secrets Management](#secrets-management)
3. [Network Security](#network-security)
4. [Database Security](#database-security)
5. [API Security](#api-security)
6. [Frontend Security](#frontend-security)
7. [Compliance & Monitoring](#compliance--monitoring)

---

## Authentication & Authorization

### JWT Configuration
- **Current:** 10-hour token expiry (production should use 1-2 hours)
- **Risk:** Stolen token can be used for 10 hours
- **Fix:** Update `ACCESS_TOKEN_EXPIRE_MINUTES` in `backend/auth.py`:
  ```python
  ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 hour
  ```

### Default Admin Credentials
- **Current:** `admin@crowdflow.com` / `admin123`
- **Risk:** Widely known, easy to brute force
- **Fix:** Change immediately in production:
  1. Login as admin
  2. Change password (implement password change endpoint)
  3. Or update in database directly

### Password Requirements
- **Current:** Minimum 8 characters (defined in schemas)
- **Requirement:** Enforce in production
- **Implementation:**
  ```python
  # In schemas.py
  from pydantic import validator
  
  class UserCreate(BaseModel):
      password: str
      
      @validator('password')
      def validate_password(cls, v):
          if len(v) < 12:
              raise ValueError('Password must be 12+ characters')
          if not any(c.isupper() for c in v):
              raise ValueError('Password must contain uppercase')
          if not any(c.isdigit() for c in v):
              raise ValueError('Password must contain numbers')
          return v
  ```

### Role-Based Access Control (RBAC)
- **Current:** Three roles: admin, staff, citizen
- **Status:** ✅ Properly implemented with `check_admin_role()` and `check_staff_role()` dependencies
- **Review:** Verify no unprotected endpoints

---

## Secrets Management

### Environment Variables
- **Problem:** Secrets in `.env` file could be committed to git
- **Solution:**
  ```bash
  # Add to .gitignore
  .env
  .env.local
  .env.*.local
  
  # Version control only
  .env.example
  ```

### SECRET_KEY Rotation
- **Current:** Single key for all JWT tokens
- **Production Plan:**
  1. Generate new SECRET_KEY
  2. Add old key to `PREVIOUS_SECRETS` list
  3. Accept tokens signed with either current or previous keys
  4. After token expiry period, remove previous key
  ```python
  # In auth.py
  SECRET_KEY = os.getenv("SECRET_KEY")
  PREVIOUS_SECRETS = os.getenv("PREVIOUS_SECRETS", "").split(",")
  
  def verify_token(token):
      # Try current secret
      try:
          return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
      except JWTError:
          # Try previous secrets for backward compatibility
          for prev_secret in PREVIOUS_SECRETS:
              try:
                  return jwt.decode(token, prev_secret, algorithms=[ALGORITHM])
              except JWTError:
                  continue
          raise
  ```

### Supabase Credentials
- **Risk:** Connection string contains password
- **Mitigation:**
  - Use Supabase IAM roles instead of connection strings (if available)
  - Store connection string in AWS Secrets Manager / Azure Key Vault
  - Rotate Postgres password quarterly
  - Use connection pooling to limit exposed connections

---

## Network Security

### HTTPS/TLS
- **Current:** Development runs on HTTP
- **Production Requirement:** HTTPS only
- **Implementation:**
  - Use reverse proxy (nginx, HAProxy, AWS ALB)
  - Install SSL certificate (Let's Encrypt free or commercial)
  - Redirect all HTTP → HTTPS
  - Set `HSTS` header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### CORS Configuration
- **Current:** Development allows all origins (`allow_origins=["*"]`)
- **Production:** Restricted (see main.py)
- **Verification:**
  ```bash
  curl -H "Origin: http://malicious.com" \
       -H "Access-Control-Request-Method: POST" \
       http://localhost:8000/
  # Should NOT return Access-Control-Allow-Origin
  ```

### Rate Limiting
- **Current:** Not implemented
- **Implementation:**
  ```python
  from slowapi import Limiter
  from slowapi.util import get_remote_address
  
  limiter = Limiter(key_func=get_remote_address)
  app.state.limiter = limiter
  
  @app.post("/login")
  @limiter.limit("5/minute")
  async def login(creds: schemas.UserLogin):
      # Login endpoint
      pass
  ```

### Firewall Rules
- **Inbound:**
  - Allow port 443 (HTTPS) from anywhere
  - Allow port 80 (HTTP redirect) from anywhere
  - Allow port 5432 (Postgres) from app servers only
- **Outbound:**
  - Allow DNS to public resolvers
  - Allow HTTPS to Supabase (if not local DB)

---

## Database Security

### Connection String Security
- **Never log:** Connection string includes password
- **Implementation:**
  ```python
  # Mask sensitive parts in logs
  def mask_connection_string(url: str) -> str:
      if "postgresql" in url:
          return url.split("@")[1]  # Hide user:pass part
      return url
  ```

### Row-Level Security (RLS)
- **Current:** Not implemented
- **Benefit:** Database enforces user permissions
- **Supabase Implementation:**
  1. Enable RLS on all tables
  2. Create policies:
     ```sql
     CREATE POLICY user_policy ON users
     FOR SELECT USING (auth.uid() = id OR auth.role() = 'admin');
     ```

### SQL Injection Prevention
- **Current:** ✅ Safe (using SQLAlchemy ORM, parameterized queries)
- **Always:** Never use `db.execute(f"SELECT * FROM users WHERE email = '{email}'")`

### Database Backups
- **Supabase:** Automatic daily backups (7-day retention)
- **Test:** Restore from backup quarterly to verify integrity
- **Off-site:** Consider exporting to S3 for long-term retention

---

## API Security

### Input Validation
- **Current:** ✅ Implemented via Pydantic schemas
- **Verify:** All endpoints validate input types and ranges
- **Example:**
  ```python
  from pydantic import BaseModel, Field, validator
  
  class UserCreate(BaseModel):
      name: str = Field(..., min_length=1, max_length=100)
      email: EmailStr  # Built-in email validation
      age: int = Field(..., ge=0, le=150)
  ```

### Output Filtering
- **Risk:** Expose sensitive data in responses
- **Current:** UserOut schema excludes `hashed_password`
- **Verify:** No sensitive fields in API responses

### Error Handling
- **Current:** May leak system information in error messages
- **Fix:** Generic error messages in production
  ```python
  @app.exception_handler(Exception)
  async def general_exception_handler(request, exc):
      if ENVIRONMENT == "development":
          raise exc
      return {"detail": "Internal server error"}
  ```

### API Versioning
- **Current:** No versioning (/v1/, /v2/)
- **Recommendation:** Add versioning for backward compatibility
  ```
  GET /v1/zones
  GET /v2/zones  # New features
  ```

---

## Frontend Security

### XSS (Cross-Site Scripting) Prevention
- **React:** ✅ Automatic escaping (use dangerouslySetInnerHTML only with sanitized content)
- **User Input:** Never inject unsanitized HTML:
  ```jsx
  // ✅ Safe
  <div>{userInput}</div>
  
  // ❌ Unsafe
  <div dangerouslySetInnerHTML={{ __html: userInput }} />
  ```

### CSRF (Cross-Site Request Forgery) Prevention
- **Current:** JWT in Authorization header (safe)
- **Risk:** GET requests with cookies
- **Mitigation:** Only use POST/PUT/DELETE for state changes

### localStorage Security
- **Current:** JWT stored in localStorage (accessible via XSS)
- **Risk:** If XSS vulnerability exists, attacker can steal token
- **Options:**
  1. **httpOnly cookies** (better but requires backend support)
     ```python
     response.set_cookie("auth_token", jwt_token, httponly=True, secure=True)
     ```
  2. **Memory storage** (lost on page refresh)
     ```jsx
     const [token, setToken] = useState(null);  // Lost on refresh
     ```

### Dependency Vulnerabilities
- **Check:** `npm audit` and `pip audit`
- **Regular:** Run weekly to catch new vulnerabilities
- **Automate:** Use GitHub dependabot or similar

---

## Compliance & Monitoring

### Logging
- **Current:** Basic FastAPI/Uvicorn logs
- **Production:** Implement structured logging
  ```python
  import logging
  from pythonjsonlogger import jsonlogger
  
  logHandler = logging.StreamHandler()
  formatter = jsonlogger.JsonFormatter()
  logHandler.setFormatter(formatter)
  logger = logging.getLogger()
  logger.addHandler(logHandler)
  ```

### Audit Trail
- **Implement:** Log all admin actions
  ```python
  def audit_log(action: str, user_id: int, details: dict):
      logger.info({
          "action": action,
          "user_id": user_id,
          "timestamp": datetime.utcnow(),
          "details": details
      })
  ```

### Intrusion Detection
- **Options:**
  - Fail2ban (blocks repeated login failures)
  - AWS WAF (managed rules)
  - Cloudflare (DDoS protection)

### Data Privacy
- **GDPR Compliance:**
  - [ ] Right to be forgotten: DELETE endpoint for users
  - [ ] Data portability: EXPORT endpoint for users
  - [ ] Consent tracking: Record consent for data processing
  - [ ] Privacy policy: Published and accepted at registration

- **Implementation:**
  ```python
  @app.delete("/me")
  async def delete_user(current_user: dict = Depends(get_current_user)):
      """Delete user and all associated data"""
      db.query(Entry).filter(Entry.user_id == current_user['id']).delete()
      db.query(User).filter(User.id == current_user['id']).delete()
      db.commit()
      return {"message": "User deleted"}
  ```

### Penetration Testing
- **Before Production:** Run security audit
  - OWASP Top 10 check
  - SQL injection tests
  - XSS/CSRF tests
  - Authentication bypass attempts

---

## Pre-Production Checklist

- [ ] Change default admin password
- [ ] Set random 32+ character SECRET_KEY
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Restrict CORS to your domain
- [ ] Set DATABASE_URL to Supabase
- [ ] Set ALLOW_SQLITE_FALLBACK=false
- [ ] Enable database backups
- [ ] Run `npm audit` and fix high vulnerabilities
- [ ] Run `pip audit` and fix high vulnerabilities
- [ ] Enable rate limiting on login/registration
- [ ] Set up monitoring/alerting
- [ ] Test disaster recovery (restore from backup)
- [ ] Run OWASP security checklist
- [ ] Get security audit from third party (optional)

---

## Incident Response

### If Private Data Leaked
1. Stop the breach (take system offline if needed)
2. Identify: What data, who accessed, when
3. Notify: Users affected, regulatory bodies (if required)
4. Remediate: Rotate secrets, patch vulnerabilities
5. Review: Post-incident analysis, improve processes

### If Server Compromised
1. Isolate: Disconnect from network
2. Backup: Preserve evidence for analysis
3. Restore: Use known-good backup
4. Secure: Apply security patches
5. Verify: Audit logs for unauthorized access

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/security)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-syntax.html)

---

**Last Updated:** April 30, 2026  
**Maintained By:** CrowdFlow Security Team

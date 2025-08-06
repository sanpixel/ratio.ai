# OAuth Integration & Database Setup - January 5, 2025

## Summary
Successfully implemented Google OAuth authentication with persistent PostgreSQL database storage using Supabase, resolving all login/logout functionality issues.

## Issues Identified & Resolved

### Primary Issue: No Persistent Database
**Problem**: OAuth was failing because the app was using in-memory SQLite on Cloud Run, causing all user sessions and data to be lost on container restarts.

**Root Cause**: In-memory database (`sqlite:///:memory:`) doesn't persist data across container lifecycle events.

**Solution**: Migrated to PostgreSQL with Supabase for persistent storage.

## Implementation Details

### 1. Database Migration
- **From**: In-memory SQLite (`sqlite:///:memory:`)
- **To**: PostgreSQL via Supabase (`postgresql://postgres:[password]@db.liisrjaardnnvoeptzhd.supabase.co:5432/postgres`)
- **Tables Created**: `users` and `saved_recipes` with proper foreign key relationships

### 2. Backend Changes
**Files Modified:**
- `backend/requirements.txt` - Added `psycopg2-binary==2.9.9`
- `backend/database.py` - Updated to use PostgreSQL on Cloud Run, SQLite locally
- `backend/models.py` - Changed from SQLite-specific JSON to standard SQLAlchemy JSON type
- `.github/workflows/deploy-cloud-run.yml` - Added `DATABASE_URL` environment variable

**Key Logic:**
```python
if os.getenv("PORT"):
    # Running in Cloud Run - use PostgreSQL (Supabase)
    DATABASE_URL = os.getenv("DATABASE_URL")
else:
    # Running locally - use file-based SQLite
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ratio_ai.db")
```

### 3. Frontend OAuth Fixes
**File Modified:** `frontend/src/App.tsx`

**Issues Fixed:**
1. **Google Sign-In button not re-rendering after logout**
   - Added `renderGoogleSignInButton()` function
   - Added useEffect to watch user state and re-render button on logout

2. **Removed debug logout button**
   - Cleaned up red debug logout button from test recipe links section
   - Users now use proper "Sign Out" button in profile section

### 4. Infrastructure Setup
**Supabase Configuration:**
- Database URL: `postgresql://postgres:K8B-zz4cTL%26x%2FUi@db.liisrjaardnnvoeptzhd.supabase.co:5432/postgres`
- Password URL-encoded for special characters (`&` → `%26`, `/` → `%2F`)
- Added to GitHub Secrets as `DATABASE_URL`

**Cloud Run Deployment:**
- Environment variable `DATABASE_URL` automatically injected
- Tables created automatically on startup via SQLAlchemy `create_tables()`

## Technical Challenges Resolved

### 1. URL Encoding Issues
**Problem**: Database password contained special characters (`K8B-zz4cTL&x/Ui`)
**Solution**: URL-encoded special characters in connection string

### 2. SQLAlchemy Compatibility
**Problem**: SQLite-specific imports didn't work with PostgreSQL
**Solution**: Changed `from sqlalchemy.dialects.sqlite import JSON` to `from sqlalchemy import JSON`

### 3. OAuth Token Persistence
**Problem**: Access tokens were lost on container restarts
**Solution**: PostgreSQL database maintains user sessions and authentication state

### 4. Google Sign-In Button State Management
**Problem**: Button disappeared after logout and didn't re-appear
**Solution**: Added React useEffect to monitor user state changes and re-render button

## Current Architecture

### Database Schema
```sql
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    google_id VARCHAR UNIQUE NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    picture VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Saved recipes table
CREATE TABLE saved_recipes (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR NOT NULL,
    url VARCHAR NOT NULL,
    ingredients JSON NOT NULL,
    ratios JSON NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### OAuth Flow
1. User clicks "Sign in with Google"
2. Google OAuth popup appears
3. User authenticates with Google
4. Google returns credential token to frontend
5. Frontend sends token to `/api/auth/google`
6. Backend validates token with Google
7. Backend creates/updates user in PostgreSQL
8. Backend returns access token
9. Frontend stores token in localStorage
10. Frontend fetches user data and recent recipes

### Deployment Process
1. Code push to `dev` branch triggers GitHub Actions
2. Docker builds with `REACT_APP_GOOGLE_CLIENT_ID` build arg
3. Container deployed to Cloud Run with `DATABASE_URL` env var
4. Backend connects to Supabase PostgreSQL on startup
5. Tables created automatically if they don't exist

## Current Status
✅ **OAuth login/logout working perfectly**
✅ **User data persists across deployments** 
✅ **Recent recipes load and display correctly**
✅ **Google Sign-In button re-renders after logout**
✅ **Clean UI with proper logout button**
✅ **Database relationships and foreign keys working**

## Known Non-Critical Issues
- COOP (Cross-Origin-Opener-Policy) warning in browser console during OAuth flow
- This is harmless and doesn't affect functionality
- Common with third-party OAuth providers

## Future Enhancements
1. Admin panel to view registered users
2. User recipe management features
3. Recipe sharing between users
4. Export/import functionality

## Environment Variables Required
```bash
# GitHub Secrets
DATABASE_URL=postgresql://postgres:K8B-zz4cTL%26x%2FUi@db.liisrjaardnnvoeptzhd.supabase.co:5432/postgres
REACT_APP_GOOGLE_CLIENT_ID=[your-google-client-id]
GCP_PROJECT_ID=[your-gcp-project-id]
GCP_SA_KEY=[your-service-account-key]
```

## Key Learnings
1. **Always start with proper persistent storage for authentication systems**
2. **In-memory databases are unsuitable for production user authentication**
3. **URL encoding is critical for database passwords with special characters**
4. **React state management requires careful handling of async OAuth flows**
5. **Google Sign-In requires proper DOM element management for re-rendering**

## Commit History Today
1. `Add PostgreSQL support with Supabase for persistent OAuth and user data`
2. `Fix Google Sign-In button re-rendering after logout and remove debug logout button`

---
**Total Development Time**: ~10 hours  
**Primary Blocker**: Lack of persistent database (should have been identified immediately)  
**Final Result**: Fully functional OAuth authentication with persistent user data storage

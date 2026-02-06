# Quick Start Guide

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 18+ installed
- ✅ Supabase account (free tier works) OR PostgreSQL 14+ installed
- ✅ npm or yarn package manager

> **Recommended:** Use Supabase for easier setup. See `SUPABASE_SETUP.md` for detailed instructions.

## Step 1: Install Dependencies

```bash
npm run install:all
```

Or manually:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

## Step 2: Set Up Database

### Option A: Supabase (Recommended - Easiest)

1. **Create Supabase project:**
   - Go to [supabase.com](https://supabase.com) and create account
   - Click "New Project"
   - Fill in project details and wait for creation

2. **Get credentials:**
   - Go to Settings > API
   - Copy: Project URL, anon key, service_role key
   - Go to Settings > Database
   - Copy connection string (URI format)

3. **Configure environment:**
   
   Create `backend/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
   JWT_SECRET=deexhairlabb-super-secret-jwt-key-change-in-production-2024
   JWT_EXPIRES_IN=7d
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ```
   
   Create `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
   ```

   See `SUPABASE_SETUP.md` for detailed instructions.

### Option B: Local PostgreSQL

1. **Create `.env` file in `backend/` directory:**

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/deexhairlabb?schema=public"
JWT_SECRET=deexhairlabb-super-secret-jwt-key-change-in-production-2024
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

2. **Create the database:**

```bash
# Using psql
psql -U postgres -c "CREATE DATABASE deexhairlabb;"

# Or using createdb
createdb deexhairlabb
```

3. **Create `.env.local` file in `frontend/` directory:**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Step 3: Run Database Migrations

```bash
cd backend
npm run db:generate  # Generate Prisma client
npm run db:migrate    # Create database tables
npm run db:seed       # Seed initial data
```

## Step 4: Start Development Servers

### Option A: Start Both Servers (Recommended)

From the root directory:
```bash
npm run dev
```

This starts:
- Backend API on `http://localhost:3001`
- Frontend on `http://localhost:3000`

### Option B: Start Separately

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Step 5: Access the Application

1. Open your browser to `http://localhost:3000`
2. Register a new account or login with:
   - **Admin:** `admin@deexhairlabb.com` / `admin123`
   - **Client:** `client@example.com` / `client123`

## Troubleshooting

### PostgreSQL Connection Issues

**Check if PostgreSQL is running:**
```bash
# Windows
net start postgresql-x64-14  # or your version

# Check service status
Get-Service postgresql*
```

**Verify connection:**
```bash
psql -U postgres -h localhost -p 5432
```

### Port Already in Use

If port 3000 or 3001 is already in use:

1. **Backend:** Change `PORT` in `backend/.env`
2. **Frontend:** Update `NEXT_PUBLIC_API_URL` in `frontend/.env.local`

### Database Migration Errors

If migrations fail:
```bash
cd backend
npx prisma migrate reset  # WARNING: This deletes all data
npm run db:migrate
npm run db:seed
```

### Module Not Found Errors

Clear node_modules and reinstall:
```bash
rm -rf node_modules backend/node_modules frontend/node_modules
npm run install:all
```

## Development Workflow

1. **Backend changes:** The server auto-reloads with `tsx watch`
2. **Frontend changes:** Next.js hot-reloads automatically
3. **Database changes:** Update `prisma/schema.prisma`, then run:
   ```bash
   cd backend
   npm run db:migrate
   ```

## Testing the Platform

### As Admin:
1. Login with admin credentials
2. View dashboard with revenue analytics
3. Manage appointments
4. Create exports (Google Sheets)
5. Use AI chat for assistance

### As Client:
1. Register or login with client credentials
2. View your appointments
3. Book new appointments
4. Check availability
5. Chat with AI assistant

## Next Steps

- Configure Google Sheets API for exports (see `SETUP.md`)
- Set up AI/LLM API keys if using external services
- Customize business hours in appointment availability logic
- Add your own services and pricing

## Need Help?

- Check `SETUP.md` for detailed configuration
- Review `README.md` for architecture overview
- Check backend logs for API errors
- Check browser console for frontend errors

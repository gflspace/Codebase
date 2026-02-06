# Supabase Setup Guide

## 🚀 Quick Start with Supabase

Supabase provides a managed PostgreSQL database with additional features like authentication, real-time subscriptions, and storage.

## Step 1: Create Supabase Project

1. Go to [Supabase](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Fill in:
   - **Project Name:** `deexhairlabb` (or your choice)
   - **Database Password:** Choose a strong password (save it!)
   - **Region:** Choose closest to you
   - **Pricing Plan:** Free tier is fine for development

4. Wait for project to be created (2-3 minutes)

## Step 2: Get Your Supabase Credentials

Once your project is ready:

1. Go to **Project Settings** (gear icon)
2. Click **API** in the sidebar
3. Copy these values:

   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`) - **Keep this secret!**

## Step 3: Get Database Connection String

1. In Project Settings, click **Database**
2. Scroll to **Connection string**
3. Select **URI** tab
4. Copy the connection string
5. Replace `[YOUR-PASSWORD]` with your database password

Example:
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

## Step 4: Configure Environment Variables

### Backend Configuration

Create or update `backend/.env`:

```env
# Server
PORT=3001
NODE_ENV=development

# Supabase Database Connection
DATABASE_URL="postgresql://postgres:DeeXHairlabb@db.pqaixgefahswjoatmxsg.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"

# Supabase API
SUPABASE_URL=https://pqaixgefahswjoatmxsg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_kV9qj6-ll26lNncu_pF6mg_KU3lIjVT

# JWT (for our own auth system)
JWT_SECRET=deexhairlabb-super-secret-jwt-key-change-in-production-2024
JWT_EXPIRES_IN=7d

# Google Sheets API (for exports) - Optional
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEETS_FOLDER_ID=

# AI/LLM (if using external API) - Optional
AI_API_KEY=
AI_API_URL=

# CORS
FRONTEND_URL=http://localhost:3000
```

> **Note:** The `.env` file has been pre-configured with your Supabase credentials. If you need to update them, edit `backend/.env` directly.

### Frontend Configuration

Create or update `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://pqaixgefahswjoatmxsg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_YcbdMn7JTe74MJz7zl9f4Q_8Ox5Kdsa
```

> **Note:** The `.env.local` file has been pre-configured with your Supabase credentials. If you need to update them, edit `frontend/.env.local` directly.

## Step 5: Run Database Migrations

### Option A: Using Prisma Migrate (Recommended)

```bash
cd backend

# Generate Prisma client
npm run db:generate

# Run migrations (creates all tables)
npm run db:migrate

# Seed database with initial data
npm run db:seed
```

### Option B: Using Supabase SQL Editor

1. Go to your Supabase project
2. Click **SQL Editor** in the sidebar
3. Click **New query**
4. Copy and paste the SQL from `backend/prisma/migrations/` (after running migrate)
5. Click **Run**

## Step 6: Verify Database Setup

1. In Supabase, go to **Table Editor**
2. You should see tables:
   - `users`
   - `appointments`
   - `revenue_logs`
   - `content_posts`
   - `promotions`
   - `chat_messages`
   - `export_requests`
   - `audit_logs`

## Step 7: Start Development Servers

```bash
# From root directory
npm run dev
```

Or separately:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## Step 8: Test the Application

1. Open `http://localhost:3000`
2. Register a new account or login with seeded credentials:
   - **Admin:** `admin@deexhairlabb.com` / `admin123`
   - **Client:** `client@example.com` / `client123`

## 🔒 Security Notes

### Important:
- **Never commit** `.env` files to git
- **Never expose** `SUPABASE_SERVICE_ROLE_KEY` in frontend code
- **Service role key** has admin access - use only in backend
- **Anon key** is safe for frontend (has RLS policies)

### Row Level Security (RLS)

Supabase supports Row Level Security. You can enable it in Supabase dashboard:

1. Go to **Authentication** > **Policies**
2. Create policies for each table as needed
3. Or use our backend API for all data access (recommended for this project)

## 🛠️ Troubleshooting

### Connection Issues

**Error: "Can't reach database server"**
- Check your `DATABASE_URL` is correct
- Verify password is correct (no special characters need encoding)
- Check Supabase project is active (not paused)

**Error: "Connection pool timeout"**
- Add `?pgbouncer=true&connection_limit=1` to DATABASE_URL
- Supabase free tier has connection limits

### Migration Issues

**Error: "Migration failed"**
- Check you're using the correct database password
- Verify connection string format
- Try running migrations one at a time

### Port Issues

If ports 3000 or 3001 are in use:

**Backend:**
```env
PORT=3002  # Update in backend/.env
```

**Frontend:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3002  # Update in frontend/.env.local
```

## 📊 Supabase Dashboard Features

You can use Supabase dashboard for:

- **Table Editor:** View/edit data directly
- **SQL Editor:** Run custom queries
- **API Docs:** Auto-generated API documentation
- **Logs:** View database and API logs
- **Settings:** Manage project settings

## 🔄 Switching from Local PostgreSQL

If you were using local PostgreSQL:

1. Export data (if needed):
   ```bash
   pg_dump -U postgres deexhairlabb > backup.sql
   ```

2. Update `DATABASE_URL` in `backend/.env` to Supabase connection string

3. Run migrations:
   ```bash
   cd backend
   npm run db:migrate
   ```

4. Import data (if needed):
   ```bash
   psql -h db.xxxxx.supabase.co -U postgres -d postgres < backup.sql
   ```

## 📚 Additional Resources

- [Supabase Docs](https://supabase.com/docs)
- [Prisma + Supabase Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-supabase)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)

## ✅ Checklist

- [ ] Supabase project created
- [ ] Credentials copied (URL, anon key, service role key)
- [ ] Database connection string obtained
- [ ] `backend/.env` configured
- [ ] `frontend/.env.local` configured
- [ ] Dependencies installed (`npm run install:all`)
- [ ] Prisma client generated (`npm run db:generate`)
- [ ] Migrations run (`npm run db:migrate`)
- [ ] Database seeded (`npm run db:seed`)
- [ ] Servers started (`npm run dev`)
- [ ] Application tested in browser

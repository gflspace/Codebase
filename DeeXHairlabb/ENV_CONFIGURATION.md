# Environment Configuration

## ✅ Your Supabase Credentials (Pre-configured)

Your Supabase project is ready! Use these credentials to configure your environment files.

### Backend Configuration (`backend/.env`)

Create or update `backend/.env` with the following:

```env
# Server
PORT=3001
NODE_ENV=development

# Supabase Database Connection
DATABASE_URL="postgresql://postgres:DeeXHairlabb@db.pqaixgefahswjoatmxsg.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"

# Supabase API
SUPABASE_URL=https://pqaixgefahswjoatmxsg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_kV9qj6-ll26lNncu_pF6mg_KU3lIjVT

# JWT (for our own authentication system)
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

### Frontend Configuration (`frontend/.env.local`)

Create or update `frontend/.env.local` with the following:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://pqaixgefahswjoatmxsg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_YcbdMn7JTe74MJz7zl9f4Q_8Ox5Kdsa
```

## 📋 Quick Setup Commands

After creating the `.env` files above, run:

```bash
# 1. Generate Prisma client
cd backend
npm run db:generate

# 2. Run database migrations
npm run db:migrate

# 3. Seed the database
npm run db:seed

# 4. Start development servers
cd ..
npm run dev
```

## 🔑 Your Supabase Credentials Summary

- **Project URL:** `https://pqaixgefahswjoatmxsg.supabase.co`
- **Database Connection:** `postgresql://postgres:DeeXHairlabb@db.pqaixgefahswjoatmxsg.supabase.co:5432/postgres`
- **Publishable Key:** `sb_publishable_YcbdMn7JTe74MJz7zl9f4Q_8Ox5Kdsa`
- **Secret Key:** `sb_secret_kV9qj6-ll26lNncu_pF6mg_KU3lIjVT`

## ⚠️ Security Notes

- Never commit `.env` or `.env.local` files to git
- The secret key (`SUPABASE_SERVICE_ROLE_KEY`) should only be used in the backend
- The publishable key is safe for frontend use

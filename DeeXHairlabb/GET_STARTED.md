# 🚀 Get Started with DeeXHairlabb

## Quick Setup Guide

### Step 1: Create Supabase Project

1. Go to **[supabase.com](https://supabase.com)** and sign up/login
2. Click **"New Project"**
3. Fill in:
   - **Project Name:** `deexhairlabb` (or your choice)
   - **Database Password:** Choose a strong password ⚠️ **SAVE THIS!**
   - **Region:** Choose closest to you
   - **Pricing Plan:** Free tier works perfectly
4. Wait 2-3 minutes for project creation

### Step 2: Environment Files (Already Configured!)

✅ **Good news!** Your Supabase credentials have been pre-configured:

- `backend/.env` - Contains database connection and API keys
- `frontend/.env.local` - Contains frontend API configuration

**Your Supabase Configuration:**
- **Project URL:** `https://pqaixgefahswjoatmxsg.supabase.co`
- **Database:** Pre-configured with connection string
- **API Keys:** Pre-configured in both backend and frontend

> **Note:** If you need to update credentials, edit the `.env` files directly.

### Step 4: Run Database Migrations

```bash
cd backend
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Create all database tables
npm run db:seed      # Seed initial data (admin & client users)
```

### Step 5: Start Development Servers

```bash
# From root directory
npm run dev
```

This starts:
- **Backend API:** http://localhost:3001
- **Frontend App:** http://localhost:3000

### Step 6: Test the Application

1. Open **http://localhost:3000** in your browser
2. Login with seeded credentials:
   - **Admin:** `admin@deexhairlabb.com` / `admin123`
   - **Client:** `client@example.com` / `client123`

## 📋 Checklist

- [x] Supabase project created
- [x] Credentials configured (pre-configured in `.env` files)
- [x] Environment files created (`backend/.env` and `frontend/.env.local`)
- [ ] Dependencies installed (`npm run install:all`)
- [ ] Prisma client generated (`npm run db:generate`)
- [ ] Database migrated (`npm run db:migrate`)
- [ ] Database seeded (`npm run db:seed`)
- [ ] Servers started (`npm run dev`)
- [ ] Application tested in browser

## 🆘 Troubleshooting

### Script Won't Run

If you get execution policy errors:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Database Connection Issues

- Verify your `DATABASE_URL` in `backend/.env` is correct
- Check that password doesn't have special characters that need URL encoding
- Ensure Supabase project is active (not paused)

### Migration Errors

- Double-check database password is correct
- Verify connection string format
- Check Supabase project status in dashboard

### Port Already in Use

**Backend (3001):**
```env
PORT=3002  # Update in backend/.env
```

**Frontend:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3002  # Update in frontend/.env.local
```

## 📚 Additional Resources

- **Detailed Setup:** See `SUPABASE_SETUP.md`
- **Development Guide:** See `DEVELOPMENT.md`
- **Quick Start:** See `QUICKSTART.md`

## ✅ You're Ready!

Once you've completed all steps, your DeeXHairlabb platform is ready for development!

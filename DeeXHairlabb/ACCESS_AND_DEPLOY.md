# 🚀 Access, Test & Deploy Guide

## 📖 Table of Contents
1. [Accessing the Application Locally](#accessing-locally)
2. [Testing the Application](#testing)
3. [Deployment Guide](#deployment)

---

## 🌐 Accessing the Application Locally

### Step 1: Ensure Servers Are Running

**Check if servers are running:**
```powershell
# Check if ports are in use
Get-NetTCPConnection -LocalPort 3001,3000 -ErrorAction SilentlyContinue
```

**If servers are not running, start them:**
```bash
# From project root
npm run dev
```

This starts both:
- Backend on `http://localhost:3001`
- Frontend on `http://localhost:3000`

### Step 2: Access the Application

1. **Open your web browser** (Chrome, Firefox, Edge, etc.)

2. **Navigate to:**
   ```
   http://localhost:3000
   ```

3. **You should see:**
   - Login page (if not logged in)
   - Or redirect to dashboard/bookings (if already logged in)

### Step 3: Login

**Option A: Admin Login**
- Email: `admin@deexhairlabb.com`
- Password: `admin123`
- Access: Full admin dashboard, revenue analytics, exports

**Option B: Client Login**
- Email: `client@example.com`
- Password: `client123`
- Access: Booking interface, appointment management

**Option C: Register New Account**
- Click "Sign up" or go to `http://localhost:3000/register`
- Fill in your details
- New accounts default to CLIENT role

### Step 4: Navigate the Application

**As Admin:**
- Dashboard: `http://localhost:3000/dashboard`
- Revenue Analytics: `http://localhost:3000/dashboard`
- Exports: `http://localhost:3000/dashboard/exports`
- Appointments: View all appointments

**As Client:**
- My Appointments: `http://localhost:3000/bookings`
- Book New: `http://localhost:3000/bookings/new`
- AI Chat: Click chat widget (bottom right)

---

## 🧪 Testing the Application

### Backend API Testing

**1. Health Check:**
```bash
# Using curl
curl http://localhost:3001/health

# Using PowerShell
Invoke-WebRequest -Uri "http://localhost:3001/health"
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-11T..."
}
```

**2. Test Authentication:**
```bash
# Register new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@deexhairlabb.com","password":"admin123"}'
```

**3. Test Appointments API:**
```bash
# Get appointments (requires auth token)
curl http://localhost:3001/api/appointments \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check availability
curl "http://localhost:3001/api/appointments/availability?date=2024-01-15&duration=60" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Frontend Testing Checklist

**✅ Authentication:**
- [ ] Can register new account
- [ ] Can login with existing account
- [ ] Can logout
- [ ] Protected routes redirect to login

**✅ Client Features:**
- [ ] View my appointments
- [ ] Book new appointment
- [ ] Check availability
- [ ] Cancel appointment
- [ ] Use AI chat widget

**✅ Admin Features:**
- [ ] View dashboard with revenue stats
- [ ] View revenue analytics
- [ ] Manage appointments
- [ ] Create export requests
- [ ] View export status

**✅ General:**
- [ ] Pages load without errors
- [ ] Forms validate correctly
- [ ] API calls work
- [ ] Real-time chat connects

### Manual Testing Steps

**1. Test Booking Flow:**
```
1. Login as client
2. Go to "Book New Appointment"
3. Select service, date, time
4. Check availability
5. Submit booking
6. Verify appointment appears in "My Appointments"
```

**2. Test Admin Dashboard:**
```
1. Login as admin
2. View dashboard
3. Check revenue analytics
4. View all appointments
5. Test export functionality
```

**3. Test AI Chat:**
```
1. Click chat widget (bottom right)
2. Type: "I want to book an appointment"
3. Verify AI responds with suggestions
4. Type: "Check availability for tomorrow"
5. Verify AI provides helpful response
```

---

## 🚀 Deployment Guide

### Overview

**Recommended Stack:**
- **Frontend:** Vercel (Next.js optimized)
- **Backend:** Railway, Render, or Fly.io
- **Database:** Supabase (already configured)
- **Environment Variables:** Set in each platform

---

## 📦 Frontend Deployment (Vercel)

### Step 1: Prepare for Deployment

**1. Build the frontend:**
```bash
cd frontend
npm run build
```

**2. Verify build succeeds:**
- Check for any build errors
- Fix TypeScript errors if any

### Step 2: Deploy to Vercel

**Option A: Using Vercel CLI (Recommended)**

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   cd frontend
   vercel
   ```

4. **Follow prompts:**
   - Link to existing project or create new
   - Confirm settings
   - Deploy

**Option B: Using Vercel Dashboard**

1. **Go to:** https://vercel.com
2. **Sign up/Login** with GitHub
3. **Click "Add New Project"**
4. **Import your repository:**
   - Connect GitHub repository
   - Select the repository
5. **Configure:**
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
6. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.com
   NEXT_PUBLIC_SUPABASE_URL=https://pqaixgefahswjoatmxsg.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_YcbdMn7JTe74MJz7zl9f4Q_8Ox5Kdsa
   ```
7. **Deploy**

### Step 3: Update Backend CORS

After deploying frontend, update `backend/.env`:
```env
FRONTEND_URL=https://your-vercel-app.vercel.app
```

Or set in backend deployment platform.

---

## 🔧 Backend Deployment

### Option 1: Railway (Recommended)

**Step 1: Prepare**

1. **Create `railway.json` in backend folder:**
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm start",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

2. **Update `backend/package.json` scripts:**
   ```json
   {
     "scripts": {
       "start": "node dist/index.js",
       "build": "tsc && npm run db:generate",
       "postinstall": "npm run db:generate"
     }
   }
   ```

**Step 2: Deploy**

1. **Go to:** https://railway.app
2. **Sign up/Login** with GitHub
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Select your repository**
6. **Configure:**
   - **Root Directory:** `backend`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
7. **Add Environment Variables:**
   ```
   DATABASE_URL=postgresql://postgres:DeeXHairlabb@db.pqaixgefahswjoatmxsg.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
   SUPABASE_URL=https://pqaixgefahswjoatmxsg.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_kV9qj6-ll26lNncu_pF6mg_KU3lIjVT
   JWT_SECRET=your-production-jwt-secret-change-this
   JWT_EXPIRES_IN=7d
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ```
8. **Deploy**

### Option 2: Render

**Step 1: Prepare**

1. **Create `render.yaml` in root:**
   ```yaml
   services:
     - type: web
       name: deexhairlabb-backend
       env: node
       buildCommand: cd backend && npm install && npm run build
       startCommand: cd backend && npm start
       envVars:
         - key: DATABASE_URL
           value: postgresql://postgres:DeeXHairlabb@db.pqaixgefahswjoatmxsg.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
         - key: SUPABASE_URL
           value: https://pqaixgefahswjoatmxsg.supabase.co
         - key: SUPABASE_SERVICE_ROLE_KEY
           value: sb_secret_kV9qj6-ll26lNncu_pF6mg_KU3lIjVT
         - key: JWT_SECRET
           value: your-production-jwt-secret
         - key: FRONTEND_URL
           value: https://your-vercel-app.vercel.app
   ```

**Step 2: Deploy**

1. **Go to:** https://render.com
2. **Sign up/Login** with GitHub
3. **Click "New +" → "Web Service"**
4. **Connect repository**
5. **Configure:**
   - **Name:** `deexhairlabb-backend`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
6. **Add Environment Variables** (same as Railway)
7. **Deploy**

### Option 3: Fly.io

**Step 1: Install Fly CLI**
```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

**Step 2: Create `backend/fly.toml`**
```toml
app = "deexhairlabb-backend"
primary_region = "iad"

[build]

[env]
  PORT = "3001"
  NODE_ENV = "production"

[[services]]
  internal_port = 3001
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

**Step 3: Deploy**
```bash
cd backend
fly launch
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set SUPABASE_URL="https://..."
# ... set all environment variables
fly deploy
```

---

## 🔐 Environment Variables for Production

### Backend Production Variables

```env
# Server
PORT=3001
NODE_ENV=production

# Database (Supabase)
DATABASE_URL=postgresql://postgres:DeeXHairlabb@db.pqaixgefahswjoatmxsg.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1

# Supabase API
SUPABASE_URL=https://pqaixgefahswjoatmxsg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_kV9qj6-ll26lNncu_pF6mg_KU3lIjVT

# JWT (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=your-super-secure-random-string-min-32-chars
JWT_EXPIRES_IN=7d

# CORS (Your frontend URL)
FRONTEND_URL=https://your-app.vercel.app

# Optional
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEETS_FOLDER_ID=
```

### Frontend Production Variables

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://pqaixgefahswjoatmxsg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_YcbdMn7JTe74MJz7zl9f4Q_8Ox5Kdsa
```

---

## ✅ Post-Deployment Checklist

### Backend
- [ ] Backend URL is accessible
- [ ] Health check endpoint works: `https://your-backend.com/health`
- [ ] API endpoints respond correctly
- [ ] CORS is configured for frontend URL
- [ ] Database connection works
- [ ] Environment variables are set

### Frontend
- [ ] Frontend URL is accessible
- [ ] Can login/register
- [ ] API calls to backend work
- [ ] Environment variables are set
- [ ] No console errors

### Database
- [ ] Supabase project is active
- [ ] Database connection works from backend
- [ ] Migrations are applied
- [ ] Data is accessible

---

## 🧪 Testing Deployed Application

### 1. Test Backend

```bash
# Health check
curl https://your-backend-url.com/health

# Test API
curl https://your-backend-url.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@deexhairlabb.com","password":"admin123"}'
```

### 2. Test Frontend

1. Open deployed frontend URL
2. Test login
3. Test booking flow
4. Test admin features
5. Check browser console for errors

### 3. Monitor Logs

**Vercel:**
- Go to project → Deployments → Click deployment → View logs

**Railway:**
- Go to project → Click service → View logs

**Render:**
- Go to service → Logs tab

---

## 🔧 Troubleshooting Deployment

### Build Errors

**Frontend:**
```bash
# Test build locally first
cd frontend
npm run build
```

**Backend:**
```bash
cd backend
npm run build
```

### Environment Variable Issues

- Verify all variables are set in deployment platform
- Check variable names match exactly
- Ensure no extra spaces or quotes

### CORS Errors

- Verify `FRONTEND_URL` in backend matches frontend URL
- Check backend CORS configuration
- Ensure frontend `NEXT_PUBLIC_API_URL` matches backend URL

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Check Supabase project is active
- Verify connection pooling parameters

---

## 📊 Monitoring & Maintenance

### Recommended Tools

- **Error Tracking:** Sentry
- **Analytics:** Google Analytics or Vercel Analytics
- **Uptime Monitoring:** UptimeRobot or Pingdom
- **Logs:** Platform-native logging (Vercel, Railway, etc.)

### Regular Maintenance

- Update dependencies monthly
- Monitor Supabase usage
- Review error logs weekly
- Backup database regularly (Supabase handles this)

---

## 🎯 Quick Reference

### Local Development
```bash
# Start servers
npm run dev

# Access
Frontend: http://localhost:3000
Backend:  http://localhost:3001
```

### Production URLs
```
Frontend: https://your-app.vercel.app
Backend:  https://your-backend.railway.app
Database: Supabase (managed)
```

### Default Credentials
```
Admin:  admin@deexhairlabb.com / admin123
Client: client@example.com / client123
```

---

## 📚 Additional Resources

- [Vercel Deployment Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)
- [Supabase Docs](https://supabase.com/docs)

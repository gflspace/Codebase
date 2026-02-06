# DeeXHairlabb

AI-powered hair-braiding business platform with intelligent booking, revenue tracking, and analytics.

## Architecture

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: Next.js + React + TypeScript
- **Database**: Supabase (PostgreSQL) with Prisma ORM
- **AI Layer**: Context-aware assistant for intent interpretation and recommendations
- **Authentication**: JWT-based with role-based access control

## Features

- ✅ Appointment booking & scheduling
- ✅ AI-assisted availability recommendations
- ✅ Revenue tracking (daily, weekly, monthly, quarterly, yearly)
- ✅ Admin dashboard with analytics
- ✅ Google Sheets report exports
- ✅ Real-time chat (client ↔ admin ↔ AI)
- ✅ Hairstyle gallery & content management
- ✅ Promotions and campaigns

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase account (recommended) OR PostgreSQL 14+
- npm or yarn package manager

### Installation

```bash
npm run install:all
```

### Environment Setup

#### Option 1: Supabase (Recommended) ✅ Pre-configured!

✅ **Your Supabase credentials are already configured!**

The environment files have been pre-configured with your Supabase project:
- `backend/.env` - Database connection and API keys
- `frontend/.env.local` - Frontend API configuration

**Your Supabase Project:**
- URL: `https://pqaixgefahswjoatmxsg.supabase.co`
- Database: Connected and ready
- API Keys: Configured in both backend and frontend

> If you need to update credentials, edit the `.env` files directly. See `SUPABASE_SETUP.md` for details.

#### Option 2: Local PostgreSQL

1. Copy `.env.example` files in both `backend/` and `frontend/` directories
2. Configure database connection and API keys
3. Create the database: `createdb deexhairlabb`

### Database Setup

```bash
cd backend
npm run db:generate  # Generate Prisma client
npm run db:migrate  # Create database tables
npm run db:seed     # Seed initial data
```

### Development

```bash
npm run dev
```

This starts both backend (port 3001) and frontend (port 3000) concurrently.

## Project Structure

```
deexhairlabb/
├── backend/          # Express API server
│   ├── src/
│   │   ├── routes/   # API routes
│   │   ├── middleware/ # Auth, error handling
│   │   ├── services/ # Google Sheets, etc.
│   │   └── lib/      # Supabase client
│   └── prisma/       # Database schema
├── frontend/         # Next.js application
│   ├── app/          # Pages and routes
│   ├── components/   # React components
│   └── store/        # State management
└── docs/             # Documentation files
```

## Documentation

- `QUICKSTART.md` - Quick start guide
- `SUPABASE_SETUP.md` - Detailed Supabase setup instructions
- `SETUP.md` - General setup guide
- `DEVELOPMENT.md` - Development workflow
- `STATUS.md` - Current project status

## AI Role & Boundaries

The AI layer operates as an advisory assistant:
- ✅ Interprets user intent
- ✅ Recommends actions
- ✅ Prepares export instructions
- ❌ Does NOT execute bookings directly
- ❌ Does NOT calculate financial totals
- ❌ Does NOT export data directly

All execution is handled by the backend with proper authorization.

## Default Credentials

After seeding the database:

- **Admin:** `admin@deexhairlabb.com` / `admin123`
- **Client:** `client@example.com` / `client123`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Appointments
- `GET /api/appointments` - List appointments
- `GET /api/appointments/availability` - Check available slots
- `POST /api/appointments` - Create appointment
- `PATCH /api/appointments/:id/status` - Update status (admin)
- `DELETE /api/appointments/:id` - Cancel appointment

### Revenue (Admin Only)
- `GET /api/revenue/analytics` - Get revenue analytics
- `GET /api/revenue/by-period` - Revenue by time period

### Exports (Admin Only)
- `POST /api/exports/request` - Request Google Sheets export
- `GET /api/exports` - List export requests

### AI
- `POST /api/ai/interpret` - Interpret user intent
- `POST /api/ai/prepare-export` - Prepare export instructions

See `DEVELOPMENT.md` for complete API documentation.

## License

Private - All rights reserved

# DeeXHairlabb Setup Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- npm or yarn package manager

## Installation Steps

### 1. Install Dependencies

```bash
npm run install:all
```

This will install dependencies for the root, backend, and frontend.

### 2. Database Setup

#### Create PostgreSQL Database

```bash
createdb deexhairlabb
```

Or using psql:

```sql
CREATE DATABASE deexhairlabb;
```

#### Configure Environment Variables

Copy the example environment file:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/deexhairlabb?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
```

#### Run Database Migrations

```bash
cd backend
npm run db:generate
npm run db:migrate
npm run db:seed
```

This will:
- Generate Prisma client
- Create database tables
- Seed initial data (admin and client users)

### 3. Google Sheets API Setup (Optional, for exports)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Sheets API and Google Drive API
4. Create a Service Account
5. Download the JSON key file
6. Add to `backend/.env`:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_FOLDER_ID=optional-folder-id
```

### 4. Frontend Configuration

Copy the example environment file:

```bash
cp frontend/.env.example frontend/.env.local
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 5. Start Development Servers

From the root directory:

```bash
npm run dev
```

This starts:
- Backend API on `http://localhost:3001`
- Frontend on `http://localhost:3000`

## Default Credentials

After seeding, you can login with:

**Admin:**
- Email: `admin@deexhairlabb.com`
- Password: `admin123`

**Client:**
- Email: `client@example.com`
- Password: `client123`

## Project Structure

```
deexhairlabb/
├── backend/              # Express API server
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── middleware/  # Auth, error handling
│   │   ├── services/    # Google Sheets, etc.
│   │   └── prisma/      # Database seed
│   └── prisma/
│       └── schema.prisma # Database schema
├── frontend/            # Next.js application
│   ├── app/            # Pages and routes
│   ├── components/     # React components
│   └── store/          # State management
└── README.md
```

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
- `GET /api/exports/:id` - Get export status

### AI
- `POST /api/ai/interpret` - Interpret user intent
- `POST /api/ai/prepare-export` - Prepare export instructions

### Chat
- `GET /api/chat` - Get chat history
- `POST /api/chat` - Send message

## Development Notes

- Backend uses TypeScript with Express
- Frontend uses Next.js 14 with App Router
- Database uses Prisma ORM with PostgreSQL
- Real-time chat uses Socket.io
- Authentication uses JWT tokens
- AI layer interprets intent but doesn't execute actions

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL in backend/.env
- Ensure database exists

### Port Already in Use
- Change PORT in backend/.env
- Change port in frontend/.env.local (NEXT_PUBLIC_API_URL)

### Google Sheets Export Not Working
- Verify service account credentials
- Check API permissions
- Ensure APIs are enabled in Google Cloud Console

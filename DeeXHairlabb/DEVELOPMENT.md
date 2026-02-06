# Development Guide

## Quick Start

### Windows (PowerShell)

```powershell
.\start-dev.ps1
```

This script will:
- ✅ Check all prerequisites
- ✅ Create `.env` files if missing
- ✅ Install dependencies if needed
- ✅ Check database setup
- ✅ Start both servers

### Manual Start

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Set up database:**
   ```bash
   # Create .env file in backend/ with your PostgreSQL credentials
   # Then run:
   cd backend
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

3. **Start servers:**
   ```bash
   npm run dev
   ```

## Project Structure

```
deexhairlabb/
├── backend/                 # Express API Server
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   │   ├── auth.ts     # Authentication
│   │   │   ├── appointments.ts
│   │   │   ├── revenue.ts
│   │   │   ├── exports.ts
│   │   │   ├── ai.ts       # AI intent interpretation
│   │   │   ├── chat.ts
│   │   │   ├── content.ts
│   │   │   └── promotions.ts
│   │   ├── middleware/     # Auth, error handling
│   │   ├── services/       # Google Sheets, etc.
│   │   └── index.ts        # Server entry point
│   └── prisma/
│       └── schema.prisma   # Database schema
│
├── frontend/               # Next.js Application
│   ├── app/               # App Router pages
│   │   ├── login/         # Auth pages
│   │   ├── dashboard/     # Admin dashboard
│   │   └── bookings/      # Client booking
│   ├── components/        # React components
│   └── store/            # Zustand state management
│
└── README.md
```

## Development Workflow

### Backend Development

1. **Make changes** to TypeScript files in `backend/src/`
2. **Server auto-reloads** via `tsx watch`
3. **Test API endpoints** using:
   - Browser: `http://localhost:3001/api/health`
   - Postman/Insomnia
   - Frontend application

### Frontend Development

1. **Make changes** to React/Next.js files
2. **Hot reload** happens automatically
3. **Check browser console** for errors
4. **Test in browser** at `http://localhost:3000`

### Database Changes

1. **Update schema** in `backend/prisma/schema.prisma`
2. **Create migration:**
   ```bash
   cd backend
   npm run db:migrate
   ```
3. **Update Prisma client:**
   ```bash
   npm run db:generate
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

## Testing

### Manual Testing Checklist

**Authentication:**
- [ ] Register new client account
- [ ] Login as client
- [ ] Login as admin
- [ ] Access protected routes

**Client Features:**
- [ ] View appointments
- [ ] Book new appointment
- [ ] Check availability
- [ ] Cancel appointment
- [ ] Chat with AI

**Admin Features:**
- [ ] View dashboard
- [ ] View revenue analytics
- [ ] Manage appointments
- [ ] Create export request
- [ ] View export status
- [ ] Manage content
- [ ] Manage promotions

### API Testing

Use tools like Postman, Insomnia, or curl:

```bash
# Health check
curl http://localhost:3001/health

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@deexhairlabb.com","password":"admin123"}'

# Get appointments (with token)
curl http://localhost:3001/api/appointments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Common Issues

### Port Already in Use

**Backend (3001):**
```bash
# Change PORT in backend/.env
PORT=3002
```

**Frontend (3000):**
```bash
# Update NEXT_PUBLIC_API_URL in frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Database Connection Errors

1. **Check PostgreSQL is running:**
   ```powershell
   Get-Service | Where-Object {$_.Name -like "*postgres*"}
   ```

2. **Verify DATABASE_URL in backend/.env:**
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/deexhairlabb?schema=public"
   ```

3. **Test connection:**
   ```bash
   psql -U postgres -h localhost -p 5432
   ```

### Module Not Found

Clear and reinstall:
```bash
rm -rf node_modules backend/node_modules frontend/node_modules
npm run install:all
```

### Prisma Client Errors

Regenerate client:
```bash
cd backend
npm run db:generate
```

## Environment Variables

### Backend (.env)

```env
# Required
DATABASE_URL="postgresql://user:pass@localhost:5432/deexhairlabb?schema=public"
JWT_SECRET="your-secret-key"
PORT=3001
FRONTEND_URL=http://localhost:3000

# Optional
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEETS_FOLDER_ID=
AI_API_KEY=
AI_API_URL=
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Code Style

- **Backend:** TypeScript with Express
- **Frontend:** TypeScript with Next.js 14 App Router
- **Styling:** Tailwind CSS
- **State:** Zustand
- **Forms:** React Hook Form + Zod

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "Add feature: description"

# Push and create PR
git push origin feature/your-feature
```

## Deployment Notes

- Backend requires PostgreSQL database
- Frontend builds to static files (Next.js)
- Environment variables must be set in production
- Google Sheets API requires service account setup
- JWT_SECRET must be strong and unique in production

## Resources

- [Prisma Docs](https://www.prisma.io/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Express Docs](https://expressjs.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

# 🚀 Quick Access Guide

## Accessing the Application Right Now

### Step 1: Check if Servers Are Running

Open a terminal and run:
```powershell
Get-NetTCPConnection -LocalPort 3001,3000 -ErrorAction SilentlyContinue
```

**If nothing shows, start the servers:**
```bash
npm run dev
```

Wait 10-15 seconds for servers to start.

### Step 2: Open in Browser

1. Open your web browser (Chrome, Firefox, Edge, etc.)
2. Go to: **http://localhost:3000**
3. You should see the login page

### Step 3: Login

**Admin Account:**
- Email: `admin@deexhairlabb.com`
- Password: `admin123`
- Access: Full dashboard, analytics, exports

**Client Account:**
- Email: `client@example.com`
- Password: `client123`
- Access: Bookings, appointments

### Step 4: Explore Features

**As Admin:**
- Dashboard: View revenue and stats
- Appointments: Manage all bookings
- Exports: Create Google Sheets reports
- AI Chat: Click chat widget (bottom right)

**As Client:**
- My Appointments: View your bookings
- Book New: Create new appointment
- AI Chat: Get booking assistance

---

## Quick Test Checklist

### ✅ Basic Functionality
- [ ] Can login
- [ ] Can see dashboard/bookings page
- [ ] Can navigate between pages
- [ ] No console errors

### ✅ Booking Flow
- [ ] Can book new appointment
- [ ] Can view my appointments
- [ ] Can cancel appointment

### ✅ Admin Features
- [ ] Can view revenue analytics
- [ ] Can see all appointments
- [ ] Can create export request

### ✅ AI Chat
- [ ] Chat widget appears
- [ ] Can send messages
- [ ] AI responds helpfully

---

## Troubleshooting

### "Cannot connect" or "Connection refused"

**Solution:**
```bash
# Make sure servers are running
npm run dev

# Wait 10-15 seconds, then try again
```

### "404 Not Found" on pages

**Solution:**
- Check you're logged in
- Try refreshing the page
- Check browser console for errors

### API Errors

**Solution:**
- Verify backend is running on port 3001
- Check `http://localhost:3001/health` works
- Verify `.env` files are configured

### Database Errors

**Solution:**
- Check Supabase project is active
- Verify `DATABASE_URL` in `backend/.env`
- Run migrations: `cd backend && npm run db:migrate`

---

## Next Steps

1. **Test all features** - See `ACCESS_AND_DEPLOY.md` for detailed testing
2. **Deploy to production** - See deployment guide in `ACCESS_AND_DEPLOY.md`
3. **Customize** - Add your own services, pricing, content

---

## Need Help?

- Check `ACCESS_AND_DEPLOY.md` for detailed guides
- Review `DEVELOPMENT.md` for development workflow
- Check browser console for errors
- Check backend terminal for API errors

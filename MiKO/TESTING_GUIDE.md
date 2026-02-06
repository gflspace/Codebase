# MiKO Plastic Surgery Application - Testing Guide

## Prerequisites

Before testing, ensure you have:
- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] n8n instance running (self-hosted or cloud)
- [ ] Google Cloud Console access
- [ ] OpenAI API account

---

## PHASE 1: Environment Setup

### Step 1.1: Create Environment File

```bash
cd D:\Codebase\MiKO\extracted
copy .env.example .env
```

### Step 1.2: Configure Environment Variables

Edit `.env` with your actual values:

```env
# N8N Configuration
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/chat
VITE_N8N_INSTANCE_ID=your-instance-id

# Google Configuration (for frontend calendar)
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key

# Base44 (existing)
VITE_BASE44_APP_ID=6959eefb54c587c37d7ce9e8
```

### Step 1.3: Install Dependencies

```bash
cd D:\Codebase\MiKO\extracted
npm install
```

### Step 1.4: Verify Installation

```bash
npm run build
```

Expected: Build completes without errors.

---

## PHASE 2: n8n Workflow Setup

### Step 2.1: Access n8n Instance

1. Open your n8n instance URL
2. Log in with admin credentials

### Step 2.2: Create Required Credentials

#### A. OpenAI Credential
1. Go to **Credentials** → **Add Credential**
2. Search for "OpenAI"
3. Name: `OpenAI - MiKO`
4. Enter your OpenAI API key
5. Save

#### B. Google Calendar Credential
1. Go to **Credentials** → **Add Credential**
2. Search for "Google Calendar OAuth2"
3. Name: `Google Calendar - MiKO`
4. Enter Client ID and Client Secret from Google Cloud Console
5. Click "Sign in with Google" and authorize
6. Save

#### C. Gmail Credential
1. Go to **Credentials** → **Add Credential**
2. Search for "Gmail OAuth2"
3. Name: `Gmail - MiKO`
4. Use same Client ID/Secret as Calendar
5. Click "Sign in with Google" and authorize (select email permissions)
6. Save

### Step 2.3: Import Workflow

1. Go to **Workflows** → **Import from File**
2. Select `D:\Codebase\MiKO\n8nMiko\miko-ai-chat-workflow.json`
3. Click Import

### Step 2.4: Verify Node Credentials

After import, check each node has credentials assigned:
- [ ] AI Chat Response → OpenAI - MiKO
- [ ] Check Calendar Availability → Google Calendar - MiKO
- [ ] Create Booking → Google Calendar - MiKO
- [ ] Send Booking Confirmation → Gmail - MiKO
- [ ] Forward Inquiry to Office → Gmail - MiKO
- [ ] Send Inquiry Confirmation → Gmail - MiKO
- [ ] Notify Admin on Error → Gmail - MiKO

### Step 2.5: Activate Workflow

1. Click the toggle in the top right to activate
2. Note the webhook URL displayed (e.g., `https://your-n8n.com/webhook/chat`)
3. Update your `.env` with this URL

---

## PHASE 3: Frontend Testing

### Step 3.1: Start Development Server

```bash
cd D:\Codebase\MiKO\extracted
npm run dev
```

Expected output:
```
VITE v6.x.x ready in xxx ms
➜ Local:   http://localhost:5173/
```

### Step 3.2: Test Home Page

1. Open `http://localhost:5173/`
2. Verify:
   - [ ] Hero section loads with Dr. Obeng intro
   - [ ] Navigation links are visible (Procedures, Gallery, About, Financing)
   - [ ] Floating "24/7 Patient Support" button appears
   - [ ] Mobile menu works on smaller screens

### Step 3.3: Test Navigation Pages

| Route | Expected |
|-------|----------|
| `/procedures` | Procedure categories with images load |
| `/gallery` | Before/after gallery with filter buttons |
| `/about` | Dr. Obeng bio, credentials, testimonials |
| `/financing` | Payment calculator, financing partners |
| `/admin` | Admin dashboard with lead pipeline |

### Step 3.4: Test Support Panel

1. Click "24/7 Patient Support" button
2. Verify three tabs: Live Chat, Email, Book

#### Chat Tab Test:
- [ ] Welcome message appears
- [ ] Quick reply buttons work
- [ ] Type "I want to book a consultation" → Should show calendar prompt
- [ ] Type "What procedures do you offer?" → Should get AI response

#### Email Tab Test:
- [ ] Form fields render (Name, Email, Phone, Procedure, Message)
- [ ] Validation works (try submitting empty)
- [ ] Submit with valid data → Success message

#### Calendar Tab Test:
- [ ] Week view renders
- [ ] Can select Virtual/In-Person
- [ ] Can select date and time
- [ ] Booking form appears after selecting time
- [ ] Can complete booking

---

## PHASE 4: Integration Testing

### Step 4.1: Test Chat → n8n Integration

**Test 1: Basic Chat Message**
```bash
curl -X POST https://your-n8n.com/webhook/chat \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sendMessage",
    "sessionId": "test-001",
    "chatInput": "Hello, I am interested in rhinoplasty"
  }'
```

Expected response:
```json
{
  "output": "..AI response about rhinoplasty..",
  "intent": "procedure_information",
  "suggested_actions": [...]
}
```

**Test 2: Check Availability**
```bash
curl -X POST https://your-n8n.com/webhook/chat \
  -H "Content-Type: application/json" \
  -d '{
    "action": "schedule_calendar_event",
    "scheduling_action": "check_availability",
    "availability_time": "2024-01-15T09:00:00Z"
  }'
```

Expected response:
```json
{
  "success": true,
  "available_slots": [...],
  "message": "Found X available slots"
}
```

**Test 3: Book Appointment**
```bash
curl -X POST https://your-n8n.com/webhook/chat \
  -H "Content-Type: application/json" \
  -d '{
    "action": "schedule_calendar_event",
    "scheduling_action": "book",
    "full_name": "Test Patient",
    "email": "test@example.com",
    "phone": "(310) 555-1234",
    "booking_time": "2024-01-20T10:00:00Z",
    "consult_type": "virtual",
    "procedure": "Rhinoplasty"
  }'
```

Expected:
- Calendar event created in Google Calendar
- Confirmation email sent to test@example.com
- JSON response with appointment_id

**Test 4: Contact Inquiry**
```bash
curl -X POST https://your-n8n.com/webhook/chat \
  -H "Content-Type: application/json" \
  -d '{
    "action": "contact_inquiry",
    "full_name": "Test User",
    "email": "test@example.com",
    "phone": "(310) 555-5678",
    "procedure": "Facelift",
    "message": "I would like more information about facelift procedures.",
    "channel": "web_chat",
    "timestamp": "2024-01-15T12:00:00Z"
  }'
```

Expected:
- Email forwarded to office@mikoplasticsurgery.com
- Confirmation email sent to test@example.com
- JSON response with inquiry_id

### Step 4.2: End-to-End Browser Test

1. Open app in browser
2. Open Support Panel → Chat
3. Type "I want to schedule a consultation for rhinoplasty"
4. Click "View Available Times" when prompted
5. Select a date and time
6. Fill in booking form
7. Submit booking

**Verify:**
- [ ] Google Calendar shows new event
- [ ] Confirmation email received
- [ ] Chat shows success message

---

## PHASE 5: Production Readiness Check

### Step 5.1: Security Checklist

- [ ] Environment variables not exposed in client bundle
- [ ] Webhook URLs use HTTPS
- [ ] OAuth credentials use production redirect URIs
- [ ] Admin routes have authentication (implement if needed)

### Step 5.2: Performance Checklist

- [ ] Build size under 500KB (gzipped)
- [ ] Lighthouse score > 80
- [ ] Images optimized/lazy loaded
- [ ] Code splitting working (check network tab)

### Step 5.3: Error Handling Checklist

- [ ] Chat gracefully handles n8n failures (fallback responses work)
- [ ] Calendar handles unavailable times
- [ ] Form validation prevents bad submissions
- [ ] Error Trigger sends admin notifications

### Step 5.4: Build for Production

```bash
npm run build
npm run preview
```

Test the production build at `http://localhost:4173`

---

## Test Results Template

| Test | Status | Notes |
|------|--------|-------|
| Home page loads | ⬜ | |
| Navigation works | ⬜ | |
| Chat sends messages | ⬜ | |
| Calendar shows slots | ⬜ | |
| Booking creates event | ⬜ | |
| Email sends confirmation | ⬜ | |
| Admin dashboard loads | ⬜ | |
| Error handling works | ⬜ | |
| Mobile responsive | ⬜ | |
| Production build | ⬜ | |

---

## Troubleshooting

### Chat not responding
1. Check n8n workflow is activated
2. Verify webhook URL in `.env` matches n8n
3. Check browser console for CORS errors
4. Test webhook directly with curl

### Calendar not loading slots
1. Verify Google Calendar credential is valid
2. Check calendar ID is "primary" or correct ID
3. Look at n8n execution logs for errors

### Emails not sending
1. Verify Gmail credential has send permissions
2. Check spam folder
3. Verify "from" email matches authenticated account

### Build errors
1. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Check for TypeScript errors in imports

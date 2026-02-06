# MiKO Reminder Automation Setup Guide

This guide explains how to set up the automated appointment reminder system using n8n.

## Overview

The reminder system automatically sends email reminders to patients at three key intervals:
- **48 hours** before appointment
- **24 hours** before appointment
- **2 hours** before appointment

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  n8n Scheduler  │────▶│  Supabase Query  │────▶│  Email Service  │
│  (Every 15 min) │     │  (Appointments)  │     │  (Gmail SMTP)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │                         │
                                ▼                         ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  Calculate Due   │     │  Update Status  │
                        │  Reminders       │     │  (sent/failed)  │
                        └──────────────────┘     └─────────────────┘
```

## Prerequisites

1. **n8n Instance** - Self-hosted or n8n Cloud
2. **Supabase Project** - With the MiKO schema deployed
3. **SMTP Credentials** - Gmail or other email service

## Setup Steps

### Step 1: Configure Supabase PostgreSQL Credential in n8n

1. Go to n8n → **Credentials** → **Add Credential**
2. Select **PostgreSQL**
3. Configure:
   ```
   Name: Supabase PostgreSQL
   Host: db.<your-project-id>.supabase.co
   Database: postgres
   User: postgres
   Password: <your-database-password>
   Port: 5432
   SSL: Enable (require)
   ```

### Step 2: Configure Email (SMTP) Credential

**For Gmail:**
1. Enable 2-Factor Authentication on your Google Account
2. Generate an App Password: Google Account → Security → App Passwords
3. In n8n → **Credentials** → **Add Credential** → **SMTP**
4. Configure:
   ```
   Name: Gmail SMTP
   Host: smtp.gmail.com
   Port: 465
   User: your-email@gmail.com
   Password: <app-password>
   SSL/TLS: true
   ```

**For Other Providers:**
- SendGrid, Mailgun, Amazon SES all work with SMTP credentials
- Use their respective SMTP settings

### Step 3: Import the Workflow

1. In n8n, go to **Workflows** → **Import from File**
2. Select `miko-reminder-automation-workflow.json`
3. Review and update credential references if needed
4. **Activate** the workflow

### Step 4: Add Unique Constraint (Required)

Run this SQL in Supabase SQL Editor to prevent duplicate reminders:

```sql
-- Add unique constraint to prevent duplicate reminders
ALTER TABLE appointment_reminders
ADD CONSTRAINT unique_appointment_reminder
UNIQUE (appointment_id, reminder_type);
```

### Step 5: Test the Workflow

1. Create a test appointment 47-49 hours in the future
2. Manually execute the workflow in n8n
3. Verify:
   - Appointment is fetched correctly
   - Reminder is calculated as due
   - Email is sent
   - Database record is updated

## Workflow Nodes Explained

| Node | Purpose |
|------|---------|
| **Run Every 15 Minutes** | Scheduled trigger - runs the workflow |
| **Fetch Upcoming Appointments** | Queries Supabase for appointments in next 50 hours |
| **Calculate Due Reminders** | Determines which reminders should be sent |
| **Has Due Reminders?** | Routes to email flow or "no action" |
| **Split by Reminder Type** | Creates one item per reminder to send |
| **Generate Email Content** | Creates personalized email for each reminder |
| **Record Reminder (Pending)** | Inserts pending reminder record (prevents duplicates) |
| **Send Reminder Email** | Sends the actual email |
| **Mark Reminder Sent/Failed** | Updates database with result |

## Email Templates

### 48-Hour Reminder
- Subject: "Your MiKO Consultation is in 2 Days"
- Content: Full appointment details, preparation tips

### 24-Hour Reminder
- Subject: "Your MiKO Consultation is Tomorrow"
- Content: Quick checklist, what to bring/prepare

### 2-Hour Reminder
- Subject: "Your MiKO Consultation Starts Soon"
- Content: Meeting link (if virtual), quick reminders

## Customizing Templates

To modify email templates, edit the **Generate Email Content** code node in n8n.

Key variables available:
```javascript
appt.patient_name       // Patient's name
appt.patient_email      // Patient's email
appt.scheduled_time     // Appointment datetime
appt.consultation_type  // 'virtual' or 'inperson'
appt.google_meet_link   // Video meeting URL (if virtual)
appt.procedure          // Procedure of interest
```

## Monitoring & Troubleshooting

### View Reminder Status
```sql
SELECT
  ar.reminder_type,
  ar.delivery_status,
  ar.sent_at,
  ar.delivery_error,
  a.patient_name,
  a.scheduled_time
FROM appointment_reminders ar
JOIN appointments a ON a.id = ar.appointment_id
ORDER BY ar.created_at DESC
LIMIT 50;
```

### Common Issues

**Issue: Reminders not sending**
- Check workflow is activated
- Verify Supabase credentials
- Check appointment status is 'confirmed' or 'pending'

**Issue: Duplicate reminders**
- Run the unique constraint SQL above
- Check the "Record Reminder (Pending)" node is working

**Issue: Emails going to spam**
- Set up SPF/DKIM for your domain
- Use a proper "from" email address
- Consider using a transactional email service

## Database Schema Reference

```sql
-- appointment_reminders table
CREATE TABLE appointment_reminders (
  id UUID PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id),
  reminder_type TEXT NOT NULL,           -- 'reminder_48h', 'reminder_24h', 'reminder_2h'
  channel TEXT NOT NULL,                  -- 'email', 'sms'
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  delivery_status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  delivery_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Frontend Integration (Optional)

The frontend `reminderWebhook.js` service can be used for:
- Manual reminder triggers from admin dashboard
- Initializing reminders when booking via calendar (non-n8n path)
- Testing reminder logic locally

```javascript
import { initializeRemindersForAppointment } from '@/api/reminderWebhook';

// After creating an appointment
await initializeRemindersForAppointment(appointmentId, scheduledTime);
```

## Security Considerations

1. **Database Access**: n8n PostgreSQL credential should use a role with limited permissions
2. **Email Content**: Never include sensitive medical information in reminder emails
3. **Audit Trail**: All reminders are logged in the database for compliance

## Scaling Considerations

- For high volume, consider batching email sends
- Use a transactional email service (SendGrid, Postmark) for better deliverability
- Monitor n8n execution times and adjust schedule if needed

---

## Quick Reference

| Setting | Value |
|---------|-------|
| Schedule | Every 15 minutes |
| Lookahead Window | 50 hours |
| 48h Reminder | 46-50 hours before appointment |
| 24h Reminder | 22-26 hours before appointment |
| 2h Reminder | 1.5-2.5 hours before appointment |

---

**Last Updated**: Created during reminder automation implementation

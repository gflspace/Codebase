# Credential Rotation Guide - URGENT ACTION REQUIRED

## Security Incident Summary

The following credentials were exposed in the codebase and **MUST be rotated immediately**:

| Service | Credential Type | Exposed Value (COMPROMISED) | Risk Level |
|---------|----------------|----------------------------|------------|
| Supabase | Project URL | `wawzhrpnicjsnqqexmhg.supabase.co` | HIGH |
| Supabase | Anon Key | `eyJhbGciOiJIUzI1NiIs...` (JWT) | **CRITICAL** |
| n8n | Webhook URL | `n8n.srv1233716.hstgr.cloud/webhook/chat` | HIGH |
| Google | Client ID | `22937036206-0k4okj6ch2qfeprcep8mbnd8h5b0i4t1` | MEDIUM |
| Google | API Key | `AIzaSyCh8AzPHk84R09nX8HzRNFQl-9rIvneux8` | HIGH |
| Base44 | App ID | `6959eefb54c587c37d7ce9e8` | MEDIUM |

---

## Rotation Instructions

### 1. Supabase (CRITICAL - Do First)

**Why Critical:** The anon key allows anyone to query your database within RLS policies. If RLS is misconfigured, data could be exposed.

**Steps:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (`wawzhrpnicjsnqqexmhg`)
3. Navigate to **Settings** → **API**
4. Click **"Regenerate"** next to the anon key
5. Copy the new key to your `.env` file:
   ```
   VITE_SUPABASE_ANON_KEY=your-new-key-here
   ```

**Post-Rotation:**
- Verify RLS policies are correctly configured
- Test that the application still works
- Monitor Supabase logs for unauthorized access attempts

---

### 2. n8n Webhook

**Why Important:** Exposed webhook URL allows anyone to trigger your AI workflows, potentially exhausting API quotas or causing spam.

**Steps:**
1. Log into your n8n instance at `n8n.srv1233716.hstgr.cloud`
2. Open the MiKO chat workflow
3. Edit the Webhook trigger node
4. Generate a new webhook path/ID
5. Update your `.env` file:
   ```
   VITE_N8N_WEBHOOK_URL=https://your-instance/webhook/NEW-PATH
   ```

**Additional Security:**
- Consider adding webhook authentication (API key header)
- Implement rate limiting in n8n
- Add IP allowlisting if possible

---

### 3. Google Cloud Credentials

**Why Important:** Exposed API key could be used for quota theft. Client ID exposure is lower risk but should still be rotated.

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your project

**For API Key:**
1. Click on the exposed API key
2. Click **"Regenerate Key"** or create a new one
3. Delete the old key
4. Add API key restrictions:
   - HTTP referrer restrictions (your domain only)
   - API restrictions (Calendar API only)

**For OAuth Client ID:**
1. Create a new OAuth 2.0 Client ID
2. Configure authorized JavaScript origins
3. Update your `.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=new-client-id.apps.googleusercontent.com
   VITE_GOOGLE_API_KEY=new-api-key
   ```
4. Delete the old client ID

---

### 4. Base44 App ID

**Steps:**
1. Log into your Base44 dashboard
2. Create a new application or regenerate the App ID
3. Update your `.env`:
   ```
   VITE_BASE44_APP_ID=new-app-id
   ```

---

## Post-Rotation Checklist

- [ ] All credentials rotated in respective dashboards
- [ ] New credentials added to `.env` (local only, never commit)
- [ ] Application tested and working
- [ ] Old credentials confirmed deleted/invalidated
- [ ] Monitoring enabled for suspicious activity
- [ ] Team notified of incident and new credential locations

---

## Preventing Future Exposure

### Immediate Actions
1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use environment variables** in deployment platforms
3. **Audit access** - Who has access to the codebase?

### Recommended Security Practices
1. **Use a secrets manager:**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Doppler
   - 1Password for Teams

2. **Implement credential scanning:**
   - GitHub Secret Scanning
   - GitGuardian
   - TruffleHog

3. **Rotate credentials regularly:**
   - Set calendar reminders for quarterly rotation
   - Automate rotation where possible

4. **Principle of least privilege:**
   - Create separate credentials for dev/staging/prod
   - Use scoped API keys where available

---

## Environment Setup for Different Environments

### Development
```bash
cp .env.example .env
# Fill in development/test credentials
```

### Staging
- Use separate Supabase project
- Use separate n8n instance or workflow
- Use test Google Cloud project

### Production
- Store credentials in deployment platform (Vercel, Netlify, etc.)
- Use production Supabase project
- Enable all security features (RLS, MFA for admin)

---

## Contact

If you discover any unauthorized access or suspicious activity:
1. Immediately rotate all credentials again
2. Review Supabase audit logs
3. Check n8n execution history
4. Review Google Cloud API usage

---

**Document Created:** After security audit identified exposed credentials
**Action Required By:** IMMEDIATELY

# VIOE - Vulnerability Intelligence & Orchestration Engine
## Error Handling & Troubleshooting Guide

**Document Version:** 1.0
**Classification:** Internal - Operations & Support
**Last Updated:** January 2026

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Understanding System Messages](#2-understanding-system-messages)
3. [Common Errors & Resolutions](#3-common-errors--resolutions)
4. [Authentication & Access Issues](#4-authentication--access-issues)
5. [Data & Import Issues](#5-data--import-issues)
6. [Integration Issues](#6-integration-issues)
7. [Performance Issues](#7-performance-issues)
8. [AI & Assignment Issues](#8-ai--assignment-issues)
9. [Reporting Issues](#9-reporting-issues)
10. [Step-by-Step Resolution Guides](#10-step-by-step-resolution-guides)
11. [When & How to Escalate](#11-when--how-to-escalate)
12. [Diagnostic Information Collection](#12-diagnostic-information-collection)

---

## 1. Introduction

### 1.1 Purpose

This guide helps users and support staff quickly identify, understand, and resolve issues encountered in VIOE. Following these procedures reduces downtime and ensures consistent issue resolution.

### 1.2 How to Use This Guide

1. **Identify the error message or symptom**
2. **Find the matching section in this guide**
3. **Follow the step-by-step resolution**
4. **Escalate if resolution fails**

### 1.3 Quick Reference

| Issue Type | Section |
|------------|---------|
| Login/Access problems | Section 4 |
| Import failures | Section 5 |
| Jira/Slack not working | Section 6 |
| Slow performance | Section 7 |
| AI not assigning | Section 8 |
| Reports not generating | Section 9 |

---

## 2. Understanding System Messages

### 2.1 Message Types

| Icon/Color | Type | Meaning |
|------------|------|---------|
| 🔴 Red | Error | Action failed, requires attention |
| 🟡 Yellow | Warning | Action succeeded with issues |
| 🟢 Green | Success | Action completed successfully |
| 🔵 Blue | Info | Informational message |

### 2.2 Common Message Patterns

**Success Messages:**
- "Vulnerability successfully updated"
- "Task created successfully"
- "Import completed - X records processed"

**Warning Messages:**
- "Assignment confidence is low"
- "SLA approaching in X hours"
- "Some records could not be imported"

**Error Messages:**
- "Failed to save changes"
- "Connection error"
- "Access denied"

### 2.3 Toast Notification Reference

VIOE displays toast notifications for real-time feedback:

| Notification | Meaning | Action |
|--------------|---------|--------|
| "Changes saved" | Update successful | None required |
| "Unable to save" | Update failed | Retry or investigate |
| "Session expired" | Authentication timeout | Re-login |
| "Network error" | Connection issue | Check connection |

---

## 3. Common Errors & Resolutions

### 3.1 Error Quick Reference Table

| Error | Likely Cause | Quick Fix |
|-------|--------------|-----------|
| "Access Denied" | Insufficient permissions | Contact admin for role |
| "Session Expired" | Timeout | Re-login |
| "Failed to Load" | Network issue | Refresh page |
| "Import Failed" | Bad file format | Check file format |
| "Sync Error" | Integration issue | Check credentials |
| "Assignment Failed" | AI configuration | Check AI settings |
| "Report Generation Failed" | Timeout | Try smaller date range |

### 3.2 Error Categories

**Category 1: User Errors**
- Incorrect input
- Missing required fields
- Invalid file format
- Unsupported operations

**Category 2: System Errors**
- Service unavailable
- Database timeout
- Memory limits
- Network failures

**Category 3: Configuration Errors**
- Invalid settings
- Missing credentials
- Expired tokens
- Incorrect mappings

**Category 4: Integration Errors**
- External service down
- API rate limiting
- Authentication failures
- Data format mismatches

---

## 4. Authentication & Access Issues

### 4.1 "Access Denied" / "Unauthorized"

**Symptoms:**
- Cannot access certain pages
- Actions are blocked
- Features appear disabled

**Causes:**
1. Insufficient role permissions
2. Session expired
3. Account disabled
4. Team scope restrictions

**Resolution:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log out and log back in | Fresh session |
| 2 | Verify you're using correct account | Correct email |
| 3 | Check with admin for your role | Confirm permissions |
| 4 | If team-scoped, verify team membership | Correct team |

**If still failing:** Contact administrator with your username and the action you're trying to perform.

### 4.2 "Session Expired"

**Symptoms:**
- Redirected to login page
- Actions fail with timeout message
- Loss of unsaved work

**Causes:**
- Inactivity timeout (default: 30 minutes)
- Server restart
- Browser issues

**Resolution:**

| Step | Action |
|------|--------|
| 1 | Click "Login" or refresh the page |
| 2 | Enter credentials |
| 3 | Navigate back to your work |

**Prevention:**
- Save work frequently
- Maintain activity if working on long tasks
- Check "Remember me" if available and appropriate

### 4.3 "Failed to Authenticate"

**Symptoms:**
- Cannot log in
- Password rejected
- MFA failing

**Resolution:**

| Step | Action |
|------|--------|
| 1 | Verify username (email) is correct |
| 2 | Check Caps Lock is off |
| 3 | Try password reset if unsure |
| 4 | If MFA, verify device time is synced |
| 5 | Clear browser cache and cookies |
| 6 | Try incognito/private window |

**If still failing:** Contact IT support or administrator.

### 4.4 "Account Locked"

**Symptoms:**
- Login blocked after failed attempts
- Message indicating account lock

**Resolution:**

| Step | Action |
|------|--------|
| 1 | Wait 15-30 minutes for automatic unlock |
| 2 | Or contact administrator for manual unlock |
| 3 | Use password reset before retry |

---

## 5. Data & Import Issues

### 5.1 "Import Failed"

**Symptoms:**
- File upload unsuccessful
- Error message during import
- Zero records imported

**Common Causes & Fixes:**

| Cause | Indicator | Fix |
|-------|-----------|-----|
| Wrong file format | "Unsupported format" | Use CSV, JSON, Excel, or PDF |
| File too large | "File exceeds limit" | Split into smaller files |
| Malformed data | "Parse error" | Check file structure |
| Missing required fields | "Required field missing" | Add missing columns |
| Encoding issues | "Character encoding error" | Save as UTF-8 |

**Resolution Steps:**

| Step | Action |
|------|--------|
| 1 | Verify file format is supported |
| 2 | Check file size (<50MB) |
| 3 | Open file and verify data structure |
| 4 | Ensure required columns exist |
| 5 | Save file with UTF-8 encoding |
| 6 | Retry import |

### 5.2 "Partial Import - Some Records Failed"

**Symptoms:**
- Import completes but with warnings
- Not all records appear
- Error count shown

**Resolution:**

| Step | Action |
|------|--------|
| 1 | Note the error count and message |
| 2 | Download error report if available |
| 3 | Review failed records for issues |
| 4 | Fix data issues in source file |
| 5 | Re-import only the fixed records |

**Common Data Issues:**
- Missing severity value
- Invalid CVE format
- Unknown environment name
- Duplicate entries (may be filtered)

### 5.3 "Duplicate Detected"

**Symptoms:**
- Record not created
- Message about existing record

**This is Expected Behavior:**
- VIOE prevents duplicate vulnerabilities
- Matching is based on CVE + Asset

**Resolution:**
- If intentional duplicate: Update existing record instead
- If different issue: Verify CVE and asset are different

### 5.4 "No Data to Display"

**Symptoms:**
- Empty list or table
- No search results

**Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| Filters too restrictive | Clear filters |
| No data imported | Import vulnerability data |
| All items suppressed | Check suppression rules |
| Team scope limiting view | Switch team filter |

---

## 6. Integration Issues

### 6.1 Jira Integration Errors

**"Failed to Create Jira Issue"**

| Cause | Indicator | Resolution |
|-------|-----------|------------|
| Invalid credentials | "Authentication failed" | Update API token |
| Project not found | "Project does not exist" | Verify project key |
| Missing fields | "Required field" | Check field mapping |
| Rate limiting | "Too many requests" | Wait and retry |
| Network issue | "Connection timeout" | Check network |

**Resolution Steps:**

| Step | Action |
|------|--------|
| 1 | Navigate to Settings → Integrations → Jira |
| 2 | Click "Test Connection" |
| 3 | If fails, regenerate API token in Jira |
| 4 | Update token in VIOE |
| 5 | Verify project key is correct |
| 6 | Test connection again |

**"Jira Sync Failed"**

| Step | Action |
|------|--------|
| 1 | Check if Jira issue still exists |
| 2 | Verify task has valid Jira key |
| 3 | Click "Sync" button to retry |
| 4 | If persistent, check Jira permissions |

### 6.2 Slack Integration Errors

**"Failed to Send Notification"**

| Cause | Resolution |
|-------|------------|
| Channel not found | Verify channel name in team settings |
| Bot not in channel | Add VIOE bot to channel |
| Token expired | Reconnect Slack integration |
| Network issue | Retry after a few minutes |

**Resolution Steps:**

| Step | Action |
|------|--------|
| 1 | Navigate to Settings → Integrations → Slack |
| 2 | Click "Test Notification" |
| 3 | If fails, click "Reconnect" |
| 4 | Authorize VIOE in Slack |
| 5 | Verify channel exists and bot is member |

### 6.3 Scanner Integration Errors

**"Scanner Sync Failed"**

| Cause | Indicator | Resolution |
|-------|-----------|------------|
| API key invalid | "401 Unauthorized" | Regenerate API key |
| Scanner unreachable | "Connection timeout" | Check scanner status |
| Rate limited | "429 Too Many Requests" | Wait for rate reset |
| Data format changed | "Parse error" | Contact support |

**Resolution Steps:**

| Step | Action |
|------|--------|
| 1 | Verify scanner service is operational |
| 2 | Check API credentials are current |
| 3 | Test API access directly if possible |
| 4 | Update credentials in VIOE if needed |
| 5 | Retry sync |

---

## 7. Performance Issues

### 7.1 "Page Loading Slowly"

**Symptoms:**
- Spinner showing for extended time
- Delayed response to clicks
- Timeouts

**Quick Fixes:**

| Step | Action |
|------|--------|
| 1 | Refresh the page |
| 2 | Clear browser cache |
| 3 | Try different browser |
| 4 | Check your internet connection |

**If Still Slow:**

| Step | Action | Purpose |
|------|--------|---------|
| 1 | Apply filters to reduce data | Less data = faster |
| 2 | Use pagination | Load fewer items |
| 3 | Close other browser tabs | Free memory |
| 4 | Check during off-peak hours | Less load |

### 7.2 "Request Timeout"

**Symptoms:**
- Action fails after long wait
- Error message about timeout

**Causes:**
- Large data operation
- Server under load
- Complex report generation

**Resolution:**

| Scenario | Resolution |
|----------|------------|
| Large export | Export smaller date range |
| Bulk operation | Process in smaller batches |
| Report generation | Narrow report parameters |
| Repeated timeouts | Wait 15 minutes, retry |

### 7.3 "Out of Memory" / Browser Crash

**Symptoms:**
- Browser becomes unresponsive
- Tab crashes
- Memory warnings

**Resolution:**

| Step | Action |
|------|--------|
| 1 | Close unnecessary browser tabs |
| 2 | Refresh VIOE page |
| 3 | Apply stricter filters |
| 4 | Use desktop browser (not mobile) |
| 5 | Clear browser cache |

---

## 8. AI & Assignment Issues

### 8.1 "AI Assignment Failed"

**Symptoms:**
- Vulnerability remains unassigned
- Triage button not working
- Error during triage

**Resolution:**

| Step | Action |
|------|--------|
| 1 | Check AI settings are configured |
| 2 | Verify at least one data source enabled |
| 3 | Ensure teams exist in system |
| 4 | Retry triage operation |
| 5 | If fails, manually assign |

### 8.2 "Low Confidence Assignment"

**Symptoms:**
- Warning about low confidence
- Items in "Needs Review" section

**This is Expected Behavior:**
- AI flags uncertainty for human review
- Not an error—a feature

**Resolution:**

| Step | Action |
|------|--------|
| 1 | Review vulnerability details |
| 2 | Determine correct team manually |
| 3 | Accept or reassign |
| 4 | System learns from corrections |

### 8.3 "No Team Assigned"

**Symptoms:**
- Team field is empty
- Appears in "Unassigned" filter

**Causes & Fixes:**

| Cause | Resolution |
|-------|------------|
| Below confidence threshold | Lower threshold or manually assign |
| No data sources enabled | Enable Git, CODEOWNERS, or Directory |
| No matching patterns | Add teams or adjust mappings |
| New asset type | Update configuration |

**Resolution Steps:**

| Step | Action |
|------|--------|
| 1 | Navigate to Settings → AI Ownership |
| 2 | Verify at least one source enabled |
| 3 | Consider lowering confidence threshold |
| 4 | Manually assign if necessary |

### 8.4 "Bulk Triage Partial Failure"

**Symptoms:**
- Some items assigned, others not
- Summary shows mixed results

**Resolution:**

| Step | Action |
|------|--------|
| 1 | Note which items failed |
| 2 | Review failed items individually |
| 3 | Manually assign or investigate |
| 4 | Check for patterns in failures |

---

## 9. Reporting Issues

### 9.1 "Report Generation Failed"

**Symptoms:**
- Report doesn't generate
- Timeout during generation
- Error message

**Resolution:**

| Step | Action |
|------|--------|
| 1 | Reduce date range |
| 2 | Apply additional filters |
| 3 | Try one framework at a time |
| 4 | Retry during off-peak hours |
| 5 | If persistent, contact support |

### 9.2 "Report Data Seems Wrong"

**Symptoms:**
- Numbers don't match expectations
- Missing data in report

**Troubleshooting:**

| Issue | Check |
|-------|-------|
| Counts differ from dashboard | Verify same filters applied |
| Missing items | Check suppression rules |
| Old data | Verify date range |
| Team differences | Check team filter |

**Resolution:**

| Step | Action |
|------|--------|
| 1 | Clear all filters and recount |
| 2 | Compare filters between views |
| 3 | Check suppression isn't hiding items |
| 4 | Verify report date range |

### 9.3 "Export Failed"

**Symptoms:**
- Download doesn't start
- Error during export

**Resolution:**

| Step | Action |
|------|--------|
| 1 | Check browser allows downloads |
| 2 | Try different export format |
| 3 | Reduce data volume with filters |
| 4 | Try different browser |
| 5 | Clear browser cache |

---

## 10. Step-by-Step Resolution Guides

### 10.1 Guide: Resolving Import Failures

```
START: Import failing
  │
  ▼
Step 1: What error message?
  │
  ├─► "Unsupported format"
  │   └─► Save file as CSV, JSON, or Excel
  │
  ├─► "File too large"
  │   └─► Split file into parts <50MB
  │
  ├─► "Parse error"
  │   └─► Check file for formatting issues
  │
  ├─► "Missing required field"
  │   └─► Add title and severity columns
  │
  └─► "Connection error"
      └─► Check network and retry
  │
  ▼
Step 2: Still failing?
  │
  ├─► YES → Collect diagnostic info (Section 12)
  │         Escalate to support
  │
  └─► NO → Import successful
           Document what fixed it
```

### 10.2 Guide: Resolving Login Issues

```
START: Cannot log in
  │
  ▼
Step 1: Check credentials
  │
  ├─► Caps Lock on? → Turn off
  ├─► Correct email? → Verify
  └─► Correct password? → Reset if unsure
  │
  ▼
Step 2: Still failing?
  │
  ├─► "Account locked"
  │   └─► Wait 30 minutes or contact admin
  │
  ├─► "Invalid MFA"
  │   └─► Sync device time, try again
  │
  └─► "Unknown error"
      └─► Clear cache, try incognito mode
  │
  ▼
Step 3: Still failing?
  │
  └─► Contact IT support with:
      - Username
      - Error message
      - Browser and OS
```

### 10.3 Guide: Resolving Jira Sync Issues

```
START: Jira not syncing
  │
  ▼
Step 1: Test connection
  └─► Settings → Integrations → Jira → Test
  │
  ├─► "Connection successful"
  │   └─► Try sync again
  │
  └─► "Connection failed"
      │
      ▼
Step 2: Check credentials
  │
  ├─► API token valid? → Check in Jira account
  ├─► Correct URL? → Verify Jira instance URL
  └─► Project exists? → Verify project key
  │
  ▼
Step 3: Regenerate token
  └─► Jira → Account → API Tokens → Create new
      Update in VIOE settings
  │
  ▼
Step 4: Still failing?
  │
  └─► Check Jira permissions for API user
      Contact Jira administrator
```

---

## 11. When & How to Escalate

### 11.1 Escalation Criteria

**Escalate Immediately If:**
- System completely inaccessible
- Security incident suspected
- Data loss or corruption
- Critical business impact

**Escalate After Self-Service If:**
- Followed troubleshooting steps
- Issue persists after 30 minutes
- Error is unclear or undocumented
- Pattern suggests system issue

### 11.2 Escalation Path

| Level | Contact | Response Time | Issues |
|-------|---------|---------------|--------|
| 1 | Team Lead | 4 hours | Operational issues |
| 2 | Administrator | 2 hours | Configuration, access |
| 3 | Support Team | 1 hour | System errors |
| 4 | Emergency | 15 minutes | Outages, security |

### 11.3 How to Escalate

**Information to Include:**

```
SUPPORT REQUEST
══════════════════════════════════════════════════

Issue Summary: [One-line description]

Environment:
- Browser: [Chrome/Firefox/Edge + version]
- Operating System: [Windows/Mac/Linux]
- Time of Issue: [Date and time]
- User Account: [Your email]

Steps to Reproduce:
1. [First step]
2. [Second step]
3. [Third step]

Error Message: [Exact error text]

Screenshots: [Attach if available]

Urgency: [Critical/High/Medium/Low]

Business Impact: [What is blocked or affected]

Troubleshooting Already Tried:
- [Step 1]
- [Step 2]
```

### 11.4 Emergency Contact

**For critical system issues:**
- Email: [Support email]
- Phone: [Support phone]
- Slack: #vioe-support (if available)

---

## 12. Diagnostic Information Collection

### 12.1 Browser Information

**How to collect:**

| Browser | Steps |
|---------|-------|
| Chrome | Menu → Help → About Google Chrome |
| Firefox | Menu → Help → About Firefox |
| Edge | Menu → Help and Feedback → About |

### 12.2 Error Details

**When an error occurs:**

| Step | Action |
|------|--------|
| 1 | Take a screenshot of the error |
| 2 | Note the exact error message text |
| 3 | Note what action triggered the error |
| 4 | Check browser console for details |

**Browser Console Access:**
- Windows: Press F12, click "Console" tab
- Mac: Press Cmd+Option+J

### 12.3 Network Information

**If network-related:**

| Step | Action |
|------|--------|
| 1 | Check if other websites work |
| 2 | Note if on VPN |
| 3 | Try from different network if possible |
| 4 | Check browser Network tab (F12) for failed requests |

### 12.4 System State Information

**Helpful context:**
- Time of day (for load patterns)
- Recent actions taken
- Any recent changes (password, browser update)
- Other users affected?

### 12.5 Log Collection (Admin Only)

**For administrators:**

| Step | Action |
|------|--------|
| 1 | Access system logs |
| 2 | Filter to time of issue |
| 3 | Look for ERROR or WARN entries |
| 4 | Export relevant timeframe |
| 5 | Include with escalation |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Documentation Team | Initial release |

---

*This guide should be updated when new error patterns are identified.*

**VIOE - Vulnerability Intelligence & Orchestration Engine**
*Error Handling & Troubleshooting Guide*

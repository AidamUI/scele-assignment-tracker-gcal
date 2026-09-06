# 🚀 Complete Setup Guide - From Clone to Deployment

This guide walks you through setting up the SCELE to Google Calendar automation from scratch.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Part 1: Google Cloud Setup](#part-1-google-cloud-setup)
3. [Part 2: Local Setup](#part-2-local-setup)
4. [Part 3: Testing Locally](#part-3-testing-locally)
5. [Part 4: GitHub Deployment](#part-4-github-deployment)
6. [Part 5: Verification](#part-5-verification)

---

## Prerequisites

Before starting, ensure you have:

- ✅ **Node.js 20+** installed ([Download](https://nodejs.org/))
- ✅ **Git** installed ([Download](https://git-scm.com/))
- ✅ **GitHub account** ([Sign up](https://github.com/))
- ✅ **Google account** (for Google Calendar)
- ✅ **SCELE account** (UI student account)
- ✅ **Text editor** (VS Code recommended)

### Verify Prerequisites

```bash
# Check Node.js version (should be 20+)
node --version

# Check Git
git --version

# Check npm
npm --version
```

---

## Part 1: Google Cloud Setup

### Step 1.1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. **Project name**: `SCELE Calendar Sync` (or any name)
4. Click **"Create"**
5. Wait for project creation (takes ~30 seconds)

### Step 1.2: Enable Google Calendar API

1. In the project, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Calendar API"**
3. Click on it
4. Click **"Enable"**
5. Wait for API to be enabled

### Step 1.3: Create Service Account

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"Service Account"**
3. **Service account name**: `calendar-sync-bot`
4. **Service account ID**: `calendar-sync-bot` (auto-filled)
5. Click **"Create and Continue"**
6. **Role**: Skip this (click "Continue")
7. Click **"Done"**

### Step 1.4: Create Service Account Key

1. Click on the service account you just created
2. Go to **"Keys"** tab
3. Click **"Add Key"** → **"Create new key"**
4. Choose **"JSON"**
5. Click **"Create"**
6. **Save the downloaded JSON file** - you'll need this later!

**Important**: Keep this file secure! It contains credentials to access your calendar.

### Step 1.5: Create/Find Target Calendar

**Option A: Create New Calendar**
1. Go to [Google Calendar](https://calendar.google.com/)
2. Click **"+"** next to "Other calendars"
3. Click **"Create new calendar"**
4. **Name**: `SCELE Assignments`
5. Click **"Create calendar"**

**Option B: Use Existing Calendar**
- You can use any existing calendar

### Step 1.6: Get Calendar ID

1. In Google Calendar, find your target calendar in the left sidebar
2. Click the **three dots** next to it → **"Settings and sharing"**
3. Scroll down to **"Integrate calendar"**
4. Copy the **Calendar ID** (looks like: `abc123...@group.calendar.google.com`)
5. **Save this ID** - you'll need it later!

### Step 1.7: Share Calendar with Service Account

1. Still in calendar settings, scroll to **"Share with specific people"**
2. Click **"Add people"**
3. **Email**: Paste the service account email from the JSON file
   - Format: `calendar-sync-bot@your-project-id.iam.gserviceaccount.com`
4. **Permission**: Select **"Make changes to events"**
5. Click **"Send"**

✅ **Google Cloud Setup Complete!**

---

## Part 2: Local Setup

### Step 2.1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/AidamUI/scele-assignment-tracker-gcal.git

# Navigate to project directory
cd scele-assignment-tracker-gcal
```

### Step 2.2: Install Dependencies

```bash
# Install Node.js packages
npm install

# This installs:
# - playwright (browser automation)
# - googleapis (Google Calendar API)
# - dotenv (environment variables)
```

### Step 2.3: Install Playwright Browsers

```bash
# Install Chromium browser for Playwright
npx playwright install chromium
```

### Step 2.4: Create Environment File

Create a file named `.env` in the project root:

```bash
# Create .env file
touch .env
```

Open `.env` and add your credentials:

```env
# SCELE Credentials
SCELE_USERNAME=your-scele-username
SCELE_PASSWORD=your-scele-password

# Google Calendar Configuration
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
```

**Replace with your actual values:**
- `your-scele-username` - Your SCELE username (e.g., `muhammad.kaila`)
- `your-scele-password` - Your SCELE password
- `your-calendar-id@group.calendar.google.com` - Calendar ID from Step 1.6

### Step 2.5: Add Service Account JSON

1. Rename the downloaded JSON file to `service-account.json`
2. Move it to the project root directory
3. Verify it's in the same folder as `package.json`

**Your project structure should look like:**
```
scele-calendar-sync/
├── .env                          ← Your credentials
├── service-account.json          ← Google service account key
├── package.json
├── runner-direct.js
├── .github/
│   └── workflows/
│       └── sync.yml
└── ...
```

### Step 2.6: Verify .gitignore

Check that `.gitignore` includes:

```gitignore
# Environment variables
.env

# Google Service Account credentials
service-account.json
google-credentials.json

# Node modules
node_modules/
```

This ensures sensitive files won't be pushed to GitHub.

✅ **Local Setup Complete!**

---

## Part 3: Testing Locally

### Step 3.1: Test the Automation

```bash
# Run the automation script
npm start
```

**What should happen:**
1. Browser launches (you'll see Chromium window)
2. Navigates to SCELE login page
3. Fills in username and password
4. Logs in successfully
5. Extracts assignments, quizzes, forums
6. Syncs to Google Calendar
7. Browser closes

**Expected output:**
```
🚀 Launching browser...
🔐 Navigating to SCELE login page...
✅ Logged in successfully
📚 Found 8 courses (filtered to 2026/2027)
  📖 Course: Pemrograman Lanjut
    ✓ Found 5 items
  📖 Course: Basis Data
    ✓ Found 3 items
📅 Inserting 8 events into calendar...
  ✓ Inserted: Assignment 1
  ✓ Inserted: Quiz 1
✅ Successfully synced 8 events to Google Calendar
```

### Step 3.2: Verify in Google Calendar

1. Go to [Google Calendar](https://calendar.google.com/)
2. Check your target calendar
3. You should see events with:
   - Assignment names
   - Correct dates
   - Clickable links to SCELE
   - Color coding (Red=Quiz, Blue=Assignment, Yellow=Forum)

### Step 3.3: Troubleshooting Local Tests

**❌ "Authentication failed"**
- Check SCELE username/password in `.env`
- Try logging in manually on SCELE website
- Ensure no typos in credentials

**❌ "Calendar permission denied"**
- Verify service account email is shared with calendar
- Check permission is "Make changes to events"
- Verify calendar ID is correct

**❌ "Cannot find module"**
- Run `npm install` again
- Check Node.js version: `node --version` (should be 20+)

**❌ Browser doesn't launch**
- Run `npx playwright install chromium`
- Check if Chromium installed: `npx playwright --version`

✅ **Local Testing Complete!**

---

## Part 4: GitHub Deployment

### Step 4.1: Your GitHub Repository

Your repository is already created at:
**https://github.com/AidamUI/scele-assignment-tracker-gcal**

If you haven't pushed code yet, continue with the next step.

### Step 4.2: Push Code to GitHub

```bash
# Add all files (sensitive files are already in .gitignore)
git add .

# Create first commit
git commit -m "Initial commit: SCELE to Google Calendar automation"

# Add GitHub remote
git remote add origin https://github.com/AidamUI/scele-assignment-tracker-gcal.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 4.3: Verify Files on GitHub

Check your repository on GitHub:
- ✅ `README.md` should be visible
- ✅ `package.json` should be visible
- ✅ `runner-direct.js` should be visible
- ✅ `.github/workflows/sync.yml` should be visible
- ❌ `.env` should NOT be visible
- ❌ `service-account.json` should NOT be visible

### Step 4.4: Add GitHub Secrets

1. Go to your repository on GitHub
2. Click **"Settings"** tab
3. Click **"Secrets and variables"** → **"Actions"**
4. Click **"New repository secret"**

**Add these 4 secrets:**

#### Secret 1: SCELE_USERNAME
- **Name**: `SCELE_USERNAME`
- **Secret**: (your SCELE username from `.env`)
- Click **"Add secret"**

#### Secret 2: SCELE_PASSWORD
- **Name**: `SCELE_PASSWORD`
- **Secret**: (your SCELE password from `.env`)
- Click **"Add secret"**

#### Secret 3: GOOGLE_CALENDAR_ID
- **Name**: `GOOGLE_CALENDAR_ID`
- **Secret**: (your calendar ID from `.env`)
- Click **"Add secret"**

#### Secret 4: GOOGLE_SERVICE_ACCOUNT_JSON
- **Name**: `GOOGLE_SERVICE_ACCOUNT_JSON`
- **Secret**: (ENTIRE contents of `service-account.json`)
- **How to copy**:
  ```bash
  # Windows PowerShell
  Get-Content service-account.json | Set-Clipboard
  
  # Mac
  cat service-account.json | pbcopy
  
  # Linux
  cat service-account.json | xclip
  ```
- Paste the entire JSON (should start with `{` and end with `}`)
- Click **"Add secret"**

### Step 4.5: Verify Secrets

You should see 4 secrets listed:
```
GOOGLE_CALENDAR_ID
GOOGLE_SERVICE_ACCOUNT_JSON
SCELE_PASSWORD
SCELE_USERNAME
```

✅ **GitHub Deployment Complete!**

---

## Part 5: Verification

### Step 5.1: Manual Workflow Trigger

1. Go to **"Actions"** tab in your repository
2. Click **"SCELE to Google Calendar Sync"** workflow
3. Click **"Run workflow"** button (top right)
4. Select branch: `main`
5. Click **"Run workflow"**

### Step 5.2: Monitor Workflow Execution

1. Click on the running workflow
2. Click on the job name (e.g., "sync")
3. Watch the logs in real-time
4. Look for:
   ```
   🚀 Launching browser...
   🔐 Navigating to SCELE login page...
   ✅ Logged in successfully
   📚 Found X courses
   ✅ Successfully synced X events to Google Calendar
   ```

### Step 5.3: Check Calendar

1. Go to [Google Calendar](https://calendar.google.com/)
2. Verify events are synced
3. Check that events have:
   - Correct names and dates
   - Clickable links
   - Proper color coding
   - `[dateposted]` and `[lastpost]` tags for forums

### Step 5.4: Verify Automatic Schedule

The workflow will now run automatically every 3 hours:
- Check **"Actions"** tab to see scheduled runs
- Each run will sync latest SCELE data
- No manual intervention needed

### Step 5.5: Troubleshooting Deployment

**❌ Workflow fails with "Secret not found"**
- Verify all 4 secrets are added
- Check secret names match exactly (case-sensitive)
- No extra spaces in secret names

**❌ "Invalid JSON" error**
- Ensure you copied ENTIRE `service-account.json`
- Check it starts with `{` and ends with `}`
- No extra characters before/after JSON

**❌ "Authentication failed"**
- Verify SCELE credentials in secrets
- Test locally first: `npm start`
- Check if SCELE website has changed

**❌ "Calendar permission denied"**
- Verify calendar is shared with service account
- Check permission is "Make changes to events"
- Verify calendar ID matches

✅ **Verification Complete!**

---

## 🎉 Success Checklist

- [ ] Google Cloud project created
- [ ] Calendar API enabled
- [ ] Service account created with JSON key
- [ ] Calendar shared with service account
- [ ] Repository cloned/created
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured
- [ ] `service-account.json` added
- [ ] Local test successful (`npm start`)
- [ ] Code pushed to GitHub
- [ ] All 4 GitHub secrets added
- [ ] Manual workflow run successful
- [ ] Events appear in Google Calendar
- [ ] Automatic schedule verified

---

## 📚 Next Steps

1. **Monitor**: Check GitHub Actions tab regularly for workflow runs
2. **Customize**: Modify `runner-direct.js` to add more features
3. **Adjust Schedule**: Edit `.github/workflows/sync.yml` to change frequency
4. **Add Filters**: Modify course filtering logic if needed

---

## 🆘 Getting Help

If you encounter issues:

1. **Check Documentation**:
   - [README.md](README.md) - Overview and architecture
   - [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md) - Security verification
   - [ADD_GITHUB_SECRETS.md](ADD_GITHUB_SECRETS.md) - Detailed secrets guide

2. **Review Logs**:
   - Local: Check terminal output
   - GitHub: Check Actions tab logs

3. **Common Issues**:
   - Authentication: Verify credentials
   - Permissions: Check calendar sharing
   - API: Ensure Calendar API is enabled

4. **Test Locally First**:
   - Always test with `npm start` before deploying
   - Easier to debug locally than on GitHub Actions

---

**🎊 Congratulations! Your SCELE to Google Calendar automation is now live!**

Your calendar will automatically sync every 3 hours with the latest SCELE assignments, quizzes, and forums.